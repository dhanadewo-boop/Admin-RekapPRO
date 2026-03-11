const XLSX = require('xlsx');

function parseTargets(filename) {
    try {
        const workbook = XLSX.readFile(filename);
        let totalTargets = 0;
        let results = [];

        workbook.SheetNames.forEach(sheetName => {
            if (sheetName.toUpperCase() === 'TOTAL SEMUA') return; // Skip aggregate sheet

            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

            let currentProduct = null;
            let currentTargetCol = -1;

            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i] || [];
                if (!row || !row.length) continue;

                const firstCol = String(row[0] || '').trim().toUpperCase();

                if (firstCol.includes('PRODUK') || firstCol === 'PRODUK') {
                    currentProduct = String(row[1] || '').trim();
                    currentTargetCol = row.findIndex(v => String(v || '').trim().toUpperCase().includes('TARGET'));
                } else if (firstCol.includes('TOKO') || firstCol === 'TOKO') {
                    const tokoName = String(row[1] || '').trim();
                    if (!tokoName || tokoName === '') continue;

                    let targetValue = 0;
                    if (currentTargetCol !== -1 && !isNaN(parseFloat(row[currentTargetCol]))) {
                        targetValue = parseFloat(row[currentTargetCol]);
                    } else {
                        // Scan from right to left for a number
                        for (let c = row.length - 1; c >= 2; c--) {
                            if (row[c] !== null && row[c] !== '' && !isNaN(parseFloat(row[c]))) {
                                targetValue = parseFloat(row[c]);
                                break;
                            }
                        }
                    }

                    if (targetValue > 0) {
                        results.push({
                            sheet: sheetName,
                            product: currentProduct,
                            toko: tokoName,
                            target: targetValue
                        });
                        totalTargets++;
                    }
                }
            }
        });

        console.log(`\n========== TARGET PARSING RESULTS ==========`);
        console.log(`Found ${totalTargets} valid targets across ${workbook.SheetNames.length - 1} products sheets.`);
        // preview
        console.log("First 5:", results.slice(0, 5));
        console.log("Last 5:", results.slice(-5));

    } catch (e) {
        console.error("Error reading file:", e.message);
    }
}

parseTargets("C:\\Users\\KALATHAM\\Admin-RekapPRO\\data\\DATA TARGET PRODAK TH.2025.xls");
