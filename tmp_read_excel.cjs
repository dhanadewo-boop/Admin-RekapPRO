const XLSX = require('xlsx');

function analyzeFile(filename) {
    console.log(`\n\n========== ANALYZING: ${filename.split('\\').pop()} ==========`);
    try {
        const workbook = XLSX.readFile(filename);
        console.log(`Sheets found:`, workbook.SheetNames);

        // Analyze first 2 sheets
        for (let s = 0; s < Math.min(2, workbook.SheetNames.length); s++) {
            const sheetName = workbook.SheetNames[s];
            console.log(`\n--- Sheet: [${sheetName}] ---`);
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

            for (let i = 0; i < Math.min(20, jsonData.length); i++) {
                // filter out nulls for concise logging
                const row = jsonData[i] || [];
                const conciseRow = row.map(v => v === null ? '' : v).join(' | ');
                console.log(`Row ${i.toString().padStart(2, '0')}: ${conciseRow.substring(0, 150)}`);
            }
        }
    } catch (e) {
        console.error("Error reading file:", e.message);
    }
}

analyzeFile("C:\\Users\\KALATHAM\\Admin-RekapPRO\\data\\DATA TARGET PRODAK TH.2025.xls");
analyzeFile("C:\\Users\\KALATHAM\\Admin-RekapPRO\\data\\REKAP DAN KONTRIBUSI PRODUK.xlsx");
