// EscPosBuilder.ts
// Utility to construct raw ESC/POS byte commands for thermal printers

export class EscPosBuilder {
    private buffer: number[] = [];

    // Commands
    private readonly ESC = 0x1B;
    private readonly FS = 0x1C;
    private readonly GS = 0x1D;
    private readonly LF = 0x0A;

    constructor() {
        this.init();
    }

    // Initialize printer
    public init(): this {
        this.buffer.push(this.ESC, 0x40);
        return this;
    }

    // Set Text Alignment (0: Left, 1: Center, 2: Right)
    public align(align: 0 | 1 | 2): this {
        this.buffer.push(this.ESC, 0x61, align);
        return this;
    }

    // Set Bold Text
    public bold(on: boolean = true): this {
        this.buffer.push(this.ESC, 0x45, on ? 1 : 0);
        return this;
    }

    // Print text (ASCII only for simplicity, or we can use TextEncoder for UTF-8 but ESC/POS standard is usually code page 858/437)
    // We will use standard ASCII for basic English/numeric text. For currency symbol ₹, we might replace it with "Rs." to be safe.
    public text(str: string): this {
        // Replace ₹ with Rs. since ESC/POS requires specific codepages for ₹ which might not be configured out of the box.
        const safeStr = str.replace(/₹/g, "Rs.");
        for (let i = 0; i < safeStr.length; i++) {
            const code = safeStr.charCodeAt(i);
            // Ignore non-ASCII to prevent breaking printer
            if (code <= 255) {
                this.buffer.push(code);
            } else {
                this.buffer.push(63); // '?' for unknown chars
            }
        }
        return this;
    }

    // Print Line Feed
    public lineFeed(count: number = 1): this {
        for (let i = 0; i < count; i++) {
            this.buffer.push(this.LF);
        }
        return this;
    }

    // Print Text with Line Feed
    public textLine(str: string): this {
        this.text(str);
        this.lineFeed();
        return this;
    }

    // Print NVRAM Logo (1 = first logo, 0 = normal mode)
    public printNVLogo(kc1: number = 1, mode: number = 0): this {
        // Standard FS p n m command (Legacy NV bit image)
        // n is NV bit image number (1-255). m is mode (0 = normal)
        this.buffer.push(this.FS, 0x70, kc1, mode);
        return this;
    }

    // Cut Paper
    public cut(): this {
        // GS V 66 0 (Cut after feeding paper)
        this.buffer.push(this.GS, 0x56, 66, 0);
        return this;
    }

    // Build base64 string for the API
    public buildBase64(): string {
        const uint8Array = new Uint8Array(this.buffer);
        let binary = '';
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        return btoa(binary);
    }
}
