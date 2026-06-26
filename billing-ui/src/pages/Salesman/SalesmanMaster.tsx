import { useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { api } from "../../api/axios";
import { getSalesmanCompensationDetails } from "../../api/salesmanApi";
import { useSalesmen, useSalesmanCompensationSummary, useInvalidateQuery, SALESMEN_KEY, SALESMEN_SUMMARY_KEY } from "../../hooks/useMasterQueries";
import type { SalesmanCompensationDetailDto, SalesmanCompensationSummaryDto, SalesmanDto } from "../../models/Salesman";
import "../../Styles/GlobalLayout.css";
import "../../Styles/SalesmanMaster.css"; // Make sure to create this file

interface CreateSalesmanRequest {
    name: string;
    dateOfBirth: string;
    address: string;
    city: string;
    mobile: string;
    dateOfJoin: string;
    isActive: boolean;
}

/* ---------------- Component ---------------- */

const SalesmanMaster = () => {
    usePageTitle("Salesman Master");
    /* ---------- State ---------- */
    const { data: salesmen = [] } = useSalesmen();
    const { data: summaryRows = [] } = useSalesmanCompensationSummary();
    const invalidate = useInvalidateQuery();

    const compensationSummary = summaryRows.reduce<Record<number, SalesmanCompensationSummaryDto>>((acc, row) => {
        acc[row.salesmanId] = row;
        return acc;
    }, {});
    const [selectedCompensationSalesman, setSelectedCompensationSalesman] = useState<SalesmanDto | null>(null);
    const [compensationDetails, setCompensationDetails] = useState<SalesmanCompensationDetailDto[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

    const [form, setForm] = useState<CreateSalesmanRequest>({
        name: "",
        dateOfBirth: "",
        address: "",
        city: "",
        mobile: "",
        dateOfJoin: "",
        isActive: true
    });



    const loadCompensationDetails = async (salesman: SalesmanDto) => {
        try {
            const details = await getSalesmanCompensationDetails(salesman.id);
            setSelectedCompensationSalesman(salesman);
            setCompensationDetails(details);
        } catch {
            toast.error("Failed to load salary details");
        }
    };



    /* ---------- Validation ---------- */
    const validateForm = (): boolean => {
        const errors: { [key: string]: string } = {};

        if (!form.name.trim()) {
            errors.name = "Name is required";
        }

        if (!form.mobile.trim()) {
            errors.mobile = "Mobile number is required";
        } else if (!/^\d{10}$/.test(form.mobile)) {
            errors.mobile = "Mobile number must be 10 digits";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    /* ---------- Form Handlers ---------- */
    const resetForm = () => {
        setEditingId(null);
        setForm({
            name: "",
            dateOfBirth: "",
            address: "",
            city: "",
            mobile: "",
            dateOfJoin: "",
            isActive: true
        });
        setFormErrors({});
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        try {
            if (editingId) {
                await api.put(`/salesmen/${editingId}`, form);
                toast.success("Salesman updated successfully");
            } else {
                await api.post("/salesmen", form);
                toast.success("Salesman added successfully");
            }

            invalidate(SALESMEN_KEY);
            invalidate(SALESMEN_SUMMARY_KEY);
            resetForm();
        } catch (error: unknown) {
            console.error("Failed to save salesman:", error);
            const message =
                typeof error === "object" &&
                error !== null &&
                "message" in error &&
                typeof (error as { message: string }).message === "string"
                    ? (error as { message: string }).message
                    : "Unknown error";
            toast.error(`Failed to save salesman: ${message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (s: SalesmanDto) => {
        setEditingId(s.id);
        setForm({
            name: s.name,
            mobile: s.mobile,
            city: s.city || "",
            address: "",
            dateOfBirth: "",
            dateOfJoin: "",
            isActive: s.isActive
        });
    };

    /* ---------- Statistics ---------- */
    const activeSalesmen = salesmen.filter(s => s.isActive).length;
    const inactiveSalesmen = salesmen.filter(s => !s.isActive).length;
    const totalSalesmen = salesmen.length;

    /* ---------------- UI ---------------- */

    return (
        <div className="salesman-master-container">

            {/* Header */}
            <div className="salesman-header-bar">
                <span>📇 SALESMAN MASTER DATABASE</span>
                <span>v1.0</span>
            </div>

            {/* Form Section */}
            <div className="salesman-form-section">
                <div className="salesman-form-grid">
                    <div className={`salesman-form-group ${formErrors.name ? 'error' : ''}`}>
                        <label className="required">Name</label>
                        <input
                            className="salesman-retro-input"
                            placeholder="Enter salesman name"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            maxLength={100}
                            disabled={isLoading}
                        />
                        {formErrors.name && (
                            <div className="salesman-error-message">{formErrors.name}</div>
                        )}
                    </div>

                    <div className={`salesman-form-group ${formErrors.mobile ? 'error' : ''}`}>
                        <label className="required">Mobile</label>
                        <input
                            className="salesman-retro-input"
                            placeholder="10-digit mobile number"
                            value={form.mobile}
                            onChange={e => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })}
                            maxLength={10}
                            disabled={isLoading}
                        />
                        {formErrors.mobile && (
                            <div className="salesman-error-message">{formErrors.mobile}</div>
                        )}
                    </div>

                    <div className="salesman-form-group">
                        <label>City</label>
                        <input
                            className="salesman-retro-input"
                            placeholder="Enter city"
                            value={form.city}
                            onChange={e => setForm({ ...form, city: e.target.value })}
                            maxLength={50}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="salesman-form-group">
                        <label>Status</label>
                        <select
                            className="salesman-retro-select"
                            value={form.isActive ? "1" : "0"}
                            onChange={e => setForm({
                                ...form,
                                isActive: e.target.value === "1"
                            })}
                            disabled={isLoading}
                        >
                            <option value="1">Active</option>
                            <option value="0">Inactive</option>
                        </select>
                    </div>

                    <div className="salesman-form-group full-width">
                        <label>Address</label>
                        <input
                            className="salesman-retro-input"
                            placeholder="Enter complete address"
                            value={form.address}
                            onChange={e => setForm({ ...form, address: e.target.value })}
                            maxLength={200}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="salesman-form-group">
                        <label>Date of Birth</label>
                        <input
                            type="date"
                            className="salesman-retro-input"
                            value={form.dateOfBirth}
                            onChange={e => setForm({ ...form, dateOfBirth: e.target.value })}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="salesman-form-group">
                        <label>Date of Joining</label>
                        <input
                            type="date"
                            className="salesman-retro-input"
                            value={form.dateOfJoin}
                            onChange={e => setForm({ ...form, dateOfJoin: e.target.value })}
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="salesman-action-buttons">
                    <button
                        className="salesman-retro-btn primary"
                        onClick={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="salesman-loading"></span>
                                PROCESSING...
                            </>
                        ) : editingId ? "UPDATE SALESMAN" : "ADD SALESMAN"}
                    </button>
                    {editingId && (
                        <button
                            className="salesman-retro-btn"
                            onClick={resetForm}
                            disabled={isLoading}
                        >
                            CANCEL
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Box */}
            <div className="salesman-summary-box">
                <div className="salesman-summary-item">
                    <span className="salesman-summary-label">Total Salesmen</span>
                    <span className="salesman-summary-value">{totalSalesmen}</span>
                </div>
                <div className="salesman-summary-item">
                    <span className="salesman-summary-label">Active</span>
                    <span className="salesman-summary-value" style={{ color: '#006400' }}>{activeSalesmen}</span>
                </div>
                <div className="salesman-summary-item">
                    <span className="salesman-summary-label">Inactive</span>
                    <span className="salesman-summary-value" style={{ color: '#8b0000' }}>{inactiveSalesmen}</span>
                </div>
            </div>

            {/* Data Grid Section */}
            <div className="salesman-grid-section">
                <div className="salesman-grid-container">
                    <table className="salesman-grid">
                        <thead>
                            <tr>
                                <th className="salesman-id-cell">ID</th>
                                <th className="salesman-name-cell">NAME</th>
                                <th className="salesman-mobile-cell">MOBILE</th>
                                <th className="salesman-city-cell">CITY</th>
                                <th>TOTAL SALARY</th>
                                <th>TOTAL ADVANCE</th>
                                <th>NET PAID</th>
                                <th className="salesman-status-cell">STATUS</th>
                                <th className="salesman-actions-cell">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salesmen.map(s => (
                                <tr key={s.id}>
                                    <td className="salesman-id-cell">{s.id}</td>
                                    <td className="salesman-name-cell">
                                        <strong>{s.name}</strong>
                                    </td>
                                    <td className="salesman-mobile-cell">{s.mobile}</td>
                                    <td className="salesman-city-cell">{s.city || "-"}</td>
                                    <td>{(compensationSummary[s.id]?.totalSalary ?? 0).toFixed(2)}</td>
                                    <td>{(compensationSummary[s.id]?.totalAdvance ?? 0).toFixed(2)}</td>
                                    <td>{(compensationSummary[s.id]?.netPaid ?? 0).toFixed(2)}</td>
                                    <td className="salesman-status-cell">
                                        {s.isActive ? (
                                            <span className="status-active">ACTIVE</span>
                                        ) : (
                                            <span className="status-inactive">INACTIVE</span>
                                        )}
                                    </td>
                                    <td className="salesman-actions-cell">
                                        <button
                                            className="salesman-grid-btn"
                                            onClick={() => handleEdit(s)}
                                            title="Edit salesman"
                                            disabled={isLoading}
                                        >
                                            EDIT
                                        </button>
                                        <button
                                            className="salesman-grid-btn"
                                            onClick={() => loadCompensationDetails(s)}
                                            title="View salary details"
                                            disabled={isLoading}
                                        >
                                            SALARY
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {salesmen.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={9} className="salesman-no-data">
                                        No salesmen found. Add your first salesman above.
                                    </td>
                                </tr>
                            )}
                            {isLoading && (
                                <tr>
                                    <td colSpan={9} className="salesman-no-data">
                                        <span className="salesman-loading"></span>
                                        Loading salesman data...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedCompensationSalesman && (
                <div className="salesman-grid-section">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong>Salary Details - {selectedCompensationSalesman.name}</strong>
                        <button className="salesman-grid-btn" onClick={() => setSelectedCompensationSalesman(null)}>CLOSE</button>
                    </div>
                    <div className="salesman-grid-container">
                        <table className="salesman-grid">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Source</th>
                                </tr>
                            </thead>
                            <tbody>
                                {compensationDetails.map(row => (
                                    <tr key={row.id}>
                                        <td>{new Date(row.entryDate).toLocaleDateString("en-IN")}</td>
                                        <td>{row.entryType}</td>
                                        <td>{row.amount.toFixed(2)}</td>
                                        <td>{row.source}</td>
                                    </tr>
                                ))}
                                {compensationDetails.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="salesman-no-data">No salary entries found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Status Bar */}
            <div className="salesman-status-bar">
                <div className="salesman-status-item">
                    <span>System Status:</span>
                    <span>READY</span>
                </div>
                <div className="salesman-status-item">
                    <span>Records Found:</span>
                    <span>{totalSalesmen}</span>
                </div>
                <div className="salesman-status-item">
                    <span>Last Updated:</span>
                    <span>{new Date().toLocaleString()}</span>
                </div>
            </div>

        </div>
    );
};

export default SalesmanMaster;