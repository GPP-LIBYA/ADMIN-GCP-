import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  BarChart3 
} from 'lucide-react';
import type { CommodityAnalysisResult } from '../../utils/economicAnalytics';

interface TopMoversChartProps {
  commoditiesAnalysis: CommodityAnalysisResult[];
  limit?: number;
  onSelectCommodity?: (symbol: string) => void;
  chartHeight?: number;
  hideControls?: boolean;
}

export const TopMoversChart: React.FC<TopMoversChartProps> = ({
  commoditiesAnalysis,
  limit = 5,
  onSelectCommodity,
  chartHeight = 320,
  hideControls = false
}) => {
  const [filterMode, setFilterMode] = useState<'both' | 'gainers' | 'losers'>('both');

  // Filter valid commodities with changes
  const { topGainers, topLosers, combinedList } = useMemo(() => {
    const valid = (commoditiesAnalysis || []).filter(c => c.hasData && typeof c.changePercent === 'number');

    const gainers = [...valid]
      .filter(c => c.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, limit);

    const losers = [...valid]
      .filter(c => c.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, limit);

    // For combined chart display, put gainers then losers
    const combined = [...gainers, ...losers];

    return { topGainers: gainers, topLosers: losers, combinedList: combined };
  }, [commoditiesAnalysis, limit]);

  const activeItems = useMemo(() => {
    if (filterMode === 'gainers') return topGainers;
    if (filterMode === 'losers') return topLosers;
    return combinedList;
  }, [filterMode, topGainers, topLosers, combinedList]);

  // Prepare chart data format
  const chartData = useMemo(() => {
    return activeItems.map(c => ({
      symbol: c.symbol,
      name_ar: c.name_ar,
      sector: c.sector,
      unit: c.symbol === 'WHEAT_US' ? 'سنت / بوشل' : (c.unit || ''),
      changePercent: Number(c.changePercent.toFixed(2)),
      currentPrice: c.currentPrice,
      startPrice: c.startPrice,
      isGainer: c.changePercent >= 0
    }));
  }, [activeItems]);

  if (activeItems.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-8 text-center text-slate-500">
        لا تتوفر تحركات سعرية كافية لتوليد مخطط السلع الأكثر تغيراً
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5 shadow-sm space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <BarChart3 size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              مخطط السلع الأكثر تحركاً (Top Movers)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              أعلى السلع ربحاً وأكثرها هبوطاً خلال الفترة المحددة
            </p>
          </div>
        </div>

        {/* View Mode Buttons */}
        {!hideControls && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('both')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                filterMode === 'both' 
                  ? 'bg-white dark:bg-dark-card text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              الكل ({combinedList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('gainers')}
              className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                filterMode === 'gainers' 
                  ? 'bg-white dark:bg-dark-card text-emerald-600 dark:text-emerald-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
              }`}
            >
              <TrendingUp size={12} />
              الرابحون ({topGainers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('losers')}
              className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                filterMode === 'losers' 
                  ? 'bg-white dark:bg-dark-card text-rose-600 dark:text-rose-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
              }`}
            >
              <TrendingDown size={12} />
              الخاسرون ({topLosers.length})
            </button>
          </div>
        )}
      </div>

      {/* Grid with Visual Cards and Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Recharts Bar Visualization */}
        <div className="lg:col-span-7 w-full" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis 
                type="number" 
                stroke="#64748b" 
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis 
                type="category" 
                dataKey="symbol" 
                stroke="#64748b" 
                tick={{ fontSize: 11, fontWeight: 'bold' }}
                width={85}
              />
              <ReferenceLine x={0} stroke="#475569" strokeWidth={1.5} />
              
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const item = payload[0].payload;
                  const isUp = item.changePercent >= 0;

                  return (
                    <div className="bg-white dark:bg-dark-card p-3 rounded-xl shadow-xl border border-slate-200 dark:border-dark-border text-xs space-y-1.5" dir="rtl">
                      <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center justify-between">
                        <span>{item.name_ar}</span>
                        <span className="font-mono text-slate-400">({item.symbol})</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">نسبة التغير:</span>
                        <span className={`font-bold font-mono dir-ltr ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isUp ? '+' : ''}{item.changePercent}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">السعر الأخير:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">
                          {item.currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} {item.unit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">سعر البداية:</span>
                        <span className="font-mono text-slate-600 dark:text-slate-400">
                          {item.startPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} {item.unit}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />

              <Bar dataKey="changePercent" radius={[4, 4, 4, 4]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isGainer ? '#10b981' : '#f43f5e'} 
                    className="cursor-pointer hover:opacity-85 transition-opacity"
                    onClick={() => onSelectCommodity?.(entry.symbol)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right Column: Comparative Ranked List */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          {activeItems.map((c, index) => {
            const isGainer = c.changePercent >= 0;
            const unitLabel = c.symbol === 'WHEAT_US' ? 'سنت / بوشل' : (c.unit || '');

            return (
              <div
                key={c.symbol}
                onClick={() => onSelectCommodity?.(c.symbol)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isGainer
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400'
                    : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 hover:border-rose-400'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                    isGainer ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {c.name_ar}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <span className="font-mono">{c.symbol}</span>
                      <span>•</span>
                      <span>{c.currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} {unitLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="text-left shrink-0">
                  <span className={`inline-flex items-center gap-0.5 text-xs font-bold font-mono px-2 py-0.5 rounded dir-ltr ${
                    isGainer
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                  }`}>
                    {isGainer ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {isGainer ? '+' : ''}{c.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
export default TopMoversChart;
