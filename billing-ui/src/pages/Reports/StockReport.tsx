import { useEffect, useState, useMemo, Fragment } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getAllProductsCached } from "../../api/productApi";
import type { ProductDto } from "../../models/Product";
import { downloadCsv, downloadPdf } from "../../utils/reportExport";
import "../../Styles/StockReport.css";

export default function StockReport() {
    usePageTitle("Stock Report");
    const [products, setProducts] = useState<ProductDto[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
    const [groupByDistributor, setGroupByDistributor] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const data = await getAllProductsCached();
            setProducts(data);
        } catch { toast.error("Failed to load products"); }
        finally { setLoading(false); }
    };

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        const filteredProducts = products.filter(p => {
            const matchSearch = !q ||
                p.name.toLowerCase().includes(q) ||
                (p.barcodes && p.barcodes.some(b => b.barcodeValue.toLowerCase().includes(q)));

            const matchStock = stockFilter === "all" ||
                (stockFilter === "low" && p.stock > 0 && p.stock <= 10) ||
                (stockFilter === "out" && p.stock <= 0);

            return matchSearch && matchStock;
        });

        if (q) {
            const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const safeTerm = escapeRegExp(q);
            const exactRegex = new RegExp(`^${safeTerm}$`, 'i');
            const startRegex = new RegExp(`^${safeTerm}`, 'i');
            const wordRegex = new RegExp(`\\b${safeTerm}`, 'i');

            const getScore = (p: ProductDto) => {
                if (p.id.toString() === q) return 5;
                if (exactRegex.test(p.name)) return 4;
                if (startRegex.test(p.name)) return 3;
                if (wordRegex.test(p.name)) return 2;
                if (p.name.toLowerCase().includes(q)) return 1;
                return 0;
            };

            filteredProducts.sort((a, b) => {
                const scoreA = getScore(a);
                const scoreB = getScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA;
                return a.name.localeCompare(b.name);
            });
        }

        return filteredProducts;
    }, [products, search, stockFilter]);

    const displayedProducts = useMemo(() => {
        if (stockFilter === "all") {
            return filtered.slice(0, 100);
        }
        return filtered;
    }, [filtered, stockFilter]);

    const groupedProducts = useMemo(() => {
        if (!groupByDistributor) return null;

        const groups: { [key: string]: { distributorId: number | null, distributorName: string, items: ProductDto[] } } = {};

        displayedProducts.forEach(p => {
            const key = p.distributorName || "No Distributor";
            if (!groups[key]) {
                groups[key] = {
                    distributorId: p.distributorId || null,
                    distributorName: p.distributorName || "No Distributor",
                    items: []
                };
            }
            groups[key].items.push(p);
        });

        return Object.values(groups).sort((a, b) => {
            if (a.distributorName === "No Distributor") return 1;
            if (b.distributorName === "No Distributor") return -1;
            return a.distributorName.localeCompare(b.distributorName);
        });
    }, [displayedProducts, groupByDistributor]);

    const totalItems = filtered.length;
    const lowStock = filtered.filter(p => p.stock > 0 && p.stock <= 10).length;
    const outOfStock = filtered.filter(p => p.stock <= 0).length;
    const totalStockValue = filtered.reduce((s, p) => s + (p.costPrice * p.stock), 0);

    const downloadReportCsv = () => {
        downloadCsv("stock-report", ["ID", "Product", "Barcode", "Stock", "Cost Price", "MRP", "Sell Price", "Stock Value"], filtered.map(p => [
            p.id,
            p.name,
            p.barcodes ? p.barcodes.map(b => b.barcodeValue).join(', ') : "",
            p.stock,
            p.costPrice,
            p.mrp,
            p.price,
            p.costPrice * p.stock
        ]));
    };

    const downloadReportPdf = () => {
        downloadPdf(
            "stock-report",
            "Stock Report",
            ["ID", "Product", "Barcode", "Stock", "Cost Price", "MRP", "Sell Price", "Stock Value"],
            filtered.map(p => [
                p.id,
                p.name,
                p.barcodes ? p.barcodes.map(b => b.barcodeValue).join(', ') : "",
                p.stock,
                p.costPrice.toFixed(2),
                p.mrp.toFixed(2),
                p.price.toFixed(2),
                (p.costPrice * p.stock).toFixed(2)
            ]),
            [
                `Products: ${totalItems}`,
                `Low Stock: ${lowStock}`,
                `Out of Stock: ${outOfStock}`,
                `Stock Value: ₹${totalStockValue.toFixed(2)}`
            ]
        );
    };

    return (
        <div className="stock-report-container">
            {/* Header */}
            <div className="stock-report-header">
                <span>Stock Report</span>
                <span>{new Date().toLocaleDateString("en-IN")}</span>
            </div>

            {/* Filters Section */}
            <div className="stock-filters-section">
                <div className="stock-filters-grid">
                    <div className="stock-filter-group">
                        <label>Search</label>
                        <input
                            className="stock-report-input"
                            placeholder="Product name or barcode"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="stock-filter-group">
                        <label>Filter</label>
                        <select
                            className="stock-report-select"
                            value={stockFilter}
                            onChange={e => setStockFilter(e.target.value as any)}
                        >
                            <option value="all">All Products</option>
                            <option value="low">Low Stock (≤10)</option>
                            <option value="out">Out of Stock</option>
                        </select>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button className="stock-report-input" onClick={downloadReportPdf} disabled={filtered.length === 0}>Download PDF</button>
                        <button className="stock-report-input" onClick={downloadReportCsv} disabled={filtered.length === 0}>Download CSV</button>
                    </div>
                    <div className="stock-filter-group" style={{ justifyContent: "center", marginTop: 10 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none", height: "100%" }}>
                            <input
                                type="checkbox"
                                checked={groupByDistributor}
                                onChange={e => setGroupByDistributor(e.target.checked)}
                                style={{ width: 18, height: 18, cursor: "pointer" }}
                            />
                            Group by Distributor
                        </label>
                    </div>
                </div>
            </div>

            {/* Summary Section */}
            <div className="stock-summary-section">
                <div className="stock-summary-grid">
                    <div className="stock-summary-card total">
                        <div className="stock-summary-label">Total Products</div>
                        <div className="stock-summary-amount">{totalItems}</div>
                    </div>
                    <div className="stock-summary-card low">
                        <div className="stock-summary-label">Low Stock</div>
                        <div className="stock-summary-amount">{lowStock}</div>
                    </div>
                    <div className="stock-summary-card out">
                        <div className="stock-summary-label">Out of Stock</div>
                        <div className="stock-summary-amount">{outOfStock}</div>
                    </div>
                    <div className="stock-summary-card value">
                        <div className="stock-summary-label">Stock Value</div>
                        <div className="stock-summary-amount">₹{totalStockValue.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="stock-table-section">
                {stockFilter === "all" && filtered.length > 100 && (
                    <div style={{
                        background: "#e0f7fa",
                        color: "#006064",
                        border: "1px solid #b2ebf2",
                        borderRadius: "4px",
                        padding: "8px 12px",
                        marginBottom: "10px",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        ℹ️ <strong>Display optimized:</strong> Showing the top 100 products out of {filtered.length} matching items. Use the search box above to narrow down results.
                    </div>
                )}
                <table className="stock-retro-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Product Name</th>
                            <th style={{ width: "5%" }}>Distributor Code</th>
                            <th>Distributor Name</th>
                            <th>Stock</th>
                            <th>Cost Price</th>
                            <th>MRP</th>
                            <th>Sell Price</th>
                            <th>Stock Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="stock-loading">
                                    ⏳ Loading products...
                                </td>
                            </tr>
                        ) : displayedProducts.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="stock-empty-state">
                                    📭 No products found
                                </td>
                            </tr>
                        ) : groupByDistributor && groupedProducts ? (
                            groupedProducts.map((group, gIdx) => {
                                const groupTotalStock = group.items.reduce((s, p) => s + p.stock, 0);
                                const groupTotalValue = group.items.reduce((s, p) => s + (p.costPrice * p.stock), 0);
                                return (
                                    <Fragment key={gIdx}>
                                        <tr style={{ backgroundColor: "#e2e8f0", color: "#1e293b", fontWeight: "bold" }}>
                                            <td colSpan={9} style={{ padding: "10px 12px", textAlign: "left", fontSize: "14px" }}>
                                                🏢 {group.distributorName} {group.distributorId ? `(Code: ${group.distributorId})` : ""} 
                                                <span style={{ fontWeight: "normal", marginLeft: "15px", fontSize: "12px", color: "#475569" }}>
                                                    — {group.items.length} Products | Total Stock: {groupTotalStock} | Total Value: ₹{groupTotalValue.toFixed(2)}
                                                </span>
                                            </td>
                                        </tr>
                                        {group.items.map(p => (
                                            <tr
                                                key={p.id}
                                                style={p.stock <= 0 ? { backgroundColor: '#fef2f2' } : p.stock <= 10 ? { backgroundColor: '#fffbeb' } : {}}
                                            >
                                                <td>{p.id}</td>
                                                <td>
                                                    <strong>{p.name}</strong>
                                                </td>
                                                <td style={{ textAlign: "center", color: "black" }}>{p.distributorId || "—"}</td>
                                                <td>{p.distributorName || "—"}</td>
                                                <td style={{ fontWeight: 700, color: p.stock <= 0 ? "#dc2626" : p.stock <= 10 ? "#f59e0b" : "#16a34a" }}>
                                                    {p.stock}
                                                </td>
                                                <td>₹{p.costPrice.toFixed(2)}</td>
                                                <td>₹{p.mrp.toFixed(2)}</td>
                                                <td>₹{p.price.toFixed(2)}</td>
                                                <td>₹{(p.costPrice * p.stock).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </Fragment>
                                );
                            })
                        ) : (
                            displayedProducts.map(p => (
                                <tr
                                    key={p.id}
                                    style={p.stock <= 0 ? { backgroundColor: '#fef2f2' } : p.stock <= 10 ? { backgroundColor: '#fffbeb' } : {}}
                                >
                                    <td>{p.id}</td>
                                    <td>
                                        <strong>{p.name}</strong>
                                    </td>
                                    <td style={{ textAlign: "center", color: "black" }}>{p.distributorId || "—"}</td>
                                    <td>{p.distributorName || "—"}</td>
                                    <td style={{ fontWeight: 700, color: p.stock <= 0 ? "#dc2626" : p.stock <= 10 ? "#f59e0b" : "#16a34a" }}>
                                        {p.stock}
                                    </td>
                                    <td>₹{p.costPrice.toFixed(2)}</td>
                                    <td>₹{p.mrp.toFixed(2)}</td>
                                    <td>₹{p.price.toFixed(2)}</td>
                                    <td>₹{(p.costPrice * p.stock).toFixed(2)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
