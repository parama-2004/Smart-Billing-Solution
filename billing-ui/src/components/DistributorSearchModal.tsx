import { useEffect, useMemo, useRef, useState } from "react";
import type { DistributorDto } from "../models/Distributor";

interface Props {
    distributors: DistributorDto[];
    initialQuery?: string;
    onSelect: (distributor: DistributorDto) => void;
    onClose: () => void;
}

const DistributorSearchModal = ({ distributors, initialQuery = "", onSelect, onClose }: Props) => {
    const [query, setQuery] = useState(initialQuery);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const results = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return distributors.slice(0, 100);

        return distributors.filter(d =>
            d.id.toString().includes(term) ||
            d.name.toLowerCase().includes(term) ||
            d.mobile.toString().includes(term) ||
            (d.gstNumber?.toLowerCase().includes(term) ?? false)
        ).slice(0, 100);
    }, [distributors, query]);

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: "760px", maxWidth: "96vw" }}>
                <div className="modal-header">
                    <h3>Search Distributor</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                    <label>Search by ID, name, mobile or GST</label>
                    <input
                        ref={inputRef}
                        className="retro-input"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Type to search distributors"
                    />
                </div>

                <div style={{ maxHeight: 360, overflow: "auto", border: "1px solid #cfcfcf" }}>
                    <table className="hold-bills-table" style={{ width: "100%" }}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Mobile</th>
                                <th>GST</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.length > 0 ? results.map(d => (
                                <tr key={d.id} className="hold-bill-row" onClick={() => onSelect(d)}>
                                    <td>{d.id}</td>
                                    <td>{d.name}</td>
                                    <td>{d.mobile}</td>
                                    <td>{d.gstNumber || "-"}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4}>No distributors found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="modal-footer">
                    <div className="hint">Select a distributor to fill the ID field</div>
                    <button className="retro-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default DistributorSearchModal;