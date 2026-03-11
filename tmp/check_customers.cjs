const xlsx = require('xlsx');

try {
    const workbook = xlsx.readFile('C:\\Users\\KALATHAM\\Admin-RekapPRO\\data\\TARGET CUSTOMERS.xlsx');

    console.log("Sheet Names:");
    console.log(workbook.SheetNames);

    for (const sheetName of workbook.SheetNames) {
        console.log(`\n\n--- Sheet: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        // Print first 10 rows
        for (let i = 0; i < Math.min(10, data.length); i++) {
            console.log(`Row ${i} length ${data[i] ? data[i].length : 0}:`, data[i]);
        }
    }

} catch (error) {
    console.error("Error reading file:", error.message);
}
