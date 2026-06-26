import { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import {
    createPurchase,
    addPurchasePayment,
    cancelPurchase,
    getTodaySummary,
    getTotalOutstanding,
    updatePurchase
} from "../../api/purchaseApi";
import type { CreatePurchaseRequest, PurchaseResponse, CreatePurchasePaymentRequest } from "../../models/Purchase";
import { usePurchases, useDistributors, useInvalidateQuery, PURCHASES_KEY } from "../../hooks/useMasterQueries";
import { useProducts } from "../../hooks/useProducts";
import type { PurchaseType, PaymentMode } from "../../models/Purchase";
import DistributorSearchModal from "../../components/DistributorSearchModal";
import ProductSearchModal from "../../components/ProductSearchModal";
import "../../Styles/GlobalLayout.css";
import "../../Styles/PurchaseStyles.css";
import { getCurrentDateTime } from "../../utils/dateUtils";

// Define proper item type
interface PurchaseItem {
    productId: number;
    productName: string;
    hsnCode: string;
    brandCode: string;
    categoryCode: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    mrp: number;
    salePrice: number;
    gstPercentage: number;

    discountType: 'percentage' | 'amount'; // 'percentage' or 'amount'
    discountValue: number; // either percentage or fixed amount
    discountAmount: number; // calculated discount amount
}

const emptyItem: PurchaseItem = {
    productId: 0,
    productName: "",
    hsnCode: "",
    brandCode: "",
    categoryCode: "",
    quantity: 1,
    unitPrice: 0,
    costPrice: 0,
    mrp: 0,
    salePrice: 0,
    gstPercentage: 18,
    discountType: 'percentage',
    discountValue: 0,
    discountAmount: 0
};

const emptyForm = {
    id: null as number | null,
    date: new Date().toISOString().split('T')[0],
    distributorId: 0,
    distributorName: "",
    invoiceNo: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    type: "Local" as PurchaseType,
    items: [] as PurchaseItem[]
};

export default function PurchaseEntry() {
    usePageTitle("Purchase Entry");
    const [form, setForm] = useState(emptyForm);
    const [currentItem, setCurrentItem] = useState<PurchaseItem>(emptyItem);
    const { data: purchases = [] } = usePurchases();
    const { data: distributors = [] } = useDistributors();
    const { data: products = [] } = useProducts();
    const invalidate = useInvalidateQuery();
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [summary, setSummary] = useState({
        totalPurchases: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalBalance: 0
    });
    const [totalOutstanding, setTotalOutstanding] = useState(0);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");
    const barcodeRef = useRef<HTMLInputElement>(null);
    const [selectedPurchase, setSelectedPurchase] = useState<PurchaseResponse | null>(null);
    const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [chequeNo, setChequeNo] = useState("");
    const [chequeDate, setChequeDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [bankName, setBankName] = useState("");
    const [remarks, setRemarks] = useState("");
    const [showDistributorSearch, setShowDistributorSearch] = useState(false);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const qtyInputRef = useRef<HTMLInputElement>(null);

    // Adjustment state variables
    const [roundOff, setRoundOff] = useState(0);
    const [savedRoundOffAmount, setSavedRoundOffAmount] = useState(0);
    const [otherCharges, setOtherCharges] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [isOtherChargesPositive, setIsOtherChargesPositive] = useState(true);
    const [isDiscountPercentage, setIsDiscountPercentage] = useState(false);
    const [isGstInclusive, setIsGstInclusive] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void (async () => {
                try {
                    const outstanding = await getTotalOutstanding();
                    setTotalOutstanding(outstanding);
                } catch (error) {
                    console.error("Failed to load outstanding:", error);
                }
            })();

            void (async () => {
                try {
                    const data = await getTodaySummary();
                    setSummary(data);
                } catch (error) {
                    console.error("Failed to load summary:", error);
                }
            })();
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    // Automatically sync distributorName when distributorId changes
    useEffect(() => {
        if (form.distributorId) {
            const distributor = distributors.find(d => d.id === form.distributorId);
            if (distributor) {
                if (form.distributorName !== distributor.name) {
                    setForm(f => ({ ...f, distributorName: distributor.name }));
                }
            } else {
                if (form.distributorName !== "") {
                    setForm(f => ({ ...f, distributorName: "" }));
                }
            }
        } else {
            if (form.distributorName !== "") {
                setForm(f => ({ ...f, distributorName: "" }));
            }
        }
    }, [form.distributorId, distributors]);

    const loadData = async () => {
        try {
            const outstanding = await getTotalOutstanding();
            setTotalOutstanding(outstanding);
        } catch (error) {
            console.error("Failed to load outstanding:", error);
        }
    };

    const loadSummary = async () => {
        try {
            const data = await getTodaySummary();
            setSummary(data);
        } catch (error) {
            console.error("Failed to load summary:", error);
        }
    };

    const resetPaymentForm = () => {
        setPaymentMode("Cash");
        setPaymentAmount("");
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setChequeNo("");
        setChequeDate(new Date().toISOString().split('T')[0]);
        setBankName("");
        setRemarks("");
    };

    // Filter products based on the selected distributor
    const filteredProducts = form.distributorId
        ? products.filter(p => p.distributorId === form.distributorId)
        : [];

    const selectPurchase = (p: PurchaseResponse) => {
        setSelectedPurchase(p);
        setSelectedId(p.id);
        setDiscount(p.discount || 0);
        setOtherCharges(Math.abs(p.otherCharges || 0));
        setIsOtherChargesPositive((p.otherCharges || 0) >= 0);
        setIsDiscountPercentage(false);
        setRoundOff(0);
        setSavedRoundOffAmount(p.roundOff || 0);

        // Parse items safely with defaults
        const parsedItems = p.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            hsnCode: item.hsnCode || "",
            brandCode: item.brandCode || "",
            categoryCode: item.categoryCode || "",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.purchaseRate,
            mrp: item.mrp,
            salePrice: item.unitPrice,
            gstPercentage: item.gstPercentage || 18,
            discountType: item.discountType || 'percentage',
            discountValue: item.discountValue || 0,
            discountAmount: item.discountAmount || 0
        }));

        // Fill form for editing
        setForm({
            id: p.id,
            date: new Date(p.date).toISOString().split('T')[0],
            distributorId: p.distributorId,
            distributorName: p.distributorName,
            invoiceNo: p.invoiceNo,
            invoiceDate: new Date(p.invoiceDate).toISOString().split('T')[0],
            type: p.type,
            items: parsedItems
        });
    };

    const fetchDistributor = (id: number) => {
        const distributor = distributors.find(d => d.id === id);

        if (!distributor) {
            toast.error("Distributor not found");
            setForm(f => ({
                ...f,
                distributorId: 0,
                distributorName: ""
            }));
            return;
        }

        setForm(f => ({
            ...f,
            distributorId: distributor.id,
            distributorName: distributor.name
        }));
    };

    const fetchProduct = (code: string) => {
        // Check if distributor is selected first
        if (!form.distributorId) {
            toast.warning("Please select a distributor first.");
            return;
        }

        // Search only within the filtered list
        const product = filteredProducts.find(p =>
            (p.barcodes && p.barcodes.some(b => b.barcodeValue.toLowerCase().includes(code.toLowerCase()))) ||
            p.id.toString() === code ||
            p.name.toLowerCase().includes(code.toLowerCase())
        );

        if (!product) {
            toast.error("Product not found or does not belong to this distributor");
            setCurrentItem(emptyItem);
            return;
        }
        setCurrentItem({
            productId: product.id,
            productName: product.name,
            hsnCode: product.hsnCode || "",
            brandCode: product.brandCode || "",
            categoryCode: product.categoryCode || "",
            quantity: 1,
            unitPrice: product.costPrice,
            costPrice: product.costPrice,
            mrp: product.mrp,
            salePrice: product.price,
            gstPercentage: product.gstPercentage,


            discountType: 'percentage',
            discountValue: 0,
            discountAmount: 0
        });
        setTimeout(() => {
            qtyInputRef.current?.focus();
            qtyInputRef.current?.select();
        }, 100);
    };
    const addItem = () => {
        if (!currentItem.productId || currentItem.quantity <= 0 || currentItem.unitPrice <= 0) {
            toast.warning("Please select a product and enter quantity and price");
            return;
        }

        const product = products.find(p => p.id === currentItem.productId);
        if (!product) return;

        const item: PurchaseItem = {
            ...currentItem,
            productName: product.name,
            hsnCode: product.hsnCode || "",
            brandCode: product.brandCode || "",
            categoryCode: product.categoryCode || "",
            costPrice: currentItem.unitPrice, // Use entered price as cost
            salePrice: currentItem.salePrice // Keep user-updated sale price
        };

        setForm(f => ({
            ...f,
            items: [...f.items, item]
        }));

        setCurrentItem(emptyItem);
        if (barcodeRef.current) {
            barcodeRef.current.value = "";
            barcodeRef.current.focus();
        }
    };

    const removeItem = (index: number) => {
        setForm(f => ({
            ...f,
            items: f.items.filter((_, i) => i !== index)
        }));
    };

    const calculateItemTotals = (item: PurchaseItem) => {
        // Safely parse values with defaults
        const enteredUnitPrice = item.unitPrice || 0;
        const quantity = item.quantity || 0;
        const gstPercentage = item.gstPercentage || 0;
        const unitPrice = isGstInclusive && gstPercentage > 0
            ? enteredUnitPrice / (1 + gstPercentage / 100)
            : enteredUnitPrice;
        const salePrice = item.salePrice || enteredUnitPrice * 1.2; // Default markup if missing
        const discountType = item.discountType || 'percentage';
        const discountValue = item.discountValue || 0;

        // Calculate taxable value before discount
        const taxableValueBeforeDiscount = unitPrice * quantity;

        // Calculate discount amount
        let discountAmount = 0;
        if (discountType === 'percentage') {
            discountAmount = (taxableValueBeforeDiscount * discountValue) / 100;
        } else {
            discountAmount = discountValue;
        }

        // Ensure discount doesn't exceed taxable value
        discountAmount = Math.min(discountAmount, taxableValueBeforeDiscount);

        // Taxable value after discount
        const taxableValue = taxableValueBeforeDiscount - discountAmount;

        // Calculate GST on discounted value
        const gstAmount = (taxableValue * gstPercentage) / 100;
        const lineTotal = taxableValue + gstAmount; // Line total should include GST
        const unitProfit = salePrice - enteredUnitPrice;
        const netProfit = unitProfit * quantity;

        return {
            taxableValueBeforeDiscount,
            discountAmount,
            taxableValue,
            gstAmount,
            lineTotal, // This should include GST
            unitProfit,
            netProfit,
            cgstAmount: gstAmount / 2,
            sgstAmount: gstAmount / 2
        };
    };

    const getPayloadUnitPrice = (item: PurchaseItem) => {
        const enteredUnitPrice = item.unitPrice || 0;
        const gstPercentage = item.gstPercentage || 0;

        if (!isGstInclusive || gstPercentage <= 0) {
            return enteredUnitPrice;
        }

        return enteredUnitPrice / (1 + gstPercentage / 100);
    };

    const calculateTotals = () => {
        // Calculate base totals from items
        let subTotal = 0;
        let gstTotal = 0;

        form.items.forEach(item => {
            const itemTotals = calculateItemTotals(item);
            subTotal += itemTotals.taxableValue;
            gstTotal += itemTotals.gstAmount;
        });

        const baseTotal = subTotal + gstTotal;

        // Calculate discount amount
        let discountAmount = 0;
        if (isDiscountPercentage) {
            discountAmount = (baseTotal * discount) / 100;
        } else {
            discountAmount = discount;
        }

        // Calculate other charges (positive or negative)
        const chargesAmount = isOtherChargesPositive ? otherCharges : -otherCharges;

        // Calculate total before round off
        const totalBeforeRoundOff = baseTotal - discountAmount + chargesAmount;

        // Calculate round off
        let calculatedRoundOffAmount = 0;
        if (roundOff === 1) {
            // Round to nearest rupee
            calculatedRoundOffAmount = Math.round(totalBeforeRoundOff) - totalBeforeRoundOff;
        } else if (roundOff === 2) {
            // Round up
            calculatedRoundOffAmount = Math.ceil(totalBeforeRoundOff) - totalBeforeRoundOff;
        } else if (roundOff === 3) {
            // Round down
            calculatedRoundOffAmount = Math.floor(totalBeforeRoundOff) - totalBeforeRoundOff;
        }

        // Preserve saved round-off for loaded purchases when user keeps "No Rounding"
        const roundOffAmount = roundOff === 0 ? savedRoundOffAmount : calculatedRoundOffAmount;

        // Final grand total
        const grandTotal = totalBeforeRoundOff + roundOffAmount;

        return {
            subTotal,
            gstTotal,
            baseTotal,
            discountAmount,
            chargesAmount,
            roundOffAmount,
            totalBeforeRoundOff,
            grandTotal
        };
    };
    const submit = async () => {
        try {
            if (form.items.length === 0) {
                toast.warning("Please add at least one item");
                return;
            }

            if (!form.distributorId) {
                toast.warning("Please select a distributor");
                return;
            }

            if (!form.invoiceNo.trim()) {
                toast.warning("Please enter an invoice number");
                return;
            }

            // Find distributor to get distributorCode
            const distributor = distributors.find(d => d.id === form.distributorId);
            if (!distributor) {
                toast.error("Distributor not found");
                return;
            }

            const totals = calculateTotals();

            // Prepare items according to CreatePurchaseItemRequest
            const items = form.items.map(item => {
                const itemTotals = calculateItemTotals(item);

                return {
                    productId: item.productId,
                    productName: item.productName,
                    hsnCode: item.hsnCode || undefined,
                    brandCode: item.brandCode || undefined,
                    categoryCode: item.categoryCode || undefined,
                    quantity: item.quantity,
                    unitPrice: getPayloadUnitPrice(item),
                    purchaseRate: getPayloadUnitPrice(item), // Map costPrice to purchaseRate
                    mrp: item.mrp,
                    gstPercentage: item.gstPercentage,
                    discountType: item.discountType,
                    discountValue: item.discountValue,
                    discountAmount: itemTotals.discountAmount
                };
            });

            const payload: CreatePurchaseRequest = {
                date: new Date(form.date).toISOString(),
                distributorId: distributor.id, // Use distributor code or ID as string
                distributorName: distributor.name,
                invoiceNo: form.invoiceNo,
                invoiceDate: new Date(form.invoiceDate).toISOString(),
                type: form.type,
                items: items,
                discount: totals.discountAmount, // Overall purchase discount
                otherCharges: totals.chargesAmount,
                roundOff: totals.roundOffAmount,
                totalAmount: totals.grandTotal


            };

            console.log("Sending purchase payload:", JSON.stringify(payload, null, 2));

            if (form.id) {
                // UPDATE existing purchase
                await updatePurchase(form.id, payload);
                toast.success("Purchase updated successfully!");
            } else {
                // CREATE new purchase
                await createPurchase(payload);
                toast.success("Purchase created successfully!");
            }

            invalidate(PURCHASES_KEY);
            await loadData();
            await loadSummary();
            clearForm();

        } catch (error: unknown) {
            console.error("Submit error details:", error);
            toast.error(error instanceof Error ? error.message : "Error saving purchase. Please check all fields.");
        }
    };

    const clearForm = () => {
        setForm(emptyForm);
        setSelectedId(null);
        setSelectedPurchase(null);
        setCurrentItem(emptyItem);
        setRoundOff(0);
        setOtherCharges(0);
        setDiscount(0);
        setIsOtherChargesPositive(true);
        setIsDiscountPercentage(false);
        setSavedRoundOffAmount(0);
        if (barcodeRef.current) barcodeRef.current.value = "";
    };

    const submitRef = useRef(submit);
    const clearFormRef = useRef(clearForm);
    const addItemRef = useRef(addItem);
    useEffect(() => {
        submitRef.current = submit;
        clearFormRef.current = clearForm;
        addItemRef.current = addItem;
    }, [submit, clearForm, addItem]);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                submitRef.current();
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'u') {
                e.preventDefault();
                submitRef.current();
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                addItemRef.current();
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                clearFormRef.current();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const handleFormKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT' && target.tagName !== 'BUTTON') return;

        if (target.tagName === 'SELECT' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            return;
        }

        const formContainer = e.currentTarget;
        const focusableElements = Array.from(
            formContainer.querySelectorAll<HTMLElement>(
                'input:not([disabled]):not([readOnly]), select:not([disabled]), button:not([disabled])'
            )
        );

        const currentIndex = focusableElements.indexOf(target);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;

        if (e.key === 'Enter') {
            if (!e.defaultPrevented) {
                if (target === barcodeRef.current) {
                    return;
                }
                e.preventDefault();
                nextIndex = currentIndex + 1;
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            nextIndex = currentIndex + 1;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            nextIndex = currentIndex - 1;
        } else if (e.key === 'ArrowRight') {
            try {
                if (target.tagName === 'INPUT') {
                    const input = target as HTMLInputElement;
                    if (input.selectionStart === null || input.selectionStart === input.value.length) {
                        e.preventDefault();
                        nextIndex = currentIndex + 1;
                    }
                } else {
                    e.preventDefault();
                    nextIndex = currentIndex + 1;
                }
            } catch (err) {
                e.preventDefault();
                nextIndex = currentIndex + 1;
            }
        } else if (e.key === 'ArrowLeft') {
            try {
                if (target.tagName === 'INPUT') {
                    const input = target as HTMLInputElement;
                    if (input.selectionStart === null || input.selectionStart === 0) {
                        e.preventDefault();
                        nextIndex = currentIndex - 1;
                    }
                } else {
                    e.preventDefault();
                    nextIndex = currentIndex - 1;
                }
            } catch (err) {
                e.preventDefault();
                nextIndex = currentIndex - 1;
            }
        }

        if (nextIndex >= 0 && nextIndex < focusableElements.length && nextIndex !== currentIndex) {
            focusableElements[nextIndex].focus();
            if (focusableElements[nextIndex].tagName === 'INPUT') {
                setTimeout(() => {
                    try {
                        (focusableElements[nextIndex] as HTMLInputElement).select();
                    } catch (err) { }
                }, 0);
            }
        }
    };

    const filteredPurchases = purchases.filter(p => {
        const q = search.toLowerCase().trim();
        if (!q) return true;

        const distributor = distributors.find(d => d.id === p.distributorId);

        return (
            p.invoiceNo.toLowerCase().includes(q) ||
            p.distributorName.toLowerCase().includes(q) ||
            (distributor?.name.toLowerCase().includes(q) || false) ||
            p.id.toString().includes(q) ||
            p.items.some(item =>
                item.productName.toLowerCase().includes(q) ||
                (item.hsnCode?.toLowerCase().includes(q) || false)
            )
        );
    });

    const totals = calculateTotals();

    const totalPurchases = purchases.length;
    const totalPurchaseAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalPaid = purchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const totalBalance = purchases.reduce((sum, p) => sum + (p.balanceAmount || 0), 0);

    return (
        <div className="purchase-container">
            {/* Header */}
            <div className="purchase-header-bar">
                <span>Purchase Entry - Smart Super Market</span>
                <span>{getCurrentDateTime()}</span>
            </div>

            <h2>Purchase / Stock Entry</h2>

            {showDistributorSearch && (
                <DistributorSearchModal
                    distributors={distributors}
                    onSelect={(distributor) => {
                        fetchDistributor(distributor.id);
                        setShowDistributorSearch(false);
                    }}
                    onClose={() => setShowDistributorSearch(false)}
                />
            )}

            {showProductSearch && (
                <ProductSearchModal
                    products={filteredProducts}
                    initialQuery={barcodeRef.current?.value || ""}
                    onSelect={(product) => {
                        setCurrentItem({
                            productId: product.id,
                            productName: product.name,
                            hsnCode: product.hsnCode || "",
                            brandCode: product.brandCode || "",
                            categoryCode: product.categoryCode || "",
                            quantity: 1,
                            unitPrice: product.costPrice,
                            costPrice: product.costPrice,
                            mrp: product.mrp,
                            salePrice: product.price,
                            gstPercentage: product.gstPercentage,
                            discountType: 'percentage',
                            discountValue: 0,
                            discountAmount: 0
                        });
                        setShowProductSearch(false);
                        setTimeout(() => {
                            qtyInputRef.current?.focus();
                            qtyInputRef.current?.select();
                        }, 100);
                    }}
                    onClose={() => setShowProductSearch(false)}
                />
            )}

            {/* Form Section */}
            <div className="purchase-form-section">
                <div className="form-grid" onKeyDown={handleFormKeyDown}>
                    {/* ID Field */}
                    <div className="form-group">
                        <label>Purchase ID</label>
                        <input
                            className="retro-input"
                            disabled
                            placeholder="Auto"
                            value={form.id ? `PUR-${form.id.toString().padStart(4, '0')}` : "New Purchase"}
                        />
                    </div>

                    {/* Date Field */}
                    <div className="form-group">
                        <label>Purchase Date *</label>
                        <input
                            className="retro-input"
                            type="date"
                            value={form.date}
                            onChange={e => setForm({ ...form, date: e.target.value })}
                        />
                    </div>

                    {/* Invoice Number */}
                    <div className="form-group">
                        <label>Invoice Number *</label>
                        <input
                            className="retro-input"
                            placeholder="Enter invoice number"
                            value={form.invoiceNo}
                            onChange={e => setForm({ ...form, invoiceNo: e.target.value })}
                        />
                    </div>

                    {/* Invoice Date */}
                    <div className="form-group">
                        <label>Invoice Date *</label>
                        <input
                            className="retro-input"
                            type="date"
                            value={form.invoiceDate}
                            onChange={e => setForm({ ...form, invoiceDate: e.target.value })}
                        />
                    </div>

                    {/* Purchase Type */}
                    <div className="form-group">
                        <label>Purchase Type</label>
                        <select
                            className="retro-select"
                            value={form.type}
                            onChange={e => setForm({ ...form, type: e.target.value as PurchaseType })}
                        >
                            <option value="Local">Local</option>
                            <option value="Interstate">Interstate</option>
                            <option value="Composite">Composite</option>
                        </select>
                    </div>

                    {/* Distributor ID Input */}
                    <div className="form-group">
                        <label>Distributor ID *</label>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                                className="retro-input"
                                placeholder="Enter ID and press Enter"
                                value={form.distributorId || ""}
                                onChange={e => setForm({ ...form, distributorId: parseInt(e.target.value) || 0 })}
                                onKeyDown={e => {
                                    if (e.key === "Enter") {
                                        const id = form.distributorId;
                                        if (id > 0) fetchDistributor(id);
                                    }
                                }}
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                className="retro-btn small"
                                onClick={() => setShowDistributorSearch(true)}
                                title="Search distributor"
                            >
                                🔍
                            </button>
                        </div>
                    </div>

                    {/* Distributor Name (display only) */}
                    <div className="form-group">
                        <label>Distributor Name</label>
                        <input
                            className="retro-input"
                            value={form.distributorName}
                            readOnly
                            placeholder="Auto filled"
                        />
                    </div>

                    <div className="form-group">
                        <label>GST Inclusive</label>
                        <input
                            type="checkbox"
                            checked={isGstInclusive}
                            onChange={e => setIsGstInclusive(e.target.checked)}
                            style={{ width: "18px", height: "18px", marginTop: "8px" }}
                        />
                    </div>

                </div>

                {/* Item Entry Section */}
                <div className="item-entry-section">
                    <h3>Add Items</h3>
                    <div className="item-entry-grid" onKeyDown={handleFormKeyDown}>
                        {/* Scan Barcode */}
                        <div className="form-group">
                            <label>Scan Barcode</label>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <input
                                    ref={barcodeRef}
                                    className="retro-input"
                                    placeholder="Scan barcode or enter product ID/name"
                                    style={{ flex: 1 }}
                                    onKeyDown={async (e) => {
                                        if (e.key !== "Enter") return;

                                        const code = barcodeRef.current?.value.trim();
                                        if (!code) return;

                                        fetchProduct(code);
                                    }}
                                />
                                <button
                                    type="button"
                                    className="retro-btn small"
                                    onClick={() => {
                                        if (!form.distributorId) {
                                            import("react-toastify").then(m => m.toast.warning("Please select a distributor first."));
                                            return;
                                        }
                                        setShowProductSearch(true);
                                    }}
                                    title="Search product"
                                >
                                    🔍
                                </button>
                            </div>
                        </div>

                        {/* Product Dropdown */}
                        <div className="form-group">
                            <label>Product *</label>
                            <select
                                className="retro-select"
                                value={currentItem.productId}
                                onChange={e => {
                                    const id = parseInt(e.target.value);
                                    const product = filteredProducts.find(p => p.id === id);
                                    if (product) {
                                        setCurrentItem({
                                            productId: id,
                                            productName: product.name,
                                            hsnCode: product.hsnCode || "",
                                            brandCode: product.brandCode || "",
                                            categoryCode: product.categoryCode || "",
                                            quantity: 1,
                                            unitPrice: product.costPrice,
                                            costPrice: product.costPrice,
                                            mrp: product.mrp,
                                            salePrice: product.price,
                                            gstPercentage: product.gstPercentage,
                                            discountType: 'percentage',
                                            discountValue: 0,
                                            discountAmount: 0
                                        });
                                        setTimeout(() => {
                                            qtyInputRef.current?.focus();
                                            qtyInputRef.current?.select();
                                        }, 100);
                                    }
                                }}
                            >
                                <option value="0">
                                    {form.distributorId ? "-- Select Product --" : "-- Select Distributor First --"}
                                </option>
                                {filteredProducts.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} &nbsp; MRP:₹{p.mrp}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Quantity */}
                        <div className="form-group">
                            <label>Quantity *</label>
                            <input
                                ref={qtyInputRef}
                                className="retro-input"
                                type="number"
                                min="1"
                                value={currentItem.quantity}
                                onChange={e => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })}
                            />
                        </div>

                        {/* Base Price (Cost Price) */}
                        <div className="form-group">
                            <label>Base Price *</label>
                            <input
                                className="retro-input"
                                type="number"
                                step="0.01"
                                value={currentItem.unitPrice}
                                onChange={e => setCurrentItem({ ...currentItem, unitPrice: parseFloat(e.target.value) || 0 })}
                            />
                        </div>

                        {/* GST Percentage */}
                        <div className="form-group">
                            <label>GST %</label>
                            <input
                                className="retro-input"
                                type="number"
                                step="0.01"
                                value={currentItem.gstPercentage}
                                onChange={e => setCurrentItem({ ...currentItem, gstPercentage: parseFloat(e.target.value) || 0 })}
                            />
                        </div>

                        {/* Sale Price */}
                        <div className="form-group">
                            <label>Sale Price</label>
                            <input
                                className="retro-input"
                                type="number"
                                step="0.01"
                                value={currentItem.salePrice}
                                onChange={e => setCurrentItem({ ...currentItem, salePrice: parseFloat(e.target.value) || 0 })}
                            />
                        </div>

                        {/* MRP */}
                        <div className="form-group">
                            <label>MRP</label>
                            <input
                                className="retro-input"
                                type="number"
                                step="0.01"
                                value={currentItem.mrp}
                                onChange={e => setCurrentItem({ ...currentItem, mrp: parseFloat(e.target.value) || 0 })}
                            />
                        </div>

                        {/* Discount Type */}
                        <div className="form-group">
                            <label>Discount Type</label>
                            <select
                                className="retro-select"
                                value={currentItem.discountType}
                                onChange={e => setCurrentItem({
                                    ...currentItem,
                                    discountType: e.target.value as 'percentage' | 'amount'
                                })}
                            >
                                <option value="percentage">%</option>
                                <option value="amount">₹</option>
                            </select>
                        </div>

                        {/* Discount Value */}
                        <div className="form-group">
                            <label>Discount {currentItem.discountType === 'percentage' ? '%' : '₹'}</label>
                            <input
                                className="retro-input"
                                type="number"
                                step="0.01"
                                value={currentItem.discountValue}
                                onChange={e => setCurrentItem({
                                    ...currentItem,
                                    discountValue: parseFloat(e.target.value) || 0
                                })}
                            />
                        </div>

                        {/* Add Item Button */}
                        <div className="form-group">
                            <button
                                className="retro-btn primary"
                                onClick={addItem}
                                style={{ marginTop: '25px' }}
                                disabled={!currentItem.productId || currentItem.quantity <= 0 || currentItem.unitPrice <= 0}
                            >
                                ADD ITEM <sub>(Ctrl+A)</sub>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="items-table-section">
                    <table className="items-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Product</th>
                                <th>Qty Rec</th>
                                <th>Cost Price</th>
                                <th>Discount</th>
                                <th>Taxable Amt</th>
                                <th>CGST %</th>
                                <th>SGST %</th>
                                <th>GST Amount</th>
                                <th>Sales Price</th>
                                <th>MRP</th>
                                <th>Prof Margin(N)</th>
                                <th>Prof Margin(U)</th>
                                <th>Unit Sold</th>
                                <th>Line Total</th>
                                <th>Remove</th>
                            </tr>
                        </thead>
                        <tbody>
                            {form.items.map((item, index) => {
                                const itemTotals = calculateItemTotals(item);

                                return (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <strong>{item.productName}</strong>
                                            {item.hsnCode && <div className="hint">HSN: {item.hsnCode}</div>}
                                            {item.brandCode && <div className="hint">Brand: {item.brandCode}</div>}
                                        </td>
                                        <td>{item.quantity}</td>
                                        <td>₹{(item.unitPrice || 0).toFixed(2)}</td>
                                        <td>
                                            {item.discountValue > 0 ? (
                                                <div>
                                                    <strong>₹{itemTotals.discountAmount.toFixed(2)}</strong>
                                                    <div className="hint">
                                                        ({item.discountValue} {item.discountType === 'percentage' ? '%' : '₹'})
                                                    </div>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td>₹{itemTotals.taxableValue.toFixed(2)}</td>
                                        <td><div>{((item.gstPercentage || 0) / 2).toFixed(2)}%
                                            <div className="hint">
                                                ₹{(itemTotals.gstAmount / 2).toFixed(2)}
                                            </div>
                                        </div>
                                        </td>
                                        <td><div>{((item.gstPercentage || 0) / 2).toFixed(2)}%
                                            <div className="hint">
                                                ₹{(itemTotals.gstAmount / 2).toFixed(2)}
                                            </div>
                                        </div>
                                        </td>

                                        <td>₹{itemTotals.gstAmount.toFixed(2)}</td>
                                        <td>₹{(item.salePrice || 0).toFixed(2)}</td>
                                        <td>₹{(item.mrp || 0).toFixed(2)}</td>
                                        <td>₹{itemTotals.netProfit.toFixed(2)}</td>
                                        <td>₹{itemTotals.unitProfit.toFixed(2)}</td>
                                        <td>0</td>
                                        <td>₹{itemTotals.lineTotal.toFixed(2)}</td>
                                        <td>
                                            <button
                                                //className="retro-btn danger"
                                                onClick={() => removeItem(index)}
                                                style={{ background: 'crimson', border: '1px solid #000000', padding: '3px 15px', fontSize: '18px', color: 'white', borderRadius: '20%' }}
                                            >
                                                ✗
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {form.items.length === 0 && (
                                <tr>
                                    <td colSpan={13} className="no-items">
                                        No items added. Add items using the form above.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div className="totals-section">
                    {/* Left Column - Adjustments */}
                    <div className="adjustments-column">
                        {/* Discount Section */}
                        <div className="adjustment-row">
                            <div className="adjustment-controls">
                                <span>Discount:</span>
                                <div className="adjustment-inputs">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={discount}
                                        onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                                        className="adjustment-input"
                                        placeholder="0.00"
                                    />
                                    <select
                                        value={isDiscountPercentage ? 'percentage' : 'amount'}
                                        onChange={(e) => setIsDiscountPercentage(e.target.value === 'percentage')}
                                        className="adjustment-select"
                                    >
                                        <option value="amount">₹</option>
                                        <option value="percentage">%</option>
                                    </select>
                                </div>
                                <span className="adjustment-amount negative">
                                    -₹{totals.discountAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Other Charges Section */}
                        <div className="adjustment-row">
                            <div className="adjustment-controls">
                                <span>Other Charges:</span>
                                <div className="adjustment-inputs">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={otherCharges}
                                        onChange={(e) => setOtherCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                                        className="adjustment-input"
                                        placeholder="0.00"
                                    />
                                    <select
                                        value={isOtherChargesPositive ? 'positive' : 'negative'}
                                        onChange={(e) => setIsOtherChargesPositive(e.target.value === 'positive')}
                                        className="adjustment-select"
                                    >
                                        <option value="positive">+ Add</option>
                                        <option value="negative">- Deduct</option>
                                    </select>
                                </div>
                                <span className={`adjustment-amount ${isOtherChargesPositive ? 'positive' : 'negative'}`}>
                                    {isOtherChargesPositive ? '+' : '-'}₹{otherCharges.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Round Off Section */}
                        <div className="adjustment-row">
                            <div className="adjustment-controls">
                                <span>Round Off:</span>
                                <select
                                    value={roundOff}
                                    onChange={(e) => {
                                        const mode = parseInt(e.target.value);
                                        setRoundOff(mode);
                                        if (mode !== 0) {
                                            setSavedRoundOffAmount(0);
                                        }
                                    }}
                                    className="adjustment-select full-width"
                                >
                                    <option value="0">No Rounding</option>
                                    <option value="1">Round to Nearest ₹</option>
                                    <option value="2">Round Up</option>
                                    <option value="3">Round Down</option>
                                </select>
                                <span className={`adjustment-amount ${totals.roundOffAmount >= 0 ? 'positive' : 'negative'}`}>
                                    {totals.roundOffAmount >= 0 ? '+' : ''}₹{totals.roundOffAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Final Totals */}
                    <div className="totals-column">
                        <div className="total-row">
                            <span>Sub Total:</span>
                            <span>₹{totals.subTotal.toFixed(2)}</span>
                        </div>
                        <div className="total-row">
                            <span>GST Total:</span>
                            <span>₹{totals.gstTotal.toFixed(2)}</span>
                        </div>
                        <div className="total-row">
                            <span>Total:</span>
                            <span>₹{totals.totalBeforeRoundOff.toFixed(2)}</span>
                        </div>
                        <div className="total-row grand-total">
                            <span>GRAND TOTAL:</span>
                            <span>₹{totals.grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button
                        className={`retro-btn ${form.id ? '' : 'primary'}`}
                        onClick={submit}
                        disabled={!form.invoiceNo || !form.distributorName || form.items.length === 0}
                    >
                        {form.id ? <>UPDATE PURCHASE <sub>(Ctrl+U)</sub></> : <>CREATE PURCHASE <sub>(Ctrl+S)</sub></>}
                    </button>

                    <button className="retro-btn" onClick={clearForm}>
                        CLEAR / NEW <sub>(Ctrl+N)</sub>
                    </button>
                </div>
            </div>

            {/* Summary Section */}
            <div className="summary-box">
                <div className="summary-item">
                    <span className="summary-label">Today's Purchases</span>
                    <span className="summary-value">{summary.totalPurchases}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Today's Amount</span>
                    <span className="summary-value">₹{summary.totalAmount.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Total Outstanding</span>
                    <span className="summary-value">₹{totalOutstanding.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Total Purchases</span>
                    <span className="summary-value">{totalPurchases}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Purchase Value</span>
                    <span className="summary-value">₹{totalPurchaseAmount.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Total Paid</span>
                    <span className="summary-value">₹{totalPaid.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Total Balance</span>
                    <span className="summary-value">₹{totalBalance.toLocaleString()}</span>
                </div>
            </div>

            {/* Purchase List Section */}
            <div className="search-section">
                <div className="search-box">
                    <label>Search Purchases:</label>
                    <input
                        className="retro-input"
                        style={{ flex: 1 }}
                        placeholder="Search by invoice number, distributor, product, or ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="purchase-grid-container">
                    <table className="purchase-grid">
                        <thead>
                            <tr>
                                <th className="id-cell">ID</th>
                                <th>Invoice No</th>
                                <th>Date</th>
                                <th>Distributor</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Paid</th>
                                <th>Balance</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPurchases.length > 0 ? (
                                filteredPurchases.map(p => (
                                    <tr
                                        key={p.id}
                                        onClick={() => selectPurchase(p)}
                                        className={selectedId === p.id ? "selected" : ""}
                                    >
                                        <td className="id-cell">{p.id}</td>
                                        <td>
                                            <strong>{p.invoiceNo}</strong>
                                            <div className="hint">
                                                {new Date(p.invoiceDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td>{new Date(p.date).toLocaleDateString()}</td>
                                        <td>
                                            <div className="distributor-info">
                                                <div className="distributor-name">{p.distributorName}</div>
                                                <div className="hint">ID: {p.distributorId}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="items-count">
                                                {p.items.length}
                                                <div className="hint">Click to view details</div>
                                            </div>
                                        </td>
                                        <td className="amount-cell">
                                            <strong>₹{(p.totalAmount || 0).toFixed(2)}</strong>
                                        </td>
                                        <td className="amount-cell">
                                            <span className="paid-amount">₹{(p.paidAmount || 0).toFixed(2)}</span>
                                        </td>
                                        <td className="amount-cell">
                                            <span style={{
                                                color: (p.balanceAmount || 0) > 0 ? 'red' : 'green',
                                                fontWeight: 'bold'
                                            }}>
                                                ₹{(p.balanceAmount || 0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${p.status.toLowerCase()}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons-small">
                                                {(p.balanceAmount || 0) > 0 && p.status !== 'Cancelled' && (
                                                    <button
                                                        className="retro-btn small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedId(p.id);
                                                            setSelectedPurchase(p);
                                                            setShowPaymentForm(true);
                                                            setPaymentAmount((p.balanceAmount || 0).toString());
                                                            resetPaymentForm();
                                                        }}
                                                    >
                                                        Pay
                                                    </button>
                                                )}
                                                {p.status !== 'Cancelled' && p.status !== 'Paid' && (
                                                    <button
                                                        className="retro-btn small danger"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm('Are you sure you want to cancel this purchase?')) {
                                                                try {
                                                                    await cancelPurchase(p.id);
                                                                    invalidate(PURCHASES_KEY);
                                                                    toast.success("Purchase cancelled successfully!");
                                                                    loadData();
                                                                    loadSummary();
                                                                } catch {
                                                                    toast.error("Failed to cancel purchase");
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={10} className="no-data">
                                        No purchases found. {search && "Try a different search term."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Status Bar */}
            <div className="purchase-status-bar">
                <span className="status-item">
                    <strong>Status:</strong> {selectedId ? "Viewing Purchase" : "Creating New Purchase"}
                </span>
                <span className="status-item">
                    <strong>Selected:</strong> {selectedId ? `Invoice #${selectedPurchase?.invoiceNo || selectedId}` : "None"}
                </span>
                <span className="status-item">
                    <strong>Items:</strong> {form.items.length} added
                </span>
                <span className="status-item">
                    <strong>Distributors:</strong> {distributors.length}
                </span>
                <span className="status-item">
                    <strong>Products:</strong> {products.length}
                </span>
                <span className="status-item">
                    <strong>Last Updated:</strong> {new Date().toLocaleTimeString()}
                </span>
            </div>

            {/* Payment Modal */}
            {showPaymentForm && selectedPurchase && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Add Payment - Invoice #{selectedPurchase.invoiceNo}</h3>
                        <div className="form-grid">
                            {/* Invoice Info */}
                            <div className="form-group">
                                <label>Invoice Total</label>
                                <input
                                    className="retro-input"
                                    value={`₹${(selectedPurchase.totalAmount || 0).toFixed(2)}`}
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label>Already Paid</label>
                                <input
                                    className="retro-input"
                                    value={`₹${(selectedPurchase.paidAmount || 0).toFixed(2)}`}
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label>Balance Due</label>
                                <input
                                    className="retro-input"
                                    value={`₹${(selectedPurchase.balanceAmount || 0).toFixed(2)}`}
                                    readOnly
                                />
                            </div>

                            {/* Payment Mode */}
                            <div className="form-group">
                                <label>Payment Mode *</label>
                                <select
                                    className="retro-select"
                                    value={paymentMode}
                                    onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="DD">DD</option>
                                    <option value="Credit">Credit</option>
                                </select>
                            </div>

                            {/* Payment Amount */}
                            <div className="form-group">
                                <label>Payment Amount *</label>
                                <input
                                    className="retro-input"
                                    type="number"
                                    step="0.01"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    max={selectedPurchase.balanceAmount}
                                />
                            </div>

                            {/* Payment Date */}
                            <div className="form-group">
                                <label>Payment Date *</label>
                                <input
                                    className="retro-input"
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                />
                            </div>

                            {/* Cheque/DD Details (Conditional) */}
                            {(paymentMode === "Cheque" || paymentMode === "DD") && (
                                <>
                                    <div className="form-group">
                                        <label>{paymentMode === "Cheque" ? "Cheque No" : "DD No"} *</label>
                                        <input
                                            className="retro-input"
                                            value={chequeNo}
                                            onChange={(e) => setChequeNo(e.target.value)}
                                            placeholder={`Enter ${paymentMode === "Cheque" ? "cheque" : "DD"} number`}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{paymentMode === "Cheque" ? "Cheque Date" : "DD Date"}</label>
                                        <input
                                            className="retro-input"
                                            type="date"
                                            value={chequeDate}
                                            onChange={(e) => setChequeDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Bank Name</label>
                                        <input
                                            className="retro-input"
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            placeholder="Enter bank name"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Remarks */}
                            <div className="form-group" style={{ gridColumn: "span 2" }}>
                                <label>Remarks</label>
                                <textarea
                                    className="retro-input"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Enter any remarks or notes"
                                    rows={3}
                                    style={{ resize: "vertical" }}
                                />
                            </div>
                        </div>
                        <div className="modal-buttons">
                            <button
                                className="retro-btn primary"
                                onClick={async () => {
                                    try {
                                        const amount = parseFloat(paymentAmount);
                                        if (amount <= 0 || amount > (selectedPurchase.balanceAmount || 0)) {
                                            toast.warning("Please enter a valid payment amount");
                                            return;
                                        }

                                        if ((paymentMode === "Cheque" || paymentMode === "DD") && !chequeNo.trim()) {
                                            toast.warning(`${paymentMode === "Cheque" ? "Cheque" : "DD"} number is required`);
                                            return;
                                        }

                                        if (!paymentDate) {
                                            toast.warning("Payment date is required");
                                            return;
                                        }

                                        const paymentData: CreatePurchasePaymentRequest = {
                                            mode: paymentMode,
                                            paymentDate: new Date(paymentDate).toISOString(),
                                            amount: amount,
                                            distributorId: selectedPurchase.distributorId,
                                            remarks: remarks || undefined,
                                            chequeNo: (paymentMode === "Cheque" || paymentMode === "DD") ? chequeNo : undefined,
                                            chequeDate: ((paymentMode === "Cheque" || paymentMode === "DD") && chequeDate) ? new Date(chequeDate).toISOString() : undefined,
                                            bankName: (paymentMode === "Cheque" || paymentMode === "DD") ? bankName || undefined : undefined
                                        };

                                        await addPurchasePayment(selectedPurchase.id, paymentData);
                                        invalidate(PURCHASES_KEY);
                                        await loadData();
                                        await loadSummary();
                                        setShowPaymentForm(false);
                                        resetPaymentForm();
                                        toast.success("Payment added successfully!");
                                    } catch (error: unknown) {
                                        toast.error(error instanceof Error ? error.message : "Failed to add payment");
                                    }
                                }}
                                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || !paymentDate}
                            >
                                CONFIRM PAYMENT
                            </button>
                            <button
                                className="retro-btn"
                                onClick={() => {
                                    setShowPaymentForm(false);
                                    resetPaymentForm();
                                }}
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}