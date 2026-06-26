import { useEffect, useState, useMemo, useRef } from "react";
import { getShopSettings, defaultShopSettings } from "../../api/shopApi";
import type { ShopSettings } from "../../api/shopApi";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import {
    createDistributorOrder,
    updateDistributorOrderStatus,
    cancelDistributorOrder
} from "../../api/orderApi";
import type { CreateDistributorOrderRequest, DistributorOrderItemRequest, DistributorOrderResponse, OrderPriority, OrderStatus } from "../../models/Orders";
import { useOrders, useDistributors, useInvalidateQuery, ORDERS_KEY } from "../../hooks/useMasterQueries";
import { useProducts } from "../../hooks/useProducts";
import type { ProductDto } from "../../models/Product";
import DistributorSearchModal from "../../components/DistributorSearchModal";
import { getCurrentDateTime } from "../../utils/dateUtils";
import "../../Styles/GlobalLayout.css";
import "../../Styles/OrderStyles.css";

interface OrderItem {
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    barCode?: string;
    hsnCode?: string;
    currentStock: number; // Current stock in our store
    minStockLevel: number; // Minimum stock level
    reorderQuantity: number; // Recommended reorder quantity
}

interface OrderForm {
    id: number | null;
    distributorId: number;
    distributorCode: string;
    distributorName: string;
    distributorPhone: string;
    distributorAddress: string;
    contactPerson: string;
    orderDate: string;
    expectedDeliveryDate: string;
    items: OrderItem[];
    notes: string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    totalAmount: number;
    status: 'Draft' | 'Pending' | 'Confirmed' | 'Received' | 'Shipped' | 'Delivered' | 'Cancelled';
}

const emptyForm: OrderForm = {
    id: null,
    distributorId: 0,
    distributorCode: "",
    distributorName: "",
    distributorPhone: "",
    distributorAddress: "",
    contactPerson: "",
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    notes: "",
    priority: 'Medium',
    totalAmount: 0,
    status: 'Draft'
};

interface OrderPopupData {
    productId: number;
    productName: string;
    unitPrice: number;
    currentStock: number;
    minStockLevel: number;
    reorderQuantity: number;
}

export default function DistributorOrderMaster() {
    usePageTitle('Order Master');
    const [form, setForm] = useState<OrderForm>(emptyForm);
    const { data: orders = [] } = useOrders();
    const { data: products = [] } = useProducts();
    const { data: distributors = [] } = useDistributors();
    const invalidate = useInvalidateQuery();
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [showPopup, setShowPopup] = useState(false);
    const [popupData, setPopupData] = useState<OrderPopupData | null>(null);
    const [popupQuantity, setPopupQuantity] = useState(1);
    const [showOrderSlip, setShowOrderSlip] = useState(false);
    const [showDistributorSearch, setShowDistributorSearch] = useState(false);
    const barcodeRef = useRef<HTMLInputElement>(null);
    const [shopInfo, setShopInfo] = useState<ShopSettings>(defaultShopSettings);

    useEffect(() => {
        getShopSettings().then(setShopInfo).catch(() => {});
    }, []);

    // Data is loaded automatically by React Query hooks
    // Filter products based on selected distributor
    const filteredProducts = useMemo(() => {
        if (!form.distributorId) return [];
        return products.filter(p => p.distributorId === form.distributorId);
    }, [form.distributorId, products]);

    const openOrderPopup = (product: ProductDto) => {
        // Calculate recommended reorder quantity
        const reorderQty = Math.max(10, Math.ceil((10 * 1.5) - product.stock));

        setPopupData({
            productId: product.id,
            productName: product.name,
            unitPrice: product.costPrice, // Use cost price for ordering
            currentStock: product.stock,
            minStockLevel: 10,
            reorderQuantity: reorderQty > 0 ? reorderQty : 10
        });
        setPopupQuantity(reorderQty > 0 ? reorderQty : 10);
        setShowPopup(true);
    };

    const addOrderItem = () => {
        if (!popupData) return;

        if (popupQuantity <= 0) {
            toast.warning("Please enter a valid quantity");
            return;
        }

        const product = products.find(p => p.id === popupData.productId);
        if (!product) return;

        const newItem: OrderItem = {
            productId: popupData.productId,
            productName: popupData.productName,
            quantity: popupQuantity,
            unitPrice: popupData.unitPrice,
            totalPrice: popupData.unitPrice * popupQuantity,
            barCode: product.barcodes && product.barcodes.length > 0 ? product.barcodes[0].barcodeValue : undefined,
            hsnCode: product.hsnCode || undefined,
            currentStock: popupData.currentStock,
            minStockLevel: popupData.minStockLevel,
            reorderQuantity: popupData.reorderQuantity
        };

        setForm(f => ({
            ...f,
            items: [...f.items, newItem]
        }));

        setShowPopup(false);
        setPopupData(null);
        setPopupQuantity(1);
    };

    const removeItem = (index: number) => {
        setForm(f => ({
            ...f,
            items: f.items.filter((_, i) => i !== index)
        }));
    };

    const updateItemQuantity = (index: number, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeItem(index);
            return;
        }

        setForm(f => {
            const newItems = [...f.items];
            newItems[index] = {
                ...newItems[index],
                quantity: newQuantity,
                totalPrice: newItems[index].unitPrice * newQuantity
            };
            return { ...f, items: newItems };
        });
    };

    // Calculate totals
    const totals = useMemo(() => {
        const subTotal = form.items.reduce((sum, item) => sum + item.totalPrice, 0);
        const gstAmount = form.items.reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId);
            const gstPercentage = product?.gstPercentage || 18;
            return sum + (item.totalPrice * gstPercentage / 100);
        }, 0);
        const totalAmount = subTotal + gstAmount;

        return {
            subTotal,
            gstAmount,
            totalAmount
        };
    }, [form.items, products]);

    const fetchDistributor = (id: number) => {
        const distributor = distributors.find(d => d.id === id);

        if (!distributor) {
            toast.error("Distributor not found");
            setForm(f => ({
                ...f,
                distributorId: 0,
                distributorCode: "",
                distributorName: "",
                distributorPhone: "",
                distributorAddress: "",
                contactPerson: ""
            }));
            return;
        }

        setForm(f => ({
            ...f,
            distributorId: distributor.id,
            distributorCode: `D-${distributor.id.toString().padStart(4, '0')}`, // Generate code since it doesn't exist
            distributorName: distributor.name,
            distributorPhone: distributor.mobile.toString() || "", // Convert number to string
            distributorAddress: distributor.address || "",
            contactPerson: distributor.name // Use name as contact person since contactPerson doesn't exist
        }));
    };

    const fetchProduct = (code: string) => {
        if (!form.distributorId) {
            toast.warning("Please select a distributor first.");
            return;
        }

        const product = filteredProducts.find(p =>
            (p.barcodes && p.barcodes.some(b => b.barcodeValue.toLowerCase().includes(code.toLowerCase()))) ||
            p.id.toString() === code ||
            p.name.toLowerCase().includes(code.toLowerCase())
        );

        if (!product) {
            toast.error("Product not found or does not belong to this distributor");
            return;
        }

        openOrderPopup(product);
    };

    const submitOrder = async () => {
        try {
            if (form.items.length === 0) {
                toast.warning("Please add at least one item to the order");
                return;
            }

            if (!form.distributorId) {
                toast.warning("Please select a distributor");
                return;
            }

            const distributor = distributors.find(d => d.id === form.distributorId);
            if (!distributor) {
                toast.error("Distributor not found");
                return;
            }

            const orderItems: DistributorOrderItemRequest[] = form.items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                barCode: item.barCode,
                hsnCode: item.hsnCode
            }));

            const payload: CreateDistributorOrderRequest = {
                distributorId: form.distributorId,
                distributorCode: form.distributorCode,
                distributorName: form.distributorName,
                contactPerson: form.contactPerson,
                orderDate: new Date(form.orderDate).toISOString(),
                expectedDeliveryDate: new Date(form.expectedDeliveryDate).toISOString(),
                items: orderItems,
                notes: form.notes || undefined,
                priority: form.priority,
                totalAmount: totals.totalAmount,
                status: form.id ? form.status : 'Pending' // New orders start as Pending
            };

            if (form.id) {
                // UPDATE existing order
                await updateDistributorOrderStatus(form.id, form.status);
                toast.success("Order updated successfully!");
            } else {
                // CREATE new order
                await createDistributorOrder(payload);
                toast.success("Order created successfully!");
            }

            invalidate(ORDERS_KEY);
            clearForm();
        } catch (error: unknown) {
            console.error("Order submission error:", error);
            toast.error(error instanceof Error ? error.message : "Error saving order. Please check all fields.");
        }
    };

    const clearForm = () => {
        setForm(emptyForm);
        setSelectedId(null);
        setShowOrderSlip(false);
        if (barcodeRef.current) barcodeRef.current.value = "";
    };

    const selectOrder = (order: DistributorOrderResponse) => {
        setForm({
            id: order.id,
            distributorId: order.distributorId,
            distributorCode: order.distributorCode,
            distributorName: order.distributorName,
            distributorPhone: order.distributorPhone || "",
            distributorAddress: order.distributorAddress || "",
            contactPerson: order.contactPerson || order.distributorName,
            orderDate: new Date(order.orderDate).toISOString().split('T')[0],
            expectedDeliveryDate: new Date(order.expectedDeliveryDate).toISOString().split('T')[0],
            items: order.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                barCode: item.barCode,
                hsnCode: item.hsnCode,
                currentStock: 0, // Would need to fetch from product data
                minStockLevel: 10,
                reorderQuantity: item.quantity
            })),
            notes: order.notes || "",
            priority: order.priority || 'Medium',
            totalAmount: order.totalAmount,
            status: order.status
        });
        setSelectedId(order.id);
    };

    const cancelOrderHandler = async (orderId: number) => {
        if (window.confirm("Are you sure you want to cancel this order?")) {
            try {
                await cancelDistributorOrder(orderId);
                invalidate(ORDERS_KEY);
                toast.success("Order cancelled successfully!");
            } catch (error: unknown) {
                toast.error(error instanceof Error ? error.message : "Failed to cancel order ");
            }
        }
    };

    const updateOrderStatus = async (orderId: number, newStatus: OrderForm['status']) => {
        try {
            await updateDistributorOrderStatus(orderId, newStatus);
            invalidate(ORDERS_KEY);
            toast.success(`Order status updated to ${newStatus}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update order status");
        }
    };

    const filteredOrders = orders.filter(o => {
        const q = search.toLowerCase().trim();
        if (!q) return true;

        return (
            o.distributorName.toLowerCase().includes(q) ||
            o.id.toString().includes(q) ||
            o.distributorCode.toLowerCase().includes(q) ||
            o.contactPerson?.toLowerCase().includes(q) ||
            o.items.some(item =>
                item.productName.toLowerCase().includes(q)
            )
        );
    });

    // Get products that need reordering (low stock)
    const lowStockProducts = useMemo(() => {
        return filteredProducts.filter(p => p.stock <= (10));
    }, [filteredProducts]);

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    const receivedOrders = orders.filter(o => o.status === 'Received').length;
    const todayOrders = orders.filter(o =>
        new Date(o.orderDate).toDateString() === new Date().toDateString()
    ).length;
    const totalOrderValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    return (
        <div className="order-container">
            {/* Header */}
            <div className="order-header-bar">
                <span>Distributor Order Master - Smart Super Market</span>
                <span>{getCurrentDateTime()}</span>
            </div>

            <h2>Distributor Order / Purchase Order</h2>

            {showDistributorSearch && (
                <DistributorSearchModal
                    distributors={distributors}
                    onSelect={(distributor) => {
                        fetchDistributor(distributor.id);
                        setShowDistributorSearch(false);
                    }}
                    onClose={() => setShowDistributorSearch(false)}
                />
            )}

            {/* Form Section */}
            <div className="order-form-section">
                <div className="form-grid">
                    {/* Order ID */}
                    <div className="form-group">
                        <label>Order ID</label>
                        <input
                            className="retro-input"
                            disabled
                            placeholder="Auto"
                            value={form.id ? `ORD-${form.id.toString().padStart(4, '0')}` : "New Order"}
                        />
                    </div>

                    {/* Order Date */}
                    <div className="form-group">
                        <label>Order Date *</label>
                        <input
                            className="retro-input"
                            type="date"
                            value={form.orderDate}
                            onChange={e => setForm({ ...form, orderDate: e.target.value })}
                        />
                    </div>

                    {/* Expected Delivery Date */}
                    <div className="form-group">
                        <label>Expected Delivery</label>
                        <input
                            className="retro-input"
                            type="date"
                            value={form.expectedDeliveryDate}
                            onChange={e => setForm({ ...form, expectedDeliveryDate: e.target.value })}
                            min={form.orderDate}
                        />
                    </div>

                    {/* Priority */}
                    <div className="form-group">
                        <label>Priority</label>
                        <select
                            className="retro-select"
                            value={form.priority}
                            onChange={e => setForm({ ...form, priority: e.target.value as OrderPriority })}
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                        </select>
                    </div>

                    {/* Status */}
                    <div className="form-group">
                        <label>Status</label>
                        <select
                            className="retro-select"
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value as OrderStatus })}
                            disabled={!form.id}
                        >
                            <option value="Draft">Draft</option>
                            <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                            <option value="Received">Received</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* Distributor ID Input */}
                    <div className="form-group">
                        <label>Distributor ID *</label>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                                className="retro-input"
                                placeholder="Enter ID and press Enter"
                                value={form.distributorId || ""}
                                onChange={e => setForm({ ...form, distributorId: parseInt(e.target.value) || 0 })}
                                onKeyDown={e => {
                                    if (e.key === "Enter") {
                                        const id = form.distributorId;
                                        if (id > 0) fetchDistributor(id);
                                    }
                                }}
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                className="retro-btn small"
                                onClick={() => setShowDistributorSearch(true)}
                                title="Search distributor"
                            >
                                🔍
                            </button>
                        </div>
                    </div>

                    {/* Distributor Code */}
                    <div className="form-group">
                        <label>Distributor Code</label>
                        <input
                            className="retro-input"
                            value={form.distributorCode}
                            readOnly
                            placeholder="Auto filled"
                        />
                    </div>

                    {/* Distributor Name */}
                    <div className="form-group">
                        <label>Distributor Name</label>
                        <input
                            className="retro-input"
                            value={form.distributorName}
                            readOnly
                            placeholder="Auto filled"
                        />
                    </div>

                    {/* Contact Person */}
                    <div className="form-group">
                        <label>Contact Person</label>
                        <input
                            className="retro-input"
                            value={form.contactPerson}
                            onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                            placeholder="Contact person name"
                        />
                    </div>

                    {/* Phone */}
                    <div className="form-group">
                        <label>Phone</label>
                        <input
                            className="retro-input"
                            value={form.distributorPhone}
                            readOnly
                            placeholder="Auto filled"
                        />
                    </div>

                    {/* Address */}
                    <div className="form-group">
                        <label>Address</label>
                        <textarea
                            className="retro-input"
                            value={form.distributorAddress}
                            readOnly
                            placeholder="Auto filled"
                            rows={2}
                            style={{ resize: "vertical" }}
                        />
                    </div>
                </div>

                {/* Item Entry Section */}
                <div className="item-entry-section">
                    <h3>Add Items to Order</h3>
                    <div className="item-entry-grid">
                        {/* Barcode Scanner */}
                        <div className="form-group">
                            <label>Scan Barcode</label>
                            <input
                                ref={barcodeRef}
                                className="retro-input"
                                placeholder="Scan barcode or enter product ID/name"
                                onKeyDown={(e) => {
                                    if (e.key !== "Enter") return;
                                    const code = barcodeRef.current?.value.trim();
                                    if (!code) return;
                                    fetchProduct(code);
                                }}
                            />
                        </div>

                        {/* Low Stock Warning */}
                        {lowStockProducts.length > 0 && (
                            <div className="form-group" style={{ gridColumn: "span 2" }}>
                                <div className="low-stock-warning">
                                    <strong>⚠ Low Stock Alert:</strong> {lowStockProducts.length} products need reordering
                                    <button
                                        className="retro-btn small"
                                        onClick={() => {
                                            // Add all low stock products to order
                                            lowStockProducts.forEach(product => {
                                                const reorderQty = Math.max(10, Math.ceil((10) * 1.5 - product.stock));
                                                if (reorderQty > 0) {
                                                    const newItem: OrderItem = {
                                                        productId: product.id,
                                                        productName: product.name,
                                                        quantity: reorderQty,
                                                        unitPrice: product.costPrice,
                                                        totalPrice: product.costPrice * reorderQty,
                                                        barCode: product.barcodes && product.barcodes.length > 0 ? product.barcodes[0].barcodeValue : undefined,
                                                        hsnCode: product.hsnCode || undefined,
                                                        currentStock: product.stock,
                                                        minStockLevel: 10,
                                                        reorderQuantity: reorderQty
                                                    };
                                                    setForm(f => ({
                                                        ...f,
                                                        items: [...f.items, newItem]
                                                    }));
                                                }
                                            });
                                            toast.success(`Added ${lowStockProducts.length} low stock products to order`);
                                        }}
                                    >
                                        ADD ALL LOW STOCK
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Order Items Table */}
                <div className="items-table-section">
                    <h3>Order Items</h3>
                    <table className="items-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Product Name</th>
                                <th>Current Stock</th>
                                <th>Min Level</th>
                                <th>Reorder Qty</th>
                                <th>Order Qty</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                                <th>Remove</th>
                            </tr>
                        </thead>
                        <tbody>
                            {form.items.map((item, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <strong>{item.productName}</strong>
                                        {item.barCode && <div className="hint">Barcode: {item.barCode}</div>}
                                    </td>
                                    <td className={item.currentStock <= item.minStockLevel ? "low-stock" : ""}>
                                        {item.currentStock}
                                    </td>
                                    <td>{item.minStockLevel}</td>
                                    <td>{item.reorderQuantity}</td>
                                    <td>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={e => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                                            className="quantity-input"
                                        />
                                    </td>
                                    <td>₹{item.unitPrice.toFixed(2)}</td>
                                    <td>₹{item.totalPrice.toFixed(2)}</td>
                                    <td>
                                        <button
                                            className="remove-btn"
                                            onClick={() => removeItem(index)}
                                        >
                                            ✗
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {form.items.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="no-items">
                                        No items added. Select a distributor first, then add products.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Notes Section */}
                <div className="notes-section">
                    <label>Order Notes</label>
                    <textarea
                        className="retro-input"
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        placeholder="Enter any special instructions, delivery notes, or remarks..."
                        rows={3}
                        style={{ resize: "vertical", width: "100%" }}
                    />
                </div>

                {/* Order Totals */}
                <div className="order-totals">
                    <div className="total-row">
                        <span>Sub Total:</span>
                        <span>₹{totals.subTotal.toFixed(2)}</span>
                    </div>
                    <div className="total-row">
                        <span>Estimated GST:</span>
                        <span>₹{totals.gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="total-row grand-total">
                        <span>ESTIMATED TOTAL:</span>
                        <span>₹{totals.totalAmount.toFixed(2)}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button
                        className={`retro-btn ${form.id ? '' : 'primary'}`}
                        onClick={submitOrder}
                        disabled={form.items.length === 0 || !form.distributorId}
                    >
                        {form.id ? "UPDATE ORDER" : "CREATE ORDER"}
                    </button>

                    <button className="retro-btn" onClick={clearForm}>
                        CLEAR / NEW
                    </button>

                    {form.items.length > 0 && (
                        <button
                            className="retro-btn secondary"
                            onClick={() => setShowOrderSlip(true)}
                        >
                            VIEW ORDER SLIP
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Section */}
            <div className="summary-box">
                <div className="summary-item">
                    <span className="summary-label">Total Orders</span>
                    <span className="summary-value">{totalOrders}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Pending Orders</span>
                    <span className="summary-value" style={{ color: pendingOrders > 0 ? '#ff9800' : 'inherit' }}>
                        {pendingOrders}
                    </span>
                </div>
                        <div className="summary-item">
                    <span className="summary-label">Received</span>
                    <span className="summary-value" style={{ color: receivedOrders > 0 ? '#2196f3' : 'inherit' }}>
                        {receivedOrders}
                    </span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Today's Orders</span>
                    <span className="summary-value">{todayOrders}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Order Value</span>
                    <span className="summary-value">₹{totalOrderValue.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Distributors</span>
                    <span className="summary-value">{distributors.length}</span>
                </div>
            </div>

            {/* Product List Section */}
            <div className="search-section">
                <div className="search-box">
                    <label>Search Products:</label>
                    <input
                        className="retro-input"
                        style={{ flex: 1 }}
                        placeholder="Search by ID, name, or barcode..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="product-grid-container">
                    <table className="product-grid">
                        <thead>
                            <tr>
                                <th className="id-cell">ID</th>
                                <th className="name-cell">Product Name</th>
                                <th className="stock-cell">Current Stock</th>
                                <th className="stock-cell">Min Level</th>
                                <th className="price-cell">Cost Price</th>
                                <th className="price-cell">MRP</th>
                                <th>GST %</th>
                                <th>Status</th>
                                <th>Order</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length > 0 ? (
                                filteredProducts
                                    .filter(p => {
                                        const q = search.toLowerCase().trim();
                                        if (!q) return true;
                                        return (
                                            p.name.toLowerCase().includes(q) ||
                                            p.id.toString().includes(q) ||
                                            (p.barcodes && p.barcodes.some(b => b.barcodeValue.toLowerCase().includes(q)))
                                        );
                                    })
                                    .map(p => {
                                        const needsReorder = p.stock <= ( 10);
                                        return (
                                            <tr
                                                key={p.id}
                                                className={needsReorder ? "low-stock-row" : ""}
                                            >
                                                <td className="id-cell">{p.id}</td>
                                                <td className="name-cell">
                                                    <strong>{p.name}</strong>
                                                    {p.barcodes && p.barcodes.length > 0 && (
                                                        <div style={{ fontSize: 11, color: '#666' }}>
                                                            Barcode(s): {p.barcodes.map(b => b.barcodeValue).join(', ')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={`stock-cell ${needsReorder ? 'low-stock' : ''}`}>
                                                    <span style={{
                                                        color: p.stock <= (10) ? 'red' :
                                                            p.stock <= ( 10) * 2 ? 'orange' : 'green',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {p.stock}
                                                    </span>
                                                </td>
                                                <td className="stock-cell">{ 10}</td>
                                                <td className="price-cell">₹{p.costPrice.toFixed(2)}</td>
                                                <td className="price-cell">₹{p.mrp.toFixed(2)}</td>
                                                <td>{p.gstPercentage}%</td>
                                                <td>
                                                    {needsReorder ? (
                                                        <span className="status-badge status-warning">LOW STOCK</span>
                                                    ) : (
                                                        <span className="status-badge status-ok">OK</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        className="order-btn"
                                                        onClick={() => openOrderPopup(p)}
                                                        title={needsReorder ? "Low stock - needs reorder" : "Add to order"}
                                                        style={{
                                                            background: needsReorder
                                                                ? 'linear-gradient(to bottom, #ff9800 0%, #f57c00 100%)'
                                                                : 'linear-gradient(to bottom, #4caf50 0%, #388e3c 100%)'
                                                        }}
                                                    >
                                                        {needsReorder ? "REORDER" : "ORDER"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                            ) : (
                                <tr>
                                    <td colSpan={9} className="no-data">
                                        {form.distributorId
                                            ? "No products found for this distributor."
                                            : "Please select a distributor first."}
                                        {search && form.distributorId && " Try a different search term."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order List Section */}
            <div className="search-section">
                <div className="search-box">
                    <label>Search Orders:</label>
                    <input
                        className="retro-input"
                        style={{ flex: 1 }}
                        placeholder="Search by order ID, distributor, or product..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="order-grid-container">
                    <table className="order-grid">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Date</th>
                                <th>Distributor</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Delivery Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map(o => (
                                    <tr
                                        key={o.id}
                                        onClick={() => selectOrder(o)}
                                        className={selectedId === o.id ? "selected" : ""}
                                    >
                                        <td>
                                            <strong>ORD-{o.id.toString().padStart(4, '0')}</strong>
                                        </td>
                                        <td>{new Date(o.orderDate).toLocaleDateString('en-GB')}</td>
                                        <td>
                                            <div className="distributor-info">
                                                <div className="distributor-name">{o.distributorName}</div>
                                                <div className="hint">Code: {o.distributorCode}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="items-count">
                                                {o.items.length}
                                                <div className="hint">Click to view</div>
                                            </div>
                                        </td>
                                        <td className="amount-cell">
                                            <strong>₹{(o.totalAmount || 0).toFixed(2)}</strong>
                                        </td>
                                        <td>
                                            <span className={`priority-badge priority-${o.priority?.toLowerCase() || 'medium'}`}>
                                                {o.priority || 'Medium'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${o.status?.toLowerCase() || 'pending'}`}>
                                                {o.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td>
                                            {o.expectedDeliveryDate ?
                                                new Date(o.expectedDeliveryDate).toLocaleDateString('en-GB') :
                                                "Not set"}
                                        </td>
                                        <td>
                                            <div className="action-buttons-small">
                                                <button
                                                    className="retro-btn small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectOrder(o);
                                                    }}
                                                >
                                                    View
                                                </button>
                                                {o.status !== 'Cancelled' && o.status !== 'Delivered' && (
                                                <button
                                                    className="retro-btn small secondary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateOrderStatus(o.id, 'Received');
                                                    }}
                                                >
                                                    Receive
                                                </button>
                                                )}
                                                {o.status !== 'Cancelled' && o.status !== 'Delivered' && (
                                                    <button
                                                        className="retro-btn small danger"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            cancelOrderHandler(o.id);
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="no-data">
                                        No orders found. {search && "Try a different search term."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Status Bar */}
            <div className="order-status-bar">
                <span className="status-item">
                    <strong>Status:</strong> {form.status}
                </span>
                <span className="status-item">
                    <strong>Selected:</strong> {selectedId ? `Order #${selectedId}` : "None"}
                </span>
                <span className="status-item">
                    <strong>Items:</strong> {form.items.length} added
                </span>
                <span className="status-item">
                    <strong>Total:</strong> ₹{totals.totalAmount.toFixed(2)}
                </span>
                <span className="status-item">
                    <strong>Distributor:</strong> {form.distributorName || "None"}
                </span>
                <span className="status-item">
                    <strong>Last Updated:</strong> {new Date().toLocaleTimeString()}
                </span>
            </div>

            {/* Order Quantity Popup */}
            {showPopup && popupData && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <h3>Add to Order</h3>
                        <div className="popup-details">
                            <div><strong>Product:</strong> {popupData.productName}</div>
                            <div><strong>Current Stock:</strong>
                                <span style={{
                                    color: popupData.currentStock <= popupData.minStockLevel ? 'red' : 'inherit',
                                    fontWeight: 'bold',
                                    marginLeft: '5px'
                                }}>
                                    {popupData.currentStock} / {popupData.minStockLevel} min
                                </span>
                            </div>
                            <div><strong>Recommended Order:</strong> {popupData.reorderQuantity} units</div>
                            <div><strong>Unit Price:</strong> ₹{popupData.unitPrice.toFixed(2)}</div>
                        </div>
                        <div className="popup-input">
                            <label>Order Quantity:</label>
                            <input
                                type="number"
                                min="1"
                                value={popupQuantity}
                                onChange={e => setPopupQuantity(parseInt(e.target.value) || 1)}
                                className="retro-input"
                                autoFocus
                            />
                        </div>
                        <div className="popup-total">
                            <span>Total:</span>
                            <span>₹{(popupData.unitPrice * popupQuantity).toFixed(2)}</span>
                        </div>
                        <div className="popup-buttons">
                            <button className="retro-btn primary" onClick={addOrderItem}>
                                ADD TO ORDER
                            </button>
                            <button className="retro-btn" onClick={() => setShowPopup(false)}>
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 80mm Thermal Order Slip Modal ── */}
            {showOrderSlip && (
                <div className="modal-overlay" style={{ zIndex: 9999 }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: 4,
                        padding: '16px',
                        width: 340,
                        maxWidth: '95vw',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}>
                        {/* ── Preview (mirrors the thermal output) ── */}
                        <div id="thermal-order-slip" style={{
                            width: 302,           // 80mm ≈ 302px
                            fontFamily: "'Courier New', Courier, monospace",
                            fontSize: 11,
                            color: '#000',
                            lineHeight: 1.35,
                            margin: '0 auto'
                        }}>
                            {/* Store Header — from appsettings.json */}
                            <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 13, letterSpacing: 0.5 }}>
                                {shopInfo.name.toUpperCase()}
                            </div>
                            {shopInfo.address && (
                                <div style={{ textAlign: 'center', fontSize: 9 }}>{shopInfo.address}</div>
                            )}
                            {shopInfo.state && (
                                <div style={{ textAlign: 'center', fontSize: 9 }}>{shopInfo.state}</div>
                            )}
                            {shopInfo.phone && (
                                <div style={{ textAlign: 'center', fontSize: 9 }}>Ph: {shopInfo.phone}</div>
                            )}
                            {shopInfo.gstin && (
                                <div style={{ textAlign: 'center', fontSize: 9 }}>GSTIN: {shopInfo.gstin}</div>
                            )}
                            <div style={{ textAlign: 'center', fontSize: 10, marginTop: 2, marginBottom: 3, fontWeight: 700 }}>
                                PURCHASE ORDER {form.id ? `#ORD-${form.id.toString().padStart(4,'0')}` : '(DRAFT)'}
                            </div>
                            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

                            {/* Order Meta */}
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Order ID: {form.id ? `ORD-${form.id.toString().padStart(4,'0')}` : 'DRAFT'}</span>
                                <span>{new Date(form.orderDate).toLocaleDateString('en-GB')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Priority: {form.priority}</span>
                                <span>Status: {form.status}</span>
                            </div>
                            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

                            {/* Distributor */}
                            <div style={{ fontWeight: 700, marginBottom: 2 }}>TO: {form.distributorName}</div>
                            {form.contactPerson && <div>Attn: {form.contactPerson}</div>}
                            {form.distributorPhone && <div>Ph: {form.distributorPhone}</div>}
                            {form.distributorAddress && (
                                <div style={{ fontSize: 10, color: '#333' }}>Addr: {form.distributorAddress}</div>
                            )}
                            <div>
                                Exp. Delivery: {new Date(form.expectedDeliveryDate).toLocaleDateString('en-GB')}
                            </div>
                            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

                            {/* Column headers */}
                            <div style={{ display: 'grid', gridTemplateColumns: '14px 1fr 32px 46px 50px', gap: 2, fontWeight: 700, fontSize: 10 }}>
                                <span>#</span>
                                <span>Item</span>
                                <span style={{ textAlign: 'center' }}>Qty</span>
                                <span style={{ textAlign: 'right' }}>Rate</span>
                                <span style={{ textAlign: 'right' }}>Amt</span>
                            </div>
                            <div style={{ borderTop: '1px solid #000', margin: '2px 0' }} />

                            {/* Items */}
                            {form.items.map((item, idx) => (
                                <div key={idx} style={{ marginBottom: 3 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '14px 1fr 32px 46px 50px', gap: 2, fontSize: 10 }}>
                                        <span>{idx + 1}</span>
                                        <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                            {item.productName}
                                        </span>
                                        <span style={{ textAlign: 'center' }}>{item.quantity}</span>
                                        <span style={{ textAlign: 'right' }}>{item.unitPrice.toFixed(2)}</span>
                                        <span style={{ textAlign: 'right' }}>{item.totalPrice.toFixed(2)}</span>
                                    </div>
                                    {item.barCode && (
                                        <div style={{ fontSize: 9, color: '#555', paddingLeft: 14 }}>
                                            BC: {item.barCode}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

                            {/* Totals */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                                <span>Sub Total</span>
                                <span>Rs.{totals.subTotal.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                                <span>Est. GST</span>
                                <span>Rs.{totals.gstAmount.toFixed(2)}</span>
                            </div>
                            <div style={{ borderTop: '1px solid #000', margin: '3px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 12 }}>
                                <span>TOTAL</span>
                                <span>Rs.{totals.totalAmount.toFixed(2)}</span>
                            </div>
                            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

                            {/* Notes */}
                            {form.notes && (
                                <div style={{ fontSize: 10, marginBottom: 4 }}>
                                    <strong>Notes:</strong> {form.notes}
                                </div>
                            )}

                            {/* Footer */}
                            <div style={{ textAlign: 'center', fontSize: 9, marginTop: 6 }}>
                                Items: {form.items.length} | Generated: {new Date().toLocaleString('en-IN')}
                            </div>
                            <div style={{ textAlign: 'center', fontSize: 9 }}>
                                ** AUTHORISED SIGNATORY **
                            </div>
                        </div>

                        {/* Modal Buttons */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'center' }}>
                            <button
                                className="retro-btn primary"
                                onClick={() => {
                                    const slipEl = document.getElementById('thermal-order-slip');
                                    if (!slipEl) return;
                                    const win = window.open('', '_blank', 'width=400,height=700,toolbar=0,menubar=0');
                                    if (!win) return;
                                    win.document.write(`<!DOCTYPE html><html><head>
                                        <title>Purchase Order ${form.id ? `ORD-${form.id.toString().padStart(4,'0')}` : 'DRAFT'}</title>
                                        <style>
                                            @page { size: 80mm auto; margin: 4mm 3mm; }
                                            * { box-sizing: border-box; margin: 0; padding: 0; }
                                            body { font-family: 'Courier New', Courier, monospace; font-size: 11px;
                                                   color: #000; width: 80mm; line-height: 1.35; }
                                            .header { text-align: center; font-weight: 900; font-size: 14px; }
                                            .sub-header { text-align: center; font-size: 10px; margin-bottom: 3px; }
                                            .dash { border-top: 1px dashed #000; margin: 4px 0; }
                                            .solid { border-top: 1px solid #000; margin: 3px 0; }
                                            .row { display: flex; justify-content: space-between; font-size: 10px; }
                                            .items-grid { display: grid;
                                                          grid-template-columns: 14px 1fr 32px 46px 50px;
                                                          gap: 2px; font-size: 10px; margin-bottom: 3px; }
                                            .items-grid span:nth-child(3) { text-align: center; }
                                            .items-grid span:nth-child(4), .items-grid span:nth-child(5) { text-align: right; }
                                            .grand { font-weight: 900; font-size: 12px; }
                                            .footer { text-align: center; font-size: 9px; margin-top: 6px; }
                                            @media print { body { -webkit-print-color-adjust: exact; } }
                                        </style></head><body>
                                        ${slipEl.innerHTML}
                                        <script>window.onload=function(){window.print();window.close();}<\/script>
                                    </body></html>`);
                                    win.document.close();
                                }}
                            >
                                🖨️ PRINT (80mm)
                            </button>
                            <button className="retro-btn" onClick={() => setShowOrderSlip(false)}>
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}