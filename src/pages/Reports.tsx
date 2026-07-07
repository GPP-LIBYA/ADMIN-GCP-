import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { FileText, Download, Image as ImageIcon, RotateCcw, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { CommodityCatalog, SectorCatalog, CommodityPrice, CommodityPriceHistory, NewsArticle, Analysis } from '../types';
import { formatAdminDate } from '../utils/dateUtils';

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
  const [logoUrl, setLogoUrl] = useState<string>('/logo.png');
  
  // Report Options
  const [reportType, setReportType] = useState('general');
  const [sectorFilter, setSectorFilter] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('7');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Content Options
  const [includeNews, setIncludeNews] = useState(true);
  const [includeAnalyses, setIncludeAnalyses] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeTables, setIncludeTables] = useState(true);
  const [executiveSummaryText, setExecutiveSummaryText] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Data State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [isGenerated, setIsGenerated] = useState(false);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      const [sectorsRes, catalogRes, settingsRes] = await Promise.all([
        supabase.from('sectors_catalog').select('*').order('name_ar'),
        supabase.from('commodity_catalog').select('*').order('name_ar'),
        supabase.from('platform_settings').select('*').limit(1).maybeSingle()
      ]);
      if (sectorsRes.data) setSectors(sectorsRes.data);
      if (catalogRes.data) setCatalog(catalogRes.data);
      if (settingsRes.data) {
        setLogoUrl(settingsRes.data.logo_url || (settingsRes.data as any).footer_logo_url || '/logo.png');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Gather base data
      let pricesQuery = supabase.from('commodities').select('*');
      if (sectorFilter && reportType === 'sector') pricesQuery = pricesQuery.eq('sector', sectorFilter);
      if (symbolFilter && (reportType === 'commodity' || reportType === 'detailed_commodity')) pricesQuery = pricesQuery.eq('symbol', symbolFilter);
      const { data: prices } = await pricesQuery;

      let historyQuery = supabase.from('commodity_price_history').select('*');
      if (sectorFilter && reportType === 'sector') historyQuery = historyQuery.eq('sector', sectorFilter);
      if (symbolFilter && (reportType === 'commodity' || reportType === 'detailed_commodity')) historyQuery = historyQuery.eq('symbol', symbolFilter);
      
      if (reportType === 'detailed_commodity') {
        historyQuery = historyQuery.order('recorded_at', { ascending: true });
      }
      
      // Date filtering
      const now = new Date();
      if (periodFilter !== 'all' && periodFilter !== 'custom') {
        const from = new Date();
        from.setDate(now.getDate() - parseInt(periodFilter));
        historyQuery = historyQuery.gte('recorded_at', from.toISOString());
      } else if (periodFilter === 'custom') {
        if (fromDate) historyQuery = historyQuery.gte('recorded_at', new Date(fromDate).toISOString());
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          historyQuery = historyQuery.lte('recorded_at', to.toISOString());
        }
      }
      const { data: history } = await historyQuery;

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

  const generatePDF = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      let fileName = `Report_${new Date().getTime()}.pdf`;
      if (reportType === 'detailed_commodity' && symbolFilter) {
        fileName = `commodity-report-${symbolFilter}-${new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('/').reverse().join('-')}.pdf`;
      }
      pdf.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('حدث خطأ أثناء إنشاء PDF');
    }
  };

  const generatePNG = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `Report_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating PNG:', err);
      alert('حدث خطأ أثناء إنشاء الصورة');
    }
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

  const getChartData = () => {
    if (!reportData || !reportData.history) return { data: [], lines: [] };
    const raw = reportData.history;
    const map = new Map<string, any>();
    const linesSet = new Set<string>();

    raw.forEach((r: any) => {
      const d = new Date(r.recorded_at);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!map.has(dateStr)) {
        map.set(dateStr, { recorded_at: dateStr });
      }
      const entry = map.get(dateStr);
      entry[r.symbol] = r.price;
      linesSet.add(r.symbol);
    });

    const data = Array.from(map.values()).sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
    return { data, lines: Array.from(linesSet) };
  };

  const getDetailedStats = () => {
    if (!reportData || !reportData.prices || reportData.prices.length === 0 || reportType !== 'detailed_commodity') return null;
    const commodity = reportData.prices[0];
    const history = (reportData.history || []).map((h: any) => ({
      ...h,
      recorded_at: h.recorded_at || h.created_at
    }));
    
    let high = commodity.price;
    let low = commodity.price;
    let sum = commodity.price;
    let firstPrice = history.length > 0 ? history[0].price : commodity.price;
    let lastPrice = commodity.price;
    
    let upCount = 0;
    let downCount = 0;
    let stableCount = 0;
    
    let prev = firstPrice;

    history.forEach((h: any) => {
      if (h.price > high) high = h.price;
      if (h.price < low) low = h.price;
      sum += h.price;
      
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

  const stats = getSummaryStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText size={24} className="text-primary-600" />
          منشئ التقارير (Reports Builder)
        </h1>
      </div>

      <div className="bg-white dark:bg-dark-card p-6 rounded-xl border dark:border-dark-border shadow-sm">
        <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">إعدادات التقرير</h2>
        
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
              <option value="comprehensive">تقرير كامل شامل</option>
            </select>
          </div>
          
          {reportType === 'sector' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">القطاع</label>
              <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500">
                <option value="">اختر القطاع</option>
                {sectors.map(s => <option key={s.sector_code} value={s.sector_code}>{s.name_ar}</option>)}
              </select>
            </div>
          )}

          {(reportType === 'commodity' || reportType === 'detailed_commodity') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">السلعة</label>
              <select value={symbolFilter} onChange={e => setSymbolFilter(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500">
                <option value="">اختر السلعة</option>
                {catalog.map(c => <option key={c.symbol} value={c.symbol}>{c.symbol} - {c.name_ar} - {c.name_en}</option>)}
              </select>
            </div>
          )}

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
        </div>

        {periodFilter === 'custom' && (
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
          
          {isGenerated && (
            <>
              <button 
                onClick={generatePDF}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 transition font-medium"
              >
                <Download size={18} /> تحميل PDF
              </button>
              <button 
                onClick={generatePNG}
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition font-medium"
              >
                <ImageIcon size={18} /> تحميل صورة PNG
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
        <div className="bg-slate-200 dark:bg-slate-800 p-8 rounded-xl overflow-x-auto shadow-inner flex justify-center">
          <div 
            ref={reportRef} 
            className="bg-white text-black flex flex-col shadow-lg relative max-w-4xl w-full"
            style={{ fontFamily: 'Tajawal, sans-serif' }}
          >
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none z-0">
              <img src={logoUrl} alt="Watermark" className="w-[80%] max-w-2xl object-contain" crossOrigin="anonymous" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>

            {/* Cover Page */}
            <div className="flex flex-col justify-center min-h-[1122px] px-12 py-16 relative z-10 bg-white" style={{ pageBreakAfter: 'always' }}>
              <div className="text-center pb-8 mb-8">
                <img src={logoUrl} alt="Logo" className="w-[110px] h-[110px] mx-auto mb-8 object-contain" crossOrigin="anonymous" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <h1 className="text-5xl font-extrabold text-[#1e3a8a] mb-4">شبكة ليبيا للتجارة</h1>
                <h2 className="text-3xl text-slate-600 mb-12 font-semibold">Libya Trade Network - Global Prices Platform</h2>
                
                <div className="inline-block border-y-4 border-[#b45309] py-6 px-12 mb-12">
                  <h3 className="text-4xl font-bold text-[#b45309] mb-6">
                    {reportType === 'general' ? 'تقرير الأسعار العام' : 
                     reportType === 'sector' ? 'تقرير القطاع المخصص' : 
                     reportType === 'commodity' ? 'تقرير حركة سلعة محددة' : 
                     reportType === 'detailed_commodity' ? (detailedStats ? `تقرير مفصل عن سلعة: ${detailedStats.commodity.name_ar}` : 'تقرير سلعة مفصل') :
                     reportType === 'comparison' ? 'تقرير المقارنة' : 
                     reportType === 'news_analysis' ? 'تقرير الأخبار والتحليلات' : 
                     reportType === 'daily' ? 'تقرير الأسعار اليومي' : 
                     reportType === 'monthly' ? 'التقرير الشهري' : 'التقرير الشامل'}
                  </h3>
                  <div className="text-xl text-slate-600 font-medium mb-2">
                    الفترة: {periodFilter === 'all' ? 'الكل' : periodFilter === '7' ? 'آخر 7 أيام' : periodFilter === '30' ? 'آخر 30 يوم' : periodFilter === '90' ? 'آخر 90 يوم' : 'مخصصة'}
                  </div>
                  {reportType === 'detailed_commodity' && detailedStats && (
                    <div className="text-lg text-[#1e3a8a] font-bold mb-2">
                      <span className="font-mono" dir="ltr">{detailedStats.commodity.symbol}</span> | {detailedStats.commodity.sector}
                    </div>
                  )}
                  <div className="text-lg text-slate-500 font-medium">
                    تاريخ الإصدار: <span dir="ltr">{new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto text-center border-t-2 border-slate-200 pt-8">
                <div className="text-lg font-bold text-slate-700">
                  تم إنشاء هذا التقرير بواسطة منصة الأسعار العالمية
                </div>
                <div className="text-md font-bold text-slate-500 mt-1">
                  Generated by Global Prices Platform
                </div>
              </div>
            </div>

            {/* Content Pages */}
            <div className="px-12 py-8 relative z-10 bg-white min-h-[1122px] flex flex-col">
              <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
                <img src={logoUrl} className="w-[60%] object-contain grayscale" crossOrigin="anonymous" alt="Watermark" />
              </div>
              
              {/* Small Header */}
              <div className="flex justify-between items-center border-b-2 border-[#1e3a8a] pb-4 mb-8">
                <div className="flex items-center gap-4">
                  <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain" crossOrigin="anonymous" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <div>
                    <h4 className="font-bold text-[#1e3a8a] text-lg">شبكة ليبيا للتجارة - الأسعار العالمية</h4>
                    <h5 className="text-sm text-slate-500 font-medium">
                      {reportType === 'general' ? 'تقرير الأسعار العام' : 
                       reportType === 'sector' ? 'تقرير القطاع المخصص' : 
                       reportType === 'commodity' ? 'تقرير حركة سلعة محددة' : 
                       reportType === 'detailed_commodity' ? 'تقرير سلعة مفصل' :
                       reportType === 'comparison' ? 'تقرير المقارنة' : 
                       reportType === 'news_analysis' ? 'تقرير الأخبار والتحليلات' : 
                       reportType === 'daily' ? 'تقرير الأسعار اليومي' : 
                       reportType === 'monthly' ? 'التقرير الشهري' : 'التقرير الشامل'}
                    </h5>
                  </div>
                </div>
                <div className="text-sm text-slate-500 font-medium font-mono" dir="ltr">
                  {new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}
                </div>
              </div>

            
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
                      <div className={`text-xl font-bold font-mono ${detailedStats.currentChangePercent > 0 ? 'text-green-600' : detailedStats.currentChangePercent < 0 ? 'text-red-600' : 'text-slate-500'}`} dir="ltr">
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
                      <div className={`text-xl font-bold font-mono ${Number(detailedStats.periodChangePercent) > 0 ? 'text-green-600' : Number(detailedStats.periodChangePercent) < 0 ? 'text-red-600' : 'text-slate-500'}`} dir="ltr">
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
            {/* Executive Summary */}
            <div className="mb-10 relative z-10">
              <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">الملخص التنفيذي</h4>
              {executiveSummaryText && (
                <p className="text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">{executiveSummaryText}</p>
              )}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-center shadow-sm">
                    <div className="text-sm text-slate-500 mb-1 font-medium">إجمالي السلع</div>
                    <div className="text-2xl font-bold text-[#1e3a8a]">{stats.totalCommodities}</div>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-center shadow-sm">
                    <div className="text-sm text-slate-500 mb-1 font-medium">عدد القطاعات</div>
                    <div className="text-2xl font-bold text-[#1e3a8a]">{stats.totalSectors}</div>
                  </div>
                  <div className="bg-green-50 p-4 border border-green-200 rounded-lg text-center shadow-sm">
                    <div className="text-sm text-green-700 mb-1 font-medium">أعلى نسبة ارتفاع</div>
                    <div className="text-2xl font-bold text-green-700" dir="ltr">+{stats.maxInc.toFixed(2)}%</div>
                  </div>
                  <div className="bg-red-50 p-4 border border-red-200 rounded-lg text-center shadow-sm">
                    <div className="text-sm text-red-700 mb-1 font-medium">أعلى نسبة انخفاض</div>
                    <div className="text-2xl font-bold text-red-700" dir="ltr">{stats.maxDec.toFixed(2)}%</div>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-center shadow-sm">
                    <div className="text-sm text-slate-500 mb-1 font-medium">متوسط التغير</div>
                    <div className="text-xl font-bold text-slate-700" dir="ltr">{stats.avgCp > 0 ? '+' : ''}{stats.avgCp.toFixed(2)}%</div>
                  </div>
                  <div className="bg-green-50 p-4 border border-green-200 rounded-lg text-center shadow-sm">
                    <div className="text-sm text-green-700 mb-1 font-medium">السلع الصاعدة</div>
                    <div className="text-xl font-bold text-green-700">{stats.upCount}</div>
                  </div>
                  <div className="bg-red-50 p-4 border border-red-200 rounded-lg text-center shadow-sm">
                    <div className="text-sm text-red-700 mb-1 font-medium">السلع الهابطة</div>
                    <div className="text-xl font-bold text-red-700">{stats.downCount}</div>
                  </div>
                  <div className="bg-slate-100 p-4 border border-slate-300 rounded-lg text-center shadow-sm">
                    <div className="text-sm text-slate-600 mb-1 font-medium">السلع المستقرة</div>
                    <div className="text-xl font-bold text-slate-600">{stats.stableCount}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Prices Table */}
            {includeTables && reportData.prices && reportData.prices.length > 0 && (
              <div className="mb-10 relative z-10">
                <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">الأسعار الحالية</h4>
                <table className="w-full text-sm text-right border-collapse">
                  <thead>
                    <tr className="bg-[#1e3a8a] text-white">
                      <th className="p-2 border border-slate-300">الرمز</th>
                      <th className="p-2 border border-slate-300">الاسم</th>
                      <th className="p-2 border border-slate-300">القطاع</th>
                      <th className="p-2 border border-slate-300">السعر الحالي</th>
                      <th className="p-2 border border-slate-300">السعر السابق</th>
                      <th className="p-2 border border-slate-300">قيمة التغير</th>
                      <th className="p-2 border border-slate-300 text-center">نسبة التغير %</th>
                      <th className="p-2 border border-slate-300">أعلى سعر</th>
                      <th className="p-2 border border-slate-300">أقل سعر</th>
                      <th className="p-2 border border-slate-300">الاتجاه</th>
                      <th className="p-2 border border-slate-300">المصدر</th>
                      <th className="p-2 border border-slate-300">آخر تحديث</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.prices.map((item: any) => {
                      let cp = item.change_percent;
                      if (cp === null || cp === undefined) {
                        if (item.previous_price && item.previous_price > 0) {
                          cp = ((item.price - item.previous_price) / item.previous_price) * 100;
                        }
                      }
                      
                      let cpText = '---';
                      let cpColor = 'text-slate-500';
                      if (cp !== null && cp !== undefined && !isNaN(cp)) {
                        if (cp > 0) { cpText = `+${cp.toFixed(2)}%`; cpColor = 'text-green-600'; }
                        else if (cp < 0) { cpText = `${cp.toFixed(2)}%`; cpColor = 'text-red-600'; }
                        else { cpText = `0.00%`; cpColor = 'text-slate-500'; }
                      }

                      // Find high and low from history
                      const itemHistory = reportData.history?.filter((h: any) => h.symbol === item.symbol) || [];
                      let high = item.price;
                      let low = item.price;
                      if (itemHistory.length > 0) {
                        const prices = itemHistory.map((h: any) => h.price);
                        high = Math.max(item.price, ...prices);
                        low = Math.min(item.price, ...prices);
                      }

                      return (
                      <tr key={item.id} className="even:bg-slate-50">
                        <td className="p-2 border border-slate-200 font-mono text-xs" dir="ltr">{item.symbol}</td>
                        <td className="p-2 border border-slate-200 text-xs">
                          <div className="font-bold">{item.name_ar}</div>
                          <div className="text-slate-500 font-mono text-[10px]" dir="ltr">{item.name_en}</div>
                        </td>
                        <td className="p-2 border border-slate-200 text-xs">{item.sector}</td>
                        <td className="p-2 border border-slate-200 font-mono font-bold" dir="ltr">
                          {Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 border border-slate-200 font-mono text-slate-500" dir="ltr">
                          {item.previous_price ? Number(item.previous_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="p-2 border border-slate-200 font-mono text-xs" dir="ltr">
                          {item.change_value ? Number(item.change_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className={`p-2 border border-slate-200 font-mono text-center text-xs font-bold ${cpColor}`} dir="ltr">
                          {cpText}
                        </td>
                        <td className="p-2 border border-slate-200 font-mono text-xs text-green-700" dir="ltr">
                          {Number(high).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 border border-slate-200 font-mono text-xs text-red-700" dir="ltr">
                          {Number(low).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 border border-slate-200 text-center text-xs">
                          <span className={item.trend === 'up' ? 'text-green-600 font-bold' : item.trend === 'down' ? 'text-red-600 font-bold' : 'text-slate-400 font-bold'}>
                            {item.trend === 'up' ? '▲ صاعد' : item.trend === 'down' ? '▼ هابط' : '- مستقر'}
                          </span>
                        </td>
                        <td className="p-2 border border-slate-200 text-[10px] text-slate-600">
                          {item.source || '-'}
                        </td>
                        <td className="p-2 border border-slate-200 font-mono text-[10px] text-slate-500" dir="ltr">
                          {item.updated_at ? new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(item.updated_at)) : '-'}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Charts Section */}
            {includeCharts && chartInfo.data.length > 0 && (
              <div className="mb-10 relative z-10 break-inside-avoid">
                <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">الرسم البياني لحركة الأسعار</h4>
                <div className="h-80 w-full bg-white p-4 border border-slate-200 rounded-lg shadow-sm" style={{ direction: 'ltr' }}>
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
            )}

            {/* News Section */}
            {includeNews && reportData.news && reportData.news.length > 0 && (
              <div className="mb-10 relative z-10">
                <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">آخر الأخبار</h4>
                <div className="space-y-4">
                  {reportData.news.map((item: any) => (
                    <div key={item.id} className="border p-4 rounded-lg">
                      <div className="font-bold text-slate-800 mb-1">{item.title}</div>
                      <div className="text-xs text-slate-500 mb-2">
                        المصدر: {item.source} | <span dir="ltr">{new Intl.DateTimeFormat('en-GB').format(new Date(item.published_at))}</span>
                      </div>
                      <div className="text-sm text-slate-600 line-clamp-2">{item.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analyses Section */}
            {includeAnalyses && reportData.analyses && reportData.analyses.length > 0 && (
              <div className="mb-10 relative z-10">
                <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">أحدث التحليلات</h4>
                <div className="space-y-4">
                  {reportData.analyses.map((item: any) => (
                    <div key={item.id} className="border p-4 rounded-lg bg-slate-50">
                      <div className="font-bold text-slate-800 mb-1">{item.title}</div>
                      <div className="text-xs text-slate-500 mb-2">
                        الكاتب: {item.author_name} | السلعة: <span dir="ltr">{item.commodity_symbol}</span> | <span dir="ltr">{new Intl.DateTimeFormat('en-GB').format(new Date(item.created_at))}</span>
                      </div>
                      <div className="text-sm text-slate-600 line-clamp-2">{item.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            </>
            )}

            {adminNotes && (
              <div className="mb-10 relative z-10 break-inside-avoid mt-8">
                <h4 className="text-lg font-bold text-[#1e3a8a] mb-4 border-r-4 border-[#b45309] pr-3 bg-slate-50 py-2">ملاحظات السوبر أدمن</h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-yellow-50/50 p-4 border border-yellow-200 rounded-lg">{adminNotes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-auto pt-6 border-t-2 border-slate-200 text-center text-sm text-slate-500 font-medium relative z-10 break-inside-avoid pb-8">
              <p className="font-bold text-slate-800 text-base">تم إنشاء هذا التقرير بواسطة منصة الأسعار العالمية</p>
              <p className="font-bold text-slate-800 mb-2">Generated by Global Prices Platform</p>
              <p>Libya Trade Network</p>
              <p>ADMIN-GCP</p>
              <p className="mt-2 font-mono text-xs" dir="ltr">{new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())}</p>
            </div>
            
            </div> {/* End of Content Pages */}

          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
