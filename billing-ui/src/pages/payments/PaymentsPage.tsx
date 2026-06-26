import { useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import {
    addPurchasePayment,
    getPurchaseById,
} from "../../api/purchaseApi";
import { usePurchases, useInvalidateQuery, PURCHASES_KEY, useBanks } from "../../hooks/useMasterQueries";
import type {
    CreatePurchasePaymentRequest,
    PaymentMode,
    PurchasePaymentResponse,
    PurchaseResponse,
} from "../../models/Purchase";
import "../../Styles/GlobalLayout.css";
import "../../Styles/PaymentsPage.css";
import { getCurrentDateTime } from "../../utils/dateUtils";

export default function PaymentsPage() {
    usePageTitle("Purchase Payments");

    const { data: purchases = [], isLoading: loading } = usePurchases();
    const { data: banks = [] } = useBanks();
    const invalidate = useInvalidateQuery();
    const [search, setSearch] = useState("");
    const [selectedPurchase, setSelectedPurchase] = useState<PurchaseResponse | null>(null);
    const [payments, setPayments] = useState<PurchasePaymentResponse[]>([]);

    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState<PaymentMode>("Cash");
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
    const [chequeNo, setChequeNo] = useState("");
    const [chequeDate, setChequeDate] = useState(new Date().toISOString().split("T")[0]);
    const [bankName, setBankName] = useState("");
    const [remarks, setRemarks] = useState("");
    const [filter, setFilter] = useState<"pending" | "all">("all");



    const resetPaymentInputs = () => {
        setPayMethod("Cash");
        setPaymentDate(new Date().toISOString().split("T")[0]);
        setChequeNo("");
        setChequeDate(new Date().toISOString().split("T")[0]);
        setBankName("");
        setRemarks("");
    };

    const selectPurchase = async (purchase: PurchaseResponse) => {
        try {
            const latest = await getPurchaseById(purchase.id);
            const selected = latest ?? purchase;

            setSelectedPurchase(selected);
            setPayments(selected.payments ?? []);
            setPayAmount(selected.balanceAmount > 0 ? selected.balanceAmount.toFixed(2) : "");
            resetPaymentInputs();
        } catch {
            setSelectedPurchase(purchase);
            setPayments(purchase.payments ?? []);
            setPayAmount(purchase.balanceAmount > 0 ? purchase.balanceAmount.toFixed(2) : "");
            resetPaymentInputs();
        }
    };

    const handlePay = async () => {
        if (!selectedPurchase) return;

        const amount = parseFloat(payAmount);
        if (!amount || amount <= 0) {
            toast.warning("Enter a valid payment amount");
            return;
        }
        if (amount > selectedPurchase.balanceAmount) {
            toast.warning("Amount exceeds outstanding balance");
            return;
        }
        if ((payMethod === "Cheque" || payMethod === "DD") && !chequeNo.trim()) {
            toast.warning(`${payMethod} number is required`);
            return;
        }

        try {
            const payload: CreatePurchasePaymentRequest = {
                mode: payMethod,
                paymentDate: new Date(paymentDate).toISOString(),
                amount,
                distributorId: selectedPurchase.distributorId,
                remarks: remarks.trim() || undefined,
                chequeNo: payMethod === "Cheque" || payMethod === "DD" ? chequeNo.trim() : undefined,
                chequeDate:
                    (payMethod === "Cheque" || payMethod === "DD") && chequeDate
                        ? new Date(chequeDate).toISOString()
                        : undefined,
                bankName: payMethod === "Cheque" || payMethod === "DD" ? bankName.trim() || undefined : undefined,
            };

            await addPurchasePayment(selectedPurchase.id, payload);
            toast.success(`₹${amount.toFixed(2)} payment recorded!`);

            invalidate(PURCHASES_KEY);

            const updated = await getPurchaseById(selectedPurchase.id);
            if (updated) {
                setSelectedPurchase(updated);
                setPayments(updated.payments ?? []);
                setPayAmount(updated.balanceAmount > 0 ? updated.balanceAmount.toFixed(2) : "");
            } else {
                setSelectedPurchase(null);
                setPayments([]);
                setPayAmount("");
            }

            resetPaymentInputs();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Payment failed";
            toast.error(message);
        }
    };

    const filtered = purchases.filter((purchase) => {
        const q = search.toLowerCase().trim();
        const matchesSearch =
            !q ||
            purchase.invoiceNo.toLowerCase().includes(q) ||
            purchase.distributorName.toLowerCase().includes(q) ||
            purchase.id.toString().includes(q);

        const matchesFilter =
            filter === "all" ||
            (purchase.status !== "Paid" && purchase.status !== "Cancelled" && purchase.balanceAmount > 0);

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="retro-master-container purchase-payments-container">
            <div className="retro-content-wrapper">
                <div className="retro-header-bar">
                    <span>Purchase Payments - Smart Super Market</span>
                    <span>{getCurrentDateTime()}</span>
                </div>

                <div className="retro-main-content purchase-payments-content">
                    <h2 className="page-title">Purchase Payments</h2>

                    <div className="master-layout">
                <div className="master-form-panel">
                    <form onSubmit={(e) => { e.preventDefault(); handlePay(); }} className="retro-form">
                        <div className="form-group">
                            <label>Selected Purchase Order</label>
                            <input
                                type="text"
                                className="retro-input readonly"
                                value={
                                    selectedPurchase
                                        ? `PO-${selectedPurchase.id} • ${selectedPurchase.invoiceNo} • ${selectedPurchase.distributorName}`
                                        : "Click a purchase order →"
                                }
                                readOnly
                            />
                        </div>

                        {selectedPurchase && (
                            <>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                    <div className="form-group">
                                        <label>Total</label>
                                        <input className="retro-input readonly" value={`₹${selectedPurchase.totalAmount.toFixed(2)}`} readOnly />
                                    </div>
                                    <div className="form-group">
                                        <label>Paid</label>
                                        <input className="retro-input readonly" value={`₹${selectedPurchase.paidAmount.toFixed(2)}`} readOnly />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Outstanding Balance</label>
                                    <input
                                        className="retro-input readonly"
                                        value={`₹${selectedPurchase.balanceAmount.toFixed(2)}`}
                                        readOnly
                                        style={{ color: selectedPurchase.balanceAmount > 0 ? "#dc2626" : "#16a34a", fontWeight: 700 }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Payment Amount</label>
                                    <input
                                        type="number"
                                        className="retro-input"
                                        value={payAmount}
                                        onChange={(e) => setPayAmount(e.target.value)}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        disabled={selectedPurchase.balanceAmount <= 0}
                                    />
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                    <div className="form-group">
                                        <label>Payment Method</label>
                                        <select className="retro-input" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMode)}>
                                            <option value="Cash">Cash</option>
                                            <option value="Cheque">Cheque</option>
                                            <option value="DD">DD</option>
                                            <option value="Credit">Credit</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Payment Date</label>
                                        <input type="date" className="retro-input" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                                    </div>
                                </div>

                                {(payMethod === "Cheque" || payMethod === "DD") && (
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                        <div className="form-group">
                                            <label>{payMethod} No</label>
                                            <input className="retro-input" value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} placeholder={`Enter ${payMethod} number`} />
                                        </div>
                                        <div className="form-group">
                                            <label>{payMethod} Date</label>
                                            <input type="date" className="retro-input" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
                                        </div>
                                        <div className="form-group" style={{ gridColumn: "span 2" }}>
                                            <label>Bank Name</label>
                                            <select className="retro-input" value={bankName} onChange={(e) => setBankName(e.target.value)}>
                                                <option value="">Select a bank</option>
                                                {banks.map(b => (
                                                    <option key={b.id} value={b.name}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Remarks</label>
                                    <textarea
                                        className="retro-input"
                                        rows={2}
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="Add remarks for this payment"
                                        style={{ resize: "vertical" }}
                                    />
                                </div>

                                <div className="form-actions">
                                    <button type="submit" className="retro-btn primary" disabled={selectedPurchase.balanceAmount <= 0}>
                                        MARK PAYMENT
                                    </button>
                                    <button
                                        type="button"
                                        className="retro-btn"
                                        onClick={() => setPayAmount(selectedPurchase.balanceAmount.toFixed(2))}
                                        disabled={selectedPurchase.balanceAmount <= 0}
                                    >
                                        FULL PAY
                                    </button>
                                </div>

                                {payments.length > 0 && (
                                    <div style={{ marginTop: "1.5rem" }}>
                                        <label style={{ fontWeight: 600, fontSize: "0.875rem", color: "#64748b", marginBottom: "0.5rem", display: "block" }}>
                                            Payment History
                                        </label>
                                        <div className="table-container" style={{ maxHeight: 220 }}>
                                            <table className="retro-table">
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Amount</th>
                                                        <th>Mode</th>
                                                        <th>Status</th>
                                                        <th>Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {payments.map((p) => (
                                                        <tr key={p.id}>
                                                            <td>{new Date(p.paymentDate).toLocaleDateString("en-IN")}</td>
                                                            <td>₹{p.amount.toFixed(2)}</td>
                                                            <td>{p.mode}</td>
                                                            <td>{p.status}</td>
                                                            <td>{p.remarks || "-"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </form>
                </div>

                <div className="master-list-panel">
                    <div className="search-bar" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <input
                            type="text"
                            placeholder="🔍 Search by PO id, invoice # or distributor..."
                            className="retro-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <select
                            className="retro-input"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as "all" | "pending")}
                            style={{ width: 150 }}
                                >
                            <option value="all">All Orders</option>
                            <option value="pending">Pending Only</option>
                           
                        </select>
                    </div>

                    <div className="table-container">
                        <table className="retro-table">
                            <thead>
                                <tr>
                                    <th>PO ID</th>
                                    <th>Invoice #</th>
                                    <th>Distributor</th>
                                    <th>Total</th>
                                    <th>Paid</th>
                                    <th>Balance</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>Loading...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>No purchase orders found</td></tr>
                                ) : (
                                    filtered.map((p) => (
                                        <tr
                                            key={p.id}
                                            className={selectedPurchase?.id === p.id ? "selected-row" : ""}
                                            onClick={() => selectPurchase(p)}
                                        >
                                            <td><strong>PO-{p.id}</strong></td>
                                            <td>{p.invoiceNo}</td>
                                            <td>{p.distributorName}</td>
                                            <td>₹{p.totalAmount.toFixed(2)}</td>
                                            <td>₹{p.paidAmount.toFixed(2)}</td>
                                            <td style={{ color: p.balanceAmount > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
                                                ₹{p.balanceAmount.toFixed(2)}
                                            </td>
                                            <td>
                                                <span className={p.status === "Paid" ? "badge-success" : "badge-warning"}>{p.status}</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
                </div>
            </div>
        </div>
    );
}
