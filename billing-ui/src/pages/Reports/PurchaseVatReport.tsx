import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getPurchaseGstReport } from "../../api/reportApi";
import { downloadCsv, downloadPdf } from "../../utils/reportExport";
import "../../Styles/SalesReport.css";

type GstSlab = {
    gstPercentage: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    totalGst: number;
};

type Summary = {
    count: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    totalGst: number;
    totalAmount: number;
    slabs: GstSlab[];
};

type Row = {
    referenceNo: string;
    date: string;
    partyName: string;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    totalGst: number;
    totalAmount: number;
    slabs: GstSlab[];
};

export default function PurchaseVatReport() {
    usePageTitle("Purchase GST Report");

    const [type, setType] = useState<"daily" | "weekly" | "monthly" | "yearly" | "range">("daily");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [summary, setSummary] = useState<Summary | null>(null);
    const [rows, setRows] = useState<Row[]>([]);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    useEffect(() => {
        void loadReport();
    }, []);

    const loadReport = async () => {
        try {
            const res = await getPurchaseGstReport(type, from, to);
            setSummary(res.data.summary);
            setRows(res.data.rows);
            setExpandedRow(null);
        } catch {
            toast.error("Failed to load purchase GST report");
        }
    };

    const downloadReportCsv = () => {
        downloadCsv("purchase-gst-report", ["Invoice #", "Date", "Distributor", "Taxable", "CGST", "SGST", "Total GST", "Total"], rows.map(r => [
            r.referenceNo,
            r.date,
            r.partyName,
            r.taxableAmount,
            r.cgstAmount,
            r.sgstAmount,
            r.totalGst,
            r.totalAmount
        ]));
    };

    const downloadReportPdf = () => {
        downloadPdf(
            "purchase-gst-report",
            "Purchase GST Report",
            ["Invoice #", "Date", "Distributor", "Taxable", "CGST", "SGST", "Total GST", "Total"],
            rows.map(r => [
                r.referenceNo,
                r.date,
                r.partyName,
                r.taxableAmount.toFixed(2),
                r.cgstAmount.toFixed(2),
                r.sgstAmount.toFixed(2),
                r.totalGst.toFixed(2),
                r.totalAmount.toFixed(2)
            ]),
            summary
                ? [
                      `Entries: ${summary.count}`,
                      `Taxable: ₹${summary.taxableAmount.toFixed(2)}`,
                      `CGST: ₹${summary.cgstAmount.toFixed(2)}`,
                      `SGST: ₹${summary.sgstAmount.toFixed(2)}`,
                      `Total GST: ₹${summary.totalGst.toFixed(2)}`,
                      `Total: ₹${summary.totalAmount.toFixed(2)}`
                  ]
                : []
        );
    };

    return (
        <div className="sales-report-container">
            <div className="sales-report-header">
                <h2>PURCHASE GST REPORT</h2>
                <span className="date-display">{new Date().toLocaleString("en-IN")}</span>
            </div>

            <div className="filters-section">
                <h3>FILTER REPORT</h3>
                <div className="filters-grid">
                    <div className="filter-group">
                        <label>REPORT TYPE</label>
                        <select className="retro-report-select" value={type} onChange={e => setType(e.target.value as any)}>
                            <option value="daily">TODAY</option>
                            <option value="weekly">WEEKLY</option>
                            <option value="monthly">MONTHLY</option>
                            <option value="yearly">YEARLY</option>
                            <option value="range">DATE RANGE</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>FROM DATE</label>
                        <input className="retro-report-input" type="date" value={from} onChange={e => setFrom(e.target.value)} disabled={type !== "range"} />
                    </div>
                    <div className="filter-group">
                        <label>TO DATE</label>
                        <input className="retro-report-input" type="date" value={to} onChange={e => setTo(e.target.value)} disabled={type !== "range"} />
                    </div>
                </div>
                <div className="filter-actions">
                    <button className="retro-report-btn" onClick={loadReport}>LOAD REPORT</button>
                    <button className="retro-report-btn" onClick={downloadReportPdf} disabled={rows.length === 0}>PDF</button>
                    <button className="retro-report-btn" onClick={downloadReportCsv} disabled={rows.length === 0}>CSV</button>
                </div>
            </div>

            {summary && (
                <div className="summary-section">
                    <h3>GST SUMMARY</h3>
                    <div className="summary-grid">
                        <div className="summary-item">
                            <span className="summary-label">COUNT</span>
                            <span className="summary-value">{summary.count}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">TAXABLE</span>
                            <span className="summary-value">₹{summary.taxableAmount.toFixed(2)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">CGST</span>
                            <span className="summary-value">₹{summary.cgstAmount.toFixed(2)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">SGST</span>
                            <span className="summary-value">₹{summary.sgstAmount.toFixed(2)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">TOTAL GST</span>
                            <span className="summary-value">₹{summary.totalGst.toFixed(2)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">TOTAL</span>
                            <span className="summary-value net-total">₹{summary.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* GST Slab Breakdown in Summary */}
                    {summary.slabs && summary.slabs.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <h4 style={{ margin: '0 0 8px 0', color: '#0f0', fontFamily: 'monospace', fontSize: '13px' }}>GST % SLAB BREAKDOWN</h4>
                            <table className="retro-report-table" style={{ fontSize: '12px' }}>
                                <thead>
                                    <tr>
                                        <th>GST %</th>
                                        <th className="right">Taxable</th>
                                        <th className="right">CGST ({'\u00BD'})</th>
                                        <th className="right">SGST ({'\u00BD'})</th>
                                        <th className="right">Total GST</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.slabs.map(slab => (
                                        <tr key={slab.gstPercentage}>
                                            <td>{slab.gstPercentage}%</td>
                                            <td className="right">₹{slab.taxableAmount.toFixed(2)}</td>
                                            <td className="right">₹{slab.cgstAmount.toFixed(2)}</td>
                                            <td className="right">₹{slab.sgstAmount.toFixed(2)}</td>
                                            <td className="right">₹{slab.totalGst.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <div className="table-section">
                <h3>DETAILS ({rows.length})</h3>
                <div className="table-container">
                    <table className="retro-report-table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Date</th>
                                <th>Distributor</th>
                                <th className="right">Taxable</th>
                                <th className="right">CGST</th>
                                <th className="right">SGST</th>
                                <th className="right">Total GST</th>
                                <th className="right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="no-data">NO DATA FOUND</td>
                                </tr>
                            ) : (
                                rows.map((row, idx) => (
                                    <>
                                        <tr
                                            key={`${row.referenceNo}-${idx}`}
                                            onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                                            style={{ cursor: row.slabs && row.slabs.length > 0 ? 'pointer' : 'default' }}
                                        >
                                            <td>
                                                {row.slabs && row.slabs.length > 0 && (
                                                    <span style={{ marginRight: '4px', fontSize: '10px', color: '#0f0' }}>
                                                        {expandedRow === idx ? '▼' : '▶'}
                                                    </span>
                                                )}
                                                {row.referenceNo}
                                            </td>
                                            <td>{row.date}</td>
                                            <td>{row.partyName}</td>
                                            <td className="right">₹{row.taxableAmount.toFixed(2)}</td>
                                            <td className="right">₹{row.cgstAmount.toFixed(2)}</td>
                                            <td className="right">₹{row.sgstAmount.toFixed(2)}</td>
                                            <td className="right">₹{row.totalGst.toFixed(2)}</td>
                                            <td className="right">₹{row.totalAmount.toFixed(2)}</td>
                                        </tr>
                                        {expandedRow === idx && row.slabs && row.slabs.length > 0 && (
                                            <tr key={`${row.referenceNo}-${idx}-slabs`}>
                                                <td colSpan={8} style={{ padding: '4px 8px 8px 32px', background: 'rgba(0,255,0,0.03)' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '1px dashed #333' }}>
                                                                <th style={{ textAlign: 'left', padding: '2px 6px', color: '#0f0' }}>GST %</th>
                                                                <th style={{ textAlign: 'right', padding: '2px 6px', color: '#0f0' }}>Taxable</th>
                                                                <th style={{ textAlign: 'right', padding: '2px 6px', color: '#0f0' }}>CGST</th>
                                                                <th style={{ textAlign: 'right', padding: '2px 6px', color: '#0f0' }}>SGST</th>
                                                                <th style={{ textAlign: 'right', padding: '2px 6px', color: '#0f0' }}>GST Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {row.slabs.map(slab => (
                                                                <tr key={slab.gstPercentage} style={{ borderBottom: '1px dashed #222' }}>
                                                                    <td style={{ padding: '2px 6px' }}>{slab.gstPercentage}%</td>
                                                                    <td style={{ textAlign: 'right', padding: '2px 6px' }}>₹{slab.taxableAmount.toFixed(2)}</td>
                                                                    <td style={{ textAlign: 'right', padding: '2px 6px' }}>₹{slab.cgstAmount.toFixed(2)}</td>
                                                                    <td style={{ textAlign: 'right', padding: '2px 6px' }}>₹{slab.sgstAmount.toFixed(2)}</td>
                                                                    <td style={{ textAlign: 'right', padding: '2px 6px' }}>₹{slab.totalGst.toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
