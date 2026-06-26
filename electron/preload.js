const { contextBridge, ipcRenderer } = require("electron");

// We need to resolve the API port before the renderer loads.
// contextBridge can only be called once per channel name, so we do it upfront.
let resolvedPort = 5683; // default fallback

async function init() {
    try {
        resolvedPort = await ipcRenderer.invoke("get-api-port");
    } catch {
        // keep default
    }

    contextBridge.exposeInMainWorld("electron", {
        appVersion: process.versions.electron,
        isElectron: true,
        apiUrl: `http://localhost:${resolvedPort}`,
        openWindow: (route) => ipcRenderer.send("open-window", route),
        openCalculator: () => ipcRenderer.send("open-calculator"),
        // Opens a URL in the system default browser (e.g. WhatsApp Web).
        // Using shell.openExternal in main avoids spawning a new Chromium window.
        openExternalUrl: (url) => ipcRenderer.send("open-external-url", url),
        broadcastInvalidate: (key) => ipcRenderer.send("broadcast-invalidate", key),
        onInvalidate: (callback) => ipcRenderer.on("invalidate-query", (_event, key) => callback(key)),

        // Printer name is stored in localStorage by the PrinterSettings page.
        // We read it here (in the renderer process) and forward it to main so
        // main.js can match an exact printer name instead of guessing.
        printReceipt: (html) => {
            const printerName = localStorage.getItem("selectedPrinterName") || null;
            return ipcRenderer.invoke("print-receipt", html, printerName);
        },

        // Returns [ { name, displayName, isDefault } ] for the settings page.
        getPrinters: () => ipcRenderer.invoke("get-printers"),

        uploadBillPdf: (html, invoiceNumber) =>
            ipcRenderer.invoke("upload-bill-pdf", html, invoiceNumber),
        loginSuccess: () => ipcRenderer.send("login-success"),
    });
}

init();