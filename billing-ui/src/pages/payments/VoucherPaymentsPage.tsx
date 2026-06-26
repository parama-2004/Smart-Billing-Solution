import { useMemo, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useDistributors } from "../../hooks/useMasterQueries";
import DistributorSearchModal from "../../components/DistributorSearchModal";
import { downloadCsv, downloadPdf } from "../../utils/reportExport";
import "../../Styles/ChequeIssued.css";

const today = new Date().toISOString().slice(0, 10);

interface VoucherPayment {
    id: string;
    vendorName: string;
    billDate: string;
    billNo: string;
    amount: number;
    paymentType: "cash" | "credit";
    reminder: string;
    createdAt: string;
}

export default function VoucherPaymentsPage() {
    usePageTitle("Voucher Payments");

    const { data: distributors = [] } = useDistributors();
    const [rows, setRows] = useState<VoucherPayment[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form inputs
    const [vendorSearch, setVendorSearch] = useState("");
    const [selectedVendor, setSelectedVendor] = useState("");
    const [showDistributorSearch, setShowDistributorSearch] = useState(false);
    const [billDate, setBillDate] = useState(today);
    const [billNo, setBillNo] = useState("");
    const [amount, setAmount] = useState<number>(0);
    const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash");
    const [reminder, setReminder] = useState("");

    // Filters
    const [filterType, setFilterType] = useState<"all" | "today" | "weekly" | "monthly" | "custom">("all");
    const [filterFromDate, setFilterFromDate] = useState(today);
    const [filterToDate, setFilterToDate] = useState(today);
    const [searchVendor, setSearchVendor] = useState("");
    const [searchBillNo, setSearchBillNo] = useState("");
    const [filterPaymentType, setFilterPaymentType] = useState<"all" | "cash" | "credit">("all");

    // Load from LocalStorage
    useEffect(() => {
        const stored = localStorage.getItem("voucher_payments");
        if (stored) {
            try {
                setRows(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse voucher payments", e);
            }
        }
    }, []);

    // Save to LocalStorage
    const saveRowsToStorage = (newRows: VoucherPayment[]) => {
        setRows(newRows);
        localStorage.setItem("voucher_payments", JSON.stringify(newRows));
    };

    const filteredDistributors = useMemo(() => {
        const q = vendorSearch.trim().toLowerCase();
        if (!q) return [];
        return distributors.filter(x => x.name.toLowerCase().includes(q)).slice(0, 8);
    }, [distributors, vendorSearch]);

    // Handle filters
    const filteredRows = useMemo(() => {
        return rows.filter(r => {
            // Date Filter
            let matchDate = true;
            const rowDate = r.billDate;
            if (filterType === "today") {
                matchDate = rowDate === today;
            } else if (filterType === "weekly") {
                const d = new Date();
                const first = d.getDate() - d.getDay();
                const firstDay = new Date(new Date().setDate(first)).toISOString().slice(0, 10);
                const lastDay = new Date(new Date().setDate(first + 6)).toISOString().slice(0, 10);
                matchDate = rowDate >= firstDay && rowDate <= lastDay;
            } else if (filterType === "monthly") {
                const d = new Date();
                const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
                const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
                matchDate = rowDate >= firstDay && rowDate <= lastDay;
            } else if (filterType === "custom") {
                if (filterFromDate && rowDate < filterFromDate) matchDate = false;
                if (filterToDate && rowDate > filterToDate) matchDate = false;
            }

            // Vendor Search
            let matchVendor = true;
            if (searchVendor.trim()) {
                matchVendor = r.vendorName.toLowerCase().includes(searchVendor.trim().toLowerCase());
            }

            // Bill No Search
            let matchBillNo = true;
            if (searchBillNo.trim()) {
                matchBillNo = r.billNo.toLowerCase().includes(searchBillNo.trim().toLowerCase());
            }

            // Payment Type Filter
            let matchPayment = true;
            if (filterPaymentType !== "all" && r.paymentType !== filterPaymentType) {
                matchPayment = false;
            }

            return matchDate && matchVendor && matchBillNo && matchPayment;
        });
    }, [rows, filterType, filterFromDate, filterToDate, searchVendor, searchBillNo, filterPaymentType]);

    const totalAmount = useMemo(() => {
        return filteredRows.reduce((sum, r) => sum + r.amount, 0);
    }, [filteredRows]);

    const resetForm = () => {
        setEditingId(null);
        setVendorSearch("");
        setSelectedVendor("");
        setBillDate(today);
        setBillNo("");
        setAmount(0);
        setPaymentType("cash");
        setReminder("");
    };

    const onEdit = (row: VoucherPayment) => {
        setEditingId(row.id);
        setSelectedVendor(row.vendorName);
        setVendorSearch(row.vendorName);
        setBillDate(row.billDate);
        setBillNo(row.billNo === "-" ? "" : row.billNo);
        setAmount(row.amount);
        setPaymentType(row.paymentType);
        setReminder(row.reminder);
    };

    const onDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this voucher payment?")) {
            const updated = rows.filter(r => r.id !== id);
            saveRowsToStorage(updated);
            toast.success("Voucher payment deleted");
            if (editingId === id) resetForm();
        }
    };

    const onSave = () => {
        if (!selectedVendor) {
            toast.error("Vendor is required");
            return;
        }

        if (amount <= 0) {
            toast.error("Amount must be greater than zero");
            return;
        }

        const bNo = billNo.trim() || "-";

        const payload: VoucherPayment = {
            id: editingId || Math.random().toString(36).substring(2, 9),
            vendorName: selectedVendor,
            billDate,
            billNo: bNo,
            amount,
            paymentType,
            reminder: reminder.trim(),
            createdAt: editingId ? (rows.find(r => r.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
        };

        let updatedRows: VoucherPayment[];
        if (editingId) {
            updatedRows = rows.map(r => r.id === editingId ? payload : r);
            toast.success("Voucher payment entry updated");
        } else {
            updatedRows = [payload, ...rows];
            toast.success("Voucher payment entry saved");
        }

        saveRowsToStorage(updatedRows);
        resetForm();
    };

    const downloadReportCsv = () => {
        downloadCsv(
            "voucher-payments-report",
            ["S.No", "Vendor", "Bill Date", "Bill No", "Amount", "Payment Type", "Reminder"],
            filteredRows.map((x, index) => [
                index + 1,
                x.vendorName,
                x.billDate,
                x.billNo,
                x.amount,
                x.paymentType.toUpperCase(),
                x.reminder
            ])
        );
    };

    const downloadReportPdf = () => {
        downloadPdf(
            "voucher-payments-report",
            "Voucher Payments Report",
            ["S.No", "Vendor", "Bill Date", "Bill No", "Amount", "Type", "Reminder"],
            filteredRows.map((x, index) => [
                (index + 1).toString(),
                x.vendorName,
                x.billDate,
                x.billNo,
                x.amount.toFixed(2),
                x.paymentType.toUpperCase(),
                x.reminder
            ]),
            [`Total Records: ${filteredRows.length}`, `Total Amount: ₹${totalAmount.toFixed(2)}`]
        );
    };

    return (
        <div className="cheque-master-container">
            <style>
                {`
                    .voucher-form-section::before {
                        content: "VOUCHER ENTRY" !important;
                        background: #000080 !important;
                    }
                    .voucher-grid-section::before {
                        content: "VOUCHER LIST" !important;
                        background: #008000 !important;
                    }
                    .cheque-form-grid {
                        grid-template-columns: repeat(4, 1fr);
                    }
                    @media (max-width: 1024px) {
                        .cheque-form-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }
                    }
                    @media (max-width: 600px) {
                        .cheque-form-grid {
                            grid-template-columns: 1fr;
                        }
                    }
                `}
            </style>
            <div className="cheque-header-bar">
                <span>Voucher Payments Register</span>
                <span>{new Date().toLocaleDateString("en-IN")}</span>
            </div>

            <div className="cheque-form-section voucher-form-section">
                <div className="cheque-form-grid">
                    <div className="cheque-form-group" style={{ gridColumn: "span 2" }}>
                        <label>Vendor name/code</label>
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
                        {filteredDistributors.length > 0 && !selectedVendor && (
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
                            </div>
                        )}
                    </div>

                    <div className="cheque-form-group">
                        <label>Bill Date</label>
                        <input className="cheque-input" type="date" value={billDate} onChange={e => setBillDate(e.target.value)} />
                    </div>

                    <div className="cheque-form-group">
                        <label>Bill No</label>
                        <input className="cheque-input" value={billNo} onChange={e => setBillNo(e.target.value)} placeholder="Leave blank for '-'" />
                    </div>

                    <div className="cheque-form-group">
                        <label>Amount</label>
                        <input className="cheque-input" type="number" value={amount || ""} onChange={e => setAmount(Number(e.target.value) || 0)} placeholder="0.00" />
                    </div>

                    <div className="cheque-form-group">
                        <label>Payment Type</label>
                        <select className="cheque-input" value={paymentType} onChange={e => setPaymentType(e.target.value as any)}>
                            <option value="cash">Cash</option>
                            <option value="credit">Credit</option>
                        </select>
                    </div>

                    <div className="cheque-form-group" style={{ gridColumn: "span 4" }}>
                        <label>Reminder (Notes & remaining amount)</label>
                        <input 
                            className="cheque-input" 
                            value={reminder} 
                            onChange={e => setReminder(e.target.value)} 
                            placeholder="Enter notes and details here..."
                        />
                    </div>
                </div>

                <div className="cheque-actions">
                    <button className="cheque-btn primary" type="button" onClick={onSave}>
                        {editingId ? "Update Entry" : "Save Entry"}
                    </button>
                    <button className="cheque-btn" type="button" onClick={resetForm}>
                        Clear Form
                    </button>
                </div>
            </div>

            <div className="cheque-grid-section voucher-grid-section">
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "15px", alignItems: "center", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <label style={{ fontWeight: 600, fontSize: "12px" }}>Date:</label>
                        <select className="cheque-input" style={{ width: "auto", padding: "4px 8px", fontSize: "12px" }} value={filterType} onChange={e => setFilterType(e.target.value as any)}>
                            <option value="all">All Dates</option>
                            <option value="today">Today</option>
                            <option value="weekly">This Week</option>
                            <option value="monthly">This Month</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                    {filterType === "custom" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <input type="date" className="cheque-input" style={{ width: "auto", padding: "4px 8px", fontSize: "12px" }} value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} />
                            <span style={{ fontWeight: "bold" }}>to</span>
                            <input type="date" className="cheque-input" style={{ width: "auto", padding: "4px 8px", fontSize: "12px" }} value={filterToDate} onChange={e => setFilterToDate(e.target.value)} />
                        </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <label style={{ fontWeight: 600, fontSize: "12px" }}>Vendor:</label>
                        <input 
                            className="cheque-input" 
                            style={{ width: "130px", padding: "4px 8px", fontSize: "12px" }} 
                            placeholder="Search Vendor..." 
                            value={searchVendor}
                            onChange={e => setSearchVendor(e.target.value)}
                        />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <label style={{ fontWeight: 600, fontSize: "12px" }}>Bill No:</label>
                        <input 
                            className="cheque-input" 
                            style={{ width: "100px", padding: "4px 8px", fontSize: "12px" }} 
                            placeholder="Search Bill..." 
                            value={searchBillNo}
                            onChange={e => setSearchBillNo(e.target.value)}
                        />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <label style={{ fontWeight: 600, fontSize: "12px" }}>Type:</label>
                        <select 
                            className="cheque-input" 
                            style={{ width: "auto", padding: "4px 8px", fontSize: "12px" }} 
                            value={filterPaymentType} 
                            onChange={e => setFilterPaymentType(e.target.value as any)}
                        >
                            <option value="all">All</option>
                            <option value="cash">Cash</option>
                            <option value="credit">Credit</option>
                        </select>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
                        <span style={{ fontWeight: "bold", fontSize: "13px" }}>Total: ₹{totalAmount.toFixed(2)}</span>
                        <button className="cheque-grid-btn" style={{ padding: "4px 8px" }} onClick={downloadReportPdf} disabled={filteredRows.length === 0}>PDF</button>
                        <button className="cheque-grid-btn" style={{ padding: "4px 8px" }} onClick={downloadReportCsv} disabled={filteredRows.length === 0}>CSV</button>
                    </div>
                </div>

                <div className="cheque-grid-wrap">
                    <table className="cheque-grid">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Vendor Name/Code</th>
                                <th>Bill Date</th>
                                <th>Bill No</th>
                                <th>Amount</th>
                                <th>Payment Type</th>
                                <th>Reminder (Notes & Remaining)</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="cheque-empty">No voucher entries found matching the filters.</td>
                                </tr>
                            ) : (
                                filteredRows.map((row, index) => (
                                    <tr key={row.id}>
                                        <td>{index + 1}</td>
                                        <td>{row.vendorName}</td>
                                        <td>{new Date(row.billDate).toLocaleDateString("en-IN")}</td>
                                        <td>{row.billNo}</td>
                                        <td>{row.amount.toFixed(2)}</td>
                                        <td>{row.paymentType.toUpperCase()}</td>
                                        <td style={{ textAlign: "left", whiteSpace: "normal", wordBreak: "break-word" }}>{row.reminder || "-"}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                                <button className="cheque-grid-btn" type="button" onClick={() => onEdit(row)}>
                                                    Edit
                                                </button>
                                                <button className="cheque-grid-btn" style={{ color: "#ff4444" }} type="button" onClick={() => onDelete(row.id)}>
                                                    Delete
                                                </button>
                                            </div>
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
