import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getDailyTallyByDate } from "../../api/dailyTallyApi";
import type { DailyTallyResponseDto } from "../../models/DailyTally";
import "../../Styles/DailyTally.css";

const today = new Date().toISOString().slice(0, 10);

type ValueRow = { name: string; value: number };
type VendorRow = { name: string; amount: number };
type CashRow = { name: string; count: number; amount: number };

export default function DailyTallyReport() {
    usePageTitle("Daily Tally Report");
    const [date, setDate] = useState(today);
    const [data, setData] = useState<DailyTallyResponseDto | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        try {
            setLoading(true);
            const res = await getDailyTallyByDate(date);
            setData(res);
        } catch {
            setData(null);
            toast.error("No saved daily tally found for selected date");
        } finally {
            setLoading(false);
        }
    };

    const totals = useMemo(() => {
        if (!data) {
            return {
                internal: 0,
                vendors: 0,
                denom: 0,
                income: 0,
                credits: 0
            };
        }

        return {
            internal: data.payload.internalExpenses.reduce((sum, x) => sum + x.value, 0),
            vendors: data.payload.paymentVendors.reduce((sum, x) => sum + x.amount, 0),
            denom: data.payload.cashDenominations.reduce((sum, x) => sum + x.amount, 0),
            income: data.payload.dailyTallyValues.reduce((sum, x) => sum + x.value, 0),
            credits: data.payload.actualValues.reduce((sum, x) => sum + x.value, 0)
        };
    }, [data]);

    return (
        <div className="daily-tally-page">
            <div className="tally-header">
                <h2>Daily Tally Report</h2>
                <div className="tally-header-actions">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    <button onClick={load} disabled={loading}>{loading ? "Loading..." : "Load Report"}</button>
                </div>
            </div>

            {!data ? (
                <div className="tally-card">No data available.</div>
            ) : (
                <>
                    <div className="tally-grid three">
                        <ReadOnlyValueCard title="Internal Expense" rows={data.payload.internalExpenses} total={totals.internal} />
                        <ReadOnlyVendorCard title="Payment Vendor" rows={data.payload.paymentVendors} total={totals.vendors} />
                        <ReadOnlyCashCard title="Cash Denomination" rows={data.payload.cashDenominations} total={totals.denom} />
                    </div>

                    <div className="tally-grid three">
                        <ReadOnlyValueCard title="Income" rows={data.payload.dailyTallyValues} total={totals.income} />
                        <ReadOnlyValueCard title="Cash Credits" rows={data.payload.actualValues} total={totals.credits} />
                        <div className="tally-card tally-card-summary">
                            <h3>Summary</h3>
                            <div className="tally-inline-stats column">
                                <span>Total Income: {data.totalIncome.toFixed(2)}</span>
                                <span>Total Expenses: {data.totalExpenses.toFixed(2)}</span>
                                <span>Net Income: {data.net.toFixed(2)}</span>
                                <span>Status / Difference: {data.statusDifference.toFixed(2)}</span>
                                <span>Updated: {new Date(data.updatedAt).toLocaleString("en-IN")}</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function ReadOnlyValueCard({ title, rows, total }: { title: string; rows: ValueRow[]; total: number }) {
    return (
        <div className="tally-card">
            <h3>{title}</h3>
            <table className="tally-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={`${title}-${row.name}-${index}`}>
                            <td>{row.name}</td>
                            <td>{row.value}</td>
                        </tr>
                    ))}
                    <tr className="tally-total-row">
                        <td>Total</td>
                        <td>{total.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function ReadOnlyVendorCard({ title, rows, total }: { title: string; rows: VendorRow[]; total: number }) {
    return (
        <div className="tally-card">
            <h3>{title}</h3>
            <table className="tally-table">
                <thead>
                    <tr>
                        <th>Vendor</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={`${title}-${row.name}-${index}`}>
                            <td>{row.name}</td>
                            <td>{row.amount}</td>
                        </tr>
                    ))}
                    <tr className="tally-total-row">
                        <td>Total</td>
                        <td>{total.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function ReadOnlyCashCard({ title, rows, total }: { title: string; rows: CashRow[]; total: number }) {
    return (
        <div className="tally-card">
            <h3>{title}</h3>
            <table className="tally-table">
                <thead>
                    <tr>
                        <th>Note</th>
                        <th>Count</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={`${title}-${row.name}-${index}`}>
                            <td>{row.name}</td>
                            <td>{row.count}</td>
                            <td>{row.amount}</td>
                        </tr>
                    ))}
                    <tr className="tally-total-row">
                        <td>Total</td>
                        <td />
                        <td>{total.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
