import { useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import type { CSSProperties } from "react";

declare global {
    interface Window {
        electron: {
            appVersion: string;
            openWindow: (route: string) => void;
            openCalculator?: () => void;
            openExternalUrl?: (url: string) => void;
            broadcastInvalidate?: (key: any) => void;
            onInvalidate?: (callback: (key: any) => void) => void;
            printReceipt?: (html: string) => Promise<{ ok: boolean; message?: string }>;
            uploadBillPdf?: (html: string, invoiceNumber: string) => Promise<{ ok: boolean; link?: string; message?: string }>;
            loginSuccess?: () => void;
        };
    }
}

type MenuProps = {
    title: string;
    children: ReactNode;
    open: string | null;
    setOpen: (value: string | null) => void;
};

type ItemProps = {
    text: string;
    onClick: () => void;
};

export default function TopMenuBar() {
    const { user, logout } = useAuth();
    const [open, setOpen] = useState<string | null>(null);

    if (!user) return null;

    const go = (path: string) => {
        setOpen(null);
        // ✅ Check if running in Electron
        if (window.electron && window.electron.openWindow) {
            window.electron.openWindow(path);
        } else {
            // Fallback for web version
            window.open(path, "_blank");
        }
    };

    const handleLogout = () => {
        logout();
    };

    return (
        <div style={menuStyle}>
            {/* COMMON FOR BOTH */}
            <Menu title="Billing" open={open} setOpen={setOpen}>
                <Item text="Invoice / Billing" onClick={() => go("/billing")} />
                <Item text="Customers" onClick={() => go("/customer-master")} />
            </Menu>

            {/* MASTER AND TRANSACTION FOR ADMIN, USER AND OPERATOR */}
            {(user.role === "Admin" || user.role === "User" || user.role === "Operator") && (
                <>
                    <Menu title="Master" open={open} setOpen={setOpen}>
                        <Item text="Customer Master" onClick={() => go("/customer-master")} />
                        <Item text="Item Master" onClick={() => go("/products")} />
                        <Item text="Gifts Master" onClick={() => go("/gifts-master")} />
                        <Item text="Barcode Master" onClick={() => go("/barcode-master")} />
                        <Item text="Distributor Master" onClick={() => go("/distributors")} />
                        <Item text="Salesman Master" onClick={() => go("/salesman")} />
                        <Item text="Brand / Category" onClick={() => go("/brand-category")} />
                        <Item text="Shop Master" onClick={() => go("/shop-master")} />
                    </Menu>

                    <Menu title="Transaction" open={open} setOpen={setOpen}>
                        <Item text="Purchase Entry" onClick={() => go("/purchase")} />
                        <Item text="Order Master" onClick={() => go("/orders")} />
                        <Item text="Purchase Payments" onClick={() => go("/payments")} />
                        <Item text="Voucher Payments" onClick={() => go("/voucher-payments")} />
                        <Item text="Stock Transfer" onClick={() => go("/stock-transfer")} />
                    </Menu>
                </>
            )}

            {/* SETTINGS FOR USER ONLY */}
            {user.role === "User" && (
                <Menu title="Settings" open={open} setOpen={setOpen}>
                    <Item text="Printer Settings" onClick={() => go("/settings/printer")} />
                </Menu>
            )}

            {/* ADMIN AND REPORTS FOR ADMIN ONLY */}
            {user.role === "Admin" && (
                <>
                    <Menu title="Admin" open={open} setOpen={setOpen}>
                        <Item text="User Master" onClick={() => go("/users")} />
                        <Item text="Bank Master" onClick={() => go("/banks")} />
                        <Item text="Backup / Restore" onClick={() => go("/backup-restore")} />
                        <Item text="Daily Tally" onClick={() => go("/daily-tally")} />
                        <Item text="Cheque Issued" onClick={() => go("/cheque-issued")} />
                        <Item text="Printer Settings" onClick={() => go("/settings/printer")} />
                    </Menu>
                    <Menu title="Reports" open={open} setOpen={setOpen}>
                        <Item text="Sales Report" onClick={() => go("/reports/sales")} />
                        <Item text="Sales GST Report" onClick={() => go("/reports/sales-vat")} />
                        <Item text="Purchase Report" onClick={() => go("/reports/purchase")} />
                        <Item text="Purchase GST Report" onClick={() => go("/reports/purchase-vat")} />
                        <Item text="Stock Report" onClick={() => go("/reports/stock")} />
                        <Item text="Customer Report" onClick={() => go("/reports/customers")} />
                        <Item text="Payment Report" onClick={() => go("/reports/payments")} />
                        <Item text="Item Movement Report" onClick={() => go("/reports/products")} />
                        <Item text="Profit by Product Report" onClick={() => go("/reports/profit-by-product")} />
                        <Item text="Daily Tally Report" onClick={() => go("/reports/daily-tally")} />
                        <Item text="Annual Tally Report" onClick={() => go("/reports/annual-tally")} />
                        <Item text="Cheque Issued Report" onClick={() => go("/reports/cheque-issued")} />
                        <Item text="Stock Transfer Report" onClick={() => go("/reports/stock-transfer")} />
                    </Menu>
                </>
            )}

            <div style={{ marginLeft: "auto", cursor: "pointer" }} onClick={handleLogout}>
                Logout ({user.username})
            </div>
        </div>
    );
}

/* -------- styles -------- */

const menuStyle: CSSProperties = {
    display: "flex",
    background: "#2c2c8a",
    color: "#fff",
    padding: "6px 10px",
    fontWeight: "bold"
};

const menuItemStyle: CSSProperties = {
    position: "relative",
    marginRight: 20,
    cursor: "pointer"
};

const dropdownStyle: CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    background: "#f0f0f0",
    color: "#000",
    border: "1px solid #aaa",
    minWidth: 200,
    zIndex: 1000
};

const dropdownItem: CSSProperties = {
    padding: "6px 10px",
    cursor: "pointer",
    borderBottom: "1px solid #ddd"
};

function Menu({ title, children, open, setOpen }: MenuProps) {
    return (
        <div
            style={menuItemStyle}
            onMouseEnter={() => setOpen(title)}
            onMouseLeave={() => setOpen(null)}
        >
            {title}
            {open === title && <div style={dropdownStyle}>{children}</div>}
        </div>
    );
}

function Item({ text, onClick }: ItemProps) {
    return (
        <div
            style={dropdownItem}
            onClick={onClick}
            onMouseEnter={e => (e.currentTarget.style.background = "#ddd")}
            onMouseLeave={e => (e.currentTarget.style.background = "")}
        >
            {text}
        </div>
    );
}