import { useEffect, useRef, useState } from "react";
import Receipt80mm from "./Receipt80mm";
import type { InvoiceResponseDto } from "../models/Invoice";
import { toast } from "react-toastify";
import { getCustomerByIdC } from "../api/customerApi";
import type { CustomerDto } from "../models/Customer";
import { getShopSettings, defaultShopSettings } from "../api/shopApi";
import type { ShopSettings } from "../api/shopApi";
import { EscPosInvoicePrinter } from "../utils/EscPosInvoicePrinter";
import { api } from "../api/axios";

interface Props {
    invoice: InvoiceResponseDto;
    customerMobile?: string;
    onClose: () => void;
    onPrintComplete: () => void;
    onReset?: () => void;   // called when user explicitly dismisses without printing
}

/** Opens a URL in the system browser.
 *  In Electron we route through shell.openExternal (main process) so no new
 *  Chromium renderer window is created — zero startup lag.
 *  Falls back to window.open for plain-browser dev mode.
 */
function openUrl(url: string) {
    if (window.electron?.openExternalUrl) {
        window.electron.openExternalUrl(url);
    } else {
        window.open(url, "_blank");
    }
}


const PrintBillModal = ({ invoice, customerMobile, onClose, onPrintComplete, onReset }: Props) => {
    /** Dismiss the modal and reset the billing screen */
    const handleClose = () => { onReset?.(); onClose(); };
    const printRef = useRef<HTMLDivElement>(null);
    const hasPrintedRef = useRef(false);
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [customer, setCustomer] = useState<CustomerDto | null>(null);
    const [shopInfo, setShopInfo] = useState<ShopSettings>(defaultShopSettings);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Fetch shop settings from API (reads from appsettings.json)
    useEffect(() => {
        getShopSettings().then(setShopInfo).catch(() => {/* already falls back */ });
    }, []);

    useEffect(() => {
        if (invoice.customerId) {
            getCustomerByIdC(invoice.customerId)
                .then(setCustomer)
                .catch(console.error);
        }
    }, [invoice.customerId]);

    const getReceiptHtml = () => {
        if (!printRef.current) return "";
        return printRef.current.innerHTML;
    };

    async function handleDirectPrint() {
        if (hasPrintedRef.current || isPrinting) return;
        hasPrintedRef.current = true;
        setIsPrinting(true);

        try {
            const printerName = localStorage.getItem("selectedPrinterName");
            const enableEsc = localStorage.getItem("enableEscPrint") !== "false";
            const enableHtml = localStorage.getItem("enableHtmlPrint") !== "false";

            const htmlToPrint = getReceiptHtml();

            // ── Raw ESC/POS Print (Background) ──
            if (enableEsc && printerName) {
                const printer = new EscPosInvoicePrinter();
                const base64Data = printer.generateReceipt(invoice, shopInfo, customerMobile);

                // Fire the API call but DO NOT await it to block the UI.
                toast.promise(
                    api.post("/api/print/raw", {
                        printerName,
                        base64Data
                    }, { timeout: 30000 }).then(res => {
                        if (!res.data.success) throw new Error("Raw print failed in backend");
                        return res;
                    }),
                    {
                        pending: 'Spooling print job to printer...',
                        success: 'Printed successfully (Raw ESC/POS)',
                        error: 'Raw Print failed.'
                    }
                ).catch(err => {
                    console.error("Background print failed:", err);
                    
                    // Fallback to HTML if enabled
                    if (enableHtml && htmlToPrint && window.electron?.printReceipt) {
                        toast.info("Falling back to HTML print...");
                        window.electron.printReceipt(htmlToPrint).then(result => {
                            if (result && !result.ok) {
                                toast.warning(result.message || "Fallback HTML print failed");
                            } else {
                                toast.success("Printed successfully (HTML Fallback)");
                            }
                        });
                    }
                });

                // Immediately close modal and reset cart
                onPrintComplete();
                onClose();
                return;
            }

            // ── Graphics / Raster Print (Background) ──
            if (enableHtml && htmlToPrint && window.electron?.printReceipt) {
                toast.promise(
                    window.electron.printReceipt(htmlToPrint),
                    {
                        pending: 'Sending to local printer...',
                        success: 'Printed successfully (Graphics)',
                        error: 'Printer not available'
                    }
                ).then(result => {
                    if (result && !result.ok) {
                        toast.warning(result.message || "Printer not available");
                    }
                });

                // Immediately close modal and reset cart
                onPrintComplete();
                onClose();
                return;
            }

            toast.warning("No printing method enabled or available.");
            hasPrintedRef.current = false;
            setIsPrinting(false);
        } catch (error) {
            console.error("Print generation error:", error);
            hasPrintedRef.current = false;
            setIsPrinting(false);
            toast.error("Failed to generate print job.");
        }
    }

    const getValidWhatsappNumber = () => {
        let targetNumber = whatsappNumber;
        if (!targetNumber) {
            if (customerMobile && customerMobile.length >= 10) {
                targetNumber = customerMobile;
            } else {
                toast.warning("Please enter a valid 10-digit WhatsApp number.");
                return null;
            }
        } else if (targetNumber.length < 10) {
            toast.warning("Please enter a valid 10-digit WhatsApp number.");
            return null;
        }
        return targetNumber;
    }

    const handleSendWhatsappText = () => {
        const targetNumber = getValidWhatsappNumber();
        if (!targetNumber) return;

        const date = new Date(invoice.date);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Calculate basic totals
        const saleItems = invoice.items.filter(item => item.quantity >= 0);
        const returnItems = invoice.items.filter(item => item.quantity < 0);

        let saleMRP = 0;
        let saleTotal = 0;
        saleItems.forEach(item => {
            saleMRP += (item.mrp || item.unitPrice) * item.quantity;
            saleTotal += item.lineTotal;
        });

        let returnMRP = 0;
        let returnTotal = 0;
        returnItems.forEach(item => {
            const absQty = Math.abs(item.quantity);
            returnMRP += (item.mrp || item.unitPrice) * absQty;
            returnTotal += Math.abs(item.lineTotal);
        });

        const pointsEarnedToday = Math.max(0, Math.floor(invoice.totalAmount / 100));
        const overallPoints = customer?.loyaltyPoints || 0;

        // Format bill as text
        let text = `*${shopInfo.name.toUpperCase()}*\n`;
        text += `${shopInfo.address}\n`;
        text += `${shopInfo.state}\n`;
        text += `Ph: ${shopInfo.phone}\n`;
        if (shopInfo.gstin) text += `GSTIN: ${shopInfo.gstin}\n`;
        text += `----------------------------\n`;
        text += `*RETAIL INVOICE*\n`;
        text += `Inv No: ${invoice.invoiceNumber}\n`;
        text += `Date: ${dateStr}  Time: ${timeStr}\n`;
        text += `Salesman: ${invoice.salesmanId || "NA"}\n`;
        text += `----------------------------\n`;
        text += `Customer: ${invoice.customerName || "Walk-in"}\n`;
        if (customerMobile) text += `Mobile: ${customerMobile}\n`;
        text += `----------------------------\n`;

        if (saleItems.length > 0) {
            text += `*SALE ITEMS*\n`;
            text += `Item | Mrp | Qty | Rate | Amount\n`;
            saleItems.forEach(item => {
                const name = item.productName.length > 15 ? item.productName.substring(0, 15) : item.productName;
                text += `${name} | ${item.mrp || item.unitPrice} | ${item.quantity} | ${item.unitPrice} | ${item.lineTotal}\n`;
            });
            text += `----------------------------\n`;
        }

        if (returnItems.length > 0) {
            text += `*RETURN ITEMS*\n`;
            text += `Item | Qty | Rate | Amount\n`;
            returnItems.forEach(item => {
                const name = item.productName.length > 15 ? item.productName.substring(0, 15) : item.productName;
                text += `${name} | ${item.quantity} | ${item.unitPrice} | ${item.lineTotal}\n`;
            });
            text += `----------------------------\n`;
        }

        text += `*SUMMARY*\n`;
        if (saleItems.length > 0) {
            text += `Sale Total: ₹${saleTotal.toFixed(2)}\n`;
        }
        if (returnItems.length > 0) {
            text += `Return Total: -₹${returnTotal.toFixed(2)}\n`;
        }

        if (invoice.loyaltyDiscountAmount) {
            text += `Loyalty Disc: -₹${invoice.loyaltyDiscountAmount.toFixed(2)}\n`;
        }

        text += `*NET AMOUNT: ₹${invoice.totalAmount.toFixed(2)}*\n`;
        text += `----------------------------\n`;

        text += `*PAYMENT*\n`;
        text += `Mode: ${invoice.paymentMode || "Cash"}\n`;
        text += `Paid: ₹${invoice.paidAmount.toFixed(2)}\n`;
        if (invoice.balance > 0) text += `Balance: ₹${invoice.balance.toFixed(2)}\n`;
        if (invoice.cashReceived !== undefined && invoice.cashReceived > 0) {
            text += `Cash Recv: ₹${invoice.cashReceived.toFixed(2)}\n`;
            text += `Change: ₹${(invoice.changeAmount || 0).toFixed(2)}\n`;
        }
        text += `----------------------------\n`;

        text += `*LOYALTY POINTS*\n`;
        text += `Earned Today: ${pointsEarnedToday}\n`;
        if (customer) text += `Overall Points: ${overallPoints}\n`;
        text += `----------------------------\n`;

        text += `Thank you for shopping with us!`;

        const encodedText = encodeURIComponent(text);
        const url = `https://wa.me/91${targetNumber}?text=${encodedText}`;
        openUrl(url);
        toast.success("Opening WhatsApp...");
        onPrintComplete();
        onClose();
    };


    const handleSendWhatsappPdf = async () => {
        const targetNumber = getValidWhatsappNumber();
        if (!targetNumber) return;

        const html = getReceiptHtml();
        if (!html) return;

        if (!window.electron?.uploadBillPdf) {
            toast.warning("PDF upload is only available in the desktop app.");
            return;
        }

        setIsUploading(true);
        toast.info("Generating and uploading PDF...");

        try {
            const result = await window.electron.uploadBillPdf(html, invoice.invoiceNumber);
            if (result.ok && result.link) {
                let text = `${shopInfo.name + "\n" + shopInfo.address + "\n" + shopInfo.state + "\n" + shopInfo.phone + "\n" + shopInfo.gstin}\n`;
                text += `Here is your bill (Invoice #${invoice.invoiceNumber}):\n`;
                text += `Total Amount: ₹${invoice.totalAmount.toFixed(2)}\n`;
                text += `${result.link}\n`;
                text += `Thank you for shopping with us!`;

                const encodedText = encodeURIComponent(text);
                const url = `https://wa.me/91${targetNumber}?text=${encodedText}`;
                openUrl(url);
                toast.success("Opening WhatsApp...");
                onPrintComplete();
                onClose();
            } else {
                toast.error(result.message || "Failed to upload PDF");
            }
        } catch (error: any) {
            toast.error(error.message || "An error occurred during upload");
        } finally {
            setIsUploading(false);
        }
    };

    const handlePreview = () => {
        const html = getReceiptHtml();
        if (!html) {
            toast.warning("Preview not available.");
            return;
        }

        const win = window.open("", "_blank", "width=500,height=800");
        if (win) {
            win.document.write(`<!DOCTYPE html>
<html>
<head>
    <title>Bill Preview - ${invoice.invoiceNumber}</title>
    <meta charset="utf-8" />
    <style>
        /* Preview styling — matches the actual 80mm print output */
        @page { size: 80mm auto; margin: 0; }
        * { box-sizing: border-box; }
        html {
            background: #525659;
            min-height: 100%;
        }
        body {
            margin: 0;
            padding: 24px 0;
            background: transparent;
            text-align: center;   /* centers the inline-block receipt */
            min-height: 100%;
        }
        /* The white "paper" — grows with receipt content, never clips */
        .receipt-paper {
            display: inline-block;
            background: #fff;
            width: 80mm;         /* 80mm exact width for preview */
            padding: 0;          /* The padding is now handled inside Receipt80mm */
            box-shadow: 0 2px 16px rgba(0,0,0,0.5);
            text-align: left;
        }
        /* Mirror the Receipt80mm root styles for the preview */
        .receipt-paper > div {
            width: 100% !important;
            font-size: 11px !important;
        }
        img { max-width: 100%; }
        table { width: 100%; border-collapse: collapse; }
        /* Ensure nothing overflows the paper */
        * { word-break: break-word; overflow-wrap: break-word; }

        @media print {
            html { background: #fff; }
            body { padding: 0; }
            .receipt-paper { box-shadow: none; width: 80mm; }
        }
    </style>
</head>
<body>
    <div class="receipt-paper">
        ${html}
    </div>
</body>
</html>`);
            win.document.close();
            win.moveTo(0, 0);
            win.resizeTo(window.screen.availWidth, window.screen.availHeight);
        } else {
            toast.error("Please allow popups to view the preview.");
        }
    };

    useEffect(() => {
        const keyHandler = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % 5);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + 5) % 5);
            } else if (e.key === "Escape") {
                handleClose();
            } else if (e.key === "Enter") {
                // If focus is not on an input
                if (document.activeElement?.tagName !== "INPUT") {
                    e.preventDefault();
                    if (selectedIndex === 0) void handleDirectPrint();
                    else if (selectedIndex === 1) handlePreview();
                    else if (selectedIndex === 2) handleSendWhatsappText();
                    else if (selectedIndex === 3) {
                        if (!isUploading) void handleSendWhatsappPdf();
                    }
                    else if (selectedIndex === 4) handleClose();
                }
            }
        };
        window.addEventListener("keydown", keyHandler);
        return () => window.removeEventListener("keydown", keyHandler);
    }, [onClose, onPrintComplete, selectedIndex, isUploading, whatsappNumber]);

    useEffect(() => {
        const handleAfterPrint = () => {
            onPrintComplete();
            onClose();
        };
        window.addEventListener("afterprint", handleAfterPrint);
        return () => window.removeEventListener("afterprint", handleAfterPrint);
    }, [onPrintComplete, onClose]);

    return (
        <div style={styles.overlay}>
            <div style={styles.windowFrame}>
                {/* Header / Title Bar */}
                <div style={styles.titleBar}>
                    <span style={styles.titleText}>Print Options</span>
                    <button onClick={handleClose} style={styles.closeButton}>✕</button>
                </div>

                {/* Content Body */}
                <div style={styles.contentBody}>
                    <p style={{ margin: "0 0 15px 0", color: "#333", fontSize: "14px", fontWeight: "bold", textAlign: "center" }}>
                        Invoice #{invoice.invoiceNumber || "---"}
                    </p>

                    <div style={{ marginBottom: "15px", display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontSize: "12px", color: "#000080", fontWeight: "bold" }}>WhatsApp Number (Optional)</label>
                        <input
                            type="text"
                            style={styles.input}
                            placeholder="10-digit number"
                            maxLength={10}
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                        />
                    </div>

                    {/* HIDDEN RECEIPT CONTAINER */}
                    <div style={{ display: "none" }}>
                        <div ref={printRef}>
                            <Receipt80mm
                                invoice={invoice}
                                shop={shopInfo}
                                cashReceived={invoice.cashReceived}
                                changeAmount={invoice.changeAmount}
                            />
                        </div>
                    </div>

                    <div style={styles.actions}>
                        <button
                            autoFocus
                            onClick={() => void handleDirectPrint()}
                            disabled={isPrinting}
                            style={{
                                ...styles.button,
                                ...styles.primaryButton,
                                ...(selectedIndex === 0 ? styles.selectedButton : {}),
                                opacity: isPrinting ? 0.7 : 1
                            }}
                        >
                            {isPrinting ? "⏳ Printing..." : "🖨️ Print Receipt"}
                        </button>

                        <button
                            onClick={handlePreview}
                            style={{
                                ...styles.button,
                                ...styles.previewButton,
                                ...(selectedIndex === 1 ? styles.selectedButton : {})
                            }}
                        >
                            👁️ Preview Bill
                        </button>

                        <button
                            onClick={handleSendWhatsappText}
                            style={{
                                ...styles.button,
                                ...styles.whatsappButton,
                                ...(selectedIndex === 2 ? styles.selectedButton : {})
                            }}
                        >
                            💬 Whatsapp (Text)
                        </button>

                        <button
                            onClick={handleSendWhatsappPdf}
                            disabled={isUploading}
                            style={{
                                ...styles.button,
                                ...styles.whatsappButton,
                                opacity: isUploading ? 0.7 : 1,
                                ...(selectedIndex === 3 ? styles.selectedButton : {})
                            }}
                        >
                            {isUploading ? "⏳ Uploading..." : "📄 Whatsapp (PDF)"}
                        </button>

                        <button
                            onClick={handleClose}
                            style={{
                                ...styles.button,
                                ...(selectedIndex === 4 ? styles.selectedButton : {})
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintBillModal;

/* ---------- Styles ---------- */

const styles = {
    overlay: {
        position: "fixed" as const,
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)", // Slightly darker for better focus
        backdropFilter: "blur(2px)",      // Modern touch: slight blur behind
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 3000
    },
    windowFrame: {
        background: "#fff",
        width: "350px",
        borderRadius: "6px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,128, 0.5)", // Shadow + slight border ring
        overflow: "hidden", // Ensures header corners are rounded
        display: "flex",
        flexDirection: "column" as const,
        animation: "fadeIn 0.2s ease-out"
    },
    titleBar: {
        // Texture: Linear gradient gives it a 3D/Window bar feel
        background: "linear-gradient(180deg, #000080 0%, #000060 100%)",
        padding: "8px 12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #000040",
        cursor: "default",
        userSelect: "none" as const
    },
    titleText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: "14px",
        textShadow: "0px 1px 1px rgba(0,0,0,0.5)", // Text depth
        letterSpacing: "0.5px"
    },
    closeButton: {
        background: "transparent",
        border: "none",
        color: "#fff",
        fontSize: "20px",
        lineHeight: "1",
        cursor: "pointer",
        opacity: 0.8,
        padding: "0 4px"
    },
    contentBody: {
        padding: "20px",
        background: "#f9f9f9" // Very slight off-white for content area
    },
    actions: {
        display: "flex",
        flexDirection: "column" as const, // Stack buttons for mobile friendliness/clarity
        gap: "10px",
        marginTop: "10px"
    },
    button: {
        padding: "10px 15px",
        border: "1px solid #ccc",
        background: "#fff",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 500,
        transition: "all 0.1s"
    },
    primaryButton: {
        background: "#000080",
        color: "#fff",
        border: "1px solid #000060",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
    },
    previewButton: {
        background: "#4b0082", // Indigo
        color: "#fff",
        border: "1px solid #300060",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
    },
    whatsappButton: {
        background: "#25D366", // WhatsApp Green
        color: "#fff",
        border: "1px solid #128C7E",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
    },
    input: {
        padding: "8px 12px",
        border: "1px solid #ccc",
        borderRadius: "4px",
        fontSize: "14px",
        outline: "none",
        fontFamily: "'Courier New', monospace"
    },
    selectedButton: {
        outline: "2px solid #000",
        outlineOffset: "2px",
        transform: "scale(1.02)",
        boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
        filter: "brightness(1.1)"
    }
};