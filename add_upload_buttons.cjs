const fs = require('fs');

let content = fs.readFileSync('src/pages/ReportSettings.tsx', 'utf8');

const regex = /<input\s+type="text"\s+placeholder="رابط الصورة \(URL\)"\s+value=\{logos\.(report_logo_right|report_logo_middle|report_logo_left)\}\s+onChange=\{\(e\) => handleChange\('(report_logo_right|report_logo_middle|report_logo_left)', e\.target\.value\)\}\s+className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-\[#1e3a8a\] focus:border-transparent text-left"\s+dir="ltr"\s+\/>/g;

content = content.replace(regex, (match, p1, p2) => {
  return `<div className="flex gap-2">
              <input
                type="text"
                placeholder="رابط الصورة (URL)"
                value={logos.${p1}}
                onChange={(e) => handleChange('${p1}', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-left"
                dir="ltr"
              />
              <label className="flex-shrink-0 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg border border-slate-200 transition-colors flex items-center justify-center">
                <Upload className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('${p1}', e)} />
              </label>
            </div>`;
});

fs.writeFileSync('src/pages/ReportSettings.tsx', content, 'utf8');
console.log('Update complete.');
