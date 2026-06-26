import { useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useShops, useInvalidateShops } from "../../hooks/useShops";
import { createShop, updateShop, deleteShop } from "../../api/shopApi";
import type { ShopDto } from "../../models/Shop";
import "../../Styles/GlobalLayout.css";

const emptyForm = {
    id: null as number | null,
    name: "",
    city: ""
};

export default function ShopMaster() {
    usePageTitle("Shop Master");
    const [form, setForm] = useState(emptyForm);
    const { data: shops = [] } = useShops();
    const invalidateShops = useInvalidateShops();

    const selectShop = (shop: ShopDto) => {
        setForm({
            id: shop.id,
            name: shop.name,
            city: shop.city || ""
        });
    };

    const submit = async () => {
        try {
            if (form.id) {
                await updateShop(form.id, {
                    name: form.name,
                    city: form.city
                });
                toast.success("Shop updated successfully!");
            } else {
                await createShop({
                    name: form.name,
                    city: form.city
                });
                toast.success("Shop added successfully!");
            }
            invalidateShops();
            setForm(emptyForm);
        } catch (error: any) {
            toast.error(error.message || "Failed to save shop");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this shop?")) return;
        try {
            await deleteShop(id);
            toast.success("Shop deleted successfully!");
            invalidateShops();
            if (form.id === id) setForm(emptyForm);
        } catch (error: any) {
            toast.error(error.message || "Failed to delete shop");
        }
    };

    return (
        <div className="retro-master-container">
            <div className="product-header-bar">
                <span>Shop Master</span>
            </div>

            <h2>Manage Shops</h2>

            <div className="product-form-section" style={{ maxWidth: 600, margin: '0 auto 20px' }}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="form-group">
                        <label>Shop ID</label>
                        <input
                            className="retro-input"
                            disabled
                            placeholder="Auto"
                            value={form.id || ""}
                        />
                    </div>
                    <div className="form-group">
                        <label>Shop Name *</label>
                        <input
                            className="retro-input"
                            placeholder="Enter shop name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>City</label>
                        <input
                            className="retro-input"
                            placeholder="Enter city"
                            value={form.city}
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                        />
                    </div>
                </div>

                <div className="action-buttons">
                    <button
                        className={`retro-btn ${form.id ? '' : 'primary'}`}
                        onClick={submit}
                        disabled={!form.name}
                    >
                        {form.id ? "UPDATE SHOP" : "ADD NEW SHOP"}
                    </button>

                    {form.id && (
                        <button className="retro-btn" onClick={() => setForm(emptyForm)}>
                            CLEAR / NEW
                        </button>
                    )}
                </div>
            </div>

            <div className="search-section" style={{ maxWidth: 800, margin: '0 auto' }}>
                <table className="product-grid">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Shop Name</th>
                            <th>City</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shops.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="no-data">No shops found.</td>
                            </tr>
                        ) : (
                            shops.map(shop => (
                                <tr key={shop.id} onClick={() => selectShop(shop)} className={form.id === shop.id ? "selected" : ""} style={{ cursor: 'pointer' }}>
                                    <td>{shop.id}</td>
                                    <td><strong>{shop.name}</strong></td>
                                    <td>{shop.city}</td>
                                    <td>
                                        <button 
                                            className="retro-btn small" 
                                            style={{ background: '#d32f2f', color: '#fff', padding: '2px 8px' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(shop.id);
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
