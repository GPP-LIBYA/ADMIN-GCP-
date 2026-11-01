import React, { useState } from 'react';
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
  ChevronDown, 
  ChevronUp,
  Percent
} from 'lucide-react';
import type { ExecutiveReportStats, CommodityAnalysisResult } from '../../utils/economicAnalytics';

interface EconomicKpiCardsProps {
  stats: ExecutiveReportStats;
  selectedPeriodLabel?: string;
  allCommoditiesAnalysis?: CommodityAnalysisResult[];
  onSelectCommodity?: (symbol: string) => void;
}

export const EconomicKpiCards: React.FC<EconomicKpiCardsProps> = ({
  stats,
  selectedPeriodLabel,
  allCommoditiesAnalysis = [],
  onSelectCommodity
}) => {
  const [showAnomalyDetails, setShowAnomalyDetails] = useState(false);

  // Commodities with detected anomalies
  const anomalousCommodities = allCommoditiesAnalysis.filter(c => (c.anomaliesCount || 0) > 0);

  return (
    <div className="space-y-4 w-full">
      {/* 10 Executive KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* KPI 1: إجمالي السلع المشمولة */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[148px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">إجمالي السلع المشمولة</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Package size={16} />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span dir="ltr" className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white" style={{ unicodeBidi: 'isolate' }}>
              {stats.totalCommodities}
            </span>
            <span className="text-xs text-slate-400 font-medium">سلعة</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 break-words leading-tight">
            ضمن سلة السلع العالمية
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-blue-500"></div>
        </div>

        {/* KPI 2: القطاعات المشمولة */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[148px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">القطاعات المشمولة</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Layers size={16} />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span dir="ltr" className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white" style={{ unicodeBidi: 'isolate' }}>
              {stats.totalSectors}
            </span>
            <span className="text-xs text-slate-400 font-medium">قطاعات</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 break-words leading-tight">
            طاقة، معادن، زراعة، حيوانية
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-indigo-500"></div>
        </div>

        {/* KPI 3: السجلات التاريخية */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[148px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">السجلات التاريخية</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Database size={16} />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span dir="ltr" className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white" style={{ unicodeBidi: 'isolate' }}>
              {stats.totalRawRecords.toLocaleString('en-US')}
            </span>
            <span className="text-xs text-slate-400 font-medium">سجل</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold leading-tight">
            <CheckCircle2 size={13} className="shrink-0" />
            <span>مكتملة عبر Pagination</span>
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-emerald-500"></div>
        </div>

        {/* KPI 4: أيام الرصد الفعلي */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[148px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">أيام الرصد الفعلي</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Calendar size={16} />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span dir="ltr" className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white" style={{ unicodeBidi: 'isolate' }}>
              {stats.periodDays}
            </span>
            <span className="text-xs text-slate-400 font-medium">يوم رصد</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 break-words leading-tight">
            {selectedPeriodLabel || 'النطاق الزمني المحدد'}
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-purple-500"></div>
        </div>

        {/* KPI 5: متوسط التغير السعري */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[148px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">متوسط التغير السعري</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Percent size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <span 
              dir="ltr" 
              className={`text-2xl sm:text-3xl font-black font-mono inline-block ${
                stats.overallAvgChangePercent > 0 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : stats.overallAvgChangePercent < 0 
                  ? 'text-rose-600 dark:text-rose-400' 
                  : 'text-slate-700 dark:text-slate-300'
              }`}
              style={{ unicodeBidi: 'isolate' }}
            >
              {stats.overallAvgChangePercent > 0 ? '+' : ''}
              {stats.overallAvgChangePercent.toFixed(2)}%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 break-words leading-tight">
            متوسط نسبي موحد لكامل السلة
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-cyan-500"></div>
        </div>

        {/* KPI 6: السلع المرتفعة */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[148px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">السلع المرتفعة</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span dir="ltr" className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400" style={{ unicodeBidi: 'isolate' }}>
              {stats.upCount}
            </span>
            <span dir="ltr" className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono">
              ({stats.totalCommodities > 0 ? ((stats.upCount / stats.totalCommodities) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 break-words leading-tight font-medium">
            حققت نمواً سعرياً موجباً
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-emerald-600"></div>
        </div>

        {/* KPI 7: السلع المنخفضة */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[148px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300">السلع المنخفضة</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span dir="ltr" className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400" style={{ unicodeBidi: 'isolate' }}>
              {stats.downCount}
            </span>
            <span dir="ltr" className="text-xs font-bold text-rose-700 dark:text-rose-300 font-mono">
              ({stats.totalCommodities > 0 ? ((stats.downCount / stats.totalCommodities) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 break-words leading-tight font-medium">
            سجلت تراجعاً سعرياً
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-rose-600"></div>
        </div>

        {/* KPI 8: أعلى سلعة ارتفاعًا */}
        <div 
          onClick={() => stats.topGainer && onSelectCommodity?.(stats.topGainer.symbol)}
          className={`bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[148px] ${
            stats.topGainer ? 'cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">أعلى سلعة ارتفاعًا</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full shrink-0">
              TOP GAINER
            </span>
          </div>

          {stats.topGainer ? (
            <>
              {/* Main Prominent Value in the Center */}
              <div className="my-1.5">
                <span 
                  dir="ltr" 
                  className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 inline-block"
                  style={{ unicodeBidi: 'isolate' }}
                >
                  +{stats.topGainer.changePercent.toFixed(1)}%
                </span>
              </div>

              {/* Full Arabic Commodity Name with Wrapping + English Symbol below */}
              <div className="space-y-0.5 min-w-0">
                <div 
                  className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words"
                  style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                >
                  {stats.topGainer.name_ar}
                </div>
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span 
                    dir="ltr" 
                    className="font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
                    style={{ unicodeBidi: 'isolate' }}
                  >
                    {stats.topGainer.symbol}
                  </span>
                  <span dir="ltr" className="text-[11px] font-mono text-slate-400 dark:text-slate-500" style={{ unicodeBidi: 'isolate' }}>
                    {stats.topGainer.currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} {stats.topGainer.unit || ''}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="my-auto text-xs text-slate-400">—</div>
          )}
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-emerald-500"></div>
        </div>

        {/* KPI 9: أعلى سلعة انخفاضًا */}
        <div 
          onClick={() => stats.topLoser && onSelectCommodity?.(stats.topLoser.symbol)}
          className={`bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[148px] ${
            stats.topLoser ? 'cursor-pointer hover:border-rose-300 dark:hover:border-rose-700' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">أعلى سلعة انخفاضًا</span>
            <span className="text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 font-bold px-2 py-0.5 rounded-full shrink-0">
              TOP LOSER
            </span>
          </div>

          {stats.topLoser ? (
            <>
              {/* Main Prominent Value in the Center */}
              <div className="my-1.5">
                <span 
                  dir="ltr" 
                  className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400 inline-block"
                  style={{ unicodeBidi: 'isolate' }}
                >
                  {stats.topLoser.changePercent.toFixed(1)}%
                </span>
              </div>

              {/* Full Arabic Commodity Name with Wrapping + English Symbol below */}
              <div className="space-y-0.5 min-w-0">
                <div 
                  className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words"
                  style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                >
                  {stats.topLoser.name_ar}
                </div>
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span 
                    dir="ltr" 
                    className="font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
                    style={{ unicodeBidi: 'isolate' }}
                  >
                    {stats.topLoser.symbol}
                  </span>
                  <span dir="ltr" className="text-[11px] font-mono text-slate-400 dark:text-slate-500" style={{ unicodeBidi: 'isolate' }}>
                    {stats.topLoser.currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} {stats.topLoser.unit || ''}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="my-auto text-xs text-slate-400">—</div>
          )}
          <div className="absolute bottom-0 right-0 left-0 h-1 bg-rose-500"></div>
        </div>

        {/* KPI 10: تنبيهات جودة البيانات */}
        <div 
          onClick={() => stats.totalAnomalies > 0 && setShowAnomalyDetails(!showAnomalyDetails)}
          className={`bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[148px] ${
            stats.totalAnomalies > 0 ? 'cursor-pointer hover:border-amber-400 dark:hover:border-amber-600' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">تنبيهات جودة البيانات</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              stats.totalAnomalies > 0 
                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' 
                : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              {stats.totalAnomalies > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span 
              dir="ltr"
              className={`text-2xl sm:text-3xl font-black font-mono ${
                stats.totalAnomalies > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
              style={{ unicodeBidi: 'isolate' }}
            >
              {stats.totalAnomalies}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {stats.totalAnomalies > 0 ? 'تنبيه شذوذ' : 'شذوذ'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between leading-tight">
            <span>{stats.totalAnomalies > 0 ? 'اضغط لعرض التفاصيل' : 'بيانات متسقة تماماً'}</span>
            {stats.totalAnomalies > 0 && (
              <span>{showAnomalyDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
            )}
          </div>
          <div className={`absolute bottom-0 right-0 left-0 h-1 ${
            stats.totalAnomalies > 0 ? 'bg-amber-500' : 'bg-emerald-500'
          }`}></div>
        </div>

      </div>

      {/* Anomaly Details Dropdown / Banner */}
      {showAnomalyDetails && stats.totalAnomalies > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-900 dark:text-amber-200 transition-all">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <div className="font-bold flex items-center justify-between">
                <span>تنبيه تدقيق جودة البيانات التاريخية (Data Quality Audit)</span>
                <span className="text-xs font-normal bg-amber-200 dark:bg-amber-900 px-2 py-0.5 rounded text-amber-950 dark:text-amber-100">
                  تم اكتشاف {stats.totalAnomalies} سجل شاذ
                </span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                تم رصد قراءات سعرية تاريخية تبتعد إحصائياً بأكثر من 2.5 انحراف معياري أو بقفزة تزيد عن 20% (مثل سجلات WTI السابقة عند 2.91$ و 3.20$). هذه السجلات <strong>محفوظة بأمان في قاعدة البيانات</strong> ولم تُحذف لضمان أمانة الأرشيف، وتم تمييزها هنا لتنبيه المحلل الاقتصادي.
              </p>
              {anomalousCommodities.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {anomalousCommodities.map(c => (
                    <button
                      key={c.symbol}
                      onClick={() => onSelectCommodity?.(c.symbol)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 rounded-md text-xs font-semibold text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-800 transition"
                    >
                      <span>{c.name_ar} ({c.symbol})</span>
                      <span className="bg-amber-200 dark:bg-amber-700 px-1.5 py-0.2 rounded-full text-[10px]">
                        {c.anomaliesCount} تنبيه
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default EconomicKpiCards;
