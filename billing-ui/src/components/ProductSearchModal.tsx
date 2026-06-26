import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductDto } from "../models/Product";
import type { BarcodeMasterDto } from "../models/Barcode";

export interface ProductSearchResult {
    product: ProductDto;
    barcode?: BarcodeMasterDto;
}

interface Props {
    products: ProductDto[];
    initialQuery: string;
    onSelect: (product: ProductDto, barcode?: BarcodeMasterDto) => void;
    onClose: () => void;
}

const ProductSearchModal = ({
    products,
    initialQuery,
    onSelect,
    onClose
}: Props) => {
    const MAX_RESULTS = 150; // cap DOM nodes for performance

    const computeResults = useCallback((q: string, pQ: string): ProductSearchResult[] => {
        const searchTerm = q.trim().toLowerCase();
        const priceTerm = pQ.trim();
        
        if (!searchTerm && !priceTerm) return [];

        const filtered: ProductSearchResult[] = [];
        for (const p of products) {
            if (filtered.length >= MAX_RESULTS) break;
            
            if (p.barcodes && p.barcodes.length > 0) {
                const numericSearch = Number(searchTerm);
                const isNumeric = searchTerm ? !isNaN(numericSearch) : false;

                for (const b of p.barcodes) {
                    let matchesPrice = true;
                    if (priceTerm) {
                        matchesPrice = String(b.mrp) === priceTerm || String(b.mrp).startsWith(priceTerm);
                    }
                    if (!matchesPrice) continue;

                    let matchesMeta = true;
                    if (searchTerm) {
                        const matchesBarcode = b.barcodeValue.toLowerCase().includes(searchTerm);
                        const isMetaMatch =
                            (isNumeric && p.id === numericSearch) ||
                            p.id.toString() === searchTerm ||
                            p.name.toLowerCase().includes(searchTerm) ||
                            (p.hsnCode?.toLowerCase().includes(searchTerm) ?? false);
                        matchesMeta = matchesBarcode || isMetaMatch;
                    }
                    
                    if (matchesMeta) {
                        filtered.push({ product: p, barcode: b });
                        if (filtered.length >= MAX_RESULTS) break;
                    }
                }
            } else {
                let matchesPrice = true;
                if (priceTerm) {
                    matchesPrice = String(p.mrp) === priceTerm || String(p.mrp).startsWith(priceTerm);
                }
                if (!matchesPrice) continue;

                let matchesMeta = true;
                if (searchTerm) {
                    const numericSearch = Number(searchTerm);
                    const isNumeric = !isNaN(numericSearch);
                    matchesMeta =
                        (isNumeric && p.id === numericSearch) ||
                        p.id.toString() === searchTerm ||
                        p.name.toLowerCase().includes(searchTerm) ||
                        (p.hsnCode?.toLowerCase().includes(searchTerm) ?? false);
                }
                if (matchesMeta) {
                    filtered.push({ product: p });
                }
            }
        }

        const numericSearch = Number(searchTerm);
        const isNumeric = searchTerm ? !isNaN(numericSearch) : false;

        return filtered.sort((a, b) => {
            const aExactBarcode = a.barcode?.barcodeValue === searchTerm;
            const bExactBarcode = b.barcode?.barcodeValue === searchTerm;
            if (aExactBarcode && !bExactBarcode) return -1;
            if (!aExactBarcode && bExactBarcode) return 1;

            const aExactId = (isNumeric && a.product.id === numericSearch) || a.product.id.toString() === searchTerm;
            const bExactId = (isNumeric && b.product.id === numericSearch) || b.product.id.toString() === searchTerm;
            if (aExactId && !bExactId) return -1;
            if (!aExactId && bExactId) return 1;

            const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const safeTerm = escapeRegExp(searchTerm);
            const exactRegex = new RegExp(`^${safeTerm}$`, 'i');
            const startRegex = new RegExp(`^${safeTerm}`, 'i');
            const wordRegex = new RegExp(`\\b${safeTerm}`, 'i');

            const getScore = (name: string) => {
                if (exactRegex.test(name)) return 4;
                if (startRegex.test(name)) return 3;
                if (wordRegex.test(name)) return 2;
                if (name.toLowerCase().includes(searchTerm)) return 1;
                return 0;
            };

            const scoreA = getScore(a.product.name);
            const scoreB = getScore(b.product.name);

            if (scoreA !== scoreB) {
                return scoreB - scoreA;
            }

            return a.product.name.localeCompare(b.product.name);
        });
    }, [products]);

    const [query, setQuery] = useState(initialQuery);
    const [priceQuery, setPriceQuery] = useState("");
    const [activeInput, setActiveInput] = useState<'search' | 'price'>('search');
    const [results, setResults] = useState<ProductSearchResult[]>(() => computeResults(initialQuery, ""));
    const [activeIndex, setActiveIndex] = useState(results.length > 0 ? 0 : -1);
    const inputRef = useRef<HTMLInputElement>(null);
    const priceInputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const performSearch = (q: string, pQ: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            const sorted = computeResults(q, pQ);
            setResults(sorted);
            setActiveIndex(sorted.length > 0 ? 0 : -1);
        }, 120);
    };

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (activeIndex >= 0 && resultsRef.current) {
            const items = resultsRef.current.querySelectorAll('.result-row');
            if (items[activeIndex]) {
                items[activeIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [activeIndex]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            e.preventDefault();
            onClose();
            return;
        }

        if (e.key === "ArrowRight" && e.currentTarget === inputRef.current) {
            if (inputRef.current?.selectionStart === inputRef.current?.value.length) {
                e.preventDefault();
                priceInputRef.current?.focus();
                setTimeout(() => priceInputRef.current?.select(), 0);
                return;
            }
        }

        if (e.key === "ArrowLeft" && e.currentTarget === priceInputRef.current) {
            if (priceInputRef.current?.selectionStart === 0) {
                e.preventDefault();
                inputRef.current?.focus();
                setTimeout(() => inputRef.current?.select(), 0);
                return;
            }
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex(i => {
                const newIndex = i < results.length - 1 ? i + 1 : 0;
                return newIndex;
            });
            return;
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex(i => {
                const newIndex = i > 0 ? i - 1 : results.length - 1;
                return newIndex;
            });
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
            if (results[activeIndex]) {
                onSelect(results[activeIndex].product, results[activeIndex].barcode);
            }
            return;
        }
    };

    const handleRowClick = (item: ProductSearchResult, index: number) => {
        setActiveIndex(index);
        onSelect(item.product, item.barcode);
    };

    // Helper functions removed as we now display one row per barcode

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                {/* Header Bar */}
                <div style={headerStyle}>
                    <div style={headerTitleStyle}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>🔍</span>
                        <span style={{ marginLeft: '8px' }}>PRODUCT SEARCH</span>
                    </div>
                    <button
                        onClick={onClose}
                        style={closeButtonStyle}
                        title="Close (Esc)"
                    >
                        ✕
                    </button>
                </div>

                {/* Search Input */}
                <div style={inputContainerStyle}>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            performSearch(e.target.value, priceQuery);
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setActiveInput('search')}
                        placeholder="Search by barcode, ID, name, or HSN code..."
                        style={{
                            ...inputStyle,
                            width: '80%',
                            borderRight: 'none',
                            outline: activeInput === 'search' ? '2px solid black' : 'none',
                            backgroundColor: activeInput === 'search' ? '#e6f7ff' : '#ffffff'
                        }}
                    />
                    <input
                        ref={priceInputRef}
                        value={priceQuery}
                        onChange={e => {
                            setPriceQuery(e.target.value);
                            performSearch(query, e.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setActiveInput('price')}
                        placeholder="MRP"
                        style={{
                            ...inputStyle,
                            width: '20%',
                            borderLeft: '1px solid #ccc',
                            outline: activeInput === 'price' ? '2px solid black' : 'none',
                            backgroundColor: activeInput === 'price' ? '#e6f7ff' : '#ffffff'
                        }}
                    />
                </div>

                {/* Results Table */}
                <div style={resultsContainerStyle}>
                    {results.length > 0 ? (
                        <div ref={resultsRef} style={tableContainerStyle}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={{ ...thStyle, width: '5%' }}>#</th>
                                        <th style={{ ...thStyle, textAlign: 'left', width: '35%' }}>PRODUCT NAME</th>
                                        <th style={{ ...thStyle, textAlign: 'center', width: '15%' }}>BARCODE</th>
                                        <th style={{ ...thStyle, textAlign: 'right', width: '15%' }}>MRP</th>
                                        <th style={{ ...thStyle, textAlign: 'right', width: '15%' }}>PRICE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((item, i) => {
                                        const p = item.product;
                                        const b = item.barcode;

                                        return (
                                            <tr
                                                key={`${p.id}-${b ? b.id : 'base'}`}
                                                className="result-row"
                                                style={{
                                                    ...rowStyle,
                                                    background: i === activeIndex ? '#000075' :
                                                        i % 2 === 0 ? '#F5F0F0' : '#ffffff',
                                                    color: i === activeIndex ? '#ffffff' : '#000000',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => handleRowClick(item, i)}
                                                onMouseEnter={() => setActiveIndex(i)}
                                            >
                                                <td style={tdStyle}>
                                                    <div style={{
                                                        display: 'inline-block',
                                                        textAlign: 'center',
                                                        color: i === activeIndex ? '#ffffff' : '#000000',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {i + 1}
                                                    </div>
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 'bold', fontFamily: "'Courier New', monospace" }}>
                                                    {p.name}
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'Courier New', monospace" }}>
                                                    <span style={{
                                                        color: i === activeIndex ? '#ffffff' : '#000000'
                                                    }}>
                                                        {b ? b.barcodeValue : '-'}
                                                    </span>
                                                </td>

                                                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Courier New', monospace" }}>
                                                    <span style={{
                                                        color: i === activeIndex ? '#ffffff' : '#666666',
                                                    }}>
                                                        <strong>  ₹{(b ? b.mrp : p.mrp).toFixed(2)}</strong>
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Courier New', monospace" }}>
                                                    <span style={{
                                                        color: i === activeIndex ? '#ffffff' : '#000078',
                                                        fontWeight: 'bold',
                                                        fontSize: '13px'
                                                    }}>
                                                        ₹{(b ? b.price : p.price).toFixed(2)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Duplicate Barcode Warning */}
                            {/*{results.some(p => hasDuplicateBarcode(p)) && (*/}
                            {/*    <div style={{*/}
                            {/*        marginTop: '10px',*/}
                            {/*        padding: '8px',*/}
                            {/*        backgroundColor: '#fff3e0',*/}
                            {/*        border: '1px solid #ff9800',*/}
                            {/*        borderRadius: '4px',*/}
                            {/*        fontSize: '11px',*/}
                            {/*        color: '#e65100'*/}
                            {/*    }}>*/}
                            {/*        ⚠ <strong>Warning:</strong> Some barcodes have multiple products.*/}
                            {/*        Items with orange border have duplicate barcodes.*/}
                            {/*    </div>*/}
                            {/*)}*/}
                        </div>
                    ) : query ? (
                        <div style={noResultsStyle}>
                            <div style={{ fontSize: '48px', marginBottom: '10px', opacity: 0.3 }}>📦</div>
                            <div style={{ color: '#666666', fontSize: '14px', marginBottom: '5px' }}>
                                No products found
                            </div>
                            <div style={{ color: '#999999', fontSize: '12px' }}>
                                Try searching by barcode, ID, or product name
                            </div>
                        </div>
                    ) : (
                        <div style={noResultsStyle}>
                            <div style={{ fontSize: '48px', marginBottom: '10px', opacity: 0.3 }}>🔍</div>
                            <div style={{ color: '#666666', fontSize: '14px', marginBottom: '5px' }}>
                                Enter search terms above
                            </div>
                            <div style={{ color: '#999999', fontSize: '12px' }}>
                                Search by: Barcode, Product ID, Name, or HSN Code
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Stats */}
                <div style={footerStyle}>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                        <span>Total Products: {products.length}</span>
                        {query && results.length > 0 && (
                            <span style={{ marginLeft: '15px' }}>
                                Showing: {results.length}{results.length >= MAX_RESULTS ? ` (top ${MAX_RESULTS})` : ''} results
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Styles (same as before with minor adjustments)


//const hintStyle: React.CSSProperties = {
//    marginTop: '6px',
//    textAlign: 'left'
//};


export default ProductSearchModal;

/* ---------- Retro Windows Styling ---------- */

const overlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    fontFamily: "'Tahoma', 'Verdana', sans-serif",
    fontSize: '12px'
};

const modalStyle: React.CSSProperties = {
    background: "#f0f0f0",
    width: "700px",
    minHeight: "500px",
    border: "3px solid",
    borderColor: "#ffffff #808080 #808080 #ffffff",
    boxShadow: "6px 6px 10px rgba(0, 0, 0, 0.3)",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden"
};

const headerStyle: React.CSSProperties = {
    //background: "linear-gradient(to bottom, #7857ab 0%, #7564ac 100%)",
    background: "linear-gradient(to bottom, #000080 0%, #000055 100%)",

    color: "#ffffff",
    padding: "8px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "2px solid #808080",
    fontWeight: "bold",
    fontSize: "13px",
    letterSpacing: "0.5px",
    textShadow: "1px 1px 1px rgba(0, 0, 0, 0.5)"
};

const headerTitleStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center"
};

const closeButtonStyle: React.CSSProperties = {
    background: "#000085",
    border: "2px solid",
    borderColor: "#ffffff #808080 #808080 #ffffff",
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
    color: "#ffffff",
    lineHeight: "1",
    padding: "0",
    margin: "0",
    boxSizing: "border-box"
};

const inputContainerStyle: React.CSSProperties = {
    padding: "0",
    background: "#ffffff",
    margin: "5px",
    border: "2px solid",
    borderColor: "#808080 #ffffff #ffffff #808080",
    position: "relative",
    display: "flex",
    flexDirection: "row"
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    border: "2px solid",
    borderColor: "#808080 #ffffff #ffffff #808080",
    fontFamily: "'Tahoma', sans-serif",
    fontSize: "13px",
    background: "#ffffff",
    color: "#000080",
    boxSizing: "border-box",
    outline: "none",
    fontWeight: "bold"
};

//const hintTextStyle: React.CSSProperties = {
//    fontSize: "10px",
//    color: "#666666",
//    marginTop: "5px",
//    fontStyle: "italic",
//    textAlign: "center"
//};

const resultsContainerStyle: React.CSSProperties = {
    flex: 1,
    margin: "0 10px 10px 10px",
    background: "#ffffff",
    border: "2px solid",
    borderColor: "#808080 #ffffff #ffffff #808080",
    minHeight: "300px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
};

const tableContainerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: "auto",
    maxHeight: "350px"
};

const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    borderSpacing: 0,
    tableLayout: "fixed"
};

const thStyle: React.CSSProperties = {
    background: "linear-gradient(to bottom, #424242 0%, #212121 100%)",
    color: "#ffffff",
    padding: "8px 10px",
    fontSize: "11px",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    border: "1px solid #616161",
    borderStyle: "outset",
    position: "sticky",
    top: 0,
    zIndex: 10,
    textAlign: "center"
};

const rowStyle: React.CSSProperties = {
    height: "36px",
    transition: "background-color 0.1s ease",
    borderBottom: "1px solid #e0e0e0"
};

const tdStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: "15px",
    fontWeight: "bold",
    verticalAlign: "middle"
};

const noResultsStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px"
};

const footerStyle: React.CSSProperties = {
    padding: "8px 15px",
    background: "#c0c0c0",
    borderTop: "2px solid #808080",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid",
    borderColor: "#ffffff #808080 #808080 #ffffff",
    margin: "0 10px 10px 10px"
};

//const keyStyle: React.CSSProperties = {
//    display: "inline-block",
//    background: "#f0f0f0",
//    border: "1px solid",
//    borderColor: "#808080 #ffffff #ffffff #808080",
//    padding: "1px 5px",
//    margin: "0 2px",
//    fontSize: "10px",
//    fontFamily: "'Courier New', monospace",
//    fontWeight: "bold"
//};