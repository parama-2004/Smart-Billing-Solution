import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getCurrentDateTime } from "../../utils/dateUtils";
import {
    createGift,
    updateGift
} from "../../api/giftApi";
import { useGifts, useRedeemedGifts, useInvalidateQuery, GIFTS_KEY } from "../../hooks/useMasterQueries";
import type { GiftProductDto } from "../../models/Gift";
import "../../Styles/GlobalLayout.css";
import "../../Styles/ProductStyles.css";

const emptyForm = {
    id: null as number | null,
    productName: "",
    requiredPoints: "",
    isActive: true
};

export default function GiftsMaster() {
    usePageTitle("Gifts Master");

    const [form, setForm] = useState(emptyForm);
    const { data: gifts = [] } = useGifts();
    const { data: redeemedGiftItems = [] } = useRedeemedGifts();
    const invalidate = useInvalidateQuery();
    const [giftSearch, setGiftSearch] = useState("");
    const [redeemedSearch, setRedeemedSearch] = useState("");
    const [selectedId, setSelectedId] = useState<number | null>(null);


    const selectGift = (gift: GiftProductDto) => {
        setForm({
            id: gift.id,
            productName: gift.productName,
            requiredPoints: gift.requiredPoints.toString(),
            isActive: gift.isActive
        });
        setSelectedId(gift.id);
    };

    const submit = async () => {
        const productName = form.productName.trim();
        const requiredPoints = Number(form.requiredPoints);

        if (!productName) {
            toast.warning("Gift product name is required");
            return;
        }

        if (!Number.isFinite(requiredPoints) || requiredPoints <= 0) {
            toast.warning("Required points must be greater than zero");
            return;
        }

        try {
            const payload = {
                productName,
                requiredPoints,
                isActive: form.isActive
            };

            if (form.id) {
                await updateGift(form.id, payload);
                toast.success("Gift updated successfully");
            } else {
                const created = await createGift(payload);
                setForm(prev => ({ ...prev, id: created.id }));
                setSelectedId(created.id);
                toast.success("Gift added successfully");
            }

            invalidate(GIFTS_KEY);
        } catch (error: unknown) {
            const message =
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
                    ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
                    : "Failed to save gift";
            toast.error(message);
        }
    };

    const clearForm = () => {
        setForm(emptyForm);
        setSelectedId(null);
    };

    const filteredGifts = useMemo(() => {
        const q = giftSearch.trim().toLowerCase();
        if (!q) return gifts;

        return gifts.filter(g =>
            g.id.toString().includes(q) ||
            g.productName.toLowerCase().includes(q) ||
            g.requiredPoints.toString().includes(q)
        );
    }, [gifts, giftSearch]);

    const filteredRedeemed = useMemo(() => {
        const q = redeemedSearch.trim().toLowerCase();
        if (!q) return redeemedGiftItems;

        return redeemedGiftItems.filter(r =>
            (r.giftProductName || "").toLowerCase().includes(q) ||
            r.customerName.toLowerCase().includes(q) ||
            r.customerCode.toLowerCase().includes(q) ||
            r.invoiceId.toString().includes(q)
        );
    }, [redeemedGiftItems, redeemedSearch]);

    const totalGifts = gifts.length;
    const activeGifts = gifts.filter(g => g.isActive).length;
    const totalRedeemed = redeemedGiftItems.length;

    return (
        <div className="retro-master-container">
            <div className="product-header-bar">
                <span>Gifts Master - Smart Super Market</span>
                <span>{getCurrentDateTime()}</span>
            </div>

            <h2>Loyalty Gifts Master</h2>

            <div className="product-form-section">
                <div className="form-grid">
                    <div className="form-group">
                        <label>Gift ID</label>
                        <input
                            className="retro-input"
                            disabled
                            value={form.id ? `G-${form.id.toString().padStart(4, "0")}` : "New Gift"}
                        />
                    </div>

                    <div className="form-group">
                        <label>Gift Product Name *</label>
                        <input
                            className="retro-input"
                            placeholder="Enter gift product name"
                            value={form.productName}
                            onChange={e => setForm({ ...form, productName: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Required Points *</label>
                        <input
                            className="retro-input"
                            type="number"
                            min={1}
                            placeholder="0"
                            value={form.requiredPoints}
                            onChange={e => setForm({ ...form, requiredPoints: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Status</label>
                        <select
                            className="retro-select"
                            value={form.isActive ? "1" : "0"}
                            onChange={e => setForm({ ...form, isActive: e.target.value === "1" })}
                        >
                            <option value="1">Active</option>
                            <option value="0">Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="action-buttons">
                    <button
                        className={`retro-btn ${form.id ? "" : "primary"}`}
                        onClick={() => void submit()}
                        disabled={!form.productName || !form.requiredPoints}
                    >
                        {form.id ? "UPDATE GIFT" : "ADD NEW GIFT"}
                    </button>

                    {form.id && (
                        <button className="retro-btn" onClick={clearForm}>
                            CLEAR / NEW
                        </button>
                    )}
                </div>
            </div>

            <div className="summary-box">
                <div className="summary-item">
                    <span className="summary-label">Total Gifts</span>
                    <span className="summary-value">{totalGifts}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Active Gifts</span>
                    <span className="summary-value">{activeGifts}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Redeemed Gifts</span>
                    <span className="summary-value">{totalRedeemed}</span>
                </div>
            </div>

            <div className="search-section">
                <div className="search-box">
                    <label>Search Gifts:</label>
                    <input
                        className="retro-input"
                        style={{ flex: 1 }}
                        placeholder="Search by id, gift name, points..."
                        value={giftSearch}
                        onChange={e => setGiftSearch(e.target.value)}
                    />
                </div>

                <div className="product-grid-container">
                    <table className="product-grid">
                        <thead>
                            <tr>
                                <th className="id-cell">ID</th>
                                <th className="name-cell">Gift Product</th>
                                <th className="price-cell">Required Points</th>
                                <th className="stock-cell">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGifts.length > 0 ? (
                                filteredGifts.map(g => (
                                    <tr
                                        key={g.id}
                                        onClick={() => selectGift(g)}
                                        className={selectedId === g.id ? "selected" : ""}
                                    >
                                        <td className="id-cell">{g.id}</td>
                                        <td className="name-cell"><strong>{g.productName}</strong></td>
                                        <td className="price-cell">{g.requiredPoints}</td>
                                        <td className="stock-cell">
                                            <span style={{ color: g.isActive ? "green" : "red", fontWeight: "bold" }}>
                                                {g.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="no-data">
                                        No gifts found. {giftSearch && "Try a different search term."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="search-section" style={{ marginTop: 16 }}>
                <div className="search-box">
                    <label>Redeemed Gift Details:</label>
                    <input
                        className="retro-input"
                        style={{ flex: 1 }}
                        placeholder="Search by gift, customer, code, invoice..."
                        value={redeemedSearch}
                        onChange={e => setRedeemedSearch(e.target.value)}
                    />
                </div>

                <div className="product-grid-container">
                    <table className="product-grid">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Invoice</th>
                                <th>Gift</th>
                                <th>Customer Name</th>
                                <th>Customer Code</th>
                                <th>Points</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRedeemed.length > 0 ? (
                                filteredRedeemed.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.id}</td>
                                        <td>#{item.invoiceId}</td>
                                        <td>{item.giftProductName || "-"}</td>
                                        <td>{item.customerName}</td>
                                        <td>{item.customerCode}</td>
                                        <td>{item.pointsUsed}</td>
                                        <td>{new Date(item.redeemedOn).toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="no-data">No redeemed gift records found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="product-status-bar">
                <span className="status-item"><strong>Status:</strong> {form.id ? "Editing Gift" : "Adding New Gift"}</span>
                <span className="status-item"><strong>Selected:</strong> {selectedId ? `Gift #${selectedId}` : "None"}</span>
                <span className="status-item"><strong>Total Gifts:</strong> {gifts.length}</span>
                <span className="status-item"><strong>Redeemed Entries:</strong> {redeemedGiftItems.length}</span>
                <span className="status-item"><strong>Last Updated:</strong> {new Date().toLocaleTimeString()}</span>
            </div>
        </div>
    );
}
