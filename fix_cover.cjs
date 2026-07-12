const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');

const targetStr = `<h3 className="text-4xl font-bold text-[#b45309] mb-8">{reportTitle}</h3>`;
const replacementStr = `<h3 className="text-4xl font-bold text-[#b45309] mb-8">{reportTitle}</h3>
                <div className="text-xl text-[#1e3a8a] font-bold mb-4">
                  نوع التقرير: {reportType === 'general' ? 'تقرير الأسعار العام' : reportType === 'sector' ? 'تقرير القطاع المخصص' : reportType === 'commodity' ? 'تقرير حركة سلعة محددة' : reportType === 'detailed_commodity' ? 'تقرير سلعة مفصل' : reportType === 'comparison' ? 'تقرير المقارنة' : reportType === 'news_analysis' ? 'تقرير الأخبار والتحليلات' : reportType === 'daily' ? 'تقرير الأسعار اليومي' : reportType === 'monthly' ? 'التقرير الشهري' : 'التقرير الشامل'}
                </div>`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/pages/Reports.tsx', code);
console.log('Cover fixed!');
