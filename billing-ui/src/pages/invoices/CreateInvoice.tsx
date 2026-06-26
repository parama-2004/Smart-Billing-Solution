import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import type {

    InvoiceResponseDto
} from "../../models/Invoice";
import { getInvoiceByNumber, getHoldInvoices, deleteInvoice } from "../../api/invoiceApi";
import type { CustomerDto } from "../../models/Customer";
import type { ProductDto } from "../../models/Product";
import type { BarcodeMasterDto } from "../../models/Barcode";
import { createInvoice, updateInvoice, getAllInvoices, getReprintInvoices, adminUpdateInvoice } from "../../api/invoiceApi";
import { verifyAdminApi } from "../../api/authApi";
import { createCustomer, getCustomerById, getCustomers } from "../../api/customerApi";
import { useProducts } from "../../hooks/useProducts";
import ProductSearchModal from "../../components/ProductSearchModal";
import PaymentModal, { type PaymentSelection } from "../../components/PaymentModal";
import { makePayment } from "../../api/paymentApi";
import { getAllSalesmen } from "../../api/salesmanApi";
import type { SalesmanDto } from "../../models/Salesman";
import { createRefund } from "../../api/refundApi";
import PrintBillModal from "../../components/PrintBillModal";
import { getPrimaryBarcodeFromArray } from "../../utils/barcodeUtils";
import {
    formatToDDMMYYYY,
    // formatToDDMMYYYYHHmm,
    formatToDDMMYYYYhhmmA,
    getCurrentDateTime
} from "../../utils/dateUtils";
import "../../Styles/GlobalLayout.css";
import "../../Styles/BillingStyles.css";
import { usePageTitle } from "../../hooks/usePageTitle";
import { SidebarProvider } from "../../context/SidebarContext";
import { useSidebar } from "../../hooks/useSidebar";
import SidebarTrigger from "../../components/SidebarTrigger";
import { getAllGifts } from "../../api/giftApi";
import type { GiftProductDto } from "../../models/Gift";

/* ---------------- Types ---------------- */
type InvoiceRow = {
    productId: number;
    quantity: number;
    rate?: number;
    mrp?: number;
    lineTotal?: number;
    product?: ProductDto;
    displayText?: string;
    isRateOverridden?: boolean;
    isMrpOverridden?: boolean;
    hsnCode?: string;
    gstPercentage?: number;
    isReturn?: boolean;
    _rawQty?: string;
    _rawRate?: string;
    _rawMrp?: string;
};

type RedemptionSelection = {
    type: "Discount" | "Gift";
    points: number;
    giftProductName?: string;
};

type NewCustomerForm = {
    name: string;
    mobile: string;
    address: string;
    telephone: string;
    email: string;
    openingBalance: number;
};

const emptyNewCustomerForm: NewCustomerForm = {
    name: "",
    mobile: "",
    address: "",
    telephone: "",
    email: "",
    openingBalance: 0
};

/* ---------------- Invoice Row Component ---------------- */
interface InvoiceRowProps {
    row: InvoiceRow;
    rowIndex: number;
    isActive: boolean;
    updateDisplayText: (rowIndex: number, text: string) => void;
    updateMrp: (rowIndex: number, value: string) => void;
    updateRate: (rowIndex: number, value: string) => void;
    updateQuantity: (rowIndex: number, value: string) => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, columnType: "product" | "qty" | "rate" | "mrp") => void;
    handleFocus: (rowIndex: number, columnType: "product" | "qty" | "rate" | "mrp", target: HTMLInputElement) => void;
    deleteRow: (rowIndex: number) => void;
    setProductRef: (el: HTMLInputElement | null, rowIndex: number) => void;
    setMrpRef: (el: HTMLInputElement | null, rowIndex: number) => void;
    setRateRef: (el: HTMLInputElement | null, rowIndex: number) => void;
    setQtyRef: (el: HTMLInputElement | null, rowIndex: number) => void;
    currentColumn: "product" | "qty" | "rate" | "mrp";
}

const InvoiceRowComponent = memo(({
    row,
    rowIndex,
    isActive,
    updateDisplayText,
    updateMrp,
    updateRate,
    updateQuantity,
    handleKeyDown,
    handleFocus,
    deleteRow,
    setProductRef,
    setMrpRef,
    setRateRef,
    setQtyRef,
    currentColumn
}: InvoiceRowProps) => {
    return (
        <tr
            className={isActive ? "active-row" : ""}
            style={row.isReturn ? { backgroundColor: '#ffe6e6', color: 'red' } : {}}
        >
            <td style={{ textAlign: "center", color: row.isReturn ? 'red' : 'inherit' }}>
                {row.isReturn ? `R${rowIndex + 1}` : rowIndex + 1}
            </td>

            <td className={isActive && currentColumn === "product" ? "active-cell" : ""}>
                <input
                    ref={(el) => setProductRef(el, rowIndex)}
                    className="grid-input"
                    type="text"
                    value={row.displayText || ""}
                    onChange={(e) => updateDisplayText(rowIndex, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, rowIndex, "product")}
                    onFocus={(e) => handleFocus(rowIndex, "product", e.target)}
                    style={row.isReturn ? { color: 'red', fontWeight: 'bold' } : {}}
                />
            </td>

            <td style={{ background: isActive ? "transparent" : "snow", textAlign: "center", color: row.isReturn ? 'red' : 'black' }}>
                {row.product?.hsnCode || "-"}
            </td>

            <td style={{ background: isActive ? "transparent" : "snow", textAlign: "left", paddingLeft: '7px', color: row.isReturn ? 'red' : 'black' }}>
                {row.product ? (
                    <div>
                        <strong>{row.product.name}</strong>
                        {row.isReturn && <span style={{ color: 'red', fontSize: '10px', marginLeft: '5px' }}>RETURN</span>}
                    </div>
                ) : " "}
            </td>

            <td className={isActive && currentColumn === "mrp" ? "active-cell" : ""}>
                <input
                    ref={(el) => setMrpRef(el, rowIndex)}
                    className="grid-input"
                    type="text"
                    value={row._rawMrp ?? (row.mrp ?? "")}
                    onChange={(e) => updateMrp(rowIndex, e.target.value.replace(/[^0-9.]/g, ""))}
                    onKeyDown={(e) => handleKeyDown(e, rowIndex, "mrp")}
                    onFocus={(e) => handleFocus(rowIndex, "mrp", e.target)}
                    style={row.isReturn ? { color: 'red', fontWeight: 'bold' } : { fontSize: '18px', fontWeight: 'bold' }}
                />
                {row.isMrpOverridden && <span className="rate-override-indicator"></span>}
            </td>

            <td className={isActive && currentColumn === "qty" ? "active-cell" : ""}>
                <input
                    ref={(el) => setQtyRef(el, rowIndex)}
                    className="grid-input"
                    type="text"
                    value={row._rawQty ?? (row.quantity || "")}
                    onChange={(e) => updateQuantity(rowIndex, e.target.value.replace(/[^0-9.]/g, ''))}
                    onKeyDown={(e) => handleKeyDown(e, rowIndex, "qty")}
                    onFocus={(e) => handleFocus(rowIndex, "qty", e.target)}
                    style={row.isReturn ? { color: 'red', fontWeight: 'bold' } : {}}
                />
            </td>

            <td className={isActive && currentColumn === "rate" ? "active-cell" : ""}>
                <div className="rate-cell">
                    <input
                        ref={(el) => setRateRef(el, rowIndex)}
                        className={`grid-input ${row.rate && row.mrp && row.rate > row.mrp ? 'rate-exceeds-mrp' : ''}`}
                        type="text"
                        value={row._rawRate ?? (row.rate || "")}
                        onChange={(e) => updateRate(rowIndex, e.target.value.replace(/[^0-9.]/g, ''))}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, "rate")}
                        onFocus={(e) => handleFocus(rowIndex, "rate", e.target)}
                        style={row.isReturn ? { color: 'red', fontWeight: 'bold' } : {}}
                        title={row.rate && row.mrp && row.rate > row.mrp ? `Rate exceeds MRP (₹${row.mrp})` : ''}
                    />
                    {row.isRateOverridden && <span className="rate-override-indicator" title="Rate overridden"></span>}
                </div>
            </td>

            <td className="value-cell" style={{
                textAlign: "left",
                paddingLeft: '7px',
                color: row.isReturn ? 'red' : 'firebrick',
                fontWeight: row.isReturn ? 'bold' : 'normal',
                background: isActive ? "transparent" : "snow"
            }}>
                <strong>{row.lineTotal ? `₹${row.lineTotal.toFixed(2)}` : "-"}</strong>
                {row.isReturn && row.lineTotal && <div style={{ fontSize: '9px', color: 'red' }}>RETURN</div>}
            </td>

            <td>
                <button
                    className="grid-delete-btn"
                    onClick={() => deleteRow(rowIndex)}
                    title="Delete row (Delete key in product field)"
                >
                    Del
                </button>
            </td>
        </tr>
    );
});


/* ---------------- Component ---------------- */
const CreateInvoiceContent = () => {
    usePageTitle("Create Invoice");
    const { isExpanded } = useSidebar();
    const { user: authUser } = useAuth();
    /* ---------- State ---------- */
    const [customerId, setCustomerId] = useState<number | null>(null);
    const [customer, setCustomer] = useState<CustomerDto | null>(null);
    const [customerName, setCustomerName] = useState("");
    const { data: products = [], refetch: refetchProducts } = useProducts();
    const [items, setItems] = useState<InvoiceRow[]>([
        { productId: 0, quantity: 0, displayText: "" }
    ]);
    const [invoice, setInvoice] = useState<InvoiceResponseDto | null>(null);
    const [showSuccessFooter, setShowSuccessFooter] = useState(false);
    const [currentRow, setCurrentRow] = useState(0);
    const [currentColumn, setCurrentColumn] = useState<"product" | "qty" | "mrp" | "rate">("product");

    /* ---------- Display State ---------- */
    const [fontZoom, setFontZoom] = useState(1);

    /* ---------- Product Search Modal State ---------- */
    const [showProductModal, setShowProductModal] = useState(false);
    const [productSearchRow, setProductSearchRow] = useState<number | null>(null);
    const [productSearchQuery, setProductSearchQuery] = useState("");

    /* ---------- Payment Modal State ---------- */
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [salesmen, setSalesmen] = useState<SalesmanDto[]>([]);
    const [salesmanId, setSalesmanId] = useState<number | null>(null);

    /* ---------- Print Modal State ---------- */
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [lastInvoice, setLastInvoice] = useState<InvoiceResponseDto | null>(null);

    /* ---------- Hold Bills Modal State ---------- */
    const [showHoldModal, setShowHoldModal] = useState(false);
    const [holdInvoices, setHoldInvoices] = useState<InvoiceResponseDto[]>([]);
    const [loadingHolds, setLoadingHolds] = useState(false);
    const [pendingDeleteHoldId, setPendingDeleteHoldId] = useState<number | null>(null);

    /* ---------- Reprint Bills Modal State ---------- */
    const [showReprintModal, setShowReprintModal] = useState(false);
    const [reprintInvoices, setReprintInvoices] = useState<InvoiceResponseDto[]>([]);
    const [reprintSearchQuery, setReprintSearchQuery] = useState("");
    const [loadingReprint, setLoadingReprint] = useState(false);
    const [selectedReprintIndex, setSelectedReprintIndex] = useState(0);
    const reprintSearchInputRef = useRef<HTMLInputElement>(null);

    /* ---------- Admin Edit Modal State ---------- */
    const [showAdminEditModal, setShowAdminEditModal] = useState(false);
    const [adminEditStep, setAdminEditStep] = useState<"password" | "search">("password");
    const [adminPassword, setAdminPassword] = useState("");
    const [adminSearchTerm, setAdminSearchTerm] = useState("");
    const [adminSearchResults, setAdminSearchResults] = useState<InvoiceResponseDto[]>([]);
    const [isAdminEditing, setIsAdminEditing] = useState(false);

    /* ---------- Customer Modal State ---------- */
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerList, setCustomerList] = useState<CustomerDto[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [addingCustomer, setAddingCustomer] = useState(false);
    const [newCustomerForm, setNewCustomerForm] = useState<NewCustomerForm>(emptyNewCustomerForm);
    const [newCustomerErrors, setNewCustomerErrors] = useState<{ [key: string]: string }>({});

    /* ---------- Loyalty Redemption State ---------- */
    const [showRedemptionModal, setShowRedemptionModal] = useState(false);
    const [gifts, setGifts] = useState<GiftProductDto[]>([]);
    const [redemptionType, setRedemptionType] = useState<"Discount" | "Gift">("Discount");
    const [redeemPointsInput, setRedeemPointsInput] = useState("0");
    const [redeemGiftName, setRedeemGiftName] = useState("");
    const [selectedRedemption, setSelectedRedemption] = useState<RedemptionSelection | null>(null);

    /* ---------- Inline confirm dialog state ---------- */
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title?: string;
        message?: string;
        onConfirm?: () => void | Promise<void>;
    }>({ open: false });


    /* ---------- Refs ---------- */
    const customerIdRef = useRef<HTMLInputElement>(null);
    const productRefs = useRef<HTMLInputElement[]>([]);
    const qtyRefs = useRef<HTMLInputElement[]>([]);
    const rateRefs = useRef<HTMLInputElement[]>([]);
    const mrpRefs = useRef<HTMLInputElement[]>([]);
    const itemsRef = useRef<InvoiceRow[]>(items);
    const customerIdRefLive = useRef<number | null>(customerId);
    const salesmanIdRefLive = useRef<number | null>(salesmanId);
    const isSavingRef = useRef(false);

    /* ---------- Invoice Recall State ---------- */
    const [invoiceNoInput, setInvoiceNoInput] = useState("");
    const [isRecalledInvoice, setIsRecalledInvoice] = useState(false);

    /* ---------- Recovery State ---------- */
    const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
    const RECOVERY_KEY = "billing_draft_recovery";

    const gridContainerRef = useRef<HTMLDivElement>(null);

    /* ---------- Initialize Check Recovery ---------- */
    useEffect(() => {
        customerIdRef.current?.focus();

        // Check for unsaved draft in localStorage
        try {
            const draft = localStorage.getItem(RECOVERY_KEY);
            if (draft) {
                const parsed = JSON.parse(draft);
                if (parsed?.items && parsed.items.some((i: InvoiceRow) => i.productId > 0)) {
                    setShowRecoveryBanner(true);
                }
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        itemsRef.current = items;
        customerIdRefLive.current = customerId;
        salesmanIdRefLive.current = salesmanId;

        // Auto-save draft to localStorage for crash recovery
        const hasRealItems = items.some(i => i.productId > 0);
        if (hasRealItems) {
            try {
                localStorage.setItem(RECOVERY_KEY, JSON.stringify({
                    items,
                    customerId,
                    customerName,
                    savedAt: new Date().toISOString()
                }));
            } catch { /* ignore storage errors */ }
        }
    }, [items, customerId, salesmanId, customerName]);


    useEffect(() => {
        getAllSalesmen()
            .then(data => {
                setSalesmen(data);
                // Auto-set salesman from logged-in user
                if (authUser) {
                    const matchedSalesman = data.find(
                        s => s.name.toLowerCase() === authUser.username.toLowerCase() && s.isActive
                    );
                    if (matchedSalesman) {
                        setSalesmanId(matchedSalesman.id);
                    } else {
                        // For admin or unmatched users, do not set a salesman ID to avoid foreign key errors
                        setSalesmanId(null);
                    }
                }
            })
            .catch(() => setSalesmen([]));
    }, [authUser]);

    useEffect(() => {
        getAllGifts()
            .then(data => setGifts(data.filter(g => g.isActive)))
            .catch(() => setGifts([]));
    }, []);

    /* ---------- Load Hold Invoices ---------- */
    const loadHoldInvoices = async () => {
        try {
            setLoadingHolds(true);
            const holds = await getHoldInvoices();
            setHoldInvoices(holds);
        } catch (error) {
            console.error("Failed to load hold invoices:", error);
            toast.error("Failed to load hold invoices");
        } finally {
            setLoadingHolds(false);
        }
    };

    const resetBilling = () => {
        setCustomerId(null);
        setCustomer(null);
        setCustomerName("");
        setItems([{ productId: 0, quantity: 0, displayText: "" }]);
        setInvoice(null);
        setCurrentRow(0);
        setCurrentColumn("product");
        setShowPaymentModal(false);
        setShowPrintModal(false);
        setShowProductModal(false);
        setShowHoldModal(false);
        setPendingDeleteHoldId(null);
        setShowReprintModal(false);
        setShowRedemptionModal(false);
        setInvoiceNoInput("");
        setIsRecalledInvoice(false);
        setIsAdminEditing(false);
        setSelectedRedemption(null);
        setRedemptionType("Discount");
        setRedeemPointsInput("0");
        setRedeemGiftName("");
        setShowRecoveryBanner(false);
        setShowSuccessFooter(false);
        // Clear the saved draft when billing is intentionally reset
        try { localStorage.removeItem(RECOVERY_KEY); } catch { /* ignore */ }

        // Focus product ID
        setTimeout(() => {
            productRefs.current[0]?.focus();
        }, 50);
    };

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (showSuccessFooter) {
            timer = setTimeout(() => setShowSuccessFooter(false), 5000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [showSuccessFooter]);

    useEffect(() => {
        // Auto-scroll to active row
        if (currentRow > 0) {
            const activeRowElement = productRefs.current[currentRow]?.closest('tr');
            if (activeRowElement) {
                // Get the container and row position
                const container = document.querySelector('.billing-grid-container');
                const rowRect = activeRowElement.getBoundingClientRect();
                const containerRect = container?.getBoundingClientRect();

                if (container && containerRect) {
                    // Check if row is near bottom of container
                    const rowBottom = rowRect.bottom;
                    const containerBottom = containerRect.bottom;

                    // If row is below the visible area (with 50px buffer)
                    if (rowBottom > containerBottom - 50) {
                        // Calculate scroll amount needed
                        const scrollAmount = rowBottom - containerBottom + 50;

                        // Smooth scroll the container
                        container.scrollBy({
                            top: scrollAmount,
                            behavior: 'smooth'
                        });
                    }
                }
            }
        }
    }, [currentRow]);


    /* ---------- Keyboard Shortcuts ---------- */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // When any modal is open, don't handle global shortcuts —
            // let the modal's own keyboard handler take full control.
            const isAnyModalOpen = showPrintModal || showPaymentModal || showHoldModal
                || showReprintModal || showProductModal || showCustomerModal
                || showRedemptionModal || showAdminEditModal || confirmDialog.open;

            // Zoom shortcuts should always work, even when modals are open
            const isZoomInShortcut = e.ctrlKey && (e.key === "+" || e.key === "=" || e.key === "Add");
            const isZoomOutShortcut = e.ctrlKey && (e.key === "-" || e.key === "_" || e.key === "Subtract");

            if (isZoomInShortcut) {
                e.preventDefault();
                setFontZoom(z => Math.min(z + 0.1, 2));
                return;
            }

            if (isZoomOutShortcut) {
                e.preventDefault();
                setFontZoom(z => Math.max(z - 0.1, 0.5));
                return;
            }

            // Block all other shortcuts when a modal is open
            if (isAnyModalOpen) return;

            if (e.key === "F2") {
                e.preventDefault();
                if (!customerId || !customer) {
                    toast.warning("Select customer before redeeming points");
                    return;
                }
                setShowRedemptionModal(true);
                return;
            }

            if (e.key === "F10") {
                e.preventDefault();

                if (e.ctrlKey) {
                    handleShowHoldBills();

                } else {
                    void handleHoldBillWithData(
                        itemsRef.current,
                        customerIdRefLive.current,
                        salesmanIdRefLive.current
                    ).then(() => {
                        resetBilling();
                    });
                }

            }

            if (e.key === "F6" && e.ctrlKey) {
                e.preventDefault();
                resetBilling();
            }

            if (e.key === "F8") {
                e.preventDefault();
                if ((window as any).electron && (window as any).electron.openCalculator) {
                    (window as any).electron.openCalculator();
                } else {
                    toast.warning("Calculator shortcut is only available in the Electron application");
                }
                return;
            }

            if (e.key === "F12") {
                e.preventDefault();
                if (e.ctrlKey) {
                    handleShowReprintBills();
                } else {
                    if (lastInvoice) {
                        setShowPrintModal(true);
                    } else {
                        toast.warning("No bill to reprint");
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [lastInvoice, customerId, customer, showPaymentModal, showPrintModal, showHoldModal, showReprintModal, showProductModal, showCustomerModal, showRedemptionModal, showAdminEditModal, confirmDialog.open]);


    // Keep your existing F5 handler for invoice recall
    useEffect(() => {
        const handleF5 = async (e: KeyboardEvent) => {
            if (e.key !== "F5") return;

            // Don't handle F5 when any modal is open
            const isAnyModalOpen = showPrintModal || showPaymentModal || showHoldModal
                || showReprintModal || showProductModal || showCustomerModal
                || showRedemptionModal || showAdminEditModal || confirmDialog.open;
            if (isAnyModalOpen) return;

            if (e.ctrlKey) {
                e.preventDefault();
                setShowAdminEditModal(true);
                return;
            }
            e.preventDefault();

            try {
                if (invoiceNoInput.trim()) {
                    const inv = await getInvoiceByNumber(invoiceNoInput.trim());
                    loadInvoiceToScreen(inv);
                    return;
                }

                if (lastInvoice?.invoiceNumber) {
                    const inv = await getInvoiceByNumber(lastInvoice.invoiceNumber);
                    loadInvoiceToScreen(inv);
                    return;
                }

                toast.warning("No invoice available to recall");
            } catch {
                toast.error("Failed to recall invoice");
            }
        };

        window.addEventListener("keydown", handleF5);
        return () => window.removeEventListener("keydown", handleF5);
    }, [invoiceNoInput, lastInvoice, showPrintModal, showPaymentModal, showHoldModal, showReprintModal, showProductModal, showCustomerModal, showRedemptionModal, showAdminEditModal, confirmDialog.open]);

    /* ---------- F7 for Save & Payment ---------- */
    useEffect(() => {
        const handleF7 = async (e: KeyboardEvent) => {
            if (e.key !== "F7") return;

            // Don't handle F7 when any modal is open
            const isAnyModalOpen = showPrintModal || showPaymentModal || showHoldModal
                || showReprintModal || showProductModal || showCustomerModal
                || showRedemptionModal || showAdminEditModal || confirmDialog.open;
            if (isAnyModalOpen) return;

            e.preventDefault();

            if (isSavingRef.current) return;
            isSavingRef.current = true;
            try {

                if (!invoice) {
                    try {
                        const error = validateInvoice();
                        if (error) {
                            toast.error(error as string);
                            return;
                        }

                        const validItems = items
                            .filter(i => i.productId > 0 && i.quantity !== 0)
                            .map(i => ({
                                productId: i.productId,
                                quantity: i.isReturn ? -Math.abs(i.quantity) : Math.abs(i.quantity),
                                rate: i.rate ?? i.product?.price ?? 0,
                                mrp: i.mrp ?? i.product?.mrp ?? 0,
                                gstPercentage: i.gstPercentage ?? i.product?.gstPercentage ?? 0
                            }));

                        const calculatedSubtotal = validItems.reduce((sum, item) => {
                            return sum + (item.quantity * item.rate);
                        }, 0);

                        if (calculatedSubtotal < 0) {
                            // Ask inline confirmation before creating refund invoice
                            setConfirmDialog({
                                open: true,
                                title: "Create Refund Invoice",
                                message: `Invoice total is negative (₹${calculatedSubtotal.toFixed(2)}). This will create a refund invoice. Continue?`,
                                onConfirm: async () => {
                                    try {
                                        const refundInvoice = await createInvoice({
                                            customerId: customerId! || undefined,
                                            salesmanId: salesmanId!,
                                            items: validItems,
                                            status: "Unpaid",
                                            redemption: selectedRedemption
                                                ? {
                                                    type: selectedRedemption.type,
                                                    points: selectedRedemption.points,
                                                    giftProductName: selectedRedemption.giftProductName
                                                }
                                                : undefined
                                        });
                                        setInvoice(refundInvoice);
                                        setShowSuccessFooter(true);
                                        setLastInvoice(refundInvoice);
                                        setShowPaymentModal(true);
                                        toast.success("Refund invoice created successfully");
                                    } catch (error) {
                                        console.error(error);
                                        toast.error(String(error) || "Failed to create refund invoice");
                                    } finally {
                                        setConfirmDialog({ open: false });
                                    }
                                }
                            });
                            return;
                        }

                        try {
                            const savedInvoice = await createInvoice({
                                customerId: customerId! || undefined,
                                salesmanId: salesmanId!,
                                items: validItems,
                                redemption: selectedRedemption
                                    ? {
                                        type: selectedRedemption.type,
                                        points: selectedRedemption.points,
                                        giftProductName: selectedRedemption.giftProductName
                                    }
                                    : undefined
                            });

                            if (calculatedSubtotal < 0) {
                                const refundedInvoice = await createRefund({
                                    invoiceId: savedInvoice.id,
                                    amount: Math.abs(calculatedSubtotal),
                                    reason: "Auto refund for return invoice",
                                    method: "Cash"
                                });

                                setInvoice(refundedInvoice);
                                setShowSuccessFooter(true);
                                setLastInvoice(refundedInvoice);
                                setShowPaymentModal(false);
                                setShowPrintModal(true);
                                toast.success("Refund invoice created successfully");
                                return;
                            }

                            setInvoice(savedInvoice);
                            setShowSuccessFooter(true);
                            setShowPaymentModal(true);
                        } catch (er) {
                            console.error(er);
                            toast.error("Failed to save invoice");
                        }

                    } catch (err) {
                        console.error(err);
                        toast.error("Failed to save invoice");
                    }
                } else {
                    // Determine if this is a hold invoice update or an admin edit
                    const isHoldInvoice = invoice && invoice.id && (invoice.status === "Hold" || invoice.status === "Unpaid" || invoice.status === "Pending");

                    if (isHoldInvoice || isAdminEditing) {
                        try {
                            const validItems = items
                                .filter(i => i.productId > 0 && i.quantity !== 0)
                                .map(i => ({
                                    productId: i.productId,
                                    quantity: i.isReturn ? -Math.abs(i.quantity) : Math.abs(i.quantity),
                                    rate: i.rate ?? i.product?.price ?? 0,
                                    mrp: i.mrp ?? i.product?.mrp ?? 0,
                                    gstPercentage: i.gstPercentage ?? i.product?.gstPercentage ?? 0
                                }));

                            let updated;
                            if (isAdminEditing) {
                                updated = await adminUpdateInvoice(invoice.id, {
                                    customerId: customerId ?? undefined,
                                    salesmanId: salesmanId ?? undefined,
                                    items: validItems,
                                    status: invoice.status,
                                    redemption: selectedRedemption
                                        ? {
                                            type: selectedRedemption.type,
                                            points: selectedRedemption.points,
                                            giftProductName: selectedRedemption.giftProductName
                                        }
                                        : undefined
                                });
                            } else {
                                updated = await updateInvoice(invoice.id, {
                                    customerId: customerId ?? undefined,
                                    salesmanId: salesmanId ?? undefined,
                                    items: validItems,
                                    status: invoice.status,
                                    redemption: selectedRedemption
                                        ? {
                                            type: selectedRedemption.type,
                                            points: selectedRedemption.points,
                                            giftProductName: selectedRedemption.giftProductName
                                        }
                                        : undefined
                                });
                            }

                            setInvoice(updated);
                            setShowSuccessFooter(true);
                            setItems(updated.items.map(i => {
                                const product = products.find(p => p.id === i.productId);
                                const primaryBarcode = getPrimaryBarcodeFromArray(product?.barcodes);
                                return {
                                    productId: i.productId,
                                    product: product,
                                    displayText: primaryBarcode?.barcodeValue || "",
                                    quantity: i.quantity,
                                    rate: i.unitPrice,
                                    mrp: i.mrp,
                                    lineTotal: i.lineTotal,
                                    hsnCode: i.hsnCode,
                                    isRateOverridden: true,
                                    isMrpOverridden: true,
                                    isReturn: i.quantity < 0
                                };
                            }));
                            setShowPaymentModal(true);
                        } catch (err) {
                            console.error(err);
                            toast.error(isAdminEditing ? "Failed to admin update invoice" : "Failed to update hold invoice before payment");
                        }
                    } else {
                        setShowPaymentModal(true);
                    }
                }

            } finally {
                isSavingRef.current = false;
            }
        };

        window.addEventListener("keydown", handleF7);
        return () => window.removeEventListener("keydown", handleF7);
    }, [invoice, items, customerId, salesmanId, selectedRedemption, showPrintModal, showPaymentModal, showHoldModal, showReprintModal, showProductModal, showCustomerModal, showRedemptionModal, showAdminEditModal, confirmDialog.open]);


    /* ---------- Hold Bill Function ---------- */
    const handleHoldBillWithData = async (
        rows: InvoiceRow[],
        custId: number | null,
        salesId: number | null
    ) => {
        const filledRows = rows.filter(r => r.productId > 0);

        if (filledRows.length === 0) {
            toast.warning("Please add at least one product before holding");
            return;
        }

        const normalizedItems = filledRows.map(r => {
            const qty = r.quantity === 0 ? 1 : Math.abs(r.quantity);
            return {
                productId: r.productId,
                quantity: r.isReturn ? -qty : qty,
                rate: r.rate ?? r.product?.price ?? 0,
                mrp: r.mrp ?? r.product?.mrp ?? 0,
                gstPercentage: r.gstPercentage ?? r.product?.gstPercentage ?? 0
            };
        });

        try {
            if (invoice && invoice.id && (invoice.status === "Hold" || invoice.status === "Unpaid" || invoice.status === "Pending")) {
                // Update existing hold invoice
                const updated = await updateInvoice(invoice.id, {
                    customerId: custId ?? undefined,
                    salesmanId: salesId ?? undefined,
                    items: normalizedItems,
                    status: "Hold",
                    redemption: selectedRedemption
                        ? {
                            type: selectedRedemption.type,
                            points: selectedRedemption.points,
                            giftProductName: selectedRedemption.giftProductName
                        }
                        : undefined
                });
                setInvoice(updated);
                setShowSuccessFooter(true);
                setItems(updated.items.map(i => {
                    const product = products.find(p => p.id === i.productId);
                    const primaryBarcode = getPrimaryBarcodeFromArray(product?.barcodes);
                    return {
                        productId: i.productId,
                        product: product,
                        displayText: primaryBarcode?.barcodeValue || "",
                        quantity: i.quantity,
                        rate: i.unitPrice,
                        mrp: i.mrp,
                        lineTotal: i.lineTotal,
                        hsnCode: i.hsnCode,
                        isRateOverridden: true,
                        isMrpOverridden: true,
                        isReturn: i.quantity < 0
                    };
                }));
                toast.success("Hold invoice updated");
            } else {
                const holdInvoice = await createInvoice({
                    customerId: custId ?? undefined,
                    salesmanId: salesId ?? undefined,
                    status: "Hold",
                    items: normalizedItems
                });
                console.log("Hold Invoice Created:", holdInvoice.invoiceNumber);
                toast.success(`Bill held successfully! Invoice #${holdInvoice.invoiceNumber}`);
                setInvoice(holdInvoice);
                setItems(holdInvoice.items.map(i => {
                    const product = products.find(p => p.id === i.productId);
                    const primaryBarcode = getPrimaryBarcodeFromArray(product?.barcodes);
                    return {
                        productId: i.productId,
                        product: product,
                        displayText: primaryBarcode?.barcodeValue || "",
                        quantity: i.quantity,
                        rate: i.unitPrice,
                        mrp: i.mrp,
                        lineTotal: i.lineTotal,
                        hsnCode: i.hsnCode,
                        isRateOverridden: true,
                        isMrpOverridden: true,
                        isReturn: i.quantity < 0
                    };
                }));
            }
        } catch (error) {
            console.error("Failed to hold/update invoice:", error);
            toast.error("Failed to hold/update invoice");
        }
    };




    /* ---------- Show Hold Bills ---------- */
    const handleShowHoldBills = () => {
        setShowHoldModal(true);
        void loadHoldInvoices();
    };

    /* ---------- Reprint Bills Function ---------- */
    const handleShowReprintBills = () => {
        setShowReprintModal(true);
        setReprintSearchQuery("");
        setSelectedReprintIndex(0);
        void loadReprintInvoices("");
        setTimeout(() => {
            reprintSearchInputRef.current?.focus();
            // Put cursor at end of input
            if (reprintSearchInputRef.current) {
                const len = reprintSearchInputRef.current.value.length;
                reprintSearchInputRef.current.setSelectionRange(len, len);
            }
        }, 50);
    };

    const loadReprintInvoices = async (searchPrefix: string) => {
        try {
            setLoadingReprint(true);
            const valid = await getReprintInvoices(10, searchPrefix);
            setReprintInvoices(valid);
            setSelectedReprintIndex(0);
        } catch (error) {
            console.error("Failed to load reprint invoices:", error);
            toast.error("Failed to load invoices for reprint");
        } finally {
            setLoadingReprint(false);
        }
    };

    useEffect(() => {
        if (!showReprintModal) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedReprintIndex(prev => Math.min(prev + 1, reprintInvoices.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedReprintIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (reprintInvoices.length > 0 && reprintInvoices[selectedReprintIndex]) {
                    setLastInvoice(reprintInvoices[selectedReprintIndex]);
                    setShowReprintModal(false);
                    setShowPrintModal(true);
                }
            } else if (e.key === "Escape") {
                e.preventDefault();
                setShowReprintModal(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showReprintModal, reprintInvoices, selectedReprintIndex]);

    useEffect(() => {
        if (!showHoldModal) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                setShowHoldModal(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showHoldModal]);

    // Auto scroll selected reprint row into view
    useEffect(() => {
        if (showReprintModal && selectedReprintIndex >= 0) {
            const container = reprintSearchInputRef.current
                ?.closest('.modal-content')
                ?.querySelector('.hold-bills-table-container');
            const rows = container?.querySelectorAll('tbody tr');
            const activeRow = rows?.[selectedReprintIndex] as HTMLElement;

            if (activeRow) {
                activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [selectedReprintIndex, showReprintModal]);

    /* ---------- Load Hold Invoice to Screen ---------- */
    const loadHoldInvoiceToScreen = (inv: InvoiceResponseDto) => {
        if (inv.status !== "Unpaid" && inv.status !== "Hold") {
            toast.error("This invoice cannot be loaded as it's already processed");
            return;
        }

        setInvoice(inv);
        setCustomerId(inv.customerId || null);
        setCustomerName(inv.customerName || "");
        setInvoiceNoInput(inv.invoiceNumber);

        // Map items to current format
        const loadedItems = inv.items.map(i => {
            const product = products.find(p => p.id === i.productId);
            const primaryBarcode = getPrimaryBarcodeFromArray(product?.barcodes);
            return {
                productId: i.productId,
                product: product,
                displayText: primaryBarcode?.barcodeValue || "",
                quantity: i.quantity,
                rate: i.unitPrice,
                mrp: i.mrp,
                lineTotal: i.lineTotal,
                hsnCode: i.hsnCode,
                isRateOverridden: true,
                isMrpOverridden: true,
                isReturn: i.quantity < 0
            };
        });

        setItems([...loadedItems, { productId: 0, quantity: 0, displayText: "" }]);
        setShowHoldModal(false);
        setIsRecalledInvoice(true);

        // Focus on first product input
        setTimeout(() => {
            productRefs.current[0]?.focus();
        }, 100);
    };

    /* ---------- Delete Hold Invoice ---------- */

    const deleteHoldInvoice = async (
        inv: InvoiceResponseDto,
        e: React.MouseEvent
    ) => {
        e.stopPropagation();
        try {
            if (!inv.id) {
                toast.error("Invoice ID is missing");
                return;
            }
            await deleteInvoice(inv.id);
            toast.success("Hold invoice deleted successfully");
            void loadHoldInvoices();
            if (lastInvoice?.id === inv.id) {
                setLastInvoice(null);
            }
        } catch (error) {
            console.error("Failed to delete hold invoice:", error);
            toast.error("Failed to delete hold invoice");
        } finally {
            setPendingDeleteHoldId(null);
        }
    };


    /* ---------- Customer Functions ---------- */
    const loadCustomerList = async () => {
        try {
            setLoadingCustomers(true);
            const data = await getCustomers();
            setCustomerList(data);
        } catch (error) {
            console.error("Failed to load customers:", error);
            toast.error("Failed to load customers");
        } finally {
            setLoadingCustomers(false);
        }
    };

    const openCustomerModal = async () => {
        setShowCustomerModal(true);
        setCustomerSearch("");
        await loadCustomerList();
    };

    const handleSelectCustomer = async (selectedCustomer: CustomerDto) => {
        if (customerIdRef.current) {
            customerIdRef.current.value = String(selectedCustomer.customerCode);
        }
        setShowCustomerModal(false);
        await fetchCustomer(selectedCustomer.customerCode);
    };

    const validateNewCustomer = () => {
        const errors: { [key: string]: string } = {};

        if (!newCustomerForm.name.trim()) {
            errors.name = "Name is required";
        }

        if (!newCustomerForm.mobile.trim()) {
            errors.mobile = "Mobile is required";
        } else if (!/^\d{10}$/.test(newCustomerForm.mobile)) {
            errors.mobile = "Mobile must be 10 digits";
        }

        if (!newCustomerForm.address.trim()) {
            errors.address = "Address is required";
        }

        if (newCustomerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomerForm.email)) {
            errors.email = "Invalid email";
        }

        setNewCustomerErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAddCustomer = async () => {
        if (!validateNewCustomer()) {
            return;
        }

        try {
            setAddingCustomer(true);
            const created = await createCustomer({
                name: newCustomerForm.name.trim(),
                mobile: newCustomerForm.mobile.trim(),
                address: newCustomerForm.address.trim(),
                telephone: newCustomerForm.telephone.trim() || undefined,
                email: newCustomerForm.email.trim() || undefined,
                openingBalance: Number(newCustomerForm.openingBalance) || 0
            });

            toast.success("Customer added successfully");
            setNewCustomerForm(emptyNewCustomerForm);
            setNewCustomerErrors({});
            await loadCustomerList();
            await handleSelectCustomer(created);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to add customer";
            toast.error(message);
        } finally {
            setAddingCustomer(false);
        }
    };

    const fetchCustomer = async (customerInput: number | string) => {
        const input = String(customerInput ?? "").trim();

        if (!input || input === "0") {
            setCustomer(null);
            setCustomerName("Walk-in Customer");
            setCustomerId(null);
            setCurrentRow(0);
            setCurrentColumn("product");
            setTimeout(() => productRefs.current[0]?.focus(), 10);
        } else {

            try {
                const customerCode = Number(input);
                if (Number.isNaN(customerCode) || customerCode <= 0) {
                    throw new Error("Customer not found");
                }

                const data = await getCustomerById(customerCode);
                console.log(data);
                setCustomer(data);
                setCustomerName(data.name);
                setCustomerId(data.id);
                if (customerIdRef.current) {
                    customerIdRef.current.value = String(data.customerCode || data.id);
                }
                setCurrentRow(0);
                setCurrentColumn("product");
                setTimeout(() => productRefs.current[0]?.focus(), 10);
            } catch {
                setCustomer(null);
                setCustomerName("No Customer Found");
                setCustomerId(null);
            }
        }
    };

    /* ---------- Product Modal Functions ---------- */
    const handleProductSelected = (product: ProductDto, barcode?: BarcodeMasterDto) => {
        if (productSearchRow === null) return;

        if (barcode) {
            addBarcodeToRow(productSearchRow, { product, barcode });
            setShowProductModal(false);
            setProductSearchRow(null);
            return;
        }

        const currentItems = itemsRef.current ?? items;
        const defaultRate = product.price;
        const defaultMrp = product.mrp;

        const existingIndex = currentItems.findIndex(r => {
            if (r.productId !== product.id) return false;
            if (currentItems.indexOf(r) === productSearchRow) return true;
            const rowRate = r.isRateOverridden ? r.rate : product.price;
            const rowMrp = r.isMrpOverridden ? r.mrp : product.mrp;
            return rowRate === defaultRate && rowMrp === defaultMrp;
        });

        const isNewProduct = existingIndex === -1;
        const isSameRowSameProduct = existingIndex === productSearchRow;

        if (!isNewProduct && !isSameRowSameProduct) {
            const existingItem = currentItems[existingIndex];
            const newQty = (existingItem.quantity || 0) + 1;
            toast.info(`${product.name} count: ${newQty}`, { autoClose: 1500 });
        }

        setItems(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(r => {
                if (r.productId !== product.id) return false;
                if (updated.indexOf(r) === productSearchRow) return true;
                const rowRate = r.isRateOverridden ? r.rate : product.price;
                const rowMrp = r.isMrpOverridden ? r.mrp : product.mrp;
                return rowRate === defaultRate && rowMrp === defaultMrp;
            });

            if (idx !== -1 && idx === productSearchRow) {
                // Same row same product: just refresh product data, do NOT increment qty
                const row = updated[idx];
                const primaryBarcode = getPrimaryBarcodeFromArray(product.barcodes);
                updated[idx] = {
                    ...row,
                    product,
                    displayText: primaryBarcode?.barcodeValue || product.name || row.displayText,
                    hsnCode: product.hsnCode || row.hsnCode,
                    rate: row.isRateOverridden ? row.rate : product.price,
                    mrp: row.isMrpOverridden ? row.mrp : product.mrp,
                    lineTotal: row.quantity * (row.isRateOverridden ? row.rate! : product.price)
                };
            } else if (idx !== -1) {
                // Same product with same rate/MRP exists in a different row → increment qty there
                const row = updated[idx];
                const rate = row.isRateOverridden ? row.rate! : product.price;
                updated[idx] = {
                    ...row,
                    quantity: row.quantity + 1,
                    lineTotal: (row.quantity + 1) * rate
                };

                // Clear the scanned row since we merged into the existing row
                updated[productSearchRow] = {
                    productId: 0,
                    quantity: 0,
                    displayText: ""
                };
            } else {
                const primaryBarcode = getPrimaryBarcodeFromArray(product.barcodes);
                updated[productSearchRow] = {
                    productId: product.id,
                    product,
                    quantity: 1,
                    displayText: primaryBarcode?.barcodeValue || product.name,
                    hsnCode: product.hsnCode || undefined,
                    rate: product.price,
                    mrp: product.mrp,
                    gstPercentage: product.gstPercentage,
                    isRateOverridden: false,
                    isMrpOverridden: false,
                    lineTotal: product.price
                };

                if (productSearchRow === prev.length - 1) {
                    updated.push({ productId: 0, quantity: 0, displayText: "" });
                }
            }

            return updated;
        });

        setShowProductModal(false);
        setProductSearchRow(null);

        setTimeout(() => {
            setCurrentColumn("qty");
            qtyRefs.current[productSearchRow]?.focus();
        }, 50);
    };

    /* ---------- Product Search Functions ---------- */
    //const findProduct = (searchValue: string): ProductDto | undefined => {
    //    const value = searchValue.trim();
    //    if (!value) return;

    //    return products.find(p =>
    //        p.id.toString() === value ||
    //        p.barCode === value ||
    //        p.name.toLowerCase() === value.toLowerCase()
    //    );
    //};


    // Find ALL products matching the search criteria
    const findProducts = (searchValue: string, productList: ProductDto[] = products): ProductDto[] => {
        const value = searchValue.trim().toLowerCase();
        if (!value) return [];

        return productList.filter(p => {
            // Match by exact ID (handle leading zeros, e.g. "05" matches 5)
            const numericValue = Number(value);
            if (!isNaN(numericValue) && p.id === numericValue) return true;

            // Match by exact ID string
            if (p.id.toString() === value) return true;

            // Match by barcode value (new structure)
            if (p.barcodes && p.barcodes.some(b => b.barcodeValue === value)) return true;

            // Match by partial name (case-insensitive)
            if (p.name.toLowerCase().includes(value)) return true;

            return false;
        });
    };

    // Helper function to add product to a row
    const addProductToRow = (rowIndex: number, product: ProductDto) => {
        const currentItems = itemsRef.current ?? items;

        // Find an existing row for this product with the SAME effective rate/mrp
        // If rate/MRP was overridden to a different value, it's treated as a separate line item
        const defaultRate = product.price;
        const defaultMrp = product.mrp;

        const existingIndex = currentItems.findIndex(r => {
            if (r.productId !== product.id) return false;
            // Same row is always a match (re-scanning same row)
            if (currentItems.indexOf(r) === rowIndex) return true;
            // Different row: only merge if the effective rate & MRP match the product's defaults
            const rowRate = r.isRateOverridden ? r.rate : product.price;
            const rowMrp = r.isMrpOverridden ? r.mrp : product.mrp;
            return rowRate === defaultRate && rowMrp === defaultMrp;
        });

        const isNewProduct = existingIndex === -1;
        const isSameRowSameProduct = existingIndex === rowIndex;

        if (!isNewProduct && !isSameRowSameProduct) {
            const existingItem = currentItems[existingIndex];
            const newQty = (existingItem.quantity || 0) + 1;
            toast.info(`${product.name} count: ${newQty}`, { autoClose: 1500 });
        }

        setItems(prev => {
            const updated = [...prev];

            // Re-compute index inside the updater (state may differ from ref)
            const idx = updated.findIndex(r => {
                if (r.productId !== product.id) return false;
                if (updated.indexOf(r) === rowIndex) return true;
                const rowRate = r.isRateOverridden ? r.rate : product.price;
                const rowMrp = r.isMrpOverridden ? r.mrp : product.mrp;
                return rowRate === defaultRate && rowMrp === defaultMrp;
            });

            if (idx !== -1 && idx === rowIndex) {
                // Same row same product: just refresh product data, do NOT increment qty
                const row = updated[idx];
                const primaryBarcode = getPrimaryBarcodeFromArray(product.barcodes);
                updated[idx] = {
                    ...row,
                    product,
                    displayText: primaryBarcode?.barcodeValue || product.name || row.displayText,
                    hsnCode: product.hsnCode || row.hsnCode,
                    rate: row.isRateOverridden ? row.rate : product.price,
                    mrp: row.isMrpOverridden ? row.mrp : product.mrp,
                    lineTotal: row.quantity * (row.isRateOverridden ? row.rate! : product.price)
                };
            } else if (idx !== -1) {
                // Same product with same rate/MRP exists in a different row → increment qty there
                const row = updated[idx];
                const rate = row.isRateOverridden ? row.rate! : product.price;
                updated[idx] = {
                    ...row,
                    quantity: row.quantity + 1,
                    lineTotal: (row.quantity + 1) * rate
                };

                // Clear the scanned row since we merged into the existing row
                updated[rowIndex] = {
                    productId: 0,
                    quantity: 0,
                    displayText: ""
                };
            } else {
                // New product or same product with DIFFERENT rate/MRP → add as a new line item
                const primaryBarcode = getPrimaryBarcodeFromArray(product.barcodes);
                updated[rowIndex] = {
                    productId: product.id,
                    product,
                    quantity: 1,
                    displayText: primaryBarcode?.barcodeValue || product.name,
                    hsnCode: product.hsnCode || undefined,
                    rate: product.price,
                    mrp: product.mrp,
                    isRateOverridden: false,
                    isMrpOverridden: false,
                    lineTotal: product.price
                };

                if (rowIndex === updated.length - 1) {
                    updated.push({ productId: 0, quantity: 0, displayText: "" });
                }
            }

            return updated;
        });

        // Only move focus when we added a truly new product (not same-row refresh or qty-increment)
        if (isNewProduct) {
            setCurrentColumn("qty");
            setTimeout(() => qtyRefs.current[rowIndex]?.focus(), 50);
        } else if (isSameRowSameProduct) {
            setCurrentColumn("qty");
            setTimeout(() => qtyRefs.current[rowIndex]?.focus(), 50);
        }
        // When qty updated in another row, keep the current column/focus.
    };

    const addBarcodeToRow = (rowIndex: number, selection: { product: ProductDto, barcode: BarcodeMasterDto }) => {
        const { product, barcode } = selection;
        const currentItems = itemsRef.current ?? items;
        const existingIndex = currentItems.findIndex(r => r.productId === product.id && r.rate === barcode.price && r.mrp === barcode.mrp);
        const isNewProduct = existingIndex === -1;
        const isSameRowSameProduct = existingIndex === rowIndex;

        if (!isNewProduct && !isSameRowSameProduct) {
            const existingItem = currentItems[existingIndex];
            const newQty = (existingItem.quantity || 0) + 1;
            toast.info(`${product.name} count: ${newQty}`, { autoClose: 1500 });
        }

        setItems(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(r => r.productId === product.id && r.rate === barcode.price && r.mrp === barcode.mrp);

            if (idx !== -1 && idx === rowIndex) {
                // Same row same barcode product: just refresh product data, do NOT increment qty
                const row = updated[idx];
                updated[idx] = {
                    ...row,
                    product,
                    displayText: barcode.barcodeValue,
                    hsnCode: product.hsnCode || row.hsnCode,
                    rate: barcode.price,
                    mrp: barcode.mrp,
                    gstPercentage: barcode.gstPercentage,
                    lineTotal: row.quantity * barcode.price
                };
            } else if (idx !== -1) {
                // Product exists in a DIFFERENT row — increment qty there
                const row = updated[idx];
                updated[idx] = {
                    ...row,
                    quantity: row.quantity + 1,
                    lineTotal: (row.quantity + 1) * row.rate!
                };
                updated[rowIndex] = { productId: 0, quantity: 0, displayText: "" };
            } else {
                updated[rowIndex] = {
                    productId: product.id,
                    product,
                    quantity: 1,
                    displayText: barcode.barcodeValue,
                    hsnCode: product.hsnCode || undefined,
                    rate: barcode.price,
                    mrp: barcode.mrp,
                    gstPercentage: barcode.gstPercentage,
                    isRateOverridden: true,
                    isMrpOverridden: true,
                    lineTotal: barcode.price
                };
                if (rowIndex === updated.length - 1) {
                    updated.push({ productId: 0, quantity: 0, displayText: "" });
                }
            }
            return updated;
        });

        if (isNewProduct) {
            moveToNextRow(rowIndex);
        } else if (existingIndex === rowIndex) {
            // Same barcode re-scanned on same row: move to next row
            moveToNextRow(rowIndex);
        }
    };

    const handleProductEnter = async (rowIndex: number, value: string) => {
        const search = value.trim();
        const searchLower = search.toLowerCase();
        if (!search) {
            // Only add a new empty row if there isn't already one at the end
            const currentItems = itemsRef.current ?? items;
            const lastItem = currentItems[currentItems.length - 1];
            const hasEmptyLastRow = lastItem && lastItem.productId === 0 && !lastItem.displayText?.trim();
            if (hasEmptyLastRow && rowIndex === currentItems.length - 1) {
                // Already on the last empty row — do nothing, don't add another
                return;
            }
            setProductSearchQuery(search);
            moveToNextRow(rowIndex);
            return;
        }

        // Helper to find matching barcodes in a given product list
        const getMatchingBarcodes = (list: ProductDto[]) => {
            const matches: { product: ProductDto, barcode: BarcodeMasterDto }[] = [];
            list.forEach(p => {
                if (p.barcodes) {
                    p.barcodes.forEach(b => {
                        if (b.barcodeValue.toLowerCase() === searchLower && b.isActive) {
                            matches.push({ product: p, barcode: b });
                        }
                    });
                }
            });
            return matches;
        };

        // 1. Search in current cached list first
        let matchingBarcodes = getMatchingBarcodes(products);
        if (matchingBarcodes.length > 0) {
            if (matchingBarcodes.length === 1) {
                addBarcodeToRow(rowIndex, matchingBarcodes[0]);
            } else {
                setProductSearchRow(rowIndex);
                setProductSearchQuery(search);
                setShowProductModal(true);
            }
            return;
        }

        let foundProducts = findProducts(search, products);

        // 2. If not found, try refetching the products list from the server (handles newly added products)
        if (foundProducts.length === 0) {
            try {
                const refetched = await refetchProducts();
                const freshProducts = refetched.data || [];

                // Retry barcode search in the fresh list
                matchingBarcodes = getMatchingBarcodes(freshProducts);
                if (matchingBarcodes.length > 0) {
                    if (matchingBarcodes.length === 1) {
                        addBarcodeToRow(rowIndex, matchingBarcodes[0]);
                    } else {
                        setProductSearchRow(rowIndex);
                        setProductSearchQuery(search);
                        setShowProductModal(true);
                    }
                    return;
                }

                // Retry product search in the fresh list
                foundProducts = findProducts(search, freshProducts);
            } catch (err) {
                console.error("Failed to refetch products:", err);
            }
        }

        if (foundProducts.length === 0) {
            toast.error("Product not found");
            return;
        }

        // If only one product found, add it directly
        if (foundProducts.length === 1) {
            addProductToRow(rowIndex, foundProducts[0]);
            return;
        }

        // Different products matched (e.g., by name or ID) - open product search modal
        setProductSearchRow(rowIndex);
        setProductSearchQuery(search);
        setShowProductModal(true);
    };




    /* Toggle Return Status for a Row */
    const toggleReturnRow = (rowIndex: number) => {
        setItems(prev => {
            const copy = [...prev];
            const row = copy[rowIndex];

            // Don't allow toggling if no product selected
            if (!row.productId) return prev;

            // Toggle the flag
            const isReturn = !row.isReturn;

            // Prefix "R" to product display text for return items
            let displayText = row.displayText || "";
            if (!displayText && row.product?.barcodes && row.product.barcodes.length > 0) {
                displayText = row.product.barcodes[0].barcodeValue;
            }
            if (isReturn && !displayText.startsWith("R")) {
                displayText = "R" + displayText;
            } else if (!isReturn && displayText.startsWith("R")) {
                displayText = displayText.substring(1);
            }

            // Recalculate Line Total (Negative if return)
            const qty = row.quantity || 0;
            const rate = row.isRateOverridden ? row.rate! : row.product?.price ?? 0;
            const total = qty * rate;

            copy[rowIndex] = {
                ...row,
                isReturn: isReturn,
                displayText: displayText,
                lineTotal: isReturn ? -Math.abs(total) : Math.abs(total)
            };

            return copy;
        });
    };

    /* ---------- Update Functions ---------- */
    const updateQuantity = useCallback((rowIndex: number, quantityStr: string) => {
        const quantity = Math.max(0, parseFloat(quantityStr) || 0);
        setItems(prev => {
            const row = prev[rowIndex];
            const rate = row.isRateOverridden ? row.rate! : row.product?.price ?? 0;
            const baseTotal = quantity * rate;
            const copy = [...prev];
            copy[rowIndex] = {
                ...row,
                quantity: row.isReturn ? -quantity : quantity,
                _rawQty: quantityStr,
                lineTotal: row.isReturn ? -Math.abs(baseTotal) : baseTotal
            };
            return copy;
        });
    }, []);

    const updateRate = useCallback((rowIndex: number, rateStr: string) => {
        const rate = Math.max(0, parseFloat(rateStr) || 0);

        setItems(prev => {
            const row = prev[rowIndex];
            const mrp = row.mrp || row.product?.mrp || 0;

            // Check if rate exceeds MRP
            if (rate > mrp && mrp > 0) {
                toast.warning(`Rate cannot exceed MRP (₹${mrp})`);
                return prev;
            }

            const quantity = row.quantity || 0;
            const baseTotal = quantity * rate;
            const copy = [...prev];
            copy[rowIndex] = {
                ...row,
                rate,
                _rawRate: rateStr,
                isRateOverridden: true,
                lineTotal: row.isReturn ? -Math.abs(baseTotal) : baseTotal
            };
            return copy;
        });
    }, []);

    const updateMrp = useCallback((rowIndex: number, mrpStr: string) => {
        const mrp = Math.max(0, parseFloat(mrpStr) || 0);
        setItems(prev => {
            const row = prev[rowIndex];
            const copy = [...prev];
            copy[rowIndex] = {
                ...row,
                mrp,
                _rawMrp: mrpStr,
                isMrpOverridden: true
            };
            return copy;
        });
    }, []);

    const updateDisplayText = useCallback((rowIndex: number, text: string) => {
        setItems(prev => {
            const updated = [...prev];
            if (!text.trim()) {
                updated[rowIndex] = {
                    productId: 0,
                    quantity: 0,
                    displayText: ""
                };
            } else {
                updated[rowIndex] = {
                    ...updated[rowIndex],
                    displayText: text
                };
            }
            return updated;
        });
    }, []);

    const handleCellFocus = useCallback((rowIndex: number, columnType: "product" | "qty" | "rate" | "mrp", target: HTMLInputElement) => {
        setCurrentRow(rowIndex);
        setCurrentColumn(columnType);
        target.select();
    }, []);

    const setProductRef = useCallback((el: HTMLInputElement | null, rowIndex: number) => {
        if (el) productRefs.current[rowIndex] = el;
    }, []);

    const setMrpRef = useCallback((el: HTMLInputElement | null, rowIndex: number) => {
        if (el) mrpRefs.current[rowIndex] = el;
    }, []);

    const setRateRef = useCallback((el: HTMLInputElement | null, rowIndex: number) => {
        if (el) rateRefs.current[rowIndex] = el;
    }, []);

    const setQtyRef = useCallback((el: HTMLInputElement | null, rowIndex: number) => {
        if (el) qtyRefs.current[rowIndex] = el;
    }, []);

    /* ---------- Navigation Functions ---------- */
    const moveToNextRow = (currentRowIndex: number) => {
        setItems(prev => {
            if (currentRowIndex >= prev.length - 1) {
                return [...prev, { productId: 0, quantity: 0, displayText: "" }];
            }
            return prev;
        });

        const nextRow = currentRowIndex + 1;
        setCurrentRow(nextRow);
        setCurrentColumn("product");

        setTimeout(() => {
            productRefs.current[nextRow]?.focus();
            productRefs.current[nextRow]?.select();

            const nextRowElement = productRefs.current[nextRow]?.closest('tr');
            if (nextRowElement && gridContainerRef.current) {
                nextRowElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }, 50);
    };

    const navigateToCell = (rowIndex: number, columnType: "product" | "qty" | "rate" | "mrp") => {
        setCurrentRow(rowIndex);
        setCurrentColumn(columnType);

        setTimeout(() => {
            if (columnType === "product") {
                productRefs.current[rowIndex]?.focus();
                productRefs.current[rowIndex]?.select();
            }
            else if (columnType === "qty") {
                qtyRefs.current[rowIndex]?.focus();
                qtyRefs.current[rowIndex]?.select();
            }
            else if (columnType === "rate") {
                rateRefs.current[rowIndex]?.focus();
                rateRefs.current[rowIndex]?.select();
            }
            else if (columnType === "mrp") {
                mrpRefs.current[rowIndex]?.focus();
                mrpRefs.current[rowIndex]?.select();
            }
        }, 10);
    };

    /* ---------- Delete Row ---------- */
    const deleteRow = useCallback((rowIndex: number) => {
        setItems(prev => {
            if (prev.length <= 1) return prev;
            return prev.filter((_, i) => i !== rowIndex);
        });

        const focusRow = rowIndex > 0 ? rowIndex - 1 : 0;
        setCurrentRow(focusRow);
        setCurrentColumn("product");

        setTimeout(() => {
            productRefs.current[focusRow]?.focus();
        }, 10);
    }, []);

    /* ---------- Key Handling ---------- */
    const handleKeyDown = async (
        e: React.KeyboardEvent<HTMLInputElement>,
        rowIndex: number,
        columnType: "product" | "qty" | "rate" | "mrp"
    ) => {
        const isAnyModalOpen = showPrintModal || showPaymentModal || showHoldModal
            || showReprintModal || showProductModal || showCustomerModal
            || showRedemptionModal || showAdminEditModal || confirmDialog.open;
        if (isAnyModalOpen) {
            e.preventDefault();
            return;
        }

        // Block arrow keys to prevent caret movement
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
            e.preventDefault();

            // Handle row navigation with up/down arrows
            if (e.key === "ArrowUp" && rowIndex > 0) {
                navigateToCell(rowIndex - 1, columnType);
            }
            if (e.key === "ArrowDown" && rowIndex < itemsRef.current.length - 1) {
                navigateToCell(rowIndex + 1, columnType);
            }

            // Handle column navigation with left/right arrows
            if (e.key === "ArrowLeft") {
                if (columnType === "rate") {
                    navigateToCell(rowIndex, "qty");
                }
                else if (columnType === "qty") navigateToCell(rowIndex, "mrp");
                else if (columnType === "mrp") navigateToCell(rowIndex, "product");
            }
            if (e.key === "ArrowRight") {
                if (columnType === "product") navigateToCell(rowIndex, "mrp");
                else if (columnType === "mrp") navigateToCell(rowIndex, "qty");
                else if (columnType === "qty") navigateToCell(rowIndex, "rate");
            }

            return;
        }

        // Backtick key opens product modal
        if (e.key === "`") {
            e.preventDefault();
            setProductSearchRow(rowIndex);
            setProductSearchQuery(itemsRef.current[rowIndex].displayText ?? "");
            setShowProductModal(true);
            return;
        }

        if (e.key === "F3") {
            e.preventDefault();
            toggleReturnRow(rowIndex);
            return;
        }

        // Enter key handling
        if (e.key === "Enter") {
            e.preventDefault();

            if (columnType === "product") {
                const value = e.currentTarget.value;

                // Always try handleProductEnter first:
                //   • Numeric input  → barcode value lookup, then product ID lookup
                //   • Text input     → barcode value lookup first, then name/ID lookup
                // handleProductEnter opens the modal itself if multiple matches are found.
                // Only if the value is clearly a partial name (non-numeric, more than 1 char)
                // AND there's no exact barcode match, we open the modal directly.
                await handleProductEnter(rowIndex, value);
                setTimeout(() => {
                    const nextRow = rowIndex + 1;
                    const nextRowElement = productRefs.current[nextRow]?.closest('tr');
                    if (nextRowElement && gridContainerRef.current) {
                        nextRowElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest'
                        });
                    }
                }, 100);
            }
            else if (columnType === "rate") {
                moveToNextRow(rowIndex);
                setTimeout(() => {
                    const nextRowElement = productRefs.current[rowIndex + 1]?.closest('tr');
                    if (nextRowElement && gridContainerRef.current) {
                        nextRowElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest'
                        });
                    }
                }, 50);
            }
            else if (columnType === "mrp") {
                navigateToCell(rowIndex, "qty");
            }
            else if (columnType === "qty") {
                navigateToCell(rowIndex, "rate");
            }
        }

        // Delete key handling - delete row from ANY column
        if (e.key === "Delete") {
            e.preventDefault();
            deleteRow(rowIndex);
        }

        // Tab / Shift+Tab key - move between columns
        if (e.key === "Tab") {
            e.preventDefault();
            if (e.shiftKey) {
                if (columnType === "rate") {
                    setCurrentColumn("qty");
                    setTimeout(() => qtyRefs.current[rowIndex]?.focus(), 10);
                } else if (columnType === "qty") {
                    setCurrentColumn("mrp");
                    setTimeout(() => mrpRefs.current[rowIndex]?.focus(), 10);
                } else if (columnType === "mrp") {
                    setCurrentColumn("product");
                    setTimeout(() => productRefs.current[rowIndex]?.focus(), 10);
                } else if (columnType === "product") {
                    if (rowIndex > 0) {
                        setCurrentColumn("rate");
                        setTimeout(() => rateRefs.current[rowIndex - 1]?.focus(), 10);
                    } else {
                        customerIdRef.current?.focus();
                    }
                }
            } else {
                if (columnType === "product") {
                    setCurrentColumn("mrp");
                    setTimeout(() => mrpRefs.current[rowIndex]?.focus(), 10);
                } else if (columnType === "mrp") {
                    setCurrentColumn("qty");
                    setTimeout(() => qtyRefs.current[rowIndex]?.focus(), 10);
                } else if (columnType === "qty") {
                    setCurrentColumn("rate");
                    setTimeout(() => rateRefs.current[rowIndex]?.focus(), 10);
                } else if (columnType === "rate") {
                    moveToNextRow(rowIndex);
                }
            }
        }
    };

    const handleKeyDownRef = useRef(handleKeyDown);
    useEffect(() => {
        handleKeyDownRef.current = handleKeyDown;
    });

    const stableHandleKeyDown = useCallback((
        e: React.KeyboardEvent<HTMLInputElement>,
        rowIndex: number,
        columnType: "product" | "qty" | "rate" | "mrp"
    ) => {
        handleKeyDownRef.current(e, rowIndex, columnType);
    }, []);

    /* ---------- Validation & Submit ---------- */
    const applyRedemption = () => {
        if (!customer) {
            toast.warning("Select customer before redeeming points");
            return;
        }

        const availablePoints = customer.loyaltyPoints || 0;
        const points = Math.max(0, Number(redeemPointsInput) || 0);

        if (points <= 0) {
            toast.warning("Enter valid redeem points");
            return;
        }

        if (points > availablePoints) {
            toast.warning(`Only ${availablePoints} loyalty points available`);
            return;
        }

        if (redemptionType === "Gift") {
            const giftName = redeemGiftName.trim();
            if (!giftName) {
                toast.warning("Enter gift product name");
                return;
            }

            const masterGift = gifts.find(g => g.productName.toLowerCase() === giftName.toLowerCase());
            if (masterGift && points < masterGift.requiredPoints) {
                toast.warning(`Selected gift requires at least ${masterGift.requiredPoints} points`);
                return;
            }

            setSelectedRedemption({
                type: "Gift",
                points,
                giftProductName: giftName
            });
        } else {
            const discountAmount = Math.min(points, Math.max(0, subtotal));
            if (discountAmount <= 0) {
                toast.warning("No amount available for discount redemption");
                return;
            }

            setSelectedRedemption({
                type: "Discount",
                points
            });
        }

        setShowRedemptionModal(false);
        toast.success("Loyalty redemption applied");
    };

    const clearRedemption = () => {
        setSelectedRedemption(null);
        setRedemptionType("Discount");
        setRedeemPointsInput("0");
        setRedeemGiftName("");
    };

    const validateInvoice = (): string | null => {
        const hasProducts = items.some(
            i => i.productId > 0 && i.quantity !== 0
        );

        if (!hasProducts) {
            return "Add at least one product";
        }

        return null;
    };




    const submitInvoice = async () => {
        const error = validateInvoice();
        if (error) {
            toast.error(error as string);
            return;
        }

        const validItems = items
            .filter(i => i.productId > 0 && i.quantity !== 0)
            .map(i => ({
                productId: i.productId,
                quantity: i.isReturn ? -Math.abs(i.quantity) : Math.abs(i.quantity),
                rate: i.rate ?? i.product?.price ?? 0,
                mrp: i.mrp ?? i.product?.mrp ?? 0,
                gstPercentage: i.gstPercentage ?? i.product?.gstPercentage ?? 0
            }));

        const calculatedSubtotal = validItems.reduce((sum, item) => {
            return sum + (item.quantity * item.rate);
        }, 0);

        if (calculatedSubtotal < 0) {
            toast.info(`Refund invoice (₹${Math.abs(calculatedSubtotal).toFixed(2)}) will be created.`);
            try {
                const refundInvoice = await createInvoice({
                    customerId: customerId! || undefined,
                    salesmanId: salesmanId!,
                    items: validItems,
                    status: "Unpaid",
                    redemption: selectedRedemption
                        ? {
                            type: selectedRedemption.type,
                            points: selectedRedemption.points,
                            giftProductName: selectedRedemption.giftProductName
                        }
                        : undefined
                });
                setInvoice(refundInvoice);
                setLastInvoice(refundInvoice);
                setShowPaymentModal(true);
                return;
            } catch (error) {
                toast.error(String(error) || "Failed to create invoice");
            }
        }

        try {
            const result = await createInvoice({
                customerId: customerId! || undefined,
                salesmanId: salesmanId!,
                items: validItems,
                redemption: selectedRedemption
                    ? {
                        type: selectedRedemption.type,
                        points: selectedRedemption.points,
                        giftProductName: selectedRedemption.giftProductName
                    }
                    : undefined
            });
            console.log(result);
            setInvoice(result);
            setShowPaymentModal(true);
        } catch (error) {
            console.error("Invoice creation error:", error);
            toast.error(String(error) || "Failed to create invoice");
        }

    };

    /* ---------- Load Invoice to Screen (for reprint) ---------- */
    const loadInvoiceToScreen = (inv: InvoiceResponseDto) => {
        setInvoice(inv);
        setLastInvoice(inv);
        setIsRecalledInvoice(true);

        setCustomerId(inv.customerId || null);
        setCustomerName(inv.customerName || "");
        setInvoiceNoInput(inv.invoiceNumber);

        setItems(inv.items.map(i => {
            const product = products.find(p => p.id === i.productId);
            const primaryBarcode = getPrimaryBarcodeFromArray(product?.barcodes);
            return {
                productId: i.productId,
                product: product,
                displayText: primaryBarcode?.barcodeValue || "",
                quantity: i.quantity,
                rate: i.unitPrice,
                mrp: i.mrp,
                lineTotal: i.lineTotal,
                hsnCode: i.hsnCode,
                isRateOverridden: true,
                isMrpOverridden: true,
                isReturn: i.quantity < 0
            };
        }));

        setShowPaymentModal(false);
        setShowPrintModal(false);
    };

    /* ---------- Payment Functions ---------- */
    /* ---------- Payment Functions ---------- */
    /* ---------- Payment Functions ---------- */
    const handlePaymentConfirm = async (payment: PaymentSelection) => {
        if (!invoice || !invoice.id) return;

        try {
            const updatedInvoice = await makePayment({
                invoiceId: invoice.id,
                amount: payment.amount,
                method: payment.mode
            });

            const enhancedInvoice: InvoiceResponseDto = {
                ...updatedInvoice,
                cashReceived: payment.cashAmount,
                changeAmount: payment.changeAmount,
                paymentMode: payment.mode
            };

            setInvoice(enhancedInvoice);
            setLastInvoice(enhancedInvoice);
            setShowPaymentModal(false);
            setShowPrintModal(true);

        } catch (error) {
            toast.error(String(error) || "Payment failed");
        }
    };

    /* ---------------- DERIVED TOTALS ---------------- */
    const subtotal = items.reduce(
        (sum, i) => sum + (i.lineTotal ?? 0),
        0
    );

    const loyaltyDiscountPreview = selectedRedemption?.type === "Discount"
        ? Math.min(selectedRedemption.points, Math.max(0, subtotal))
        : 0;

    const payableSubtotal = subtotal - loyaltyDiscountPreview;

    const totalQty = items.reduce(
        (sum, i) => sum + (i.quantity || 0),
        0
    );

    const validItemsCount = items.filter(
        i => i.productId > 0 && i.quantity !== 0
    ).length;

    const shortcutRailItems = [
        { key: "Ctrl+", label: "Zoom In" },
        { key: "Ctrl-", label: "Zoom Out" },
        { key: "F2", label: "Redeem Points" },
        { key: "F3", label: "Toggle Return" },
        { key: "F4", label: " - " },
        { key: "F5", label: "Recall Invoice" },
        { key: "Ctrl+F6", label: "Reset Screen" },
        { key: "F7", label: "Save & Payment" },
        { key: "F8", label: "Calculator" },
        { key: "F10", label: "Hold Bill" },
        { key: "F12", label: "Reprint Bill" }
    ];

    const filteredCustomerList = useMemo(() => {
        const term = customerSearch.trim().toLowerCase();
        if (!term) return customerList.slice(0, 25);

        const matched: CustomerDto[] = [];
        for (let i = 0; i < customerList.length; i++) {
            const c = customerList[i];
            if (
                c.name.toLowerCase().includes(term) ||
                (c.mobile && c.mobile.includes(term)) ||
                (c.customerCode && c.customerCode.toLowerCase().includes(term))
            ) {
                matched.push(c);
                if (matched.length >= 25) {
                    break;
                }
            }
        }
        return matched;
    }, [customerList, customerSearch]);

    return (
        <div className={`billing-master-container billing-invoice-fullscreen ${isExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <div className="billing-content">
                {/* Header */}
                <div className="billing-header-bar">
                    <div className="billing-header-left">
                        <span className="billing-header-title">Billing - Smart Super Market</span>

                        {/* Inline Invoice No */}
                        <div className="billing-header-item">
                            <label className="billing-header-label">Inv No:</label>
                            <input
                                value={invoiceNoInput || ""}
                                placeholder="Auto"
                                onChange={(e) => setInvoiceNoInput(e.target.value.toUpperCase())}
                                className="billing-header-input"
                            />
                        </div>

                        {/* Datetime */}
                        <span className="billing-header-datetime">{getCurrentDateTime()}</span>

                        {/* Inline Salesman */}
                        <div className="billing-header-item">
                            <label className="billing-header-label">Salesman:</label>
                            <input
                                value={
                                    salesmen.find(s => s.id === salesmanId)?.name
                                    || authUser?.username
                                    || ""
                                }
                                readOnly
                                title="Auto-assigned from login credentials"
                                className="billing-header-input salesman-input"
                            />
                        </div>
                    </div>

                    <div className="billing-header-right">
                        <SidebarTrigger />
                    </div>
                </div>

                <h2 style={{ display: "none" }}>Invoice / Billing</h2>

                {/* ── Draft Recovery Banner ── */}
                {showRecoveryBanner && (
                    <div style={{
                        background: "#fff3cd",
                        border: "2px solid #ffc107",
                        borderRadius: "4px",
                        padding: "10px 16px",
                        marginBottom: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        fontSize: "13px",
                        color: "#856404"
                    }}>
                        <span>⚠️ <strong>Unsaved billing data found!</strong> It looks like the last session was closed unexpectedly. Do you want to recover the draft?</span>
                        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                            <button
                                className="retro-btn primary"
                                style={{ padding: "4px 14px", fontSize: "12px" }}
                                onClick={() => {
                                    try {
                                        const draft = localStorage.getItem(RECOVERY_KEY);
                                        if (draft) {
                                            const parsed = JSON.parse(draft);
                                            if (parsed?.items) {
                                                // Re-hydrate items with product objects from current products list
                                                const hydratedItems = parsed.items.map((i: InvoiceRow) => ({
                                                    ...i,
                                                    product: products.find(p => p.id === i.productId) || i.product
                                                }));
                                                setItems(hydratedItems);
                                                if (parsed.customerId) setCustomerId(parsed.customerId);
                                                if (parsed.customerName) setCustomerName(parsed.customerName);
                                                toast.success("Draft recovered successfully!");
                                            }
                                        }
                                    } catch { toast.error("Could not recover draft"); }
                                    setShowRecoveryBanner(false);
                                }}
                            >
                                📂 Load Draft
                            </button>
                            <button
                                className="retro-btn"
                                style={{ padding: "4px 14px", fontSize: "12px" }}
                                onClick={() => {
                                    try { localStorage.removeItem(RECOVERY_KEY); } catch { /* ignore */ }
                                    setShowRecoveryBanner(false);
                                }}
                            >
                                ✕ Discard
                            </button>
                        </div>
                    </div>
                )}

                {/* Product Search Modal */}
                {showProductModal && (
                    <ProductSearchModal
                        products={products}
                        initialQuery={productSearchQuery}
                        onSelect={handleProductSelected}
                        onClose={() => {
                            setShowProductModal(false);
                            setTimeout(() => {
                                const lastIndex = items.length - 1;
                                if (lastIndex >= 0) {
                                    productRefs.current[lastIndex]?.focus();
                                }
                            }, 50);
                        }}
                    />
                )}

                {confirmDialog.open && (
                    <div className="modal-overlay1" style={{ zIndex: 9999 }}>
                        <div className="modal-content" style={{ width: "520px", maxWidth: "95vw" }}>
                            <div className="modal-header">
                                <h3>{confirmDialog.title || "Confirm"}</h3>
                                <button className="modal-close" onClick={() => setConfirmDialog({ open: false })}>✕</button>
                            </div>

                            <div style={{ padding: "8px 0 16px 0" }}>{confirmDialog.message}</div>

                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                <button className="retro-btn" onClick={() => setConfirmDialog({ open: false })}>Cancel</button>
                                <button
                                    className="retro-btn primary"
                                    onClick={async () => {
                                        if (confirmDialog.onConfirm) {
                                            await confirmDialog.onConfirm();
                                        }
                                    }}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Modal */}
                {showPaymentModal && invoice && (
                    <PaymentModal
                        totalAmount={invoice.totalAmount}
                        balanceAmount={invoice.balance}
                        onConfirm={handlePaymentConfirm}


                        onClose={() => setShowPaymentModal(false)}
                    />
                )}

                {/* Print Modal */}
                {showPrintModal && lastInvoice && (
                    <PrintBillModal
                        invoice={lastInvoice}
                        customerMobile={customer?.mobile}
                        onPrintComplete={resetBilling}
                        onReset={resetBilling}
                        onClose={() => setShowPrintModal(false)}
                    />
                )}

                {showRedemptionModal && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ width: "520px", maxWidth: "95vw" }}>
                            <div className="modal-header">
                                <h3>Loyalty Redemption (F2)</h3>
                                <button className="modal-close" onClick={() => setShowRedemptionModal(false)}>✕</button>
                            </div>

                            <div className="form-group" style={{ marginBottom: "10px" }}>
                                <label>Available Points</label>
                                <input className="retro-input" value={customer?.loyaltyPoints ?? 0} readOnly />
                            </div>

                            <div className="form-group" style={{ marginBottom: "10px" }}>
                                <label>Redemption Type</label>
                                <select
                                    className="retro-select"
                                    value={redemptionType}
                                    onChange={e => setRedemptionType(e.target.value as "Discount" | "Gift")}
                                >
                                    <option value="Discount">Discount (₹1 per point)</option>
                                    <option value="Gift">Gift Product</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: "10px" }}>
                                <label>Redeem Points</label>
                                <input
                                    className="retro-input"
                                    type="number"
                                    min={0}
                                    value={redeemPointsInput}
                                    onChange={e => setRedeemPointsInput(e.target.value)}
                                />
                            </div>

                            {redemptionType === "Gift" && (
                                <div className="form-group" style={{ marginBottom: "10px" }}>
                                    <label>Gift Product Name</label>
                                    <input
                                        className="retro-input"
                                        list="gift-products-list"
                                        value={redeemGiftName}
                                        onChange={e => {
                                            const giftName = e.target.value;
                                            setRedeemGiftName(giftName);
                                            const found = gifts.find(g => g.productName.toLowerCase() === giftName.toLowerCase());
                                            if (found) {
                                                setRedeemPointsInput(String(found.requiredPoints));
                                            }
                                        }}
                                        placeholder="Enter or pick gift product"
                                    />
                                    <datalist id="gift-products-list">
                                        {gifts.map(g => (
                                            <option key={g.id} value={g.productName}>{`${g.productName} (${g.requiredPoints} pts)`}</option>
                                        ))}
                                    </datalist>
                                </div>
                            )}

                            <div className="hint" style={{ marginBottom: "12px" }}>
                                {redemptionType === "Discount"
                                    ? `Discount preview: ₹${Math.min(Number(redeemPointsInput) || 0, Math.max(0, subtotal)).toFixed(2)}`
                                    : "Gift redemption does not reduce invoice amount."}
                            </div>

                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                <button className="retro-btn" onClick={clearRedemption}>Clear Applied</button>
                                <button className="retro-btn" onClick={() => setShowRedemptionModal(false)}>Cancel</button>
                                <button className="retro-btn primary" onClick={applyRedemption}>Apply</button>
                            </div>
                        </div>
                    </div>
                )}

                {showCustomerModal && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ width: "900px", maxWidth: "96vw" }}>
                            <div className="modal-header">
                                <h3>Customer Search / Add</h3>
                                <button className="modal-close" onClick={() => setShowCustomerModal(false)}>✕</button>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                                <div>
                                    <label>Search by Name or Mobile</label>
                                    <input
                                        className="retro-input"
                                        value={customerSearch}
                                        onChange={e => setCustomerSearch(e.target.value)}
                                        placeholder="Type name or mobile"
                                        style={{ width: "100%" }}
                                    />

                                    <div style={{ maxHeight: "300px", overflow: "auto", marginTop: "8px", border: "1px solid #ccc" }}>
                                        <table className="hold-bills-table" style={{ width: "100%" }}>
                                            <thead>
                                                <tr>
                                                    <th>Code</th>
                                                    <th>Name</th>
                                                    <th>Mobile</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loadingCustomers ? (
                                                    <tr><td colSpan={3}>Loading...</td></tr>
                                                ) : filteredCustomerList.length === 0 ? (
                                                    <tr><td colSpan={3}>No customers found</td></tr>
                                                ) : (
                                                    filteredCustomerList.map(c => (
                                                        <tr
                                                            key={c.id}
                                                            className="hold-bill-row"
                                                            onClick={() => void handleSelectCustomer(c)}
                                                        >
                                                            <td>{c.customerCode}</td>
                                                            <td>{c.name}</td>
                                                            <td>{c.mobile}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <h4 style={{ marginTop: 0 }}>Add New Customer</h4>
                                    <div className="form-group" style={{ marginBottom: "8px" }}>
                                        <label>Name</label>
                                        <input
                                            className="retro-input"
                                            value={newCustomerForm.name}
                                            onChange={e => setNewCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                        {newCustomerErrors.name && <div className="hint" style={{ color: "#d00" }}>{newCustomerErrors.name}</div>}
                                    </div>
                                    <div className="form-group" style={{ marginBottom: "8px" }}>
                                        <label>Mobile</label>
                                        <input
                                            className="retro-input"
                                            maxLength={10}
                                            value={newCustomerForm.mobile}
                                            onChange={e => setNewCustomerForm(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, "") }))}
                                        />
                                        {newCustomerErrors.mobile && <div className="hint" style={{ color: "#d00" }}>{newCustomerErrors.mobile}</div>}
                                    </div>
                                    <div className="form-group" style={{ marginBottom: "8px" }}>
                                        <label>Address</label>
                                        <input
                                            className="retro-input"
                                            value={newCustomerForm.address}
                                            onChange={e => setNewCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                                        />
                                        {newCustomerErrors.address && <div className="hint" style={{ color: "#d00" }}>{newCustomerErrors.address}</div>}
                                    </div>
                                    <div className="form-group" style={{ marginBottom: "8px" }}>
                                        <label>Email</label>
                                        <input
                                            className="retro-input"
                                            value={newCustomerForm.email}
                                            onChange={e => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                                        />
                                        {newCustomerErrors.email && <div className="hint" style={{ color: "#d00" }}>{newCustomerErrors.email}</div>}
                                    </div>
                                    <div className="form-group" style={{ marginBottom: "8px" }}>
                                        <label>Telephone</label>
                                        <input
                                            className="retro-input"
                                            value={newCustomerForm.telephone}
                                            onChange={e => setNewCustomerForm(prev => ({ ...prev, telephone: e.target.value }))}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: "8px" }}>
                                        <label>Opening Balance</label>
                                        <input
                                            className="retro-input"
                                            type="number"
                                            value={newCustomerForm.openingBalance}
                                            onChange={e => setNewCustomerForm(prev => ({ ...prev, openingBalance: Number(e.target.value) || 0 }))}
                                        />
                                    </div>

                                    <button
                                        className="retro-btn primary"
                                        onClick={() => void handleAddCustomer()}
                                        disabled={addingCustomer}
                                    >
                                        {addingCustomer ? "Saving..." : "Add Customer"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Invoice Section removed and moved to header */}
                {/* Customer Section */}
                <div className="customer-section">
                    <div className="form-group">
                        <label>Customer ID</label>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <input
                                ref={customerIdRef}
                                className="retro-input"
                                defaultValue={undefined}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                    const isAnyModalOpen = showPrintModal || showPaymentModal || showHoldModal
                                        || showReprintModal || showProductModal || showCustomerModal
                                        || showRedemptionModal || showAdminEditModal || confirmDialog.open;
                                    if (isAnyModalOpen) {
                                        e.preventDefault();
                                        return;
                                    }
                                    if (e.key === "Enter") {
                                        fetchCustomer(e.currentTarget.value);
                                    }
                                }}
                                placeholder="ID then Enter"
                                style={{ flex: 1 }}
                            />
                            {/*<button*/}
                            {/*    className=""*/}
                            {/*    type="button"*/}
                            {/*    onClick={() => void openCustomerModal()}*/}
                            {/*    title="Search or add customer"*/}
                            {/*>*/}
                            {/*    📑*/}
                            {/*</button>*/}

                            <button className="Btn"

                                onClick={() => void openCustomerModal()}
                                title="Search or add customer">

                                <div className="sign"><p>📑</p> </div>

                                <div className="text">CUSTOMER</div>
                            </button>



                        </div>
                    </div>

                    <div className="form-group">
                        <label>Customer Name</label>
                        <input
                            className="retro-input"
                            value={customerName}
                            readOnly
                        />
                    </div>

                    {customer && (
                        <div className="customer-info-box">
                            <div><strong>Phone:</strong> {customer.mobile}</div>
                            <div><strong>Address:</strong> {customer.address}</div>
                            <div><strong>Points:</strong> {customer.loyaltyPoints}</div>
                        </div>
                    )}
                </div>

                {/* Items Grid Container */}
                <div className="billing-grid-container" ref={gridContainerRef}>
                    <table className="billing-grid" style={{ zoom: fontZoom }}>
                        <thead>
                            <tr>
                                <th style={{ width: '30px' }}>#</th>
                                <th style={{ width: '100px' }}>Product ID</th>
                                <th style={{ width: "70px" }}>HSN</th>
                                <th style={{ width: '260px' }}>Description</th>
                                <th style={{ width: '80px' }}>MRP</th>
                                <th style={{ width: '80px' }}>Qty</th>
                                <th style={{ width: '80px' }}>Rate</th>
                                <th style={{ width: '100px' }}>Value</th>
                                <th style={{ width: '70px' }}>Delete</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((row, rowIndex) => (
                                <InvoiceRowComponent
                                    key={rowIndex}
                                    row={row}
                                    rowIndex={rowIndex}
                                    isActive={currentRow === rowIndex}
                                    updateDisplayText={updateDisplayText}
                                    updateMrp={updateMrp}
                                    updateRate={updateRate}
                                    updateQuantity={updateQuantity}
                                    handleKeyDown={stableHandleKeyDown}
                                    handleFocus={handleCellFocus}
                                    deleteRow={deleteRow}
                                    setProductRef={setProductRef}
                                    setMrpRef={setMrpRef}
                                    setRateRef={setRateRef}
                                    setQtyRef={setQtyRef}
                                    currentColumn={currentColumn}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary Footer */}
                <div className="footer-panel">
                    <div className="totals-summary">
                        <div className="summary-item">
                            <strong>Total Items:</strong> {validItemsCount}
                        </div>
                        <div className="summary-item">
                            <strong>Total Quantity:</strong> {totalQty}
                        </div>
                        <div className="retro-total-box">
                            <span className="total-label">Subtotal:</span>
                            <span className="total-amount">₹{subtotal.toFixed(2)}</span>
                        </div>
                        {selectedRedemption && (
                            <div className="summary-item" style={{ color: "#0a7" }}>
                                <strong>Redeem:</strong> {selectedRedemption.type} ({selectedRedemption.points} pts)
                                {selectedRedemption.type === "Discount" ? `, -₹${loyaltyDiscountPreview.toFixed(2)}` : `, ${selectedRedemption.giftProductName}`}
                            </div>
                        )}
                        <div className="summary-item">
                            <strong>Payable:</strong> ₹{payableSubtotal.toFixed(2)}
                        </div>
                    </div>

                    <div className="action-buttons">
                        <button
                            className={`action-btn ${customerId ? "primary" : ""}`}
                            onClick={submitInvoice}
                            disabled={!customerId || isRecalledInvoice}
                        >
                            Generate Invoice
                        </button>
                    </div>
                </div>

                {/* Invoice Result */}
                {invoice && showSuccessFooter && (
                    <div className="retro-message success">
                        <h3>✓ Invoice Generated Successfully</h3>
                        <div className="invoice-details">
                            <div><strong>Invoice No:</strong> {invoice.invoiceNumber}</div>
                            <div><strong>Date:</strong> {formatToDDMMYYYYhhmmA(invoice.date)}</div>
                            <div><strong>Status:</strong> {invoice.status}</div>
                        </div>
                        <div className="invoice-totals">
                            <h3>Total Amount: ₹{invoice.totalAmount.toFixed(2)}</h3>
                            <h3>Balance: ₹{invoice.balance.toFixed(2)}</h3>
                        </div>
                    </div>
                )}

                {/* Hold Bills Modal */}
                {showHoldModal && (
                    <div className="modal-overlay">
                        <div className="modal-content hold-modal">
                            <div className="modal-header">
                                <h3>Hold Bills ({holdInvoices.length})</h3>
                                <button
                                    className="modal-close"
                                    onClick={() => setShowHoldModal(false)}
                                >
                                    ✕
                                </button>
                            </div>

                            {loadingHolds ? (
                                <div className="loading-text">Loading hold bills...</div>
                            ) : holdInvoices.length === 0 ? (
                                <div className="no-data-message">No hold bills found</div>
                            ) : (
                                <div className="hold-bills-table-container">
                                    <table className="hold-bills-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Invoice No</th>
                                                <th>Customer</th>
                                                <th>Date</th>
                                                <th>Items</th>
                                                <th>Total</th>
                                                <th>Salesman</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {holdInvoices.map((inv, index) => (
                                                <tr
                                                    key={inv.id}
                                                    onClick={() => loadHoldInvoiceToScreen(inv)}
                                                    className="hold-bill-row"
                                                >
                                                    <td>{index + 1}</td>
                                                    <td>
                                                        <strong>{inv.invoiceNumber}</strong>
                                                    </td>
                                                    <td>
                                                        {inv.customerName || "Walk-in"}
                                                        {inv.customerId && <div className="hint">ID: {inv.customerId}</div>}
                                                    </td>
                                                    <td>
                                                        {formatToDDMMYYYY(inv.date)} {/* Changed */}
                                                        <div className="hint">
                                                            {new Date(inv.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="items-count">
                                                            {inv.items.length} items
                                                            <div className="hint">
                                                                {inv.items.reduce((sum, item) => sum + item.quantity, 0)} units
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="amount-cell">
                                                        <strong>₹{inv.totalAmount.toFixed(2)}</strong>
                                                    </td>
                                                    <td>
                                                        {inv.salesmanId || "-"}
                                                    </td>
                                                    <td>
                                                        <div className="hold-actions">
                                                            {pendingDeleteHoldId === inv.id ? (
                                                                <>
                                                                    <button
                                                                        className="retro-btn small danger"
                                                                        onClick={(e) => deleteHoldInvoice(inv, e)}
                                                                    >
                                                                        Confirm
                                                                    </button>
                                                                    <button
                                                                        className="retro-btn small"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setPendingDeleteHoldId(null);
                                                                        }}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        className="retro-btn small primary"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            loadHoldInvoiceToScreen(inv);
                                                                        }}
                                                                    >
                                                                        Load
                                                                    </button>
                                                                    <button
                                                                        className="retro-btn small danger"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setPendingDeleteHoldId(inv.id || null);
                                                                        }}
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="modal-footer">
                                <div className="hint">Click on any row to load the invoice</div>
                                <button
                                    className="retro-btn"
                                    onClick={() => setShowHoldModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reprint Modal */}
                {showReprintModal && (
                    <div className="modal-overlay">
                        <div className="modal-content hold-modal" style={{ maxWidth: '800px' }}>
                            <div className="modal-header">
                                <h3>Reprint Bill (Last 10)</h3>
                                <button className="modal-close" onClick={() => setShowReprintModal(false)}>✕</button>
                            </div>
                            <div className="modal-body" style={{ padding: '15px' }}>
                                <div style={{ marginBottom: '15px' }}>
                                    <input
                                        ref={reprintSearchInputRef}
                                        type="text"
                                        className="retro-input"
                                        placeholder="Search Bill No"
                                        value={reprintSearchQuery}
                                        onChange={(e) => {
                                            setReprintSearchQuery(e.target.value);
                                            void loadReprintInvoices(e.target.value);
                                        }}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                {loadingReprint ? (
                                    <div className="loading-text">Loading bills...</div>
                                ) : reprintInvoices.length === 0 ? (
                                    <div className="no-data-message">No bills found</div>
                                ) : (
                                    <div className="hold-bills-table-container">
                                        <table className="hold-bills-table">
                                            <thead>
                                                <tr>
                                                    <th>Bill No</th>
                                                    <th>Customer Name</th>
                                                    <th>Total Qty</th>
                                                    <th>Date & Time</th>
                                                    <th>Total Amount</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reprintInvoices.map((inv, idx) => {
                                                    const isSelected = idx === selectedReprintIndex;
                                                    return (
                                                        <tr
                                                            key={inv.id}
                                                            style={{ backgroundColor: isSelected ? '#e0f7fa' : 'transparent', cursor: 'pointer' }}
                                                            onClick={() => setSelectedReprintIndex(idx)}
                                                            onDoubleClick={() => {
                                                                setLastInvoice(inv);
                                                                setShowReprintModal(false);
                                                                setShowPrintModal(true);
                                                            }}
                                                        >
                                                            <td><strong>{inv.invoiceNumber}</strong></td>
                                                            <td>{inv.customerName || "Walk-in"}</td>
                                                            <td>{inv.items.reduce((sum, item) => sum + Math.abs(item.quantity), 0)}</td>
                                                            <td>
                                                                {formatToDDMMYYYY(inv.date)}<br />
                                                                <span style={{ fontSize: '0.85em', color: '#666' }}>
                                                                    {new Date(inv.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </td>
                                                            <td><strong>₹{inv.totalAmount.toFixed(2)}</strong></td>
                                                            <td>
                                                                <button
                                                                    className="retro-btn small primary"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setLastInvoice(inv);
                                                                        setShowReprintModal(false);
                                                                        setShowPrintModal(true);
                                                                    }}
                                                                >
                                                                    Print
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <div className="hint">Use ↑ ↓ arrows to navigate, Enter to print</div>
                                <button className="retro-btn" onClick={() => setShowReprintModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* ---------- Admin Edit Modal ---------- */}
            {showAdminEditModal && (
                <div className="modal-overlay" onClick={() => {
                    setShowAdminEditModal(false);
                    setAdminEditStep("password");
                    setAdminPassword("");
                }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ minWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Edit Paid Invoice (Admin)</h2>
                            <button className="close-btn" onClick={() => {
                                setShowAdminEditModal(false);
                                setAdminEditStep("password");
                                setAdminPassword("");
                            }}>×</button>
                        </div>
                        <div className="modal-body">
                            {adminEditStep === "password" && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px' }}>
                                    <p>Please enter an admin password to continue.</p>
                                    <input
                                        autoFocus
                                        type="password"
                                        className="retro-input"
                                        placeholder="Admin Password"
                                        value={adminPassword}
                                        onChange={e => setAdminPassword(e.target.value)}
                                        onKeyDown={async e => {
                                            if (e.key === "Enter") {
                                                try {
                                                    await verifyAdminApi(adminPassword);
                                                    setAdminEditStep("search");
                                                } catch (err) {
                                                    toast.error("Invalid admin password");
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        className="retro-btn primary"
                                        onClick={async () => {
                                            try {
                                                await verifyAdminApi(adminPassword);
                                                setAdminEditStep("search");
                                            } catch (err) {
                                                toast.error("Invalid admin password");
                                            }
                                        }}
                                    >
                                        Verify
                                    </button>
                                </div>
                            )}

                            {adminEditStep === "search" && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            autoFocus
                                            type="text"
                                            className="retro-input"
                                            placeholder="Search by Bill No (e.g. 123) or Name"
                                            value={adminSearchTerm}
                                            onChange={e => setAdminSearchTerm(e.target.value)}
                                            onKeyDown={async e => {
                                                if (e.key === "Enter") {
                                                    try {
                                                        const all = await getAllInvoices();
                                                        const term = adminSearchTerm.toLowerCase();
                                                        const results = all.filter(inv =>
                                                            inv.status === "Paid" &&
                                                            (inv.invoiceNumber.toLowerCase().includes(term) ||
                                                                (inv.customerName && inv.customerName.toLowerCase().includes(term)))
                                                        );
                                                        setAdminSearchResults(results);
                                                    } catch (err) {
                                                        toast.error("Failed to search invoices");
                                                    }
                                                }
                                            }}
                                            style={{ flex: 1 }}
                                        />
                                        <button
                                            className="retro-btn primary"
                                            onClick={async () => {
                                                try {
                                                    const all = await getAllInvoices();
                                                    const term = adminSearchTerm.toLowerCase();
                                                    const results = all.filter(inv =>
                                                        inv.status === "Paid" &&
                                                        (inv.invoiceNumber.toLowerCase().includes(term) ||
                                                            (inv.customerName && inv.customerName.toLowerCase().includes(term)))
                                                    );
                                                    setAdminSearchResults(results);
                                                } catch (err) {
                                                    toast.error("Failed to search invoices");
                                                }
                                            }}
                                        >
                                            Search
                                        </button>
                                    </div>

                                    <div className="hold-bills-table-container">
                                        <table className="hold-bills-table">
                                            <thead>
                                                <tr>
                                                    <th>Bill No</th>
                                                    <th>Customer</th>
                                                    <th>Date</th>
                                                    <th>Total</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {adminSearchResults.map(inv => (
                                                    <tr key={inv.id}>
                                                        <td>{inv.invoiceNumber}</td>
                                                        <td>{inv.customerName || "Walk-in"}</td>
                                                        <td>{formatToDDMMYYYY(inv.date)}</td>
                                                        <td>₹{inv.totalAmount.toFixed(2)}</td>
                                                        <td>
                                                            <button
                                                                className="retro-btn small secondary"
                                                                onClick={() => {
                                                                    loadInvoiceToScreen(inv);
                                                                    setIsAdminEditing(true);
                                                                    setShowAdminEditModal(false);
                                                                    setAdminEditStep("password");
                                                                    setAdminPassword("");
                                                                    setAdminSearchResults([]);
                                                                    toast.success("Loaded for admin edit. Press F7 to save.");
                                                                }}
                                                            >
                                                                Edit
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {adminSearchResults.length === 0 && adminSearchTerm && (
                                                    <tr>
                                                        <td colSpan={5} style={{ textAlign: 'center' }}>No paid invoices found</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Right Side Status Bar */}
            <div className={`status-sidebar ${isExpanded ? "expanded" : "collapsed"}`}>
                {isExpanded ? (
                    <>
                        <div className="sidebar-header">
                            <h3>SYSTEM STATUS</h3>
                        </div>

                        <div className="status-category">
                            <h4>Display Size</h4>
                            <div className="status-items" style={{ flexDirection: "row", gap: "10px", padding: "5px" }}>
                                <button
                                    className="retro-btn small primary"
                                    style={{ flex: 1, padding: "5px", fontSize: "14px", fontWeight: "bold" }}
                                    onClick={() => setFontZoom(z => Math.max(z - 0.1, 0.5))}
                                >
                                    A-
                                </button>
                                <button
                                    className="retro-btn small primary"
                                    style={{ flex: 1, padding: "5px", fontSize: "14px", fontWeight: "bold" }}
                                    onClick={() => setFontZoom(z => Math.min(z + 0.1, 2))}
                                >
                                    A+
                                </button>
                            </div>
                        </div>

                        <div className="status-category">
                            <h4>Billing Actions</h4>
                            <div className="status-items">
                                <div className="status-item"><span className="status-key">F2</span><span className="status-desc">Redeem Points</span></div>
                                <div className="status-item"><span className="status-key">F3</span><span className="status-desc">Return</span></div>
                                <div className="status-item"><span className="status-key">F5</span><span className="status-desc">Recall Invoice</span></div>
                                <div className="status-item"><span className="status-key">Ctrl+F5</span><span className="status-desc">Edit Invoice</span></div>

                                <div className="status-item"><span className="status-key">Ctrl+F10</span><span className="status-desc">Show Hold Bills</span></div>
                                <div className="status-item"><span className="status-key">Ctrl+F6</span><span className="status-desc">New bill / Reset screen</span></div>
                                <div className="status-item"><span className="status-key">F7</span><span className="status-desc">Save & payment</span></div>
                                <div className="status-item"><span className="status-key">F8</span><span className="status-desc">Calculator</span></div>
                                <div className="status-item"><span className="status-key">Ctrl -</span><span className="status-desc">Zoom out</span></div>
                                <div className="status-item"><span className="status-key">F10</span><span className="status-desc">Hold</span></div>
                                <div className="status-item"><span className="status-key">F12</span><span className="status-desc">Reprint Bill</span></div>
                                <div className="status-item"><span className="status-key">Ctrl+F12</span><span className="status-desc">Reprint List</span></div>
                            </div>
                        </div>

                        <div className="status-category">
                            <h4>Navigation</h4>
                            <div className="status-items">
                                <div className="status-item"><span className="status-key">↑ ↓</span><span className="status-desc">Move between rows</span></div>
                                <div className="status-item"><span className="status-key">Tab</span><span className="status-desc">Next column</span></div>
                                <div className="status-item"><span className="status-key">Shift + Tab</span><span className="status-desc">Previous column</span></div>
                            </div>
                        </div>

                        <div className="status-category">
                            <h4>Product Entry</h4>
                            <div className="status-items">
                                <div className="status-item"><span className="status-key">Enter</span><span className="status-desc">Add / confirm product</span></div>
                                <div className="status-item"><span className="status-key">`</span><span className="status-desc">Product search</span></div>
                                <div className="status-item"><span className="status-key">Delete</span><span className="status-desc">Remove current row</span></div>
                            </div>
                        </div>

                        <div className="status-category">
                            <h4>Print & Modal</h4>
                            <div className="status-items">
                                <div className="status-item"><span className="status-key">Ctrl + P</span><span className="status-desc">Print invoice</span></div>
                                <div className="status-item"><span className="status-key">Esc</span><span className="status-desc">Close / Cancel</span></div>
                            </div>
                        </div>

                        <div className="status-category current-status">
                            <h4>Current Status</h4>
                            <div className="status-items">
                                <div className="status-item"><span className="status-key">Cust</span><span className="status-desc">{customerId ? `ID: ${customerId}` : "Not Selected"}</span></div>
                                <div className="status-item"><span className="status-key">Items</span><span className="status-desc">{validItemsCount} product(s)</span></div>
                                <div className="status-item"><span className="status-key">Qty</span><span className="status-desc">{totalQty} units</span></div>
                                <div className="status-item"><span className="status-key">Total</span><span className="status-desc">₹{subtotal.toFixed(2)}</span></div>
                            </div>
                        </div>

                        <div className="system-info">
                            <div><span className="label">Active Row:</span><span className="value">{currentRow + 1}</span></div>
                            <div><span className="label">Active Column:</span><span className="value">{currentColumn.toUpperCase()}</span></div>
                            <div><span className="label">Time:</span><span className="value">{new Date().toLocaleTimeString()}</span></div>
                            <div><span className="label">System:</span><span className="value">Billing v2.0</span></div>
                        </div>
                    </>
                ) : (
                    <div className="status-rail">
                        <button
                            className="status-rail-btn"
                            onClick={() => setFontZoom(z => Math.max(z - 0.1, 0.5))}
                            title="Zoom out"
                        >
                            A-
                        </button>
                        <button
                            className="status-rail-btn"
                            onClick={() => setFontZoom(z => Math.min(z + 0.1, 2))}
                            title="Zoom in"
                        >
                            A+
                        </button>
                        {shortcutRailItems.map((item) => (
                            <button key={item.key} className="status-rail-btn" title={`${item.key}: ${item.label}`}>
                                {item.key}
                            </button>
                        ))}
                        <button className="status-rail-btn status-rail-metric" title={`Customer: ${customerId ? `ID ${customerId}` : "Not Selected"}`}>C</button>
                        <button className="status-rail-btn status-rail-metric" title={`Items: ${validItemsCount}`}>I</button>
                        <button className="status-rail-btn status-rail-metric" title={`Qty: ${totalQty}`}>Q</button>
                        <button className="status-rail-btn status-rail-metric" title={`Total: ₹${subtotal.toFixed(2)}`}>₹</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const CreateInvoice = () => {
    return (
        <SidebarProvider defaultExpanded={true}>
            <CreateInvoiceContent />
        </SidebarProvider>
    );
};

export default CreateInvoice;
