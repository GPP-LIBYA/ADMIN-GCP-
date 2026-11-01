import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight,
  Flame
} from 'lucide-react';
import type { SectorAnalysisResult } from '../../utils/economicAnalytics';

interface SectorHeatmapProps {
  sectors: SectorAnalysisResult[];
  selectedSector?: string;
  onSelectSector?: (sectorCode: string) => void;
}

export const SectorHeatmap: React.FC<SectorHeatmapProps> = ({
  sectors,
  selectedSector,
  onSelectSector
}) => {
  if (!sectors || sectors.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-6 text-center text-slate-500">
        لا تتوفر بيانات كافية لعرض الخريطة الحرارية للقطاعات
      </div>
    );
  }

  // Helper function to calculate heat color intensity based on change percent
  const getSectorHeatStyles = (pct: number) => {
    if (pct > 5) {
      return {
        cardBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-400 dark:border-emerald-600',
        badgeBg: 'bg-emerald-600 text-white',
        textAccent: 'text-emerald-700 dark:text-emerald-300',
        heatLevel: 'نمو قوي'
      };
    } else if (pct > 1.5) {
      return {
        cardBg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700',
        badgeBg: 'bg-emerald-500 text-white',
        textAccent: 'text-emerald-600 dark:text-emerald-400',
        heatLevel: 'نمو معتدل'
      };
    } else if (pct > 0.1) {
      return {
        cardBg: 'bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800',
        badgeBg: 'bg-teal-500 text-white',
        textAccent: 'text-teal-600 dark:text-teal-400',
        heatLevel: 'نمو طفيف'
      };
    } else if (pct < -5) {
      return {
        cardBg: 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-400 dark:border-rose-600',
        badgeBg: 'bg-rose-600 text-white',
        textAccent: 'text-rose-700 dark:text-rose-300',
        heatLevel: 'انكماش قوي'
      };
    } else if (pct < -1.5) {
      return {
        cardBg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700',
        badgeBg: 'bg-rose-500 text-white',
        textAccent: 'text-rose-600 dark:text-rose-400',
        heatLevel: 'انكماش معتدل'
      };
    } else if (pct < -0.1) {
      return {
        cardBg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
        badgeBg: 'bg-amber-500 text-white',
        textAccent: 'text-amber-600 dark:text-amber-400',
        heatLevel: 'انكماش طفيف'
      };
    } else {
      return {
        cardBg: 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700',
        badgeBg: 'bg-slate-500 text-white',
        textAccent: 'text-slate-600 dark:text-slate-300',
        heatLevel: 'استقرار تام'
      };
    }
  };

  return (
    <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <Flame size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              الخريطة الحرارية لأداء القطاعات
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                (Sector Performance Heatmap)
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              مصفوفة ديناميكية تقيس متوسط عوائد القطاعات وتوزيع السلع الصاعدة والهابطة
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            نمو
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            انكماش
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
            استقرار
          </span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectors.map((sec) => {
          const styles = getSectorHeatStyles(sec.avgChangePercent);
          const isSelected = selectedSector === sec.sector;
          const totalInSector = sec.commoditiesCount || (sec.upCount + sec.downCount + sec.stableCount);
          const upPct = totalInSector > 0 ? (sec.upCount / totalInSector) * 100 : 0;
          const downPct = totalInSector > 0 ? (sec.downCount / totalInSector) * 100 : 0;
          const stablePct = totalInSector > 0 ? (sec.stableCount / totalInSector) * 100 : 0;

          return (
            <div
              key={sec.sector}
              onClick={() => onSelectSector?.(isSelected ? '' : sec.sector)}
              className={`border-2 rounded-xl p-4 transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                styles.cardBg
              } ${
                isSelected 
                  ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-dark-card shadow-md scale-[1.01]' 
                  : 'hover:shadow-md hover:scale-[1.005]'
              }`}
            >
              <div>
                {/* Sector Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-base">
                      {sec.sectorNameAr}
                    </span>
                    <span className="text-xs text-slate-400 uppercase font-mono">
                      {sec.sector}
                    </span>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono dir-ltr ${styles.badgeBg}`}>
                    {sec.avgChangePercent > 0 ? '+' : ''}
                    {sec.avgChangePercent.toFixed(2)}%
                  </div>
                </div>

                {/* Subtitle / Level */}
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="text-slate-500 dark:text-slate-400">
                    {sec.commoditiesCount} سلع مغطاة
                  </span>
                  <span className={`text-[11px] font-semibold ${styles.textAccent}`}>
                    {styles.heatLevel}
                  </span>
                </div>

                {/* Distribution Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex mb-3">
                  {upPct > 0 && (
                    <div 
                      className="bg-emerald-500 h-full transition-all" 
                      style={{ width: `${upPct}%` }}
                      title={`مرتفع: ${sec.upCount} (${upPct.toFixed(0)}%)`}
                    />
                  )}
                  {stablePct > 0 && (
                    <div 
                      className="bg-slate-400 h-full transition-all" 
                      style={{ width: `${stablePct}%` }}
                      title={`مستقر: ${sec.stableCount} (${stablePct.toFixed(0)}%)`}
                    />
                  )}
                  {downPct > 0 && (
                    <div 
                      className="bg-rose-500 h-full transition-all" 
                      style={{ width: `${downPct}%` }}
                      title={`منخفض: ${sec.downCount} (${downPct.toFixed(0)}%)`}
                    />
                  )}
                </div>

                {/* Counts Summary */}
                <div className="grid grid-cols-3 gap-1 text-center text-[11px] pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <TrendingUp size={12} />
                    <span>{sec.upCount} صاعد</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400 font-semibold">
                    <Minus size={12} />
                    <span>{sec.stableCount} مستقر</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                    <TrendingDown size={12} />
                    <span>{sec.downCount} هابط</span>
                  </div>
                </div>
              </div>

              {/* Best and Worst Movers inside Sector */}
              <div className="pt-2.5 space-y-1.5 text-xs">
                {sec.topGainer && (
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                      <ArrowUpRight size={13} />
                      الأفضل:
                    </span>
                    <span className="font-semibold truncate max-w-[120px]">
                      {sec.topGainer.name_ar}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[11px] dir-ltr">
                      +{sec.topGainer.changePercent.toFixed(1)}%
                    </span>
                  </div>
                )}
                {sec.topLoser && (
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-[11px] font-medium">
                      <ArrowDownRight size={13} />
                      الأدنى:
                    </span>
                    <span className="font-semibold truncate max-w-[120px]">
                      {sec.topLoser.name_ar}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-mono font-bold text-[11px] dir-ltr">
                      {sec.topLoser.changePercent.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="mt-2 text-center text-[10px] font-bold text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-950/60 py-0.5 rounded">
                  تم تحديد القطاع للفلترة
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default SectorHeatmap;
