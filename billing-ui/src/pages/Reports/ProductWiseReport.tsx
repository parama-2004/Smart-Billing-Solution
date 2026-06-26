import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getAllInvoices } from "../../api/invoiceApi";
import type { InvoiceResponseDto } from "../../models/Invoice";
import { downloadCsv, downloadPdf } from "../../utils/reportExport";
import { getAllProductsCached } from "../../api/productApi";
import type { ProductDto } from "../../models/Product";
import ProductSearchModal from "../../components/ProductSearchModal";
import "../../Styles/ProductWiseReport.css";

type BillItemRow = {
    billNumber: string;
    billId: number;
    billDate: string;
    customerName: string;
    productId: number;
    productName: string;
    barCode?: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
};

type ProductSaleRow = {
    productId: number;
    productName: string;
    barCode?: string | null;
    totalQty: number;
    totalRevenue: number;
    avgPrice: number;
};

export default function ProductWiseReport() {
    usePageTitle("Product Wise Report");
    const [invoices, setInvoices] = useState<InvoiceResponseDto[]>([]);
    const [products, setProducts] = useState<ProductDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [viewMode, setViewMode] = useState<"aggregated" | "detailed">("aggregated");
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
        } catch { toast.error("Failed to load data"); }
        finally { setLoading(false); }
    };

    // Detailed view: Show each bill with products sold
    const billItemRows = useMemo(() => {
        const dateFiltered = invoices.filter(inv => {
            const matchFrom = !fromDate || new Date(inv.date) >= new Date(fromDate);
            const matchTo = !toDate || new Date(inv.date) <= new Date(toDate + "T23:59:59");
            return matchFrom && matchTo;
        });

        const rows: BillItemRow[] = [];
        for (const inv of dateFiltered) {
            for (const item of inv.items) {
                const product = products.find(p => p.id === item.productId);
                const barcodeCodes = product?.barcodes?.map(b => b.barcodeValue).join(', ') || undefined;
                rows.push({
                    billNumber: inv.invoiceNumber,
                    billId: inv.id,
                    billDate: new Date(inv.date).toLocaleDateString("en-IN"),
                    customerName: inv.customerName || "Walk-in",
                    productId: item.productId,
                    productName: item.productName,
                    barCode: barcodeCodes,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    lineTotal: item.lineTotal
                });
            }
        }
        return rows;
    }, [invoices, fromDate, toDate, products]);

    // Aggregated view: Summarize by product
    const productRows = useMemo(() => {
        const dateFiltered = invoices.filter(inv => {
            const matchFrom = !fromDate || new Date(inv.date) >= new Date(fromDate);
            const matchTo = !toDate || new Date(inv.date) <= new Date(toDate + "T23:59:59");
            return matchFrom && matchTo;
        });

        const map = new Map<number, ProductSaleRow>();
        for (const inv of dateFiltered) {
            for (const item of inv.items) {
                const product = products.find(p => p.id === item.productId);
                const barcodeCodes = product?.barcodes?.map(b => b.barcodeValue).join(', ') || undefined;
                const existing = map.get(item.productId);
                if (existing) {
                    existing.totalQty += item.quantity;
                    existing.totalRevenue += item.lineTotal;
                } else {
                    map.set(item.productId, {
                        productId: item.productId,
                        productName: item.productName,
                        barCode: barcodeCodes,
                        totalQty: item.quantity,
                        totalRevenue: item.lineTotal,
                        avgPrice: 0
                    });
                }
            }
        }

        const rows = Array.from(map.values()).map(r => ({
            ...r,
            avgPrice: r.totalQty !== 0 ? r.totalRevenue / r.totalQty : 0
        }));

        rows.sort((a, b) => b.totalRevenue - a.totalRevenue);
        return rows;
    }, [invoices, fromDate, toDate, products]);

    // Filter based on product selection
    const filteredBillItems = useMemo(() => {
        let results = billItemRows;

        if (selectedProductFilter) {
            results = results.filter(r => r.productId === selectedProductFilter.id);
        }

        const q = search.toLowerCase().trim();
        if (q) {
            results = results.filter(r =>
                r.billNumber.toLowerCase().includes(q) ||
                r.productName.toLowerCase().includes(q) ||
                r.barCode?.toLowerCase().includes(q) ||
                r.customerName.toLowerCase().includes(q)
            );
        }

        return results;
    }, [billItemRows, search, selectedProductFilter]);

    const filteredProducts = useMemo(() => {
        let results = productRows;

        if (selectedProductFilter) {
            results = results.filter(p => p.productId === selectedProductFilter.id);
        }

        const q = search.toLowerCase().trim();
        if (q) {
            results = results.filter(r =>
                r.productName.toLowerCase().includes(q) ||
                r.barCode?.toLowerCase().includes(q)
            );
        }

        return results;
    }, [productRows, search, selectedProductFilter]);

    const totalRevenue = viewMode === "detailed"
        ? filteredBillItems.reduce((s, r) => s + r.lineTotal, 0)
        : filteredProducts.reduce((s, r) => s + r.totalRevenue, 0);

    const totalQty = viewMode === "detailed"
        ? filteredBillItems.reduce((s, r) => s + r.quantity, 0)
        : filteredProducts.reduce((s, r) => s + r.totalQty, 0);

    const downloadReportCsv = () => {
        if (viewMode === "detailed") {
            downloadCsv("product-wise-report-detailed", 
                ["Bill Number", "Date", "Customer", "Product", "Barcode", "Qty", "Unit Price", "Total"], 
                filteredBillItems.map(r => [
                    r.billNumber,
                    r.billDate,
                    r.customerName,
                    r.productName,
                    r.barCode || "-",
                    r.quantity,
                    r.unitPrice,
                    r.lineTotal
                ]));
        } else {
            downloadCsv("product-wise-report", ["Product", "Barcode", "Qty Sold", "Avg Price", "Total Revenue"], 
                filteredProducts.map(r => [
                    r.productName,
                    r.barCode || "-",
                    r.totalQty,
                    r.avgPrice,
                    r.totalRevenue
                ]));
        }
    };

    const downloadReportPdf = () => {
        if (viewMode === "detailed") {
            downloadPdf(
                "product-wise-report-detailed",
                "Product Wise Report (Detailed by Bill)",
                ["Bill Number", "Date", "Customer", "Product", "Barcode", "Qty", "Unit Price", "Total"],
                filteredBillItems.map(r => [
                    r.billNumber,
                    r.billDate,
                    r.customerName,
                    r.productName,
                    r.barCode || "-",
                    r.quantity.toString(),
                    r.unitPrice.toFixed(2),
                    r.lineTotal.toFixed(2)
                ]),
                [
                    `Total Bills: ${new Set(filteredBillItems.map(r => r.billId)).size}`,
                    `Total Qty: ${totalQty}`,
                    `Total Revenue: ₹${totalRevenue.toFixed(2)}`
                ]
            );
        } else {
            downloadPdf(
                "product-wise-report",
                "Product Wise Report",
                ["Product", "Barcode", "Qty Sold", "Avg Price", "Total Revenue"],
                filteredProducts.map(r => [
                    r.productName,
                    r.barCode || "-",
                    r.totalQty.toString(),
                    r.avgPrice.toFixed(2),
                    r.totalRevenue.toFixed(2)
                ]),
                [
                    `Unique Products: ${filteredProducts.length}`,
                    `Total Qty Sold: ${totalQty}`,
                    `Total Revenue: ₹${totalRevenue.toFixed(2)}`
                ]
            );
        }
    };

    const handleProductSelected = (product: ProductDto) => {
        setSelectedProductFilter(product);
        setShowProductModal(false);
        toast.success(`Filtered by: ${product.name}`);
    };

    const clearProductFilter = () => {
        setSelectedProductFilter(null);
    };

    return (
        <div className="product-wise-report-container">
            {/* Header */}
            <div className="product-wise-report-header">
                <span>Product Wise Sales Report</span>
                <span>{new Date().toLocaleDateString("en-IN")}</span>
            </div>

            {/* View Mode Toggle */}
            <div className="product-wise-view-mode">
                <button 
                    className={`retro-btn ${viewMode === "aggregated" ? "primary" : ""}`}
                    onClick={() => setViewMode("aggregated")}
                >
                    Aggregated View
                </button>
                <button 
                    className={`retro-btn ${viewMode === "detailed" ? "primary" : ""}`}
                    onClick={() => setViewMode("detailed")}
                >
                    Detailed by Bill
                </button>
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

            {/* Filters Section */}
            <div className="product-wise-filters-section">
                <div className="product-wise-filters-grid">
                    <div className="product-wise-filter-group">
                        <label>From Date</label>
                        <input
                            type="date"
                            className="product-wise-report-input"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                        />
                    </div>
                    <div className="product-wise-filter-group">
                        <label>To Date</label>
                        <input
                            type="date"
                            className="product-wise-report-input"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                        />
                    </div>
                    <div className="product-wise-filter-group">
                        <label>Search {viewMode === "detailed" ? "(Bill/Product/Barcode/Customer)" : "(Product/Barcode)"}</label>
                        <input
                            className="product-wise-report-input"
                            placeholder={viewMode === "detailed" ? "Bill#, Product, Barcode, Customer" : "Product name or barcode"}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="product-wise-filter-group">
                        <label>Filter by Product</label>
                        <button 
                            className="product-wise-report-input" 
                            onClick={() => setShowProductModal(true)}
                            style={{ backgroundColor: selectedProductFilter ? "#4CAF50" : "#f0f0f0" }}
                        >
                            {selectedProductFilter ? `✓ ${selectedProductFilter.name}` : "🔍 Choose Product"}
                        </button>
                        {selectedProductFilter && (
                            <button 
                                className="product-wise-report-input" 
                                onClick={clearProductFilter}
                                style={{ marginTop: "4px", backgroundColor: "#ff6b6b" }}
                            >
                                Clear Filter
                            </button>
                        )}
                    </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="product-wise-report-input" onClick={downloadReportPdf} disabled={viewMode === "detailed" ? filteredBillItems.length === 0 : filteredProducts.length === 0}>Download PDF</button>
                    <button className="product-wise-report-input" onClick={downloadReportCsv} disabled={viewMode === "detailed" ? filteredBillItems.length === 0 : filteredProducts.length === 0}>Download CSV</button>
                </div>
                </div>
            </div>

            {/* Summary Section */}
            <div className="product-wise-summary-section">
                <div className="product-wise-summary-grid">
                    {viewMode === "detailed" ? (
                        <>
                            <div className="product-wise-summary-card quantity">
                                <div className="product-wise-summary-label">Total Bills</div>
                                <div className="product-wise-summary-amount">{new Set(filteredBillItems.map(r => r.billId)).size}</div>
                            </div>
                            <div className="product-wise-summary-card quantity">
                                <div className="product-wise-summary-label">Total Items Sold</div>
                                <div className="product-wise-summary-amount">{filteredBillItems.length}</div>
                            </div>
                            <div className="product-wise-summary-card quantity">
                                <div className="product-wise-summary-label">Total Qty</div>
                                <div className="product-wise-summary-amount">{totalQty}</div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="product-wise-summary-card quantity">
                                <div className="product-wise-summary-label">Unique Products Sold</div>
                                <div className="product-wise-summary-amount">{filteredProducts.length}</div>
                            </div>
                            <div className="product-wise-summary-card quantity">
                                <div className="product-wise-summary-label">Total Qty Sold</div>
                                <div className="product-wise-summary-amount">{totalQty}</div>
                            </div>
                        </>
                    )}
                    <div className="product-wise-summary-card revenue">
                        <div className="product-wise-summary-label">Total Revenue</div>
                        <div className="product-wise-summary-amount">₹{totalRevenue.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="product-wise-table-section">
                {viewMode === "detailed" ? (
                    <table className="product-wise-retro-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Bill Number</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Product</th>
                                <th>Barcode</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="product-wise-loading">
                                        ⏳ Loading data...
                                    </td>
                                </tr>
                            ) : filteredBillItems.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="product-wise-empty-state">
                                        📭 No data available
                                    </td>
                                </tr>
                            ) : (
                                filteredBillItems.map((r, i) => (
                                    <tr key={`${r.billId}-${r.productId}-${i}`}>
                                        <td>{i + 1}</td>
                                        <td><strong>{r.billNumber}</strong></td>
                                        <td>{r.billDate}</td>
                                        <td>{r.customerName}</td>
                                        <td><strong>{r.productName}</strong></td>
                                        <td style={{ fontSize: "10px", fontFamily: "monospace" }}>{r.barCode || "-"}</td>
                                        <td style={{ textAlign: "center" }}>{r.quantity}</td>
                                        <td style={{ textAlign: "right" }}>₹{r.unitPrice.toFixed(2)}</td>
                                        <td style={{ fontWeight: 600, color: r.lineTotal < 0 ? "#dc2626" : "#16a34a", textAlign: "right" }}>
                                            ₹{r.lineTotal.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="product-wise-retro-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Product</th>
                                <th>Barcode</th>
                                <th>Qty Sold</th>
                                <th>Avg Price</th>
                                <th>Total Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="product-wise-loading">
                                        ⏳ Loading data...
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="product-wise-empty-state">
                                        📭 No data available
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((r, i) => (
                                    <tr key={r.productId}>
                                        <td>{i + 1}</td>
                                        <td>
                                            <strong>{r.productName}</strong>
                                        </td>
                                        <td style={{ fontSize: "10px", fontFamily: "monospace" }}>{r.barCode || "-"}</td>
                                        <td>{r.totalQty}</td>
                                        <td>₹{r.avgPrice.toFixed(2)}</td>
                                        <td style={{ fontWeight: 600, color: r.totalRevenue < 0 ? "#dc2626" : "#16a34a" }}>
                                            ₹{r.totalRevenue.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
