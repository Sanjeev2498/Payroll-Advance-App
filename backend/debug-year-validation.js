const { validateDate } = require('./dist/src/common/utils/date-validation.util.js');

console.log('Testing year 0000 validation...');

const testDate = '0000-12-31';
const jsDate = new Date(testDate);

console.log('Original string:', testDate);
console.log('JS Date created:', jsDate.toString());
console.log('Year from getFullYear():', jsDate.getFullYear());
console.log('Is valid (not NaN)?', !isNaN(jsDate.getTime()));

console.log('\\nValidation result:');
const result = validateDate(testDate);
console.log(JSON.stringify(result, null, 2));