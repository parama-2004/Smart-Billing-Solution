import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getAllInvoices } from "../../api/invoiceApi";
import type { InvoiceResponseDto } from "../../models/Invoice";
import { downloadCsv, downloadPdf } from "../../utils/reportExport";
import { getAllProductsCached } from "../../api/productApi";
import type { ProductDto } from "../../models/Product";
import ProductSearchModal from "../../components/ProductSearchModal";
import "../../Styles/ProfitByProductReport.css";

type DatePreset = "today" | "week" | "month" | "year" | "custom";

type ProductProfitRow = {
    productId: number;
    productName: string;
    barCode?: string | null;
    totalQty: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number; // %
    avgSellingPrice: number;
    costPriceUsed: number;
};

function getPresetDates(preset: DatePreset): { from: string; to: string } {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = fmt(now);

    if (preset === "today") return { from: today, to: today };
    if (preset === "week") {
        const day = now.getDay(); // 0=Sun
        const diff = day === 0 ? 6 : day - 1; // Mon-based
        const mon = new Date(now);
        mon.setDate(now.getDate() - diff);
        return { from: fmt(mon), to: today };
    }
    if (preset === "month") {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: fmt(first), to: today };
    }
    if (preset === "year") {
        const first = new Date(now.getFullYear(), 0, 1);
        return { from: fmt(first), to: today };
    }
    return { from: "", to: "" }; // custom: let user fill dates
}

export default function ProfitByProductReport() {
    usePageTitle("Profit by Product Report");
    const [invoices, setInvoices] = useState<InvoiceResponseDto[]>([]);
    const [products, setProducts] = useState<ProductDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [preset, setPreset] = useState<DatePreset>("today");
    const [fromDate, setFromDate] = useState<string>(() => getPresetDates("today").from);
    const [toDate, setToDate] = useState<string>(() => getPresetDates("today").to);
    const [showProductModal, setShowProductModal] = useState(false);
    const [selectedProductFilter, setSelectedProductFilter] = useState<ProductDto | null>(null);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const [allInvoices, allProducts] = await Promise.all([
                getAllInvoices(),
                getAllProductsCached()
            ]);
            setInvoices(allInvoices.filter(i => i.status !== "Cancelled"));
            setProducts(allProducts);
        } catch {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const applyPreset = (p: DatePreset) => {
        setPreset(p);
        if (p !== "custom") {
            const { from, to } = getPresetDates(p);
            setFromDate(from);
            setToDate(to);
        }
    };

    // Build profit rows per product
    const productProfitRows = useMemo<ProductProfitRow[]>(() => {
        const dateFiltered = invoices.filter(inv => {
            const matchFrom = !fromDate || new Date(inv.date) >= new Date(fromDate);
            const matchTo = !toDate || new Date(inv.date) <= new Date(toDate + "T23:59:59");
            return matchFrom && matchTo;
        });

        const map = new Map<number, ProductProfitRow>();

        for (const inv of dateFiltered) {
            for (const item of inv.items) {
                const product = products.find(p => p.id === item.productId);
                const costPrice = product?.costPrice ?? 0;
                const barCode = product?.barcodes?.map(b => b.barcodeValue).join(", ") || undefined;
                const qty = Math.abs(item.quantity);
                const revenue = item.lineTotal; // can be negative for returns
                const cost = costPrice * qty * (item.quantity < 0 ? -1 : 1);

                const existing = map.get(item.productId);
                if (existing) {
                    existing.totalQty += item.quantity;
                    existing.totalRevenue += revenue;
                    existing.totalCost += cost;
                    existing.grossProfit = existing.totalRevenue - existing.totalCost;
                } else {
                    map.set(item.productId, {
                        productId: item.productId,
                        productName: item.productName,
                        barCode,
                        totalQty: item.quantity,
                        totalRevenue: revenue,
                        totalCost: cost,
                        grossProfit: revenue - cost,
                        profitMargin: 0,
                        avgSellingPrice: 0,
                        costPriceUsed: costPrice
                    });
                }
            }
        }

        return Array.from(map.values())
            .map(r => ({
                ...r,
                avgSellingPrice: r.totalQty !== 0 ? r.totalRevenue / r.totalQty : 0,
                profitMargin: r.totalRevenue !== 0 ? (r.grossProfit / r.totalRevenue) * 100 : 0
            }))
            .sort((a, b) => b.grossProfit - a.grossProfit)
            .slice(0, 100);
    }, [invoices, fromDate, toDate, products]);

    // Apply product filter + search
    const filteredRows = useMemo(() => {
        let results = productProfitRows;

        if (selectedProductFilter) {
            results = results.filter(r => r.productId === selectedProductFilter.id);
        }

        const q = search.toLowerCase().trim();
        if (q) {
            results = results.filter(r =>
                r.productName.toLowerCase().includes(q) ||
                r.barCode?.toLowerCase().includes(q)
            );
        }

        return results;
    }, [productProfitRows, search, selectedProductFilter]);

    // Summary totals
    const totalRevenue = filteredRows.reduce((s, r) => s + r.totalRevenue, 0);
    const totalCost = filteredRows.reduce((s, r) => s + r.totalCost, 0);
    const totalProfit = filteredRows.reduce((s, r) => s + r.grossProfit, 0);
    const overallMargin = totalRevenue !== 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const handleProductSelected = (product: ProductDto) => {
        setSelectedProductFilter(product);
        setShowProductModal(false);
        toast.success(`Filtered by: ${product.name}`);
    };

    const clearProductFilter = () => setSelectedProductFilter(null);

    const handleDownloadCsv = () => {
        downloadCsv(
            "profit-by-product-report",
            ["#", "Product", "Barcode", "Qty Sold", "Cost Price", "Total Cost", "Total Revenue", "Gross Profit", "Margin %"],
            filteredRows.map((r, i) => [
                i + 1,
                r.productName,
                r.barCode || "-",
                r.totalQty,
                r.costPriceUsed.toFixed(2),
                r.totalCost.toFixed(2),
                r.totalRevenue.toFixed(2),
                r.grossProfit.toFixed(2),
                r.profitMargin.toFixed(1) + "%"
            ])
        );
    };

    const handleDownloadPdf = () => {
        downloadPdf(
            "profit-by-product-report",
            "Profit by Product Report",
            ["#", "Product", "Qty", "Cost", "Revenue", "Profit", "Margin"],
            filteredRows.map((r, i) => [
                i + 1,
                r.productName,
                r.totalQty.toString(),
                r.totalCost.toFixed(2),
                r.totalRevenue.toFixed(2),
                r.grossProfit.toFixed(2),
                r.profitMargin.toFixed(1) + "%"
            ]),
            [
                `Date Range: ${fromDate || "All"} → ${toDate || "All"}`,
                `Products Listed: ${filteredRows.length}`,
                `Total Revenue: ₹${totalRevenue.toFixed(2)}`,
                `Total Cost: ₹${totalCost.toFixed(2)}`,
                `Gross Profit: ₹${totalProfit.toFixed(2)}`,
                `Overall Margin: ${overallMargin.toFixed(1)}%`
            ]
        );
    };

    const presetLabels: { key: DatePreset; label: string }[] = [
        { key: "today", label: "Today" },
        { key: "week", label: "This Week" },
        { key: "month", label: "This Month" },
        { key: "year", label: "This Year" },
        { key: "custom", label: "Custom" }
    ];

    return (
        <div className="pbp-container">
            {/* Header */}
            <div className="pbp-header">
                <span>📊 Profit by Product Report</span>
                <span>{new Date().toLocaleDateString("en-IN")}</span>
            </div>

            {/* Product Search Modal */}
            {showProductModal && (
                <ProductSearchModal
                    products={products}
                    initialQuery={selectedProductFilter?.name || ""}
                    onSelect={handleProductSelected}
                    onClose={() => setShowProductModal(false)}
                />
            )}

            {/* Date Preset Tabs */}
            <div className="pbp-preset-tabs">
                {presetLabels.map(({ key, label }) => (
                    <button
                        key={key}
                        className={`pbp-preset-btn${preset === key ? " active" : ""}`}
                        onClick={() => applyPreset(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="pbp-filters-section">
                <div className="pbp-filters-grid">
                    <div className="pbp-filter-group">
                        <label>From Date</label>
                        <input
                            type="date"
                            className="pbp-input"
                            value={fromDate}
                            onChange={e => { setFromDate(e.target.value); setPreset("custom"); }}
                        />
                    </div>
                    <div className="pbp-filter-group">
                        <label>To Date</label>
                        <input
                            type="date"
                            className="pbp-input"
                            value={toDate}
                            onChange={e => { setToDate(e.target.value); setPreset("custom"); }}
                        />
                    </div>
                    <div className="pbp-filter-group">
                        <label>Search Product / Barcode</label>
                        <input
                            className="pbp-input"
                            placeholder="Product name or barcode…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="pbp-filter-group">
                        <label>Filter by Product</label>
                        <button
                            className="pbp-input pbp-pick-btn"
                            onClick={() => setShowProductModal(true)}
                            style={{ background: selectedProductFilter ? "#166534" : undefined, color: selectedProductFilter ? "#fff" : undefined }}
                        >
                            {selectedProductFilter ? `✓ ${selectedProductFilter.name}` : "🔍 Choose Product"}
                        </button>
                        {selectedProductFilter && (
                            <button className="pbp-input pbp-clear-btn" onClick={clearProductFilter}>
                                ✕ Clear Filter
                            </button>
                        )}
                    </div>
                    <div className="pbp-filter-group pbp-export-group">
                        <label>Export</label>
                        <div className="pbp-export-btns">
                            <button className="pbp-input" onClick={handleDownloadPdf} disabled={filteredRows.length === 0}>
                                📄 PDF
                            </button>
                            <button className="pbp-input" onClick={handleDownloadCsv} disabled={filteredRows.length === 0}>
                                📊 CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="pbp-summary-section">
                <div className="pbp-summary-grid">
                    <div className="pbp-card pbp-card-blue">
                        <div className="pbp-card-label">Products Listed</div>
                        <div className="pbp-card-value">{filteredRows.length}</div>
                    </div>
                    <div className="pbp-card pbp-card-blue">
                        <div className="pbp-card-label">Total Revenue</div>
                        <div className="pbp-card-value">₹{totalRevenue.toFixed(2)}</div>
                    </div>
                    <div className="pbp-card pbp-card-orange">
                        <div className="pbp-card-label">Total Cost</div>
                        <div className="pbp-card-value">₹{totalCost.toFixed(2)}</div>
                    </div>
                    <div className={`pbp-card ${totalProfit >= 0 ? "pbp-card-green" : "pbp-card-red"}`}>
                        <div className="pbp-card-label">Gross Profit</div>
                        <div className="pbp-card-value">₹{totalProfit.toFixed(2)}</div>
                    </div>
                    <div className={`pbp-card ${overallMargin >= 0 ? "pbp-card-green" : "pbp-card-red"}`}>
                        <div className="pbp-card-label">Overall Margin</div>
                        <div className="pbp-card-value">{overallMargin.toFixed(1)}%</div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="pbp-table-section">
                <table className="pbp-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Product</th>
                            <th>Barcode</th>
                            <th>Qty Sold</th>
                            <th>Cost Price</th>
                            <th>Total Cost</th>
                            <th>Total Revenue</th>
                            <th>Gross Profit</th>
                            <th>Margin %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="pbp-loading">⏳ Loading data…</td>
                            </tr>
                        ) : filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="pbp-empty">📭 No data for the selected period</td>
                            </tr>
                        ) : (
                            filteredRows.map((r, i) => {
                                const isLoss = r.grossProfit < 0;
                                return (
                                    <tr key={r.productId} className={isLoss ? "pbp-row-loss" : ""}>
                                        <td>{i + 1}</td>
                                        <td className="pbp-product-name"><strong>{r.productName}</strong></td>
                                        <td className="pbp-barcode">{r.barCode || "-"}</td>
                                        <td>{r.totalQty}</td>
                                        <td>₹{r.costPriceUsed.toFixed(2)}</td>
                                        <td>₹{r.totalCost.toFixed(2)}</td>
                                        <td>₹{r.totalRevenue.toFixed(2)}</td>
                                        <td
                                            className={isLoss ? "pbp-profit-loss" : "pbp-profit-gain"}
                                        >
                                            {isLoss ? "" : "+"}₹{r.grossProfit.toFixed(2)}
                                        </td>
                                        <td>
                                            <span className={`pbp-margin-badge ${isLoss ? "loss" : r.profitMargin >= 20 ? "high" : "mid"}`}>
                                                {r.profitMargin.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                {!loading && filteredRows.length > 0 && (
                    <div className="pbp-footer-note">
                        Showing top {filteredRows.length} products by gross profit · Cost price taken from current product master
                    </div>
                )}
            </div>
        </div>
    );
}
