/**
 * Comprehensive date formatting utilities for the entire project
 */

/**
 * Format date to DD-MM-YYYY
 * @param dateString - Date string or Date object
 * @returns Formatted date string (DD-MM-YYYY)
 */
export const formatToDDMMYYYY = (dateString: string | Date): string => {
    if (!dateString) return '-';

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        console.warn('Invalid date provided to formatToDDMMYYYY:', dateString);
        return 'Invalid Date';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
};

/**
 * Format date to DD-MM-YYYY HH:mm (24-hour format)
 * @param dateString - Date string or Date object
 * @returns Formatted date string (DD-MM-YYYY HH:mm)
 */
export const formatToDDMMYYYYHHmm = (dateString: string | Date): string => {
    if (!dateString) return '-';

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        console.warn('Invalid date provided to formatToDDMMYYYYHHmm:', dateString);
        return 'Invalid Date';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}-${month}-${year} ${hours}:${minutes}`;
};

/**
 * Format date to DD-MM-YYYY HH:mm:ss (24-hour format with seconds)
 * @param dateString - Date string or Date object
 * @returns Formatted date string (DD-MM-YYYY HH:mm:ss)
 */
export const formatToDDMMYYYYHHmmss = (dateString: string | Date): string => {
    if (!dateString) return '-';

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        console.warn('Invalid date provided to formatToDDMMYYYYHHmmss:', dateString);
        return 'Invalid Date';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
};

/**
 * Format date to DD-MM-YYYY hh:mm AM/PM (12-hour format)
 * @param dateString - Date string or Date object
 * @returns Formatted date string (DD-MM-YYYY hh:mm AM/PM)
 */
export const formatToDDMMYYYYhhmmA = (dateString: string | Date): string => {
    if (!dateString) return '-';

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        console.warn('Invalid date provided to formatToDDMMYYYYhhmmA:', dateString);
        return 'Invalid Date';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    // Format time in 12-hour format
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formattedHours = String(hours).padStart(2, '0');

    return `${day}/${month}/${year} ${formattedHours}:${minutes}:${seconds} ${ampm}`;
};

/**
 * Get current date in DD-MM-YYYY format
 * @returns Current date string (DD-MM-YYYY)
 */
export const getCurrentDateDDMMYYYY = (): string => {
    const now = new Date();
    return formatToDDMMYYYY(now);
};

/**
 * Get current date and time in DD-MM-YYYY HH:mm format
 * @returns Current date-time string (DD-MM-YYYY HH:mm)
 */
export const getCurrentDateTime = (): string => {
    const now = new Date();
    return formatToDDMMYYYYhhmmA(now);
};

/**
 * Parse DD-MM-YYYY string back to Date object
 * @param dateStr - Date string in DD-MM-YYYY format
 * @returns Date object or null if invalid
 */
export const parseDDMMYYYY = (dateStr: string): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;

    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;

    const [day, month, year] = parts.map(Number);

    // Validate the numbers
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31) return null;
    if (month < 1 || month > 12) return null;
    if (year < 1000 || year > 9999) return null;

    // Note: Month is 0-indexed in JavaScript Date
    const date = new Date(year, month - 1, day);

    // Verify the date is valid (handles cases like 31-02-2023)
    if (
        date.getDate() !== day ||
        date.getMonth() !== month - 1 ||
        date.getFullYear() !== year
    ) {
        return null;
    }

    return date;
};

/**
 * Convert date to ISO string (for API calls) while maintaining local time
 * @param dateString - Date string or Date object
 * @returns ISO string in local timezone
 */
export const toLocalISOString = (dateString: string | Date): string => {
    if (!dateString) return '';

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return '';
    }

    const timezoneOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localTime = new Date(date.getTime() - timezoneOffset);

    return localTime.toISOString().slice(0, -1); // Remove trailing 'Z'
};