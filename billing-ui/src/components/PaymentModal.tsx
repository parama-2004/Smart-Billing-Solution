import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

export type PaymentMode = "Cash" | "UPI" | "Card" | "Pluxee" | "Cash+UPI" | "Cash+Card";

export interface PaymentSelection {
    mode: PaymentMode;
    amount: number;
    cashAmount: number;
    otherAmount: number;
    changeAmount: number;
}

interface Props {
    totalAmount: number;
    balanceAmount: number;
    onConfirm: (payment: PaymentSelection) => void;
    onClose: () => void;
}

const PaymentModal = ({ totalAmount, balanceAmount, onConfirm, onClose }: Props) => {
    const [mode, setMode] = useState<PaymentMode>("Cash");
    const [cashAmount, setCashAmount] = useState(balanceAmount);
    const [amount, setAmount] = useState(balanceAmount);

    const cashRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setAmount(balanceAmount);
        setCashAmount(balanceAmount);
    }, [balanceAmount]);

    useEffect(() => {
        setTimeout(() => {
            if (mode === "Cash" || mode === "Cash+UPI" || mode === "Cash+Card") {
                cashRef.current?.focus();
                cashRef.current?.select();
            } else {
                modalRef.current?.focus();
            }
        }, 0);
    }, [mode]);

    const splitMode = mode === "Cash+UPI" || mode === "Cash+Card";
    const cashValue = Math.max(0, Number(cashAmount) || 0);
    const effectiveAmount = Math.max(0, Number(amount) || 0);
    const splitOtherAmount = splitMode ? Math.max(0, effectiveAmount - cashValue) : 0;
    const changeAmount = mode === "Cash" ? Math.max(0, cashValue - effectiveAmount) : 0;

    const validationError = useMemo(() => {
        if (mode === "Cash") {
            if (cashValue < effectiveAmount) return "Received amount is less than payable amount";
        }

        if (splitMode) {
            if (cashValue <= 0) return "Enter a valid cash amount";
            if (cashValue >= effectiveAmount) return "Cash amount must be less than total amount";
        }

        return null;
    }, [cashValue, effectiveAmount, mode, splitMode]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") onClose();

        if (e.key === "Enter") {
            e.preventDefault();
            if (validationError) {
                toast.error(validationError);
                return;
            }
            onConfirm({
                mode,
                amount: effectiveAmount,
                cashAmount: mode === "Cash" ? cashValue : (splitMode ? cashValue : 0),
                otherAmount: mode === "Cash" ? 0 : (splitMode ? splitOtherAmount : effectiveAmount),
                changeAmount
            });
        }

        if (e.key === "F1") setMode("Cash");
        if (e.key === "F2") setMode("UPI");
        if (e.key === "F3") setMode("Card");
        if (e.key === "F4") setMode("Pluxee");
        if (e.key === "F5" || e.key === "F6") {
            e.preventDefault();
        }
    };

    return (
        <div style={overlay}>
            <div style={windowContainer}>
                <div style={modalH}>
                    <h3 style={modalTitle}>Payment</h3>
                </div>
                <div style={modal} ref={modalRef} onKeyDown={handleKeyDown} tabIndex={0}>
                    <Row label="Total Amount" value={`₹${totalAmount.toFixed(2)}`} />
                    <Row label="Balance Due" value={`₹${balanceAmount.toFixed(2)}`} highlight />

                    <div style={row}>
                        <span>Payment Mode</span>
                        <select
                            style={retroSelect}
                            value={mode}
                            onChange={e => setMode(e.target.value as PaymentMode)}
                        >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                            <option value="Pluxee">Pluxee</option>
                            <option value="Cash+UPI">Cash + UPI</option>
                            <option value="Cash+Card">Cash + Card</option>
                        </select>
                    </div>

                    {(mode === "Cash" || splitMode) && (
                        <div style={row}>
                            <span>{splitMode ? "Cash Amount" : "Amount Received"}</span>
                            <input
                                ref={cashRef}
                                value={cashAmount}
                                onChange={e => setCashAmount(Number(e.target.value) || 0)}
                                style={validationError ? retroInputError : retroInput}
                            />
                        </div>
                    )}

                    {(mode === "UPI" || mode === "Card" || mode === "Pluxee") && (
                        <div style={row}>
                            <span>Amount</span>
                            <input
                                ref={cashRef}
                                value={amount}
                                onChange={e => setAmount(Number(e.target.value) || 0)}
                                style={retroInput}
                            />
                        </div>
                    )}

                    {mode === "Cash" && (
                        <Row1 label="Balance to Return" value={`₹${changeAmount.toFixed(2)}`} highlight />
                    )}

                    {splitMode && (
                        <>
                            <Row label="Secondary Payment" value={`₹${splitOtherAmount.toFixed(2)}`} />
                            <div style={nonCashNote}>
                                Remaining amount will be paid by {mode === "Cash+UPI" ? "UPI" : "Card"}.
                            </div>
                        </>
                    )}

                    {!splitMode && mode !== "Cash" && (
                        <div style={nonCashNote}>
                            No balance calculation for {mode}
                        </div>
                    )}

                    <div style={hint}>
                        F1: Cash &nbsp; F2: UPI &nbsp; F3: Card &nbsp; F4: Pluxee &nbsp; Enter: Pay &nbsp; Esc: Cancel
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                        <button
                            onClick={onClose}
                            style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer", border: "1px solid #ccc", borderRadius: "4px" }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (validationError) {
                                    toast.error(validationError);
                                    return;
                                }
                                onConfirm({
                                    mode,
                                    amount: effectiveAmount,
                                    cashAmount: mode === "Cash" ? cashValue : (splitMode ? cashValue : 0),
                                    otherAmount: mode === "Cash" ? 0 : (splitMode ? splitOtherAmount : effectiveAmount),
                                    changeAmount
                                });
                            }}
                            style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer", background: "#000080", color: "#fff", border: "1px solid #000060", borderRadius: "4px" }}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;

/* ---------- Helpers ---------- */

const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean; }) => (
    <div style={row}>
        <span>{label}</span>
        <strong style={{ color: highlight ? "green" : "inherit", fontFamily: "'Courier New', monospace", fontSize: 30 }}>
            {value}
        </strong>
    </div>
);

const Row1 = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean; }) => (
    <div style={row}>
        <span>{label}</span>
        <strong style={{ color: highlight ? "green" : "inherit", fontFamily: "'Courier New', monospace", fontSize: 50 }}>
            {value}
        </strong>
    </div>
);

/* ---------- Retro Styles ---------- */

const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000
};

const windowContainer: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    width: 680,
    boxShadow: "15px 15px 0px rgba(0,0,0,0.4)"
};

const modalH: React.CSSProperties = {
    background: "linear-gradient(145deg, #000070 0%, #000085 100%)",
    padding: "8px 0",
    width: "100%",
    boxSizing: "border-box",
    color: "white",
    border: "3px solid #000078",
    borderColor: "#ffffff #808080 #808080 #ffffff",
    borderRadius: "10px 10px 0 0",
    borderBottom: "none",
    outline: "none"
};

const modal: React.CSSProperties = {
    background: "linear-gradient(145deg, #e6e6fa 0%, #d8d8f0 100%)",
    padding: "20px",
    width: "100%",
    boxSizing: "border-box",
    border: "3px solid #000078",
    borderRadius: "0 0 10px 10px",
    borderColor: "#ffffff #808080 #808080 #ffffff",
    borderTop: "none",
    outline: "none"
};

const modalTitle: React.CSSProperties = {
    margin: 0,
    fontSize: 24,
    color: "white",
    fontFamily: "'Tahoma', sans-serif",
    fontWeight: "bold",
    textAlign: "center",
    textShadow: "1px 1px 1px rgba(0,0,0,0.1)"
};

const row: React.CSSProperties = {
    display: "flex",
    fontSize: 30,
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center"
};

const retroSelect: React.CSSProperties = {
    width: "50%",
    fontSize: 25,
    fontWeight: "bold",
    fontFamily: "'Courier New', monospace",
    padding: "10px",
    border: "2px solid #808080",
    borderColor: "#808080 #ffffff #ffffff #808080",
    backgroundColor: "#ffffff"
};

const retroInput: React.CSSProperties = {
    width: "50%",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "'Courier New', monospace",
    padding: "10px",
    border: "2px solid #808080",
    borderColor: "#808080 #ffffff #ffffff #808080",
    backgroundColor: "#ffffff"
};

const retroInputError: React.CSSProperties = {
    ...retroInput,
    borderColor: "#d00"
};

const hint: React.CSSProperties = {
    marginTop: 20,
    fontSize: 12,
    color: "#555",
    textAlign: "center",
    fontFamily: "'Courier New', monospace"
};

const nonCashNote: React.CSSProperties = {
    marginTop: 10,
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    fontFamily: "'Courier New', monospace"
};