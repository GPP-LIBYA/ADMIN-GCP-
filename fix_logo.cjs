const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');

// Update ReportLogo definition
code = code.replace(
  /src=\{useFallback \? '\/logo\.png' : url\}/,
  `src={useFallback ? '/logo-ltn.png' : url}`
);

// Update logoUrl default state
code = code.replace(
  /useState<string>\('\/logo\.png'\)/,
  `useState<string>('/logo-ltn.png')`
);

// Update logoUrl settings fetch
code = code.replace(
  /setLogoUrl\(settingsRes\.data\.logo_url \|\| \(settingsRes\.data as any\)\.footer_logo_url \|\| '\/logo\.png'\);/,
  `setLogoUrl(settingsRes.data.logo_url || (settingsRes.data as any).footer_logo_url || '/logo-ltn.png');`
);

// Update Cover Logo style
code = code.replace(
  /className="w-\[140px\] h-\[140px\] mx-auto mb-10 object-contain"/,
  `className="w-[110px] h-auto mx-auto mb-10 object-contain report-logo"`
);

// Update Header Logo style globally
code = code.replace(
  /className="w-12 h-12 object-contain"/g,
  `className="w-[42px] h-auto object-contain report-logo"`
);

// Update Watermark Logo style globally
code = code.replace(
  /className="w-\[60%\] object-contain grayscale"/g,
  `className="w-[320px] h-auto object-contain grayscale opacity-[0.05] report-logo"`
);

// Update ReportLogo component alt text
code = code.replace(
  /alt = "Logo"/g,
  `alt = "Libya Trade Network Logo"`
);

fs.writeFileSync('src/pages/Reports.tsx', code);
console.log('Logo fixed!');
