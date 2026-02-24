/**
 * SPB Invoice Template — Zone Definitions
 * 
 * All coordinates are in percentages (0-100) of the full page dimensions.
 * This makes the template resolution-independent.
 * 
 * Based on the PT. Kalatham "Surat Penyerahan Barang" format.
 * 
 * To calibrate: scan a clear invoice, overlay the zones, and adjust.
 */

export const SPB_TEMPLATE = {
    name: 'Surat Penyerahan Barang - PT. Kalatham',
    version: '1.0',

    // ========================================================
    // FIELD ZONES — percentage-based { x, y, w, h }
    // ========================================================
    zones: {
        // SPB number: top-right corner where "024285" appears
        spbNumber: {
            x: 65, y: 0, w: 35, h: 10,
            ocrConfig: {
                tessedit_char_whitelist: '0123456789',
                tessedit_pageseg_mode: '7', // Single text line
            },
            postProcess: 'digits', // Keep only digits
        },

        // Customer name: "Nama Customer : PT. Anugerah Agro Mandiri"
        customerName: {
            x: 5, y: 8, w: 55, h: 10,
            ocrConfig: {
                tessedit_pageseg_mode: '6', // Uniform block
            },
            postProcess: 'customerName',
        },

        // Date: "Malang, 27-Jan-2026" at the bottom-right
        invoiceDate: {
            x: 45, y: 78, w: 55, h: 8,
            ocrConfig: {
                tessedit_pageseg_mode: '7',
            },
            postProcess: 'date',
        },

        // Discount line: "Diskon Masalgin 2%"
        discount: {
            x: 5, y: 62, w: 55, h: 10,
            ocrConfig: {
                tessedit_pageseg_mode: '6',
            },
            postProcess: 'discount',
        },

        // Grand total: bottom-right of the table area
        grandTotal: {
            x: 55, y: 65, w: 45, h: 10,
            ocrConfig: {
                tessedit_char_whitelist: '0123456789.',
                tessedit_pageseg_mode: '6',
            },
            postProcess: 'number',
        },
    },

    // ========================================================
    // PRODUCT TABLE ZONE
    // ========================================================
    productTable: {
        // The entire table area (rows will be detected within this)
        area: {
            x: 2, y: 30, w: 96, h: 35,
        },

        // Column boundaries within the table area (% of table width)
        columns: {
            rowNum: { x: 0, w: 5 },   // "No" column
            kodeBarang: { x: 5, w: 12 },   // "Kode Barang"
            namaBarang: { x: 17, w: 28 },   // "Nama Barang" 
            jumlah: { x: 45, w: 8 },   // "Jumlah"
            satuan: { x: 53, w: 7 },   // "Satuan"
            hargaSatuan: { x: 60, w: 18 },   // "Harga Satuan (Rp)"
            totalNilai: { x: 78, w: 22 },   // "Total Nilai (Rp)"
        },

        // OCR config for each column type
        columnOcrConfig: {
            rowNum: { tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: '10' },
            kodeBarang: { tessedit_pageseg_mode: '7' },
            namaBarang: { tessedit_pageseg_mode: '6' },
            jumlah: { tessedit_char_whitelist: '0123456789.', tessedit_pageseg_mode: '10' },
            satuan: { tessedit_pageseg_mode: '7' },
            hargaSatuan: { tessedit_char_whitelist: '0123456789.', tessedit_pageseg_mode: '6' },
            totalNilai: { tessedit_char_whitelist: '0123456789.', tessedit_pageseg_mode: '6' },
        },

        // Estimated row height as % of table area height
        // Will be auto-detected, but this is the fallback
        estimatedRowHeight: 15, // % of table height per row
        maxRows: 10,
    },

    // ========================================================
    // RENDERING CONFIG
    // ========================================================
    rendering: {
        pdfScale: 4.0,       // ~300 DPI for A4 PDFs
        minImageWidth: 2000,  // Minimum width in pixels for good OCR
        imageFormat: 'image/png',
    },
};

/**
 * Crop a canvas to a percentage-based rectangle
 * @param {HTMLCanvasElement} sourceCanvas - Full page canvas
 * @param {{ x: number, y: number, w: number, h: number }} zone - Zone in percentages (0-100)
 * @returns {HTMLCanvasElement} Cropped canvas
 */
export function cropZone(sourceCanvas, zone) {
    const sx = Math.round(sourceCanvas.width * zone.x / 100);
    const sy = Math.round(sourceCanvas.height * zone.y / 100);
    const sw = Math.round(sourceCanvas.width * zone.w / 100);
    const sh = Math.round(sourceCanvas.height * zone.h / 100);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = sw;
    croppedCanvas.height = sh;
    const ctx = croppedCanvas.getContext('2d');
    ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

    return croppedCanvas;
}

/**
 * Crop a sub-zone within a parent zone (for table columns within table area)
 * @param {HTMLCanvasElement} parentCanvas - The table area canvas
 * @param {{ x: number, w: number }} column - Column definition (% of parent width)
 * @param {number} rowY - Row start Y position in pixels
 * @param {number} rowH - Row height in pixels
 * @returns {HTMLCanvasElement}
 */
export function cropColumn(parentCanvas, column, rowY, rowH) {
    const sx = Math.round(parentCanvas.width * column.x / 100);
    const sw = Math.round(parentCanvas.width * column.w / 100);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = sw;
    croppedCanvas.height = rowH;
    const ctx = croppedCanvas.getContext('2d');
    ctx.drawImage(parentCanvas, sx, rowY, sw, rowH, 0, 0, sw, rowH);

    return croppedCanvas;
}

/**
 * Detect horizontal line boundaries in a table area to find row separators
 * Uses pixel intensity analysis on the canvas
 * @param {HTMLCanvasElement} tableCanvas - The table area canvas
 * @returns {number[]} Array of Y positions (in pixels) where rows start
 */
export function detectTableRows(tableCanvas) {
    const ctx = tableCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, tableCanvas.width, tableCanvas.height);
    const { data, width, height } = imageData;

    // Scan for horizontal dark lines (table row separators)
    // A row separator is a line where most pixels are dark
    const rowDarkness = [];
    for (let y = 0; y < height; y++) {
        let darkPixels = 0;
        // Sample every 4th pixel for speed
        for (let x = 0; x < width; x += 4) {
            const idx = (y * width + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            if (brightness < 128) darkPixels++;
        }
        const darkRatio = darkPixels / (width / 4);
        rowDarkness.push(darkRatio);
    }

    // Find peaks (lines with high dark ratio = horizontal separators)
    const threshold = 0.3; // 30% of pixels are dark
    const linePositions = [];
    let inLine = false;
    let lineStart = 0;

    for (let y = 0; y < height; y++) {
        if (rowDarkness[y] >= threshold && !inLine) {
            inLine = true;
            lineStart = y;
        } else if (rowDarkness[y] < threshold && inLine) {
            inLine = false;
            linePositions.push(Math.round((lineStart + y) / 2)); // Middle of the line
        }
    }

    // Convert line positions to row boundaries
    // Rows are between consecutive lines
    const rows = [];
    for (let i = 0; i < linePositions.length - 1; i++) {
        const rowStart = linePositions[i] + 2; // Just below the line
        const rowEnd = linePositions[i + 1] - 2; // Just above next line
        const rowHeight = rowEnd - rowStart;
        if (rowHeight > 10) { // Skip very thin gaps
            rows.push({ y: rowStart, h: rowHeight });
        }
    }

    return rows;
}
