/**
 * PrinterSettings — Printer configuration page.
 *
 * Lets the user pick their thermal receipt printer from a list of all printers
 * installed on the machine.  The chosen name is saved to localStorage under the
 * key "selectedPrinterName".  preload.js reads that value and passes it to
 * main.js with every print-receipt IPC call so the correct printer is always used.
 *
 * Why localStorage?
 *  - No extra IPC channels or config files needed.
 *  - Survives app restarts.
 *  - Works whether the app is packaged or running in dev mode.
 *  - Each Windows user gets their own setting (localStorage is per-user-profile).
 */
import { useState, useEffect } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { toast } from "react-toastify";

interface PrinterInfo {
    name: string;
    displayName: string;
    isDefault: boolean;
}

const STORAGE_KEY = "selectedPrinterName";

export default function PrinterSettings() {
    usePageTitle("Printer Settings");

    const [printers, setPrinters] = useState<PrinterInfo[]>([]);
    const [selected, setSelected] = useState<string>(
        localStorage.getItem(STORAGE_KEY) ?? ""
    );
    const [enableEsc, setEnableEsc] = useState<boolean>(
        localStorage.getItem("enableEscPrint") !== "false"
    );
    const [enableHtml, setEnableHtml] = useState<boolean>(
        localStorage.getItem("enableHtmlPrint") !== "false"
    );
    const [loading, setLoading] = useState(true);
    const [isElectron] = useState(() => !!(window as Window & { electron?: { getPrinters?: () => Promise<PrinterInfo[]> } }).electron?.getPrinters);

    useEffect(() => {
        void (async () => {
            try {
                const electronWindow = window as Window & {
                    electron?: { getPrinters?: () => Promise<PrinterInfo[]> };
                };
                if (electronWindow.electron?.getPrinters) {
                    const list = await electronWindow.electron.getPrinters();
                    setPrinters(list);
                }
            } catch (err) {
                console.error("Failed to load printers:", err);
                toast.error("Could not load printer list.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const save = () => {
        localStorage.setItem("enableEscPrint", String(enableEsc));
        localStorage.setItem("enableHtmlPrint", String(enableHtml));
        
        if (selected) {
            localStorage.setItem(STORAGE_KEY, selected);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
        
        toast.success(`Printer settings saved successfully.`);
    };

    const clear = () => {
        localStorage.removeItem(STORAGE_KEY);
        setSelected("");
        toast.info("Printer selection cleared. App will fall back to auto-detect.");
    };

    const testPrint = async () => {
        const electronWindow = window as Window & {
            electron?: { printReceipt?: (html: string) => Promise<{ ok: boolean; message?: string }> };
        };
        if (!electronWindow.electron?.printReceipt) {
            toast.warning("Print test is only available in the desktop app.");
            return;
        }
        const result = await electronWindow.electron.printReceipt(
            `<div style="text-align:center;padding:20px;font-size:14px;">
                <strong>*** TEST PRINT ***</strong><br/>
                Smart Billing Suite<br/>
                Printer: ${selected || "auto"}<br/>
                ${new Date().toLocaleString("en-IN")}
             </div>`
        );
        if (result.ok) {
            toast.success("Test print sent successfully!");
        } else {
            toast.error(`Print failed: ${result.message}`);
        }
    };

    return (
        <div style={styles.page}>
            {/* Header */}
            <div style={styles.header}>
                <span>⚙ Printer Settings</span>
                <span style={styles.headerDate}>{new Date().toLocaleString("en-IN")}</span>
            </div>

            <div style={styles.card}>
                <h2 style={styles.title}>Thermal Printer Configuration</h2>
                <p style={styles.description}>
                    Select your receipt / thermal printer below. This setting is saved on
                    this computer only. Each machine in the shop can have its own printer.
                </p>

                {!isElectron && (
                    <div style={styles.warning}>
                        ⚠ Printer selection is only available in the desktop (Electron) app.
                        This page is read-only in a browser.
                    </div>
                )}

                {/* Current saved printer */}
                <div style={styles.currentBox}>
                    <span style={styles.currentLabel}>Currently Saved:</span>
                    <span style={styles.currentValue}>
                        {selected ? `🖨 ${selected}` : "⚠ Not configured — using auto-detect"}
                    </span>
                </div>

                {/* Printer list */}
                {loading ? (
                    <p style={styles.loadingText}>Loading installed printers…</p>
                ) : printers.length === 0 ? (
                    <p style={styles.emptyText}>
                        No printers found. Ensure at least one printer is installed in Windows.
                    </p>
                ) : (
                    <div style={styles.printerList}>
                        <label style={styles.listLabel}>Installed Printers:</label>
                        {printers.map((p) => (
                            <div
                                key={p.name}
                                style={{
                                    ...styles.printerItem,
                                    ...(selected === p.name ? styles.printerItemSelected : {}),
                                }}
                                onClick={() => setSelected(p.name)}
                            >
                                <span style={styles.printerRadio}>
                                    {selected === p.name ? "●" : "○"}
                                </span>
                                <div style={styles.printerInfo}>
                                    <strong>{p.displayName}</strong>
                                    <span style={styles.printerName}>{p.name}</span>
                                    {p.isDefault && (
                                        <span style={styles.defaultBadge}>System Default</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Print Method Toggles */}
                <div style={{ marginTop: 20, marginBottom: 20, padding: 15, background: "#f8f9fa", border: "1px solid #dee2e6", borderRadius: 4 }}>
                    <h3 style={{ margin: "0 0 10px 0", color: "#000080", fontSize: 14 }}>Printing Modes:</h3>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <input 
                                type="checkbox" 
                                checked={enableEsc} 
                                onChange={(e) => setEnableEsc(e.target.checked)} 
                                style={{ width: 16, height: 16 }}
                            />
                            <strong>Enable ESC/POS Printing (Raw Mode)</strong>
                            <span style={{ color: "#666", fontSize: 11 }}>- Extremely fast, requires configured printer above.</span>
                        </label>
                        
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <input 
                                type="checkbox" 
                                checked={enableHtml} 
                                onChange={(e) => setEnableHtml(e.target.checked)} 
                                style={{ width: 16, height: 16 }}
                            />
                            <strong>Enable HTML Printing (Graphics Mode)</strong>
                            <span style={{ color: "#666", fontSize: 11 }}>- Slower, but supports high-res logos and complex layouts.</span>
                        </label>
                    </div>
                </div>

                {/* Action buttons */}
                <div style={styles.buttonRow}>
                    <button style={styles.btnPrimary} onClick={save} disabled={!isElectron || !selected}>
                        💾 SAVE SELECTION
                    </button>
                    <button
                        style={{ ...styles.btnSecondary }}
                        onClick={testPrint}
                        disabled={!isElectron || !selected}
                        title="Sends a short test page to the selected printer"
                    >
                        🖨 TEST PRINT
                    </button>
                    <button style={styles.btnDanger} onClick={clear} disabled={!isElectron}>
                        ✕ CLEAR
                    </button>
                </div>

                <p style={styles.hint}>
                    <strong>Tip:</strong> After saving, every receipt printed from this machine
                    will go to the selected printer automatically. No more "Save As PDF" dialogs.
                </p>
            </div>
        </div>
    );
}

/* ─── Styles ─── */
const styles: Record<string, React.CSSProperties> = {
    page: {
        fontFamily: "'Tahoma', 'Segoe UI', sans-serif",
        background: "linear-gradient(135deg, #e8f4ff 0%, #d4e8ff 100%)",
        minHeight: "100vh",
        padding: 15,
        color: "#000080",
        fontSize: 13,
    },
    header: {
        background: "linear-gradient(to bottom, #000080, #000055)",
        color: "#fff",
        padding: "8px 15px",
        fontWeight: "bold",
        fontSize: 16,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        border: "3px solid",
        borderColor: "#fff #808080 #808080 #fff",
        marginBottom: 20,
    },
    headerDate: { fontWeight: "normal", fontSize: 12, opacity: 0.85 },
    card: {
        background: "#fff",
        border: "2px solid #c0c0c0",
        borderRadius: 4,
        padding: 24,
        maxWidth: 700,
        margin: "0 auto",
        boxShadow: "2px 2px 8px rgba(0,0,0,0.1)",
    },
    title: { margin: "0 0 8px 0", color: "#000080", fontSize: 18 },
    description: { color: "#333", marginBottom: 16, lineHeight: 1.5 },
    warning: {
        background: "#fff3cd",
        border: "1px solid #ffc107",
        borderRadius: 3,
        padding: "10px 14px",
        marginBottom: 16,
        color: "#856404",
        fontWeight: "bold",
    },
    currentBox: {
        background: "#f0f8ff",
        border: "1px solid #b8d4e8",
        borderRadius: 3,
        padding: "10px 14px",
        marginBottom: 20,
        display: "flex",
        gap: 12,
        alignItems: "center",
    },
    currentLabel: { fontWeight: "bold", color: "#000080", whiteSpace: "nowrap" },
    currentValue: { color: "#333" },
    loadingText: { color: "#666", fontStyle: "italic" },
    emptyText: { color: "#cc0000", fontStyle: "italic" },
    printerList: { marginBottom: 20 },
    listLabel: { display: "block", fontWeight: "bold", marginBottom: 8, color: "#000080" },
    printerItem: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        border: "1px solid #ddd",
        borderRadius: 3,
        marginBottom: 6,
        cursor: "pointer",
        background: "#fafafa",
        transition: "background 0.15s",
    },
    printerItemSelected: {
        background: "#e0edff",
        border: "1px solid #000080",
    },
    printerRadio: { fontSize: 18, color: "#000080", minWidth: 20 },
    printerInfo: { display: "flex", flexDirection: "column", gap: 2 },
    printerName: { fontSize: 11, color: "#666" },
    defaultBadge: {
        display: "inline-block",
        background: "#28a745",
        color: "#fff",
        fontSize: 10,
        padding: "1px 6px",
        borderRadius: 10,
        fontWeight: "bold",
        alignSelf: "flex-start",
    },
    buttonRow: { display: "flex", gap: 10, marginBottom: 16 },
    btnPrimary: {
        background: "linear-gradient(to bottom, #000080, #000055)",
        color: "#fff",
        border: "2px solid",
        borderColor: "#fff #808080 #808080 #fff",
        padding: "8px 16px",
        fontWeight: "bold",
        cursor: "pointer",
        fontSize: 12,
    },
    btnSecondary: {
        background: "linear-gradient(to bottom, #c0c0c0, #a0a0a0)",
        color: "#000",
        border: "2px solid",
        borderColor: "#fff #808080 #808080 #fff",
        padding: "8px 16px",
        fontWeight: "bold",
        cursor: "pointer",
        fontSize: 12,
    },
    btnDanger: {
        background: "linear-gradient(to bottom, #cc0000, #990000)",
        color: "#fff",
        border: "2px solid",
        borderColor: "#ff6666 #660000 #660000 #ff6666",
        padding: "8px 16px",
        fontWeight: "bold",
        cursor: "pointer",
        fontSize: 12,
    },
    hint: {
        color: "#555",
        fontSize: 12,
        background: "#f9f9f9",
        border: "1px solid #e0e0e0",
        borderRadius: 3,
        padding: "8px 12px",
        margin: 0,
    },
};
