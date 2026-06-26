import { useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useBanks, useInvalidateQuery, BANKS_KEY } from "../../hooks/useMasterQueries";
import { createBank, updateBank, deleteBank } from "../../api/bankApi";
import type { Bank } from "../../models/Bank";
import "../../Styles/GlobalLayout.css";

export default function BankMasterPage() {
    usePageTitle("Bank Master");
    const { data: banks = [], isLoading } = useBanks();
    const invalidate = useInvalidateQuery();

    const [name, setName] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const onEdit = (b: Bank) => {
        setEditingId(b.id);
        setName(b.name);
    };

    const resetForm = () => {
        setEditingId(null);
        setName("");
    };

    const onSave = async () => {
        if (!name.trim()) {
            toast.error("Bank name is required");
            return;
        }

        try {
            setSaving(true);
            if (editingId) {
                await updateBank(editingId, name.trim());
                toast.success("Bank updated");
            } else {
                await createBank(name.trim());
                toast.success("Bank created");
            }
            invalidate(BANKS_KEY);
            resetForm();
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Failed to save bank");
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this bank?")) return;
        try {
            await deleteBank(id);
            toast.success("Bank deleted");
            invalidate(BANKS_KEY);
        } catch (e: any) {
            toast.error("Failed to delete bank");
        }
    };

    return (
        <div className="retro-master-container">
            <div className="retro-content-wrapper">
                <div className="retro-header-bar">
                    <span>Bank Master - Administration</span>
                    <span>{new Date().toLocaleDateString("en-IN")}</span>
                </div>
                <div className="retro-main-content">
                    <h2 className="page-title">Manage Banks</h2>

                    <div className="master-layout">
                        {/* Form Panel */}
                        <div className="master-form-panel">
                            <form className="retro-form" onSubmit={e => { e.preventDefault(); onSave(); }}>
                                <div className="form-group">
                                    <label>Bank Name</label>
                                    <input
                                        type="text"
                                        className="retro-input"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. State Bank of India"
                                        autoFocus
                                    />
                                </div>

                                <div className="form-actions">
                                    <button type="submit" className="retro-btn primary" disabled={saving}>
                                        {saving ? "SAVING..." : editingId ? "UPDATE BANK" : "ADD BANK"}
                                    </button>
                                    {editingId && (
                                        <button type="button" className="retro-btn" onClick={resetForm} disabled={saving}>
                                            CANCEL
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* List Panel */}
                        <div className="master-list-panel">
                            <div className="table-container">
                                <table className="retro-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: "80px" }}>ID</th>
                                            <th>Bank Name</th>
                                            <th style={{ width: "160px", textAlign: "right" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr><td colSpan={3} style={{ textAlign: "center", padding: "1rem" }}>Loading...</td></tr>
                                        ) : banks.length === 0 ? (
                                            <tr><td colSpan={3} style={{ textAlign: "center", padding: "1rem" }}>No banks found.</td></tr>
                                        ) : (
                                            banks.map(b => (
                                                <tr key={b.id} className={editingId === b.id ? "selected-row" : ""}>
                                                    <td>{b.id}</td>
                                                    <td>{b.name}</td>
                                                    <td style={{ textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                                        <button className="retro-btn small" onClick={() => onEdit(b)}>EDIT</button>
                                                        <button className="retro-btn small danger" onClick={() => onDelete(b.id)}>DEL</button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
