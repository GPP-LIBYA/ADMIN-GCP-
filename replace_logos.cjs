const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');

const logoComponent = `
const ReportLogo = ({ className, alt = "Logo", url }: { className?: string, alt?: string, url: string }) => {
  const [hasError, setHasError] = React.useState(false);
  const [useFallback, setUseFallback] = React.useState(false);

  if (hasError) {
    return (
      <div className={\`flex items-center justify-center font-bold text-[#1e3a8a] \${className || ''}\`}>
        Libya Trade Network
      </div>
    );
  }

  return (
    <img
      src={useFallback ? '/logo.png' : url}
      alt={alt}
      className={className}
      crossOrigin="anonymous"
      onError={() => {
        if (!useFallback) {
          setUseFallback(true);
        } else {
          setHasError(true);
        }
      }}
    />
  );
};
`;

code = code.replace(/const Reports: React\.FC = \(\) => \{/, logoComponent + '\nconst Reports: React.FC = () => {');

// Replace cover logo
code = code.replace(
  /<img src="\/logo\.png" alt="Logo" className="w-\[140px\] h-\[140px\] mx-auto mb-10 object-contain" crossOrigin="anonymous" onError=\{[^}]+\} \/>/g,
  `<ReportLogo url={logoUrl} alt="Logo" className="w-[140px] h-[140px] mx-auto mb-10 object-contain" />`
);

// Replace watermark logos
code = code.replace(
  /<img src="\/logo\.png" className="w-\[60%\] object-contain grayscale" crossOrigin="anonymous" \/>/g,
  `<ReportLogo url={logoUrl} className="w-[60%] object-contain grayscale" />`
);

// Replace header logos
code = code.replace(
  /<img src="\/logo\.png" alt="Logo" className="w-12 h-12 object-contain" crossOrigin="anonymous" \/>/g,
  `<ReportLogo url={logoUrl} alt="Logo" className="w-12 h-12 object-contain" />`
);

fs.writeFileSync('src/pages/Reports.tsx', code);
console.log('Replaced logos!');
