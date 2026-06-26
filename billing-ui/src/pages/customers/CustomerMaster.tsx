import { useEffect, useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import type { CustomerDto } from "../../models/Customer";
import {
    getCustomers,
    createCustomer,
    updateCustomer
} from "../../api/customerApi";
import "../../Styles/GlobalLayout.css";
import "../../Styles/CustomerStyle.css";

const emptyForm = {
    name: "",
    mobile: "",
    address: "",
    telephone: "",
    email: "",
    openingBalance: 0
};

interface CustomerForm {
    name: string;
    mobile: string;
    address: string;
    telephone: string;
    email: string;
    openingBalance: number;
}

const CustomerMaster = () => {
    usePageTitle("Customer Master");
    const [customers, setCustomers] = useState<CustomerDto[]>([]);
    const [form, setForm] = useState<CustomerForm>(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const data = await getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error("Failed to load customers:", error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
        setFormErrors({});
    };

    const validateForm = (): boolean => {
        const errors: { [key: string]: string } = {};

        if (!form.name.trim()) {
            errors.name = "Customer name is required";
        }

        if (!form.mobile.trim()) {
            errors.mobile = "Mobile number is required";
        } else if (!/^\d{10}$/.test(form.mobile)) {
            errors.mobile = "Mobile number must be 10 digits";
        }

        if (!form.address.trim()) {
            errors.address = "Address is required";
        }

        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            errors.email = "Please enter a valid email address";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            if (editingId) {
                await updateCustomer(editingId, form);
                toast.success("Customer updated successfully!");
            } else {
                const newCustomer = await createCustomer(form);
                setEditingId(newCustomer.id);
                toast.success("Customer created successfully!");
                // Notice we do NOT clear the form so data remains
            }
            await loadCustomers();
        } catch (error: any) {
            console.error("Failed to save customer:", error);
            toast.error(`Failed to save customer: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (c: CustomerDto) => {
        setEditingId(c.id);
        setForm({
            name: c.name,
            mobile: c.mobile,
            address: c.address,
            telephone: c.telephone ?? "",
            email: c.email ?? "",
            openingBalance: c.openingBalance
        });
    };

    // Calculate statistics
    const totalCustomers = customers.length;
    const totalBalance = customers.reduce((sum, c) => sum + c.closingBalance, 0);
    const positiveBalanceCount = customers.filter(c => c.closingBalance > 0).length;
    // const negativeBalanceCount = customers.filter(c => c.closingBalance < 0).length;
    const totalLoyaltyPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);

    // Filter customers based on search
    const filteredCustomers = searchTerm.trim() ? customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.mobile.includes(searchTerm) ||
        customer.customerCode.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: filteredCustomers.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 50,
        overscan: 5,
    });
    const virtualItems = rowVirtualizer.getVirtualItems();

    return (
        <div className="retro-master-container">

            {/* Header Bar */}
            <div className="customer-header-bar">
                <span>CUSTOMER MASTER DATABASE</span>
                <span>v1.0</span>
            </div>

            {/* Form Section */}
            <div className="customer-form-section">
                <h3 className="section-title">Customer Information Entry</h3>

                <div className="customer-form-grid">
                    <div className={`customer-form-group ${formErrors.name ? 'error' : ''}`}>
                        <label className="required">Customer Name</label>
                        <input
                            className="customer-retro-input"
                            placeholder="Enter customer name"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            maxLength={100}
                            disabled={loading}
                        />
                        {formErrors.name && (
                            <div className="customer-error-message">{formErrors.name}</div>
                        )}
                    </div>

                    <div className={`customer-form-group ${formErrors.mobile ? 'error' : ''}`}>
                        <label className="required">Mobile Number</label>
                        <input
                            className="customer-retro-input"
                            placeholder="10-digit mobile number"
                            value={form.mobile}
                            onChange={e => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })}
                            maxLength={10}
                            disabled={loading}
                        />
                        {formErrors.mobile && (
                            <div className="customer-error-message">{formErrors.mobile}</div>
                        )}
                    </div>

                    <div className={`customer-form-group ${formErrors.address ? 'error' : ''}`}>
                        <label className="required">Address</label>
                        <input
                            className="customer-retro-input"
                            placeholder="Enter complete address"
                            value={form.address}
                            onChange={e => setForm({ ...form, address: e.target.value })}
                            maxLength={200}
                            disabled={loading}
                        />
                        {formErrors.address && (
                            <div className="customer-error-message">{formErrors.address}</div>
                        )}
                    </div>

                    <div className="customer-form-group">
                        <label>Telephone</label>
                        <input
                            className="customer-retro-input"
                            placeholder="Landline number"
                            value={form.telephone}
                            onChange={e => setForm({ ...form, telephone: e.target.value })}
                            maxLength={15}
                            disabled={loading}
                        />
                    </div>

                    <div className={`customer-form-group ${formErrors.email ? 'error' : ''}`}>
                        <label>Email Address</label>
                        <input
                            type="email"
                            className="customer-retro-input"
                            placeholder="customer@example.com"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            maxLength={100}
                            disabled={loading}
                        />
                        {formErrors.email && (
                            <div className="customer-error-message">{formErrors.email}</div>
                        )}
                    </div>

                    <div className="customer-form-group">
                        <label>Opening Balance</label>
                        <input
                            type="number"
                            className="customer-retro-input"
                            placeholder="0.00"
                            value={form.openingBalance}
                            onChange={e =>
                                setForm({ ...form, openingBalance: Number(e.target.value) })
                            }
                            step="0.01"
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="customer-action-buttons">
                    <button
                        className="customer-retro-btn primary"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="customer-loading"></span>
                                PROCESSING...
                            </>
                        ) : editingId ? "UPDATE CUSTOMER" : "ADD CUSTOMER"}
                    </button>
                    {editingId && (
                        <button
                            className="customer-retro-btn secondary"
                            onClick={resetForm}
                            disabled={loading}
                        >
                            CANCEL EDIT
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Box */}
            <div className="customer-summary-box">
                <div className="customer-summary-item">
                    <span className="customer-summary-label">Total Customers</span>
                    <span className="customer-summary-value">{totalCustomers}</span>
                </div>
                <div className="customer-summary-item">
                    <span className="customer-summary-label">Total Balance</span>
                    <span className="customer-summary-value">₹{totalBalance.toFixed(2)}</span>
                </div>
                <div className="customer-summary-item">
                    <span className="customer-summary-label">Positive Balance</span>
                    <span className="customer-summary-value">{positiveBalanceCount}</span>
                </div>
                <div className="customer-summary-item">
                    <span className="customer-summary-label">Loyalty Points</span>
                    <span className="customer-summary-value">{totalLoyaltyPoints}</span>
                </div>
            </div>

            {/* Search Section */}
            <div className="customer-search-section">
                <div className="customer-search-box">
                    <label>Search Customers:</label>
                    <input
                        type="text"
                        className="customer-retro-input"
                        placeholder="Search by name, mobile or code..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <div className="customer-search-count">
                        {filteredCustomers.length} of {customers.length}
                    </div>
                </div>
            </div>

            {/* Customer Table */}
            <div 
                className="customer-grid-container" 
                ref={parentRef}
                style={{ height: '400px', overflowY: 'auto' }}
            >
                <table className="customer-grid">
                    <thead>
                        <tr>
                            <th className="customer-id-cell">CODE</th>
                            <th className="customer-name-cell">NAME</th>
                            <th className="customer-mobile-cell">MOBILE</th>
                            <th className="customer-balance-cell">BALANCE</th>
                            <th className="customer-loyalty-cell">LOYALTY</th>
                            <th className="customer-actions-cell">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!loading && filteredCustomers.length > 0 && virtualItems.length > 0 && (
                            <tr>
                                <td colSpan={6} style={{ height: `${virtualItems[0].start}px`, padding: 0, border: 'none' }} />
                            </tr>
                        )}
                        {virtualItems.map(virtualRow => {
                            const c = filteredCustomers[virtualRow.index];
                            return (
                            <tr 
                                key={virtualRow.key} 
                                data-index={virtualRow.index}
                                ref={rowVirtualizer.measureElement}
                            >
                                <td className="customer-id-cell">
                                    <strong>{c.customerCode}</strong>
                                </td>
                                <td className="customer-name-cell">
                                    <div><strong>{c.name}</strong></div>
                                    {c.email && (
                                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                            {c.email}
                                        </div>
                                    )}
                                </td>
                                <td className="customer-mobile-cell">
                                    {c.mobile}
                                </td>
                                <td className={`customer-balance-cell ${c.closingBalance >= 0 ? 'positive' : 'negative'}`}>
                                    ₹{c.closingBalance.toFixed(2)}
                                </td>
                                <td className="customer-loyalty-cell">
                                    <strong>{c.loyaltyPoints}</strong>
                                </td>
                                <td className="customer-actions-cell">
                                    <button
                                        className="customer-grid-btn"
                                        onClick={() => handleEdit(c)}
                                        title="Edit customer"
                                        disabled={loading}
                                    >
                                        EDIT
                                    </button>
                                </td>
                            </tr>
                        )})}
                        {filteredCustomers.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="customer-no-data">
                                    {searchTerm.trim() ? "No customers found matching search query." : "Enter search term above to display customers."}
                                </td>
                            </tr>
                        )}
                        {loading && (
                            <tr>
                                <td colSpan={6} className="customer-no-data">
                                    <span className="customer-loading"></span>
                                    Loading customer data...
                                </td>
                            </tr>
                        )}
                        {!loading && filteredCustomers.length > 0 && virtualItems.length > 0 && (
                            <tr>
                                <td colSpan={6} style={{ height: `${rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end}px`, padding: 0, border: 'none' }} />
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Status Bar */}
            <div className="customer-status-bar">
                <div className="customer-status-item">
                    <span>System Status:</span>
                    <span>READY</span>
                </div>
                <div className="customer-status-item">
                    <span>Records Displayed:</span>
                    <span>{filteredCustomers.length}</span>
                </div>
                <div className="customer-status-item">
                    <span>Last Updated:</span>
                    <span>{new Date().toLocaleString()}</span>
                </div>
                <div className="customer-status-item">
                    <span>Balance Status:</span>
                    <span>{totalBalance >= 0 ? 'POSITIVE' : 'NEGATIVE'}</span>
                </div>
            </div>

        </div>
    );
};

export default CustomerMaster;