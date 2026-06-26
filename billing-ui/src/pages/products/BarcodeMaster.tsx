import { useEffect, useState, useMemo, useRef } from "react";
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useProducts, useInvalidateProducts } from "../../hooks/useProducts";
import {
    getAllBarcodes,
    createBarcode,
    updateBarcode,
    deleteBarcode
} from "../../api/barcodeApi";
import type { ProductDto } from "../../models/Product";
import type { BarcodeMasterDto, CreateBarcodeRequest, UpdateBarcodeRequest } from "../../models/Barcode";
import { getCurrentDateTime } from "../../utils/dateUtils";
import ProductSearchModal from "../../components/ProductSearchModal";

import "../../Styles/GlobalLayout.css";
import "../../Styles/ProductStyles.css";

export default function BarcodeMaster() {
    usePageTitle("Barcode Master");

    const { data: products = [] } = useProducts();
    const invalidateProducts = useInvalidateProducts();
    const [barcodes, setBarcodes] = useState<BarcodeMasterDto[]>([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showProductSearchModal, setShowProductSearchModal] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    // Form state for adding/editing barcodes
    const [newBarcodeValue, setNewBarcodeValue] = useState("");
    const [barcodePrice, setBarcodePrice] = useState("");
    const [barcodeMrp, setBarcodeMrp] = useState("");
    const [barcodeCostPrice, setBarcodeCostPrice] = useState("");
    const [barcodeGst, setBarcodeGst] = useState("");
    const [editingBarcodeId, setEditingBarcodeId] = useState<number | null>(null);

    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const clearProduct = () => {
        setSelectedProductId(null);
        resetForm();
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const barcodesData = await getAllBarcodes();
            setBarcodes(barcodesData || []);
        } catch (error) {
            console.error("Failed to load data:", error);
            toast.error("Failed to load data");
            setBarcodes([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectProduct = (p: ProductDto) => {
        setSelectedProductId(p.id);
        setEditingBarcodeId(null);
        resetForm();

        // Set default values from product
        setBarcodePrice(p.price.toString());
        setBarcodeMrp(p.mrp.toString());
        setBarcodeCostPrice(p.costPrice.toString());
        setBarcodeGst(p.gstPercentage.toString());

        setTimeout(() => {
            if (barcodeInputRef.current) {
                barcodeInputRef.current.focus();
            }
        }, 100);
    };

    const resetForm = () => {
        setNewBarcodeValue("");
        setEditingBarcodeId(null);
    };

    const handleAddBarcode = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!selectedProductId) {
            toast.warning("Please select a product first");
            return;
        }

        if (!newBarcodeValue.trim()) {
            toast.warning("Please enter a barcode value");
            return;
        }

        try {
            const price = parseFloat(barcodePrice) || 0;
            const mrp = parseFloat(barcodeMrp) || 0;
            const costPrice = parseFloat(barcodeCostPrice) || 0;

            if (price < 0 || mrp < 0 || costPrice < 0) {
                toast.error("Prices cannot be negative");
                return;
            }

            if (editingBarcodeId) {
                const request: UpdateBarcodeRequest = {
                    barcodeValue: newBarcodeValue.trim(),
                    price,
                    mrp,
                    costPrice,
                    gstPercentage: parseFloat(barcodeGst) || 0,
                    variant: null,
                    batchNumber: null,
                    isActive: true
                };
                await updateBarcode(editingBarcodeId, request);
                toast.success("Barcode updated successfully!");
            } else {
                const request: CreateBarcodeRequest = {
                    barcodeValue: newBarcodeValue.trim(),
                    productId: selectedProductId,
                    price,
                    mrp,
                    costPrice,
                    gstPercentage: parseFloat(barcodeGst) || 0,
                    variant: null,
                    batchNumber: null
                };
                await createBarcode(request);
                toast.success("Barcode added successfully!");
            }

            invalidateProducts();
            await loadData();
            resetForm();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to save barcode";
            toast.error(message);
        }
    };

    const handleEditBarcode = (barcode: BarcodeMasterDto) => {
        setEditingBarcodeId(barcode.id);
        setNewBarcodeValue(barcode.barcodeValue);
        setBarcodePrice(barcode.price.toString());
        setBarcodeMrp(barcode.mrp.toString());
        setBarcodeCostPrice(barcode.costPrice.toString());
        setBarcodeGst(barcode.gstPercentage.toString());

        setTimeout(() => {
            if (barcodeInputRef.current) {
                barcodeInputRef.current.focus();
            }
        }, 100);
    };

    const handleDeleteBarcode = async (barcodeId: number) => {
        try {
            await deleteBarcode(barcodeId);
            toast.success("Barcode deleted successfully!");
            await loadData();
            resetForm();
            setConfirmDeleteId(null);
        } catch (error) {
            console.error("Failed to delete barcode:", error);
            toast.error("Failed to delete barcode");
            setConfirmDeleteId(null);
        }
    };

    const submitRef = useRef(handleAddBarcode);
    const clearFormRef = useRef(resetForm);
    const clearProductRef = useRef(clearProduct);

    useEffect(() => {
        submitRef.current = handleAddBarcode;
        clearFormRef.current = resetForm;
        clearProductRef.current = clearProduct;
    });

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === '`') {
                e.preventDefault();
                setShowProductSearchModal(true);
            }
            if (e.ctrlKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                submitRef.current();
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                clearFormRef.current();
                setTimeout(() => barcodeInputRef.current?.focus(), 100);
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                clearProductRef.current();
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
                    } catch (err) {}
                }, 0);
            }
        }
    };

    // --- Build O(1) barcode lookup map: productId -> barcode[] ---
    const barcodesByProductId = useMemo(() => {
        const map = new Map<number, BarcodeMasterDto[]>();
        for (const b of barcodes) {
            const list = map.get(b.productId);
            if (list) list.push(b);
            else map.set(b.productId, [b]);
        }
        return map;
    }, [barcodes]);

    // Filter products using the prebuilt map — O(products) not O(products × barcodes)
    const filteredProducts = useMemo(() => {
        const query = debouncedSearch.trim().toLowerCase();
        if (!query) return [];

        const filtered = products.filter(p => {
            if (p.id.toString() === query) return true;
            if (p.name.toLowerCase().includes(query)) return true;
            const pBarcodes = barcodesByProductId.get(p.id);
            if (pBarcodes) {
                for (const b of pBarcodes) {
                    if (b.isActive && b.barcodeValue.toLowerCase().includes(query)) return true;
                }
            }
            return false;
        });

        const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const safeTerm = escapeRegExp(query);
        const exactRegex = new RegExp(`^${safeTerm}$`, 'i');
        const startRegex = new RegExp(`^${safeTerm}`, 'i');
        const wordRegex = new RegExp(`\\b${safeTerm}`, 'i');

        const getScore = (p: ProductDto) => {
            if (p.id.toString() === query) return 5;
            if (exactRegex.test(p.name)) return 4;
            if (startRegex.test(p.name)) return 3;
            if (wordRegex.test(p.name)) return 2;
            if (p.name.toLowerCase().includes(query)) return 1;
            return 0;
        };

        filtered.sort((a, b) => {
            const scoreA = getScore(a);
            const scoreB = getScore(b);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return a.name.localeCompare(b.name);
        });

        return filtered;
    }, [debouncedSearch, products, barcodesByProductId]);

    // O(1) lookups using the prebuilt map
    const selectedProduct = products.find(p => p.id === selectedProductId);
    const selectedProductBarcodes = selectedProductId
        ? (barcodesByProductId.get(selectedProductId) ?? []).filter(b => b.isActive)
        : [];

    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: filteredProducts.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 45, // approximate row height
        overscan: 5,
    });
    const virtualItems = rowVirtualizer.getVirtualItems();

    return (
        <div className="retro-master-container">
            {/* Header */}
            <div className="product-header-bar">
                <span>Barcode Master - Smart Super Market</span>
                <span>{getCurrentDateTime()}</span>
            </div>

            <h2>Barcode Master</h2>

            {showProductSearchModal && (
                <ProductSearchModal
                    products={products}
                    initialQuery=""
                    onSelect={(product) => {
                        handleSelectProduct(product);
                        setShowProductSearchModal(false);
                    }}
                    onClose={() => {
                        setShowProductSearchModal(false);
                    }}
                />
            )}

            {/* Form Section */}
            <div className="product-form-section">
                <div className="form-grid" onKeyDown={handleFormKeyDown}>
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                        <label>Selected Product</label>
                        <input
                            className="retro-input readonly"
                            value={selectedProduct ? `${selectedProduct.id} - ${selectedProduct.name}` : "Search and select a product below..."}
                            readOnly
                            style={{ backgroundColor: "#e9ecef" }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Cost Price (₹) *</label>
                        <input
                            type="number"
                            className="retro-input"
                            value={barcodeCostPrice}
                            onChange={(e) => setBarcodeCostPrice(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            disabled={!selectedProductId}
                        />
                    </div>

                    <div className="form-group">
                        <label>GST (%) *</label>
                        <input
                            type="number"
                            className="retro-input"
                            value={barcodeGst}
                            onChange={(e) => setBarcodeGst(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            disabled={!selectedProductId}
                        />
                    </div>

                    <div className="form-group">
                        <label>Selling Price (₹) *</label>
                        <input
                            type="number"
                            className="retro-input"
                            value={barcodePrice}
                            onChange={(e) => setBarcodePrice(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            disabled={!selectedProductId}
                        />
                    </div>

                    <div className="form-group">
                        <label>MRP (₹) *</label>
                        <input
                            type="number"
                            className="retro-input"
                            value={barcodeMrp}
                            onChange={(e) => setBarcodeMrp(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            disabled={!selectedProductId}
                        />
                    </div>

                    <div className="form-group">
                        <label>Barcode Value *</label>
                        <input
                            ref={barcodeInputRef}
                            className="retro-input"
                            value={newBarcodeValue}
                            onChange={(e) => setNewBarcodeValue(e.target.value)}
                            placeholder="Enter barcode value"
                            disabled={!selectedProductId}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddBarcode();
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button
                        className={`retro-btn ${editingBarcodeId ? '' : 'primary'}`}
                        onClick={() => handleAddBarcode()}
                        disabled={!selectedProductId || !newBarcodeValue.trim()}
                    >
                        {editingBarcodeId ? <>UPDATE BARCODE <sub>(Ctrl+S)</sub></> : <>ADD BARCODE <sub>(Ctrl+S)</sub></>}
                    </button>

                    <button
                        className="retro-btn"
                        onClick={() => {
                            resetForm();
                            if (!selectedProductId) {
                                setSelectedProductId(null);
                            }
                        }}
                    >
                        CLEAR FORM <sub>(Ctrl+N)</sub>
                    </button>
                    {selectedProductId && (
                        <button
                            className="retro-btn"
                            onClick={clearProduct}
                        >
                            CLEAR PRODUCT <sub>(Ctrl+C)</sub>
                        </button>
                    )}
                </div>

                {/* Existing Barcodes List for the selected product */}
                {selectedProductBarcodes.length > 0 && (
                    <div style={{ marginTop: "20px" }}>
                        <h3 style={{ fontSize: "16px", marginBottom: "10px", color: "#333", borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>
                            Existing Barcodes for {selectedProduct?.name} ({selectedProductBarcodes.length})
                        </h3>
                        <div className="product-grid-container" style={{ maxHeight: "200px" }}>
                            <table className="product-grid">
                                <thead>
                                    <tr>
                                        <th>Item Code</th>
                                        <th>Barcode</th>
                                        <th>Item Desc</th>
                                        <th>Sale Price</th>
                                        <th>Cost Price</th>
                                        <th>MRP</th>
                                        <th>GST %</th>
                                        <th style={{ width: '15%' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProductBarcodes.map((bc) => (
                                        <tr key={bc.id}>
                                            <td>{bc.productId}</td>
                                            <td><strong>{bc.barcodeValue}</strong></td>
                                            <td>{selectedProduct?.name}</td>
                                            <td>₹{bc.price.toFixed(2)}</td>
                                            <td>₹{bc.costPrice.toFixed(2)}</td>
                                            <td>₹{bc.mrp.toFixed(2)}</td>
                                            <td>{bc.gstPercentage || 0}%</td>
                                            <td>
                                                <button
                                                    className="retro-btn small"
                                                    style={{ marginRight: '5px' }}
                                                    onClick={() => handleEditBarcode(bc)}
                                                >
                                                    Edit
                                                </button>
                                                {confirmDeleteId === bc.id ? (
                                                    <>
                                                        <button
                                                            className="retro-btn small danger"
                                                            style={{ marginRight: '5px' }}
                                                            onClick={() => handleDeleteBarcode(bc.id)}
                                                        >
                                                            Yes
                                                        </button>
                                                        <button
                                                            className="retro-btn small"
                                                            onClick={() => setConfirmDeleteId(null)}
                                                        >
                                                            No
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        className="retro-btn small danger"
                                                        onClick={() => setConfirmDeleteId(bc.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Product List Section (Search Results) */}
            <div className="search-section">
                <div className="search-box">
                    <label>Search Product to Add/Edit Barcodes:</label>
                    <input
                        ref={searchInputRef}
                        className="retro-input"
                        style={{ flex: 1 }}
                        placeholder="Search by Barcode, ID, or Name..."
                        value={search}
                        onChange={e => {
                            const v = e.target.value;
                            setSearch(v);
                            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                            searchDebounceRef.current = setTimeout(() => setDebouncedSearch(v), 250);
                        }}
                    />
                </div>

                <div 
                    className="product-grid-container" 
                    ref={parentRef} 
                    style={{ height: '400px', overflowY: 'auto', overflowX: 'auto' }}
                >
                    <table className="product-grid">
                        <thead>
                            <tr>
                                <th className="id-cell">ID</th>
                                <th className="name-cell">Product Name</th>
                                <th>Barcodes</th>
                                <th>MRP</th>
                                <th>Price</th>
                                <th style={{ width: '10%' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="no-data">Loading products...</td>
                                </tr>
                            ) : search.trim() === "" ? (
                                <tr>
                                    <td colSpan={4} className="no-data">
                                        Please enter a search term (barcode, ID, or name) to find products.
                                    </td>
                                </tr>
                            ) : virtualItems.length > 0 ? (
                                <>
                                    {virtualItems.length > 0 && (
                                        <tr>
                                            <td colSpan={4} style={{ height: `${virtualItems[0].start}px`, padding: 0, border: 'none' }} />
                                        </tr>
                                    )}
                                    {virtualItems.map(virtualRow => {
                                        const p = filteredProducts[virtualRow.index];
                                        const productBarcodes = (barcodesByProductId.get(p.id) ?? []).filter(b => b.isActive);
                                        return (
                                            <tr
                                                key={virtualRow.key}
                                                data-index={virtualRow.index}
                                                ref={rowVirtualizer.measureElement}
                                                onClick={() => handleSelectProduct(p)}
                                                className={selectedProductId === p.id ? "selected" : ""}
                                            >
                                                <td className="id-cell">{p.id}</td>
                                                <td className="name-cell"><strong>{p.name}</strong></td>
                                                <td>
                                                    {productBarcodes.length > 0 ? (
                                                        <span style={{ color: '#0066cc', fontWeight: 'bold' }}>
                                                            {productBarcodes.map(b => b.barcodeValue).join(", ")}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#999', fontStyle: 'italic' }}>No Barcodes</span>
                                                    )}
                                                </td>
                                                <td>₹{p.mrp}</td>
                                                <td>₹{p.price}</td>
                                                <td>
                                                    <button
                                                        className="retro-btn small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSelectProduct(p);
                                                        }}
                                                    >
                                                        Select
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {virtualItems.length > 0 && (
                                        <tr>
                                            <td colSpan={4} style={{ height: `${rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end}px`, padding: 0, border: 'none' }} />
                                        </tr>
                                    )}
                                </>
                            ) : (
                                <tr>
                                    <td colSpan={4} className="no-data">
                                        No products found matching "{search}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Status Bar */}
            <div className="product-status-bar">
                <span className="status-item">
                    <strong>Status:</strong> {editingBarcodeId ? "Editing Barcode" : selectedProductId ? "Adding New Barcode" : "Ready"}
                </span>
                <span className="status-item">
                    <strong>Selected Product:</strong> {selectedProductId ? `#${selectedProductId}` : "None"}
                </span>
                <span className="status-item">
                    <strong>Total Barcodes:</strong> {barcodes.length}
                </span>
                <span className="status-item">
                    <strong>Last Updated:</strong> {new Date().toLocaleTimeString()}
                </span>
            </div>
        </div>
    );
}
