import type { BarcodeMasterDto } from "../models/Barcode";

/**
 * Extract primary barcode from a product
 * @deprecated Use barcodes array from ProductDto instead
 */
export const getPrimaryBarcode = (barCode?: string | null): string => {
    if (!barCode) return "";
    // Backward compatibility for old comma-separated format
    const barcodes = barCode.split(/[\n,;|]+/g)
        .map(code => code.trim())
        .filter(Boolean);
    return barcodes[0] || "";
};

/**
 * Get the first active barcode from a barcode array
 */
export const getPrimaryBarcodeFromArray = (barcodes?: BarcodeMasterDto[]): BarcodeMasterDto | null => {
    if (!barcodes || barcodes.length === 0) return null;
    return barcodes.find(b => b.isActive) || barcodes[0] || null;
};

/**
 * Get all barcode values from array as string
 */
export const formatBarcodeList = (barcodes?: BarcodeMasterDto[]): string => {
    if (!barcodes || barcodes.length === 0) return "No Barcodes";
    return barcodes
        .filter(b => b.isActive)
        .map(b => b.barcodeValue)
        .join(", ");
};

/**
 * Check if a product has a matching barcode
 */
export const matchesBarcodeQuery = (barcodes: BarcodeMasterDto[] | undefined, query: string): boolean => {
    if (!barcodes) return false;
    const searchTerm = query.trim().toLowerCase();
    if (!searchTerm) return false;

    return barcodes.some(barcode => 
        barcode.barcodeValue.toLowerCase().includes(searchTerm) && barcode.isActive
    );
};

/**
 * Get all active barcodes from array
 */
export const getActiveBarcodes = (barcodes?: BarcodeMasterDto[]): BarcodeMasterDto[] => {
    if (!barcodes) return [];
    return barcodes.filter(b => b.isActive);
};
