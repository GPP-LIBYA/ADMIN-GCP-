import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Layers, 
  Database, 
  Calendar, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Percent,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import type { 
  CommodityAnalysisResult, 
  SectorAnalysisResult, 
  ExecutiveReportStats 
} from '../../utils/economicAnalytics';
import { Base100ComparisonChart } from './Base100ComparisonChart';
import { TopMoversChart } from './TopMoversChart';
import { SectorHeatmap } from './SectorHeatmap';

interface DashboardPrintTemplateProps {
  stats: ExecutiveReportStats;
  sectorAnalytics: SectorAnalysisResult[];
  commoditiesAnalytics: CommodityAnalysisResult[];
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  executiveSummaryText?: string;
  page1Ref: React.RefObject<HTMLDivElement | null>;
  page2Ref: React.RefObject<HTMLDivElement | null>;
  page3Ref: React.RefObject<HTMLDivElement | null>;
}

export const DashboardPrintTemplate: React.FC<DashboardPrintTemplateProps> = ({
  stats,
  sectorAnalytics,
  commoditiesAnalytics,
  periodLabel,
  startDate,
  endDate,
  executiveSummaryText,
  page1Ref,
  page2Ref,
  page3Ref
}) => {
  const currentDate = new Date().toLocaleDateString('ar-LY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div 
      className="dashboard-print-template-container arabic-pdf-text" 
      dir="rtl" 
      style={{ 
        fontFamily: "'Cairo', 'Tajawal', sans-serif", 
        letterSpacing: '0px' 
      }}
    >
      
      {/* ============================================================== */}
      {/* PAGE 1: EXECUTIVE SUMMARY & 10 KPI CARDS                       */}
      {/* ============================================================== */}
      <div 
        ref={page1Ref}
        className="dashboard-a4-page bg-white text-slate-900 flex flex-col justify-between"
        style={{
          width: '1123px',
          height: '794px',
          padding: '28px 36px',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Page 1 Header */}
        <div>
          <div className="flex items-center justify-between border-b-2 border-[#1e3a8a] pb-3 mb-4">
            <img 
              src="https://i.postimg.cc/bwVPbtwT/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png" 
              alt="شعار شبكة ليبيا للتجارة" 
              className="h-12 w-auto object-contain"
              crossOrigin="anonymous"
            />
            <div className="text-center">
              <h1 className="text-2xl font-black text-[#1e3a8a]" style={{ letterSpacing: '0px' }}>
                منصة الأسعار العالمية (GPP) — لوحة التحليل الاقتصادي التنفيذية
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-1">
                نطاق التقرير: <span className="text-[#1e3a8a] font-bold">{periodLabel}</span>
                {startDate && endDate && (
                  <span className="mr-2 text-slate-500">
                    (من <span dir="ltr" className="font-mono">{startDate.slice(0, 10)}</span> إلى <span dir="ltr" className="font-mono">{endDate.slice(0, 10)}</span>)
                  </span>
                )}
                {' • '}
                تاريخ الإصدار: <span>{currentDate}</span>
              </p>
            </div>
            <img 
              src="https://i.postimg.cc/fyZwc16S/tsmym-bdwn-%CA%BFnwan-(1).png" 
              alt="شعار GPP" 
              className="h-12 w-auto object-contain"
              crossOrigin="anonymous"
            />
          </div>

          {/* Section Title */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]"></span>
              المؤشرات الاقتصادية التنفيذية (Executive KPI Metrics)
            </h2>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              البيانات مطابقة للسجلات التاريخية الفعلية
            </span>
          </div>

          {/* 10 Executive KPI Cards Grid */}
          <div className="grid grid-cols-5 gap-2.5 mb-3.5">
            
            {/* Card 1: إجمالي السلع المشمولة */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-none flex flex-col justify-between min-h-[114px]">
              <div className="text-[11px] font-bold text-slate-600">إجمالي السلع المشمولة</div>
              <div className="my-1 flex items-baseline gap-1.5">
                <span dir="ltr" className="text-2xl font-black text-slate-900 font-mono" style={{ unicodeBidi: 'isolate' }}>
                  {stats.totalCommodities}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">سلعة</span>
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">ضمن السلة العالمية</div>
            </div>

            {/* Card 2: القطاعات المشمولة */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-none flex flex-col justify-between min-h-[114px]">
              <div className="text-[11px] font-bold text-slate-600">القطاعات المشمولة</div>
              <div className="my-1 flex items-baseline gap-1.5">
                <span dir="ltr" className="text-2xl font-black text-slate-900 font-mono" style={{ unicodeBidi: 'isolate' }}>
                  {stats.totalSectors}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">قطاعات</span>
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">طاقة، معادن، زراعة، لحوم</div>
            </div>

            {/* Card 3: السجلات التاريخية */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-none flex flex-col justify-between min-h-[114px]">
              <div className="text-[11px] font-bold text-slate-600">السجلات التاريخية</div>
              <div className="my-1 flex items-baseline gap-1">
                <span dir="ltr" className="text-2xl font-black text-slate-900 font-mono" style={{ unicodeBidi: 'isolate' }}>
                  {stats.totalRawRecords.toLocaleString('en-US')}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">سجل</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-bold leading-tight">مكتملة عبر Pagination</div>
            </div>

            {/* Card 4: أيام الرصد الفعلي */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-none flex flex-col justify-between min-h-[114px]">
              <div className="text-[11px] font-bold text-slate-600">أيام الرصد الفعلي</div>
              <div className="my-1 flex items-baseline gap-1.5">
                <span dir="ltr" className="text-2xl font-black text-slate-900 font-mono" style={{ unicodeBidi: 'isolate' }}>
                  {stats.periodDays}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">يوم رصد</span>
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">نافذة المقارنة الزمنية</div>
            </div>

            {/* Card 5: متوسط التغير السعري */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-none flex flex-col justify-between min-h-[114px]">
              <div className="text-[11px] font-bold text-slate-600">متوسط التغير السعري</div>
              <div className="my-1">
                <span 
                  dir="ltr" 
                  className={`text-2xl font-black font-mono inline-block ${
                    stats.overallAvgChangePercent > 0 ? 'text-emerald-700' : stats.overallAvgChangePercent < 0 ? 'text-rose-700' : 'text-slate-800'
                  }`}
                  style={{ unicodeBidi: 'isolate' }}
                >
                  {stats.overallAvgChangePercent > 0 ? '+' : ''}{stats.overallAvgChangePercent.toFixed(2)}%
                </span>
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">متوسط نسبي موحد</div>
            </div>

            {/* Card 6: السلع المرتفعة */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 shadow-none flex flex-col justify-between min-h-[114px]">
              <div className="text-[11px] font-bold text-emerald-800">السلع المرتفعة</div>
              <div className="my-1 flex items-baseline gap-1.5">
                <span dir="ltr" className="text-2xl font-black text-emerald-700 font-mono" style={{ unicodeBidi: 'isolate' }}>
                  {stats.upCount}
                </span>
                <span dir="ltr" className="text-[11px] text-emerald-800 font-bold font-mono">
                  ({stats.totalCommodities > 0 ? ((stats.upCount / stats.totalCommodities) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div className="text-[10px] text-emerald-700 font-medium leading-tight">حققت نمواً سعرياً موجباً</div>
            </div>

            {/* Card 7: السلع المنخفضة */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-2.5 shadow-none flex flex-col justify-between min-h-[114px]">
              <div className="text-[11px] font-bold text-rose-800">السلع المنخفضة</div>
              <div className="my-1 flex items-baseline gap-1.5">
                <span dir="ltr" className="text-2xl font-black text-rose-700 font-mono" style={{ unicodeBidi: 'isolate' }}>
                  {stats.downCount}
                </span>
                <span dir="ltr" className="text-[11px] text-rose-800 font-bold font-mono">
                  ({stats.totalCommodities > 0 ? ((stats.downCount / stats.totalCommodities) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div className="text-[10px] text-rose-700 font-medium leading-tight">سجلت تراجعاً سعرياً</div>
            </div>

            {/* Card 8: أعلى سلعة ارتفاعًا */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-none flex flex-col justify-between min-h-[114px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">أعلى سلعة ارتفاعًا</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">TOP</span>
              </div>
              <div className="my-1">
                <span dir="ltr" className="text-2xl font-black text-emerald-700 font-mono inline-block" style={{ unicodeBidi: 'isolate' }}>
                  {stats.topGainer ? `+${stats.topGainer.changePercent.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="space-y-0.5 min-w-0">
                <div 
                  className="text-xs font-bold text-slate-900 leading-snug break-words"
                  style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                >
                  {stats.topGainer?.name_ar || '—'}
                </div>
                <div dir="ltr" className="text-[10px] text-slate-500 font-mono font-bold uppercase" style={{ unicodeBidi: 'isolate' }}>
                  {stats.topGainer?.symbol || '—'}
                </div>
              </div>
            </div>

            {/* Card 9: أعلى سلعة انخفاضًا */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-none flex flex-col justify-between min-h-[114px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">أعلى سلعة انخفاضًا</span>
                <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">LOW</span>
              </div>
              <div className="my-1">
                <span dir="ltr" className="text-2xl font-black text-rose-700 font-mono inline-block" style={{ unicodeBidi: 'isolate' }}>
                  {stats.topLoser ? `${stats.topLoser.changePercent.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="space-y-0.5 min-w-0">
                <div 
                  className="text-xs font-bold text-slate-900 leading-snug break-words"
                  style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                >
                  {stats.topLoser?.name_ar || '—'}
                </div>
                <div dir="ltr" className="text-[10px] text-slate-500 font-mono font-bold uppercase" style={{ unicodeBidi: 'isolate' }}>
                  {stats.topLoser?.symbol || '—'}
                </div>
              </div>
            </div>

            {/* Card 10: تنبيهات جودة البيانات */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 shadow-none flex flex-col justify-between min-h-[114px]">
              <div className="text-[11px] font-bold text-amber-800">تنبيهات جودة البيانات</div>
              <div className="my-1 flex items-baseline gap-1.5">
                <span dir="ltr" className="text-2xl font-black text-amber-800 font-mono" style={{ unicodeBidi: 'isolate' }}>
                  {stats.totalAnomalies}
                </span>
                <span className="text-[11px] text-amber-800 font-bold">تنبيه شذوذ</span>
              </div>
              <div className="text-[10px] text-amber-700 leading-tight">محفوظة بالأرشيف ومميزة</div>
            </div>

          </div>

          {/* Auto Executive Summary Box */}
          <div className="bg-slate-50 border-2 border-[#1e3a8a]/20 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b45309]"></span>
              <h3 className="text-sm font-bold text-[#1e3a8a]">
                الملخص التنفيذي الاقتصادي (Executive Market Summary)
              </h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {executiveSummaryText || 'سجلت منصة الأسعار العالمية (GPP) خلال فترة التقرير حركة متوازنة للسلع الأساسية، مع تباين في أداء قطاعات الطاقة والمعادن والسلع الزراعية والحيوانية وفق مؤشرات التداول الرسمية.'}
            </p>
          </div>

          {/* Key Observations Note */}
          <div className="grid grid-cols-3 gap-3 text-xs bg-slate-100/70 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-700">السلع المستقرة دون تغير: </span>
              <span className="font-mono font-bold text-slate-900">{stats.stableCount}</span> سلعة
            </div>
            <div>
              <span className="font-bold text-slate-700">الأعلى تذبذباً: </span>
              <span className="font-bold text-slate-900">{stats.mostVolatile?.name_ar || '—'}</span>
              <span dir="ltr" className="font-mono text-[11px] mr-1 text-slate-600">
                ({stats.mostVolatile ? stats.mostVolatile.rangePercent.toFixed(1) : 0}%)
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-700">منهجية الرصد: </span>
              <span className="text-slate-600">أسعار إغلاق رسمية ومصادر موثقة</span>
            </div>
          </div>
        </div>

        {/* Page 1 Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
          <span>منصة الأسعار العالمية (GPP) — شبكة ليبيا للتجارة (LTN) — مكتب بيانات الأسعار العالمية</span>
          <span className="font-mono font-bold text-slate-700">الصفحة 1 من 3</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PAGE 2: SECTOR HEATMAP & PERFORMANCE MATRIX                    */}
      {/* ============================================================== */}
      <div 
        ref={page2Ref}
        className="dashboard-a4-page bg-white text-slate-900 flex flex-col justify-between"
        style={{
          width: '1123px',
          height: '794px',
          padding: '28px 36px',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Page 2 Header */}
        <div>
          <div className="flex items-center justify-between border-b-2 border-[#1e3a8a] pb-3 mb-4">
            <img 
              src="https://i.postimg.cc/bwVPbtwT/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png" 
              alt="LTN Logo" 
              className="h-12 w-auto object-contain"
              crossOrigin="anonymous"
            />
            <div className="text-center">
              <h1 className="text-2xl font-black text-[#1e3a8a]" style={{ letterSpacing: '0px' }}>
                الخريطة الحرارية لأداء القطاعات ومصفوفة الأداء الاقتصادي
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-1">
                الفترة: <span className="font-bold text-[#1e3a8a]">{periodLabel}</span> • تحليل نمو وانكماش القطاعات
              </p>
            </div>
            <img 
              src="https://i.postimg.cc/fyZwc16S/tsmym-bdwn-%CA%BFnwan-(1).png" 
              alt="GPP Logo" 
              className="h-12 w-auto object-contain"
              crossOrigin="anonymous"
            />
          </div>

          {/* Embedded Sector Heatmap */}
          <div className="mb-4">
            <SectorHeatmap sectors={sectorAnalytics} />
          </div>

          {/* Sector Detailed Summary Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-none mb-3">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#1e3a8a] text-white text-[11px] font-bold">
                <tr>
                  <th className="p-2 text-right">القطاع</th>
                  <th className="p-2 text-center">الرمز</th>
                  <th className="p-2 text-center">عدد السلع</th>
                  <th className="p-2 text-center">متوسط التغير %</th>
                  <th className="p-2 text-center">أفضل أداء</th>
                  <th className="p-2 text-center">أدنى أداء</th>
                  <th className="p-2 text-center">صاعد / هابط / مستقر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sectorAnalytics.map((sec, idx) => (
                  <tr key={sec.sector} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2 font-bold text-slate-900">{sec.sectorNameAr}</td>
                    <td className="p-2 text-center font-mono text-slate-500 uppercase">{sec.sector}</td>
                    <td className="p-2 text-center font-mono font-bold">{sec.commoditiesCount}</td>
                    <td className="p-2 text-center">
                      <span 
                        dir="ltr" 
                        className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          sec.avgChangePercent > 0 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : sec.avgChangePercent < 0 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {sec.avgChangePercent > 0 ? '+' : ''}{sec.avgChangePercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      {sec.topGainer ? (
                        <span className="font-semibold text-emerald-700">
                          {sec.topGainer.name_ar} (<span dir="ltr">+{sec.topGainer.changePercent.toFixed(1)}%</span>)
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-2 text-center">
                      {sec.topLoser ? (
                        <span className="font-semibold text-rose-700">
                          {sec.topLoser.name_ar} (<span dir="ltr">{sec.topLoser.changePercent.toFixed(1)}%</span>)
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-2 text-center font-mono text-[11px]">
                      <span className="text-emerald-700 font-bold">{sec.upCount}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-rose-700 font-bold">{sec.downCount}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-slate-600 font-bold">{sec.stableCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Page 2 Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
          <span>منصة الأسعار العالمية (GPP) — شبكة ليبيا للتجارة (LTN) — مكتب بيانات الأسعار العالمية</span>
          <span className="font-mono font-bold text-slate-700">الصفحة 2 من 3</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PAGE 3: BASE-100 INDEX & TOP MOVERS CHARTS                     */}
      {/* ============================================================== */}
      <div 
        ref={page3Ref}
        className="dashboard-a4-page bg-white text-slate-900 flex flex-col justify-between"
        style={{
          width: '1123px',
          height: '794px',
          padding: '28px 36px',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Page 3 Header */}
        <div>
          <div className="flex items-center justify-between border-b-2 border-[#1e3a8a] pb-3 mb-4">
            <img 
              src="https://i.postimg.cc/bwVPbtwT/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png" 
              alt="LTN Logo" 
              className="h-12 w-auto object-contain"
              crossOrigin="anonymous"
            />
            <div className="text-center">
              <h1 className="text-2xl font-black text-[#1e3a8a]" style={{ letterSpacing: '0px' }}>
                المقارنة المعيارية للأسعار (Base-100) والسلع الأكثر ارتفاعاً وانخفاضاً
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-1">
                الفترة: <span className="font-bold text-[#1e3a8a]">{periodLabel}</span> • مقارنة عادلة تلغي أثر اختلاف وحدات القياس
              </p>
            </div>
            <img 
              src="https://i.postimg.cc/fyZwc16S/tsmym-bdwn-%CA%BFnwan-(1).png" 
              alt="GPP Logo" 
              className="h-12 w-auto object-contain"
              crossOrigin="anonymous"
            />
          </div>

          {/* Grid Layout: Base-100 Chart (7 cols) and Top Movers (5 cols) Side-by-Side */}
          <div className="grid grid-cols-12 gap-3 mb-3">
            {/* Base-100 Chart Box */}
            <div className="col-span-7 border border-slate-200 rounded-xl p-3 bg-white">
              <Base100ComparisonChart 
                commoditiesAnalysis={commoditiesAnalytics} 
                chartHeight={300} 
                hideControls={true} 
              />
            </div>

            {/* Top Movers Chart Box */}
            <div className="col-span-5 border border-slate-200 rounded-xl p-3 bg-white">
              <TopMoversChart 
                commoditiesAnalysis={commoditiesAnalytics} 
                limit={4} 
                chartHeight={300} 
                hideControls={true} 
              />
            </div>
          </div>

          {/* Methodology and Unit Measurement Clarification */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-3 text-[11px] text-slate-600">
            <Info size={16} className="text-[#1e3a8a] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-slate-800">
                إيضاح وحدات القياس والمنهجية الإحصائية:
              </div>
              <p className="leading-relaxed">
                • يتم رصد أسعار الطاقة (برنت، غرب تكساس) بوحدة <strong>USD/barrel</strong>، والمعادن (الذهب، الفضة) بوحدة <strong>USD/troy oz</strong>.
                <br />
                • القمح الأمريكي (<strong>WHEAT_US</strong>) مسجل في البورصات بوحدة <strong>سنت أمريكي لكل بوشل (US cents/bushel)</strong> وليس بالدولار (مثال: 614.9 سنت = 6.149 دولار للبوشل).
                <br />
                • مؤشر <strong>Base-100</strong> يعيد ضبط نقطة الانطلاق إلى 100 لتسهيل المقارنة المباشرة، وأي قيمة فوق 100 تعبر عن نمو تراكمي.
              </p>
            </div>
          </div>
        </div>

        {/* Page 3 Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
          <span>منصة الأسعار العالمية (GPP) — شبكة ليبيا للتجارة (LTN) — مكتب بيانات الأسعار العالمية</span>
          <span className="font-mono font-bold text-slate-700">الصفحة 3 من 3</span>
        </div>
      </div>

    </div>
  );
};
export default DashboardPrintTemplate;
