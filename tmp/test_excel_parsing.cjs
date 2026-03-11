const XLSX = require('xlsx');

function testStandardFormat(filename) {
    console.log(`\n\n========== TESTING FILE: ${filename.split('\\').pop()} ==========`);
    try {
        const workbook = XLSX.readFile(filename);
        const sheetNames = workbook.SheetNames;
        
        let invoicesList = [];
        const isLegacyRekap = sheetNames.some(name => ['2023', '2024', '2025'].includes(name));

        if (isLegacyRekap) {
             console.log("Legacy format detected.");
        } else {
             console.log("Standard format detected.");
             const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false });
             const invoicesMap = {};

             for (let i = 0; i < Math.min(20, jsonData.length); i++) {
                 const row = jsonData[i];
                 const rowKeys = Object.keys(row);
                 const getDate = () => row[rowKeys.find(k => k?.toLowerCase().includes('tanggal'))];
                 const getSpb = () => row[rowKeys.find(k => k?.toLowerCase().includes('spb'))];
                 const getCust = () => row[rowKeys.find(k => k?.toLowerCase().includes('customer'))];
                 const getCity = () => row[rowKeys.find(k => k?.toLowerCase().includes('area') || k?.toLowerCase().includes('kota'))];
                 const getProd = () => row[rowKeys.find(k => k?.toLowerCase().includes('barang'))];
                 const getQty = () => parseFloat(row[rowKeys.find(k => k?.toLowerCase() === 'qty')] || 0);
                 const getPrice = () => {
                     const val = row[rowKeys.find(k => k?.toLowerCase().includes('harga'))] || '0';
                     return parseFloat(val.toString().replace(/[^0-9.-]+/g, ''));
                 };
                 const getDisc = () => parseFloat(row[rowKeys.find(k => k?.toLowerCase().includes('diskon'))] || 0);
                 const getSub = () => {
                     const val = row[rowKeys.find(k => k?.toLowerCase().includes('subtotal'))] || '0';
                     return parseFloat(val.toString().replace(/[^0-9.-]+/g, ''));
                 };
                 
                 console.log(`Row ${i} output: SPB=${getSpb()} | Harga=${getPrice()} (Raw: ${row[rowKeys.find(k => k?.toLowerCase().includes('harga'))]}) | Subtotal=${getSub()} (Raw: ${row[rowKeys.find(k => k?.toLowerCase().includes('subtotal'))]})`);
             }
        }
    } catch (e) {
        console.error("Error reading file:", e.message);
    }
}

testStandardFormat("C:\\Users\\KALATHAM\\Admin-RekapPRO\\data\\DATA TARGET PRODAK TH.2025.xls");
testStandardFormat("C:\\Users\\KALATHAM\\Admin-RekapPRO\\data\\REKAP DAN KONTRIBUSI PRODUK.xlsx");
