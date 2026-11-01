/**
 * Economic & Statistical Analytics Engine for GPP Admin Reports
 * Global Prices Platform - Libyan Trade Net (LTN)
 */

export interface PriceRecord {
  symbol: string;
  price: number;
  high?: number | null;
  low?: number | null;
  source?: string | null;
  recorded_at: string;
  created_at?: string;
  admin_id?: string | number | null;
}

export interface CommodityAnalysisResult {
  symbol: string;
  name_ar: string;
  name_en: string;
  sector: string;
  unit: string | null;
  currentPrice: number;
  startPrice: number;
  endPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  medianPrice: number;
  changeValue: number;
  changePercent: number;
  standardDeviation: number;
  volatilityPercent: number;
  rangePercent: number;
  trend: 'up' | 'down' | 'stable';
  analysisStatus: string;
  rawRecordsCount: number;
  dailyDaysCount: number;
  upDays: number;
  downDays: number;
  stableDays: number;
  hasData: boolean;
  anomaliesCount: number;
  normalizedSeries: Array<{ date: string; normalizedValue: number; price: number }>;
}

export interface SectorAnalysisResult {
  sector: string;
  sectorNameAr: string;
  commoditiesCount: number;
  avgChangePercent: number;
  topGainer: { symbol: string; name_ar: string; changePercent: number } | null;
  topLoser: { symbol: string; name_ar: string; changePercent: number } | null;
  upCount: number;
  downCount: number;
  stableCount: number;
}

export interface ExecutiveReportStats {
  totalCommodities: number;
  totalSectors: number;
  periodDays: number;
  totalRawRecords: number;
  overallAvgChangePercent: number;
  topGainer: CommodityAnalysisResult | null;
  topLoser: CommodityAnalysisResult | null;
  mostVolatile: CommodityAnalysisResult | null;
  upCount: number;
  downCount: number;
  stableCount: number;
  totalAnomalies: number;
}

export function getDailySummaryRecords(records: PriceRecord[]): PriceRecord[] {
  if (!Array.isArray(records) || records.length === 0) return [];
  const dailyMap = new Map<string, PriceRecord>();

  records.forEach((record) => {
    if (!record || typeof record.price !== 'number' || isNaN(record.price)) return;
    const dateVal = record.recorded_at || record.created_at;
    if (!dateVal) return;
    const dateObj = new Date(dateVal);
    if (isNaN(dateObj.getTime())) return;

    const dateKey = `${record.symbol || ''}_${dateObj.toISOString().slice(0, 10)}`;
    const existing = dailyMap.get(dateKey);

    if (!existing) {
      dailyMap.set(dateKey, record);
    } else {
      const existingTime = new Date(existing.recorded_at || existing.created_at || '').getTime();
      const currentTime = dateObj.getTime();
      if (currentTime > existingTime) {
        dailyMap.set(dateKey, record);
      }
    }
  });

  return Array.from(dailyMap.values()).sort((a, b) => {
    const timeA = new Date(a.recorded_at || a.created_at || '').getTime();
    const timeB = new Date(b.recorded_at || b.created_at || '').getTime();
    return timeA - timeB;
  });
}

export function calculateStandardDeviation(values: number[]): number {
  if (!Array.isArray(values) || values.length <= 1) return 0;
  const validValues = values.filter((v) => typeof v === 'number' && !isNaN(v));
  if (validValues.length <= 1) return 0;

  const mean = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  const squaredDiffs = validValues.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (validValues.length - 1);
  return Math.sqrt(variance);
}

export function isPriceAnomaly(
  currentPrice: number,
  previousPrice: number,
  avgPrice: number,
  stdDev: number
): boolean {
  if (!currentPrice || currentPrice <= 0) return false;
  if (previousPrice && previousPrice > 0) {
    const pctChange = Math.abs((currentPrice - previousPrice) / previousPrice) * 100;
    if (pctChange >= 20) return true;
  }
  if (stdDev > 0 && Math.abs(currentPrice - avgPrice) > 2.5 * stdDev) {
    return true;
  }
  return false;
}

export function analyzeCommodity(
  commodity: {
    symbol: string;
    name_ar: string;
    name_en: string;
    sector: string;
    unit?: string | null;
    price?: number;
    previous_price?: number | null;
    change_percent?: number | null;
  },
  historyRecords: PriceRecord[]
): CommodityAnalysisResult {
  const commodityHistory = (Array.isArray(historyRecords) ? historyRecords : [])
    .filter((r) => r && r.symbol === commodity.symbol && typeof r.price === 'number' && !isNaN(r.price))
    .sort((a, b) => {
      const tA = new Date(a.recorded_at || a.created_at || '').getTime();
      const tB = new Date(b.recorded_at || b.created_at || '').getTime();
      return tA - tB;
    });

  const rawRecordsCount = commodityHistory.length;
  const dailySummary = getDailySummaryRecords(commodityHistory);
  const dailyDaysCount = dailySummary.length;
  const hasData = commodityHistory.length > 0;
  const currentFallbackPrice = Number(commodity.price) || 0;

  if (!hasData) {
    return {
      symbol: commodity.symbol,
      name_ar: commodity.name_ar,
      name_en: commodity.name_en,
      sector: commodity.sector,
      unit: commodity.unit || null,
      currentPrice: currentFallbackPrice,
      startPrice: currentFallbackPrice,
      endPrice: currentFallbackPrice,
      minPrice: currentFallbackPrice,
      maxPrice: currentFallbackPrice,
      avgPrice: currentFallbackPrice,
      medianPrice: currentFallbackPrice,
      changeValue: 0,
      changePercent: 0,
      standardDeviation: 0,
      volatilityPercent: 0,
      rangePercent: 0,
      trend: 'stable',
      analysisStatus: 'بيانات غير كافية',
      rawRecordsCount: 0,
      dailyDaysCount: 0,
      upDays: 0,
      downDays: 0,
      stableDays: 0,
      hasData: false,
      anomaliesCount: 0,
      normalizedSeries: [],
    };
  }

  const targetHistory = dailySummary.length > 0 ? dailySummary : commodityHistory;
  const prices = targetHistory.map((h) => Number(h.price));
  const startPrice = prices[0];
  const endPrice = prices[prices.length - 1];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const sumPrice = prices.reduce((acc, p) => acc + p, 0);
  const avgPrice = sumPrice / prices.length;

  const sortedPrices = [...prices].sort((a, b) => a - b);
  const midIndex = Math.floor(sortedPrices.length / 2);
  const medianPrice =
    sortedPrices.length % 2 !== 0
      ? sortedPrices[midIndex]
      : (sortedPrices[midIndex - 1] + sortedPrices[midIndex]) / 2;

  const changeValue = endPrice - startPrice;
  const changePercent = startPrice > 0 ? (changeValue / startPrice) * 100 : 0;
  const standardDeviation = calculateStandardDeviation(prices);
  const volatilityPercent = avgPrice > 0 ? (standardDeviation / avgPrice) * 100 : 0;
  const rangePercent = avgPrice > 0 ? ((maxPrice - minPrice) / avgPrice) * 100 : 0;

  let upDays = 0;
  let downDays = 0;
  let stableDays = 0;
  let anomaliesCount = 0;

  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0.0001) upDays++;
    else if (diff < -0.0001) downDays++;
    else stableDays++;

    if (isPriceAnomaly(prices[i], prices[i - 1], avgPrice, standardDeviation)) {
      anomaliesCount++;
    }
  }

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (changePercent > 0.1) trend = 'up';
  else if (changePercent < -0.1) trend = 'down';

  let analysisStatus = 'استقرار نسبي';
  if (changePercent >= 5) analysisStatus = 'صعود قوي';
  else if (changePercent > 0.5) analysisStatus = 'صعود معتدل';
  else if (changePercent <= -5) analysisStatus = 'هبوط حاد';
  else if (changePercent < -0.5) analysisStatus = 'هبوط معتدل';

  if (rangePercent > 12) {
    analysisStatus += ' مع تذبذب ملحوظ';
  }

  const basePrice = startPrice > 0 ? startPrice : 1;
  const normalizedSeries = targetHistory.map((h) => {
    const dStr = new Date(h.recorded_at || h.created_at || '').toISOString().slice(0, 10);
    return {
      date: dStr,
      normalizedValue: Number(((Number(h.price) / basePrice) * 100).toFixed(2)),
      price: Number(h.price),
    };
  });

  return {
    symbol: commodity.symbol,
    name_ar: commodity.name_ar,
    name_en: commodity.name_en,
    sector: commodity.sector,
    unit: commodity.unit || null,
    currentPrice: endPrice,
    startPrice,
    endPrice,
    minPrice,
    maxPrice,
    avgPrice,
    medianPrice,
    changeValue,
    changePercent,
    standardDeviation,
    volatilityPercent,
    rangePercent,
    trend,
    analysisStatus,
    rawRecordsCount,
    dailyDaysCount,
    upDays,
    downDays,
    stableDays,
    hasData: true,
    anomaliesCount,
    normalizedSeries,
  };
}

export function analyzeSectors(
  analyses: CommodityAnalysisResult[],
  sectorsCatalog: Array<{ id?: string; name_ar: string; name_en?: string; code?: string }>
): SectorAnalysisResult[] {
  const sectorMap = new Map<string, CommodityAnalysisResult[]>();

  (Array.isArray(analyses) ? analyses : []).forEach((item) => {
    const sectorCode = item.sector || 'أخرى';
    if (!sectorMap.has(sectorCode)) {
      sectorMap.set(sectorCode, []);
    }
    sectorMap.get(sectorCode)!.push(item);
  });

  const results: SectorAnalysisResult[] = [];

  sectorMap.forEach((commodities, sectorCode) => {
    const catalogItem = (Array.isArray(sectorsCatalog) ? sectorsCatalog : []).find(
      (s) => s.code === sectorCode || s.name_ar === sectorCode || s.name_en === sectorCode
    );
    const sectorNameAr = catalogItem ? catalogItem.name_ar : sectorCode;

    let totalChange = 0;
    let upCount = 0;
    let downCount = 0;
    let stableCount = 0;
    let topGainer: { symbol: string; name_ar: string; changePercent: number } | null = null;
    let topLoser: { symbol: string; name_ar: string; changePercent: number } | null = null;

    commodities.forEach((c) => {
      totalChange += c.changePercent;
      if (c.trend === 'up') upCount++;
      else if (c.trend === 'down') downCount++;
      else stableCount++;

      if (!topGainer || c.changePercent > topGainer.changePercent) {
        topGainer = { symbol: c.symbol, name_ar: c.name_ar, changePercent: c.changePercent };
      }
      if (!topLoser || c.changePercent < topLoser.changePercent) {
        topLoser = { symbol: c.symbol, name_ar: c.name_ar, changePercent: c.changePercent };
      }
    });

    results.push({
      sector: sectorCode,
      sectorNameAr,
      commoditiesCount: commodities.length,
      avgChangePercent: commodities.length > 0 ? totalChange / commodities.length : 0,
      topGainer,
      topLoser,
      upCount,
      downCount,
      stableCount,
    });
  });

  return results.sort((a, b) => b.avgChangePercent - a.avgChangePercent);
}

export function computeExecutiveStats(
  analyses: CommodityAnalysisResult[]
): ExecutiveReportStats {
  if (!Array.isArray(analyses) || analyses.length === 0) {
    return {
      totalCommodities: 0,
      totalSectors: 0,
      periodDays: 0,
      totalRawRecords: 0,
      overallAvgChangePercent: 0,
      topGainer: null,
      topLoser: null,
      mostVolatile: null,
      upCount: 0,
      downCount: 0,
      stableCount: 0,
      totalAnomalies: 0,
    };
  }

  let totalChange = 0;
  let upCount = 0;
  let downCount = 0;
  let stableCount = 0;
  let totalAnomalies = 0;
  let totalRawRecords = 0;
  let topGainer: CommodityAnalysisResult | null = null;
  let topLoser: CommodityAnalysisResult | null = null;
  let mostVolatile: CommodityAnalysisResult | null = null;
  const sectorsSet = new Set<string>();

  analyses.forEach((a) => {
    sectorsSet.add(a.sector);
    totalChange += a.changePercent;
    totalAnomalies += a.anomaliesCount;
    totalRawRecords += a.rawRecordsCount;

    if (a.trend === 'up') upCount++;
    else if (a.trend === 'down') downCount++;
    else stableCount++;

    if (!topGainer || a.changePercent > topGainer.changePercent) {
      topGainer = a;
    }
    if (!topLoser || a.changePercent < topLoser.changePercent) {
      topLoser = a;
    }
    if (!mostVolatile || a.rangePercent > mostVolatile.rangePercent) {
      mostVolatile = a;
    }
  });

  return {
    totalCommodities: analyses.length,
    totalSectors: sectorsSet.size,
    periodDays: analyses[0]?.dailyDaysCount || 0,
    totalRawRecords,
    overallAvgChangePercent: totalChange / analyses.length,
    topGainer,
    topLoser,
    mostVolatile,
    upCount,
    downCount,
    stableCount,
    totalAnomalies,
  };
}

export function generateAutoExecutiveSummary(
  stats: ExecutiveReportStats,
  sectorResults: SectorAnalysisResult[],
  periodLabel: string
): string {
  if (stats.totalCommodities === 0) {
    return 'لا تتوفر بيانات كافية خلال الفترة المحددة لإعداد الملخص التنفيذي.';
  }

  const directionText =
    stats.overallAvgChangePercent > 0.5
      ? 'اتجاهًا صعوديًا عامًا'
      : stats.overallAvgChangePercent < -0.5
      ? 'اتجاهًا تراجعيًا عامًا'
      : 'استقرارًا نسبيًا متوازنًا';

  const avgChangeFormatted = `${stats.overallAvgChangePercent >= 0 ? '+' : ''}${stats.overallAvgChangePercent.toFixed(2)}%`;

  let summary = `سجلت منصة الأسعار العالمية (GPP) خلال فترة التقرير (${periodLabel}) ${directionText} في متوسط أسعار السلع المشمولة، حيث بلغ متوسط التغير الكلي (${avgChangeFormatted}) عبر ${stats.totalCommodities} سلعة موزعة على ${stats.totalSectors} قطاعات اقتصادية، بإجمالي (${stats.totalRawRecords.toLocaleString('ar-LY')}) سجل تاريخي على مدى (${stats.periodDays}) يومًا تداوليًا.`;

  summary += `\n\nأظهر توزيع حركة الأسعار ارتفاع أسعار ${stats.upCount} سلعة، مقابل تراجع ${stats.downCount} سلعة، واستقرار ${stats.stableCount} سلعة دون تغيير جوهري.`;

  if (stats.topGainer) {
    summary += ` تصدرت سلعة (${stats.topGainer.name_ar}) قائمة الارتفاعات بنسبة (+${stats.topGainer.changePercent.toFixed(2)}%)، في حين سجلت سلعة (${stats.topLoser?.name_ar || '—'}) أعلى نسبة انخفاض بنسبة (${stats.topLoser ? stats.topLoser.changePercent.toFixed(2) : '0'}%).`;
  }

  if (stats.mostVolatile && stats.mostVolatile.rangePercent > 5) {
    summary += ` كما لوحظ تذبذب سعري في سلعة (${stats.mostVolatile.name_ar}) بنطاق تذبذب بلغ (${stats.mostVolatile.rangePercent.toFixed(2)}%) وانحراف معياري قدره (${stats.mostVolatile.standardDeviation.toFixed(2)}).`;
  }

  if (sectorResults.length > 0) {
    const bestSector = sectorResults[0];
    const worstSector = sectorResults[sectorResults.length - 1];
    summary += `\n\nعلى الصعيد القطاعي، قاد قطاع (${bestSector.sectorNameAr}) مؤشرات الأداء بمتوسط تغير (${bestSector.avgChangePercent >= 0 ? '+' : ''}${bestSector.avgChangePercent.toFixed(2)}%)، بينما سجل قطاع (${worstSector.sectorNameAr}) أداء بمتوسط (${worstSector.avgChangePercent >= 0 ? '+' : ''}${worstSector.avgChangePercent.toFixed(2)}%).`;
  }

  if (stats.totalAnomalies > 0) {
    summary += ` رصد النظام (${stats.totalAnomalies}) قفزة سعرية استثنائية (تغير حاد أو انحراف إحصائي) تم تمييزها للتدقيق الرقابي.`;
  }

  return summary;
}
