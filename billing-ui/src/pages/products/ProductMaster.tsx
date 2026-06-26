import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import {
    createProduct,
    updateProduct,
} from "../../api/productApi";
import { useProducts, useInvalidateProducts } from "../../hooks/useProducts";
import type { CreateProductRequest } from "../../api/productApi";
import { getAllDistributorsCached } from "../../api/distributorApi";
import { getAllBrands, getAllCategories } from "../../api/masterApi";
import type { ProductDto } from "../../models/Product";
import type { DistributorDto } from "../../models/Distributor";
import type { BrandDto, CategoryDto } from "../../models/Master";
import DistributorSearchModal from "../../components/DistributorSearchModal";
import ProductSearchModal from "../../components/ProductSearchModal";
import "../../Styles/GlobalLayout.css";
import "../../Styles/ProductStyles.css";
import { getCurrentDateTime } from "../../utils/dateUtils";

const emptyForm = {
    id: null as number | null,
    name: "",
    price: "",
    mrp: "",
    costPrice: "",
    gstPercentage: "",
    stock: "",
    distributorId: "",
    distributorName: "",
    hsnCode: "",
    brandCode: "",
    categoryCode: ""
};

export default function ProductMaster() {
    usePageTitle("Product Master");
    const [form, setForm] = useState(emptyForm);
    const { data: products = [] } = useProducts();
    const invalidateProducts = useInvalidateProducts();
    const [distributors, setDistributors] = useState<DistributorDto[]>([]);
    const [brands, setBrands] = useState<BrandDto[]>([]);       // Added
    const [categories, setCategories] = useState<CategoryDto[]>([]); // Added
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    // useDeferredValue lets React keep the input instant and update results at lower priority
    const deferredSearch = useDeferredValue(debouncedSearch);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [showDistributorSearch, setShowDistributorSearch] = useState(false);
    const [showProductSearchModal, setShowProductSearchModal] = useState(false);
    const productNameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void (async () => {
                const [distributorsData, brandsData, categoriesData] = await Promise.all([
                    getAllDistributorsCached(),
                    getAllBrands(),
                    getAllCategories()
                ]);
                setDistributors(distributorsData);
                setBrands(brandsData);
                setCategories(categoriesData);
            })();
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    const loadData = async () => {
        const [distributorsData, brandsData, categoriesData] = await Promise.all([
            getAllDistributorsCached(),
            getAllBrands(),
            getAllCategories()
        ]);
        setDistributors(distributorsData);
        setBrands(brandsData);
        setCategories(categoriesData);
    };

    const selectProduct = (p: ProductDto) => {
        setForm({
            id: p.id,
            name: p.name,
            price: p.price.toString(),
            hsnCode: p.hsnCode || "",
            mrp: p.mrp.toString(),
            costPrice: p.costPrice.toString(),
            gstPercentage: p.gstPercentage.toString(),
            stock: p.stock.toString(),
            distributorId: p.distributorId.toString(),
            distributorName: p.distributorName,
            brandCode: p.brandCode || "",
            categoryCode: p.categoryCode || ""
        });
        setSelectedId(p.id);
    };

    const fetchDistributor = (id: number) => {
        const distributor = distributors.find(d => d.id === id);

        if (!distributor) {
            toast.error("Distributor not found");
            setForm(f => ({
                ...f,
                distributorId: "",
                distributorName: ""
            }));
            return;
        }

        setForm(f => ({
            ...f,
            distributorId: distributor.id.toString(),
            distributorName: distributor.name
        }));
    };

    const submit = async () => {
        try {
            const payload: CreateProductRequest = {
                name: form.name,
                price: Number(form.price),
                mrp: Number(form.mrp),
                costPrice: Number(form.costPrice),
                gstPercentage: Number(form.gstPercentage),
                stock: Number(form.stock),
                distributorId: Number(form.distributorId),
                hsnCode: form.hsnCode || null,
                brandCode: form.brandCode || null,
                categoryCode: form.categoryCode || null
            };

            if (form.id) {
                await updateProduct(form.id, payload);
                toast.success("Product updated successfully!");
            } else {
                const newProduct = await createProduct(payload);
                setForm(prev => ({ ...prev, id: newProduct.id }));
                setSelectedId(newProduct.id);
                toast.success("Product added successfully!");
            }
            invalidateProducts();
            await loadData();
        } catch (error: unknown) {
            toast.error(`Error saving product: ${error instanceof Error ? error.message : "Please check all fields"}`);
            console.error(error);
        }
    };

    const clearForm = () => {
        setForm(emptyForm);
        setSelectedId(null);
    };

    const focusProductName = () => {
        setTimeout(() => {
            productNameInputRef.current?.focus();
            productNameInputRef.current?.select();
        }, 100);
    };

    const submitRef = useRef(submit);
    const clearFormRef = useRef(clearForm);
    useEffect(() => {
        submitRef.current = submit;
        clearFormRef.current = clearForm;
    }, [submit, clearForm]);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                submitRef.current();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                clearFormRef.current();
                focusProductName();
            }
            if (e.key === '`') {
                e.preventDefault();
                setShowProductSearchModal(true);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const handleFormKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT' && target.tagName !== 'BUTTON') return;

        if (target.tagName === 'SELECT' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            return;
        }

        const formContainer = e.currentTarget;
        const focusableElements = Array.from(
            formContainer.querySelectorAll<HTMLElement>(
                'input:not([disabled]):not([readOnly]), select:not([disabled]), button:not([disabled])'
            )
        );

        const currentIndex = focusableElements.indexOf(target);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;

        if (e.key === 'Enter') {
            if (!e.defaultPrevented) {
                e.preventDefault();
                nextIndex = currentIndex + 1;
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            nextIndex = currentIndex + 1;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            nextIndex = currentIndex - 1;
        } else if (e.key === 'ArrowRight') {
            try {
                if (target.tagName === 'INPUT') {
                    const input = target as HTMLInputElement;
                    if (input.selectionStart === null || input.selectionStart === input.value.length) {
                        e.preventDefault();
                        nextIndex = currentIndex + 1;
                    }
                } else {
                    e.preventDefault();
                    nextIndex = currentIndex + 1;
                }
            } catch (err) {
                e.preventDefault();
                nextIndex = currentIndex + 1;
            }
        } else if (e.key === 'ArrowLeft') {
            try {
                if (target.tagName === 'INPUT') {
                    const input = target as HTMLInputElement;
                    if (input.selectionStart === null || input.selectionStart === 0) {
                        e.preventDefault();
                        nextIndex = currentIndex - 1;
                    }
                } else {
                    e.preventDefault();
                    nextIndex = currentIndex - 1;
                }
            } catch (err) {
                e.preventDefault();
                nextIndex = currentIndex - 1;
            }
        }

        if (nextIndex >= 0 && nextIndex < focusableElements.length && nextIndex !== currentIndex) {
            focusableElements[nextIndex].focus();
            if (focusableElements[nextIndex].tagName === 'INPUT') {
                setTimeout(() => {
                    try {
                        (focusableElements[nextIndex] as HTMLInputElement).select();
                    } catch (err) { }
                }, 0);
            }
        }
    };

    // --- Pre-build O(1) lookup maps for brand/category names ---
    const brandMap = useMemo(() =>
        new Map(brands.map(b => [b.brandCode, b.brandName.toLowerCase()])),
        [brands]
    );
    const categoryMap = useMemo(() =>
        new Map(categories.map(c => [c.categoryCode, c.categoryName.toLowerCase()])),
        [categories]
    );

    // --- Pre-index barcode values per product: productId -> Set<lowercased barcode values> ---
    const barcodeIndex = useMemo(() => {
        const map = new Map<number, Set<string>>();
        for (const p of products) {
            if (p.barcodes && p.barcodes.length > 0) {
                const vals = new Set(p.barcodes.map(b => b.barcodeValue.toLowerCase()));
                map.set(p.id, vals);
            }
        }
        return map;
    }, [products]);

    const MIN_QUERY_LEN = 2; // require at least 2 chars — single chars match almost everything

    const filtered = useMemo(() => {
        const q = deferredSearch.trim().toLowerCase();
        if (q.length < MIN_QUERY_LEN) return [];
        const results: typeof products = [];
        for (const p of products) {
            if (p.name.toLowerCase().includes(q)) { results.push(p); continue; }
            if (p.id.toString().includes(q)) { results.push(p); continue; }
            if (p.distributorName.toLowerCase().includes(q)) { results.push(p); continue; }
            const bcSet = barcodeIndex.get(p.id);
            if (bcSet) {
                let matched = false;
                for (const val of bcSet) { if (val.includes(q)) { matched = true; break; } }
                if (matched) { results.push(p); continue; }
            }
            if (p.brandCode) {
                if (p.brandCode.toLowerCase().includes(q) || brandMap.get(p.brandCode)?.includes(q)) {
                    results.push(p); continue;
                }
            }
            if (p.categoryCode) {
                if (p.categoryCode.toLowerCase().includes(q) || categoryMap.get(p.categoryCode)?.includes(q)) {
                    results.push(p); continue;
                }
            }
        }
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

        results.sort((a, b) => {
            const scoreA = getScore(a);
            const scoreB = getScore(b);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return a.name.localeCompare(b.name);
        });

        return results;
    }, [deferredSearch, products, barcodeIndex, brandMap, categoryMap]);

    const totalProducts = products.length;
    const { totalStock, totalValue } = useMemo(() => ({
        totalStock: products.reduce((s, p) => s + p.stock, 0),
        totalValue: products.reduce((s, p) => s + p.costPrice * p.stock, 0)
    }), [products]);

    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: filtered.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 45, // approximate row height
        overscan: 5,
    });

    const virtualItems = rowVirtualizer.getVirtualItems();

    return (
        <div className="retro-master-container">
            {/* Header */}
            <div className="product-header-bar">
                <span>Product Master - Smart Super Market</span>
                <span>{getCurrentDateTime()}</span>
            </div>

            <h2>Item / Product Master</h2>

            {showDistributorSearch && (
                <DistributorSearchModal
                    distributors={distributors}
                    onSelect={(distributor) => {
                        fetchDistributor(distributor.id);
                        setShowDistributorSearch(false);
                    }}
                    onClose={() => setShowDistributorSearch(false)}
                />
            )}

            {showProductSearchModal && (
                <ProductSearchModal
                    products={products}
                    initialQuery=""
                    onSelect={(product) => {
                        selectProduct(product);
                        setShowProductSearchModal(false);
                        focusProductName();
                    }}
                    onClose={() => {
                        setShowProductSearchModal(false);
                        focusProductName();
                    }}
                />
            )}

            {/* Form Section */}
            <div className="product-form-section">
                {/* ... existing form grid ... */}
                <div className="form-grid" onKeyDown={handleFormKeyDown}>

                    {/* ID Field */}
                    <div className="form-group">
                        <label>Product ID</label>
                        <input
                            className="retro-input"
                            disabled
                            placeholder="Auto"
                            value={form.id ? `P-${form.id.toString().padStart(4, '0')}` : "New Product"}
                        />
                    </div>
                    {/* Name Field */}
                    <div className="form-group">
                        <label>Product Name *</label>
                        <input
                            ref={productNameInputRef}
                            className="retro-input"
                            placeholder="Enter product name"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>

                    {/* Cost Price Field */}
                    <div className="form-group">
                        <label>Cost Price *</label>
                        <input
                            className="retro-input"
                            placeholder="0.00"
                            type="number"
                            step="0.01"
                            value={form.costPrice}
                            onChange={e => setForm({ ...form, costPrice: e.target.value })}
                        />
                    </div>

                    {/* GST Field */}
                    <div className="form-group">
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <label style={{ flex: 1 }}>GST Percentage</label>
                            <label style={{ width: "150px" }}>Total Cost</label>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                                className="retro-input"
                                placeholder="0"
                                type="number"
                                step="0.01"
                                value={form.gstPercentage}
                                onChange={e => setForm({ ...form, gstPercentage: e.target.value })}
                                style={{ flex: 1 }}
                            />
                            <input
                                className="retro-input"
                                style={{ width: "150px", textAlign: "center", backgroundColor: "#e9ecef", fontWeight: "bold" }}
                                readOnly
                                placeholder="Cost + GST"
                                title="Cost + GST Amount = Total Cost with GST"
                                value={(() => {
                                    const cost = parseFloat(form.costPrice) || 0;
                                    const gst = parseFloat(form.gstPercentage) || 0;
                                    if (cost <= 0) return "";
                                    const gstAmt = cost * (gst / 100);
                                    const total = cost + gstAmt;
                                    return `${total.toFixed(2)}`;
                                })()}
                            />
                        </div>
                    </div>

                    {/* Price Field */}
                    <div className="form-group">
                        <label>Selling Price *</label>
                        <input
                            className="retro-input"
                            placeholder="0.00"
                            type="number"
                            step="0.01"
                            value={form.price}
                            onChange={e => setForm({ ...form, price: e.target.value })}
                        />
                    </div>

                    {/* MRP Field */}
                    <div className="form-group">
                        <label>MRP *</label>
                        <input
                            className="retro-input"
                            placeholder="0.00"
                            type="number"
                            step="0.01"
                            value={form.mrp}
                            onChange={e => setForm({ ...form, mrp: e.target.value })}
                        />
                    </div>



                    {/* HSN Field */}
                    <div className="form-group">
                        <label>HSN / SAC Code</label>
                        <input
                            className="retro-input"
                            placeholder="e.g. 34011190"
                            value={form.hsnCode}
                            onChange={e => setForm({ ...form, hsnCode: e.target.value })}
                        />
                    </div>

                    {/* Stock Field */}
                    <div className="form-group">
                        <label>Stock Qty</label>
                        <input
                            className="retro-input"
                            placeholder="0"
                            type="number"
                            step="1"
                            value={form.stock}
                            onChange={e => setForm({ ...form, stock: e.target.value })}
                        />
                    </div>

                    {/* Brand Dropdown */}
                    <div className="form-group">
                        <label>Brand</label>
                        <select
                            className="retro-select"
                            value={form.brandCode}
                            onChange={e => setForm({ ...form, brandCode: e.target.value })}
                        >
                            <option value="">-- Select Brand --</option>
                            {brands
                                .filter(brand => brand.isActive)
                                .map(brand => (
                                    <option key={brand.id} value={brand.brandCode}>
                                        {brand.brandCode} - {brand.brandName}
                                    </option>
                                ))}
                        </select>
                        {form.brandCode && (
                            <div className="hint-text">
                                Selected: {brands.find(b => b.brandCode === form.brandCode)?.brandName}
                            </div>
                        )}
                    </div>

                    {/* Category Dropdown */}
                    <div className="form-group">
                        <label>Category</label>
                        <select
                            className="retro-select"
                            value={form.categoryCode}
                            onChange={e => setForm({ ...form, categoryCode: e.target.value })}
                        >
                            <option value="">-- Select Category --</option>
                            {categories
                                .filter(category => category.isActive)
                                .map(category => (
                                    <option key={category.id} value={category.categoryCode}>
                                        {category.categoryCode} - {category.categoryName}
                                    </option>
                                ))}
                        </select>
                        {form.categoryCode && (
                            <div className="hint-text">
                                Selected: {categories.find(c => c.categoryCode === form.categoryCode)?.categoryName}
                            </div>
                        )}
                    </div>

                    {/* Distributor ID */}
                    <div className="form-group">
                        <label>Distributor ID *</label>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                                className="retro-input"
                                placeholder="Enter ID and press Enter"
                                value={form.distributorId}
                                onChange={e => setForm({ ...form, distributorId: e.target.value })}
                                onKeyDown={e => {
                                    if (e.key === "Enter") {
                                        const id = Number(form.distributorId);
                                        if (id > 0) fetchDistributor(id);
                                    }
                                }}
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                className="retro-btn small"
                                onClick={() => setShowDistributorSearch(true)}
                                title="Search distributor"
                            >
                                🔍
                            </button>
                        </div>
                    </div>

                    {/* Distributor Name (display only) */}
                    <div className="form-group">
                        <label>Distributor Name</label>
                        <input
                            className="retro-input"
                            value={form.distributorName}
                            readOnly
                            placeholder="Auto filled"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button
                        className={`retro-btn ${form.id ? '' : 'primary'}`}
                        onClick={submit}
                        disabled={!form.name || !form.price || !form.distributorId}
                    >
                        {form.id ? <>UPDATE PRODUCT <sub>(Ctrl+S)</sub></> : <>ADD NEW PRODUCT <sub>(Ctrl+S)</sub></>}
                    </button>

                    {form.id && (
                        <button className="retro-btn" onClick={clearForm}>
                            CLEAR / NEW <sub>(Ctrl+N)</sub>
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Section */}
            <div className="summary-box">
                <div className="summary-item">
                    <span className="summary-label">Total Products</span>
                    <span className="summary-value">{totalProducts}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Total Stock</span>
                    <span className="summary-value">{totalStock.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Stock Value</span>
                    <span className="summary-value">₹{totalValue.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Active Brands</span>
                    <span className="summary-value">{brands.filter(b => b.isActive).length}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Active Categories</span>
                    <span className="summary-value">{categories.filter(c => c.isActive).length}</span>
                </div>
            </div>

            {/* Product List Section */}
            <div className="search-section">
                <div className="search-box">
                    <label>Search Products:</label>
                    <input
                        className="retro-input"
                        style={{ flex: 1 }}
                        placeholder="Search by ID, name, brand, category, distributor or barcode..."
                        value={search}
                        onChange={e => {
                            const v = e.target.value;
                            setSearch(v);
                            if (debounceRef.current) clearTimeout(debounceRef.current);
                            debounceRef.current = setTimeout(() => setDebouncedSearch(v), 300);
                        }}
                    />
                </div>

                <div
                    className="product-grid-container"
                    ref={parentRef}
                    style={{ height: '400px', overflowY: 'auto', overflowX: 'auto' }}
                >
                    {deferredSearch.trim().length < MIN_QUERY_LEN ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888', fontSize: '14px' }}>
                            <div style={{ fontSize: '36px', marginBottom: '10px', opacity: 0.4 }}>🔍</div>
                            <div>Type at least 2 characters to search.</div>
                            <div style={{ fontSize: '12px', marginTop: '6px', color: '#aaa' }}>{products.length} products available</div>
                        </div>
                    ) : (
                        <table className="product-grid">
                            <thead>
                                <tr>
                                    <th className="id-cell">ID</th>
                                    <th className="name-cell">Product Name</th>
                                    <th className="brand-cell">Brand</th>
                                    <th className="category-cell">Category</th>
                                    <th className="price-cell">Price</th>
                                    <th className="price-cell">MRP</th>
                                    <th className="price-cell">Cost</th>
                                    <th className="stock-cell">Stock</th>
                                    <th className="distributor-cell">Distributor</th>
                                    <th>GST %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {virtualItems.length > 0 && (
                                    <tr>
                                        <td colSpan={10} style={{ height: `${virtualItems[0].start}px`, padding: 0, border: 'none' }} />
                                    </tr>
                                )}
                                {virtualItems.length > 0 ? (
                                    virtualItems.map(virtualRow => {
                                        const p = filtered[virtualRow.index];
                                        return (
                                            <tr
                                                key={virtualRow.key}
                                                data-index={virtualRow.index}
                                                ref={rowVirtualizer.measureElement}
                                                onClick={() => selectProduct(p)}
                                                className={selectedId === p.id ? "selected" : ""}
                                            >
                                                <td className="id-cell">{p.id}</td>
                                                <td className="name-cell">
                                                    <strong>{p.name}</strong>
                                                    {p.barcodes && p.barcodes.length > 0 && (
                                                        <div style={{ fontSize: 11, color: '#666' }}>
                                                            Barcode(s): {p.barcodes.map(b => b.barcodeValue).join(', ') || "-"}
                                                        </div>
                                                    )}
                                                    {p.hsnCode && (
                                                        <div style={{ fontSize: 11, color: '#666' }}>
                                                            HSN: {p.hsnCode}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="brand-cell">
                                                    {p.brandCode ? (
                                                        <div className="brand-display">
                                                            <span className="brand-code">{p.brandCode}</span>
                                                            <div className="brand-name">
                                                                {brands.find(b => b.brandCode === p.brandCode)?.brandName || "-"}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#999', fontStyle: 'italic' }}>-</span>
                                                    )}
                                                </td>
                                                <td className="category-cell">
                                                    {p.categoryCode ? (
                                                        <div className="category-display">
                                                            <span className="category-code">{p.categoryCode}</span>
                                                            <div className="category-name">
                                                                {categories.find(c => c.categoryCode === p.categoryCode)?.categoryName || "-"}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#999', fontStyle: 'italic' }}>-</span>
                                                    )}
                                                </td>
                                                <td className="price-cell">₹{p.price.toFixed(2)}</td>
                                                <td className="price-cell">₹{p.mrp.toFixed(2)}</td>
                                                <td className="price-cell">₹{p.costPrice.toFixed(2)}</td>
                                                <td className="stock-cell">
                                                    <span style={{
                                                        color: p.stock < 10 ? 'red' :
                                                            p.stock < 50 ? 'orange' : 'green',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {p.stock}
                                                    </span>
                                                </td>
                                                <td className="distributor-cell">{p.distributorName}</td>
                                                <td>{p.gstPercentage}%</td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="no-data">
                                            No products found matching "{search}".
                                        </td>
                                    </tr>
                                )}
                                {virtualItems.length > 0 && (
                                    <tr>
                                        <td colSpan={10} style={{ height: `${rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end}px`, padding: 0, border: 'none' }} />
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Status Bar */}
            <div className="product-status-bar">
                <span className="status-item">
                    <strong>Status:</strong> {form.id ? "Editing Product" : "Adding New Product"}
                </span>
                <span className="status-item">
                    <strong>Selected:</strong> {selectedId ? `Product #${selectedId}` : "None"}
                </span>
                <span className="status-item">
                    <strong>Total:</strong> {products.length} products
                </span>
                <span className="status-item">
                    <strong>Brands:</strong> {brands.filter(b => b.isActive).length}
                </span>
                <span className="status-item">
                    <strong>Categories:</strong> {categories.filter(c => c.isActive).length}
                </span>
                <span className="status-item">
                    <strong>Last Updated:</strong> {new Date().toLocaleTimeString()}
                </span>
            </div>
        </div>
    );
}