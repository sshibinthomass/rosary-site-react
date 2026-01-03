// Script to read Excel file and convert to JSON for seeding
// Run with: node scripts/readExcel.cjs

const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('./Rosary All Site Details.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('Total rows:', data.length);

// Helper to parse boolean (0/1 or Yes/No)
function parseBool(value) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'Yes' || value === 'yes' || value === 'TRUE' || value === true) return true;
  return false;
}

// Map to our product schema - keeping data exactly as it is in Excel
const products = data.map((row, index) => ({
  // ID and Basic Info
  id: String(row['Id'] || index + 1),
  commonName: row['Common Name'] || '',
  title: row['title'] || '',
  imageUrl: row['url'] || '',
  
  // Pricing
  salesPrice: parseFloat(row['Sales Price']) || 0,
  originalPrice: parseFloat(row['Orginal Price']) || null,
  
  // Availability - keep exact values from Excel
  available: row['Available'] === '1' || row['Available'] === 1 || parseBool(row['Available']),
  qtyAvailable: row['Qty Ava'] || 'NA', // Keep as string: "Available", "Low", "NA"
  isRestocked: parseBool(row['Is Restocked']),
  
  // Category - keep exact value from Excel
  category: row['category'] || 'Others',
  
  // Care info - keep exact values
  size: row['Size'] || '',
  transit: row['Transit'] || 'Not Specific',
  watering: row['Watering'] || 'Not Specific',
  sunlight: row['Sunlight'] || 'Not Specific',
  
  // Place
  placeAvailable: row['Place Ava'] || 'Both',
  
  // Demand - keep exact value
  demand: row['Demand'] || 'NotStarted',
  
  // Boolean flags
  mother: parseBool(row['mother']),
  hanging: parseBool(row['Hanging']),
  combo: parseBool(row['Combo']),
  indoor: parseBool(row['Indoor']),
  
  // Legacy fields for compatibility with existing code
  name: row['Common Name'] || '',
  price: parseFloat(row['Sales Price']) || 0,
  inStock: (row['Available'] === '1' || row['Available'] === 1) && row['Qty Ava'] !== 'NA'
})).filter(p => p.commonName); // Only include products with a name

console.log('Products with names:', products.length);

// Count by availability
const available = products.filter(p => p.available);
const unavailable = products.filter(p => !p.available);
console.log('Available:', available.length);
console.log('Unavailable:', unavailable.length);

// Count by category
const categories = {};
products.forEach(p => {
  categories[p.category] = (categories[p.category] || 0) + 1;
});
console.log('\nBy category:');
Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});

// Write to JSON files
fs.writeFileSync('./scripts/products.json', JSON.stringify(products, null, 2));
console.log('\n✅ Saved', products.length, 'products to scripts/products.json');

fs.writeFileSync('./src/data/products.json', JSON.stringify(products));
console.log('✅ Saved minified version to src/data/products.json');
