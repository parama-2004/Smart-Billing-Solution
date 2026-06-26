import { useState, useMemo, useDeferredValue } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useShops, useStockTransfers, useInvalidateStockTransfers } from "../../hooks/useShops";
import { useProducts } from "../../hooks/useProducts";
import { createStockTransfer } from "../../api/shopApi";
import { getCurrentDateTime } from "../../utils/dateUtils";
import ProductSearchModal from "../../components/ProductSearchModal";
import type { ProductDto } from "../../models/Product";
import "../../Styles/GlobalLayout.css";

const todayStr = new Date().toISOString().split('T')[0];

const emptyForm = {
    transferDate: todayStr,
    productId: null as number | null,
    productName: "",
    productStock: 0,
    quantity: "",
    transferType: "Out",
    shopId: ""
};

export default function StockTransferPage() {
    usePageTitle("Stock Transfer");
    const [form, setForm] = useState(emptyForm);
    const { data: shops = [] } = useShops();
    const { data: products = [] } = useProducts();
    const { data: transfers = [] } = useStockTransfers();
    const invalidateTransfers = useInvalidateStockTransfers();

    const [showProductSearch, setShowProductSearch] = useState(false);

    // Filters for grid
    const [filterDate, setFilterDate] = useState("");
    const [filterShop, setFilterShop] = useState("");
    const [filterType, setFilterType] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearch = useDeferredValue(searchQuery);

    const selectProduct = (p: ProductDto) => {
        setForm(prev => ({
            ...prev,
            productId: p.id,
            productName: p.name,
            productStock: p.stock
        }));
    };

    const submit = async () => {
        try {
            if (!form.productId) throw new Error("Please select a product");
            if (!form.quantity || Number(form.quantity) <= 0) throw new Error("Quantity must be greater than 0");
            if (!form.shopId) throw new Error("Please select a shop");
            
            // If transfer out, check if stock is sufficient
            if (form.transferType === "Out" && Number(form.quantity) > form.productStock) {
                toast.error(`Transfer quantity (${form.quantity}) exceeds current stock (${form.productStock}).`);
                return;
            }

            await createStockTransfer({
                transferDate: new Date(form.transferDate).toISOString(),
                productId: form.productId,
                quantity: Number(form.quantity),
                transferType: form.transferType,
                shopId: Number(form.shopId)
            });

            toast.success("Stock transfer recorded successfully!");
            invalidateTransfers();
            setForm(prev => ({ ...emptyForm, transferDate: prev.transferDate })); // keep date
        } catch (error: any) {
            toast.error(error.message || "Failed to save transfer");
        }
    };

    const filteredTransfers = useMemo(() => {
        return transfers.filter(t => {
            if (filterDate && !t.transferDate.startsWith(filterDate)) return false;
            if (filterShop && t.shopId.toString() !== filterShop) return false;
            if (filterType && t.transferType !== filterType) return false;
            
            if (deferredSearch) {
                const q = deferredSearch.toLowerCase();
                const matchesId = t.id.toString().includes(q);
                const matchesName = t.productName.toLowerCase().includes(q);
                const matchesBarcode = t.productBarcode?.toLowerCase().includes(q);
                if (!matchesId && !matchesName && !matchesBarcode) return false;
            }
            return true;
        });
    }, [transfers, filterDate, filterShop, filterType, deferredSearch]);

    return (
        <div className="retro-master-container">
            <div className="product-header-bar">
                <span>Stock Transfer - Smart Super Market</span>
                <span>{getCurrentDateTime()}</span>
            </div>

            <h2>Stock Transfer</h2>

            {showProductSearch && (
                <ProductSearchModal
                    products={products}
                    initialQuery={""}
                    onSelect={(p) => {
                        selectProduct(p);
                        setShowProductSearch(false);
                    }}
                    onClose={() => setShowProductSearch(false)}
                />
            )}

            <div className="product-form-section">
                <div className="form-grid">
                    <div className="form-group">
                        <label>Date *</label>
                        <input
                            type="date"
                            className="retro-input"
                            value={form.transferDate}
                            onChange={(e) => setForm({ ...form, transferDate: e.target.value })}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Product *</label>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                                className="retro-input"
                                placeholder="Search Product..."
                                value={form.productName}
                                readOnly
                                style={{ flex: 1, cursor: "pointer", background: "#f9f9f9" }}
                                onClick={() => setShowProductSearch(true)}
                            />
                            <button
                                type="button"
                                className="retro-btn small"
                                onClick={() => setShowProductSearch(true)}
                                title="Search product"
                            >
                                🔍
                            </button>
                        </div>
                        {form.productId && (
                            <div className="hint-text" style={{ color: '#0066cc', fontWeight: 'bold' }}>
                                Current Main Store Stock: {form.productStock}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Quantity *</label>
                        <input
                            type="number"
                            className="retro-input"
                            placeholder="0"
                            value={form.quantity}
                            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Transfer Type *</label>
                        <select
                            className="retro-select"
                            value={form.transferType}
                            onChange={(e) => setForm({ ...form, transferType: e.target.value })}
                        >
                            <option value="Out">OUT (Send to Shop)</option>
                            <option value="In">IN (Receive from Shop)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>From / To Shop *</label>
                        <select
                            className="retro-select"
                            value={form.shopId}
                            onChange={(e) => setForm({ ...form, shopId: e.target.value })}
                        >
                            <option value="">-- Select Shop --</option>
                            {shops.map(s => (
                                <option key={s.id} value={s.id}>{s.name} - {s.city}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="action-buttons">
                    <button
                        className="retro-btn primary"
                        onClick={submit}
                        disabled={!form.productId || !form.quantity || !form.shopId || !form.transferDate}
                    >
                        RECORD TRANSFER
                    </button>
                    <button className="retro-btn" onClick={() => setForm(prev => ({ ...emptyForm, transferDate: prev.transferDate }))}>
                        CLEAR
                    </button>
                </div>
            </div>

            {/* Transfers List */}
            <div className="search-section">
                <h3>Transfer History</h3>
                
                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <div className="search-box" style={{ flex: '1', minWidth: '200px' }}>
                        <label>Search:</label>
                        <input
                            className="retro-input"
                            placeholder="Search product..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="search-box">
                        <label>Date:</label>
                        <input
                            type="date"
                            className="retro-input"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                        />
                    </div>
                    <div className="search-box">
                        <label>Shop:</label>
                        <select
                            className="retro-select"
                            value={filterShop}
                            onChange={e => setFilterShop(e.target.value)}
                        >
                            <option value="">All Shops</option>
                            {shops.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="search-box">
                        <label>Type:</label>
                        <select
                            className="retro-select"
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value="In">In</option>
                            <option value="Out">Out</option>
                        </select>
                    </div>
                    {(filterDate || filterShop || filterType || searchQuery) && (
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button 
                                className="retro-btn small" 
                                onClick={() => { setFilterDate(""); setFilterShop(""); setFilterType(""); setSearchQuery(""); }}
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>

                <div className="product-grid-container" style={{ height: '350px', overflowY: 'auto' }}>
                    <table className="product-grid">
                        <thead>
                            <tr>
                                <th>Txn ID</th>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>Shop</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransfers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="no-data">No transfers found.</td>
                                </tr>
                            ) : (
                                filteredTransfers.map(t => (
                                    <tr key={t.id}>
                                        <td>{t.id}</td>
                                        <td>{new Date(t.transferDate).toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })}</td>
                                        <td>
                                            <span style={{ 
                                                fontWeight: 'bold', 
                                                color: t.transferType === 'In' ? 'green' : 'red' 
                                            }}>
                                                {t.transferType}
                                            </span>
                                        </td>
                                        <td>{t.productName}</td>
                                        <td>{t.quantity}</td>
                                        <td>{t.shopName}</td>
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
