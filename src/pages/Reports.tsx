import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  FileText, 
  Download, 
  Image as ImageIcon, 
  RotateCcw, 
  AlertCircle, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Layers, 
  AlertTriangle, 
  Activity,
  LayoutDashboard,
  Sparkles,
  BarChart3,
  Printer,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { CommodityCatalog, SectorCatalog, NewsArticle, Analysis } from '../types';
import { formatAdminDate } from '../utils/dateUtils';
import {
  analyzeCommodity,
  analyzeSectors,
  computeExecutiveStats,
  getDailySummaryRecords,
  generateAutoExecutiveSummary,
  type CommodityAnalysisResult,
  type SectorAnalysisResult,
  type ExecutiveReportStats
} from '../utils/economicAnalytics';
import { EconomicKpiCards } from '../components/reports/EconomicKpiCards';
import { SectorHeatmap } from '../components/reports/SectorHeatmap';
import { Base100ComparisonChart } from '../components/reports/Base100ComparisonChart';
import { TopMoversChart } from '../components/reports/TopMoversChart';
import { DashboardExportToolbar, type DashboardExportScope } from '../components/reports/DashboardExportToolbar';
import { DashboardPrintTemplate } from '../components/reports/DashboardPrintTemplate';




const ReportLogo = ({ className, alt = "Libya Trade Network Logo", url }: { className?: string, alt?: string, url: string }) => {
  const [hasError, setHasError] = React.useState(false);
  const [useFallback, setUseFallback] = React.useState(false);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center font-bold text-[#1e3a8a] ${className || ''}`}>
        Libya Trade Network
      </div>
    );
  }

  return (
    <img
      src={useFallback ? '/logo-ltn.png' : url}
      alt={alt}
      className={className}
      crossOrigin="anonymous"
      onError={() => {
        if (!useFallback) {
          setUseFallback(true);
        } else {
          setHasError(true);
        }
      }}
    />
  );
};

const Reports: React.FC = () => {
  const { adminUser } = useAuthStore();
  
  if (adminUser?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-dark-card rounded-xl shadow-sm">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">ليس لديك صلاحية الوصول إلى نظام التقارير</h2>
      </div>
    );
  }

  const reportRef = useRef<HTMLDivElement>(null);
  
  // State for catalogs and settings
  const [sectors, setSectors] = useState<SectorCatalog[]>([]);
  const [catalog, setCatalog] = useState<CommodityCatalog[]>([]);
  const [logoUrl, setLogoUrl] = useState<string>('https://i.postimg.cc/zfx5Psf9/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png');
  
  // Report Options
  const [reportType, setReportType] = useState('general');
  const [tableType, setTableType] = useState('detailed');
  const [sectorFilter, setSectorFilter] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('7');
  const [detailLevel, setDetailLevel] = useState('brief');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportMonth, setReportMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [monthlyScope, setMonthlyScope] = useState('general');
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([]);
  const [sectorCommodities, setSectorCommodities] = useState<any[]>([]);
  const [sectorCommoditySearch, setSectorCommoditySearch] = useState('');
  
  // Content Options
  const [includeNews, setIncludeNews] = useState(true);
  const [includeAnalyses, setIncludeAnalyses] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeTables, setIncludeTables] = useState(true);
  const [includeDailyTable, setIncludeDailyTable] = useState(false);
  const [executiveSummaryText, setExecutiveSummaryText] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Data State
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [chartMode, setChartMode] = useState<'absolute' | 'normalized'>('absolute');
  const [totalHistoryRows, setTotalHistoryRows] = useState<number>(0);
  const [fetchStatusMessage, setFetchStatusMessage] = useState<string>('');
  const [activeMainView, setActiveMainView] = useState<'bi_dashboard' | 'detailed_document'>('bi_dashboard');

  // Dashboard Specific Refs for Selective and Full Export
  const dashboardRef = useRef<HTMLDivElement>(null);
  const kpiCardsRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const base100Ref = useRef<HTMLDivElement>(null);
  const topMoversRef = useRef<HTMLDivElement>(null);
  const printPage1Ref = useRef<HTMLDivElement>(null);
  const printPage2Ref = useRef<HTMLDivElement>(null);
  const printPage3Ref = useRef<HTMLDivElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Dashboard Export & Print State
  const [dashboardExportScope, setDashboardExportScope] = useState<DashboardExportScope>('all');
  const [exportingDashboard, setExportingDashboard] = useState(false);
  const [dashboardExportMessage, setDashboardExportMessage] = useState<string>('');
  const [dashboardSuccessMessage, setDashboardSuccessMessage] = useState<string>('');

  // Settings
  const [logoLeft, setLogoLeft] = useState('https://i.postimg.cc/tCPyyJnm/58f6eba6-9dd7-45e2-8434-6730f9b4412c-removebg-preview.png');
  const [logoMiddle, setLogoMiddle] = useState('https://i.postimg.cc/zfx5Psf9/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png');
  const [logoRight, setLogoRight] = useState('https://i.postimg.cc/j2mzhLdn/557538f9788c4d0bacb9518b4e9eaa16.webp');

  useEffect(() => {
    fetchCatalogs();
  }, []);

  useEffect(() => {
    if (sectorFilter && reportType === 'sector') {
      const fetchSectorCommodities = async () => {
        try {
          const { data } = await supabase
            .from('commodities')
            .select('symbol, name_ar, name_en, sector, unit, source')
            .eq('sector', sectorFilter)
            .eq('is_visible', true)
            .eq('status', 'active')
            .order('name_ar', { ascending: true });
            
          if (data) {
            setSectorCommodities(data);
            setSelectedCommodities([]);
          }
        } catch (err) {
          console.error('Error fetching sector commodities:', err);
        }
      };
      fetchSectorCommodities();
    } else {
      setSectorCommodities([]);
      setSelectedCommodities([]);
    }
  }, [sectorFilter, reportType]);

  const fetchCatalogs = async () => {
    try {
      const [sectorsRes, catalogRes, settingsRes] = await Promise.all([
        supabase.from('sectors_catalog').select('*').order('name_ar'),
        supabase.from('commodity_catalog').select('*').order('name_ar'),
        supabase.from('platform_settings').select('key, value').in('key', ['report_logo_left', 'report_logo_middle', 'report_logo_right', 'logo_url'])
      ]);
      if (sectorsRes.data) setSectors(sectorsRes.data);
      if (catalogRes.data) setCatalog(catalogRes.data);
      if (settingsRes.data) {
        const settingsMap = settingsRes.data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);
        if (settingsMap.report_logo_left) setLogoLeft(settingsMap.report_logo_left);
        if (settingsMap.report_logo_middle) setLogoMiddle(settingsMap.report_logo_middle);
        if (settingsMap.report_logo_right) setLogoRight(settingsMap.report_logo_right);
        if (settingsMap.logo_url) setLogoUrl(settingsMap.logo_url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async () => {
    if ((reportType === 'sector' || ((reportType === 'monthly' || reportType === 'annual') && monthlyScope === 'sector')) && sectorFilter && selectedCommodities.length === 0) {
      alert('يرجى اختيار سلعة واحدة على الأقل من القطاع لإنشاء التقرير');
      return;
    }

    setLoading(true);
    try {
      // Gather base data
      let pricesQuery = supabase.from('commodities').select('*');
      if (sectorFilter && (reportType === 'sector' || ((reportType === 'monthly' || reportType === 'annual') && monthlyScope === 'sector'))) {
        pricesQuery = pricesQuery.eq('sector', sectorFilter).in('symbol', selectedCommodities);
      }
      if (symbolFilter && (reportType === 'commodity' || reportType === 'detailed_commodity' || ((reportType === 'monthly' || reportType === 'annual') && monthlyScope === 'commodity'))) {
        pricesQuery = pricesQuery.eq('symbol', symbolFilter);
      }
      const { data: prices } = await pricesQuery;

            // Probe for recorded_at column
      let dateColumn = "recorded_at";
      const { error: probeError } = await supabase.from("commodity_price_history").select("recorded_at").limit(1);
      if (probeError) {
        dateColumn = "created_at";
      }

      // Date filtering bounds
      const now = new Date();
      let actualStartDate;
      let actualEndDate;

      if (reportType === "annual") {
        actualStartDate = `${reportYear}-01-01T00:00:00.000Z`;
        actualEndDate = `${reportYear}-12-31T23:59:59.999Z`;
      } else if (reportType === "monthly") {
        actualStartDate = `${reportYear}-${reportMonth}-01T00:00:00.000Z`;
        const lastDay = new Date(Date.UTC(Number(reportYear), Number(reportMonth), 0)).getUTCDate();
        actualEndDate = `${reportYear}-${reportMonth}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`;
      } else if (periodFilter !== "all" && periodFilter !== "custom") {
        const from = new Date();
        from.setDate(now.getDate() - parseInt(periodFilter));
        actualStartDate = from.toISOString();
        actualEndDate = now.toISOString();
      } else if (periodFilter === "custom") {
        if (fromDate) {
          actualStartDate = `${fromDate}T00:00:00.000Z`;
        }
        if (toDate) {
          actualEndDate = `${toDate}T23:59:59.999Z`;
        }
      }

      // Chunked pagination loop to retrieve all records without 1000-row cutoff
      const CHUNK_SIZE = 1000;
      let fromRow = 0;
      let allHistory = [];
      let hasMore = true;
      setFetchStatusMessage("جاري جلب السجلات التاريخية...");

      while (hasMore) {
        let chunkQuery = supabase
          .from("commodity_price_history")
          .select("symbol, price, high, low, source, recorded_at, created_at");

        if (sectorFilter && (reportType === "sector" || ((reportType === "monthly" || reportType === "annual") && monthlyScope === "sector"))) {
          chunkQuery = chunkQuery.in("symbol", selectedCommodities);
        }
        if (symbolFilter && (reportType === "commodity" || reportType === "detailed_commodity" || ((reportType === "monthly" || reportType === "annual") && monthlyScope === "commodity"))) {
          chunkQuery = chunkQuery.eq("symbol", symbolFilter);
        }

        if (actualStartDate) {
          chunkQuery = chunkQuery.gte(dateColumn, actualStartDate);
        }
        if (actualEndDate) {
          chunkQuery = chunkQuery.lte(dateColumn, actualEndDate);
        }

        // Strict deterministic ordering to guarantee chunk integrity without skipped or duplicate rows
        chunkQuery = chunkQuery.order(dateColumn, { ascending: true }).range(fromRow, fromRow + CHUNK_SIZE - 1);

        const { data: chunk, error: chunkError } = await chunkQuery;
        if (chunkError) {
          console.error("History fetch chunk error at offset", fromRow, chunkError);
          throw chunkError;
        }

        if (chunk && chunk.length > 0) {
          allHistory = allHistory.concat(chunk);
          if (chunk.length < CHUNK_SIZE) {
            hasMore = false;
          } else {
            fromRow += CHUNK_SIZE;
            setFetchStatusMessage(`تم جلب ${allHistory.length} سجل...`);
          }
        } else {
          hasMore = false;
        }
      }

      console.log(`Successfully retrieved ${allHistory.length} historical records via pagination.`);
      setTotalHistoryRows(allHistory.length);
      const history = allHistory;

      const periodHistoryData = history || [];
      const startDate = actualStartDate;
      const endDate = actualEndDate;
      console.log('Period history rows:', periodHistoryData.length);
      console.log('Start date:', startDate);
      console.log('End date:', endDate);
      console.log('Date column:', dateColumn);

      let news = [];
      let analyses = [];
      if (includeNews) {
        const { data: n } = await supabase.from('news').select('*').eq('is_published', true).order('published_at', { ascending: false }).limit(5);
        news = n || [];
      }
      if (includeAnalyses) {
        const { data: a } = await supabase.from('analyses').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(5);
        analyses = a || [];
      }

            // Ensure recorded_at exists on all history rows for frontend usage
      history?.forEach((h: any) => {
        h.recorded_at = h.recorded_at || h.created_at;
      });
      setReportStartDate(actualStartDate || '');
      setReportEndDate(actualEndDate || '');
      setReportData({ prices, history, news, analyses });
      setIsGenerated(true);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء جلب بيانات التقرير');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setIsGenerated(false);
    setReportData(null);
    setExecutiveSummaryText('');
  };

  const downloadReportPDF = async () => {
    if (!reportRef.current) {
      alert('لا يوجد تقرير جاهز للتحميل');
      return;
    }

    if (!reportData || loading) {
      alert('يرجى إنشاء التقرير أولًا');
      return;
    }

    try {
      setExporting(true);
      if (activeMainView !== 'detailed_document') {
        setActiveMainView('detailed_document');
        await new Promise(resolve => setTimeout(resolve, 400));
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const pages = reportRef.current.querySelectorAll('.report-page');
      if (pages.length === 0) {
        throw new Error('No pages found');
      }

      const pdf = new jsPDF(
        pages[0].getAttribute('data-orientation') === 'landscape' ? 'l' : 'p', 
        'mm', 
        'a4'
      );

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const isLandscape = page.getAttribute('data-orientation') === 'landscape';

        const canvas = await html2canvas(page, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: false,
          logging: false,
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pageWidth = isLandscape ? 297 : 210;
        const pageHeight = isLandscape ? 210 : 297;

        if (i > 0) {
          pdf.addPage('a4', isLandscape ? 'l' : 'p');
        }

        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      }

      let fileName = `report-${new Date().toISOString().slice(0, 10)}.pdf`;
      if (reportType === 'detailed_commodity' && symbolFilter) {
        fileName = `commodity-report-${symbolFilter}-${new Date().toISOString().slice(0, 10)}.pdf`;
      }
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('حدث خطأ أثناء تحميل ملف PDF');
    } finally {
      setExporting(false);
    }
  };

  const downloadReportPNG = async () => {
    if (!reportRef.current) {
      alert('لا يوجد تقرير جاهز للتحميل');
      return;
    }

    if (!reportData || loading) {
      alert('يرجى إنشاء التقرير أولًا');
      return;
    }

    try {
      setExporting(true);
      if (activeMainView !== 'detailed_document') {
        setActiveMainView('detailed_document');
        await new Promise(resolve => setTimeout(resolve, 400));
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      });

      const image = canvas.toDataURL('image/png', 1.0);

      const link = document.createElement('a');
      link.href = image;
      
      let fileName = `report-${new Date().toISOString().slice(0, 10)}.png`;
      if (reportType === 'detailed_commodity' && symbolFilter) {
        fileName = `commodity-report-${symbolFilter}-${new Date().toISOString().slice(0, 10)}.png`;
      }
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('PNG export error:', error);
      alert('حدث خطأ أثناء تحميل صورة التقرير');
    } finally {
      setExporting(false);
    }
  };

  const downloadReportExcel = () => {
    if (!reportData || !reportData.prices) {
      alert("يرجى إنشاء التقرير أولاً");
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Commodity Metrics
      const commodityRows = reportData.prices.map((p: any) => {
        const a = getCommodityAnalysis(p.symbol);
        return {
          "الرمز": p.symbol,
          "اسم السلعة": p.name_ar,
          "القطاع": p.sector,
          "الوحدة": p.unit || "—",
          "السعر الأول": a?.firstPrice ?? p.price,
          "السعر الأخير": a?.lastPrice ?? p.price,
          "التغير": a?.change_value?.toFixed(2) ?? "0.00",
          "نسبة التغير %": a?.period_change_percent?.toFixed(2) ?? "0.00",
          "أعلى سعر": a?.maxPrice ?? p.price,
          "أدنى سعر": a?.minPrice ?? p.price,
          "المتوسط": a?.averagePrice?.toFixed(2) ?? p.price,
          "الانحراف المعياري": a?.standardDeviation?.toFixed(2) ?? "0.00",
          "نسبة التذبذب %": a?.volatility_percent?.toFixed(2) ?? "0.00",
          "الاتجاه": a?.trend === "up" ? "صعود" : a?.trend === "down" ? "هبوط" : "استقرار",
          "حالة التحليل": a?.analysis_status ?? "—",
          "عدد الأيام": a?.dailyDaysCount ?? 0,
          "السجلات": a?.rawRecordsCount ?? 0,
          "قفزات استثنائية": a?.anomaliesCount ?? 0
        };
      });
      const wsCommodities = XLSX.utils.json_to_sheet(commodityRows);
      XLSX.utils.book_append_sheet(wb, wsCommodities, "مؤشرات السلع");

      // Sheet 2: Historical Records
      if (reportData.history && reportData.history.length > 0) {
        const histRows = reportData.history.map((h: any) => ({
          "الرمز": h.symbol,
          "السعر": h.price,
          "أعلى": h.high ?? "—",
          "أدنى": h.low ?? "—",
          "المصدر": h.source ?? "—",
          "التاريخ": h.recorded_at ? h.recorded_at.slice(0, 19).replace("T", " ") : "—"
        }));
        const wsHist = XLSX.utils.json_to_sheet(histRows);
        XLSX.utils.book_append_sheet(wb, wsHist, "الأرشيف التاريخي");
      }

      const fileName = `GPP-Economic-Report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Excel export error:", err);
      alert("حدث خطأ أثناء تصدير ملف Excel");
    }
  };

  
  const getCommodityAnalysis = (symbol: string) => {
    if (!reportData || !reportData.history || !reportData.prices) return null;
    const commodityInfo = reportData.prices.find((p: any) => p.symbol === symbol);
    if (!commodityInfo) return null;

    const analysis = analyzeCommodity(commodityInfo, reportData.history);

    return {
      symbol: analysis.symbol,
      name_ar: analysis.name_ar,
      name_en: analysis.name_en,
      sector: analysis.sector,
      unit: analysis.unit,
      price: analysis.currentPrice,
      previous_price: analysis.startPrice,
      change_value: analysis.changeValue,
      change_percent: analysis.changePercent,
      trend: analysis.trend,
      source: commodityInfo.source,
      updated_at: commodityInfo.updated_at,
      maxPrice: analysis.maxPrice,
      minPrice: analysis.minPrice,
      averagePrice: analysis.avgPrice,
      firstPrice: analysis.startPrice,
      lastPrice: analysis.endPrice,
      period_change_percent: analysis.changePercent,
      price_range: analysis.maxPrice - analysis.minPrice,
      volatility_percent: analysis.rangePercent,
      standardDeviation: analysis.standardDeviation,
      medianPrice: analysis.medianPrice,
      analysis_status: analysis.analysisStatus,
      rawRecordsCount: analysis.rawRecordsCount,
      dailyDaysCount: analysis.dailyDaysCount,
      anomaliesCount: analysis.anomaliesCount,
      upDays: analysis.upDays,
      downDays: analysis.downDays,
      stableDays: analysis.stableDays,
      hasData: analysis.hasData,
      normalizedSeries: analysis.normalizedSeries
    };
  };

  const getAdvancedSummaryStats = (pricesArray?: any[]) => {
    if (!reportData || !reportData.prices) return null;
    const targetPrices = pricesArray || reportData.prices;
    
    let upCount = 0;
    let downCount = 0;
    let stableCount = 0;
    let maxInc = -Infinity;
    let maxDec = Infinity;
    let totalCp = 0;
    let cpCount = 0;
    let maxVol = -Infinity;
    
    let topGainer = null;
    let topLoser = null;
    let mostVolatile = null;

    targetPrices.forEach((p: any) => {
      const analysis = getCommodityAnalysis(p.symbol);
      if (!analysis) return;

      const cp = analysis.period_change_percent;
      if (cp > 0) { 
        upCount++; 
        if (cp > maxInc) { maxInc = cp; topGainer = analysis; }
      } else if (cp < 0) { 
        downCount++; 
        if (cp < maxDec) { maxDec = cp; topLoser = analysis; }
      } else { 
        stableCount++; 
      }
      
      if (!isNaN(cp)) {
        totalCp += cp;
        cpCount++;
      }

      if (analysis.volatility_percent > maxVol) {
        maxVol = analysis.volatility_percent;
        mostVolatile = analysis;
      }
    });

    const avgCp = cpCount > 0 ? totalCp / cpCount : 0;

    return {
      totalCommodities: targetPrices.length,
      upCount,
      downCount,
      stableCount,
      avgCp,
      topGainer,
      topLoser,
      mostVolatile,
      maxInc: maxInc === -Infinity ? 0 : maxInc,
      maxDec: maxDec === Infinity ? 0 : maxDec
    };
  };

  const getSummaryStats = () => {
    if (!reportData || !reportData.prices) return null;
    const prices = reportData.prices;
    let upCount = 0;
    let downCount = 0;
    let stableCount = 0;
    let maxInc = 0;
    let maxDec = 0;
    let totalCp = 0;
    let cpCount = 0;
    const sectorsSet = new Set();
    
    prices.forEach((p: any) => {
      sectorsSet.add(p.sector);
      let cp = p.change_percent;
      if (cp === null || cp === undefined) {
        if (p.previous_price && p.previous_price > 0) {
          cp = ((p.price - p.previous_price) / p.previous_price) * 100;
        } else {
          cp = 0;
        }
      }
      
      if (cp > 0) { upCount++; if (cp > maxInc) maxInc = cp; }
      else if (cp < 0) { downCount++; if (cp < maxDec) maxDec = cp; }
      else { stableCount++; }
      
      if (cp !== null && cp !== undefined && !isNaN(cp)) {
        totalCp += cp;
        cpCount++;
      }
    });

    const avgCp = cpCount > 0 ? totalCp / cpCount : 0;

    return {
      totalCommodities: prices.length,
      totalSectors: sectorsSet.size,
      maxInc,
      maxDec,
      avgCp,
      upCount,
      downCount,
      stableCount
    };
  };

  // Memoized full economic analysis results for all available commodities
  const commoditiesAnalyticsList = React.useMemo<CommodityAnalysisResult[]>(() => {
    if (!reportData || !reportData.prices || !reportData.history) return [];
    return reportData.prices.map((p: any) => analyzeCommodity(p, reportData.history));
  }, [reportData]);

  // Memoized sector analyses
  const sectorAnalyticsList = React.useMemo<SectorAnalysisResult[]>(() => {
    if (!commoditiesAnalyticsList.length || !sectors.length) return [];
    return analyzeSectors(commoditiesAnalyticsList, sectors);
  }, [commoditiesAnalyticsList, sectors]);

  // Selected period human-readable label
  const periodLabelText = React.useMemo(() => {
    if (reportType === 'annual') return `التقرير السنوي (${reportYear})`;
    if (reportType === 'monthly') return `التقرير الشهري (${reportMonth}/${reportYear})`;
    if (periodFilter === 'all') return 'كافة السجلات التاريخية';
    if (periodFilter === 'custom') return `الفترة من ${fromDate || 'البداية'} إلى ${toDate || 'اليوم'}`;
    return `آخر ${periodFilter} أيام`;
  }, [reportType, reportYear, reportMonth, periodFilter, fromDate, toDate]);

  // Memoized executive statistics
  const executiveStats = React.useMemo<ExecutiveReportStats | null>(() => {
    if (!commoditiesAnalyticsList.length) return null;
    return computeExecutiveStats(commoditiesAnalyticsList);
  }, [commoditiesAnalyticsList]);

  // Auto-generated Executive Summary
  const autoExecutiveSummaryText = React.useMemo<string>(() => {
    if (!executiveStats || !sectorAnalyticsList.length) return '';
    return generateAutoExecutiveSummary(executiveStats, sectorAnalyticsList, periodLabelText);
  }, [executiveStats, sectorAnalyticsList, periodLabelText]);

  // --- Power BI Dashboard Export & Print Handlers ---

  const handleDashboardPDF = async () => {
    if (!reportData || !executiveStats) {
      alert('يرجى إنشاء التقرير أولاً');
      return;
    }

    try {
      setExportingDashboard(true);
      setDashboardExportMessage('جاري تجهيز وتنسيق مستند PDF الاحترافي للوحة التحليل...');

      // 1. Ensure all custom Cairo font weights are fully loaded and rendered
      if (document.fonts) {
        await Promise.all([
          document.fonts.load('bold 24px Cairo'),
          document.fonts.load('900 24px Cairo'),
          document.fonts.load('800 24px Cairo'),
          document.fonts.load('bold 16px Cairo'),
          document.fonts.load('normal 12px Cairo'),
          document.fonts.load('bold 11px Cairo'),
          document.fonts.ready
        ]).catch(() => {});
      }

      // 2. Temporarily move print container into positive coordinates to guarantee perfect font metrics & text shaping
      const container = printContainerRef.current;
      if (container) {
        container.style.position = 'fixed';
        container.style.left = '0px';
        container.style.top = '0px';
        container.style.zIndex = '99998';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
        container.style.display = 'block';
      }

      // Reflow pause to let browser calculate exact ligatures and layout bounds
      await new Promise(r => setTimeout(r, 120));

      const pdf = new jsPDF('l', 'mm', 'a4'); // 297mm x 210mm Landscape

      if (dashboardExportScope === 'all') {
        const pages = [
          { ref: printPage1Ref, title: 'الصفحة 1: الملخص التنفيذي والمؤشرات الرئيسية' },
          { ref: printPage2Ref, title: 'الصفحة 2: الخريطة الحرارية وأداء القطاعات' },
          { ref: printPage3Ref, title: 'الصفحة 3: المقارنة المعيارية للأسعار والسلع الأكثر تحركاً' }
        ];

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          if (!page.ref.current) continue;

          setDashboardExportMessage(`جاري معالجة ${page.title}...`);

          const canvas = await html2canvas(page.ref.current, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: true,
            logging: false,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 1123,
            windowHeight: 794
          });

          const imgData = canvas.toDataURL('image/png', 1.0);

          if (i > 0) {
            pdf.addPage('a4', 'l');
          }

          // Full page A4 landscape (297mm x 210mm) mapping 1:1 with crisp HTML-rendered typography and logos
          pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
        }

      } else {
        // Selective scope export
        let targetRef: React.RefObject<HTMLDivElement | null> | null = null;
        let titleScope = '';

        if (dashboardExportScope === 'kpis') {
          targetRef = printPage1Ref;
          titleScope = 'الملخص التنفيذي والمؤشرات';
        } else if (dashboardExportScope === 'heatmap') {
          targetRef = printPage2Ref;
          titleScope = 'الخريطة الحرارية وأداء القطاعات';
        } else if (dashboardExportScope === 'base100' || dashboardExportScope === 'topmovers') {
          targetRef = printPage3Ref;
          titleScope = dashboardExportScope === 'base100' ? 'المقارنة المعيارية للأسعار (Base-100)' : 'السلع الأكثر ارتفاعاً وانخفاضاً';
        }

        if (!targetRef || !targetRef.current) {
          throw new Error('Target element not found');
        }

        setDashboardExportMessage(`جاري معالجة ${titleScope}...`);
        const canvas = await html2canvas(targetRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: true,
          logging: false,
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1123,
          windowHeight: 794
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
      }

      const fileName = `GPP-Economic-Dashboard-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
      setDashboardSuccessMessage('تم تحميل ملف PDF الاحترافي للوحة التحليل بنجاح!');
      setTimeout(() => setDashboardSuccessMessage(''), 3500);

    } catch (err) {
      console.error('Dashboard PDF export error:', err);
      alert('حدث خطأ أثناء تصدير ملف PDF للوحة');
    } finally {
      const container = printContainerRef.current;
      if (container) {
        container.style.position = 'absolute';
        container.style.left = '-99999px';
        container.style.top = '0px';
        container.style.zIndex = '-1000';
      }
      setExportingDashboard(false);
      setDashboardExportMessage('');
    }
  };

  const handleDashboardPNG = async () => {
    if (!reportData) {
      alert('يرجى إنشاء التقرير أولاً');
      return;
    }

    try {
      setExportingDashboard(true);
      setDashboardExportMessage('جاري التقاط ومعالجة صورة PNG عالية الدقة...');

      let targetEl: HTMLElement | null = null;
      let filenamePrefix = 'GPP-Dashboard';

      if (dashboardExportScope === 'all') {
        targetEl = dashboardRef.current;
        filenamePrefix = 'GPP-Full-Dashboard';
      } else if (dashboardExportScope === 'kpis') {
        targetEl = kpiCardsRef.current;
        filenamePrefix = 'GPP-KPI-Cards';
      } else if (dashboardExportScope === 'heatmap') {
        targetEl = heatmapRef.current;
        filenamePrefix = 'GPP-Sector-Heatmap';
      } else if (dashboardExportScope === 'base100') {
        targetEl = base100Ref.current;
        filenamePrefix = 'GPP-Base100-Chart';
      } else if (dashboardExportScope === 'topmovers') {
        targetEl = topMoversRef.current;
        filenamePrefix = 'GPP-TopMovers-Chart';
      }

      if (!targetEl) throw new Error('Target element not found');

      const canvas = await html2canvas(targetEl, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: targetEl.scrollWidth,
        windowHeight: targetEl.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();

      setDashboardSuccessMessage('تم تحميل صورة PNG بنجاح!');
      setTimeout(() => setDashboardSuccessMessage(''), 3500);

    } catch (err) {
      console.error('Dashboard PNG export error:', err);
      alert('حدث خطأ أثناء تحميل صورة PNG');
    } finally {
      setExportingDashboard(false);
      setDashboardExportMessage('');
    }
  };

  const handleDashboardExcel = async () => {
    if (!reportData || !executiveStats) {
      alert('يرجى إنشاء التقرير أولاً');
      return;
    }

    try {
      setExportingDashboard(true);
      setDashboardExportMessage('جاري تجميع وحفظ مصنف Excel بـ 6 أوراق عمل...');

      const wb = XLSX.utils.book_new();

      // Sheet 1: ملخص المؤشرات الاقتصادية
      const kpiRows = [
        { "المؤشر الاقتصادي": "نطاق التقرير والفترة", "القيمة": periodLabelText, "الوحدة / الملاحظات": "الفترة المحددة في لوحة التحليل" },
        { "المؤشر الاقتصادي": "تاريخ البداية", "القيمة": reportStartDate || "غير محدد", "الوحدة / الملاحظات": "تاريخ أول سجل معتمد" },
        { "المؤشر الاقتصادي": "تاريخ النهاية", "القيمة": reportEndDate || "غير محدد", "الوحدة / الملاحظات": "تاريخ آخر قيد رصد" },
        { "المؤشر الاقتصادي": "إجمالي السلع المشمولة", "القيمة": executiveStats.totalCommodities, "الوحدة / الملاحظات": "سلعة نشطة" },
        { "المؤشر الاقتصادي": "القطاعات الاقتصادية النشطة", "القيمة": executiveStats.totalSectors, "الوحدة / الملاحظات": "قطاعات" },
        { "المؤشر الاقتصادي": "إجمالي السجلات المسترجعة", "القيمة": executiveStats.totalRawRecords, "الوحدة / الملاحظات": "سجل تاريخي مكتمل عبر Pagination" },
        { "المؤشر الاقتصادي": "عدد أيام التداول والرصد", "القيمة": executiveStats.periodDays, "الوحدة / الملاحظات": "أيام" },
        { "المؤشر الاقتصادي": "متوسط عائد سلة السلع الإجمالي", "القيمة": `${executiveStats.overallAvgChangePercent > 0 ? '+' : ''}${executiveStats.overallAvgChangePercent.toFixed(2)}%`, "الوحدة / الملاحظات": "متوسط موزون نسبي" },
        { "المؤشر الاقتصادي": "عدد السلع المرتفعة (+)", "القيمة": executiveStats.upCount, "الوحدة / الملاحظات": "سلعة" },
        { "المؤشر الاقتصادي": "عدد السلع المنخفضة (-)", "القيمة": executiveStats.downCount, "الوحدة / الملاحظات": "سلعة" },
        { "المؤشر الاقتصادي": "عدد السلع المستقرة (=)", "القيمة": executiveStats.stableCount, "الوحدة / الملاحظات": "سلعة" },
        { "المؤشر الاقتصادي": "السلعة الأكثر صعوداً", "القيمة": `${executiveStats.topGainer?.name_ar || '—'} (${executiveStats.topGainer?.symbol || '—'})`, "الوحدة / الملاحظات": `+${executiveStats.topGainer?.changePercent.toFixed(2) || 0}%` },
        { "المؤشر الاقتصادي": "السلعة الأكثر هبوطاً", "القيمة": `${executiveStats.topLoser?.name_ar || '—'} (${executiveStats.topLoser?.symbol || '—'})`, "الوحدة / الملاحظات": `${executiveStats.topLoser?.changePercent.toFixed(2) || 0}%` },
        { "المؤشر الاقتصادي": "تنبيهات جودة البيانات وشذوذ الأسعار", "القيمة": executiveStats.totalAnomalies, "الوحدة / الملاحظات": "سجلات تاريخية تبتعد إحصائياً بأكثر من 2.5 انحراف معياري" },
        { "المؤشر الاقتصادي": "الملخص التنفيذي الاقتصادي", "القيمة": autoExecutiveSummaryText || "—", "الوحدة / الملاحظات": "صياغة تحليلية آلية" }
      ];
      const wsKpi = XLSX.utils.json_to_sheet(kpiRows);
      XLSX.utils.book_append_sheet(wb, wsKpi, "ملخص المؤشرات الاقتصادية");

      // Sheet 2: أداء القطاعات
      const sectorRows = sectorAnalyticsList.map(s => ({
        "رمز القطاع": s.sector,
        "اسم القطاع بالعربية": s.sectorNameAr,
        "عدد السلع المشمولة": s.commoditiesCount,
        "متوسط نسبة التغير %": Number(s.avgChangePercent.toFixed(2)),
        "أفضل سلعة صعوداً": s.topGainer ? `${s.topGainer.name_ar} (${s.topGainer.symbol})` : "—",
        "نسبة صعود الأفضل %": s.topGainer ? Number(s.topGainer.changePercent.toFixed(2)) : 0,
        "أدنى سلعة هبوطاً": s.topLoser ? `${s.topLoser.name_ar} (${s.topLoser.symbol})` : "—",
        "نسبة هبوط الأدنى %": s.topLoser ? Number(s.topLoser.changePercent.toFixed(2)) : 0,
        "عدد السلع الصاعدة": s.upCount,
        "عدد السلع الهابطة": s.downCount,
        "عدد السلع المستقرة": s.stableCount
      }));
      const wsSectors = XLSX.utils.json_to_sheet(sectorRows);
      XLSX.utils.book_append_sheet(wb, wsSectors, "أداء القطاعات");

      // Sheet 3: السلع الأعلى تحركاً (Top Movers)
      const sortedGainers = [...commoditiesAnalyticsList].filter(c => c.hasData && c.changePercent > 0).sort((a,b) => b.changePercent - a.changePercent);
      const sortedLosers = [...commoditiesAnalyticsList].filter(c => c.hasData && c.changePercent < 0).sort((a,b) => a.changePercent - b.changePercent);
      const moversRows = [...sortedGainers, ...sortedLosers].map(c => ({
        "التصنيف": c.changePercent >= 0 ? "صاعد (+)" : "هابط (-)",
        "رمز السلعة": c.symbol,
        "اسم السلعة": c.name_ar,
        "الاسم بالإنجليزية": c.name_en,
        "القطاع": c.sector,
        "سعر البداية": c.startPrice,
        "السعر الأخير": c.currentPrice,
        "قيمة التغير": Number(c.changeValue.toFixed(2)),
        "نسبة التغير %": Number(c.changePercent.toFixed(2)),
        "وحدة القياس": c.symbol === 'WHEAT_US' ? 'سنت / بوشل' : (c.unit || '—'),
        "أعلى سعر": c.maxPrice,
        "أدنى سعر": c.minPrice,
        "المتوسط الحسابي": Number(c.avgPrice.toFixed(2)),
        "الانحراف المعياري": Number(c.standardDeviation.toFixed(2)),
        "نسبة التذبذب %": Number(c.volatilityPercent.toFixed(2)),
        "اتجاه الحركة": c.trend === 'up' ? 'صعود' : c.trend === 'down' ? 'هبوط' : 'استقرار'
      }));
      const wsMovers = XLSX.utils.json_to_sheet(moversRows);
      XLSX.utils.book_append_sheet(wb, wsMovers, "السلع الأعلى تحركاً");

      // Sheet 4: بيانات المقارنة المعيارية Base-100
      const allDatesSet = new Set<string>();
      commoditiesAnalyticsList.forEach(c => {
        c.normalizedSeries?.forEach(pt => allDatesSet.add(pt.date));
      });
      const sortedTimeline = Array.from(allDatesSet).sort();

      const base100Rows = sortedTimeline.map(dateKey => {
        const row: Record<string, any> = { "التاريخ": dateKey };
        commoditiesAnalyticsList.forEach(c => {
          const pt = c.normalizedSeries?.find(p => p.date === dateKey);
          row[`${c.name_ar} (${c.symbol}) - Base100`] = pt ? Number(pt.normalizedValue.toFixed(2)) : "—";
          row[`${c.name_ar} (${c.symbol}) - السعر`] = pt ? pt.price : "—";
        });
        return row;
      });
      const wsBase100 = XLSX.utils.json_to_sheet(base100Rows);
      XLSX.utils.book_append_sheet(wb, wsBase100, "بيانات Base-100");

      // Sheet 5: الإغلاقات اليومية
      const dailySummaries = getDailySummaryRecords(reportData.history || []);
      const dailyRows = dailySummaries.map(h => {
        const comm = catalog.find(c => c.symbol === h.symbol) || reportData.prices?.find((p: any) => p.symbol === h.symbol);
        return {
          "الرمز": h.symbol,
          "اسم السلعة": comm?.name_ar || h.symbol,
          "القطاع": comm?.sector || "—",
          "التاريخ": h.recorded_at ? h.recorded_at.slice(0, 10) : "—",
          "سعر الإغلاق": h.price,
          "أعلى سعر": h.high ?? "—",
          "أدنى سعر": h.low ?? "—",
          "المصدر": h.source ?? "—",
          "وحدة القياس": h.symbol === 'WHEAT_US' ? 'سنت / بوشل' : (comm?.unit || '—')
        };
      });
      const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
      XLSX.utils.book_append_sheet(wb, wsDaily, "الإغلاقات اليومية");

      // Sheet 6: البيانات التاريخية الأصلية
      if (reportData.history && reportData.history.length > 0) {
        const rawHistoryRows = reportData.history.map((h: any) => ({
          "الرمز": h.symbol,
          "السعر": h.price,
          "أعلى": h.high ?? "—",
          "أدنى": h.low ?? "—",
          "المصدر": h.source ?? "—",
          "تاريخ ووقت التسجيل": h.recorded_at ? h.recorded_at.slice(0, 19).replace("T", " ") : "—"
        }));
        const wsRaw = XLSX.utils.json_to_sheet(rawHistoryRows);
        XLSX.utils.book_append_sheet(wb, wsRaw, "البيانات التاريخية الأصلية");
      }

      const fileName = `GPP-Dashboard-Analytics-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setDashboardSuccessMessage('تم تحميل مصنف Excel بـ 6 أوراق عمل بنجاح!');
      setTimeout(() => setDashboardSuccessMessage(''), 3500);

    } catch (err) {
      console.error('Dashboard Excel export error:', err);
      alert('حدث خطأ أثناء تصدير ملف Excel');
    } finally {
      setExportingDashboard(false);
      setDashboardExportMessage('');
    }
  };

  const handleDashboardPrint = () => {
    window.print();
  };

  const getChartData = () => {
    if (!reportData || !reportData.history) return { data: [], lines: [] };
    const raw = reportData.history;
    const map = new Map<string, any>();
    const linesSet = new Set<string>();

    const basePriceMap = new Map<string, number>();
    if (chartMode === "normalized") {
      const sortedHistory = [...raw].sort((a, b) => 
        new Date(a.recorded_at || a.created_at).getTime() - new Date(b.recorded_at || b.created_at).getTime()
      );
      sortedHistory.forEach(r => {
        if (!basePriceMap.has(r.symbol) && r.price > 0) {
          basePriceMap.set(r.symbol, r.price);
        }
      });
    }

    raw.forEach((r: any) => {
      const d = new Date(r.recorded_at);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (!map.has(dateStr)) {
        map.set(dateStr, { recorded_at: dateStr });
      }
      const entry = map.get(dateStr);
      if (chartMode === "normalized") {
        const base = basePriceMap.get(r.symbol) || r.price;
        entry[r.symbol] = base > 0 ? Number(((r.price / base) * 100).toFixed(2)) : 100;
      } else {
        entry[r.symbol] = r.price;
      }
      linesSet.add(r.symbol);
    });

    const data = Array.from(map.values()).sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
    let lines = Array.from(linesSet);
    if (lines.length > 20) {
      lines = lines.slice(0, 10);
    }
    return { data, lines };
  };

  const getDetailedStats = () => {
    if (!reportData || !reportData.prices || reportData.prices.length === 0 || reportType !== 'detailed_commodity') return null;
    const commodity = reportData.prices[0];
    const history = (reportData.history || []).map((h: any) => ({
      ...h,
      recorded_at: h.recorded_at || h.created_at
    }));
    
    let firstPrice = history.length > 0 ? history[0].price : commodity.price;
    let lastPrice = history.length > 0 && periodFilter !== 'all' ? history[history.length - 1].price : commodity.price;
    let high = history.length > 0 ? Math.max(...history.map((h:any) => h.price)) : commodity.price;
    let low = history.length > 0 ? Math.min(...history.map((h:any) => h.price)) : commodity.price;
    let sum = history.length > 0 ? history.reduce((acc: number, h: any) => acc + h.price, 0) : commodity.price;
    
    let upCount = 0;
    let downCount = 0;
    let stableCount = 0;
    
    let prev = firstPrice;

    history.forEach((h: any) => {
      if (h.price > prev) upCount++;
      else if (h.price < prev) downCount++;
      else stableCount++;
      
      prev = h.price;
    });

    if (commodity.price > prev) upCount++;
    else if (commodity.price < prev) downCount++;
    else stableCount++;

    const avgPrice = (sum / (history.length + 1)).toFixed(2);
    const periodChangeValue = (lastPrice - firstPrice).toFixed(2);
    const periodChangePercent = firstPrice > 0 ? (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2) : '0.00';
    
    let currentChangePercent = commodity.change_percent;
    if (currentChangePercent === null || currentChangePercent === undefined) {
      if (commodity.previous_price && commodity.previous_price > 0) {
        currentChangePercent = ((commodity.price - commodity.previous_price) / commodity.previous_price) * 100;
      } else {
        currentChangePercent = 0;
      }
    }

    return {
      commodity,
      history,
      high,
      low,
      avgPrice,
      firstPrice,
      lastPrice,
      periodChangeValue,
      periodChangePercent,
      upCount,
      downCount,
      stableCount,
      dataPoints: history.length + 1,
      currentChangePercent
    };
  };

  const detailedStats = getDetailedStats();
  const chartInfo = getChartData();
  const chartColors = ['#D4AF37', '#1e3a8a', '#b45309', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1'];

  const stats = getAdvancedSummaryStats();

  
  const chunkArray = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

  const reportTitle = reportType === 'general' ? 'تقرير الأسعار العام' : 
                      reportType === 'sector' ? 'تقرير القطاع المخصص' : 
                      reportType === 'commodity' ? 'تقرير حركة سلعة محددة' : 
                      reportType === 'detailed_commodity' ? (detailedStats ? `تقرير مفصل عن سلعة: ${detailedStats.commodity.name_ar}` : 'تقرير سلعة مفصل') :
                      reportType === 'comparison' ? 'تقرير المقارنة' : 
                      reportType === 'news_analysis' ? 'تقرير الأخبار والتحليلات' : 
                      reportType === 'daily' ? 'تقرير الأسعار اليومي' : 
                      reportType === 'monthly' ? 'التقرير الشهري' : 'التقرير الشامل';

  // Pre-calculate paginated arrays
  const detailedHistoryChunks = reportType === 'detailed_commodity' && detailedStats ? 
    chunkArray((periodFilter === 'all' ? detailedStats.history.concat([{...detailedStats.commodity, recorded_at: detailedStats.commodity.updated_at || new Date().toISOString()}]) : detailedStats.history).sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()).slice(0, 50), 20) : [];  
  const monthlyDailyPages: any[] = [];
  if ((reportType === 'monthly' || reportType === 'annual') && includeDailyTable && reportData?.history && reportData?.prices) {
    reportData.prices.forEach((p: any) => {
      const history = reportData.history.filter((h: any) => h.symbol === p.symbol).sort((a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
      if (history.length > 0) {
        const chunks = chunkArray(history, 20);
        chunks.forEach((chunk, i) => {
          monthlyDailyPages.push({
            symbol: p.symbol,
            name_ar: p.name_ar,
            isFirstChunk: i === 0,
            items: chunk
          });
        });
      }
    });
  }
    
  const periodHistoryData = reportData?.history || [];
  const chartData = chartInfo?.data || [];
  const tableMode = tableType;

  const buildMonthlySummary = (historyData: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    historyData.forEach((row) => {
      const sym = row.symbol;
      if (!grouped[sym]) grouped[sym] = [];
      grouped[sym].push(row);
    });

    const commodities = catalog && catalog.length > 0 ? catalog : (reportData?.prices || []);

    return Object.keys(grouped).map((symbol) => {
      const rows = [...grouped[symbol]].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
      const firstRow = rows[0];
      const lastRow = rows[rows.length - 1];

      const firstPrice = Number(firstRow.price || 0);
      const lastPrice = Number(lastRow.price || 0);

      const changeValue = lastPrice - firstPrice;
      const changePercent = firstPrice > 0 ? (changeValue / firstPrice) * 100 : 0;

      const prices = rows.map(r => Number(r.price || 0));
      const high = rows.reduce((max, r) => r.high ? Math.max(max, Number(r.high)) : Math.max(max, Number(r.price || 0)), 0) || Math.max(...prices);
      const low = rows.reduce((min, r) => r.low ? Math.min(min, Number(r.low)) : Math.min(min, Number(r.price || 0)), Infinity) || Math.min(...prices);
      const sum = prices.reduce((acc, p) => acc + p, 0);
      const averagePrice = prices.length > 0 ? sum / prices.length : 0;

      const commodityInfo = commodities.find(c => c.symbol === symbol) || {};

      return {
        date: lastRow.recorded_at || lastRow.created_at,
        symbol,
        name_ar: commodityInfo?.name_ar || symbol,
        name_en: commodityInfo?.name_en || symbol,
        sector: commodityInfo?.sector || '---',
        unit: commodityInfo?.unit || '---',
        price: lastPrice,
        previous_price: firstPrice,
        change_value: changeValue,
        change_percent: changePercent,
        high: high === -Infinity || high === 0 ? lastPrice : high,
        low: low === Infinity || low === 0 ? lastPrice : low,
        averagePrice,
        source: lastRow.source || commodityInfo?.source || '---',
        trend: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral',
        analysis_status: changePercent > 5 ? 'ارتفاع قوي' : changePercent > 0.5 ? 'ارتفاع محدود' : changePercent < -5 ? 'انخفاض قوي' : changePercent < -0.5 ? 'انخفاض محدود' : 'استقرار'
      };
    });
  };

  const pagesData: any[] = [];
  if (reportType !== 'detailed_commodity' && reportData?.prices) {
    const commodities = catalog && catalog.length > 0 ? catalog : (reportData?.prices || []);

    if (
      tableMode === 'detailed' || 
      reportType === 'monthly' || 
      periodFilter !== 'all' ||
      reportType === 'annual' ||
      reportType === 'detailed_commodity'
    ) {
      // Build Detailed Table Data
      const detailedTableData = periodHistoryData.map((row, index, arr) => {
        const previousRow = [...arr]
          .slice(0, index)
          .reverse()
          .find(item => item.symbol === row.symbol);

        const currentPrice = Number(row.price || 0);
        const previousPrice = previousRow ? Number(previousRow.price || 0) : null;

        const changeValue = previousPrice ? currentPrice - previousPrice : null;
        const changePercent = previousPrice && previousPrice > 0
          ? ((currentPrice - previousPrice) / previousPrice) * 100
          : null;

        const commodityInfo = commodities.find(c => c.symbol === row.symbol);

        return {
          date: row.recorded_at || row.created_at,
          symbol: row.symbol,
          name_ar: commodityInfo?.name_ar || row.symbol,
          name_en: commodityInfo?.name_en || row.symbol,
          sector: commodityInfo?.sector || '---',
          unit: commodityInfo?.unit || '---',
          price: currentPrice,
          previous_price: previousPrice,
          change_val: changeValue,
          change_pct: changePercent,
          high: row.high,
          low: row.low,
          source: row.source || commodityInfo?.source || '---',
          trend:
            changePercent === null ? '---' :
            changePercent > 0 ? 'up' :
            changePercent < 0 ? 'down' : 'neutral'
        };
      });

      if (detailedTableData.length === 0) {
        pagesData.push({
          type: 'detailed_table',
          isFirstChunk: true,
          items: []
        });
      } else {
        const chunkSize = 20;
        for (let i = 0; i < detailedTableData.length; i += chunkSize) {
          pagesData.push({
            type: 'detailed_table',
            isFirstChunk: i === 0,
            items: detailedTableData.slice(i, i + chunkSize)
          });
        }
      }
    } else {
      // Build Summary Table Data
      const summaryTableData = buildMonthlySummary(periodHistoryData);

      if (summaryTableData.length === 0) {
        pagesData.push({
          type: 'summary_table',
          isFirstChunk: true,
          items: []
        });
      } else {
        const chunkSize = 25;
        for (let i = 0; i < summaryTableData.length; i += chunkSize) {
          pagesData.push({
            type: 'summary_table',
            isFirstChunk: i === 0,
            items: summaryTableData.slice(i, i + chunkSize)
          });
        }
      }
    }
  }

  // Console logging before rendering
  console.log('CHART DATA LENGTH:', chartData?.length);
  console.log('PERIOD HISTORY LENGTH:', periodHistoryData?.length);
  console.log('TABLE DATA LENGTH:', pagesData?.reduce((acc, p) => acc + (p.items?.length || 0), 0));
  console.log('TABLE MODE:', tableMode);
  console.log('REPORT TYPE:', reportType);

  let totalPagesCount = 1; // Cover
  if (reportType === 'detailed_commodity' && detailedStats) {
    totalPagesCount += 1; // Summary
    totalPagesCount += 1; // Chart
    totalPagesCount += detailedHistoryChunks.length;
  } else if (reportData) {
    totalPagesCount += 1; // Executive Summary
    if (includeCharts && chartInfo.data.length > 0) totalPagesCount += 1; // Chart
    totalPagesCount += pagesData.length;
    if (reportType === 'monthly' && includeDailyTable) totalPagesCount += monthlyDailyPages.length;
    if (includeNews && reportData.news && reportData.news.length > 0) totalPagesCount += 1;
    if (includeAnalyses && reportData.analyses && reportData.analyses.length > 0) totalPagesCount += 1;
  }
  
  if (adminNotes) totalPagesCount += 1;

  let currentPageNum = 1;

  return (
    <div className="space-y-6">
      
<style>{`
  .report-page {
    width: 794px;
    min-height: 1123px;
    background: #ffffff;
    padding: 48px;
    margin: 0 auto 24px auto;
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  }
  .report-page[data-orientation="landscape"] {
    width: 1123px;
    min-height: 794px;
  }
  @media print {
    body { 
      background: white !important; 
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print, nav, aside, [class*="sidebar"], header, .report-filter-form, .dashboard-toolbar-container {
      display: none !important;
    }
    .bi-dashboard-screen-only {
      display: none !important;
    }
    .dashboard-print-container {
      position: static !important;
      left: auto !important;
      top: auto !important;
      width: 100% !important;
      display: block !important;
      visibility: visible !important;
      pointer-events: auto !important;
      z-index: 10 !important;
    }
    .dashboard-a4-page {
      page-break-after: always !important;
      break-after: page !important;
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      min-height: 200mm !important;
      margin: 0 auto !important;
      box-shadow: none !important;
      border: none !important;
      overflow: hidden !important;
    }
    .dashboard-a4-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .print-only {
      display: block !important;
    }
    .dashboard-print-block {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-bottom: 24px !important;
    }
    .report-page {
      page-break-after: always;
      break-after: page;
      margin: 0;
      box-shadow: none;
    }
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    .report-page[data-orientation="portrait"] {
      page: portrait-page;
    }
    @page portrait-page {
      size: A4 portrait;
    }
    .report-page[data-orientation="landscape"] {
      page: landscape-page;
    }
    @page landscape-page {
      size: A4 landscape;
    }
  }

  .report-table {
    width: 100%;
    table-layout: auto;
    border-collapse: collapse;
    font-size: 10px;
    color: #475569; /* Base color applied to table */
  }
  
  .report-table th {
    background-color: #0A1128;
    color: #ffffff;
    text-align: center;
    font-weight: bold;
    padding: 8px 6px;
    border: 1px solid #cbd5e1;
    font-size: 11px;
    white-space: nowrap;
  }

  .report-table td {
    padding: 6px;
    border: 1px solid #e2e8f0;
    vertical-align: middle;
  }

  /* Alternating rows */
  .report-table tbody tr:nth-child(even) {
    background-color: #f8fafc; /* slate-50 */
  }
  .report-table tbody tr:nth-child(odd) {
    background-color: #ffffff;
  }

  /* Numeric columns */
  .col-numeric {
    text-align: center;
    font-family: monospace;
    white-space: nowrap;
  }

  /* Text columns */
  .col-text {
    text-align: right;
    word-break: break-word;
    white-space: normal;
  }
`}</style>

      <div className="no-print flex justify-between items-center bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <FileText className="text-primary-600" /> منشئ التقارير
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">توليد تقارير مخصصة للأسعار والمؤشرات بصيغة PDF و PNG</p>
        </div>
      </div>
      
      <div className="no-print bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 report-filter-form">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع التقرير</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500">
              <option value="general">تقرير أسعار عام</option>
              <option value="sector">تقرير حسب القطاع</option>
              <option value="commodity">تقرير حركة سلعة محددة</option>
              <option value="detailed_commodity">تقرير سلعة مفصل</option>
              <option value="comparison">تقرير مقارنة بين عدة سلع</option>
              <option value="news_analysis">تقرير الأخبار والتحليلات</option>
              <option value="daily">تقرير يومي مختصر</option>
              <option value="monthly">تقرير شهري</option>
              <option value="annual">تقرير سنوي</option>
              <option value="comprehensive">تقرير كامل شامل</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع جدول التقرير</label>
            <select value={tableType} onChange={e => setTableType(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500">
              <option value="detailed">تفصيلي حسب الفترة</option>
              <option value="summary">ملخص شهري لكل سلعة</option>
            </select>
          </div>
          
          {reportType === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نطاق التقرير الشهري</label>
              <select value={monthlyScope} onChange={e => setMonthlyScope(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500">
                <option value="general">عام لكل السلع</option>
                <option value="sector">حسب القطاع</option>
                <option value="commodity">حسب السلعة</option>
              </select>
            </div>
          )}
          {reportType === 'annual' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نطاق التقرير السنوي</label>
              <select value={monthlyScope} onChange={e => setMonthlyScope(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500">
                <option value="general">عام لكل السلع</option>
                <option value="sector">حسب القطاع</option>
                <option value="commodity">حسب السلعة</option>
              </select>
            </div>
          )}

          {(reportType === 'sector' || ((reportType === 'monthly' || reportType === 'annual') && monthlyScope === 'sector')) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">القطاع</label>
              <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500">
                <option value="">اختر القطاع</option>
                {sectors.map(s => <option key={s.sector_code} value={s.sector_code}>{s.name_ar}</option>)}
              </select>
            </div>
          )}

          {(reportType === 'commodity' || reportType === 'detailed_commodity' || ((reportType === 'monthly' || reportType === 'annual') && monthlyScope === 'commodity')) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">السلعة</label>
              <select value={symbolFilter} onChange={e => setSymbolFilter(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500">
                <option value="">اختر السلعة</option>
                {catalog.map(c => <option key={c.symbol} value={c.symbol}>{c.symbol} - {c.name_ar} - {c.name_en}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Sector Commodities Selection */}
        {(reportType === 'sector' || ((reportType === 'monthly' || reportType === 'annual') && monthlyScope === 'sector')) && sectorFilter && (
          <div className="mb-6 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                السلع التابعة للقطاع
                <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs">
                  تم اختيار {selectedCommodities.length} من أصل {sectorCommodities.length} سلعة داخل القطاع
                </span>
              </h3>
              
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCommodities(sectorCommodities.map(c => c.symbol))}
                  className="px-3 py-1.5 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCommodities([])}
                  className="px-3 py-1.5 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  إلغاء تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCommodities(sectorCommodities.map(c => c.symbol).filter(sym => !selectedCommodities.includes(sym)))}
                  className="px-3 py-1.5 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  عكس التحديد
                </button>
              </div>
            </div>

            <div className="mb-3">
              <input
                type="text"
                placeholder="البحث عن سلعة (الرمز، الاسم العربي، الاسم الإنجليزي)..."
                value={sectorCommoditySearch}
                onChange={e => setSectorCommoditySearch(e.target.value)}
                className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            <div className="max-h-[240px] overflow-y-auto bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-lg p-2">
              {sectorCommodities.filter(c => {
                const search = sectorCommoditySearch.toLowerCase();
                return c.symbol.toLowerCase().includes(search) || 
                       (c.name_ar && c.name_ar.toLowerCase().includes(search)) || 
                       (c.name_en && c.name_en.toLowerCase().includes(search));
              }).map(c => (
                <label key={c.symbol} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <input
                    type="checkbox"
                    checked={selectedCommodities.includes(c.symbol)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCommodities([...selectedCommodities, c.symbol]);
                      } else {
                        setSelectedCommodities(selectedCommodities.filter(sym => sym !== c.symbol));
                      }
                    }}
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                  />
                  <div className="flex-1 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-[#1e3a8a] dark:text-blue-400 font-mono ml-2">{c.symbol}</span>
                      <span className="text-slate-700 dark:text-slate-300">{c.name_ar}</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {c.unit}
                    </span>
                  </div>
                </label>
              ))}
              {sectorCommodities.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-sm">
                  لا توجد سلع نشطة ومرئية في هذا القطاع
                </div>
              )}
            </div>
          </div>
        )}

        {/* Date Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {(reportType === 'monthly' || reportType === 'annual') ? (
            <>
              {reportType === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الشهر</label>
                <select value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500">
                  {Array.from({length: 12}, (_, i) => {
                    const m = (i + 1).toString().padStart(2, '0');
                    const d = new Date(); d.setMonth(i);
                    return <option key={m} value={m}>{d.toLocaleString('ar-LY', { month: 'long' })} ({m})</option>;
                  })}
                </select>
              </div>
            )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">السنة</label>
                <input type="number" min="2020" max="2100" value={reportYear} onChange={e => setReportYear(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500" />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الفترة الزمنية</label>
              <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500">
                <option value="7">آخر 7 أيام</option>
                <option value="30">آخر 30 يوم</option>
                <option value="90">آخر 90 يوم</option>
                <option value="custom">فترة مخصصة</option>
                <option value="all">الكل</option>
              </select>
            </div>
          )}
        </div>

        {(reportType !== 'monthly' && reportType !== 'annual') && periodFilter === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">من تاريخ</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">إلى تاريخ</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={includeNews} onChange={e => setIncludeNews(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500" />
            تضمين الأخبار
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={includeAnalyses} onChange={e => setIncludeAnalyses(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500" />
            تضمين التحليلات
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={includeCharts} onChange={e => setIncludeCharts(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500" />
            تضمين الرسوم البيانية
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={includeTables} onChange={e => setIncludeTables(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500" />
            تضمين الجداول التفصيلية
          </label>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الملخص التنفيذي (اختياري)</label>
          <textarea 
            rows={3} 
            value={executiveSummaryText} 
            onChange={e => setExecutiveSummaryText(e.target.value)}
            placeholder="اكتب ملخصاً للتقرير سيظهر في الصفحة الأولى..."
            className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500 resize-none mb-4"
          />

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ملاحظات السوبر أدمن (اختياري)</label>
          <textarea 
            rows={3} 
            value={adminNotes} 
            onChange={e => setAdminNotes(e.target.value)}
            placeholder="اكتب ملاحظاتك التي ستظهر في نهاية التقرير..."
            className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleGenerate} 
            disabled={loading}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 transition font-medium disabled:opacity-50"
          >
            {loading ? 'جاري التحضير...' : 'إنشاء ومعاينة التقرير'}
          </button>
          
          
        {isGenerated && reportData && !loading && (
          <>
            <button 
              onClick={downloadReportPDF}
              disabled={exporting || !reportData || loading}
              className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 transition font-medium"
            >
              {exporting ? 'جاري تجهيز الملف...' : <><Download size={18} /> تحميل PDF</>}
            </button>
            <button 
              onClick={downloadReportPNG}
              disabled={exporting || !reportData || loading}
              className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition font-medium"
            >
              {exporting ? 'جاري تجهيز الملف...' : <><ImageIcon size={18} /> تحميل صورة PNG</>}
            </button>
            <button 
              onClick={downloadReportExcel}
              disabled={exporting || !reportData || loading}
              className="flex items-center gap-2 bg-emerald-700 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-800 transition font-medium shadow-sm"
              title="تصدير بيانات ومؤشرات التقرير إلى مصنف Excel منسق"
            >
              <FileSpreadsheet size={18} /> تصدير Excel
            </button>
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg hover:bg-slate-300 transition font-medium dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <RotateCcw size={18} /> إعادة ضبط
            </button>
          </>
        )}
        </div>
      </div>

    {isGenerated && reportData && (
      <div className="bg-slate-100 dark:bg-slate-900 p-4 sm:p-6 lg:p-8 rounded-2xl shadow-inner flex flex-col items-center gap-6 w-full">
        {/* Main View Mode Switcher */}
        <div className="no-print w-full max-w-7xl flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-dark-card p-4 rounded-xl shadow-sm border border-slate-200 dark:border-dark-border">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMainView('bi_dashboard')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
                activeMainView === 'bi_dashboard'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <LayoutDashboard size={18} />
              <span>لوحة التحليل الاقتصادي (Power BI Dashboard)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMainView('detailed_document')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
                activeMainView === 'detailed_document'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <FileText size={18} />
              <span>وثيقة التقرير والطباعة (Detailed Document)</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity size={15} className="text-primary-600 dark:text-primary-400" />
              تم استرجاع <strong className="text-primary-700 dark:text-primary-300 font-bold">{totalHistoryRows.toLocaleString('ar-LY')}</strong> سجلاً كاملاً
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {periodLabelText}
            </span>
          </div>
        </div>

        {/* BI Dashboard View */}
        {activeMainView === 'bi_dashboard' && (
          <div className="w-full max-w-7xl space-y-4">
            {/* Direct Export & Print Toolbar for Power BI Dashboard */}
            <DashboardExportToolbar
              exportScope={dashboardExportScope}
              onScopeChange={setDashboardExportScope}
              onExportPDF={handleDashboardPDF}
              onExportExcel={handleDashboardExcel}
              onExportPNG={handleDashboardPNG}
              onPrint={handleDashboardPrint}
              isExporting={exportingDashboard}
              statusMessage={dashboardExportMessage}
              successMessage={dashboardSuccessMessage}
            />

            {/* Dedicated Print & PDF 3-Page Executive Template (A4 Landscape) */}
            {executiveStats && (
              <div 
                ref={printContainerRef}
                className="dashboard-print-container"
                style={{
                  position: 'absolute',
                  left: '-99999px',
                  top: 0,
                  width: '1123px',
                  overflow: 'visible',
                  pointerEvents: 'none',
                  zIndex: -1000
                }}
              >
                <DashboardPrintTemplate
                  stats={executiveStats}
                  sectorAnalytics={sectorAnalyticsList}
                  commoditiesAnalytics={commoditiesAnalyticsList}
                  periodLabel={periodLabelText}
                  startDate={reportStartDate}
                  endDate={reportEndDate}
                  executiveSummaryText={autoExecutiveSummaryText}
                  page1Ref={printPage1Ref}
                  page2Ref={printPage2Ref}
                  page3Ref={printPage3Ref}
                />
              </div>
            )}

            {/* Dashboard Printable & Capturable Container */}
            <div 
              ref={dashboardRef} 
              id="gpp-bi-dashboard" 
              className="bi-dashboard-screen-only w-full space-y-6 bg-white dark:bg-dark-card p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm text-slate-900 dark:text-white"
            >
              {/* Official Printable Header (Visible in print and PDF captures) */}
              <div className="print-only hidden p-4 mb-3 border-b-2 border-[#1e3a8a] bg-white text-slate-900 rounded-xl">
                <div className="flex items-center justify-between">
                  <img 
                    src="https://i.postimg.cc/bwVPbtwT/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png" 
                    alt="LTN Logo" 
                    className="h-12 w-auto object-contain"
                  />
                  <div className="text-center">
                    <h2 className="text-xl font-extrabold text-[#1e3a8a]">
                      منصة الأسعار العالمية (GPP) — لوحة التحليل الاقتصادي التنفيذية
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 font-semibold">
                      {periodLabelText} • شبكة ليبيا للتجارة • تاريخ التصدير: {new Date().toLocaleDateString('ar-LY')}
                    </p>
                  </div>
                  <img 
                    src="https://i.postimg.cc/fyZwc16S/tsmym-bdwn-%CA%BFnwan-(1).png" 
                    alt="GPP Logo" 
                    className="h-12 w-auto object-contain"
                  />
                </div>
              </div>

              {/* Section 1: 10 Executive KPI Cards & Auto Executive Memo */}
              <div ref={kpiCardsRef} className="dashboard-print-block space-y-4">
                {executiveStats && (
                  <EconomicKpiCards
                    stats={executiveStats}
                    selectedPeriodLabel={periodLabelText}
                    allCommoditiesAnalysis={commoditiesAnalyticsList}
                    onSelectCommodity={(sym) => {
                      setSymbolFilter(sym);
                      setReportType('commodity');
                    }}
                  />
                )}

                {autoExecutiveSummaryText && (
                  <div className="bg-gradient-to-l from-primary-900 to-indigo-900 text-white p-5 rounded-xl shadow-md border border-primary-800">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles size={20} className="text-amber-300" />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">
                            الملخص التنفيذي الاقتصادي الآلي
                          </h4>
                          <span className="text-[10px] bg-primary-700/60 text-primary-200 px-2 py-0.5 rounded-full font-mono">
                            Auto Executive Memo
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-normal">
                          {autoExecutiveSummaryText}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Sector Heatmap */}
              {sectorAnalyticsList.length > 0 && (
                <div ref={heatmapRef} className="dashboard-print-block">
                  <SectorHeatmap
                    sectors={sectorAnalyticsList}
                    selectedSector={sectorFilter}
                    onSelectSector={(secCode) => {
                      setSectorFilter(secCode);
                      if (secCode) {
                        setReportType('sector');
                      } else {
                        setReportType('general');
                      }
                    }}
                  />
                </div>
              )}

              {/* Section 3: Base-100 Relative Comparison Chart */}
              <div ref={base100Ref} className="dashboard-print-block">
                <Base100ComparisonChart
                  commoditiesAnalysis={commoditiesAnalyticsList}
                />
              </div>

              {/* Section 4: Top Movers Bar Chart */}
              <div ref={topMoversRef} className="dashboard-print-block">
                <TopMoversChart
                  commoditiesAnalysis={commoditiesAnalyticsList}
                  onSelectCommodity={(sym) => {
                    setSymbolFilter(sym);
                    setReportType('commodity');
                  }}
                />
              </div>

              {/* Official Print Footer */}
              <div className="print-only hidden pt-3 border-t border-slate-300 text-xs text-slate-500 text-center font-medium">
                منصة الأسعار العالمية (GPP) — شبكة ليبيا للتجارة (LTN) — جميع الحقوق محفوظة © {new Date().getFullYear()}
              </div>

              {/* Footer Navigation Link to Document View */}
              <div className="no-print bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/70 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  هل ترغب في تصدير نسخة ورقية مفصلة أو معاينة الجداول التفصيلية بكل سلعة؟
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMainView('detailed_document')}
                  className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 hover:bg-primary-100 px-4 py-2 rounded-lg text-xs font-bold transition border border-primary-200 dark:border-primary-800"
                >
                  <span>الانتقال إلى وثيقة التقرير والطباعة</span>
                  <FileText size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Document View (Printed Pages & Cover) */}
        {totalHistoryRows > 0 && activeMainView === 'detailed_document' && (
          <div className="w-full max-w-[210mm] flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-dark-card text-slate-800 dark:text-slate-200 px-5 py-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-sm font-medium">
            <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Activity size={18} className="text-primary-600 dark:text-primary-400" />
              تم استرجاع <strong className="text-primary-700 dark:text-primary-300 font-bold">{totalHistoryRows.toLocaleString("ar-LY")}</strong> سجل تاريخي مكتمل عبر Pagination
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">مقياس الرسم البياني:</span>
              <button
                type="button"
                onClick={() => setChartMode("absolute")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${chartMode === "absolute" ? "bg-primary-600 text-white shadow" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200"}`}
              >
                الأسعار المطلقة ($)
              </button>
              <button
                type="button"
                onClick={() => setChartMode("normalized")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${chartMode === "normalized" ? "bg-primary-600 text-white shadow" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200"}`}
                title="مقارنة حركة السلع على أساس موحد (Base 100 Index)"
              >
                المؤشر المعياري (Base 100)
              </button>
            </div>
          </div>
        )}

        <div 
          ref={reportRef} 
          className={`flex flex-col gap-6 ${activeMainView === 'detailed_document' ? 'block' : 'hidden'}`} 
          style={{ fontFamily: 'Tajawal, sans-serif' }}
        >
          
          {/* Cover Page */}
          <div className="report-page shrink-0" data-orientation="portrait">
            <div className="flex flex-col h-full pt-16 px-12">
              <div className="flex justify-between items-center w-full mb-12 border-b-2 border-[#1e3a8a] pb-8">
                <ReportLogo url={logoRight} alt="Right Logo" className="h-[80px] w-auto max-w-[250px] object-contain report-logo" />
                <ReportLogo url={logoMiddle} alt="Middle Logo" className="h-[80px] w-auto max-w-[250px] object-contain report-logo" />
                <ReportLogo url={logoLeft} alt="Left Logo" className="h-[80px] w-auto max-w-[250px] object-contain report-logo" />
              </div>
              
              <div className="flex flex-col items-center text-center mt-12">
                <h1 className="text-4xl font-extrabold text-[#1e3a8a] mb-2">منصة الأسعار العالمية (GPP)</h1>
                <h2 className="text-2xl text-slate-600 mb-16 font-semibold">Global Pricing Platform (GPP)</h2>
                
                <div className="inline-block border-y-4 border-[#b45309] py-8 px-16 mb-16 bg-slate-50/50 min-w-[60%]">
                  <h3 className="text-4xl font-bold text-[#b45309] mb-8">{reportTitle}</h3>
                  <div className="text-xl text-[#1e3a8a] font-bold mb-4">
                    نوع التقرير: {reportType === 'general' ? 'تقرير الأسعار العام' : reportType === 'sector' ? 'تقرير القطاع المخصص' : reportType === 'commodity' ? 'تقرير حركة سلعة محددة' : reportType === 'detailed_commodity' ? 'تقرير سلعة مفصل' : reportType === 'comparison' ? 'تقرير المقارنة' : reportType === 'news_analysis' ? 'تقرير الأخبار والتحليلات' : reportType === 'daily' ? 'تقرير الأسعار اليومي' : reportType === 'monthly' ? 'التقرير الشهري' : reportType === 'annual' ? 'التقرير السنوي' : 'التقرير الشامل'}
                  </div>
                  <div className="text-2xl text-slate-600 font-medium mb-4">
                    الفترة: {reportType === 'daily' ? 'اليوم' : periodFilter === 'all' && reportType !== 'monthly' ? 'الكل' : (reportStartDate && reportEndDate) ? `من ${new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(reportStartDate))} إلى ${new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(reportEndDate))}` : reportType === 'monthly' ? `${reportMonth}/${reportYear}` : reportType === 'annual' ? reportYear : 'مخصصة'}
                  </div>
                  {reportType === 'detailed_commodity' && detailedStats && (
                    <div className="text-xl text-[#1e3a8a] font-bold mb-4">
                      <span className="font-mono" dir="ltr">{detailedStats.commodity.symbol}</span> | {detailedStats.commodity.sector}
                    </div>
                  )}
                  {((reportType === 'sector' || ((reportType === 'monthly' || reportType === 'annual') && monthlyScope === 'sector')) && sectorFilter) && (
                    <div className="mb-4">
                      <div className="text-xl text-[#1e3a8a] font-bold mb-2">
                        القطاع: {sectors.find(s => s.sector_code === sectorFilter)?.name_ar || sectorFilter}
                      </div>
                      <div className="text-lg text-slate-600 font-medium mb-2">
                        عدد السلع المختارة: <span className="font-mono">{selectedCommodities.length}</span>
                      </div>
                      <div className="text-md text-slate-500 font-mono" dir="ltr">
                        {selectedCommodities.join(', ')}
                      </div>
                    </div>
                  )}
                  <div className="text-xl text-slate-500 font-medium mt-8">
                    تاريخ ووقت الإصدار: <span dir="ltr">{new Date().toLocaleString('en-GB')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-auto absolute bottom-12 left-12 right-12 border-t-2 border-slate-200 pt-6 flex justify-between items-center text-xs text-slate-500 font-medium z-10 bg-white">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 text-sm">© Libya Trade Network</span>
                  <span className="text-slate-600">Global Pricing Platform (GPP)</span>
                </div>
                <div className="text-left font-bold text-slate-600" dir="ltr">Page 1 of {totalPagesCount}</div>
              </div>
            </div>
          </div>

          {/* Detailed Commodity Content */}
          {reportType === 'detailed_commodity' && detailedStats ? (
            <>
              {/* Page 2: Executive Summary & Indicators */}
              <div className="report-page shrink-0" data-orientation="portrait">
                
                
                <div className="flex justify-between items-center border-b-2 border-slate-200 pb-4 mb-8 relative z-10">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">منصة الأسعار العالمية (GPP)</h4>
                    <h5 className="text-sm text-slate-500 font-medium">{reportTitle}</h5>
                  </div>
                  <div className="text-sm text-slate-500 font-medium font-mono" dir="ltr">
                    Page {++currentPageNum}
                  </div>
                </div>

                <div className="relative z-10">
                  <div className="mb-10">
                    <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">الملخص التنفيذي التلقائي</h4>
                    <div className="bg-slate-50 p-6 border border-slate-200 rounded-lg shadow-sm text-slate-700 leading-loose text-justify text-lg">
                      خلال الفترة المحددة سجلت سلعة <span className="font-bold text-[#1e3a8a]">{detailedStats.commodity.name_ar}</span> تغيرًا بنسبة <span className="font-bold font-mono" dir="ltr">{detailedStats.periodChangePercent}%</span> حيث بدأ السعر عند <span className="font-bold font-mono" dir="ltr">{Number(detailedStats.firstPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> ووصل إلى <span className="font-bold font-mono" dir="ltr">{Number(detailedStats.lastPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>. بلغ أعلى سعر خلال الفترة <span className="font-bold text-green-700 font-mono" dir="ltr">{Number(detailedStats.high).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> بينما بلغ أقل سعر <span className="font-bold text-red-700 font-mono" dir="ltr">{Number(detailedStats.low).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>. يعتمد التقرير على بيانات الأرشيف المسجلة في منصة الأسعار العالمية GPP.
                    </div>
                  </div>

                  <div className="mb-10">
                    <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">بيانات السلعة الأساسية</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                        <div className="text-sm text-slate-500 mb-1">اسم السلعة</div>
                        <div className="text-lg font-bold text-slate-800">{detailedStats.commodity.name_ar}</div>
                      </div>
                      <div className="bg-[#1e3a8a]/5 p-4 border border-[#1e3a8a]/20 rounded-lg shadow-sm text-center">
                        <div className="text-sm text-[#1e3a8a] mb-1 font-medium">السعر الحالي</div>
                        <div className="text-2xl font-bold text-[#1e3a8a] font-mono" dir="ltr">
                          {Number(detailedStats.commodity.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
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
                        <div className={`text-xl font-bold font-mono ${Number(detailedStats.periodChangePercent) > 0 ? 'text-green-600' : Number(detailedStats.periodChangePercent) < 0 ? 'text-red-600' : 'text-slate-500'}`} dir="ltr">
                          {Number(detailedStats.periodChangePercent) > 0 ? '+' : ''}{detailedStats.periodChangePercent}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-12 left-12 right-12 border-t-2 border-slate-200 pt-6 flex justify-between items-center text-xs text-slate-500 font-medium z-10 bg-white">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">© Libya Trade Network</span>
                    <span className="text-slate-600">Global Pricing Platform (GPP)</span>
                  </div>
                  <div className="text-left font-bold text-slate-600" dir="ltr">Page {currentPageNum} of {totalPagesCount}</div>
                </div>
              </div>

              {/* Page 3: Chart */}
              <div className="report-page shrink-0" data-orientation="portrait">
                
                
                <div className="flex justify-between items-center border-b-2 border-slate-200 pb-4 mb-8 relative z-10">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">منصة الأسعار العالمية (GPP)</h4>
                    <h5 className="text-sm text-slate-500 font-medium">{reportTitle}</h5>
                  </div>
                  <div className="text-sm text-slate-500 font-medium font-mono" dir="ltr">
                    Page {++currentPageNum}
                  </div>
                </div>

                <div className="relative z-10">
                  <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2 flex items-center justify-between">
                    <span>الرسم البياني لحركة سعر السلعة خلال الفترة</span>
                    {reportStartDate && reportEndDate && (
                      <span className="text-sm font-normal text-slate-500 font-mono" dir="ltr">
                        {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(reportStartDate))} - {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(reportEndDate))}
                      </span>
                    )}
                  </h4>
                  <div className="w-full h-[420px] bg-white p-4 border border-slate-200 rounded-lg shadow-sm" style={{ direction: 'ltr' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={(periodFilter === 'all' ? detailedStats.history.concat([{...detailedStats.commodity, recorded_at: new Date().toISOString()}]) : detailedStats.history).sort((a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())}>
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

                <div className="absolute bottom-12 left-12 right-12 border-t-2 border-slate-200 pt-6 flex justify-between items-center text-xs text-slate-500 font-medium z-10 bg-white">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">© Libya Trade Network</span>
                    <span className="text-slate-600">Global Pricing Platform (GPP)</span>
                  </div>
                  <div className="text-left font-bold text-slate-600" dir="ltr">Page {currentPageNum} of {totalPagesCount}</div>
                </div>
              </div>

              {/* Pages: Tables for history */}
              {detailedHistoryChunks.map((chunk, chunkIdx) => (
                <div key={chunkIdx} className="report-page shrink-0" data-orientation="landscape">
                  
                  
                  <div className="flex justify-between items-center border-b-2 border-slate-200 pb-4 mb-8 relative z-10">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">منصة الأسعار العالمية (GPP)</h4>
                    <h5 className="text-sm text-slate-500 font-medium">{reportTitle}</h5>
                  </div>
                  <div className="text-sm text-slate-500 font-medium font-mono" dir="ltr">
                    Page {++currentPageNum}
                  </div>
                </div>

                  <div className="relative z-10">
                    <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">
                      الأرشيف التاريخي للسلعة {chunkIdx > 0 ? '(تابع)' : ''}
                    </h4>
                    <table className="report-table">
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
                          const cpText = `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`;
                          
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
                              <td className={`p-2 border border-slate-200 font-mono ${cpColor}`} dir="ltr">{changeValue > 0 ? '+' : ''}{Number(changeValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className={`p-2 border border-slate-200 font-mono font-bold ${cpColor}`} dir="ltr">{cpText}</td>
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
                    </table>
                  </div>

                  <div className="absolute bottom-12 left-12 right-12 border-t-2 border-slate-200 pt-6 flex justify-between items-center text-xs text-slate-500 font-medium z-10 bg-white">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">© Libya Trade Network</span>
                    <span className="text-slate-600">Global Pricing Platform (GPP)</span>
                  </div>
                  <div className="text-left font-bold text-slate-600" dir="ltr">Page {currentPageNum} of {totalPagesCount}</div>
                </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {/* Other Reports */}
              {/* Page 2: Summary */}
              <div className="report-page shrink-0" data-orientation="portrait">
                
                
                <div className="flex justify-between items-center border-b-2 border-slate-200 pb-4 mb-8 relative z-10">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">منصة الأسعار العالمية (GPP)</h4>
                    <h5 className="text-sm text-slate-500 font-medium">{reportTitle}</h5>
                  </div>
                  <div className="text-sm text-slate-500 font-medium font-mono" dir="ltr">
                    Page {++currentPageNum}
                  </div>
                </div>

                <div className="relative z-10">
                  <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">الملخص التنفيذي</h4>
                  {executiveSummaryText && (
                    <p className="text-slate-700 leading-relaxed mb-8 whitespace-pre-wrap">{executiveSummaryText}</p>
                  )}

                  {stats && (
                    <>
                      <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">الملخص الاقتصادي الشامل</h4>
                      <div className="grid grid-cols-4 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-center col-span-1">
                          <div className="text-sm text-slate-500 mb-1">إجمالي السلع</div>
                          <div className="text-xl font-bold text-slate-800">{stats.totalCommodities}</div>
                        </div>
                        <div className="bg-green-50 p-4 border border-green-200 rounded-lg text-center col-span-1">
                          <div className="text-sm text-green-700 mb-1">ارتفاع</div>
                          <div className="text-xl font-bold text-green-700">{stats.upCount}</div>
                        </div>
                        <div className="bg-red-50 p-4 border border-red-200 rounded-lg text-center col-span-1">
                          <div className="text-sm text-red-700 mb-1">انخفاض</div>
                          <div className="text-xl font-bold text-red-700">{stats.downCount}</div>
                        </div>
                        <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-center col-span-1">
                          <div className="text-sm text-slate-600 mb-1">استقرار</div>
                          <div className="text-xl font-bold text-slate-600">{stats.stableCount}</div>
                        </div>
                        
                        <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg text-center col-span-2">
                          <div className="text-sm text-blue-700 mb-1">متوسط نسبة التغير العام</div>
                          <div className="text-xl font-bold text-blue-700" dir="ltr">{stats.avgCp > 0 ? '+' : ''}{stats.avgCp.toFixed(2)}%</div>
                        </div>
                        <div className="bg-orange-50 p-4 border border-orange-200 rounded-lg text-center col-span-2">
                          <div className="text-sm text-orange-700 mb-1">السلعة الأكثر تذبذباً</div>
                          <div className="text-md font-bold text-orange-700">{stats.mostVolatile ? `${stats.mostVolatile.name_ar} (${stats.mostVolatile.volatility_percent.toFixed(2)}%)` : '-'}</div>
                        </div>

                        <div className="bg-emerald-50 p-4 border border-emerald-200 rounded-lg text-center col-span-2">
                          <div className="text-sm text-emerald-700 mb-1">أعلى ارتفاع</div>
                          <div className="text-md font-bold text-emerald-700">{stats.topGainer ? `${stats.topGainer.name_ar} (+${stats.topGainer.period_change_percent.toFixed(2)}%)` : '-'}</div>
                        </div>
                        <div className="bg-rose-50 p-4 border border-rose-200 rounded-lg text-center col-span-2">
                          <div className="text-sm text-rose-700 mb-1">أكبر انخفاض</div>
                          <div className="text-md font-bold text-rose-700">{stats.topLoser ? `${stats.topLoser.name_ar} (${stats.topLoser.period_change_percent.toFixed(2)}%)` : '-'}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="absolute bottom-12 left-12 right-12 border-t-2 border-slate-200 pt-6 flex justify-between items-center text-xs text-slate-500 font-medium z-10 bg-white">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">© Libya Trade Network</span>
                    <span className="text-slate-600">Global Pricing Platform (GPP)</span>
                  </div>
                  <div className="text-left font-bold text-slate-600" dir="ltr">Page {currentPageNum} of {totalPagesCount}</div>
                </div>
              </div>

              {/* Chart Page */}
              {includeCharts && chartInfo.data.length > 0 && (
                <div className="report-page shrink-0" data-orientation="portrait">
                  
                  
                  <div className="flex justify-between items-center border-b-2 border-slate-200 pb-4 mb-8 relative z-10">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">منصة الأسعار العالمية (GPP)</h4>
                    <h5 className="text-sm text-slate-500 font-medium">{reportTitle}</h5>
                  </div>
                  <div className="text-sm text-slate-500 font-medium font-mono" dir="ltr">
                    Page {++currentPageNum}
                  </div>
                </div>

                  <div className="relative z-10">
                    <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2 flex items-center justify-between">
                    <span>الرسم البياني لحركة الأسعار</span>
                    {reportStartDate && reportEndDate && (
                      <span className="text-sm font-normal text-slate-500 font-mono" dir="ltr">
                        {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(reportStartDate))} - {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(reportEndDate))}
                      </span>
                    )}
                  </h4>
                    <div className="w-full h-[420px] bg-white p-4 border border-slate-200 rounded-lg shadow-sm" style={{ direction: 'ltr' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartInfo.data}>
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
                          {chartInfo.lines.map((symbol, idx) => (
                            <Line 
                              key={symbol}
                              type="monotone" 
                              dataKey={symbol} 
                              name={symbol}
                              stroke={chartInfo.lines.length === 1 ? '#D4AF37' : chartColors[idx % chartColors.length]} 
                              strokeWidth={2} 
                              dot={{ r: 3, fill: chartInfo.lines.length === 1 ? '#D4AF37' : chartColors[idx % chartColors.length] }} 
                              activeDot={{ r: 6 }} 
                              isAnimationActive={false} 
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="absolute bottom-12 left-12 right-12 border-t-2 border-slate-200 pt-6 flex justify-between items-center text-xs text-slate-500 font-medium z-10 bg-white">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">© Libya Trade Network</span>
                    <span className="text-slate-600">Global Pricing Platform (GPP)</span>
                  </div>
                  <div className="text-left font-bold text-slate-600" dir="ltr">Page {currentPageNum} of {totalPagesCount}</div>
                </div>
                </div>
              )}

                            {/* Data Tables */}
              {pagesData.map((pageData, pageIdx) => (
                <div key={pageIdx} className="report-page shrink-0" data-orientation={pageData.type === 'detailed_table' ? 'landscape' : 'portrait'}>
                  
                  
                  <div className="flex justify-between items-center border-b-2 border-slate-200 pb-4 mb-8 relative z-10">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">منصة الأسعار العالمية (GPP)</h4>
                    <h5 className="text-sm text-slate-500 font-medium">{reportTitle}</h5>
                  </div>
                  <div className="text-sm text-slate-500 font-medium font-mono" dir="ltr">
                    Page {++currentPageNum}
                  </div>
                </div>

                  <div className="relative z-10">
                    {pageData.type === 'detailed_table' ? (
                      <>
                        <h4 className="text-md font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2 flex items-center justify-between">
                          <span>جدول البيانات الشهرية التفصيلي {pageData.isFirstChunk ? '' : '(تابع)'}</span>
                          {reportStartDate && reportEndDate && (
                            <span className="text-xs font-normal text-slate-500" dir="rtl">
                              الفترة: من {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(reportStartDate))} إلى {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(reportEndDate))}
                            </span>
                          )}
                        </h4>

                        {periodHistoryData.length === 1 ? (
                          <div className="p-8 text-center text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded-lg">
                            لا توجد إلا نقطة تاريخية واحدة خلال الفترة المحددة
                          </div>
                        ) : pageData.items.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 font-medium bg-slate-50 border border-slate-200 rounded-lg">
                            لا توجد بيانات تاريخية خلال الفترة المحددة
                          </div>
                        ) : (
                          <table className="report-table">
                            <thead>
                              <tr className="bg-[#0A1128] text-white">
                                <th className="p-1.5 border border-slate-300">التاريخ</th>
                                <th className="p-1.5 border border-slate-300">الرمز</th>
                                <th className="p-1.5 border border-slate-300">اسم السلعة</th>
                                <th className="p-1.5 border border-slate-300">القطاع</th>
                                <th className="p-1.5 border border-slate-300">السعر</th>
                                <th className="p-1.5 border border-slate-300">السعر السابق</th>
                                <th className="p-1.5 border border-slate-300">قيمة التغير</th>
                                <th className="p-1.5 border border-slate-300">نسبة التغير %</th>
                                <th className="p-1.5 border border-slate-300">أعلى سعر</th>
                                <th className="p-1.5 border border-slate-300">أقل سعر</th>
                                <th className="p-1.5 border border-slate-300">المصدر</th>
                                <th className="p-1.5 border border-slate-300">الاتجاه</th>
                                <th className="p-1.5 border border-slate-300">قراءة قصيرة</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pageData.items.map((item: any, itemIdx: number) => {
                                const sectorName = sectors.find((s: any) => s.sector_code === item.sector)?.name_ar || item.sector || '-';
                                
                                const hasPrev = item.previous_price !== null && item.previous_price !== undefined;
                                const changeValue = item.change_val;
                                const changePercent = item.change_pct;
                                
                                const isPositive = changePercent > 0;
                                const isNegative = changePercent < 0;
                                const cpColor = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-slate-400';
                                const cpText = hasPrev ? `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%` : '---';
                                const cvText = hasPrev ? `${changeValue > 0 ? '+' : ''}${Number(changeValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '---';
                                
                                let trend = 'stable';
                                if (hasPrev) {
                                  if (isPositive) trend = 'up';
                                  else if (isNegative) trend = 'down';
                                }

                                let note = 'استقرار';
                                if (hasPrev) {
                                  if (changePercent > 5) note = 'ارتفاع قوي';
                                  else if (changePercent > 0.5) note = 'ارتفاع محدود';
                                  else if (changePercent < -5) note = 'انخفاض قوي';
                                  else if (changePercent < -0.5) note = 'انخفاض محدود';
                                }

                                return (
                                  <tr key={`${item.symbol}-${item.date}-${itemIdx}`} className="even:bg-slate-50">
                                    <td className="p-1 border border-slate-200 font-mono text-slate-500" dir="ltr">
                                      {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(item.date))}
                                    </td>
                                    <td className="p-1 border border-slate-200 font-mono text-slate-500" dir="ltr">{item.symbol}</td>
                                    <td className="p-1 border border-slate-200 font-bold text-[#1e3a8a] truncate max-w-[80px]">{item.name_ar}</td>
                                    <td className="p-1 border border-slate-200 text-slate-600 truncate max-w-[60px]">{sectorName}</td>
                                    <td className="p-1 border border-slate-200 font-mono font-bold text-[#1e3a8a]" dir="ltr">
                                      {Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-1 border border-slate-200 font-mono text-slate-500" dir="ltr">
                                      {hasPrev ? Number(item.previous_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                                    </td>
                                    <td className={`p-1 border border-slate-200 font-mono ${cpColor}`} dir="ltr">{cvText}</td>
                                    <td className={`p-1 border border-slate-200 font-mono font-bold ${cpColor}`} dir="ltr">{cpText}</td>
                                    <td className="p-1 border border-slate-200 font-mono text-amber-700 bg-amber-50/30" dir="ltr">
                                      {item.high ? Number(item.high).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                                    </td>
                                    <td className="p-1 border border-slate-200 font-mono text-blue-700 bg-blue-50/30" dir="ltr">
                                      {item.low ? Number(item.low).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                                    </td>
                                    <td className="p-1 border border-slate-200 text-slate-600 truncate max-w-[70px]">{item.source || '-'}</td>
                                    <td className="p-1 border border-slate-200 text-center">
                                      <span className={trend === 'up' ? 'text-green-600 font-bold' : trend === 'down' ? 'text-red-600 font-bold' : 'text-slate-400 font-bold'}>
                                        {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '-'}
                                      </span>
                                    </td>
                                    <td className="p-1 border border-slate-200 font-medium text-slate-600">{note}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </>
                    ) : pageData.type === 'summary_table' ? (
                      <>
                        <h4 className="text-md font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2 flex items-center justify-between">
                          <span>جدول الملخص الشهري للسلع {pageData.isFirstChunk ? '' : '(تابع)'}</span>
                          {reportStartDate && reportEndDate && (
                            <span className="text-xs font-normal text-slate-500" dir="rtl">
                              الفترة: من {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(reportStartDate))} إلى {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(reportEndDate))}
                            </span>
                          )}
                        </h4>

                        {periodHistoryData.length === 1 ? (
                          <div className="p-8 text-center text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded-lg">
                            لا توجد إلا نقطة تاريخية واحدة خلال الفترة المحددة
                          </div>
                        ) : pageData.items.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 font-medium bg-slate-50 border border-slate-200 rounded-lg">
                            لا توجد بيانات تاريخية خلال الفترة المحددة
                          </div>
                        ) : (
                          <table className="report-table">
                            <thead>
                              <tr className="bg-[#0A1128] text-white">
                                <th className="p-1.5 border border-slate-300">الرمز</th>
                                <th className="p-1.5 border border-slate-300">اسم السلعة</th>
                                <th className="p-1.5 border border-slate-300">القطاع</th>
                                <th className="p-1.5 border border-slate-300">الوحدة</th>
                                <th className="p-1.5 border border-slate-300">السعر الأول</th>
                                <th className="p-1.5 border border-slate-300">السعر الأخير</th>
                                <th className="p-1.5 border border-slate-300">التغير</th>
                                <th className="p-1.5 border border-slate-300">نسبة التغير %</th>
                                <th className="p-1.5 border border-slate-300">أعلى سعر</th>
                                <th className="p-1.5 border border-slate-300">أقل سعر</th>
                                <th className="p-1.5 border border-slate-300">المتوسط</th>
                                <th className="p-1.5 border border-slate-300">المصدر</th>
                                <th className="p-1.5 border border-slate-300">الاتجاه</th>
                                <th className="p-1.5 border border-slate-300">التحليل</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pageData.items.map((item: any, itemIdx: number) => {
                                const sectorName = sectors.find((s: any) => s.sector_code === item.sector)?.name_ar || item.sector || '-';
                                
                                const changeValue = item.change_value;
                                const changePercent = item.change_percent;
                                
                                const isPositive = changePercent > 0;
                                const isNegative = changePercent < 0;
                                const cpColor = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-slate-400';
                                const cpText = `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`;
                                const cvText = `${changeValue > 0 ? '+' : ''}${Number(changeValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                                return (
                                  <tr key={`${item.symbol}-${itemIdx}`} className="even:bg-slate-50">
                                    <td className="p-1 border border-slate-200 font-mono text-slate-500" dir="ltr">{item.symbol}</td>
                                    <td className="p-1 border border-slate-200 font-bold text-[#1e3a8a] truncate max-w-[80px]">{item.name_ar}</td>
                                    <td className="p-1 border border-slate-200 text-slate-600 truncate max-w-[60px]">{sectorName}</td>
                                    <td className="p-1 border border-slate-200 text-slate-500 font-mono" dir="ltr">{item.unit}</td>
                                    <td className="p-1 border border-slate-200 font-mono text-slate-500" dir="ltr">
                                      {Number(item.previous_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-1 border border-slate-200 font-mono font-bold text-[#1e3a8a]" dir="ltr">
                                      {Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className={`p-1 border border-slate-200 font-mono ${cpColor}`} dir="ltr">{cvText}</td>
                                    <td className={`p-1 border border-slate-200 font-mono font-bold ${cpColor}`} dir="ltr">{cpText}</td>
                                    <td className="p-1 border border-slate-200 font-mono text-amber-700 bg-amber-50/30" dir="ltr">
                                      {item.high ? Number(item.high).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                                    </td>
                                    <td className="p-1 border border-slate-200 font-mono text-blue-700 bg-blue-50/30" dir="ltr">
                                      {item.low ? Number(item.low).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                                    </td>
                                    <td className="p-1 border border-slate-200 font-mono text-slate-600" dir="ltr">
                                      {Number(item.averagePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-1 border border-slate-200 text-slate-600 truncate max-w-[70px]">{item.source || '-'}</td>
                                    <td className="p-1 border border-slate-200 text-center">
                                      <span className={item.trend === 'up' ? 'text-green-600 font-bold' : item.trend === 'down' ? 'text-red-600 font-bold' : 'text-slate-400 font-bold'}>
                                        {item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '-'}
                                      </span>
                                    </td>
                                    <td className="p-1 border border-slate-200 font-medium text-slate-600">{item.analysis_status}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </>
                    ) : (
                      <>
                        <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2 flex items-center justify-between">
                          <span>جدول السلع - {pageData.sectorName} {pageData.isFirstChunk ? '' : '(تابع)'}</span>
                          {reportStartDate && reportEndDate && (
                            <span className="text-sm font-normal text-slate-500 font-mono" dir="ltr">
                              {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(reportStartDate))} - {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(reportEndDate))}
                            </span>
                          )}
                        </h4>

                        {pageData.isFirstChunk && detailLevel === 'comprehensive_economic' && pageData.analysis && (
                          <div className="mb-6 p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                            <h5 className="font-bold text-[#1e3a8a] mb-2 text-sm">ملخص قطاع {pageData.sectorName}</h5>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              تشير بيانات هذا القطاع خلال الفترة المحددة إلى أن متوسط التغير بلغ <span dir="ltr" className="font-bold">{pageData.analysis.avgCp > 0 ? '+' : ''}{pageData.analysis.avgCp.toFixed(2)}%</span>، 
                              {pageData.analysis.topGainer ? ` مع تسجيل أعلى ارتفاع في سلعة ${pageData.analysis.topGainer.name_ar} بنسبة ${pageData.analysis.topGainer.period_change_percent.toFixed(2)}%،` : ''}
                              {pageData.analysis.topLoser ? ` بينما سجلت سلعة ${pageData.analysis.topLoser.name_ar} أكبر انخفاض بنسبة ${pageData.analysis.topLoser.period_change_percent.toFixed(2)}%.` : '.'}
                              {pageData.analysis.mostVolatile ? ` ويعكس نطاق الأسعار مستوى تذبذب ${pageData.analysis.mostVolatile.analysis_status} خلال الفترة.` : ''}
                            </p>
                          </div>
                        )}

                        <table className="report-table">
                          <thead>
                            <tr className="bg-[#0A1128] text-white">
                              <th className="p-2 border border-slate-300">الرمز</th>
                              <th className="p-2 border border-slate-300">السلعة</th>
                              {detailLevel !== 'brief' && <th className="p-2 border border-slate-300">{(reportType !== 'daily') ? 'آخر سعر' : 'السعر'}</th>}
                              {detailLevel !== 'brief' && <th className="p-2 border border-slate-300">{(reportType !== 'daily') ? 'أول سعر' : 'السابق'}</th>}
                              {detailLevel === 'brief' && <th className="p-2 border border-slate-300">{(reportType !== 'daily') ? 'آخر سعر' : 'السعر'}</th>}
                              <th className="p-2 border border-slate-300">التغير</th>
                              {(detailLevel === 'detailed' || detailLevel === 'analytical' || detailLevel === 'comprehensive_economic') && (
                                <>
                                  <th className="p-2 border border-slate-300">أعلى سعر</th>
                                  <th className="p-2 border border-slate-300">أقل سعر</th>
                                </>
                              )}
                              {(detailLevel === 'analytical' || detailLevel === 'comprehensive_economic') && (
                                <>
                                  <th className="p-2 border border-slate-300">{(reportType !== 'daily') ? 'متوسط السعر' : 'المتوسط'}</th>
                                  <th className="p-2 border border-slate-300">التذبذب</th>
                                  <th className="p-2 border border-slate-300">تحليل</th>
                                </>
                              )}
                              <th className="p-2 border border-slate-300">الاتجاه</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageData.items.map((item: any) => {
                              const analysis = getCommodityAnalysis(item.symbol) || {
                                change_value: 0,
                                change_percent: 0,
                                price: item.price,
                                previous_price: item.previous_price || item.price,
                                maxPrice: item.price,
                                minPrice: item.price,
                                averagePrice: item.price,
                                volatility_percent: 0,
                                analysis_status: '-',
                                trend: item.trend,
                                hasData: false
                              };
                              
                              const isPositive = analysis.change_percent > 0;
                              const isNegative = analysis.change_percent < 0;
                              const cpColor = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-slate-400';
                              const cpText = `${isPositive ? '+' : ''}${analysis.change_percent.toFixed(2)}%`;

                              return (
                                <tr key={item.symbol} className="even:bg-slate-50">
                                  <td className="p-2 border border-slate-200 font-mono text-xs text-slate-500" dir="ltr">{item.symbol}</td>
                                  <td className="p-2 border border-slate-200 font-bold text-[#1e3a8a]">{item.name_ar}</td>
                                  
                                  {!analysis.hasData && reportType !== 'daily' ? (
                                    <td colSpan={detailLevel === 'brief' ? 3 : detailLevel === 'comprehensive_economic' || detailLevel === 'analytical' ? 8 : 6} className="p-2 border border-slate-200 text-center text-slate-400 font-medium bg-slate-50">
                                      لا توجد بيانات تاريخية مسجلة خلال هذه الفترة
                                    </td>
                                  ) : (
                                    <>
                                      {detailLevel !== 'brief' && <td className="p-2 border border-slate-200 font-mono font-bold" dir="ltr">{Number(analysis.price || item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                                      {detailLevel !== 'brief' && <td className="p-2 border border-slate-200 font-mono text-slate-500" dir="ltr">{Number(analysis.previous_price || item.previous_price || item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                                      {detailLevel === 'brief' && <td className="p-2 border border-slate-200 font-mono font-bold" dir="ltr">{Number(analysis.price || item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                                      <td className={`p-2 border border-slate-200 font-mono font-bold ${cpColor}`} dir="ltr">{cpText}</td>
                                      
                                      {(detailLevel === 'detailed' || detailLevel === 'analytical' || detailLevel === 'comprehensive_economic') && (
                                        <>
                                          <td className="p-2 border border-slate-200 font-mono text-amber-700 bg-amber-50/30" dir="ltr">{Number(analysis.maxPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                          <td className="p-2 border border-slate-200 font-mono text-blue-700 bg-blue-50/30" dir="ltr">{Number(analysis.minPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </>
                                      )}
                                      
                                      {(detailLevel === 'analytical' || detailLevel === 'comprehensive_economic') && (
                                        <>
                                          <td className="p-2 border border-slate-200 font-mono" dir="ltr">{Number(analysis.averagePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                          <td className={`p-2 border border-slate-200 font-mono ${analysis.volatility_percent > 10 ? 'text-orange-600 font-bold' : ''}`} dir="ltr">{analysis.volatility_percent.toFixed(2)}%</td>
                                          <td className="p-2 border border-slate-200 text-xs">{analysis.analysis_status}</td>
                                        </>
                                      )}
                                      
                                      <td className="p-2 border border-slate-200 text-center">
                                        <span className={analysis.trend === 'up' ? 'text-green-600 font-bold' : analysis.trend === 'down' ? 'text-red-600 font-bold' : 'text-slate-400 font-bold'}>
                                          {analysis.trend === 'up' ? '▲' : analysis.trend === 'down' ? '▼' : '-'}
                                        </span>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </>
                    )}
                  </div>

                  <div className="absolute bottom-12 left-12 right-12 border-t-2 border-slate-200 pt-6 flex justify-between items-center text-xs text-slate-500 font-medium z-10 bg-white">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">© Libya Trade Network</span>
                    <span className="text-slate-600">Global Pricing Platform (GPP)</span>
                  </div>
                  <div className="text-left font-bold text-slate-600" dir="ltr">Page {currentPageNum} of {totalPagesCount}</div>
                </div>
                </div>
              ))}

                            {/* Monthly Daily Tables */}
              {reportType === 'monthly' && includeDailyTable && monthlyDailyPages.map((pageData, pageIdx) => (
                <div key={`md-${pageIdx}`} className="report-page shrink-0" data-orientation="landscape">
                  
                  
                  <div className="flex justify-between items-center border-b-2 border-slate-200 pb-4 mb-8 relative z-10">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">منصة الأسعار العالمية (GPP)</h4>
                    <h5 className="text-sm text-slate-500 font-medium">{reportTitle}</h5>
                  </div>
                  <div className="text-sm text-slate-500 font-medium font-mono" dir="ltr">
                    Page {++currentPageNum}
                  </div>
                </div>

                  <div className="relative z-10">
                    <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2 flex items-center justify-between">
                      <span>السجلات اليومية: {pageData.name_ar} ({pageData.symbol}) {pageData.isFirstChunk ? '' : '(تابع)'}</span>
                      {reportStartDate && reportEndDate && (
                        <span className="text-sm font-normal text-slate-500 font-mono" dir="ltr">
                          {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(reportStartDate))} - {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(reportEndDate))}
                        </span>
                      )}
                    </h4>

                    <table className="report-table">
                      <thead>
                        <tr className="bg-[#0A1128] text-white">
                          <th className="p-2 border border-slate-300">التاريخ</th>
                          <th className="p-2 border border-slate-300">السعر</th>
                          <th className="p-2 border border-slate-300">السابق</th>
                          <th className="p-2 border border-slate-300">التغير</th>
                          <th className="p-2 border border-slate-300">النسبة</th>
                          <th className="p-2 border border-slate-300">أعلى سعر</th>
                          <th className="p-2 border border-slate-300">أقل سعر</th>
                          <th className="p-2 border border-slate-300">المصدر</th>
                          <th className="p-2 border border-slate-300">الاتجاه</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageData.items.map((h: any, idx: number) => {
                          const allHistory = reportData.history.filter((x: any) => x.symbol === pageData.symbol).sort((a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
                          const currentIndex = allHistory.findIndex((x: any) => x.id === h.id);
                          const prevPrice = currentIndex > 0 ? allHistory[currentIndex - 1].price : h.price;
                          const changeValue = h.price - prevPrice;
                          const changePercent = prevPrice ? (changeValue / prevPrice) * 100 : 0;
                          
                          const isPositive = changePercent > 0;
                          const isNegative = changePercent < 0;
                          const cpColor = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-slate-400';
                          const cpText = `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`;
                          
                          let trend = 'stable';
                          if (isPositive) trend = 'up';
                          else if (isNegative) trend = 'down';

                          return (
                            <tr key={h.id || idx} className="even:bg-slate-50">
                              <td className="p-2 border border-slate-200 font-mono text-xs text-slate-500" dir="ltr">{new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(h.recorded_at))}</td>
                              <td className="p-2 border border-slate-200 font-mono font-bold text-[#1e3a8a]" dir="ltr">{Number(h.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="p-2 border border-slate-200 font-mono text-slate-500" dir="ltr">{Number(prevPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className={`p-2 border border-slate-200 font-mono ${cpColor}`} dir="ltr">{changeValue > 0 ? '+' : ''}{Number(changeValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className={`p-2 border border-slate-200 font-mono font-bold ${cpColor}`} dir="ltr">{cpText}</td>
                              <td className="p-2 border border-slate-200 font-mono text-amber-700 bg-amber-50/30" dir="ltr">{h.high ? Number(h.high).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                              <td className="p-2 border border-slate-200 font-mono text-blue-700 bg-blue-50/30" dir="ltr">{h.low ? Number(h.low).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                              <td className="p-2 border border-slate-200 text-xs text-slate-600">{h.source || '-'}</td>
                              <td className="p-2 border border-slate-200 text-center">
                                <span className={trend === 'up' ? 'text-green-600 font-bold' : trend === 'down' ? 'text-red-600 font-bold' : 'text-slate-400 font-bold'}>
                                  {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '-'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="absolute bottom-12 left-12 right-12 border-t-2 border-slate-200 pt-6 flex justify-between items-center text-xs text-slate-500 font-medium z-10 bg-white">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">© Libya Trade Network</span>
                    <span className="text-slate-600">Global Pricing Platform (GPP)</span>
                  </div>
                  <div className="text-left font-bold text-slate-600" dir="ltr">Page {currentPageNum} of {totalPagesCount}</div>
                </div>
                </div>
              ))}

              {/* News Section */}
              {includeNews && reportData.news && reportData.news.length > 0 && (
                <div className="report-page shrink-0" data-orientation="portrait">
                  
                  
                  <div className="flex justify-between items-center border-b-2 border-slate-200 pb-4 mb-8 relative z-10">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">منصة الأسعار العالمية (GPP)</h4>
                    <h5 className="text-sm text-slate-500 font-medium">{reportTitle}</h5>
                  </div>
                  <div className="text-sm text-slate-500 font-medium font-mono" dir="ltr">
                    Page {++currentPageNum}
                  </div>
                </div>

                  <div className="relative z-10">
                    <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">آخر الأخبار</h4>
                    <div className="space-y-4">
                      {reportData.news.map((item: any) => (
                        <div key={item.id} className="border p-4 rounded-lg bg-white">
                          <div className="font-bold text-slate-800 mb-1">{item.title}</div>
                          <div className="text-xs text-slate-500 mb-2">
                            المصدر: {item.source} | <span dir="ltr">{new Intl.DateTimeFormat('en-GB').format(new Date(item.published_at))}</span>
                          </div>
                          <div className="text-sm text-slate-600">{item.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="absolute bottom-12 left-12 right-12 border-t-2 border-slate-200 pt-6 flex justify-between items-center text-xs text-slate-500 font-medium z-10 bg-white">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">© Libya Trade Network</span>
                    <span className="text-slate-600">Global Pricing Platform (GPP)</span>
                  </div>
                  <div className="text-left font-bold text-slate-600" dir="ltr">Page {currentPageNum} of {totalPagesCount}</div>
                </div>
                </div>
              )}

              {/* Analyses Section */}
              {includeAnalyses && reportData.analyses && reportData.analyses.length > 0 && (
                <div className="report-page shrink-0" data-orientation="portrait">
                  
                  
                  <div className="flex justify-between items-center border-b-2 border-slate-200 pb-4 mb-8 relative z-10">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">منصة الأسعار العالمية (GPP)</h4>
                    <h5 className="text-sm text-slate-500 font-medium">{reportTitle}</h5>
                  </div>
                  <div className="text-sm text-slate-500 font-medium font-mono" dir="ltr">
                    Page {++currentPageNum}
                  </div>
                </div>

                  <div className="relative z-10">
                    <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">أحدث التحليلات</h4>
                    <div className="space-y-4">
                      {reportData.analyses.map((item: any) => (
                        <div key={item.id} className="border p-4 rounded-lg bg-slate-50">
                          <div className="font-bold text-slate-800 mb-1">{item.title}</div>
                          <div className="text-xs text-slate-500 mb-2">
                            الكاتب: {item.author_name} | السلعة: <span dir="ltr">{item.commodity_symbol}</span> | <span dir="ltr">{new Intl.DateTimeFormat('en-GB').format(new Date(item.created_at))}</span>
                          </div>
                          <div className="text-sm text-slate-600">{item.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="absolute bottom-12 left-12 right-12 border-t-2 border-slate-200 pt-6 flex justify-between items-center text-xs text-slate-500 font-medium z-10 bg-white">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">© Libya Trade Network</span>
                    <span className="text-slate-600">Global Pricing Platform (GPP)</span>
                  </div>
                  <div className="text-left font-bold text-slate-600" dir="ltr">Page {currentPageNum} of {totalPagesCount}</div>
                </div>
                </div>
              )}
            </>
          )}

          {adminNotes && (
            <div className="report-page shrink-0" data-orientation="portrait">
              
              
              <div className="flex justify-between items-center border-b-2 border-slate-200 pb-4 mb-8 relative z-10">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">منصة الأسعار العالمية (GPP)</h4>
                    <h5 className="text-sm text-slate-500 font-medium">{reportTitle}</h5>
                  </div>
                  <div className="text-sm text-slate-500 font-medium font-mono" dir="ltr">
                    Page {++currentPageNum}
                  </div>
                </div>

              <div className="relative z-10">
                <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">ملاحظات السوبر أدمن</h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-yellow-50/50 p-4 border border-yellow-200 rounded-lg">{adminNotes}</p>
              </div>

              <div className="absolute bottom-12 left-12 right-12 border-t-2 border-slate-200 pt-6 flex justify-between items-center text-xs text-slate-500 font-medium z-10 bg-white">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">© Libya Trade Network</span>
                    <span className="text-slate-600">Global Pricing Platform (GPP)</span>
                  </div>
                  <div className="text-left font-bold text-slate-600" dir="ltr">Page {currentPageNum} of {totalPagesCount}</div>
                </div>
            </div>
          )}

        </div>
      </div>
    )}
    </div>
  );
};

export default Reports;
