const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');

const detailedJsx = `
            {reportType === 'detailed_commodity' && detailedStats ? (
              <>
                <div className="mb-10 relative z-10">
                  <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">بيانات السلعة الأساسية</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                      <div className="text-sm text-slate-500 mb-1">اسم السلعة</div>
                      <div className="text-lg font-bold text-slate-800">{detailedStats.commodity.name_ar}</div>
                      <div className="text-xs text-slate-400 font-mono" dir="ltr">{detailedStats.commodity.name_en}</div>
                    </div>
                    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                      <div className="text-sm text-slate-500 mb-1">الرمز والقطاع</div>
                      <div className="text-lg font-bold text-slate-800 font-mono" dir="ltr">{detailedStats.commodity.symbol}</div>
                      <div className="text-xs text-slate-400">{detailedStats.commodity.sector}</div>
                    </div>
                    <div className="bg-[#1e3a8a]/5 p-4 border border-[#1e3a8a]/20 rounded-lg shadow-sm text-center">
                      <div className="text-sm text-[#1e3a8a] mb-1 font-medium">السعر الحالي</div>
                      <div className="text-2xl font-bold text-[#1e3a8a] font-mono" dir="ltr">
                        {Number(detailedStats.commodity.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-500">{detailedStats.commodity.unit || '-'}</div>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg shadow-sm text-center">
                      <div className="text-sm text-slate-500 mb-1">نسبة التغير</div>
                      <div className={\`text-xl font-bold font-mono \${detailedStats.currentChangePercent > 0 ? 'text-green-600' : detailedStats.currentChangePercent < 0 ? 'text-red-600' : 'text-slate-500'}\`} dir="ltr">
                        {detailedStats.currentChangePercent > 0 ? '+' : ''}{detailedStats.currentChangePercent.toFixed(2)}%
                      </div>
                      <div className="text-xs text-slate-400">مقارنة بالسعر السابق</div>
                    </div>
                  </div>
                </div>

                <div className="mb-10 relative z-10">
                  <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">المؤشرات التحليلية للفترة</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 p-4 border border-green-200 rounded-lg shadow-sm text-center">
                      <div className="text-sm text-green-700 mb-1">أعلى سعر</div>
                      <div className="text-xl font-bold text-green-700 font-mono" dir="ltr">{Number(detailedStats.high).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="bg-red-50 p-4 border border-red-200 rounded-lg shadow-sm text-center">
                      <div className="text-sm text-red-700 mb-1">أقل سعر</div>
                      <div className="text-xl font-bold text-red-700 font-mono" dir="ltr">{Number(detailedStats.low).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg shadow-sm text-center">
                      <div className="text-sm text-slate-600 mb-1">متوسط السعر</div>
                      <div className="text-xl font-bold text-slate-700 font-mono" dir="ltr">{Number(detailedStats.avgPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg shadow-sm text-center">
                      <div className="text-sm text-slate-600 mb-1">تغير الفترة</div>
                      <div className={\`text-xl font-bold font-mono \${Number(detailedStats.periodChangePercent) > 0 ? 'text-green-600' : Number(detailedStats.periodChangePercent) < 0 ? 'text-red-600' : 'text-slate-500'}\`} dir="ltr">
                        {Number(detailedStats.periodChangePercent) > 0 ? '+' : ''}{detailedStats.periodChangePercent}%
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg shadow-sm text-center">
                      <div className="text-sm text-slate-500 mb-1">مرات الارتفاع</div>
                      <div className="text-lg font-bold text-green-600">{detailedStats.upCount}</div>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg shadow-sm text-center">
                      <div className="text-sm text-slate-500 mb-1">مرات الانخفاض</div>
                      <div className="text-lg font-bold text-red-600">{detailedStats.downCount}</div>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg shadow-sm text-center">
                      <div className="text-sm text-slate-500 mb-1">مرات الاستقرار</div>
                      <div className="text-lg font-bold text-slate-500">{detailedStats.stableCount}</div>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg shadow-sm text-center">
                      <div className="text-sm text-slate-500 mb-1">نقاط البيانات</div>
                      <div className="text-lg font-bold text-[#1e3a8a]">{detailedStats.dataPoints}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-10 relative z-10">
                  <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">الملخص التنفيذي التلقائي</h4>
                  <div className="bg-slate-50 p-6 border border-slate-200 rounded-lg shadow-sm text-slate-700 leading-loose text-justify text-lg">
                    خلال الفترة المحددة سجلت سلعة <span className="font-bold text-[#1e3a8a]">{detailedStats.commodity.name_ar}</span> تغيرًا بنسبة <span className="font-bold font-mono" dir="ltr">{detailedStats.periodChangePercent}%</span> حيث بدأ السعر عند <span className="font-bold font-mono" dir="ltr">{Number(detailedStats.firstPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> ووصل إلى <span className="font-bold font-mono" dir="ltr">{Number(detailedStats.lastPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>. بلغ أعلى سعر خلال الفترة <span className="font-bold text-green-700 font-mono" dir="ltr">{Number(detailedStats.high).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> بينما بلغ أقل سعر <span className="font-bold text-red-700 font-mono" dir="ltr">{Number(detailedStats.low).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>. يعتمد التقرير على بيانات الأرشيف المسجلة في منصة الأسعار العالمية.
                  </div>
                </div>

                <div className="mb-10 relative z-10 break-inside-avoid">
                  <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">حركة سعر السلعة خلال الفترة</h4>
                  <div className="h-80 w-full bg-white p-4 border border-slate-200 rounded-lg shadow-sm" style={{ direction: 'ltr' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={detailedStats.history.concat([{...detailedStats.commodity, recorded_at: new Date().toISOString()}]).sort((a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="recorded_at" 
                          tickFormatter={(timeStr) => new Intl.DateTimeFormat('en-GB', { month: '2-digit', day: '2-digit' }).format(new Date(timeStr))} 
                          stroke="#0A1128"
                          fontSize={12}
                          tickMargin={10}
                        />
                        <YAxis 
                          domain={['auto', 'auto']} 
                          stroke="#0A1128"
                          fontSize={12}
                          tickMargin={10}
                          width={60}
                          tickFormatter={(val) => Number(val).toLocaleString('en-US')}
                        />
                        <Tooltip 
                          labelFormatter={(label) => new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(label))} 
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#0A1128' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line 
                          type="monotone" 
                          dataKey="price" 
                          name={detailedStats.commodity.symbol}
                          stroke="#D4AF37" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: '#D4AF37' }} 
                          activeDot={{ r: 7 }} 
                          isAnimationActive={false} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mb-10 relative z-10 break-inside-avoid">
                  <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">الأرشيف التاريخي للسلعة</h4>
                  <table className="w-full text-sm text-right border-collapse">
                    <thead>
                      <tr className="bg-[#1e3a8a] text-white">
                        <th className="p-2 border border-slate-300">التاريخ</th>
                        <th className="p-2 border border-slate-300">السعر</th>
                        <th className="p-2 border border-slate-300">أعلى سعر</th>
                        <th className="p-2 border border-slate-300">أقل سعر</th>
                        <th className="p-2 border border-slate-300">المصدر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedStats.history.concat([{...detailedStats.commodity, recorded_at: detailedStats.commodity.updated_at || new Date().toISOString()}]).sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()).slice(0, 50).map((h: any, idx: number) => (
                        <tr key={h.id || idx} className="even:bg-slate-50">
                          <td className="p-2 border border-slate-200 font-mono text-xs" dir="ltr">{new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(h.recorded_at))}</td>
                          <td className="p-2 border border-slate-200 font-mono font-bold text-slate-800" dir="ltr">{Number(h.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="p-2 border border-slate-200 font-mono text-xs text-green-700" dir="ltr">{h.high ? Number(h.high).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                          <td className="p-2 border border-slate-200 font-mono text-xs text-red-700" dir="ltr">{h.low ? Number(h.low).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                          <td className="p-2 border border-slate-200 text-xs text-slate-600">{h.source || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
            {/* Executive Summary */}`;

code = code.replace('{/* Executive Summary */}', detailedJsx);

const endOfContentJsx = `</>
            )}

            {adminNotes && (
              <div className="mb-10 relative z-10 break-inside-avoid mt-8">
                <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">ملاحظات السوبر أدمن</h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-yellow-50/50 p-4 border border-yellow-200 rounded-lg">{adminNotes}</p>
              </div>
            )}

            {/* Footer */}`;

code = code.replace('{/* Footer */}', endOfContentJsx);

fs.writeFileSync('src/pages/Reports.tsx', code);
