import { EscPosBuilder } from "./EscPosBuilder";
import type { InvoiceResponseDto, InvoiceItemDto } from "../models/Invoice";
import { formatToDDMMYYYY } from "./dateUtils";

interface ShopDetails {
    name: string;
    address: string;
    phone: string;
    gstin?: string;
    state?: string;
    stateCode?: string;
}

export class EscPosInvoicePrinter {
    private builder: EscPosBuilder;
    private width = 48; // Standard TM-T82X Font A width

    constructor() {
        this.builder = new EscPosBuilder();
    }

    private padRight(str: string, length: number): string {
        if (str.length >= length) return str.substring(0, length);
        return str + " ".repeat(length - str.length);
    }

    private padLeft(str: string, length: number): string {
        if (str.length >= length) return str.substring(0, length);
        return " ".repeat(length - str.length) + str;
    }

    private center(str: string): string {
        if (str.length >= this.width) return str.substring(0, this.width);
        const leftPadding = Math.floor((this.width - str.length) / 2);
        return " ".repeat(leftPadding) + str;
    }

    private formatColumns(left: string, right: string): string {
        if (left.length + right.length > this.width) {
            // Truncate left if it doesn't fit
            left = left.substring(0, this.width - right.length - 1);
        }
        return left + " ".repeat(this.width - left.length - right.length) + right;
    }

    private calculateGST(item: InvoiceItemDto, isInterState: boolean = false) {
        const gstPercentage = item.gstPercentage || 0;

        if (gstPercentage <= 0) {
            return {
                taxableValue: item.lineTotal,
                totalGST: 0,
                cgstAmount: 0,
                sgstAmount: 0,
                igstAmount: 0
            };
        }

        const taxableValue = (item.lineTotal * 100) / (100 + gstPercentage);
        const totalGST = item.lineTotal - taxableValue;

        if (isInterState) {
            return {
                taxableValue,
                totalGST,
                cgstAmount: 0,
                sgstAmount: 0,
                igstAmount: totalGST
            };
        } else {
            const halfGST = totalGST / 2;
            return {
                taxableValue,
                totalGST,
                cgstAmount: halfGST,
                sgstAmount: halfGST,
                igstAmount: 0
            };
        }
    }

    private calculateInvoiceTotals(items: InvoiceItemDto[], isInterState: boolean = false) {
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
            const absoluteQuantity = Math.abs(item.quantity);
            const absoluteLineTotal = Math.abs(item.lineTotal);

            const itemMRP = item.mrp || item.unitPrice;
            const totalMRP = itemMRP * absoluteQuantity;
            const discount = totalMRP - absoluteLineTotal;

            const gst = this.calculateGST({
                ...item,
                quantity: absoluteQuantity,
                lineTotal: absoluteLineTotal
            }, isInterState);

            totals.totalMRPValue += totalMRP;
            totals.totalDiscount += discount > 0 ? discount : 0;
            totals.totalTaxable += gst.taxableValue;
            totals.totalCGST += gst.cgstAmount;
            totals.totalSGST += gst.sgstAmount;
            totals.totalIGST += gst.igstAmount;
            totals.totalGST += gst.totalGST;
            totals.totalLineTotal += item.lineTotal;
        });

        return totals;
    }

    public generateReceipt(invoice: InvoiceResponseDto, shop: ShopDetails, customerMobile?: string): string {
        // Init and Header
        this.builder.init();
        
        // Print Logo (NVRAM index 1)
        this.builder.align(1).printNVLogo(1, 0).lineFeed();

        // Shop Details
        this.builder.bold(true).textLine(this.center(shop.name)).bold(false);
        this.builder.textLine(this.center(shop.address));
        if (shop.state) this.builder.textLine(this.center(shop.state));
        this.builder.textLine(this.center(`Ph: ${shop.phone}`));
        if (shop.gstin) this.builder.textLine(this.center(`GSTIN: ${shop.gstin}`));

        this.builder.lineFeed().textLine("-".repeat(this.width));

        // Invoice Info
        this.builder.align(0);
        this.builder.bold(true).textLine(this.center("RETAIL INVOICE")).bold(false);
        this.builder.textLine(this.formatColumns(`No: ${invoice.invoiceNumber}`, `Date: ${formatToDDMMYYYY(invoice.date)}`));
        
        const time = new Date(invoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.builder.textLine(this.formatColumns(`Salesman: ${invoice.salesmanId || "Not Assigned"}`, `Time: ${time}`));
        
        const custName = invoice.customerName || "Walk-in Customer";
        this.builder.textLine(`Name: ${custName}`);
        if (customerMobile) {
            this.builder.textLine(`Mobile: ${customerMobile}`);
        }

        this.builder.textLine("-".repeat(this.width));

        // Table Header (Item, Qty, MRP, Rate, Amt)
        // Let's allocate: Item (16), Qty (4), MRP (8), Rate (8), Amt (12) = 48
        this.builder.bold(true);
        this.builder.text(this.padRight("Item", 16));
        this.builder.text(this.padLeft("Qty", 4));
        this.builder.text(this.padLeft("MRP", 8));
        this.builder.text(this.padLeft("Rate", 8));
        this.builder.textLine(this.padLeft("Amt", 12));
        this.builder.bold(false);
        
        // Sales Items
        const sales = invoice.items.filter(i => i.quantity >= 0);
        const returns = invoice.items.filter(i => i.quantity < 0);
        
        if (sales.length > 0) {
            this.builder.textLine("-".repeat(this.width));
            this.builder.bold(true).textLine(this.center("SALE ITEMS")).bold(false);
            this.printItems(sales);
        }

        if (returns.length > 0) {
            this.builder.textLine("-".repeat(this.width));
            this.builder.bold(true).textLine(this.center("RETURN ITEMS")).bold(false);
            this.printItems(returns, true);
        }

        this.builder.textLine("-".repeat(this.width));

        // Summaries
        const saleTotals = this.calculateInvoiceTotals(sales, false);
        const returnTotals = this.calculateInvoiceTotals(returns, false);

        if (sales.length > 0) {
            this.builder.bold(true).textLine("SALE SUMMARY:").bold(false);
            this.builder.textLine(this.formatColumns("Sale MRP Value:", `Rs.${saleTotals.totalMRPValue.toFixed(2)}`));
            if (saleTotals.totalDiscount > 0) {
                this.builder.textLine(this.formatColumns("Sale Discount:", `-Rs.${saleTotals.totalDiscount.toFixed(2)}`));
            }
            this.builder.textLine(this.formatColumns("Sale Taxable Amount:", `Rs.${saleTotals.totalTaxable.toFixed(2)}`));
            if (saleTotals.totalCGST > 0) {
                this.builder.textLine(this.formatColumns("CGST:", `Rs.${saleTotals.totalCGST.toFixed(2)}`));
            }
            if (saleTotals.totalSGST > 0) {
                this.builder.textLine(this.formatColumns("SGST:", `Rs.${saleTotals.totalSGST.toFixed(2)}`));
            }
            this.builder.textLine(this.formatColumns("Sale Total:", `Rs.${saleTotals.totalLineTotal.toFixed(2)}`));
            this.builder.textLine("-".repeat(this.width));
        }

        if (returns.length > 0) {
            this.builder.bold(true).textLine("RETURN SUMMARY:").bold(false);
            this.builder.textLine(this.formatColumns("Return MRP Value:", `-Rs.${returnTotals.totalMRPValue.toFixed(2)}`));
            if (returnTotals.totalDiscount > 0) {
                this.builder.textLine(this.formatColumns("Return Discount:", `-Rs.${returnTotals.totalDiscount.toFixed(2)}`));
            }
            this.builder.textLine(this.formatColumns("Return Taxable Amount:", `-Rs.${returnTotals.totalTaxable.toFixed(2)}`));
            if (returnTotals.totalCGST > 0) {
                this.builder.textLine(this.formatColumns("CGST:", `-Rs.${returnTotals.totalCGST.toFixed(2)}`));
            }
            if (returnTotals.totalSGST > 0) {
                this.builder.textLine(this.formatColumns("SGST:", `-Rs.${returnTotals.totalSGST.toFixed(2)}`));
            }
            this.builder.textLine(this.formatColumns("Return Total:", `-Rs.${Math.abs(returnTotals.totalLineTotal).toFixed(2)}`));
            this.builder.textLine("-".repeat(this.width));
        }

        // Totals
        const netTotal = invoice.totalAmount;
        this.builder.bold(true);
        this.builder.textLine(this.formatColumns("NET AMOUNT:", `Rs.${netTotal.toFixed(2)}`));
        this.builder.bold(false);

        // Payment
        this.builder.textLine("-".repeat(this.width));
        if (invoice.status === "Refunded" || invoice.status === "PartiallyRefunded" || netTotal < 0) {
             this.builder.textLine(this.formatColumns("Refunded Amount:", `Rs.${Math.abs(netTotal).toFixed(2)}`));
        } else {
             this.builder.textLine(this.formatColumns("Amount Paid:", `Rs.${invoice.paidAmount.toFixed(2)}`));
        }
        this.builder.textLine(this.formatColumns("Payment Mode:", invoice.paymentMode || "Cash"));
        
        if (invoice.paymentMode === "Cash" && invoice.cashReceived) {
            this.builder.textLine(this.formatColumns("Cash Received:", `Rs.${invoice.cashReceived.toFixed(2)}`));
            if (invoice.changeAmount) {
                this.builder.bold(true).textLine(this.formatColumns("Change:", `Rs.${invoice.changeAmount.toFixed(2)}`)).bold(false);
            }
        }

        this.builder.textLine("-".repeat(this.width));

        // GST Breakdown
        const gstSlabs = (() => {
            const slabsMap = new Map<number, { taxableValue: number; cgstAmount: number; sgstAmount: number }>();
            
            invoice.items.forEach(item => {
                const gstPercentage = item.gstPercentage || 0;
                if (gstPercentage <= 0) return;

                const gst = this.calculateGST(item, false);

                const current = slabsMap.get(gstPercentage) || { taxableValue: 0, cgstAmount: 0, sgstAmount: 0 };

                slabsMap.set(gstPercentage, {
                    taxableValue: current.taxableValue + gst.taxableValue,
                    cgstAmount: current.cgstAmount + gst.cgstAmount,
                    sgstAmount: current.sgstAmount + gst.sgstAmount
                });
            });

            return Array.from(slabsMap.entries())
                .map(([percentage, values]) => ({ percentage, ...values }))
                .filter(slab => Math.abs(slab.cgstAmount * 2) > 0.01)
                .sort((a, b) => a.percentage - b.percentage);
        })();

        if (gstSlabs.length > 0) {
            this.builder.bold(true).textLine(this.center("GST BREAKDOWN")).bold(false);
            // GST%(5) Taxable(15) CGST(14) SGST(14) = 48
            this.builder.bold(true);
            this.builder.text(this.padRight("GST%", 5));
            this.builder.text(this.padLeft("Taxable", 15));
            this.builder.text(this.padLeft("CGST", 14));
            this.builder.textLine(this.padLeft("SGST", 14));
            this.builder.bold(false);

            gstSlabs.forEach(slab => {
                this.builder.text(this.padRight(`${slab.percentage}%`, 5));
                this.builder.text(this.padLeft(`${slab.taxableValue.toFixed(2)}`, 15));
                this.builder.text(this.padLeft(`${slab.cgstAmount.toFixed(2)}`, 14));
                this.builder.textLine(this.padLeft(`${slab.sgstAmount.toFixed(2)}`, 14));
            });
            this.builder.textLine("-".repeat(this.width));
        }

        // Footer
        this.builder.align(1);
        this.builder.bold(true).textLine("Thanks for Shopping with Us.").bold(false);
        this.builder.textLine("Have a Nice Day!!....");
        this.builder.textLine("Exchange within One Week, No Cash Refund");
        this.builder.lineFeed();
        this.builder.textLine(`Printed: ${new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit' })}`);
        this.builder.textLine("POS System v2.0");

        // Cut paper
        this.builder.lineFeed(3).cut();

        return this.builder.buildBase64();
    }

    private printItems(items: InvoiceItemDto[], isReturn: boolean = false) {
        items.forEach(item => {
            const qty = isReturn ? `-${Math.abs(item.quantity)}` : `${item.quantity}`;
            const total = isReturn ? `-${Math.abs(item.lineTotal).toFixed(2)}` : `${item.lineTotal.toFixed(2)}`;
            const rate = `${item.unitPrice.toFixed(2)}`;
            const mrp = `${(item.mrp || item.unitPrice).toFixed(2)}`;
            
            let name = item.productName;
            if (isReturn) name += " [RET]";

            // Wrap item name if it's too long
            const nameWidth = 16;
            const lines = [];
            for (let i = 0; i < name.length; i += nameWidth) {
                lines.push(name.substring(i, i + nameWidth));
            }

            // Print first line with quantities and amounts
            this.builder.text(this.padRight(lines[0], nameWidth));
            this.builder.text(this.padLeft(qty, 4));
            this.builder.text(this.padLeft(mrp, 8));
            this.builder.text(this.padLeft(rate, 8));
            this.builder.textLine(this.padLeft(total, 12));

            // Print subsequent lines of item name if any
            for (let i = 1; i < lines.length; i++) {
                this.builder.textLine(lines[i]);
            }

            // Print HSN sub-line if available (GST percentage excluded as requested)
            if (item.hsnCode) {
                this.builder.textLine(`  HSN:${item.hsnCode}`);
            }
        });
    }
}
