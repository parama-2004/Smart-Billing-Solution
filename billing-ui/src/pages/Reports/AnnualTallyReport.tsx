import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getAnnualTallyReport } from "../../api/dailyTallyApi";
import type { AnnualTallyReportResponse } from "../../models/DailyTally";

export default function AnnualTallyReport() {
    usePageTitle("Annual Tally Report");

    const [year, setYear] = useState(new Date().getFullYear());
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [expenseName, setExpenseName] = useState("");
    const [data, setData] = useState<AnnualTallyReportResponse | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const useRange = Boolean(fromDate && toDate);
            const res = await getAnnualTallyReport(
                useRange ? undefined : year,
                useRange ? fromDate : undefined,
                useRange ? toDate : undefined,
                expenseName.trim() || undefined
            );
            setData(res);
        } catch {
            setData(null);
            toast.error("Failed to load annual tally report");
        } finally {
            setLoading(false);
        }
    };

    const fmt = (n: number) =>
        "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const grandEntries = data?.rows.reduce((s, r) => s + r.entryCount, 0) ?? 0;

    return (
        <div style={styles.page}>
            {/* ── Header ── */}
            <div style={styles.header}>
                <div>
                    <h2 style={styles.headerTitle}>📅 Annual Tally Report</h2>
                    <p style={styles.headerSub}>Summary of income &amp; expenses by month</p>
                </div>

                {/* Filter Row */}
                <div style={styles.filterRow}>
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Year</label>
                        <input
                            type="number"
                            min={2000}
                            max={2200}
                            value={year}
                            onChange={e => setYear(Number(e.target.value) || new Date().getFullYear())}
                            style={styles.filterInput}
                        />
                    </div>

                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>From</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                            style={styles.filterInput}
                        />
                    </div>

                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>To</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                            style={styles.filterInput}
                        />
                    </div>

                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Expense Filter</label>
                        <input
                            type="text"
                            placeholder="e.g. BUSFARE"
                            value={expenseName}
                            onChange={e => setExpenseName(e.target.value)}
                            style={{ ...styles.filterInput, minWidth: 130 }}
                        />
                    </div>

                    <button onClick={load} disabled={loading} style={styles.loadBtn}>
                        {loading ? "⏳ Loading…" : "▶ Load"}
                    </button>
                </div>
            </div>

            {/* ── Date Range Banner ── */}
            {data && (
                <div style={styles.rangeBanner}>
                    <span style={styles.rangeChip}>
                        📆 {new Date(data.fromDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        &nbsp;→&nbsp;
                        {new Date(data.toDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    {data.expenseName && (
                        <span style={styles.rangeChip}>
                            🏷️ {data.expenseName}&nbsp;— {fmt(data.expenseTotal)}
                        </span>
                    )}
                </div>
            )}

            {/* ── KPI Cards ── */}
            {data && (
                <div style={styles.kpiRow}>
                    <div style={{ ...styles.kpiCard, borderTop: "4px solid #16a34a" }}>
                        <div style={styles.kpiLabel}>Total Income</div>
                        <div style={{ ...styles.kpiValue, color: "#16a34a" }}>{fmt(data.totalIncome)}</div>
                    </div>
                    <div style={{ ...styles.kpiCard, borderTop: "4px solid #dc2626" }}>
                        <div style={styles.kpiLabel}>Total Expenses</div>
                        <div style={{ ...styles.kpiValue, color: "#dc2626" }}>{fmt(data.totalExpenses)}</div>
                    </div>
                    <div style={{ ...styles.kpiCard, borderTop: "4px solid #2563eb" }}>
                        <div style={styles.kpiLabel}>Net Profit / Loss</div>
                        <div style={{ ...styles.kpiValue, color: data.net >= 0 ? "#16a34a" : "#dc2626" }}>
                            {fmt(data.net)}
                        </div>
                    </div>
                    <div style={{ ...styles.kpiCard, borderTop: "4px solid #9333ea" }}>
                        <div style={styles.kpiLabel}>Total Entries</div>
                        <div style={{ ...styles.kpiValue, color: "#9333ea" }}>{grandEntries}</div>
                    </div>
                </div>
            )}

            {/* ── Table ── */}
            <div style={styles.tableWrapper}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ ...styles.th, width: "20%", textAlign: "left" }}>Month</th>
                            <th style={{ ...styles.th, width: "12%", textAlign: "center" }}>Entries</th>
                            <th style={{ ...styles.th, width: "23%", textAlign: "right" }}>Total Income</th>
                            <th style={{ ...styles.th, width: "23%", textAlign: "right" }}>Total Expenses</th>
                            <th style={{ ...styles.th, width: "22%", textAlign: "right" }}>Net</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!data || data.rows.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={styles.emptyCell}>
                                    {loading ? "Loading data…" : "No records found. Adjust filters and click Load."}
                                </td>
                            </tr>
                        ) : (
                            data.rows.map((row, idx) => {
                                const isPositive = row.net > 0;
                                const isNegative = row.net < 0;
                                return (
                                    <tr
                                        key={row.month}
                                        style={{
                                            background: idx % 2 === 0 ? "#f9fafb" : "#ffffff",
                                        }}
                                    >
                                        <td style={{ ...styles.td, fontWeight: 700, textAlign: "left" }}>
                                            {row.monthName}
                                        </td>
                                        <td style={{ ...styles.td, textAlign: "center" }}>
                                            <span style={styles.badge}>{row.entryCount}</span>
                                        </td>
                                        <td style={{ ...styles.td, textAlign: "right", color: "#16a34a", fontWeight: 600 }}>
                                            {fmt(row.totalIncome)}
                                        </td>
                                        <td style={{ ...styles.td, textAlign: "right", color: "#dc2626", fontWeight: 600 }}>
                                            {fmt(row.totalExpenses)}
                                        </td>
                                        <td style={{
                                            ...styles.td,
                                            textAlign: "right",
                                            fontWeight: 700,
                                            color: isPositive ? "#15803d" : isNegative ? "#b91c1c" : "#374151",
                                            background: isPositive ? "#dcfce7" : isNegative ? "#fee2e2" : undefined,
                                            borderRadius: 4
                                        }}>
                                            {isPositive ? "▲ " : isNegative ? "▼ " : ""}{fmt(row.net)}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {data && data.rows.length > 0 && (
                        <tfoot>
                            <tr style={styles.footerRow}>
                                <td style={{ ...styles.td, ...styles.footerCell, textAlign: "left" }}>TOTAL</td>
                                <td style={{ ...styles.td, ...styles.footerCell, textAlign: "center" }}>{grandEntries}</td>
                                <td style={{ ...styles.td, ...styles.footerCell, textAlign: "right", color: "#15803d" }}>
                                    {fmt(data.totalIncome)}
                                </td>
                                <td style={{ ...styles.td, ...styles.footerCell, textAlign: "right", color: "#b91c1c" }}>
                                    {fmt(data.totalExpenses)}
                                </td>
                                <td style={{
                                    ...styles.td, ...styles.footerCell, textAlign: "right",
                                    color: data.net >= 0 ? "#15803d" : "#b91c1c"
                                }}>
                                    {fmt(data.net)}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}

/* ─── Inline styles ─── */
const styles = {
    page: {
        padding: "16px 20px",
        minHeight: "100vh",
        background: "#f1f5f9",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#1e293b",
        boxSizing: "border-box" as const,
    },
    header: {
        background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
        borderRadius: 8,
        padding: "14px 20px",
        marginBottom: 14,
        display: "flex",
        flexWrap: "wrap" as const,
        gap: 16,
        alignItems: "flex-end",
        justifyContent: "space-between",
    },
    headerTitle: {
        margin: 0,
        fontSize: 22,
        fontWeight: 700,
        color: "#fff",
        letterSpacing: 0.4,
    },
    headerSub: {
        margin: "4px 0 0",
        fontSize: 12,
        color: "#bfdbfe",
    },
    filterRow: {
        display: "flex",
        flexWrap: "wrap" as const,
        gap: 10,
        alignItems: "flex-end",
    },
    filterGroup: {
        display: "flex",
        flexDirection: "column" as const,
        gap: 3,
    },
    filterLabel: {
        fontSize: 11,
        fontWeight: 600,
        color: "#bfdbfe",
        textTransform: "uppercase" as const,
        letterSpacing: 0.4,
    },
    filterInput: {
        padding: "5px 8px",
        border: "1px solid #93c5fd",
        borderRadius: 4,
        fontSize: 13,
        background: "#fff",
        color: "#1e293b",
        minWidth: 90,
        outline: "none",
    },
    loadBtn: {
        padding: "7px 18px",
        background: "#22c55e",
        color: "#fff",
        border: "none",
        borderRadius: 4,
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
        letterSpacing: 0.3,
        whiteSpace: "nowrap" as const,
        alignSelf: "flex-end",
    },
    rangeBanner: {
        display: "flex",
        flexWrap: "wrap" as const,
        gap: 10,
        marginBottom: 14,
    },
    rangeChip: {
        background: "#e0f2fe",
        border: "1px solid #7dd3fc",
        borderRadius: 20,
        padding: "4px 14px",
        fontSize: 13,
        fontWeight: 600,
        color: "#0369a1",
    },
    kpiRow: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        gap: 12,
        marginBottom: 16,
    },
    kpiCard: {
        background: "#fff",
        borderRadius: 8,
        padding: "14px 16px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    },
    kpiLabel: {
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: 0.5,
        color: "#64748b",
        marginBottom: 6,
    },
    kpiValue: {
        fontSize: 20,
        fontWeight: 800,
    },
    tableWrapper: {
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        overflow: "auto",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse" as const,
        tableLayout: "fixed" as const,
        minWidth: 560,
    },
    th: {
        background: "linear-gradient(180deg, #1e3a8a 0%, #1d4ed8 100%)",
        color: "#fff",
        padding: "10px 14px",
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: 0.5,
        borderBottom: "2px solid #1e40af",
        whiteSpace: "nowrap" as const,
    },
    td: {
        padding: "9px 14px",
        fontSize: 13,
        borderBottom: "1px solid #e2e8f0",
        verticalAlign: "middle" as const,
        whiteSpace: "nowrap" as const,
        overflow: "hidden" as const,
        textOverflow: "ellipsis" as const,
    },
    badge: {
        display: "inline-block",
        background: "#ede9fe",
        color: "#7c3aed",
        borderRadius: 12,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 700,
    },
    emptyCell: {
        padding: "40px 20px",
        textAlign: "center" as const,
        color: "#94a3b8",
        fontSize: 14,
        fontStyle: "italic" as const,
    },
    footerRow: {
        background: "#1e3a8a",
    },
    footerCell: {
        color: "#fff",
        fontWeight: 800,
        fontSize: 13,
        borderTop: "2px solid #1e40af",
    },
} as const;
