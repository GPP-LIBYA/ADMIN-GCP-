const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');

// Update default useState
code = code.replace(
  /const \[logoUrl, setLogoUrl\] = useState<string>\('\/logo-ltn\.png'\);/,
  `const [logoUrl, setLogoUrl] = useState<string>('https://i.postimg.cc/zfx5Psf9/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png');`
);

// Update fetch default
code = code.replace(
  /setLogoUrl\(settingsRes\.data\.logo_url \|\| \(settingsRes\.data as any\)\.footer_logo_url \|\| '\/logo-ltn\.png'\);/,
  `setLogoUrl(settingsRes.data.logo_url || (settingsRes.data as any).footer_logo_url || 'https://i.postimg.cc/zfx5Psf9/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png');`
);

fs.writeFileSync('src/pages/Reports.tsx', code);
console.log('Fixed default logo URL!');
