const XLSX = require('xlsx');

const filePath = process.argv[2] || './AI Courses Table.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('📊 Total rows:', data.length);
console.log('\n📋 Column names found:');
console.log(Object.keys(data[0]));
console.log('\n🔍 First row data:');
console.log(JSON.stringify(data[0], null, 2));