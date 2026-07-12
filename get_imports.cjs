const fs = require('fs');
const content = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');
const match = content.match(/function Reports\(\) \{/);
console.log(match ? match.index : -1);
