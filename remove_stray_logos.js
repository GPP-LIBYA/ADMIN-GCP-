const fs = require('fs');

let content = fs.readFileSync('src/pages/Reports.tsx', 'utf8');

// Replace the multiline ones
const strayRegex = /<div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">\s*<ReportLogo url=\{logoUrl\} className="w-\[320px\] h-auto object-contain grayscale opacity-\[0.05\] report-logo" \/>\s*<\/div>/g;

content = content.replace(strayRegex, '');

fs.writeFileSync('src/pages/Reports.tsx', content, 'utf8');
console.log('Update complete.');
