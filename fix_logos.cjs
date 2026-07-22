const fs = require('fs');

// Fix Reports.tsx
let reports = fs.readFileSync('src/pages/Reports.tsx', 'utf8');

// Update initial state URLs
reports = reports.replace(
  /useState\('https:\/\/i\.postimg\.cc\/Y0GFjMfr\/cropped-NEW-LOGO-LTN-06-1-removebg-preview\.png'\)/g,
  "useState('https://i.postimg.cc/tCPyyJnm/58f6eba6-9dd7-45e2-8434-6730f9b4412c-removebg-preview.png')"
);
reports = reports.replace(
  /useState\('https:\/\/i\.postimg\.cc\/bwVPbtwT\/cropped-NEW-LOGO-LTN-06-1-removebg-preview\.png'\)/g,
  "useState('https://i.postimg.cc/zfx5Psf9/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png')"
);

// Update logo rendering block to include max-width and border bottom
const oldLogoRow = /<div className="flex justify-between items-center w-full mb-16">\s*<ReportLogo url=\{logoRight\} alt="Right Logo" className="h-\[80px\] w-auto object-contain report-logo" \/>\s*<ReportLogo url=\{logoMiddle\} alt="Middle Logo" className="h-\[80px\] w-auto object-contain report-logo" \/>\s*<ReportLogo url=\{logoLeft\} alt="Left Logo" className="h-\[80px\] w-auto object-contain report-logo" \/>\s*<\/div>/g;

const newLogoRow = `<div className="flex justify-between items-center w-full mb-12 border-b-2 border-[#1e3a8a] pb-8">
                <ReportLogo url={logoRight} alt="Right Logo" className="h-[80px] w-auto max-w-[250px] object-contain report-logo" />
                <ReportLogo url={logoMiddle} alt="Middle Logo" className="h-[80px] w-auto max-w-[250px] object-contain report-logo" />
                <ReportLogo url={logoLeft} alt="Left Logo" className="h-[80px] w-auto max-w-[250px] object-contain report-logo" />
              </div>`;

reports = reports.replace(oldLogoRow, newLogoRow);

fs.writeFileSync('src/pages/Reports.tsx', reports, 'utf8');


// Fix ReportSettings.tsx
let settings = fs.readFileSync('src/pages/ReportSettings.tsx', 'utf8');

settings = settings.replace(
  /'https:\/\/i\.postimg\.cc\/Y0GFjMfr\/cropped-NEW-LOGO-LTN-06-1-removebg-preview\.png'/g,
  "'https://i.postimg.cc/tCPyyJnm/58f6eba6-9dd7-45e2-8434-6730f9b4412c-removebg-preview.png'"
);
settings = settings.replace(
  /'https:\/\/i\.postimg\.cc\/bwVPbtwT\/cropped-NEW-LOGO-LTN-06-1-removebg-preview\.png'/g,
  "'https://i.postimg.cc/zfx5Psf9/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png'"
);

fs.writeFileSync('src/pages/ReportSettings.tsx', settings, 'utf8');

console.log('Logos fixed.');
