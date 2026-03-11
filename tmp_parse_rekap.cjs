const XLSX = require('xlsx');

function parseRekap(filename) {
    console.log(`\n\n========== PARSING: ${filename.split('\\').pop()} ==========`);
    try {
        const workbook = XLSX.readFile(filename);
        let results = [];
        const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        workbook.SheetNames.forEach(sheetName => {
            const year = parseInt(sheetName);
            if (isNaN(year)) return;

            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i] || [];
                if (!row || !row[0]) continue;

                const productName = String(row[0]).trim();
                if (productName === '' || productName.toUpperCase().includes('PUPUK DAUN')) continue;

                let productTotal = 0;
                let monthlyValues = Array(12).fill(0);

                for (let m = 0; m < 12; m++) {
                    const valIndex = 7 + (m * 4);
                    if (row.length > valIndex && !isNaN(parseFloat(row[valIndex]))) {
                        const val = parseFloat(row[valIndex]);
                        monthlyValues[m] = val;
                        productTotal += val;
                    }
                }

                // fallback total if monthly missing
                if (productTotal === 0 && !isNaN(parseFloat(row[1]))) {
                    productTotal = parseFloat(row[1]);
                }

                if (productTotal > 0) {
                    results.push({
                        year,
                        product: productName,
                        total: productTotal,
                        monthly: monthlyValues
                    });
                }
            }
        });

        console.log(`\n========== REKAP PARSING RESULTS ==========`);
        console.log(`Found ${results.length} valid product year records.`);
        console.log("First 3:", JSON.stringify(results.slice(0, 3), null, 2));

    } catch (e) {
        console.error("Error reading file:", e.message);
    }
}

parseRekap("C:\\Users\\KALATHAM\\Admin-RekapPRO\\data\\REKAP DAN KONTRIBUSI PRODUK.xlsx");
