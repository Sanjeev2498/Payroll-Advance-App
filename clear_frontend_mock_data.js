const fs = require('fs');
const path = require('path');

const filesToClear = [
  'G:\\Payroll System\\frontend\\src\\app\\dashboard\\my-payslips\\page.tsx',
  'G:\\Payroll System\\frontend\\src\\app\\dashboard\\my-attendance\\page.tsx', 
  'G:\\Payroll System\\frontend\\src\\app\\dashboard\\my-schedule\\page.tsx',
  'G:\\Payroll System\\frontend\\src\\components\\supervisor\\supervisor-dashboard.tsx'
];

console.log('🔄 Clearing frontend mock data...\n');

filesToClear.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace common mock data patterns
      content = content.replace(/Tech Plaza/g, '');
      content = content.replace(/Downtown Office/g, '');
      content = content.replace(/Rajesh Kumar/g, '');
      content = content.replace(/Priya Sharma/g, '');
      content = content.replace(/Amit Singh/g, '');
      content = content.replace(/Sarah Johnson/g, '');
      content = content.replace(/Rohit Supervisor/g, '');
      content = content.replace(/30622|25000|33000/g, '0');
      content = content.replace(/09:00 AM|06:00 PM|10:00 AM|07:00 PM/g, '');
      content = content.replace(/MG Road, Bangalore/g, '');
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Cleared mock data from: ${path.basename(filePath)}`);
    } else {
      console.log(`⚠️  File not found: ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.log(`❌ Error clearing ${path.basename(filePath)}: ${error.message}`);
  }
});

console.log('\n✅ Frontend mock data clearing completed');
console.log('🔄 Restart the frontend server for changes to take effect');