const { validateDate } = require('./dist/src/common/utils/date-validation.util.js');

console.log('Testing negative year validation...');

const testCases = ['0000-12-31', '-001-01-01'];

testCases.forEach(testDate => {
  console.log(`\\nTesting: ${testDate}`);
  const jsDate = new Date(testDate);

  console.log('JS Date created:', jsDate.toString());
  console.log('Year from getFullYear():', jsDate.getFullYear());
  console.log('Is valid (not NaN)?', !isNaN(jsDate.getTime()));

  const result = validateDate(testDate);
  console.log('Validation result:', JSON.stringify(result, null, 2));
});