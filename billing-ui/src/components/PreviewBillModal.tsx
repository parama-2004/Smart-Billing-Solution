import { useEffect, useState, useRef } from "react";
import Receipt80mm from "./Receipt80mm";
import type { InvoiceResponseDto } from "../models/Invoice";

interface Props {
    invoice: InvoiceResponseDto;
    onClose: () => void;
    onPrint: () => void;
}

const shopInfo = {
    name: "Smart Super Market",
    address: "58,59 Main Bazaar Block - 19",
    state: "Neyveli TS PIN-607803",
    phone: "8903825381/8220919445",
    gstin: "GST33ABXFS8086J1Z7"
};

const PreviewBillModal = ({ invoice, onClose, onPrint }: Props) => {
    const [zoom, setZoom] = useState<number>(1.0);
    const [directZoomEnabled, setDirectZoomEnabled] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [startX, setStartX] = useState<number>(0);
    const [startY, setStartY] = useState<number>(0);
    const [scrollLeft, setScrollLeft] = useState<number>(0);
    const [scrollTop, setScrollTop] = useState<number>(0);

    const receiptContainerRef = useRef<HTMLDivElement>(null);

    // Capture-phase key handler for absolute robust ESC close
    useEffect(() => {
        const keyHandler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
            if (e.key === "p" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                onPrint();
            }
        };
        // Using capture: true to make sure ESC key handles modal close before focus is trapped elsewhere
        window.addEventListener("keydown", keyHandler, true);
        return () => window.removeEventListener("keydown", keyHandler, true);
    }, [onClose, onPrint]);

    // Calculate and apply optimal Fit-Width zoom level
    const handleFitZoom = () => {
        if (receiptContainerRef.current) {
            const containerWidth = receiptContainerRef.current.clientWidth;
            // The 80mm thermal receipt has a standard layout width of 302px (80mm)
            const receiptWidth = 302;
            const availableWidth = containerWidth - 48; // Leave comfortable margins
            const fitZoom = Math.min(Math.max(availableWidth / receiptWidth, 0.8), 2.2);
            
            // Round zoom factor to 1 decimal place (e.g. 1.3)
            const roundedZoom = Math.round(fitZoom * 10) / 10;
            setZoom(roundedZoom);
        }
    };

    // Calculate fit width when component mounts
    useEffect(() => {
        const timer = setTimeout(() => {
            handleFitZoom();
        }, 50); // Small layout tick timeout for accurate container measurements
        return () => clearTimeout(timer);
    }, []);

    // Native scroll wheel zoom handler to enable preventDefault
    useEffect(() => {
        const container = receiptContainerRef.current;
        if (!container) return;

        const handleNativeWheel = (e: WheelEvent) => {
            // Zoom if Ctrl/Cmd is held OR directZoom mode is toggled ON
            if (directZoomEnabled || e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const zoomDirection = e.deltaY < 0 ? 1 : -1;
                setZoom(prevZoom => {
                    const nextZoom = prevZoom + zoomDirection * 0.1;
                    // Clamp zoom between 40% and 300%
                    return Math.min(Math.max(nextZoom, 0.4), 3.0);
                });
            }
        };

        container.addEventListener("wheel", handleNativeWheel, { passive: false });
        return () => {
            container.removeEventListener("wheel", handleNativeWheel);
        };
    }, [directZoomEnabled]);

    // Grab-and-drag panning implementation
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!receiptContainerRef.current) return;
        
        // Prevent panning when clicking buttons or interactive forms
        if ((e.target as HTMLElement).closest("button, input, select, a")) return;

        setIsDragging(true);
        setStartX(e.pageX - receiptContainerRef.current.offsetLeft);
        setStartY(e.pageY - receiptContainerRef.current.offsetTop);
        setScrollLeft(receiptContainerRef.current.scrollLeft);
        setScrollTop(receiptContainerRef.current.scrollTop);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !receiptContainerRef.current) return;
        e.preventDefault();

        const x = e.pageX - receiptContainerRef.current.offsetLeft;
        const y = e.pageY - receiptContainerRef.current.offsetTop;
        const walkX = (x - startX) * 1.5; // Multiplier for panning speed
        const walkY = (y - startY) * 1.5;

        receiptContainerRef.current.scrollLeft = scrollLeft - walkX;
        receiptContainerRef.current.scrollTop = scrollTop - walkY;
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };

    const zoomPercent = Math.round(zoom * 100);

    return (
        <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={styles.windowFrame}>
                {/* Title Bar Header */}
                <div style={styles.titleBar}>
                    <div style={styles.titleTextContainer}>
                        <span style={styles.titleIcon}>🧾</span>
                        <span style={styles.titleText}>Print Studio - Bill Preview</span>
                    </div>
                    <button onClick={onClose} style={styles.closeButton} title="Close (Esc)">✕</button>
                </div>

                {/* Glassmorphic Interactive Toolbar */}
                <div style={styles.toolbar}>
                    {/* Zoom Buttons Group */}
                    <div style={styles.toolbarGroup}>
                        <button 
                            onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.4))}
                            disabled={zoom <= 0.4}
                            style={{ 
                                ...styles.toolButton, 
                                ...(zoom <= 0.4 ? styles.toolButtonDisabled : {}) 
                            }}
                            title="Zoom Out"
                        >
                            ➖
                        </button>
                        <button 
                            onClick={() => setZoom(1.0)} 
                            style={styles.zoomBadge}
                            title="Reset to 100%"
                        >
                            {zoomPercent}%
                        </button>
                        <button 
                            onClick={() => setZoom(prev => Math.min(prev + 0.1, 3.0))}
                            disabled={zoom >= 3.0}
                            style={{ 
                                ...styles.toolButton, 
                                ...(zoom >= 3.0 ? styles.toolButtonDisabled : {}) 
                            }}
                            title="Zoom In"
                        >
                            ➕
                        </button>
                        <button 
                            onClick={handleFitZoom}
                            style={styles.fitButton}
                            title="Fit Receipt Width"
                        >
                            Fit Width
                        </button>
                    </div>

                    {/* Mode Toggles & Helpful Tooltips */}
                    <div style={styles.toolbarGroup}>
                        <button
                            onClick={() => setDirectZoomEnabled(!directZoomEnabled)}
                            style={{
                                ...styles.toggleSwitch,
                                ...(directZoomEnabled ? styles.toggleSwitchActive : {})
                            }}
                            title={directZoomEnabled ? "Switch to normal scroll" : "Switch to direct zoom"}
                        >
                            {directZoomEnabled ? "🖱️ Scroll Zoom: ON" : "📜 Scroll Zoom: OFF"}
                        </button>
                        
                        <div style={styles.tipBadge}>
                            {directZoomEnabled ? "💡 Drag receipt to Pan" : "💡 Ctrl + Scroll to Zoom"}
                        </div>
                    </div>
                </div>

                {/* Content Studio Backdrop (Dark Viewport) */}
                <div style={styles.contentBody}>
                    <div 
                        ref={receiptContainerRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUpOrLeave}
                        onMouseLeave={handleMouseUpOrLeave}
                        style={{
                            ...styles.receiptContainer,
                            cursor: isDragging ? "grabbing" : (directZoomEnabled || zoom > 1.0 ? "grab" : "default")
                        }}
                    >
                        {/* Receipt Paper Wrapper scaled using CSS zoom */}
                        <div style={{
                            ...styles.receiptPaperWrapper,
                            zoom: zoom as any,
                        }}>
                            <Receipt80mm 
                                invoice={invoice} 
                                shop={shopInfo}
                                cashReceived={invoice.cashReceived}
                                changeAmount={invoice.changeAmount}
                            />
                        </div>
                    </div>

                    {/* Footer Actions Panel */}
                    <div style={styles.actions}>
                        <button
                            onClick={onClose}
                            style={styles.cancelButton}
                        >
                            Discard
                        </button>
                        <button
                            onClick={onPrint}
                            style={styles.printButton}
                        >
                            🖨️ Send to Thermal Printer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreviewBillModal;

const styles = {
    overlay: {
        position: "fixed" as const,
        inset: 0,
        background: "rgba(10, 15, 30, 0.75)",
        backdropFilter: "blur(12px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 4000,
        animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
    },
    windowFrame: {
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        width: "90%",
        maxWidth: "650px",
        maxHeight: "92vh",
        borderRadius: "16px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.12)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        flexDirection: "column" as const,
        overflow: "hidden",
        animation: "slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
    },
    titleBar: {
        padding: "16px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        userSelect: "none" as const,
    },
    titleTextContainer: {
        display: "flex",
        alignItems: "center",
        gap: "10px"
    },
    titleIcon: {
        fontSize: "18px"
    },
    titleText: {
        color: "#f8fafc",
        fontWeight: 600,
        fontSize: "16px",
        letterSpacing: "0.25px",
        fontFamily: "'Segoe UI', Roboto, sans-serif"
    },
    closeButton: {
        background: "rgba(255, 255, 255, 0.05)",
        border: "none",
        color: "#94a3b8",
        fontSize: "14px",
        borderRadius: "50%",
        width: "28px",
        height: "28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        outline: "none"
    },
    toolbar: {
        background: "rgba(15, 23, 42, 0.4)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        padding: "12px 24px",
        display: "flex",
        flexWrap: "wrap" as const,
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        userSelect: "none" as const,
    },
    toolbarGroup: {
        display: "flex",
        alignItems: "center",
        gap: "8px"
    },
    toolButton: {
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        color: "#e2e8f0",
        borderRadius: "6px",
        padding: "6px 10px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
        fontSize: "12px",
        outline: "none",
    },
    toolButtonDisabled: {
        opacity: 0.3,
        cursor: "not-allowed"
    },
    zoomBadge: {
        background: "rgba(99, 102, 241, 0.15)",
        border: "1px solid rgba(99, 102, 241, 0.3)",
        color: "#818cf8",
        borderRadius: "6px",
        padding: "6px 12px",
        fontWeight: "600",
        fontSize: "12px",
        fontFamily: "monospace",
        cursor: "pointer",
        transition: "all 0.2s",
        outline: "none"
    },
    fitButton: {
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        color: "#e2e8f0",
        borderRadius: "6px",
        padding: "6px 12px",
        fontSize: "12px",
        cursor: "pointer",
        fontWeight: 500,
        transition: "all 0.2s",
        outline: "none"
    },
    toggleSwitch: {
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        color: "#94a3b8",
        borderRadius: "20px",
        padding: "6px 14px",
        fontSize: "11px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        outline: "none",
    },
    toggleSwitchActive: {
        background: "rgba(99, 102, 241, 0.2)",
        border: "1px solid rgba(99, 102, 241, 0.4)",
        color: "#a5b4fc",
    },
    tipBadge: {
        background: "rgba(15, 23, 42, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.04)",
        color: "#64748b",
        fontSize: "11px",
        borderRadius: "20px",
        padding: "5px 12px",
        fontWeight: 500
    },
    contentBody: {
        padding: "24px",
        background: "#090d16", // Midnight/Neon contrast background
        display: "flex",
        flexDirection: "column" as const,
        overflow: "hidden",
        flex: 1
    },
    receiptContainer: {
        background: "#05070c",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.04)",
        boxShadow: "inset 0 4px 20px rgba(0,0,0,0.6)",
        overflow: "auto" as const,
        maxHeight: "calc(92vh - 200px)",
        minHeight: "350px",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "24px",
        flex: 1,
        userSelect: "none" as const, // Prevents copy selection flashes when panning
        position: "relative" as const
    },
    receiptPaperWrapper: {
        background: "#ffffff",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.08)",
        borderRadius: "4px",
        padding: "16px",
        transformOrigin: "top center",
        transition: "zoom 0.12s ease-out, transform 0.12s ease-out",
        display: "inline-block"
    },
    actions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "12px",
        marginTop: "20px"
    },
    cancelButton: {
        padding: "10px 24px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        background: "rgba(255, 255, 255, 0.03)",
        color: "#94a3b8",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 600,
        transition: "all 0.2s",
        outline: "none"
    },
    printButton: {
        padding: "10px 24px",
        border: "none",
        background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
        color: "#ffffff",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 600,
        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        outline: "none"
    }
};
