import { api } from "./axios";

function getFileNameFromDisposition(disposition?: string): string {
    if (!disposition) return `billing-backup-${Date.now()}.zip`;

    const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const encoded = match?.[1] ?? match?.[2];
    if (!encoded) return `billing-backup-${Date.now()}.zip`;

    try {
        return decodeURIComponent(encoded);
    } catch {
        return encoded;
    }
}

export async function downloadDatabaseBackup(password: string): Promise<void> {
    const response = await api.post("/maintenance/backup", { password }, { responseType: "blob" });

    const fileName = getFileNameFromDisposition(response.headers["content-disposition"]);
    const contentType = response.headers["content-type"] || "application/zip";
    const blob = new Blob([response.data], { type: contentType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

export async function runAnnualReset(password: string): Promise<void> {
    await api.post("/maintenance/annual-reset", { password });
}
