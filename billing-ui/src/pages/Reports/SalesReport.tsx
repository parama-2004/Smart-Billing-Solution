import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getSalesReport } from "../../api/reportApi";
import {
    getCurrentDateTime
} from "../../utils/dateUtils";
import { downloadCsv, downloadPdf } from "../../utils/reportExport";
import "../../Styles/SalesReport.css"; // Import the CSS

type Summary = {
    invoiceCount: number;
    totalSales: number;
    totalPaid: number;
    totalRefunded: number;
    netSales: number;
};

type Row = {
    invoiceNumber: string;
    date: string;
    customerName: string;
    totalAmount: number;
    paidAmount: number;
    refundedAmount: number;
    netAmount: number;
};

export default function SalesReport() {
    usePageTitle("Sales Report");
    const [type, setType] = useState<"daily" | "weekly" | "monthly" | "yearly" | "range">("daily");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [summary, setSummary] = useState<Summary | null>(null);
    const [rows, setRows] = useState<Row[]>([]);
    const [loading] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadReport();
    }, []);

    

    const loadReport = async () => {
        try {
            const res = await getSalesReport(type, from, to);
            setSummary(res.data.summary);
            setRows(res.data.rows);
        } catch (err) {
            toast.error("Failed to load sales report");
            console.error(err);
        }
    };


    const printReport = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const win = window.open("", "", "width=300,height=600");
        if (!win) return;

        win.document.write(`
            <html>
            <head>
                <title>Sales Report - Smart Super Market</title>
                <style>
                    body {
                        width: 80mm;
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        margin: 0;
                        padding: 5px;
                        background: #fff;
                        color: #000;
                    }
                    h2 {
                        text-align: center;
                        margin: 4px 0;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        border-bottom: 2px solid #00ff00;
                        padding-bottom: 5px;
                    }
                    h3 {
                        text-align: center;
                        margin: 4px 0;
                        color: #000;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 10px 0;
                    }
                    th, td {
                        border-bottom: 1px dashed #00ff00;
                        padding: 3px 0;
                        text-align: left;
                    }
                    .right { text-align: right; }
                    .center { text-align: center; }
                    .total {
                        font-weight: bold;
                        border-top: 2px solid #000;
                        margin-top: 10px;
                        padding-top: 10px;
                        color: #000;
                    }
                    .summary-box {
                        background: rgba(0, 255, 0, 0.1);
                        padding: 10px;
                        margin: 10px 0;
                        border: 1px solid #000;
                        border-radius: 3px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        padding-top: 10px;
                        border-top: 1px dashed #000;
                        color: #000;
                    }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);

        win.document.close();
        win.focus();
        win.print();
        win.close();
    };

    const downloadSalesCsv = () => {
        downloadCsv("sales-report", ["Invoice #", "Date", "Customer", "Total", "Paid", "Refunded", "Net"], rows.map(r => [
            r.invoiceNumber,
            r.date,
            r.customerName,
            r.totalAmount,
            r.paidAmount,
            r.refundedAmount,
            r.netAmount
        ]));
    };

    const downloadSalesPdf = () => {
        downloadPdf(
            "sales-report",
            "Sales Report",
            ["Invoice #", "Date", "Customer", "Total", "Paid", "Refunded", "Net"],
            rows.map(r => [
                r.invoiceNumber,
                r.date,
                r.customerName,
                r.totalAmount.toFixed(2),
                r.paidAmount.toFixed(2),
                r.refundedAmount.toFixed(2),
                r.netAmount.toFixed(2)
            ]),
            summary
                ? [
                      `Invoices: ${summary.invoiceCount}`,
                      `Total Sales: ₹${summary.totalSales.toFixed(2)}`,
                      `Total Paid: ₹${summary.totalPaid.toFixed(2)}`,
                      `Total Refunded: ₹${summary.totalRefunded.toFixed(2)}`,
                      `Net Sales: ₹${summary.netSales.toFixed(2)}`
                  ]
                : []
        );
    };

    //const formatDate = (date: string) => {
    //    return new Date(date).toLocaleDateString('en-IN', {
    //        day: '2-digit',
    //        month: 'short',
    //        year: 'numeric'
    //    });
    //};

    return (
        <div className="sales-report-container">
            {/* Header */}
            <div className="sales-report-header">
                <h2>SALES REPORT - SMART SUPER MARKET</h2>
                <span className="date-display">{getCurrentDateTime()}</span>
            </div>

            {/* Filters Section */}
            <div className="filters-section">
                <h3> FILTER REPORT</h3>
                <div className="filters-grid">
                    <div className="filter-group">
                        <label>REPORT TYPE</label>
                        <select
                            className="retro-report-select"
                            value={type}
                            onChange={e => setType(e.target.value as any)}
                        >
                            <option value="daily"> TODAY</option>
                            <option value="weekly"> WEEKLY</option>
                            <option value="monthly"> MONTHLY</option>
                            <option value="yearly"> YEARLY</option>
                            <option value="range"> DATE RANGE</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>FROM DATE</label>
                        <input
                            className="retro-report-input"
                            type="date"
                            value={from}
                            onChange={e => setFrom(e.target.value)}
                            disabled={type !== "range"}
                        />
                    </div>

                    <div className="filter-group">
                        <label>TO DATE</label>
                        <input
                            className="retro-report-input"
                            type="date"
                            value={to}
                            onChange={e => setTo(e.target.value)}
                            disabled={type !== "range"}
                        />
                    </div>
                </div>

                <div className="filter-actions">
                    <button
                        className="retro-report-btn"
                        onClick={loadReport}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="loading-indicator"></span>
                                LOADING...
                            </>
                        ) : (
                            ' LOAD REPORT'
                        )}
                    </button>
                    <button
                        className="retro-report-btn print"
                        onClick={printReport}
                        disabled={rows.length === 0}
                    >
                         PRINT
                    </button>
                    <button className="retro-report-btn" onClick={downloadSalesPdf} disabled={rows.length === 0}>
                        PDF
                    </button>
                    <button className="retro-report-btn" onClick={downloadSalesCsv} disabled={rows.length === 0}>
                        CSV
                    </button>
                </div>
            </div>

            {/* Summary Section */}
            {summary && (
                <div className="summary-section">
                    <h3>SALES SUMMARY</h3>
                    <div className="summary-grid">
                        <div className="summary-item">
                            <span className="summary-label">INVOICE COUNT</span>
                            <span className="summary-value">{summary.invoiceCount}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">TOTAL SALES</span>
                            <span className="summary-value">₹{summary.totalSales.toFixed(2)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">PAID AMOUNT</span>
                            <span className="summary-value">₹{summary.totalPaid.toFixed(2)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">REFUNDED</span>
                            <span className="summary-value">₹{summary.totalRefunded.toFixed(2)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">NET SALES</span>
                            <span className="summary-value net-total">₹{summary.netSales.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Section */}
            <div className="table-section">
                <h3>INVOICE DETAILS ({rows.length})</h3>
                {rows.length === 0 ? (
                    <div className="no-data">
                        ⚠️ NO DATA FOUND FOR SELECTED PERIOD
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="retro-report-table">
                            <thead>
                                <tr>
                                    <th>INVOICE #</th>
                                    <th>DATE</th>
                                    <th>CUSTOMER</th>
                                    <th className="right">TOTAL</th>
                                    <th className="right">PAID</th>
                                    <th className="right">NET</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(r => (
                                    <tr key={r.invoiceNumber}>
                                        <td>
                                            <strong>{r.invoiceNumber}</strong>
                                        </td>
                                        <td>{r.date}</td>
                                        <td>{r.customerName || "Cash Sale"}</td>
                                        <td className="amount-cell">₹{r.totalAmount.toFixed(2)}</td>
                                        <td className="amount-cell">₹{r.paidAmount.toFixed(2)}</td>
                                        <td className={`amount-cell ${r.netAmount < 0 ? 'negative-amount' : ''}`}>
                                            ₹{r.netAmount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="report-status-bar">
                <div className="status-item">
                    <strong>REPORT TYPE:</strong> {type.toUpperCase()}
                </div>
                <div className="status-item">
                    <strong>INVOICES:</strong> {rows.length}
                </div>
                <div className="status-item">
                    <strong>NET VALUE:</strong> ₹{summary?.netSales.toFixed(2) || "0.00"}
                </div>
                <div className="status-item">
                    <strong>LAST UPDATE:</strong> {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* Print Template (Hidden) */}
            <div className="print-template">
                <div ref={printRef}>
                    <h2>SALES REPORT</h2>
                    <h3>{type.toUpperCase()} - SMART SUPER MARKET</h3>
                    <div className="summary-box">
                        Invoices : {summary?.invoiceCount}<br />
                        Total    : ₹{summary?.totalSales.toFixed(2)}<br />
                        Paid     : ₹{summary?.totalPaid.toFixed(2)}<br />
                        Refund   : ₹{summary?.totalRefunded.toFixed(2)}<br />
                        <div className="total">
                            NET SALE : ₹{summary?.netSales.toFixed(2)}
                        </div>
                    </div>

                  

                 

                    <div className="footer">
                        ---- THANK YOU ----
                        <br />
                        Generated: {new Date().toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
}