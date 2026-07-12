const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');

// Add exporting state
code = code.replace(
  "const [loading, setLoading] = useState(false);",
  "const [exporting, setExporting] = useState(false);\n  const [loading, setLoading] = useState(false);"
);

// Replace generatePDF
const oldPdfRegex = /const generatePDF = async \(\) => \{[\s\S]*?catch \(err\) \{[\s\S]*?alert\('حدث خطأ أثناء إنشاء PDF'\);\n    \}\n  \};/;
const newPdfCode = `const downloadReportPDF = async () => {
    if (!reportRef.current) {
      alert('لا يوجد تقرير جاهز للتحميل');
      return;
    }

    if (!reportData || loading) {
      alert('يرجى إنشاء التقرير أولًا');
      return;
    }

    try {
      setExporting(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      let fileName = \`report-\${new Date().toISOString().slice(0, 10)}.pdf\`;
      if (reportType === 'detailed_commodity' && symbolFilter) {
        fileName = \`commodity-report-\${symbolFilter}-\${new Date().toISOString().slice(0, 10)}.pdf\`;
      }
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('حدث خطأ أثناء تحميل ملف PDF');
    } finally {
      setExporting(false);
    }
  };`;
code = code.replace(oldPdfRegex, newPdfCode);

// Replace generatePNG
const oldPngRegex = /const generatePNG = async \(\) => \{[\s\S]*?catch \(err\) \{[\s\S]*?alert\('حدث خطأ أثناء إنشاء الصورة'\);\n    \}\n  \};/;
const newPngCode = `const downloadReportPNG = async () => {
    if (!reportRef.current) {
      alert('لا يوجد تقرير جاهز للتحميل');
      return;
    }

    if (!reportData || loading) {
      alert('يرجى إنشاء التقرير أولًا');
      return;
    }

    try {
      setExporting(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      });

      const image = canvas.toDataURL('image/png', 1.0);

      const link = document.createElement('a');
      link.href = image;
      
      let fileName = \`report-\${new Date().toISOString().slice(0, 10)}.png\`;
      if (reportType === 'detailed_commodity' && symbolFilter) {
        fileName = \`commodity-report-\${symbolFilter}-\${new Date().toISOString().slice(0, 10)}.png\`;
      }
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('PNG export error:', error);
      alert('حدث خطأ أثناء تحميل صورة التقرير');
    } finally {
      setExporting(false);
    }
  };`;
code = code.replace(oldPngRegex, newPngCode);

// Update Buttons
code = code.replace(/onClick=\{generatePDF\}/, "onClick={downloadReportPDF}\n                disabled={exporting || !reportData || loading}");
code = code.replace(/<Download size=\{18\} \/> تحميل PDF/, "{exporting ? 'جاري تجهيز الملف...' : <><Download size={18} /> تحميل PDF</>}");

code = code.replace(/onClick=\{generatePNG\}/, "onClick={downloadReportPNG}\n                disabled={exporting || !reportData || loading}");
code = code.replace(/<ImageIcon size=\{18\} \/> تحميل صورة PNG/, "{exporting ? 'جاري تجهيز الملف...' : <><ImageIcon size={18} /> تحميل صورة PNG</>}");

// Fix the condition for buttons
code = code.replace(/\{isGenerated && \(/g, "{isGenerated && reportData && !loading && (");

// Fix Charts to use h-[360px] instead of h-80
code = code.replace(/className="h-80 w-full bg-white p-4/g, "className=\"w-full h-[360px] bg-white p-4");
code = code.replace(/className="h-80 w-full" style=/g, "className=\"w-full h-[360px]\" style=");


// Fix logo rendering issue
// We will change the img tags that have \`src={logoUrl}\` to conditionally use '/logo.png' if it fails
// Actually the user says: const reportLogo = settings?.logo_url || '/logo.png';
// And we should use \`/logo.png\` instead of a remote URL for html2canvas.
// The easiest is to just use \`/logo.png\` for the report itself, or let crossOrigin="anonymous" handle it.
// The user already has crossOrigin="anonymous". We will ensure \`/logo.png\` is used.
code = code.replace(/<img src=\{logoUrl\}/g, "<img src=\"/logo.png\"");

fs.writeFileSync('src/pages/Reports.tsx', code);
console.log('Update complete.');
