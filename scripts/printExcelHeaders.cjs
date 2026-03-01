const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', 'Rosary All Site Details.xlsx');
const workbook = XLSX.readFile(EXCEL_PATH);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const records = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

console.log('Column headers:', Object.keys(records[0]));
console.log('\nFirst row data:');
console.log(JSON.stringify(records[0], null, 2));
