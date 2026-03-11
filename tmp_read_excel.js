const XLSX = require('xlsx');

function readFirstSheet(filename) {
    console.log(`\n--- Reading ${filename} ---`);
    try {
        const workbook = XLSX.readFile(filename);
        const sheetName = workbook.SheetNames[0];
        console.log(`Sheet Name: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log("Row count:", jsonData.length);
        console.log("First 10 rows:");
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
            console.log(jsonData[i]);
        }
    } catch (e) {
        console.error("Error reading file:", e.message);
    }
}

readFirstSheet("C:\\Users\\KALATHAM\\Admin-RekapPRO\\data\\DATA TARGET PRODAK TH.2025.xls");
readFirstSheet("C:\\Users\\KALATHAM\\Admin-RekapPRO\\data\\REKAP DAN KONTRIBUSI PRODUK.xlsx");
