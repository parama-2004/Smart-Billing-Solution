const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let apiProcess = null;
let apiPort = 5683;          // dev fallback (dotnet run default)
const windows = new Set();
const isDev = !app.isPackaged;

// ─── Persistent hidden windows (created once, reused forever) ───────────────
// Spawning a new BrowserWindow per print job costs ~1-2 s on Pentium hardware
// because Chromium must initialise a new renderer process each time.
// Instead we keep two invisible windows alive for the life of the app:
//   • printWindow  — renders receipt HTML and drives the thermal printer
//   • pdfWindow    — renders invoice HTML and produces the PDF buffer
// Both windows stay hidden (show: false) and are never shown to the user.
let printWindow = null;   // reused for every receipt print
let pdfWindow   = null;   // reused for every PDF/upload job

// Serial queue: ensures back-to-back print calls don't race on the same window.
// Each element is () => Promise<result>.  We always await one job before
// starting the next so loadURL + print() never overlap.
let printQueue = Promise.resolve();

function enqueuePrint(job) {
    // Chain onto the tail of the queue and return a promise the caller can await.
    const next = printQueue.then(() => job());
    // Swallow errors in the queue chain so a failed job doesn't block future jobs.
    printQueue = next.catch(() => {});
    return next;
}

// ─── CSS that every thermal receipt needs ────────────────────────────────────
const RECEIPT_CSS = `
    @page { size: 80mm auto; margin: 2mm 3mm; }
    * { box-sizing: border-box; max-width: 74mm; word-break: break-word; }
    html, body { margin: 0; padding: 0; width: 80mm;
                 font-family: 'Courier New', Courier, monospace;
                 font-size: 11px; color: #000;
                 -webkit-print-color-adjust: exact;
                 print-color-adjust: exact; }
    img { max-width: 100%; }
    table { width: 100%; border-collapse: collapse; }
    td, th { max-width: none; overflow-wrap: break-word; }
`;

// ─── Wrap HTML in the standard thermal shell ─────────────────────────────────
function buildReceiptHtml(bodyHtml) {
    return `<!DOCTYPE html><html><head>
        <meta charset="utf-8" /><title>Receipt</title>
        <style>${RECEIPT_CSS}</style>
    </head><body>${bodyHtml}</body></html>`;
}

// ─── Lazily create (or return existing) the persistent print window ───────────
function getPrintWindow() {
    if (printWindow && !printWindow.isDestroyed()) return printWindow;

    printWindow = new BrowserWindow({
        show: false,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    // If the window ever dies unexpectedly, null the reference so we re-create it.
    printWindow.on("closed", () => { printWindow = null; });
    return printWindow;
}

// ─── Lazily create (or return existing) the persistent PDF window ─────────────
function getPdfWindow() {
    if (pdfWindow && !pdfWindow.isDestroyed()) return pdfWindow;

    pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    pdfWindow.on("closed", () => { pdfWindow = null; });
    return pdfWindow;
}

// ─── Get the path to the .NET API executable ───
function getApiPath() {
    if (isDev) {
        return null; // In dev mode, run `dotnet run` separately
    }
    // In production, the API binary is bundled alongside the Electron app
    const apiDir = path.join(process.resourcesPath, "api");
    const exePath = path.join(apiDir, "Billing.Api.exe");
    return fs.existsSync(exePath) ? exePath : null;
}

// ─── Launch .NET API backend with dynamic port ───
// Strategy: pass --urls http://127.0.0.1:0  →  the OS assigns any free port.
// We capture stdout and parse the "Now listening on: http://127.0.0.1:PORT"
// line that ASP.NET Core emits, then store that port in `apiPort` so the
// renderer can query it via the `get-api-port` IPC channel.
async function startApi() {
    const apiExe = getApiPath();
    if (!apiExe) {
        console.log("📡 Dev mode: expecting API to be running via 'dotnet run'");
        return; // apiPort stays at the dev default (5683)
    }

    console.log("🚀 Starting packaged API — requesting OS-assigned port...");

    // Pipe stdout/stderr so we can read the bound-port log line.
    // stderr is still forwarded to the Electron console for debugging.
    apiProcess = spawn(apiExe, ["--urls", "http://127.0.0.1:0"], {
        cwd: path.dirname(apiExe),
        env: { ...process.env, ASPNETCORE_ENVIRONMENT: "Production" },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
    });

    apiProcess.stderr.on("data", (data) => {
        process.stderr.write(`[API ERR] ${data}`);
    });

    apiProcess.on("exit", (code) => {
        console.log(`[API] Process exited with code ${code}`);
        apiProcess = null;
    });

    // Parse the actual bound port from stdout before opening the window.
    await waitForApiReady(apiProcess, 60000);
    console.log(`✅ API is ready on port ${apiPort}`);
}

// ─── Read stdout until ASP.NET reports the bound address ───
// Resolves as soon as it finds "Now listening on: http://127.0.0.1:PORT".
// Falls back to a 60-second timeout for slow machines (Pentium / HDD).
function waitForApiReady(proc, timeout) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(
                `API startup timeout after ${timeout / 1000}s. ` +
                `Check that the database is reachable.`
            ));
        }, timeout);

        let buffer = "";

        proc.stdout.on("data", (data) => {
            buffer += data.toString();
            // Forward to Electron console so logs are still visible
            process.stdout.write(`[API] ${data}`);

            // ASP.NET Core emits this line when Kestrel is ready:
            // "Now listening on: http://127.0.0.1:PORT"
            const match = buffer.match(
                /Now listening on:\s+http:\/\/127\.0\.0\.1:(\d+)/i
            );
            if (match) {
                apiPort = parseInt(match[1], 10);
                clearTimeout(timer);
                resolve();
            }
        });

        proc.on("exit", (code) => {
            clearTimeout(timer);
            if (code !== 0 && code !== null) {
                reject(new Error(`API process exited prematurely with code ${code}`));
            }
        });
    });
}

// ─── Create a BrowserWindow ───
function createWindow(route = "/") {
    const isLogin = route === "/";
    const newWindow = new BrowserWindow({
        width: isLogin ? 420 : 1400,
        height: isLogin ? 600 : 900,
        resizable: !isLogin,
        maximizable: !isLogin,
        fullscreen: false,
        autoHideMenuBar: true,
        icon: path.join(__dirname, "../build/icon.ico"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    // Determine the frontend path
    let indexPath;
    if (isDev) {
        // In dev, load from Vite dev server
        newWindow.loadURL(`http://localhost:5173/#${route}`);
    } else {
        // In production, load the built static files
        indexPath = path.join(__dirname, "../billing-ui/dist/index.html");
        if (!fs.existsSync(indexPath)) {
            console.error("❌ React build not found at:", indexPath);
            newWindow.loadURL(
                "data:text/html,<h1>Error: UI build not found</h1>"
            );
            return newWindow;
        }
        const appUrl = `file://${indexPath}#${route}`;
        newWindow.loadURL(appUrl);
    }

    // Only open DevTools in development
    if (isDev && !isLogin) {
        newWindow.webContents.openDevTools();
    }

    newWindow.webContents.on("did-finish-load", () => {
        console.log("✅ Window loaded:", newWindow.webContents.getURL());
    });

    newWindow.once("ready-to-show", () => {
        if (!isLogin && !newWindow.isMaximized()) {
            newWindow.maximize();
        }
    });

    let isHomeWindow = false;
    newWindow.on("close", () => {
        const currentUrl = newWindow.webContents.getURL();
        isHomeWindow = currentUrl.includes("#/home");
    });

    newWindow.on("closed", () => {
        windows.delete(newWindow);

        if (isHomeWindow) {
            for (const openWindow of BrowserWindow.getAllWindows()) {
                if (!openWindow.isDestroyed()) {
                    openWindow.close();
                }
            }

            app.quit();
        }
    });

    windows.add(newWindow);
    return newWindow;
}

// ─── IPC: Open new window ───
ipcMain.on("open-window", (_event, route) => {
    console.log(`📂 Opening new window for route: ${route}`);
    createWindow(route);
});

// ─── IPC: Login successful ───
ipcMain.on("login-success", (event) => {
    console.log("🔑 Login successful. Resizing window to main view.");
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) {
        senderWindow.setResizable(true);
        senderWindow.setMaximizable(true);
        senderWindow.setMinimumSize(800, 600);
        senderWindow.setSize(1400, 900);
        senderWindow.center();
        senderWindow.maximize();
        if (isDev) {
            senderWindow.webContents.openDevTools();
        }
    }
});

// ─── IPC: Open external URL in system default browser (e.g. WhatsApp) ──────
// Using shell.openExternal avoids creating a new BrowserWindow renderer process
// (which costs 1-2s on slow hardware).  The URL opens instantly in the user's
// real browser where WhatsApp Web is already logged in.
ipcMain.on("open-external-url", (_event, url) => {
    shell.openExternal(url).catch(err => {
        console.error("Failed to open external URL:", err);
    });
});

// ─── IPC: Open OS calculator ───
ipcMain.on("open-calculator", () => {
    console.log("🧮 Opening calculator...");
    const { exec } = require("child_process");
    const cmd = process.platform === "win32" ? "calc.exe" : process.platform === "darwin" ? "open -a Calculator" : "gnome-calculator";
    exec(cmd, (err) => {
        if (err) {
            console.error("Failed to open calculator:", err);
        }
    });
});

// ─── IPC: Broadcast React Query Invalidations ───
ipcMain.on("broadcast-invalidate", (event, queryKey) => {
    windows.forEach(w => {
        if (!w.isDestroyed() && w.webContents !== event.sender) {
            w.webContents.send("invalidate-query", queryKey);
        }
    });
});

// ─── IPC: Get API port ───
ipcMain.handle("get-api-port", () => {
    return apiPort;
});

// ─── IPC: List installed printers ────────────────────────────────────────────
// Returns [ { name, isDefault, displayName } ] so the PrinterSettings page can
// let the user pick their thermal printer and store it in localStorage.
ipcMain.handle("get-printers", async () => {
    // Use the first non-destroyed app window to call getPrintersAsync().
    const existing = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
    if (!existing) return [];
    const printers = await existing.webContents.getPrintersAsync();
    return printers.map(p => ({
        name: p.name,
        displayName: p.displayName || p.name,
        isDefault: p.isDefault,
    }));
});

// The window is loaded ONCE at startup (via getPrintWindow) and then reused
// by calling loadURL with the new receipt HTML.  This avoids the ~1-2 s
// Chromium renderer-process startup cost that happened on every print before.
//
// printerName: sent by the renderer from localStorage ("selectedPrinterName").
// If the renderer sends null/undefined (e.g. PrinterSettings not yet configured),
// we attempt the Epson-name fallback and return a clear error if that also fails.
ipcMain.handle("print-receipt", async (event, html, printerName) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (!senderWindow) return { ok: false, message: "No active window" };

    const printers = await senderWindow.webContents.getPrintersAsync();
    if (!printers || printers.length === 0) {
        return { ok: false, message: "No printer installed on this machine" };
    }

    // 1. Use the explicitly configured printer name from localStorage.
    let targetPrinter = printerName
        ? printers.find(p => p.name === printerName)
        : null;

    // 2. If not configured yet, attempt Epson-name heuristic as a one-time fallback.
    if (!targetPrinter) {
        targetPrinter = printers.find(p =>
            p.name.toLowerCase().includes("epson") ||
            p.name.toLowerCase().includes("tm-t82") ||
            p.name.toLowerCase().includes("t82")
        );
    }

    // 3. No match — tell the user to configure a printer instead of silently
    //    printing to "Microsoft Print to PDF" or "Fax".
    if (!targetPrinter) {
        return {
            ok: false,
            message: printerName
                ? `Printer "${printerName}" not found. Please reconfigure in Settings → Printer Settings.`
                : "No thermal printer found. Please go to Settings → Printer Settings and select your printer.",
        };
    }

    // Enqueue the job so concurrent calls don't race on the same window.
    return enqueuePrint(async () => {
        const win = getPrintWindow();

        // Load the receipt HTML into the reused window.
        await win.webContents.loadURL(
            `data:text/html;charset=UTF-8,${encodeURIComponent(buildReceiptHtml(html))}`
        );

        return new Promise((resolve) => {
            win.webContents.print(
                {
                    silent: true,
                    printBackground: true,
                    deviceName: targetPrinter.name,
                    // pageSize in microns: 80 mm = 80 000 µm
                    pageSize: { width: 80000, height: 297000 },
                    margins: { marginType: "none" },
                    scaleFactor: 100,
                },
                (success, failureReason) => {
                    if (success) {
                        resolve({ ok: true });
                    } else {
                        resolve({ ok: false, message: failureReason || "Printing cancelled" });
                    }
                }
            );
        });
    });
});

// ─── IPC: Upload bill PDF (uses the persistent PDF window) ───────────────────
// getPdfWindow() returns the same BrowserWindow every time instead of
// creating a new Chromium renderer process per upload.
ipcMain.handle("upload-bill-pdf", async (event, html, invoiceNumber) => {
    try {
        const win = getPdfWindow();

        const invoiceHtml = `<!DOCTYPE html><html>
            <head>
                <meta charset="utf-8" />
                <title>Invoice ${invoiceNumber}</title>
                <style>body{margin:0;padding:20px;font-family:monospace;background:white;}</style>
            </head>
            <body>${html}</body>
        </html>`;

        await win.webContents.loadURL(
            `data:text/html;charset=UTF-8,${encodeURIComponent(invoiceHtml)}`
        );

        const pdfBuffer = await win.webContents.printToPDF({
            printBackground: true,
            pageSize: "A4",
            margins: { marginType: "none" }
        });

        // NOTE: window is intentionally NOT closed — it stays alive for the next job.

        // Upload to catbox.moe using raw multipart buffer to ensure compatibility
        const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
        
        const preamble = Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n` +
            `--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="Invoice_${invoiceNumber}.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
            "utf-8"
        );
        const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`, "utf-8");
        
        const bodyBuffer = Buffer.concat([preamble, pdfBuffer, epilogue]);

        // We can use node's native https to avoid fetch version issues
        return await new Promise((resolve, reject) => {
            const https = require("https");
            const req = https.request("https://catbox.moe/user/api.php", {
                method: "POST",
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${boundary}`,
                    "Content-Length": bodyBuffer.length,
                    "User-Agent": "BillingSuiteElectron/1.0"
                }
            }, (res) => {
                let data = "";
                res.on("data", chunk => data += chunk);
                res.on("end", () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ ok: true, link: data });
                    } else {
                        resolve({ ok: false, message: `Upload failed: ${res.statusCode}` });
                    }
                });
            });

            req.on("error", (err) => resolve({ ok: false, message: err.message }));
            req.write(bodyBuffer);
            req.end();
        });
    } catch (err) {
        console.error("Upload error:", err);
        return { ok: false, message: err.message };
    }
});

// ─── App Lifecycle ───
app.whenReady().then(async () => {
    try {
        await startApi();
    } catch (err) {
        console.error("Failed to start API, but opening window anyway:", err);
    }
    createWindow("/");
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow("/");
    }
});

app.on("before-quit", () => {
    // Kill the .NET API process
    if (apiProcess && !apiProcess.killed) {
        console.log("🛑 Shutting down API...");
        apiProcess.kill();
        apiProcess = null;
    }

    // Destroy the persistent hidden windows so Chromium doesn't leave
    // orphaned renderer processes running after the app closes.
    if (printWindow && !printWindow.isDestroyed()) {
        printWindow.destroy();
        printWindow = null;
    }
    if (pdfWindow && !pdfWindow.isDestroyed()) {
        pdfWindow.destroy();
        pdfWindow = null;
    }
});