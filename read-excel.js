import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'data', 'Master Harga SPB 01 OKTOBER 2025.xls');
const wb = XLSX.readFile(filePath);

const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Write all rows to a text file for inspection
let output = `Sheet: "${sheetName}" (${data.length} rows)\n\n`;
for (let i = 0; i < data.length; i++) {
    output += `Row ${i}: ${JSON.stringify(data[i])}\n`;
}

fs.writeFileSync(path.join(__dirname, 'excel-output.txt'), output);
console.log(`Written ${data.length} rows to excel-output.txt`);
