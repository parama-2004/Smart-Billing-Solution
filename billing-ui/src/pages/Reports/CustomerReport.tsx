import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { api } from "../../api/axios";
import { downloadCsv, downloadPdf } from "../../utils/reportExport";
import "../../Styles/CustomerReport.css";

type CustomerRow = {
    id: number;
    name: string;
    phone: string;
    email: string;
    openingBalance: number;
    purchaseAmount: number;
    returnedAmount: number;
    closingBalance: number;
    loyaltyPoints: number;
};

export default function CustomerReport() {
    usePageTitle("Customer Report");
    const [customers, setCustomers] = useState<CustomerRow[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const res = await api.get<CustomerRow[]>("/customers");
            setCustomers(res.data);
        } catch { toast.error("Failed to load customers"); }
        finally { setLoading(false); }
    };

    const filtered = customers.filter(c => {
        const q = search.toLowerCase().trim();
        return !q || c.name.toLowerCase().includes(q) || (c.phone || "").includes(q);
    });

    const totalPurchases = filtered.reduce((s, c) => s + c.purchaseAmount, 0);
    const totalReturns = filtered.reduce((s, c) => s + c.returnedAmount, 0);
    const totalOutstanding = filtered.reduce((s, c) => s + c.closingBalance, 0);

    const downloadReportCsv = () => {
        downloadCsv("customer-report", ["ID", "Name", "Phone", "Opening", "Purchases", "Returns", "Closing", "Points"], filtered.map(c => [
            c.id,
            c.name,
            c.phone,
            c.openingBalance,
            c.purchaseAmount,
            c.returnedAmount,
            c.closingBalance,
            c.loyaltyPoints
        ]));
    };

    const downloadReportPdf = () => {
        downloadPdf(
            "customer-report",
            "Customer Report",
            ["ID", "Name", "Phone", "Opening", "Purchases", "Returns", "Closing", "Points"],
            filtered.map(c => [
                c.id,
                c.name,
                c.phone,
                c.openingBalance.toFixed(2),
                c.purchaseAmount.toFixed(2),
                c.returnedAmount.toFixed(2),
                c.closingBalance.toFixed(2),
                c.loyaltyPoints
            ]),
            [
                `Customers: ${filtered.length}`,
                `Total Purchases: ₹${totalPurchases.toFixed(2)}`,
                `Total Returns: ₹${totalReturns.toFixed(2)}`,
                `Outstanding: ₹${totalOutstanding.toFixed(2)}`
            ]
        );
    };

    return (
        <div className="customer-report-container">
            {/* Header */}
            <div className="customer-report-header">
                <span>Customer Report</span>
                <span>{new Date().toLocaleDateString("en-IN")}</span>
            </div>

            {/* Search Filter */}
            <div className="customer-filters-section">
                <input
                    className="customer-search-input"
                    placeholder="🔍 Search by customer name or phone..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="customer-search-input" onClick={downloadReportPdf} disabled={filtered.length === 0}>Download PDF</button>
                    <button className="customer-search-input" onClick={downloadReportCsv} disabled={filtered.length === 0}>Download CSV</button>
                </div>
            </div>

            {/* Summary Section */}
            <div className="customer-summary-section">
                <div className="customer-summary-grid">
                    <div className="customer-summary-card purchases">
                        <div className="customer-summary-label">Total Customers</div>
                        <div className="customer-summary-amount">{filtered.length}</div>
                    </div>
                    <div className="customer-summary-card purchases">
                        <div className="customer-summary-label">Total Purchases</div>
                        <div className="customer-summary-amount">₹{totalPurchases.toFixed(2)}</div>
                    </div>
                    <div className="customer-summary-card returns">
                        <div className="customer-summary-label">Total Returns</div>
                        <div className="customer-summary-amount">₹{totalReturns.toFixed(2)}</div>
                    </div>
                    <div className="customer-summary-card outstanding">
                        <div className="customer-summary-label">Outstanding Balance</div>
                        <div className="customer-summary-amount">₹{totalOutstanding.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="customer-table-section">
                <table className="customer-retro-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Opening Bal</th>
                            <th>Purchases</th>
                            <th>Returns</th>
                            <th>Closing Bal</th>
                            <th>Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="customer-loading">
                                    ⏳ Loading customers...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="customer-empty-state">
                                    📭 No customers found
                                </td>
                            </tr>
                        ) : (
                            filtered.map(c => (
                                <tr key={c.id}>
                                    <td>{c.id}</td>
                                    <td>
                                        <strong>{c.name}</strong>
                                    </td>
                                    <td>{c.phone || "—"}</td>
                                    <td>₹{c.openingBalance.toFixed(2)}</td>
                                    <td style={{ color: "#16a34a", fontWeight: 600 }}>₹{c.purchaseAmount.toFixed(2)}</td>
                                    <td style={{ color: "#ff8800", fontWeight: 600 }}>₹{c.returnedAmount.toFixed(2)}</td>
                                    <td style={{ fontWeight: 600, color: c.closingBalance > 0 ? "#dc2626" : "#16a34a" }}>
                                        ₹{c.closingBalance.toFixed(2)}
                                    </td>
                                    <td>
                                        <span className="customer-loyalty-badge">{c.loyaltyPoints} ⭐</span>
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
