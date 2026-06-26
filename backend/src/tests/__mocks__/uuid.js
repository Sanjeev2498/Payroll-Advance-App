// Mock uuid module for Jest testing
// This avoids ESM import issues with the uuid package

let counter = 0;

const v4 = () => {
  // Generate a valid UUID v4 format for testing
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  const hex4 = () => Array.from({ length: 4 }, hex).join('');
  const hex8 = () => Array.from({ length: 8 }, hex).join('');
  const hex12 = () => Array.from({ length: 12 }, hex).join('');
  
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where y is one of [8, 9, a, b]
  const y = ['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)];
  
  return `${hex8()}-${hex4()}-4${hex4().slice(1)}-${y}${hex4().slice(1)}-${hex12()}`;
};

module.exports = { v4 };