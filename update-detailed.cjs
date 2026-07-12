const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');

const targetTableStart = '<table className="w-full text-sm text-right border-collapse">';
const targetTableEnd = '</table>';
// Actually, I'll use regex to replace the table inside detailed history chunk
const regex = /<table className="w-full text-sm text-right border-collapse">[\s\S]*?<\/table>/;

const newTable = `<table className="w-full text-[11px] text-right border-collapse">
                      <thead>
                        <tr className="bg-[#0A1128] text-white">
                          <th className="p-2 border border-slate-300">التاريخ</th>
                          <th className="p-2 border border-slate-300">السعر</th>
                          <th className="p-2 border border-slate-300">السابق</th>
                          <th className="p-2 border border-slate-300">التغير</th>
                          <th className="p-2 border border-slate-300">نسبة التغير</th>
                          <th className="p-2 border border-slate-300">أعلى سعر</th>
                          <th className="p-2 border border-slate-300">أقل سعر</th>
                          <th className="p-2 border border-slate-300">المصدر</th>
                          <th className="p-2 border border-slate-300">الاتجاه</th>
                          <th className="p-2 border border-slate-300">ملاحظة تحليلية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chunk.map((h: any, idx: number) => {
                          const allHistory = reportData.history.filter((x: any) => x.symbol === h.symbol).sort((a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
                          const currentIndex = allHistory.findIndex((x: any) => x.id === h.id);
                          const prevPrice = currentIndex > 0 ? allHistory[currentIndex - 1].price : h.price;
                          const changeValue = h.price - prevPrice;
                          const changePercent = prevPrice ? (changeValue / prevPrice) * 100 : 0;
                          
                          const isPositive = changePercent > 0;
                          const isNegative = changePercent < 0;
                          const cpColor = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-slate-400';
                          const cpText = \`\${isPositive ? '+' : ''}\${changePercent.toFixed(2)}%\`;
                          
                          let trend = 'stable';
                          if (isPositive) trend = 'up';
                          else if (isNegative) trend = 'down';

                          let note = 'استقرار نسبي';
                          if (changePercent > 5) note = 'ارتفاع قوي مقارنة بالسجل السابق';
                          else if (changePercent > 0) note = 'ارتفاع مقارنة بالسجل السابق';
                          else if (changePercent < -5) note = 'انخفاض قوي مقارنة بالسجل السابق';
                          else if (changePercent < 0) note = 'انخفاض مقارنة بالسجل السابق';

                          if (Math.abs(changePercent) > 10) note = 'تذبذب ملحوظ في السعر';

                          return (
                            <tr key={h.id || idx} className="even:bg-slate-50">
                              <td className="p-2 border border-slate-200 font-mono text-xs text-slate-500" dir="ltr">{new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(h.recorded_at))}</td>
                              <td className="p-2 border border-slate-200 font-mono font-bold text-[#1e3a8a]" dir="ltr">{Number(h.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="p-2 border border-slate-200 font-mono text-slate-500" dir="ltr">{Number(prevPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className={\`p-2 border border-slate-200 font-mono \${cpColor}\`} dir="ltr">{changeValue > 0 ? '+' : ''}{Number(changeValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className={\`p-2 border border-slate-200 font-mono font-bold \${cpColor}\`} dir="ltr">{cpText}</td>
                              <td className="p-2 border border-slate-200 font-mono text-amber-700 bg-amber-50/30" dir="ltr">{h.high ? Number(h.high).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                              <td className="p-2 border border-slate-200 font-mono text-blue-700 bg-blue-50/30" dir="ltr">{h.low ? Number(h.low).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                              <td className="p-2 border border-slate-200 text-xs text-slate-600">{h.source || '-'}</td>
                              <td className="p-2 border border-slate-200 text-center">
                                <span className={trend === 'up' ? 'text-green-600 font-bold' : trend === 'down' ? 'text-red-600 font-bold' : 'text-slate-400 font-bold'}>
                                  {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '-'}
                                </span>
                              </td>
                              <td className="p-2 border border-slate-200 text-xs text-slate-600 font-medium">{note}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>`;

code = code.replace(regex, newTable);
fs.writeFileSync('src/pages/Reports.tsx', code);
console.log('Replaced detailed commodity table');
