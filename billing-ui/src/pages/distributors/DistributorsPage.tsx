import { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { createDistributor, updateDistributor } from "../../api/distributorApi";
import { useDistributors, useInvalidateQuery, DISTRIBUTORS_KEY } from "../../hooks/useMasterQueries";
import type { DistributorDto } from "../../models/Distributor";
import "../../Styles/GlobalLayout.css";
import "../../Styles/DistributorSyles.css"
import { getCurrentDateTime } from "../../utils/dateUtils";

const DistributorsPage = () => {
    usePageTitle("Distributors");
    /* ---------- State ---------- */
    const { data: distributors = [] } = useDistributors();
    const invalidate = useInvalidateQuery();
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        name: "",
        address: "",
        mobile: "",
        telephone: "",
        email: "",
        gstNumber: "",
        openingBalance: "0",
        dateOfJoin: new Date().toISOString().substring(0, 10)
    });

    /* ---------- Load ---------- */


    /* ---------- Select Distributor ---------- */
    const selectDistributor = (d: DistributorDto) => {
        setForm({
            name: d.name,
            address: d.address,
            mobile: d.mobile ? d.mobile.toString() : "",
            telephone: d.telephone || "",
            email: d.email || "",
            gstNumber: d.gstNumber || "",
            openingBalance: d.openingBalance.toString(),
            dateOfJoin: d.dateOfJoin.substring(0, 10)
        });
        setSelectedId(d.id);
    };

    /* ---------- Create ---------- */
    const submit = async () => {
        if (!form.name.trim() || !form.address.trim()) {
            toast.warning("Name and Address are required");
            return;
        }

        try {
            const data = {
                ...form,
                openingBalance: Number(form.openingBalance) || 0
            };

            if (selectedId) {
                await updateDistributor(selectedId, data);
                toast.success("Distributor updated successfully!");
            } else {
                await createDistributor(data);
                toast.success("Distributor added successfully!");
            }

            // Keep form for updates
            
            invalidate(DISTRIBUTORS_KEY);

        } catch (error: any) {
            toast.error(error.message || "Error saving distributor. Please try again.");
        }
    };

    const clearForm = () => {
        setForm({
            name: "",
            address: "",
            mobile: "",
            telephone: "",
            email: "",
            gstNumber: "",
            openingBalance: "0",
            dateOfJoin: new Date().toISOString().substring(0, 10)
        });
        setSelectedId(null);
    };

    const submitRef = useRef(submit);
    const clearFormRef = useRef(clearForm);
    useEffect(() => {
        submitRef.current = submit;
        clearFormRef.current = clearForm;
    });

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                submitRef.current();
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                clearFormRef.current();
                setTimeout(() => nameInputRef.current?.focus(), 100);
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

    /* ---------- Filter ---------- */
    /* ---------- Filter ---------- */
    const filtered = distributors.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.id.toString().includes(search) ||
        (d.gstNumber && d.gstNumber.toLowerCase().includes(search.toLowerCase())) ||
        (d.mobile && d.mobile.toString().includes(search))
    );
    /* ---------- Stats ---------- */
    const totalDistributors = distributors.length;
    const totalOpening = distributors.reduce((sum, d) => sum + d.openingBalance, 0);
    const totalClosing = distributors.reduce((sum, d) => sum + d.closingBalance, 0);
    const activeDistributors = distributors.filter(d => d.purchaseAmount > 0).length;

    return (
        <div className="retro-master-container">
            {/* Header */}
            <div className="distributors-header-bar">
                <span>Distributors / Suppliers Master</span>
                <span>{getCurrentDateTime()}</span>
            </div>

            <h2>Distributors / Suppliers Management</h2>

            {/* Create/Edit Form */}
            <div className="distributor-form-section">
                <h3 className="section-title">
                    {selectedId ? `Editing Distributor #${selectedId}` : "Create New Distributor"}
                </h3>

                <div className="form-grid" onKeyDown={handleFormKeyDown}>
                    <div className="form-group">
                        <label>Distributor Name *</label>
                        <input
                            ref={nameInputRef}
                            className="retro-input"
                            placeholder="Enter distributor name"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Address *</label>
                        <input
                            className="retro-input"
                            placeholder="Complete address"
                            value={form.address}
                            onChange={e => setForm({ ...form, address: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Mobile Number</label>
                        <input
                            className="retro-input"
                            placeholder="10-digit mobile"
                            value={form.mobile}
                            onChange={e => setForm({ ...form, mobile: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Telephone</label>
                        <input
                            className="retro-input"
                            placeholder="Landline number"
                            value={form.telephone}
                            onChange={e => setForm({ ...form, telephone: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            className="retro-input"
                            type="email"
                            placeholder="email@example.com"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>GST Number</label>
                        <input
                            className="retro-input"
                            placeholder="GSTIN number (optional)"
                            value={form.gstNumber}
                            onChange={e => setForm({ ...form, gstNumber: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Opening Balance</label>
                        <input
                            className="retro-input"
                            type="number"
                            placeholder="0.00"
                            step="0.01"
                            value={form.openingBalance}
                            onChange={e => setForm({ ...form, openingBalance: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Date of Joining</label>
                        <input
                            className="retro-input"
                            type="date"
                            value={form.dateOfJoin}
                            onChange={e => setForm({ ...form, dateOfJoin: e.target.value })}
                        />
                    </div>
                </div>

                <div className="action-buttons">
                    <button
                        className={`retro-btn ${selectedId ? '' : 'primary'}`}
                        onClick={submit}
                        disabled={!form.name.trim() || !form.address.trim()}
                    >
                        {selectedId ? <>UPDATE DISTRIBUTOR <sub>(Ctrl+S)</sub></> : <>SAVE DISTRIBUTOR <sub>(Ctrl+S)</sub></>}
                    </button>

                    {selectedId && (
                        <button className="retro-btn secondary" onClick={clearForm}>
                            CLEAR / NEW <sub>(Ctrl+N)</sub>
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="summary-box">
                <div className="summary-item">
                    <span className="summary-label">Total Distributors</span>
                    <span className="summary-value">{totalDistributors}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Active</span>
                    <span className="summary-value">{activeDistributors}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Total Opening</span>
                    <span className="summary-value">₹{totalOpening.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Total Closing</span>
                    <span className="summary-value">₹{totalClosing.toLocaleString()}</span>
                </div>
            </div>

            {/* Distributors List */}
            <div className="search-section">
                <div className="search-box">
                    <label>Search Distributors:</label>
                    <input
                        className="retro-input"
                        style={{ flex: 1 }}
                        placeholder="Search by ID, name, mobile, or GST..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <span className="search-count">
                        Showing {filtered.length} of {totalDistributors}
                    </span>
                </div>

                <div className="distributors-grid-container">
                    <table className="distributors-grid">
                        <thead>
                            <tr>
                                <th className="id-cell">ID</th>
                                <th className="name-cell">Distributor Name</th>
                                <th className="contact-cell">Contact Info</th>
                                <th className="balance-cell">Opening</th>
                                <th className="balance-cell">Purchase</th>
                                <th className="balance-cell">Paid</th>
                                <th className="balance-cell">Closing</th>
                                <th className="date-cell">Join Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? (
                                filtered.map(d => (
                                    <tr
                                        key={d.id}
                                        onClick={() => selectDistributor(d)}
                                        className={selectedId === d.id ? "selected" : ""}
                                    >
                                        <td className="id-cell">{d.id}</td>
                                        <td className="name-cell">
                                            <strong>{d.name}</strong>
                                            {d.gstNumber && (
                                                <div className="gst-number">
                                                    GST: {d.gstNumber}
                                                </div>
                                            )}
                                        </td>
                                        <td className="contact-cell">
                                            <div>{d.address}</div>
                                            <div className="contact-details">
                                                {d.mobile && <span>📱 {d.mobile}</span>}
                                                {d.telephone && <span>📞 {d.telephone}</span>}
                                                {d.email && <span>✉️ {d.email}</span>}
                                            </div>
                                        </td>
                                        <td className="balance-cell">₹{d.openingBalance.toFixed(2)}</td>
                                        <td className="balance-cell purchase">
                                            ₹{d.purchaseAmount.toFixed(2)}
                                        </td>
                                        <td className="balance-cell paid">
                                            ₹{d.paidAmount.toFixed(2)}
                                        </td>
                                        <td className={`balance-cell ${d.closingBalance < 0 ? 'negative' : 'positive'}`}>
                                            ₹{d.closingBalance.toFixed(2)}
                                        </td>
                                        <td className="date-cell">
                                            {new Date(d.dateOfJoin).toLocaleDateString('en-IN')}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="no-data">
                                        {search ? "No distributors found matching your search" : "No distributors available. Create one!"}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Status Bar */}
            <div className="distributors-status-bar">
                <span className="status-item">
                    <strong>Status:</strong> {selectedId ? `Editing #${selectedId}` : "Ready"}
                </span>
                <span className="status-item">
                    <strong>Selected:</strong> {selectedId ? distributors.find(d => d.id === selectedId)?.name : "None"}
                </span>
                <span className="status-item">
                    <strong>Total Owed:</strong> ₹{distributors.reduce((sum, d) => sum + (d.closingBalance < 0 ? -d.closingBalance : 0), 0).toFixed(2)}
                </span>
                <span className="status-item">
                    <strong>Last Updated:</strong> {new Date().toLocaleTimeString()}
                </span>
                <span className="status-item">
                    <strong>Hint:</strong> Click any row to edit
                </span>
            </div>
        </div>
    );
};

export default DistributorsPage;