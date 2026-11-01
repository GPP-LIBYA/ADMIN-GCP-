import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  Activity, 
  SlidersHorizontal, 
  Info, 
  Check, 
  RotateCcw 
} from 'lucide-react';
import type { CommodityAnalysisResult } from '../../utils/economicAnalytics';

interface Base100ComparisonChartProps {
  commoditiesAnalysis: CommodityAnalysisResult[];
  initialSelectedSymbols?: string[];
  maxSelected?: number;
  chartHeight?: number;
  hideControls?: boolean;
}

// Distinct, highly legible color palette for financial charting
const CHART_COLORS = [
  '#2563eb', // Blue (BRENT/Primary)
  '#059669', // Emerald (WTI)
  '#d97706', // Amber (WHEAT)
  '#7c3aed', // Purple (GOLD)
  '#dc2626', // Red
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#4f46e5', // Indigo
  '#ca8a04', // Yellow-gold
  '#0d9488', // Teal
];

export const Base100ComparisonChart: React.FC<Base100ComparisonChartProps> = ({
  commoditiesAnalysis,
  initialSelectedSymbols,
  maxSelected = 8,
  chartHeight = 360,
  hideControls = false
}) => {
  // Filter only commodities that have valid data and normalized series
  const validCommodities = useMemo(() => {
    return (commoditiesAnalysis || []).filter(
      c => c.hasData && Array.isArray(c.normalizedSeries) && c.normalizedSeries.length > 0
    );
  }, [commoditiesAnalysis]);

  // Determine initial selection
  const defaultSelected = useMemo(() => {
    if (initialSelectedSymbols && initialSelectedSymbols.length > 0) {
      return initialSelectedSymbols.filter(s => validCommodities.some(c => c.symbol === s));
    }
    // Pick top 4 prominent symbols if available, or first 4
    const prominent = ['BRENT', 'WTI', 'WHEAT_US', 'GOLD_OUNCE'];
    const matched = validCommodities.filter(c => prominent.includes(c.symbol)).map(c => c.symbol);
    if (matched.length >= 2) return matched;
    return validCommodities.slice(0, 4).map(c => c.symbol);
  }, [initialSelectedSymbols, validCommodities]);

  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(defaultSelected);

  // Toggle commodity selection
  const toggleSymbol = (symbol: string) => {
    if (selectedSymbols.includes(symbol)) {
      if (selectedSymbols.length > 1) {
        setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
      }
    } else {
      if (selectedSymbols.length < maxSelected) {
        setSelectedSymbols([...selectedSymbols, symbol]);
      }
    }
  };

  // Preset selectors
  const applyPreset = (symbols: string[]) => {
    const available = symbols.filter(s => validCommodities.some(c => c.symbol === s));
    if (available.length > 0) {
      setSelectedSymbols(available.slice(0, maxSelected));
    }
  };

  // Build merged timeline data for recharts
  const chartData = useMemo(() => {
    if (selectedSymbols.length === 0 || validCommodities.length === 0) return [];

    // Map date -> { date, [symbol]: normalizedValue, [symbol_price]: price }
    const dateMap = new Map<string, any>();

    selectedSymbols.forEach(symbol => {
      const comm = validCommodities.find(c => c.symbol === symbol);
      if (!comm || !comm.normalizedSeries) return;

      comm.normalizedSeries.forEach(point => {
        const dateKey = point.date;
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, { date: dateKey });
        }
        const entry = dateMap.get(dateKey);
        entry[symbol] = point.normalizedValue;
        entry[`${symbol}_price`] = point.price;
        entry[`${symbol}_name`] = comm.name_ar;
        entry[`${symbol}_unit`] = comm.unit;
      });
    });

    // Sort by date ascending
    return Array.from(dateMap.values()).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [selectedSymbols, validCommodities]);

  // Map symbols to assigned colors
  const symbolColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    selectedSymbols.forEach((sym, index) => {
      map[sym] = CHART_COLORS[index % CHART_COLORS.length];
    });
    return map;
  }, [selectedSymbols]);

  if (validCommodities.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-8 text-center text-slate-500">
        لا تتوفر سلاسل بيانات تاريخية كافية لتوليد المؤشر المعياري Base-100
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-5 shadow-sm space-y-4">
      {/* Header and Explanation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Activity size={18} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              مخطط المقارنة المعيارية النسبية (Base-100 Normalized Index)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            يُعيد ضبط أسعار جميع السلع المختارة لتبدأ من قيمة موحدة (<strong>100</strong>) عند بداية الفترة، مما يمكّن من مقارنة دقيقة بين النفط والذهب والقمح وتجاوز اختلاف وحدات القياس.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 text-[11px] font-semibold ml-1">باقات سريعة:</span>
          <button
            type="button"
            onClick={() => applyPreset(['BRENT', 'WTI', 'GAS_US'])}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950 text-slate-700 dark:text-slate-300 hover:text-primary-600 rounded-md transition font-medium text-[11px]"
          >
            سلة الطاقة
          </button>
          <button
            type="button"
            onClick={() => applyPreset(['WHEAT_US', 'CORN_US', 'SOYBEAN_US', 'SUGAR_US'])}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950 text-slate-700 dark:text-slate-300 hover:text-primary-600 rounded-md transition font-medium text-[11px]"
          >
            سلة الحبوب والزراعة
          </button>
          <button
            type="button"
            onClick={() => applyPreset(['GOLD_OUNCE', 'SILVER_OUNCE', 'COPPER_US'])}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950 text-slate-700 dark:text-slate-300 hover:text-primary-600 rounded-md transition font-medium text-[11px]"
          >
            سلة المعادن
          </button>
          <button
            type="button"
            onClick={() => setSelectedSymbols(defaultSelected)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            title="إعادة تعيين الافتراضي"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Commodity Selector Chips */}
      {!hideControls && (
        <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <SlidersHorizontal size={13} />
              اختر السلع للمقارنة (محدد {selectedSymbols.length} من حد أقصى {maxSelected}):
            </span>
            <span className="text-[11px] text-slate-400">
              انقر على السلعة للتفعيل أو الإلغاء
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
            {validCommodities.map(comm => {
              const isSelected = selectedSymbols.includes(comm.symbol);
              const assignedColor = symbolColorMap[comm.symbol];

              return (
                <button
                  key={comm.symbol}
                  type="button"
                  onClick={() => toggleSymbol(comm.symbol)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    isSelected
                      ? 'text-white shadow-sm ring-1 ring-black/10'
                      : 'bg-white dark:bg-dark-card text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                  style={isSelected ? { backgroundColor: assignedColor } : undefined}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                  <span>{comm.name_ar}</span>
                  <span className="text-[10px] opacity-75 font-mono">({comm.symbol})</span>
                  <span className={`text-[10px] font-mono mr-1 ${
                    isSelected ? 'text-white' : comm.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {comm.changePercent >= 0 ? '+' : ''}{comm.changePercent.toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recharts Canvas */}
      <div className="w-full pt-2" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
            <XAxis 
              dataKey="date" 
              stroke="#64748b" 
              tick={{ fontSize: 11 }}
              tickFormatter={(val) => {
                try {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                } catch {
                  return val;
                }
              }}
            />
            <YAxis 
              stroke="#64748b" 
              tick={{ fontSize: 11 }}
              domain={['auto', 'auto']}
              tickFormatter={(val) => `${Number(val).toFixed(0)}`}
            />
            
            {/* Base 100 Reference Line */}
            <ReferenceLine 
              y={100} 
              stroke="#94a3b8" 
              strokeWidth={1.5}
              strokeDasharray="4 4" 
              label={{ 
                value: 'نقطة الأساس 100', 
                position: 'insideBottomLeft', 
                fill: '#64748b', 
                fontSize: 10 
              }} 
            />

            {/* Custom Rich Tooltip */}
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                return (
                  <div className="bg-white dark:bg-dark-card p-3 rounded-xl shadow-xl border border-slate-200 dark:border-dark-border text-xs space-y-2 min-w-[200px]" dir="rtl">
                    <div className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
                      <span>التاريخ: {label}</span>
                      <span className="text-[10px] text-slate-400">مؤشر Base-100</span>
                    </div>
                    <div className="space-y-1.5">
                      {payload.map((entry: any) => {
                        const sym = entry.dataKey;
                        const comm = validCommodities.find(c => c.symbol === sym);
                        if (!comm) return null;

                        const normalizedVal = Number(entry.value);
                        const diffFromBase = normalizedVal - 100;
                        const rawPrice = entry.payload?.[`${sym}_price`];
                        
                        // Strict unit labeling check (specifically for WHEAT_US cents/bushel)
                        const unitLabel = sym === 'WHEAT_US' 
                          ? 'سنت / بوشل' 
                          : (comm.unit || '');

                        return (
                          <div key={sym} className="flex items-center justify-between gap-3 text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="w-2.5 h-2.5 rounded-full shrink-0" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="font-semibold">{comm.name_ar}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({sym})</span>
                            </div>
                            <div className="text-left font-mono">
                              <span className="font-bold ml-1">
                                {normalizedVal.toFixed(1)}
                              </span>
                              <span className={`text-[10px] font-bold ${
                                diffFromBase >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                ({diffFromBase >= 0 ? '+' : ''}{diffFromBase.toFixed(1)}%)
                              </span>
                              {rawPrice !== undefined && (
                                <div className="text-[10px] text-slate-400">
                                  {Number(rawPrice).toLocaleString('en-US', { maximumFractionDigits: 2 })} {unitLabel}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }}
            />

            <Legend 
              formatter={(value) => {
                const comm = validCommodities.find(c => c.symbol === value);
                return (
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {comm ? `${comm.name_ar} (${value})` : value}
                  </span>
                );
              }}
            />

            {/* Dynamic Lines */}
            {selectedSymbols.map((symbol) => (
              <Line
                key={symbol}
                type="monotone"
                dataKey={symbol}
                name={symbol}
                stroke={symbolColorMap[symbol]}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 1 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Insight */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800">
        <Info size={14} className="text-blue-500 shrink-0" />
        <span>
          <strong>تفسير المؤشر:</strong> أي نقطة أعلى من 100 تعكس مكاسب تراكمية مقارنة بسعر بداية الفترة (مثلاً: 112 تعني نمو 12%)، وأي نقطة أقل من 100 تعكس خسارة نسبية (مثلاً: 92 تعني انخفاض 8%).
        </span>
      </div>
    </div>
  );
};
export default Base100ComparisonChart;
