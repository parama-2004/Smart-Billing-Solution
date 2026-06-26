import type { InvoiceResponseDto, InvoiceItemDto } from "../models/Invoice";
import { getCustomerByIdC } from "../api/customerApi";
import type { CustomerDto } from "../models/Customer";
import { useEffect, useState } from "react";
import logo from "../assets/smart-logo.png";
import { formatToDDMMYYYY } from "../utils/dateUtils";
//import type { styleText } from "util";

interface Props {
    invoice: InvoiceResponseDto;
    shop: {
        name: string;
        address: string;
        phone: string;
        gstin?: string;
        state?: string;
        stateCode?: string;
        counterName?: string;
    };
    cashReceived?: number;
    changeAmount?: number;
}

const Receipt80mm = ({ invoice, shop, cashReceived = 0, changeAmount = 0 }: Props) => {
    const [customer, setCustomer] = useState<CustomerDto | null>(null);
    const [loadingCustomer, setLoadingCustomer] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState<string>(logo);

    // Debug: Log invoice data to see what's available
    console.log("Invoice data:", invoice);
    console.log("Salesman name:", invoice.salesmanId);
    console.log("First item HSN:", invoice.items[0]?.hsnCode);

    // Filter return items (negative quantity)
    const returnItems = invoice.items.filter(item => item.quantity < 0);
    const saleItems = invoice.items.filter(item => item.quantity >= 0);

    // Fetch customer if customerId exists
    useEffect(() => {
        const fetchCustomer = async () => {
            if (invoice.customerId) {
                setLoadingCustomer(true);
                try {
                    const data = await getCustomerByIdC(invoice.customerId);
                    setCustomer(data);
                } catch (error) {
                    console.error("Error fetching customer:", error);
                    setCustomer(null);
                } finally {
                    setLoadingCustomer(false);
                }
            } else {
                setCustomer(null);
                setLoadingCustomer(false);
            }
        };

        fetchCustomer();
    }, [invoice.customerId]);

    useEffect(() => {
        let active = true;

        const convertLogoToDataUrl = async () => {
            try {
                const response = await fetch(logo);
                const blob = await response.blob();
                const reader = new FileReader();

                reader.onloadend = () => {
                    if (active && typeof reader.result === "string") {
                        setLogoDataUrl(reader.result);
                    }
                };

                reader.readAsDataURL(blob);
            } catch (error) {
                console.error("Failed to convert receipt logo to base64:", error);
            }
        };

        void convertLogoToDataUrl();

        return () => {
            active = false;
        };
    }, []);

    // Get customer mobile from customer object or fallback with masking (e.g., XXXXXX1234)
    const rawMobile = customer?.mobile || "";
    const customerMobile = rawMobile && rawMobile !== "-"
        ? (rawMobile.length > 4
            ? "X".repeat(rawMobile.length - 4) + rawMobile.slice(-4)
            : rawMobile)
        : "-";
    const customerCode = customer?.customerCode || "-";

    // Get loyalty points from customer object
    const overallPoints = customer?.loyaltyPoints || 0;
    const pointsEarnedToday = Math.max(0, Math.floor(invoice.totalAmount / 100));

    // Calculate GST split
    const calculateGST = (item: InvoiceItemDto, isInterState: boolean = false) => {
        const gstPercentage = item.gstPercentage || 0;

        if (gstPercentage <= 0) {
            return {
                taxableValue: item.lineTotal,
                totalGST: 0,
                cgstAmount: 0,
                sgstAmount: 0,
                igstAmount: 0,
                cgstRate: 0,
                sgstRate: 0,
                igstRate: 0,
                isIGST: false
            };
        }

        // GST INCLUDED in price (retail standard)
        const taxableValue = (item.lineTotal * 100) / (100 + gstPercentage);
        const totalGST = item.lineTotal - taxableValue;

        if (isInterState) {
            // Inter-state: IGST only
            return {
                taxableValue,
                totalGST,
                cgstAmount: 0,
                sgstAmount: 0,
                igstAmount: totalGST,
                cgstRate: 0,
                sgstRate: 0,
                igstRate: gstPercentage,
                isIGST: true
            };
        } else {
            // Intra-state: CGST + SGST (equal split)
            const halfGST = totalGST / 2;
            const halfRate = gstPercentage / 2;
            return {
                taxableValue,
                totalGST,
                cgstAmount: halfGST,
                sgstAmount: halfGST,
                igstAmount: 0,
                cgstRate: halfRate,
                sgstRate: halfRate,
                igstRate: 0,
                isIGST: false
            };
        }
    };

    // Calculate invoice totals
    const calculateInvoiceTotals = (items: InvoiceItemDto[], isInterState: boolean = false) => {
        const totals = {
            totalMRPValue: 0,
            totalDiscount: 0,
            totalTaxable: 0,
            totalCGST: 0,
            totalSGST: 0,
            totalIGST: 0,
            totalGST: 0,
            totalLineTotal: 0
        };

        items.forEach(item => {
            // Use absolute values for calculations
            const absoluteQuantity = Math.abs(item.quantity);
            const absoluteLineTotal = Math.abs(item.lineTotal);

            // MRP value (printed price)
            const itemMRP = item.mrp || item.unitPrice;
            const totalMRP = itemMRP * absoluteQuantity;

            // Discount (if MRP > selling price)
            const discount = totalMRP - absoluteLineTotal;

            // GST calculation
            const gst = calculateGST({
                ...item,
                quantity: absoluteQuantity,
                lineTotal: absoluteLineTotal
            }, isInterState);

            // Accumulate totals
            totals.totalMRPValue += totalMRP;
            totals.totalDiscount += discount > 0 ? discount : 0;
            totals.totalTaxable += gst.taxableValue;
            totals.totalCGST += gst.cgstAmount;
            totals.totalSGST += gst.sgstAmount;
            totals.totalIGST += gst.igstAmount;
            totals.totalGST += gst.totalGST;
            totals.totalLineTotal += item.lineTotal; // Keep signed total for net calculation
        });

        return totals;
    };

    // Calculate totals
    const saleTotals = calculateInvoiceTotals(saleItems, false);
    const returnTotals = calculateInvoiceTotals(returnItems, false);

    const netTotal = saleTotals.totalLineTotal + returnTotals.totalLineTotal;
    const isRefundBill = netTotal < 0 || invoice.status === "Refunded" || invoice.status === "PartiallyRefunded";
    const refundAmount = Math.abs(netTotal);
    const redeemedItems = invoice.redeemedItems ?? [];
    // const hasGST = saleTotals.totalGST > 0 || returnTotals.totalGST > 0;
    //const hasDiscount = saleTotals.totalDiscount > 0 || returnTotals.totalDiscount > 0;

    const gstSlabs = (() => {
        const slabsMap = new Map<number, { taxableValue: number; totalGST: number; cgstAmount: number; sgstAmount: number; igstAmount: number }>();
        const isInterState = false; // Assuming intra-state for local retail

        invoice.items.forEach(item => {
            const gstPercentage = item.gstPercentage || 0;
            if (gstPercentage <= 0) return;

            const gst = calculateGST(item, isInterState);

            const current = slabsMap.get(gstPercentage) || { taxableValue: 0, totalGST: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };

            slabsMap.set(gstPercentage, {
                taxableValue: current.taxableValue + gst.taxableValue,
                totalGST: current.totalGST + gst.totalGST,
                cgstAmount: current.cgstAmount + gst.cgstAmount,
                sgstAmount: current.sgstAmount + gst.sgstAmount,
                igstAmount: current.igstAmount + gst.igstAmount
            });
        });

        return Array.from(slabsMap.entries())
            .map(([percentage, values]) => ({ percentage, ...values }))
            .filter(slab => Math.abs(slab.totalGST) > 0.01)
            .sort((a, b) => a.percentage - b.percentage);
    })();

    return (
        <div style={receipt}>
            <style>
                {`
                @media print {
                    html, body {
                        width: 80mm;
                        margin: 0;
                        padding: 0;
                    }
                    * {
                        box-sizing: border-box;
                        -webkit-font-smoothing: none !important;
                    }
                    body {
                        zoom: 1;
                        transform: scale(1);
                    }
                }
                `}
            </style>
            {/* Shop Header */}
            <center>
                <img src={logoDataUrl} alt="Shop Logo" style={logoStyle} />
                <div style={shopDetails}>{shop.name}</div>
                <div style={shopDetails}>{shop.address}</div>
                {shop.state && <div style={shopDetails}>{shop.state}</div>}
                <div style={shopDetails}>Ph: {shop.phone}</div>
                {shop.gstin && <div style={shopDetails}>GSTIN: {shop.gstin}</div>}
            </center>

            <hr style={divider} />

            {/* Invoice Header */}
            <div style={invoiceHeader}>
                <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 13 }}>RETAIL INVOICE</div>
                <div style={summaryRow1}>
                    <span>No: <strong>{invoice.invoiceNumber}</strong></span>
                    <span>Date: {formatToDDMMYYYY(invoice.date)}</span>
                </div>
                <div style={summaryRow1}>
                    <span>Salesman: {invoice.salesmanId || "01"}</span>
                    <span>Time: {new Date(invoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                <div style={summaryRow1}>
                    <span>Customer ID: {loadingCustomer ? "..." : customerCode}</span>
                    <span>Mobile: <strong>{loadingCustomer ? "..." : customerMobile}</strong></span>
                </div>
                <div style={{ ...summaryRow1, justifyContent: "flex-start" }}>
                    <span>Name: &nbsp;<strong>{invoice.customerName || "Walk-in Customer"}</strong></span>
                </div>
            </div>

            <hr style={divider} />

            {/* SALE ITEMS TABLE */}
            {saleItems.length > 0 && (
                <>
                    <div style={sectionTitle}>SALE ITEMS</div>
                    <table style={itemsTable}>
                        <thead>
                            <tr>
                                <th style={colItem}>Item</th>
                                <th style={colQty}>Qty</th>
                                <th style={colMRP}>MRP</th>
                                <th style={colRate}>Rate</th>
                                <th style={colTotal}>Amt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {saleItems.map((item, idx) => {
                                const itemMRP = item.mrp || item.unitPrice;
                                //const mrpTotal = itemMRP * item.quantity;
                                // const discount = mrpTotal - item.lineTotal;

                                return (
                                    <tr key={`sale-${idx}`}>
                                        <td style={{ ...colItem, maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {item.productName}
                                            {item.hsnCode && (
                                                <div style={{ fontSize: '10px', color: '#000', marginTop: '1px', fontWeight: "normal", whiteSpace: 'nowrap' }}>
                                                    HSN:{item.hsnCode}
                                                </div>
                                            )}
                                        </td>
                                        <td style={colQty}>{item.quantity}</td>
                                        <td style={colMRP}>{itemMRP.toFixed(2)}</td>
                                        <td style={colRate}>{item.unitPrice.toFixed(2)}</td>
                                        <td style={colTotal}>
                                            {item.lineTotal.toFixed(2)}
                                            {/* {discount > 0 && <div style={discountBadge}>-₹{discount.toFixed(2)}</div>} */}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <hr style={divider} />
                </>
            )}

            {/* RETURN ITEMS TABLE */}
            {returnItems.length > 0 && (
                <>
                    <div style={sectionTitle}>RETURN ITEMS</div>
                    <table style={itemsTable}>
                        <thead>
                            <tr>
                                <th style={colItem}>Item</th>
                                <th style={colQty}>Qty</th>
                                <th style={colMRP}>MRP</th>
                                <th style={colRate}>Rate</th>
                                <th style={colTotal}>Amt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {returnItems.map((item, idx) => {
                                const absoluteQty = Math.abs(item.quantity);
                                const absoluteLineTotal = Math.abs(item.lineTotal);
                                const itemMRP = item.mrp || item.unitPrice;
                                const mrpTotal = itemMRP * absoluteQty;
                                const discount = mrpTotal - absoluteLineTotal;

                                return (
                                    <tr key={`return-${idx}`}>
                                        <td style={{ ...colItem, maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {item.productName} <strong>[RET]</strong>
                                            {item.hsnCode && (
                                                <div style={{ fontSize: '10px', color: '#000', marginTop: '1px', fontWeight: "normal", whiteSpace: 'nowrap' }}>
                                                    HSN:{item.hsnCode}
                                                </div>
                                            )}
                                        </td>
                                        <td style={colQty}>-{absoluteQty}</td>
                                        <td style={colMRP}>₹{itemMRP.toFixed(2)}</td>
                                        <td style={colRate}>₹{item.unitPrice.toFixed(2)}</td>
                                        <td style={colTotal}>
                                            -₹{absoluteLineTotal.toFixed(2)}
                                            {discount > 0 && <div style={discountBadge}>-₹{discount.toFixed(2)}</div>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <hr style={divider} />
                </>
            )}

            {/* Summary Section */}
            <div style={summary}>
                {saleItems.length > 0 && (
                    <>
                        <div style={{ ...summaryRow, fontWeight: 'bold' }}>SALE SUMMARY:</div>
                        <div style={summaryRow}>
                            <span>Sale MRP Value:</span>
                            <span>₹{saleTotals.totalMRPValue.toFixed(2)}</span>
                        </div>
                        {saleTotals.totalDiscount > 0 && (
                            <div style={summaryRow}>
                                <span>Sale Discount:</span>
                                <span>- ₹{saleTotals.totalDiscount.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={summaryRow}>
                            <span>Sale Taxable Amount:</span>
                            <span>₹{saleTotals.totalTaxable.toFixed(2)}</span>
                        </div>
                        {saleTotals.totalCGST > 0 && (
                            <div style={summaryRow}>
                                <span>CGST:</span>
                                <span>₹{saleTotals.totalCGST.toFixed(2)}</span>
                            </div>
                        )}
                        {saleTotals.totalSGST > 0 && (
                            <div style={summaryRow}>
                                <span>SGST:</span>
                                <span>₹{saleTotals.totalSGST.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={summaryRow}>
                            <span>Sale Total:</span>
                            <span>₹{saleTotals.totalLineTotal.toFixed(2)}</span>
                        </div>
                        <hr style={{ ...divider, margin: '3px 0' }} />
                    </>
                )}

                {returnItems.length > 0 && (
                    <>
                        <div style={{ ...summaryRow, fontWeight: 'bold' }}>RETURN SUMMARY:</div>
                        <div style={summaryRow}>
                            <span>Return MRP Value:</span>
                            <span>-₹{returnTotals.totalMRPValue.toFixed(2)}</span>
                        </div>
                        {returnTotals.totalDiscount > 0 && (
                            <div style={summaryRow}>
                                <span>Return Discount:</span>
                                <span>- ₹{returnTotals.totalDiscount.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={summaryRow}>
                            <span>Return Taxable Amount:</span>
                            <span>-₹{returnTotals.totalTaxable.toFixed(2)}</span>
                        </div>
                        {returnTotals.totalCGST > 0 && (
                            <div style={summaryRow}>
                                <span>CGST:</span>
                                <span>-₹{returnTotals.totalCGST.toFixed(2)}</span>
                            </div>
                        )}
                        {returnTotals.totalSGST > 0 && (
                            <div style={summaryRow}>
                                <span>SGST:</span>
                                <span>-₹{returnTotals.totalSGST.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={summaryRow}>
                            <span>Return Total:</span>
                            <span>-₹{Math.abs(returnTotals.totalLineTotal).toFixed(2)}</span>
                        </div>
                        <hr style={{ ...divider, margin: '3px 0' }} />
                    </>
                )}

                <div style={grandTotal}>
                    <span>NET AMOUNT:</span>
                    <span>₹{netTotal.toFixed(2)}</span>
                </div>
            </div>

            <hr style={divider} />

            {/* Payment Summary */}
            <div style={payment}>
                {isRefundBill ? (
                    <div style={{ ...paymentRow, fontWeight: "bold" }}>
                        <span>Refunded Amount:</span>
                        <span>₹{refundAmount.toFixed(2)}</span>
                    </div>
                ) : (
                    <div style={paymentRow}>
                        <span>Amount Paid:</span>
                        <span>₹{invoice.paidAmount.toFixed(2)}</span>
                    </div>
                )}
                <div style={paymentRow}>
                    <span>Payment Mode:</span>
                    <span>{isRefundBill ? "Refund" : invoice.paymentMode || "Cash"}</span>
                </div>

                {invoice.paymentMode?.includes("+") && (
                    <>
                        <div style={paymentRow}>
                            <span>{invoice.paymentMode.split('+')[0]} Paid:</span>
                            <span>₹{(invoice.cashReceived || 0).toFixed(2)}</span>
                        </div>
                        <div style={paymentRow}>
                            <span>{invoice.paymentMode.split('+')[1]} Paid:</span>
                            <span>₹{(invoice.paidAmount - (invoice.cashReceived || 0)).toFixed(2)}</span>
                        </div>
                    </>
                )}

                {invoice.paymentMode === "Cash" && cashReceived > 0 && (
                    <>
                        <div style={paymentRow}>
                            <span>Cash Received:</span>
                            <span>₹{cashReceived.toFixed(2)}</span>
                        </div>
                        <div style={{ ...paymentRow, fontWeight: 'bold', fontSize: '13px' }}>
                            <span>Change:</span>
                            <span>₹{changeAmount.toFixed(2)}</span>
                        </div>
                    </>
                )}

                <div style={paymentRow}>
                    <span>Payment Status:</span>
                    <span style={isRefundBill ? paidStyle : invoice.balance === 0 ? paidStyle : balanceStyle}>
                        {isRefundBill
                            ? "REFUNDED"
                            : invoice.balance === 0
                                ? "PAID"
                                : `BALANCE: ₹${invoice.balance.toFixed(2)}`}
                    </span>
                </div>
            </div>

            <hr style={divider} />

            {/* GST Split Up Table */}
            {gstSlabs.length > 0 && (
                <>
                    <div style={{ ...sectionTitle, margin: "2px 0" }}>GST BREAKDOWN</div>
                    <table style={itemsTable}>
                        <thead>
                            <tr style={{ borderBottom: '1px dashed #000' }}>
                                <th style={{ textAlign: 'left', padding: '2px 0', width: '25%' }}>GST%</th>
                                <th style={{ textAlign: 'right', padding: '2px 0', width: '25%' }}>Taxable</th>
                                <th style={{ textAlign: 'right', padding: '2px 0', width: '25%' }}>CGST</th>
                                <th style={{ textAlign: 'right', padding: '2px 0', width: '25%' }}>SGST</th>
                            </tr>
                        </thead>
                        <tbody>
                            {gstSlabs.map((slab) => (
                                <tr key={`gst-slab-${slab.percentage}`}>
                                    <td style={{ textAlign: 'left', padding: '2px 0' }}>{slab.percentage}%</td>
                                    <td style={{ textAlign: 'right', padding: '2px 0' }}>₹{slab.taxableValue.toFixed(2)}</td>
                                    <td style={{ textAlign: 'right', padding: '2px 0' }}>₹{slab.cgstAmount.toFixed(2)}</td>
                                    <td style={{ textAlign: 'right', padding: '2px 0' }}>₹{slab.sgstAmount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <hr style={divider} />
                </>
            )}

            {redeemedItems.length > 0 && (
                <>
                    <div style={sectionTitle}>LOYALTY REDEMPTION</div>
                    {redeemedItems.map(item => (
                        <div key={item.id} style={summaryRow}>
                            <span>{item.type === "Discount" ? "Discount" : `Gift: ${item.giftProductName || "-"}`}</span>
                            <span>{item.type === "Discount" ? `-₹${item.discountAmount.toFixed(2)}` : `${item.pointsUsed} pts`}</span>
                        </div>
                    ))}
                    <div style={{ ...summaryRow, fontWeight: "bold" }}>
                        <span>Points Redeemed</span>
                        <span>{invoice.loyaltyPointsRedeemed || 0}</span>
                    </div>
                    {invoice.loyaltyDiscountAmount ? (
                        <div style={{ ...summaryRow, fontWeight: "bold" }}>
                            <span>Loyalty Discount</span>
                            <span>-₹{invoice.loyaltyDiscountAmount.toFixed(2)}</span>
                        </div>
                    ) : null}
                    <hr style={divider} />
                </>
            )}

            {/* Footer */}
            <center style={footer}>
                {customer && (
                    <div style={loyaltyBox}>
                        <div style={{ ...loyaltyCol, borderLeft: "none" }}>
                            <div style={loyaltyLabel}>POINTS EARNED TODAY</div>
                            <div style={loyaltyValue}>{pointsEarnedToday}</div>
                        </div>
                        <div style={loyaltyCol}>
                            <div style={loyaltyLabel}>OVERALL POINTS</div>
                            <div style={loyaltyValue}>{overallPoints}</div>
                        </div>
                    </div>
                )}
                <div style={thanks}>Thanks for Shopping with Us.</div>
                <div style={terms}>
                    Have a Nice Day!!....<br />
                    Exchange within One Week, No <strong>Cash</strong> Refund<br />
                    Free Home Delivery Call: +91 <strong>8903825381</strong><br />
                </div>
                <div style={printInfo}>
                    Printed: {new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit' })}<br />
                    POS System v1.1.4
                    {shop.counterName && <><br />{shop.counterName}</>}
                </div>
            </center>
        </div>
    );
};

export default Receipt80mm;

/* ---------- STYLES ---------- */
const receipt: React.CSSProperties = {
    width: "100%",           // Take full width of the print container
    maxWidth: "80mm",        // Max width for 80mm roll
    margin: "0 auto",
    fontFamily: "'Arial Narrow', 'Helvetica Condensed', 'Roboto Condensed', sans-serif",
    fontStretch: "condensed",
    letterSpacing: "-0.3px",
    fontSize: "13px",        // Reduced from 13px
    fontWeight: "normal",    // Normal is clearer for thermal printers than 600
    lineHeight: "1.1",       // Reduced from 1.3
    padding: "0 2mm 0 2mm",  // Reduced from 3mm
    boxSizing: "border-box",
    color: "#000",
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact" as React.CSSProperties["printColorAdjust"],
    textRendering: "geometricPrecision",
    WebkitFontSmoothing: "none",
    MozOsxFontSmoothing: "grayscale"
};

const logoStyle: React.CSSProperties = {
    width: "40mm",
    marginBottom: "2px",
    imageRendering: "pixelated"
};

const shopDetails: React.CSSProperties = {
    fontSize: "11px",
    lineHeight: "1",
    color: "#000"
};

const divider: React.CSSProperties = {
    border: "none",
    borderTop: "1px dashed #000",
    margin: "2px 0"
};

const sectionTitle: React.CSSProperties = {
    fontWeight: "bold",
    fontSize: "11px",
    margin: "1px 0",
    textAlign: "center",
    color: "#000"
};

const invoiceHeader: React.CSSProperties = {
    textAlign: "left",

    marginBottom: "1px"
};

const itemsTable: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
    fontFamily: "'Arial Narrow', 'Helvetica Condensed', 'Roboto Condensed', sans-serif",
    fontStretch: "condensed",
    letterSpacing: "-0.5px"
};

// ── Table column widths (must total 100%) ──────────────────────────────
// Item(44%) + Qty(9%) + MRP(14%) + Rate(14%) + Amt(19%) = 100%
// HSN is moved to a sub-line under the item name to save column space.
const colItem: React.CSSProperties = {
    textAlign: "left",
    width: "auto",
    verticalAlign: "top",
    padding: "1px 1px 1px 0",
};

const colQty: React.CSSProperties = {
    textAlign: "center",
    width: "1%",
    verticalAlign: "top",
    padding: "1px",
    whiteSpace: "nowrap",
};

const colMRP: React.CSSProperties = {
    textAlign: "right",
    width: "1%",
    verticalAlign: "top",
    padding: "1px",
    whiteSpace: "nowrap",
};

const colRate: React.CSSProperties = {
    textAlign: "right",
    width: "1%",
    verticalAlign: "top",
    padding: "1px",
    whiteSpace: "nowrap",
};

const colTotal: React.CSSProperties = {
    textAlign: "right",
    width: "1%",
    verticalAlign: "top",
    padding: "1px 0 1px 1px",
    whiteSpace: "nowrap",
};

// HSN is shown as a small sub-line inside colItem — frees a full column


const discountBadge: React.CSSProperties = {
    fontSize: "10px",
    color: "#000",
    marginTop: "1px"
};

const summary: React.CSSProperties = {
    margin: "2px 0"
};

const summaryRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "0px",
    fontSize: "11px",
    color: "#000"
};

const summaryRow1: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "0px",
    fontSize: "13px",
    color: "#000"
};

const grandTotal: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    fontWeight: "bold",
    fontSize: "14px",
    borderTop: "1px solid #000",
    paddingTop: "1px",
    marginTop: "1px",
    color: "#000"
};

const payment: React.CSSProperties = {
    margin: "2px 0"
};

const paymentRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "0px",
    fontSize: "11px",
    color: "#000"
};

const paidStyle: React.CSSProperties = {
    color: "#000",
    fontWeight: "bold"
};

const balanceStyle: React.CSSProperties = {
    color: "#000",
    fontWeight: "bold"
};

const footer: React.CSSProperties = {
    fontSize: "11px",
    color: "#000",
    lineHeight: "1.35"
};


const thanks: React.CSSProperties = {
    fontSize: "11px",
    marginBottom: "3px",
    textAlign: "left",
    fontWeight: "bold",
    color: "#000"
};
const terms: React.CSSProperties = {
    fontSize: "9px",
    marginBottom: "3px",
    textAlign: "left",
    color: "#000"
};

const printInfo: React.CSSProperties = {
    fontSize: "11px",
    color: "#000",
    marginTop: "5px"
};

const loyaltyBox: React.CSSProperties = {
    display: "flex",
    border: "1px solid #000",
    margin: "5px 0",
    padding: "0",
    width: "100%"
};

const loyaltyCol: React.CSSProperties = {
    flex: 1,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    borderLeft: "1px solid #000"
};

const loyaltyLabel: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: "bold",
    borderBottom: "1px solid #000",
    padding: "2px 0",
    backgroundColor: "#f0f0f0"
};

const loyaltyValue: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: "bold",
    padding: "3px 0"
};
