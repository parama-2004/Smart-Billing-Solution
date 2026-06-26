import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getDailyTallyByDate, saveDailyTally } from "../../api/dailyTallyApi";
import { useDistributors, useSalesmen, useInvalidateQuery, DAILY_TALLY_KEY } from "../../hooks/useMasterQueries";
import type { DistributorDto } from "../../models/Distributor";
import DistributorSearchModal from "../../components/DistributorSearchModal";
import type { SalesmanDto } from "../../models/Salesman";
import type { CashDenominationItemDto, DailyTallyPayloadDto, DailyTallyResponseDto, TallyValueItemDto } from "../../models/DailyTally";
import {
    ACTUAL_VALUE_LABELS,
    CASH_DENOMINATION_LABELS,
    DAILY_TALLY_LABELS,
    INTERNAL_EXPENSE_LABELS
} from "./tallyTemplate";
import "../../Styles/DailyTally.css";

const today = new Date().toISOString().slice(0, 10);
const INTERNAL_EXPENSE_OPTIONS = [...INTERNAL_EXPENSE_LABELS, "EMPL SALARY", "EMPL ADVANCE", "OTHERS"];

const makeValueItems = (labels: string[]): TallyValueItemDto[] => labels.map(name => ({ name, value: 0 }));
const makeCashItems = (): CashDenominationItemDto[] => CASH_DENOMINATION_LABELS.map(name => ({ name, count: 0, amount: 0 }));

const makeEmptyPayload = (): DailyTallyPayloadDto => ({
    internalExpenses: [],
    externalExpenses: [],
    paymentVendors: [],
    staffSalaries: [],
    staffAdvances: [],
    approximateValues: [],
    dailyTallyValues: makeValueItems(DAILY_TALLY_LABELS),
    actualValues: makeValueItems(ACTUAL_VALUE_LABELS),
    cashDenominations: makeCashItems()
});

const toNumber = (value: string) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const parseDenominationValue = (label: string): number | null => {
    const normalized = label.replace(/,/g, "").trim();
    const match = normalized.match(/\d+/);
    if (!match) return null;

    const denomination = Number(match[0]);
    return Number.isFinite(denomination) ? denomination : null;
};

/** Collect all focusable tally inputs in DOM order */
const getAllTallyInputs = (): HTMLInputElement[] => {
    const page = document.querySelector(".daily-tally-page");
    if (!page) return [];
    return Array.from(page.querySelectorAll<HTMLInputElement>(
        "input:not([readonly]):not([type='date']):not([type='text'][disabled])"
    )).filter(el => !el.closest(".tally-header-actions") && !el.readOnly);
};

export default function DailyTallyPage() {
    usePageTitle("Daily Tally");

    const [tallyDate, setTallyDate] = useState(today);
    const [payload, setPayload] = useState<DailyTallyPayloadDto>(makeEmptyPayload());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const { data: distributors = [] } = useDistributors();
    const [vendorSearch, setVendorSearch] = useState("");
    const [selectedVendor, setSelectedVendor] = useState<DistributorDto | null>(null);
    const [vendorAmount, setVendorAmount] = useState("");
    const [showDistributorSearch, setShowDistributorSearch] = useState(false);

    const { data: salesmen = [] } = useSalesmen();
    const invalidate = useInvalidateQuery();
    const [internalExpenseType, setInternalExpenseType] = useState(INTERNAL_EXPENSE_OPTIONS[0]);
    const [internalOtherName, setInternalOtherName] = useState("");
    const [internalSalesmanSearch, setInternalSalesmanSearch] = useState("");
    const [internalSalesman, setInternalSalesman] = useState<SalesmanDto | null>(null);
    const [internalExpenseAmount, setInternalExpenseAmount] = useState("");

    // Refs for enter-key focus targets
    const internalAmountRef = useRef<HTMLInputElement>(null);
    const vendorAmountRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadByDate(tallyDate);
    }, [tallyDate]);

    const filteredDistributors = useMemo(() => {
        const q = vendorSearch.trim().toLowerCase();
        if (!q) return [];
        return distributors.filter(x => x.name.toLowerCase().includes(q)).slice(0, 8);
    }, [distributors, vendorSearch]);

    const filteredInternalSalesmen = useMemo(() => {
        const q = internalSalesmanSearch.trim().toLowerCase();
        if (!q) return [];
        return salesmen.filter(x => x.name.toLowerCase().includes(q)).slice(0, 8);
    }, [salesmen, internalSalesmanSearch]);

    const internalExpenseTotal = useMemo(
        () => payload.internalExpenses.reduce((sum, x) => sum + x.value, 0),
        [payload.internalExpenses]
    );

    const paymentVendorTotal = useMemo(
        () => payload.paymentVendors.reduce((sum, x) => sum + x.amount, 0),
        [payload.paymentVendors]
    );

    const incomeTotal = useMemo(
        () => payload.dailyTallyValues.reduce((sum, x) => sum + x.value, 0),
        [payload.dailyTallyValues]
    );

    const creditTotal = useMemo(
        () => payload.actualValues.reduce((sum, x) => sum + x.value, 0),
        [payload.actualValues]
    );

    const denominationTotal = useMemo(
        () => payload.cashDenominations.reduce((sum, x) => sum + x.amount, 0),
        [payload.cashDenominations]
    );

    const totalExpense = internalExpenseTotal + paymentVendorTotal;
    const netIncome = incomeTotal - totalExpense;
    const difference = creditTotal - netIncome;

    const updateValueRow = (key: "dailyTallyValues" | "actualValues", index: number, field: "name" | "value", raw: string) => {
        setPayload(prev => {
            const rows = [...prev[key]];
            rows[index] = {
                ...rows[index],
                [field]: field === "value" ? toNumber(raw) : raw
            };
            return { ...prev, [key]: rows };
        });
    };

    const addValueRow = (key: "dailyTallyValues" | "actualValues") => {
        setPayload(prev => ({
            ...prev,
            [key]: [...prev[key], { name: "", value: 0 }]
        }));
    };

    const removeValueRow = (key: "dailyTallyValues" | "actualValues", index: number) => {
        setPayload(prev => ({
            ...prev,
            [key]: prev[key].filter((_, i) => i !== index)
        }));
    };

    const addInternalExpense = () => {
        const amount = toNumber(internalExpenseAmount);
        if (amount <= 0) {
            toast.error("Enter valid expense amount");
            return;
        }

        let expenseName = internalExpenseType;
        let compensationType: "salary" | "advance" | null = null;

        if (internalExpenseType === "OTHERS") {
            if (!internalOtherName.trim()) {
                toast.error("Enter expense name for Others");
                return;
            }
            expenseName = internalOtherName.trim();
        }

        if (internalExpenseType === "EMPL SALARY" || internalExpenseType === "EMPL ADVANCE") {
            if (!internalSalesman) {
                toast.error("Select employee for salary/advance");
                return;
            }

            compensationType = internalExpenseType === "EMPL SALARY" ? "salary" : "advance";
            expenseName = `${internalExpenseType} - ${internalSalesman.name}`;

            setPayload(prev => {
                const key = compensationType === "salary" ? "staffSalaries" : "staffAdvances";
                const rows = [...prev[key]];
                const idx = rows.findIndex(x => x.salesmanId === internalSalesman.id);
                if (idx >= 0) {
                    rows[idx] = { ...rows[idx], amount: rows[idx].amount + amount };
                } else {
                    rows.push({ salesmanId: internalSalesman.id, salesmanName: internalSalesman.name, amount });
                }

                return { ...prev, [key]: rows };
            });
        }

        setPayload(prev => {
            const rows = [...prev.internalExpenses];
            const idx = rows.findIndex(x => x.name.toLowerCase() === expenseName.toLowerCase());
            if (idx >= 0) {
                rows[idx] = { ...rows[idx], value: rows[idx].value + amount };
            } else {
                rows.push({ name: expenseName, value: amount });
            }
            return { ...prev, internalExpenses: rows };
        });

        setInternalExpenseAmount("");
        setInternalOtherName("");
        setInternalSalesmanSearch("");
        setInternalSalesman(null);
    };

    const removeInternalExpense = (index: number) => {
        setPayload(prev => {
            const row = prev.internalExpenses[index];
            const nextInternal = prev.internalExpenses.filter((_, i) => i !== index);

            if (!row) {
                return prev;
            }

            if (row.name.startsWith("EMPL SALARY - ")) {
                const employeeName = row.name.replace("EMPL SALARY - ", "").trim();
                return {
                    ...prev,
                    internalExpenses: nextInternal,
                    staffSalaries: prev.staffSalaries.filter(x => x.salesmanName !== employeeName)
                };
            }

            if (row.name.startsWith("EMPL ADVANCE - ")) {
                const employeeName = row.name.replace("EMPL ADVANCE - ", "").trim();
                return {
                    ...prev,
                    internalExpenses: nextInternal,
                    staffAdvances: prev.staffAdvances.filter(x => x.salesmanName !== employeeName)
                };
            }

            return {
                ...prev,
                internalExpenses: nextInternal
            };
        });
    };

    const addPaymentVendor = () => {
        if (!selectedVendor) {
            toast.error("Select a distributor vendor");
            return;
        }

        const amount = toNumber(vendorAmount);
        if (amount <= 0) {
            toast.error("Enter vendor amount");
            return;
        }

        setPayload(prev => {
            const rows = [...prev.paymentVendors];
            const idx = rows.findIndex(x => x.name === selectedVendor.name);
            if (idx >= 0) {
                rows[idx] = { ...rows[idx], amount: rows[idx].amount + amount };
            } else {
                rows.push({ name: selectedVendor.name, amount });
            }
            return { ...prev, paymentVendors: rows };
        });

        setVendorSearch("");
        setSelectedVendor(null);
        setVendorAmount("");
    };

    const removePaymentVendor = (index: number) => {
        setPayload(prev => ({
            ...prev,
            paymentVendors: prev.paymentVendors.filter((_, i) => i !== index)
        }));
    };

    /** Update cash row — dynamically recalculate amount when count changes */
    const updateCashRow = (index: number, field: "count" | "amount", rawValue: string) => {
        const value = toNumber(rawValue);
        setPayload(prev => {
            const rows = [...prev.cashDenominations];
            const row = rows[index];

            if (field === "count") {
                const denom = parseDenominationValue(row.name);
                const newAmount = denom !== null ? parseFloat((denom * value).toFixed(2)) : row.amount;
                rows[index] = { ...row, count: value, amount: newAmount };
            } else {
                rows[index] = { ...row, amount: value };
            }

            return { ...prev, cashDenominations: rows };
        });
    };

    const clearDenomination = () => {
        setPayload(prev => ({
            ...prev,
            cashDenominations: makeCashItems()
        }));
    };

    const calculateDenomination = () => {
        setPayload(prev => {
            const updatedCash = prev.cashDenominations.map(item => {
                const parsed = parseDenominationValue(item.name);
                const amount = parsed !== null ? parseFloat((parsed * item.count).toFixed(2)) : item.amount;
                return { ...item, amount };
            });

            const actualDenomTotal = updatedCash.reduce((sum, x) => sum + x.amount, 0);

            const updatedCredits = [...prev.actualValues];
            const homeCashIndex = updatedCredits.findIndex(x => {
                const n = x.name.toLowerCase();
                return n.includes("home cash") || n.includes("cash in hand");
            });

            if (homeCashIndex >= 0) {
                updatedCredits[homeCashIndex] = { ...updatedCredits[homeCashIndex], value: actualDenomTotal };
            } else {
                updatedCredits.push({ name: "HOME CASH", value: actualDenomTotal });
            }

            return {
                ...prev,
                cashDenominations: updatedCash,
                actualValues: updatedCredits
            };
        });

        toast.success("Denomination calculated and Home Cash updated");
    };

    /** Global arrow/enter navigation across ALL tally inputs on the page */
    const handleGlobalKeyNav = (e: KeyboardEvent<HTMLInputElement>) => {
        const key = e.key;
        if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) return;

        const allInputs = getAllTallyInputs();
        const currentIdx = allInputs.indexOf(e.currentTarget);
        if (currentIdx < 0) return;

        // Try table-based column navigation first for Left/Right
        if (key === "ArrowLeft" || key === "ArrowRight") {
            const row = e.currentTarget.closest("tr");
            if (row) {
                const rowInputs = Array.from(row.querySelectorAll<HTMLInputElement>("input"));
                const colIdx = rowInputs.indexOf(e.currentTarget);
                if (colIdx >= 0) {
                    const nextCol = key === "ArrowLeft" ? colIdx - 1 : colIdx + 1;
                    if (nextCol >= 0 && nextCol < rowInputs.length) {
                        e.preventDefault();
                        rowInputs[nextCol].focus();
                        rowInputs[nextCol].select();
                        return;
                    }
                }
            }
            // If no sibling column, fall through to global list
            const nextIdx = key === "ArrowLeft" ? currentIdx - 1 : currentIdx + 1;
            if (nextIdx >= 0 && nextIdx < allInputs.length) {
                e.preventDefault();
                allInputs[nextIdx].focus();
                (allInputs[nextIdx] as HTMLInputElement).select();
            }
            return;
        }

        // Up / Down
        if (key === "ArrowUp" || key === "ArrowDown") {
            // Try staying in same table column first
            const table = e.currentTarget.closest("table");
            const row = e.currentTarget.closest("tr");
            if (table && row) {
                const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr"));
                const rowIdx = rows.indexOf(row as HTMLTableRowElement);
                const rowInputs = Array.from(row.querySelectorAll<HTMLInputElement>("input"));
                const colIdx = rowInputs.indexOf(e.currentTarget);

                const targetRowIdx = key === "ArrowUp" ? rowIdx - 1 : rowIdx + 1;
                if (targetRowIdx >= 0 && targetRowIdx < rows.length) {
                    const targetRowInputs = Array.from(rows[targetRowIdx].querySelectorAll<HTMLInputElement>("input"));
                    const safeCol = Math.min(colIdx, targetRowInputs.length - 1);
                    if (safeCol >= 0 && targetRowInputs[safeCol]) {
                        e.preventDefault();
                        targetRowInputs[safeCol].focus();
                        targetRowInputs[safeCol].select();
                        return;
                    }
                }
            }

            // Fall through: move to adjacent input in global list
            const nextIdx = key === "ArrowUp" ? currentIdx - 1 : currentIdx + 1;
            if (nextIdx >= 0 && nextIdx < allInputs.length) {
                e.preventDefault();
                allInputs[nextIdx].focus();
                (allInputs[nextIdx] as HTMLInputElement).select();
            }
        }
    };

    /** Enter on amount inputs triggers "Add" for internal expense / vendor payment */
    const handleInternalAmountKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addInternalExpense();
            return;
        }
        handleGlobalKeyNav(e);
    };

    const handleVendorAmountKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addPaymentVendor();
            return;
        }
        handleGlobalKeyNav(e);
    };

    const loadByDate = async (date: string) => {
        try {
            setLoading(true);
            const res = await getDailyTallyByDate(date);
            applyResponse(res);
        } catch {
            setPayload(makeEmptyPayload());
        } finally {
            setLoading(false);
        }
    };

    const applyResponse = (res: DailyTallyResponseDto) => {
        const base = makeEmptyPayload();
        const incoming = res.payload;
        setPayload({
            ...base,
            ...incoming,
            internalExpenses: incoming?.internalExpenses ?? [],
            paymentVendors: incoming?.paymentVendors ?? [],
            staffSalaries: incoming?.staffSalaries ?? [],
            staffAdvances: incoming?.staffAdvances ?? [],
            dailyTallyValues: incoming?.dailyTallyValues?.length ? incoming.dailyTallyValues : base.dailyTallyValues,
            actualValues: incoming?.actualValues?.length ? incoming.actualValues : base.actualValues,
            cashDenominations: incoming?.cashDenominations?.length ? incoming.cashDenominations : base.cashDenominations
        });
    };

    const onSave = async () => {
        try {
            setSaving(true);
            const result = await saveDailyTally({
                tallyDate,
                payload,
                totalIncome: incomeTotal,
                totalExpenses: totalExpense,
                net: netIncome,
                statusDifference: difference
            });
            applyResponse(result);
            invalidate(DAILY_TALLY_KEY);
            toast.success("Daily tally saved");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save daily tally");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="daily-tally-page">
            <div className="tally-header">
                <h2>Daily Tally</h2>
                <div className="tally-header-actions">
                    <input type="date" value={tallyDate} onChange={e => setTallyDate(e.target.value)} />
                    <button onClick={onSave} disabled={saving || loading}>{saving ? "Saving..." : "Save"}</button>
                </div>
            </div>

            <div className="tally-grid three">
                {/* ── Internal Expense ── */}
                <div className="tally-card tally-card-internal">
                    <h3>Internal Expense</h3>
                    <div className="vendor-add-row">
                        <select className="tally-select" value={internalExpenseType} onChange={e => setInternalExpenseType(e.target.value)}>
                            {INTERNAL_EXPENSE_OPTIONS.map(label => (
                                <option key={`int-opt-${label}`} value={label}>{label}</option>
                            ))}
                        </select>
                        <input
                            ref={internalAmountRef}
                            type="number"
                            inputMode="decimal"
                            step="any"
                            placeholder="Amount"
                            value={internalExpenseAmount}
                            onChange={e => setInternalExpenseAmount(e.target.value)}
                            onKeyDown={handleInternalAmountKeyDown}
                            className="no-spin"
                        />
                        <button type="button" onClick={addInternalExpense}>Add</button>
                    </div>

                    {internalExpenseType === "OTHERS" && (
                        <input className="tally-other-input" type="text" placeholder="Write expense name" value={internalOtherName} onChange={e => setInternalOtherName(e.target.value)} />
                    )}

                    {(internalExpenseType === "EMPL SALARY" || internalExpenseType === "EMPL ADVANCE") && (
                        <>
                            <input
                                className="tally-other-input"
                                type="text"
                                placeholder="Search employee..."
                                value={internalSalesmanSearch}
                                onChange={e => {
                                    setInternalSalesmanSearch(e.target.value);
                                    setInternalSalesman(null);
                                }}
                            />
                            {filteredInternalSalesmen.length > 0 && !internalSalesman && (
                                <div className="vendor-search-list">
                                    {filteredInternalSalesmen.map(item => (
                                        <button
                                            key={`employee-${item.id}`}
                                            type="button"
                                            className="vendor-search-item"
                                            onClick={() => {
                                                setInternalSalesman(item);
                                                setInternalSalesmanSearch(item.name);
                                            }}
                                        >
                                            {item.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    <table className="tally-table">
                        <thead>
                            <tr>
                                <th>Expense</th>
                                <th>Amount</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payload.internalExpenses.map((row, index) => (
                                <tr key={`internal-${row.name}-${index}`}>
                                    <td>{row.name}</td>
                                    <td>{row.value.toFixed(2)}</td>
                                    <td><button type="button" onClick={() => removeInternalExpense(index)}>Remove</button></td>
                                </tr>
                            ))}
                            <tr className="tally-total-row">
                                <td>Total</td>
                                <td>{internalExpenseTotal.toFixed(2)}</td>
                                <td />
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── Payment Vendor ── */}
                <div className="tally-card tally-card-vendors">
                    <h3>Payment Vendor</h3>
                    <div className="vendor-add-row">
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <input
                                type="text"
                                placeholder="Search distributor..."
                                value={vendorSearch}
                                onChange={e => {
                                    setVendorSearch(e.target.value);
                                    setSelectedVendor(null);
                                }}
                                style={{ flex: 1, minWidth: 0 }}
                            />
                            <button
                                type="button"
                                className="tally-search-btn"
                                onClick={() => setShowDistributorSearch(true)}
                                title="Search distributor"
                                style={{
                                    padding: "4px 8px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    background: "#2f5fd7",
                                    color: "white",
                                    border: "1px solid #1e3fa1",
                                    borderRadius: "2px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "22px"
                                }}
                            >
                                🔍
                            </button>
                        </div>
                        <input
                            ref={vendorAmountRef}
                            type="number"
                            inputMode="decimal"
                            step="any"
                            placeholder="Amount"
                            value={vendorAmount}
                            onChange={e => setVendorAmount(e.target.value)}
                            onKeyDown={handleVendorAmountKeyDown}
                            className="no-spin"
                        />
                        <button type="button" onClick={addPaymentVendor}>Add</button>
                    </div>
                    {filteredDistributors.length > 0 && !selectedVendor && (
                        <div className="vendor-search-list">
                            {filteredDistributors.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="vendor-search-item"
                                    onClick={() => {
                                        setSelectedVendor(item);
                                        setVendorSearch(item.name);
                                    }}
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>
                    )}
                    <table className="tally-table">
                        <thead>
                            <tr>
                                <th>Vendor</th>
                                <th>Amount</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payload.paymentVendors.map((row, index) => (
                                <tr key={`vendor-${row.name}-${index}`}>
                                    <td>{row.name}</td>
                                    <td>{row.amount.toFixed(2)}</td>
                                    <td><button type="button" onClick={() => removePaymentVendor(index)}>Remove</button></td>
                                </tr>
                            ))}
                            <tr className="tally-total-row">
                                <td>Total</td>
                                <td>{paymentVendorTotal.toFixed(2)}</td>
                                <td />
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── Cash Denomination ── */}
                <div className="tally-card tally-card-cash">
                    <h3>Cash Denomination</h3>
                    <table className="tally-table">
                        <thead>
                            <tr>
                                <th>Note</th>
                                <th>Count</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payload.cashDenominations.map((row, index) => (
                                <tr key={`cash-${row.name}`}>
                                    <td>{row.name}</td>
                                    <td>
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            step="any"
                                            className="no-spin"
                                            value={row.count === 0 ? "" : row.count}
                                            placeholder="0"
                                            onChange={e => updateCashRow(index, "count", e.target.value)}
                                            onKeyDown={handleGlobalKeyNav}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            step="any"
                                            className="no-spin"
                                            value={row.amount === 0 ? "" : row.amount}
                                            placeholder="0.00"
                                            onChange={e => updateCashRow(index, "amount", e.target.value)}
                                            onKeyDown={handleGlobalKeyNav}
                                        />
                                    </td>
                                </tr>
                            ))}
                            <tr className="tally-total-row">
                                <td>Total</td>
                                <td />
                                <td>{denominationTotal.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="denom-actions">
                        <button type="button" onClick={calculateDenomination}>Calculate &amp; Apply</button>
                        <button type="button" className="denom-clear-btn" onClick={clearDenomination}>Clear</button>
                    </div>
                </div>
            </div>

            <div className="tally-grid three">
                {/* ── Income ── */}
                <div className="tally-card tally-card-daily">
                    <h3>Income</h3>
                    <table className="tally-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Amount</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payload.dailyTallyValues.map((row, index) => (
                                <tr key={`income-${index}`}>
                                    <td><input type="text" value={row.name} onChange={e => updateValueRow("dailyTallyValues", index, "name", e.target.value)} onKeyDown={handleGlobalKeyNav} /></td>
                                    <td>
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            step="any"
                                            className="no-spin"
                                            value={row.value === 0 ? "" : row.value}
                                            placeholder="0.00"
                                            onChange={e => updateValueRow("dailyTallyValues", index, "value", e.target.value)}
                                            onKeyDown={handleGlobalKeyNav}
                                        />
                                    </td>
                                    <td><button type="button" onClick={() => removeValueRow("dailyTallyValues", index)}>Remove</button></td>
                                </tr>
                            ))}
                            <tr className="tally-total-row">
                                <td>Total</td>
                                <td>{incomeTotal.toFixed(2)}</td>
                                <td><button type="button" onClick={() => addValueRow("dailyTallyValues")}>Add Row</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── Cash Credits ── */}
                <div className="tally-card tally-card-actual">
                    <h3>Cash Credits</h3>
                    <table className="tally-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Amount</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payload.actualValues.map((row, index) => (
                                <tr key={`credit-${index}`}>
                                    <td><input type="text" value={row.name} onChange={e => updateValueRow("actualValues", index, "name", e.target.value)} onKeyDown={handleGlobalKeyNav} /></td>
                                    <td>
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            step="any"
                                            className="no-spin"
                                            value={row.value === 0 ? "" : row.value}
                                            placeholder="0.00"
                                            onChange={e => updateValueRow("actualValues", index, "value", e.target.value)}
                                            onKeyDown={handleGlobalKeyNav}
                                        />
                                    </td>
                                    <td><button type="button" onClick={() => removeValueRow("actualValues", index)}>Remove</button></td>
                                </tr>
                            ))}
                            <tr className="tally-total-row">
                                <td>Total</td>
                                <td>{creditTotal.toFixed(2)}</td>
                                <td><button type="button" onClick={() => addValueRow("actualValues")}>Add Row</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ── Summary ── */}
                <div className="tally-card tally-card-summary">
                    <h3>Summary</h3>
                    <div className="tally-summary">
                        <label>Total Income</label>
                        <input type="number" value={incomeTotal.toFixed(2)} readOnly />
                        <label>Total Expense (Internal + Vendors)</label>
                        <input type="number" value={totalExpense.toFixed(2)} readOnly />
                        <label>Net Income</label>
                        <input type="number" value={netIncome.toFixed(2)} readOnly />
                        <label>Total Credits</label>
                        <input type="number" value={creditTotal.toFixed(2)} readOnly />
                        <label>Difference (Net - Credits)</label>
                        <input
                            className={difference > 0 ? "diff-positive" : difference < 0 ? "diff-negative" : "diff-zero"}
                            type="number"
                            value={difference.toFixed(2)}
                            readOnly
                        />
                    </div>
                </div>
            </div>
            {showDistributorSearch && (
                <DistributorSearchModal
                    distributors={distributors}
                    onSelect={(distributor) => {
                        setSelectedVendor(distributor);
                        setVendorSearch(distributor.name);
                        setShowDistributorSearch(false);
                    }}
                    onClose={() => setShowDistributorSearch(false)}
                />
            )}
        </div>
    );
}
