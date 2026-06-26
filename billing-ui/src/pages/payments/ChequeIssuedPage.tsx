import { useMemo, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { createChequeIssued, updateChequeIssued } from "../../api/chequeIssuedApi";
import { useChequeIssued, useDistributors, useInvalidateQuery, CHEQUES_KEY, useBanks } from "../../hooks/useMasterQueries";
import type { ChequeIssuedResponse, PaymentMethod } from "../../models/ChequeIssued";
import DistributorSearchModal from "../../components/DistributorSearchModal";
import "../../Styles/ChequeIssued.css";

const today = new Date().toISOString().slice(0, 10);

export default function ChequeIssuedPage() {
    usePageTitle("Cheque Issued");

    const { data: distributors = [] } = useDistributors();
    const { data: rows = [] as ChequeIssuedResponse[] } = useChequeIssued();
    const { data: banks = [] } = useBanks();
    const invalidate = useInvalidateQuery();
    const [editingId, setEditingId] = useState<number | null>(null);

    const [vendorSearch, setVendorSearch] = useState("");
    const [selectedVendor, setSelectedVendor] = useState<string>("");
    const [showDistributorSearch, setShowDistributorSearch] = useState(false);
    const [billDate, setBillDate] = useState(today);
    const [billNo, setBillNo] = useState("");
    const [amount, setAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cheque");
    const [chequeNumber, setChequeNumber] = useState("");
    const [chequeDate, setChequeDate] = useState(today);
    const [bankName, setBankName] = useState("");
    const [stockReturn, setStockReturn] = useState(false);
    const [remarks, setRemarks] = useState("");
    const [saving, setSaving] = useState(false);

    // Filters
    const [filterType, setFilterType] = useState<"today" | "weekly" | "monthly" | "custom">("today");
    const [filterFromDate, setFilterFromDate] = useState(today);
    const [filterToDate, setFilterToDate] = useState(today);
    const [filterBank, setFilterBank] = useState("");

    useEffect(() => {
        const d = new Date();
        if (filterType === "today") {
            setFilterFromDate(today);
            setFilterToDate(today);
        } else if (filterType === "weekly") {
            const first = d.getDate() - d.getDay();
            const firstDay = new Date(new Date().setDate(first)).toISOString().slice(0, 10);
            const lastDay = new Date(new Date().setDate(first + 6)).toISOString().slice(0, 10);
            setFilterFromDate(firstDay);
            setFilterToDate(lastDay);
        } else if (filterType === "monthly") {
            const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
            const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
            setFilterFromDate(firstDay);
            setFilterToDate(lastDay);
        }
    }, [filterType]);

    const filteredRows = useMemo(() => {
        return rows.filter(r => {
            let matchDate = true;
            if (r.chequeDate) {
                const cDate = r.chequeDate.slice(0, 10);
                if (filterFromDate && cDate < filterFromDate) matchDate = false;
                if (filterToDate && cDate > filterToDate) matchDate = false;
            } else {
                // If filtering by cheque date but it's not a cheque, we could exclude it or show it.
                // Assuming we want to exclude non-cheques if date filter is strictly applied, but 
                // if they don't have chequeDate, let's keep them if they match the date using billDate as fallback, or just exclude.
                // Since user said "use cheque date instead of bill date for filter", we will check chequeDate. 
                // If it's missing, it fails the filter if the user specifically wants cheque dates, but let's fallback to billDate for general view.
                const fallbackDate = r.billDate.slice(0, 10);
                if (filterFromDate && fallbackDate < filterFromDate) matchDate = false;
                if (filterToDate && fallbackDate > filterToDate) matchDate = false;
            }

            let matchBank = true;
            if (filterBank && r.bankName !== filterBank) {
                matchBank = false;
            }
            
            return matchDate && matchBank;
        });
    }, [rows, filterFromDate, filterToDate, filterBank]);

    const filteredDistributors = useMemo(() => {
        const q = vendorSearch.trim().toLowerCase();
        if (!q) return [];
        return distributors.filter(x => x.name.toLowerCase().includes(q)).slice(0, 8);
    }, [distributors, vendorSearch]);

    const resetForm = () => {
        setEditingId(null);
        setVendorSearch("");
        setSelectedVendor("");
        setBillDate(today);
        setBillNo("");
        setAmount(0);
        setPaymentMethod("cheque");
        setChequeNumber("");
        setChequeDate(today);
        setBankName("");
        setStockReturn(false);
        setRemarks("");
    };

    const onEdit = (row: ChequeIssuedResponse) => {
        setEditingId(row.id);
        setSelectedVendor(row.vendorName);
        setVendorSearch(row.vendorName);
        setBillDate(row.billDate.slice(0, 10));
        setBillNo(row.billNo);
        setAmount(row.amount);
        setPaymentMethod(row.paymentMethod);
        setChequeNumber(row.chequeNumber ?? "");
        setChequeDate(row.chequeDate ? row.chequeDate.slice(0, 10) : today);
        setBankName(row.bankName ?? "");
        setStockReturn(row.stockReturn);
        setRemarks(row.remarks ?? "");
    };

    const onSave = async () => {
        if (!selectedVendor) {
            toast.error("Vendor is required");
            return;
        }

        if (!billNo.trim()) {
            toast.error("Bill number is required");
            return;
        }

        if (amount <= 0) {
            toast.error("Amount must be greater than zero");
            return;
        }

        if (paymentMethod === "cheque") {
            if (!chequeNumber.trim() || !chequeDate || !bankName.trim()) {
                toast.error("Cheque number, cheque date and bank are required for cheque payment");
                return;
            }
        }

        try {
            setSaving(true);

            const payload = {
                vendorName: selectedVendor,
                billDate,
                billNo: billNo.trim(),
                amount,
                paymentMethod,
                chequeNumber: paymentMethod === "cheque" ? chequeNumber.trim() : undefined,
                chequeDate: paymentMethod === "cheque" ? chequeDate : undefined,
                bankName: paymentMethod === "cheque" ? bankName.trim() : undefined,
                stockReturn,
                remarks: remarks.trim() || undefined
            };

            if (editingId) {
                await updateChequeIssued(editingId, payload);
                toast.success("Cheque issued entry updated");
            } else {
                await createChequeIssued(payload);
                toast.success("Cheque issued entry saved");
            }

            invalidate(CHEQUES_KEY);
            resetForm();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save cheque issued entry");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="cheque-master-container">
            <div className="cheque-header-bar">
                <span>Cheque Issued Register</span>
                <span>{new Date().toLocaleDateString("en-IN")}</span>
            </div>

            <div className="cheque-form-section">
                <div className="cheque-form-grid">
                    <div className="cheque-form-group full-width">
                        <label>Vendor</label>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input
                                className="cheque-input"
                                type="text"
                                value={vendorSearch}
                                placeholder="Search distributor..."
                                onChange={e => {
                                    setVendorSearch(e.target.value);
                                    setSelectedVendor("");
                                }}
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                className="cheque-btn primary"
                                onClick={() => setShowDistributorSearch(true)}
                                title="Search distributor"
                                style={{
                                    padding: "0 12px",
                                    fontSize: "14px",
                                    cursor: "pointer",
                                    minWidth: "auto",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "33px",
                                    margin: 0
                                }}
                            >
                                🔍
                            </button>
                        </div>
                        {vendorSearch.trim() && !selectedVendor && (
                            <div className="cheque-search-list">
                                {filteredDistributors.map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedVendor(item.name);
                                            setVendorSearch(item.name);
                                        }}
                                    >
                                        {item.name}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const trimmed = vendorSearch.trim();
                                        setSelectedVendor(trimmed);
                                        setVendorSearch(trimmed);
                                    }}
                                    style={{ fontStyle: "italic", backgroundColor: "#f1f5f9", fontWeight: "bold", borderTop: "1px solid #e2e8f0", color: "#0f172a", textAlign: "left", padding: "8px 12px" }}
                                >
                                    ➕ Use "{vendorSearch.trim()}" as Other Vendor
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="cheque-form-group">
                        <label>Bill Date</label>
                        <input className="cheque-input" type="date" value={billDate} onChange={e => setBillDate(e.target.value)} />
                    </div>

                    <div className="cheque-form-group">
                        <label>Bill No</label>
                        <input className="cheque-input" value={billNo} onChange={e => setBillNo(e.target.value)} />
                    </div>

                    <div className="cheque-form-group">
                        <label>Amount</label>
                        <input className="cheque-input" type="number" value={amount} onChange={e => setAmount(Number(e.target.value) || 0)} />
                    </div>

                    <div className="cheque-form-group">
                        <label>Payment Method</label>
                        <select className="cheque-input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                            <option value="cheque">Cheque</option>
                            <option value="cash">Cash</option>
                            <option value="credit">Credit</option>
                            <option value="dd">DD</option>
                        </select>
                    </div>

                    <div className="cheque-form-group">
                        <label>Stock Return</label>
                        <select className="cheque-input" value={stockReturn ? "1" : "0"} onChange={e => setStockReturn(e.target.value === "1")}>
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                    </div>

                    <div className="cheque-form-group">
                        <label>Remarks</label>
                        <input
                            className="cheque-input"
                            placeholder="e.g. Passed, Bounced..."
                            value={remarks}
                            onChange={e => setRemarks(e.target.value)}
                        />
                    </div>

                    {paymentMethod === "cheque" && (
                        <>
                            <div className="cheque-form-group">
                                <label>Cheque Number</label>
                                <input className="cheque-input" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} />
                            </div>
                            <div className="cheque-form-group">
                                <label>Cheque Date</label>
                                <input className="cheque-input" type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)} />
                            </div>
                            <div className="cheque-form-group">
                                <label>Bank</label>
                                <select className="cheque-input" value={bankName} onChange={e => setBankName(e.target.value)}>
                                    <option value="">Select a bank</option>
                                    {banks.map(b => (
                                        <option key={b.id} value={b.name}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                <div className="cheque-actions">
                    <button className="cheque-btn primary" type="button" onClick={onSave} disabled={saving}>
                        {saving ? "Processing..." : editingId ? "Update Entry" : "Save Entry"}
                    </button>
                    {editingId && (
                        <button className="cheque-btn" type="button" onClick={resetForm} disabled={saving}>
                            Cancel Edit
                        </button>
                    )}
                </div>
            </div>

            <div className="cheque-grid-section">
                <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "center", background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <label style={{ fontWeight: 600 }}>Filter by Date:</label>
                        <select className="cheque-input" style={{ width: "auto" }} value={filterType} onChange={e => setFilterType(e.target.value as any)}>
                            <option value="today">Today</option>
                            <option value="weekly">This Week</option>
                            <option value="monthly">This Month</option>
                            <option value="custom">Custom Date Range</option>
                        </select>
                    </div>
                    {filterType === "custom" && (
                        <>
                            <input type="date" className="cheque-input" style={{ width: "auto" }} value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} />
                            <span style={{ fontWeight: "bold" }}>to</span>
                            <input type="date" className="cheque-input" style={{ width: "auto" }} value={filterToDate} onChange={e => setFilterToDate(e.target.value)} />
                        </>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "20px" }}>
                        <label style={{ fontWeight: 600 }}>Filter by Bank:</label>
                        <select className="cheque-input" style={{ width: "auto" }} value={filterBank} onChange={e => setFilterBank(e.target.value)}>
                            <option value="">All Banks</option>
                            {banks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="cheque-grid-wrap">
                    <table className="cheque-grid">
                        <thead>
                            <tr>
                                <th>Vendor</th>
                                <th>Bill Date</th>
                                <th>Bill No</th>
                                <th>Amount</th>
                                <th>Method</th>
                                <th>Cheque No</th>
                                <th>Cheque Date</th>
                                <th>Bank</th>
                                <th>Stock Return</th>
                                <th>Remarks</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="cheque-empty">No cheque entries found.</td>
                                </tr>
                            ) : (
                                filteredRows.map(row => (
                                    <tr key={row.id}>
                                        <td>{row.vendorName}</td>
                                        <td>{new Date(row.billDate).toLocaleDateString("en-IN")}</td>
                                        <td>{row.billNo}</td>
                                        <td>{row.amount.toFixed(2)}</td>
                                        <td>{row.paymentMethod.toUpperCase()}</td>
                                        <td>{row.chequeNumber || "-"}</td>
                                        <td>{row.chequeDate ? new Date(row.chequeDate).toLocaleDateString("en-IN") : "-"}</td>
                                        <td>{row.bankName || "-"}</td>
                                        <td>{row.stockReturn ? "Yes" : "No"}</td>
                                        <td>{row.remarks || "-"}</td>
                                        <td>
                                            <button className="cheque-grid-btn" type="button" onClick={() => onEdit(row)}>
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {showDistributorSearch && (
                <DistributorSearchModal
                    distributors={distributors}
                    onSelect={(distributor) => {
                        setSelectedVendor(distributor.name);
                        setVendorSearch(distributor.name);
                        setShowDistributorSearch(false);
                    }}
                    onClose={() => setShowDistributorSearch(false)}
                />
            )}
        </div>
    );
}
