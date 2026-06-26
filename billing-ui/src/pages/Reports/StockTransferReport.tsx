import { useMemo, useState } from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useStockTransfers, useShops } from "../../hooks/useShops";
import { getCurrentDateTime } from "../../utils/dateUtils";
import { downloadCsv, downloadPdf } from "../../utils/reportExport";
import "../../Styles/SalesReport.css"; // Reuse existing report styles

export default function StockTransferReport() {
    usePageTitle("Stock Transfer Report");
    const [from, setFrom] = useState(new Date().toISOString().split('T')[0]);
    const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
    const [shopId, setShopId] = useState("");
    const [transferType, setTransferType] = useState("");
    
    const { data: shops = [] } = useShops();
    const { data: transfers = [], isLoading } = useStockTransfers();

    const filteredTransfers = useMemo(() => {
        return transfers.filter(t => {
            const dateStr = t.transferDate.substring(0, 10);
            if (dateStr < from || dateStr > to) return false;
            if (shopId && t.shopId.toString() !== shopId) return false;
            if (transferType && t.transferType !== transferType) return false;
            return true;
        });
    }, [transfers, from, to, shopId, transferType]);

    const totalAmount = useMemo(() => {
        return filteredTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);
    }, [filteredTransfers]);

    const downloadReportCsv = () => {
        downloadCsv("stock-transfer-report", 
            ["Txn ID", "Date", "Type", "Shop", "Product", "Qty", "Price", "Amount"], 
            filteredTransfers.map(t => [
                t.id,
                new Date(t.transferDate).toLocaleDateString(),
                t.transferType,
                t.shopName,
                t.productName,
                t.quantity,
                t.price || 0,
                t.amount || 0
            ])
        );
    };

    const downloadReportPdf = () => {
        downloadPdf(
            "stock-transfer-report",
            "Stock Transfer Report",
            ["Txn ID", "Date", "Type", "Shop", "Product", "Qty", "Price", "Amount"],
            filteredTransfers.map(t => [
                t.id.toString(),
                new Date(t.transferDate).toLocaleDateString(),
                t.transferType,
                t.shopName,
                t.productName,
                t.quantity.toString(),
                (t.price || 0).toFixed(2),
                (t.amount || 0).toFixed(2)
            ]),
            [
                `Date Range: ${new Date(from).toLocaleDateString()} to ${new Date(to).toLocaleDateString()}`,
                `Total Records: ${filteredTransfers.length}`,
                `Total Amount: ₹${totalAmount.toFixed(2)}`
            ]
        );
    };

    return (
        <div className="sales-report-container">
            <div className="sales-report-header">
                <h2>STOCK TRANSFER REPORT - SMART SUPER MARKET</h2>
                <span className="date-display">{getCurrentDateTime()}</span>
            </div>

            <div className="filters-section">
                <h3>FILTER REPORT</h3>
                <div className="filters-grid">
                    <div className="filter-group">
                        <label>FROM DATE</label>
                        <input
                            className="retro-report-input"
                            type="date"
                            value={from}
                            onChange={e => setFrom(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>TO DATE</label>
                        <input
                            className="retro-report-input"
                            type="date"
                            value={to}
                            onChange={e => setTo(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>SHOP</label>
                        <select
                            className="retro-report-select"
                            value={shopId}
                            onChange={e => setShopId(e.target.value)}
                        >
                            <option value="">ALL SHOPS</option>
                            {shops.map(s => (
                                <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>TRANSFER TYPE</label>
                        <select
                            className="retro-report-select"
                            value={transferType}
                            onChange={e => setTransferType(e.target.value)}
                        >
                            <option value="">ALL TYPES</option>
                            <option value="In">IN (RECEIVE)</option>
                            <option value="Out">OUT (SEND)</option>
                        </select>
                    </div>
                </div>

                <div className="filter-actions">
                    <button className="retro-report-btn" onClick={downloadReportPdf} disabled={filteredTransfers.length === 0}>
                        PDF
                    </button>
                    <button className="retro-report-btn" onClick={downloadReportCsv} disabled={filteredTransfers.length === 0}>
                        CSV
                    </button>
                </div>
            </div>

            <div className="summary-section">
                <h3>SUMMARY</h3>
                <div className="summary-grid">
                    <div className="summary-item">
                        <span className="summary-label">TOTAL RECORDS</span>
                        <span className="summary-value">{filteredTransfers.length}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">TOTAL AMOUNT</span>
                        <span className="summary-value net-total">₹{totalAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="table-section">
                <h3>TRANSFER DETAILS</h3>
                {isLoading ? (
                    <div className="no-data">LOADING...</div>
                ) : filteredTransfers.length === 0 ? (
                    <div className="no-data">⚠️ NO DATA FOUND FOR SELECTED PERIOD</div>
                ) : (
                    <div className="table-container">
                        <table className="retro-report-table">
                            <thead>
                                <tr>
                                    <th>TXN ID</th>
                                    <th>DATE</th>
                                    <th>TYPE</th>
                                    <th>SHOP</th>
                                    <th>PRODUCT</th>
                                    <th className="right">QTY</th>
                                    <th className="right">PRICE</th>
                                    <th className="right">AMOUNT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransfers.map(t => (
                                    <tr key={t.id}>
                                        <td><strong>{t.id}</strong></td>
                                        <td>{new Date(t.transferDate).toLocaleDateString()}</td>
                                        <td style={{ color: t.transferType === 'In' ? 'green' : 'red', fontWeight: 'bold' }}>
                                            {t.transferType.toUpperCase()}
                                        </td>
                                        <td>{t.shopName}</td>
                                        <td>{t.productName}</td>
                                        <td className="amount-cell">{t.quantity}</td>
                                        <td className="amount-cell">₹{(t.price || 0).toFixed(2)}</td>
                                        <td className="amount-cell"><strong>₹{(t.amount || 0).toFixed(2)}</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
