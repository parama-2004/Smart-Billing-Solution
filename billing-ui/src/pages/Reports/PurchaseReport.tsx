import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { api } from "../../api/axios";
import { downloadCsv, downloadPdf } from "../../utils/reportExport";
import "../../Styles/PurchaseReport.css";

type PurchaseRow = {
    id: number;
    date: string;
    distributorName: string;
    invoiceNo: string;
    invoiceDate: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
};

export default function PurchaseReport() {
    usePageTitle("Purchase Report");
    const [rows, setRows] = useState<PurchaseRow[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const res = await api.get<PurchaseRow[]>("/purchases");
            setRows(res.data);
        } catch { toast.error("Failed to load purchases"); }
        finally { setLoading(false); }
    };

    const filtered = rows.filter(r => {
        const q = search.toLowerCase().trim();
        const matchSearch = !q || r.distributorName.toLowerCase().includes(q) || r.invoiceNo.toLowerCase().includes(q);
        const matchFrom = !fromDate || new Date(r.date) >= new Date(fromDate);
        const matchTo = !toDate || new Date(r.date) <= new Date(toDate + "T23:59:59");
        return matchSearch && matchFrom && matchTo;
    });

    const totalAmount = filtered.reduce((s, r) => s + r.totalAmount, 0);
    const totalPaid = filtered.reduce((s, r) => s + r.paidAmount, 0);
    const totalBalance = filtered.reduce((s, r) => s + r.balanceAmount, 0);

    const downloadReportCsv = () => {
        downloadCsv("purchase-report", ["Date", "Distributor", "Invoice #", "Total", "Paid", "Balance", "Status"], filtered.map(r => [
            new Date(r.date).toLocaleDateString("en-IN"),
            r.distributorName,
            r.invoiceNo,
            r.totalAmount,
            r.paidAmount,
            r.balanceAmount,
            r.status
        ]));
    };

    const downloadReportPdf = () => {
        downloadPdf(
            "purchase-report",
            "Purchase Report",
            ["Date", "Distributor", "Invoice #", "Total", "Paid", "Balance", "Status"],
            filtered.map(r => [
                new Date(r.date).toLocaleDateString("en-IN"),
                r.distributorName,
                r.invoiceNo,
                r.totalAmount.toFixed(2),
                r.paidAmount.toFixed(2),
                r.balanceAmount.toFixed(2),
                r.status
            ]),
            [
                `Total Amount: ₹${totalAmount.toFixed(2)}`,
                `Total Paid: ₹${totalPaid.toFixed(2)}`,
                `Total Balance: ₹${totalBalance.toFixed(2)}`
            ]
        );
    };

    return (
        <div className="purchase-report-container">
            {/* Header */}
            <div className="purchase-report-header">
                <span>Purchase Report</span>
                <span>{new Date().toLocaleDateString("en-IN")}</span>
            </div>

            {/* Filters Section */}
            <div className="purchase-filters-section">
                <div className="purchase-filters-grid">
                    <div className="purchase-filter-group">
                        <label>From Date</label>
                        <input
                            type="date"
                            className="purchase-report-input"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                        />
                    </div>
                    <div className="purchase-filter-group">
                        <label>To Date</label>
                        <input
                            type="date"
                            className="purchase-report-input"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                        />
                    </div>
                    <div className="purchase-filter-group">
                        <label>Search</label>
                        <input
                            className="purchase-report-input"
                            placeholder="Distributor or Invoice #"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="purchase-report-input" onClick={downloadReportPdf} disabled={filtered.length === 0}>Download PDF</button>
                    <button className="purchase-report-input" onClick={downloadReportCsv} disabled={filtered.length === 0}>Download CSV</button>
                </div>
                </div>
            </div>

            {/* Summary Section */}
            <div className="purchase-summary-section">
                <div className="purchase-summary-grid">
                    <div className="purchase-summary-card total">
                        <div className="purchase-summary-label">Total Amount</div>
                        <div className="purchase-summary-amount">₹{totalAmount.toFixed(2)}</div>
                    </div>
                    <div className="purchase-summary-card paid">
                        <div className="purchase-summary-label">Total Paid</div>
                        <div className="purchase-summary-amount">₹{totalPaid.toFixed(2)}</div>
                    </div>
                    <div className="purchase-summary-card balance">
                        <div className="purchase-summary-label">Total Balance</div>
                        <div className="purchase-summary-amount">₹{totalBalance.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="purchase-table-section">
                <table className="purchase-retro-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Distributor</th>
                            <th>Invoice #</th>
                            <th>Total</th>
                            <th>Paid</th>
                            <th>Balance</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="purchase-loading">
                                    ⏳ Loading purchases...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="purchase-empty-state">
                                    📭 No purchases found
                                </td>
                            </tr>
                        ) : (
                            filtered.map(r => (
                                <tr key={r.id}>
                                    <td>{new Date(r.date).toLocaleDateString("en-IN")}</td>
                                    <td>{r.distributorName}</td>
                                    <td>
                                        <strong>{r.invoiceNo}</strong>
                                    </td>
                                    <td>₹{r.totalAmount.toFixed(2)}</td>
                                    <td>₹{r.paidAmount.toFixed(2)}</td>
                                    <td style={{ fontWeight: "bold", color: r.balanceAmount > 0 ? "#ff0000" : "#008000" }}>
                                        ₹{r.balanceAmount.toFixed(2)}
                                    </td>
                                    <td>
                                        <span
                                            className={`purchase-badge ${
                                                r.status === "Paid"
                                                    ? "purchase-badge-success"
                                                    : r.status === "Pending"
                                                    ? "purchase-badge-pending"
                                                    : "purchase-badge-warning"
                                            }`}
                                        >
                                            {r.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
