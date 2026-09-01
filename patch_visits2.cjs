const fs = require('fs');
let content = fs.readFileSync('src/pages/Visits.tsx', 'utf8');

content = content.replace(
  /<th className="px-4 py-3 font-medium">النظام<\/th>/,
  `<th className="px-4 py-3 font-medium">النظام</th>
                <th className="px-4 py-3 font-medium">الشاشة</th>
                <th className="px-4 py-3 font-medium">اللغة</th>
                <th className="px-4 py-3 font-medium">المصدر</th>`
);

content = content.replace(
  /<td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">\{v\.operating_system \|\| '-'\}<\/td>/,
  `<td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{v.operating_system || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400" dir="ltr">{v.screen_width && v.screen_height ? \`\${v.screen_width}x\${v.screen_height}\` : '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400" dir="ltr">{v.language || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400" dir="ltr">{v.referrer || '-'}</td>`
);

content = content.replace(
  /<td colSpan=\{6\} className="px-4 py-8 text-center text-slate-500">/,
  `<td colSpan={10} className="px-4 py-8 text-center text-slate-500">`
);

fs.writeFileSync('src/pages/Visits.tsx', content);
