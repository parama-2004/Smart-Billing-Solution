import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getAllInvoices } from "../../api/invoiceApi";
import type { InvoiceResponseDto } from "../../models/Invoice";
import { downloadCsv, downloadPdf } from "../../utils/reportExport";
import "../../Styles/PaymentReport.css";

export default function PaymentReport() {
    usePageTitle("Payment Report");
    const [invoices, setInvoices] = useState<InvoiceResponseDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [methodFilter, setMethodFilter] = useState<string>("all");

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const all = await getAllInvoices();
            setInvoices(all.filter(i => i.paidAmount > 0));
        } catch { toast.error("Failed to load data"); }
        finally { setLoading(false); }
    };

    const filtered = invoices.filter(inv => {
        const matchFrom = !fromDate || new Date(inv.date) >= new Date(fromDate);
        const matchTo = !toDate || new Date(inv.date) <= new Date(toDate + "T23:59:59");
        const matchMethod = methodFilter === "all" || inv.paymentMode === methodFilter;
        return matchFrom && matchTo && matchMethod;
    });

    const totalCash = filtered.filter(i => i.paymentMode === "Cash").reduce((s, i) => s + i.paidAmount, 0);
    const totalUPI = filtered.filter(i => i.paymentMode === "UPI").reduce((s, i) => s + i.paidAmount, 0);
    const totalCard = filtered.filter(i => i.paymentMode === "Card").reduce((s, i) => s + i.paidAmount, 0);
    const totalAll = filtered.reduce((s, i) => s + i.paidAmount, 0);

    const downloadReportCsv = () => {
        downloadCsv("payment-report", ["Invoice #", "Date", "Customer", "Total", "Paid", "Method", "Status"], filtered.map(inv => [
            inv.invoiceNumber,
            new Date(inv.date).toLocaleDateString("en-IN"),
            inv.customerName,
            inv.totalAmount,
            inv.paidAmount,
            inv.paymentMode,
            inv.status
        ]));
    };

    const downloadReportPdf = () => {
        downloadPdf(
            "payment-report",
            "Payment Report",
            ["Invoice #", "Date", "Customer", "Total", "Paid", "Method", "Status"],
            filtered.map(inv => [
                inv.invoiceNumber,
                new Date(inv.date).toLocaleDateString("en-IN"),
                inv.customerName,
                inv.totalAmount.toFixed(2),
                inv.paidAmount.toFixed(2),
                inv.paymentMode || "",
                inv.status
            ]),
            [
                `Cash: ₹${totalCash.toFixed(2)}`,
                `UPI: ₹${totalUPI.toFixed(2)}`,
                `Card: ₹${totalCard.toFixed(2)}`,
                `Total Collected: ₹${totalAll.toFixed(2)}`
            ]
        );
    };

    return (
        <div className="payment-report-container">
            {/* Header */}
            <div className="payment-report-header">
                <span>Payment Report</span>
                <span>{new Date().toLocaleDateString("en-IN")}</span>
            </div>

            {/* Filters Section */}
            <div className="payment-filters-section">
                <div className="payment-filters-grid">
                    <div className="payment-filter-group">
                        <label>From Date</label>
                        <input
                            type="date"
                            className="payment-report-input"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                        />
                    </div>
                    <div className="payment-filter-group">
                        <label>To Date</label>
                        <input
                            type="date"
                            className="payment-report-input"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                        />
                    </div>
                    <div className="payment-filter-group">
                        <label>Payment Method</label>
                        <select
                            className="payment-report-select"
                            value={methodFilter}
                            onChange={e => setMethodFilter(e.target.value)}
                        >
                            <option value="all">All Methods</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                        </select>
                    </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="payment-report-input" onClick={downloadReportPdf} disabled={filtered.length === 0}>Download PDF</button>
                    <button className="payment-report-input" onClick={downloadReportCsv} disabled={filtered.length === 0}>Download CSV</button>
                </div>
                </div>
            </div>

            {/* Summary Section */}
            <div className="payment-summary-section">
                <div className="payment-summary-grid">
                    <div className="payment-summary-card cash">
                        <div className="payment-summary-label">Cash</div>
                        <div className="payment-summary-amount">₹{totalCash.toFixed(2)}</div>
                    </div>
                    <div className="payment-summary-card upi">
                        <div className="payment-summary-label">UPI</div>
                        <div className="payment-summary-amount">₹{totalUPI.toFixed(2)}</div>
                    </div>
                    <div className="payment-summary-card card">
                        <div className="payment-summary-label">Card</div>
                        <div className="payment-summary-amount">₹{totalCard.toFixed(2)}</div>
                    </div>
                    <div className="payment-summary-card total">
                        <div className="payment-summary-label">Total Collected</div>
                        <div className="payment-summary-amount">₹{totalAll.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="payment-table-section">
                <table className="payment-retro-table">
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Total</th>
                            <th>Paid</th>
                            <th>Method</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="payment-loading">
                                    ⏳ Loading payments...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="payment-empty-state">
                                    📭 No payments found
                                </td>
                            </tr>
                        ) : (
                            filtered.map(inv => (
                                <tr key={inv.id}>
                                    <td>
                                        <strong>{inv.invoiceNumber}</strong>
                                    </td>
                                    <td>{new Date(inv.date).toLocaleDateString("en-IN")}</td>
                                    <td>{inv.customerName || "Walk-in"}</td>
                                    <td>₹{inv.totalAmount.toFixed(2)}</td>
                                    <td style={{ color: "#16a34a", fontWeight: 600 }}>₹{inv.paidAmount.toFixed(2)}</td>
                                    <td>
                                        <span
                                            className={`payment-badge payment-badge-${(inv.paymentMode || "cash").toLowerCase()}`}
                                        >
                                            {inv.paymentMode || "—"}
                                        </span>
                                    </td>
                                    <td>{inv.status}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
