import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getChequeIssuedReport } from "../../api/chequeIssuedApi";
import { useBanks } from "../../hooks/useMasterQueries";
import type { ChequeIssuedResponse } from "../../models/ChequeIssued";
import { downloadCsv, downloadPdf } from "../../utils/reportExport";
import "../../Styles/ChequeIssued.css";

const today = new Date().toISOString().slice(0, 10);

export default function ChequeIssuedReport() {
    usePageTitle("Cheque Issued Report");

    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);
    const [filterType, setFilterType] = useState<"today" | "weekly" | "monthly" | "custom">("today");
    const [filterBank, setFilterBank] = useState("");
    
    const [rows, setRows] = useState<ChequeIssuedResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const { data: banks = [] } = useBanks();

    useEffect(() => {
        const d = new Date();
        if (filterType === "today") {
            setFromDate(today);
            setToDate(today);
        } else if (filterType === "weekly") {
            const first = d.getDate() - d.getDay();
            const firstDay = new Date(new Date().setDate(first)).toISOString().slice(0, 10);
            const lastDay = new Date(new Date().setDate(first + 6)).toISOString().slice(0, 10);
            setFromDate(firstDay);
            setToDate(lastDay);
        } else if (filterType === "monthly") {
            const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
            const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
            setFromDate(firstDay);
            setToDate(lastDay);
        }
    }, [filterType]);

    useEffect(() => {
        load();
    }, []);

    const filteredRows = useMemo(() => {
        if (!filterBank) return rows;
        return rows.filter(r => r.bankName === filterBank);
    }, [rows, filterBank]);

    const totalAmount = useMemo(() => filteredRows.reduce((sum, x) => sum + x.amount, 0), [filteredRows]);

    const load = async () => {
        try {
            setLoading(true);
            const data = await getChequeIssuedReport(fromDate, toDate);
            setRows(data);
        } catch {
            setRows([]);
            toast.error("Failed to load cheque issued report");
        } finally {
            setLoading(false);
        }
    };

    const downloadReportCsv = () => {
        downloadCsv(
            "cheque-issued-report",
            ["Vendor", "Bill Date", "Bill No", "Amount", "Method", "Cheque No", "Cheque Date", "Bank", "Stock Return"],
            filteredRows.map(x => [
                x.vendorName,
                new Date(x.billDate).toLocaleDateString("en-IN"),
                x.billNo,
                x.amount,
                x.paymentMethod,
                x.chequeNumber ?? "",
                x.chequeDate ? new Date(x.chequeDate).toLocaleDateString("en-IN") : "",
                x.bankName ?? "",
                x.stockReturn ? "Yes" : "No"
            ])
        );
    };

    const downloadReportPdf = () => {
        downloadPdf(
            "cheque-issued-report",
            "Cheque Issued Report",
            ["Vendor", "Bill Date", "Bill No", "Amount", "Method", "Cheque No", "Cheque Date", "Bank", "Stock Return"],
            filteredRows.map(x => [
                x.vendorName,
                new Date(x.billDate).toLocaleDateString("en-IN"),
                x.billNo,
                x.amount.toFixed(2),
                x.paymentMethod,
                x.chequeNumber ?? "",
                x.chequeDate ? new Date(x.chequeDate).toLocaleDateString("en-IN") : "",
                x.bankName ?? "",
                x.stockReturn ? "Yes" : "No"
            ]),
            [`Total Records: ${filteredRows.length}`, `Total Amount: ₹${totalAmount.toFixed(2)}`]
        );
    };

    return (
        <div className="cheque-master-container">
            <div className="cheque-header-bar">
                <span>Cheque Issued Report</span>
                <span>{new Date().toLocaleDateString("en-IN")}</span>
            </div>

            <div className="cheque-form-section">
                <div className="cheque-form-grid">
                    <div className="cheque-form-group">
                        <label>Date Range</label>
                        <select className="cheque-input" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
                            <option value="today">Today</option>
                            <option value="weekly">This Week</option>
                            <option value="monthly">This Month</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                    {filterType === "custom" && (
                        <>
                            <div className="cheque-form-group">
                                <label>From Date</label>
                                <input className="cheque-input" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                            </div>
                            <div className="cheque-form-group">
                                <label>To Date</label>
                                <input className="cheque-input" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                            </div>
                        </>
                    )}
                    <div className="cheque-form-group">
                        <label>Bank</label>
                        <select className="cheque-input" value={filterBank} onChange={e => setFilterBank(e.target.value)}>
                            <option value="">All Banks</option>
                            {banks.map(b => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="cheque-form-group">
                        <label>Total Amount</label>
                        <input className="cheque-input" value={`₹${totalAmount.toFixed(2)}`} readOnly />
                    </div>
                </div>

                <div className="cheque-actions">
                    <button className="cheque-btn primary" onClick={load} disabled={loading}>{loading ? "Loading..." : "Load Report"}</button>
                    <button className="cheque-btn" onClick={downloadReportPdf} disabled={rows.length === 0}>Download PDF</button>
                    <button className="cheque-btn" onClick={downloadReportCsv} disabled={rows.length === 0}>Download CSV</button>
                </div>
            </div>

            <div className="cheque-grid-section">
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
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="cheque-empty">{loading ? "Loading..." : "No records found"}</td>
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
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
