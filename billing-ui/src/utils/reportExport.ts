import { jsPDF } from "jspdf";

const escapeCsv = (value: string | number | null | undefined) => {
    const text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
};

export const downloadCsv = (
    fileName: string,
    headers: string[],
    rows: Array<Array<string | number | null | undefined>>
) => {
    const csvContent = [
        headers.map(escapeCsv).join(","),
        ...rows.map(row => row.map(escapeCsv).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

export const downloadPdf = (
    fileName: string,
    title: string,
    headers: string[],
    rows: Array<Array<string | number | null | undefined>>,
    summaryLines: string[] = []
) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 30;

    let y = margin;
    doc.setFontSize(14);
    doc.text(title, margin, y);

    y += 18;
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, margin, y);

    summaryLines.forEach(line => {
        y += 14;
        doc.text(line, margin, y);
    });

    y += 18;
    doc.setFontSize(9);
    doc.setFont("courier", "bold");
    doc.text(headers.join(" | "), margin, y);
    y += 10;
    doc.setDrawColor(120);
    doc.line(margin, y, pageWidth - margin, y);

    doc.setFont("courier", "normal");
    for (const row of rows) {
        y += 13;

        if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
            doc.setFont("courier", "bold");
            doc.text(headers.join(" | "), margin, y);
            y += 10;
            doc.line(margin, y, pageWidth - margin, y);
            doc.setFont("courier", "normal");
            y += 13;
        }

        const rowText = row.map(v => (v == null ? "" : String(v))).join(" | ");
        const clipped = rowText.length > 170 ? `${rowText.slice(0, 167)}...` : rowText;
        doc.text(clipped, margin, y);
    }

    doc.save(`${fileName}.pdf`);
};
