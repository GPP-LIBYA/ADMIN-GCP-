const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');

code = code.replace(
  /<div className="absolute inset-0 z-0 flex items-center justify-center opacity-\[0\.05\] pointer-events-none">/g,
  `<div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">`
);

fs.writeFileSync('src/pages/Reports.tsx', code);
console.log('Fixed wrapper!');
