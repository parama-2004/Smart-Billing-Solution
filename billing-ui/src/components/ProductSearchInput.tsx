import { useEffect, useState, useRef } from "react";
import type { ProductDto } from "../models/Product";

interface Props {
    products: ProductDto[];
    onSelect: (product: ProductDto) => void;
}

const ProductSearchInput = ({ products, onSelect }: Props) => {
    const [query, setQuery] = useState("");
    const [priceQuery, setPriceQuery] = useState("");
    const [activeInput, setActiveInput] = useState<'search' | 'price'>('search');
    const [results, setResults] = useState<ProductDto[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const priceInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!query && !priceQuery) {
            setResults([]);
            return;
        }

        const q = query.toLowerCase();
        const pQ = priceQuery.trim();

        const filtered = products.filter(
            p => {
                let matchesPrice = true;
                if (pQ) {
                    matchesPrice = String(p.mrp) === pQ || String(p.mrp).startsWith(pQ);
                }
                if (!matchesPrice) return false;

                if (q) {
                    return p.name.toLowerCase().includes(q) || p.id.toString().startsWith(q);
                }
                return true;
            }
        );

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

        const sorted = filtered.sort((a, b) => {
            const scoreA = getScore(a);
            const scoreB = getScore(b);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return a.name.localeCompare(b.name);
        });

        setResults(sorted.slice(0, 6));
        setActiveIndex(0);
    }, [query, priceQuery, products]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

        if (!results.length) return;

        if (e.key === "ArrowDown") {
            setActiveIndex(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            onSelect(results[activeIndex]);
            setQuery("");
            setResults([]);
        }
    };

    return (
        <div style={{ position: "relative" }}>
            <div style={{ display: 'flex', width: 200, border: '1px solid #ccc', background: 'white' }}>
                <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setActiveInput('search')}
                    placeholder="ID/Name"
                    style={{
                        width: '80%',
                        border: 'none',
                        padding: '2px 4px',
                        outline: activeInput === 'search' ? '2px solid black' : 'none',
                        backgroundColor: activeInput === 'search' ? '#e6f7ff' : '#ffffff'
                    }}
                />
                <input
                    ref={priceInputRef}
                    value={priceQuery}
                    onChange={e => setPriceQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setActiveInput('price')}
                    placeholder="MRP"
                    style={{
                        width: '20%',
                        border: 'none',
                        borderLeft: '1px solid #ccc',
                        padding: '2px 4px',
                        outline: activeInput === 'price' ? '2px solid black' : 'none',
                        backgroundColor: activeInput === 'price' ? '#e6f7ff' : '#ffffff'
                    }}
                />
            </div>

            {results.length > 0 && (
                <div
                    style={{
                        position: "absolute",
                        background: "white",
                        border: "1px solid #ccc",
                        width: "100%",
                        zIndex: 10
                    }}
                >
                    {results.map((p, i) => (
                        <div
                            key={p.id}
                            style={{
                                padding: "4px 6px",
                                background: i === activeIndex ? "#eee" : "white",
                                cursor: "pointer"
                            }}
                            onMouseDown={() => {
                                onSelect(p);
                                setQuery("");
                                setResults([]);
                            }}
                        >
                            {p.id} – {p.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProductSearchInput;
