import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Download, Search, Edit2, Trash2, X, RefreshCw, BarChart2, CheckSquare, Square, FileText, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { SectorCatalog, CommodityCatalog } from '../types';
import { formatAdminDateTime } from '../utils/dateUtils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Helper for generating distinct colors for the chart
const CHART_COLORS = [
  '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#f43f5e', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
];

export default function PriceHistory() {
  const { adminUser } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [sectors, setSectors] = useState<SectorCatalog[]>([]);
  const [catalog, setCatalog] = useState<CommodityCatalog[]>([]);
  
  // Filters
  const [sectorFilter, setSectorFilter] = useState('all');
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [searchCommodity, setSearchCommodity] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const [hasAppliedFilter, setHasAppliedFilter] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Edit State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  // Fetch only on apply filter
  useEffect(() => {
    if (hasAppliedFilter) {
      fetchHistory();
    }
  }, [page, hasAppliedFilter]);

  const fetchCatalogs = async () => {
    const [sectorsRes, catalogRes] = await Promise.all([
      supabase.from('sectors_catalog').select('*').order('sort_order', { ascending: true }),
      supabase.from('commodity_catalog').select('*').eq('is_active', true)
    ]);
    if (sectorsRes.data) setSectors(sectorsRes.data);
    if (catalogRes.data) setCatalog(catalogRes.data);
  };

  const applyFilters = () => {
    if (selectedSymbols.length === 0) {
      alert('يرجى اختيار سلعة واحدة على الأقل أو الضغط على عرض الكل');
      return;
    }
    setPage(1);
    setHasAppliedFilter(true);
  };

  const showAllData = () => {
    setSelectedSymbols(catalog.map(c => c.symbol));
    setFromDate('');
    setToDate('');
    setPage(1);
    setHasAppliedFilter(true);
  };

  const resetFilters = () => {
    setSelectedSymbols([]);
    setFromDate('');
    setToDate('');
    setSectorFilter('all');
    setSearchCommodity('');
    setHasAppliedFilter(false);
    setShowChart(false);
    setHistory([]);
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase.from('commodity_price_history').select('*', { count: 'exact' });
      
      if (selectedSymbols.length > 0) {
        query = query.in('symbol', selectedSymbols);
      }
      
      if (fromDate) {
        query = query.gte('recorded_at', new Date(fromDate).toISOString());
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        query = query.lte('recorded_at', to.toISOString());
      }
      
      query = query.order('recorded_at', { ascending: false });
      
      // Pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);
      
      const { data, count, error: err } = await query;
      
      if (err) throw err;
      
      setHistory(data || []);
      if (count !== null) {
        setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
      }
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ في جلب الأرشيف');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (adminUser?.role !== 'super_admin') {
      alert('ليس لديك صلاحية حذف بيانات الأرشيف');
      return;
    }

    if (!window.confirm('هل أنت متأكد من حذف هذا السعر من الأرشيف؟\nهذا الإجراء لا يمكن التراجع عنه.')) {
      return;
    }

    try {
      const { error } = await supabase.from('commodity_price_history').delete().eq('id', item.id);
      if (error) throw error;
      fetchHistory();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setSaving(true);
      const updateData: any = {
        price: editingItem.price,
        previous_price: editingItem.previous_price,
        high: editingItem.high,
        low: editingItem.low,
        source: editingItem.source,
        recorded_at: editingItem.recorded_at,
      };

      const { error } = await supabase.from('commodity_price_history').update(updateData).eq('id', editingItem.id);

      if (error) throw error;
      
      setIsModalOpen(false);
      fetchHistory();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // Date Shortcuts
  const setDateShortcut = (type: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    
    switch (type) {
      case 'today':
        break;
      case '7days':
        start.setDate(today.getDate() - 7);
        break;
      case '30days':
        start.setDate(today.getDate() - 30);
        break;
      case '90days':
        start.setDate(today.getDate() - 90);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      case 'all':
        setFromDate('');
        setToDate('');
        return;
    }
    
    setFromDate(start.toISOString().split('T')[0]);
    setToDate(end.toISOString().split('T')[0]);
  };

  // Exports
  const fetchAllFilteredData = async () => {
    let query = supabase.from('commodity_price_history').select('*');
    if (selectedSymbols.length > 0) query = query.in('symbol', selectedSymbols);
    if (fromDate) query = query.gte('recorded_at', new Date(fromDate).toISOString());
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      query = query.lte('recorded_at', to.toISOString());
    }
    query = query.order('recorded_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  const getMergedDataForExport = (data: any[]) => {
    return data.map(row => {
      const c = catalog.find(x => x.symbol === row.symbol);
      return {
        ...row,
        name_ar: c?.name_ar || '',
        name_en: c?.name_en || '',
        sector: c?.sector || '',
        unit: c?.unit || '',
      };
    });
  };

  const exportExcel = async () => {
    try {
      setLoading(true);
      const data = await fetchAllFilteredData();
      if (!data || data.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
      }
      
      const merged = getMergedDataForExport(data);
      const rows = merged.map(r => ({
        'التاريخ': formatAdminDateTime(r.recorded_at),
        'الرمز': r.symbol,
        'الاسم (عربي)': r.name_ar,
        'الاسم (إنجليزي)': r.name_en,
        'القطاع': r.sector,
        'السعر': r.price,
        'السعر السابق': r.previous_price,
        'التغير': r.change_value,
        'نسبة التغير %': r.change_percent,
        'أعلى سعر': r.high,
        'أقل سعر': r.low,
        'المصدر': r.source,
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Archive');
      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `archive_${today}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      setLoading(true);
      const data = await fetchAllFilteredData();
      if (!data || data.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
      }
      
      const merged = getMergedDataForExport(data);
      const rows = merged.map(r => ({
        Date: r.recorded_at,
        Symbol: r.symbol,
        NameAR: r.name_ar,
        Sector: r.sector,
        Price: r.price,
        PrevPrice: r.previous_price,
        ChangeValue: r.change_value,
        ChangePercent: r.change_percent,
        High: r.high,
        Low: r.low,
        Source: r.source,
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `archive_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setLoading(false);
    }
  };

  const downloadChartPNG = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      link.download = `chart_${today}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحميل الصورة');
    }
  };

  const downloadChartPDF = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      const today = new Date().toISOString().split('T')[0];
      pdf.save(`chart_${today}.pdf`);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحميل ملف PDF');
    }
  };

  // Filter Catalog
  const filteredCatalog = catalog.filter(c => {
    if (sectorFilter !== 'all' && c.sector !== sectorFilter) return false;
    if (searchCommodity) {
      const q = searchCommodity.toLowerCase();
      return c.symbol.toLowerCase().includes(q) || 
             (c.name_ar && c.name_ar.includes(q)) || 
             (c.name_en && c.name_en.toLowerCase().includes(q)) ||
             (c.sector && c.sector.toLowerCase().includes(q));
    }
    return true;
  });

  const toggleCommodity = (symbol: string) => {
    setSelectedSymbols(prev => 
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const selectAllFiltered = () => {
    const toAdd = filteredCatalog.map(c => c.symbol);
    const newSelected = Array.from(new Set([...selectedSymbols, ...toAdd]));
    setSelectedSymbols(newSelected);
  };

  const deselectAllFiltered = () => {
    const toRemove = filteredCatalog.map(c => c.symbol);
    setSelectedSymbols(selectedSymbols.filter(s => !toRemove.includes(s)));
  };

  const invertSelectionFiltered = () => {
    const filteredSymbols = filteredCatalog.map(c => c.symbol);
    const newSelected = selectedSymbols.filter(s => !filteredSymbols.includes(s));
    
    filteredSymbols.forEach(sym => {
      if (!selectedSymbols.includes(sym)) {
        newSelected.push(sym);
      }
    });
    setSelectedSymbols(newSelected);
  };

  // Prepare chart data
  const chartData = React.useMemo(() => {
    if (history.length === 0 || selectedSymbols.length === 0) return [];
    
    // Group history by date
    const grouped = history.reduce((acc, curr) => {
      // Use date string as key to group same days
      const dateKey = curr.recorded_at ? curr.recorded_at.split('T')[0] : curr.created_at.split('T')[0];
      if (!acc[dateKey]) acc[dateKey] = { date: dateKey };
      acc[dateKey][curr.symbol] = curr.price;
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(grouped).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [history, selectedSymbols]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">أرشيف الأسعار</h1>
        <div className="flex gap-2">
           <button 
             onClick={exportCSV}
             disabled={history.length === 0}
             className="flex items-center gap-2 bg-slate-600 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition disabled:opacity-50 text-sm"
           >
             <FileText size={16} />
             تصدير CSV
           </button>
           <button 
             onClick={exportExcel}
             disabled={history.length === 0}
             className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm"
           >
             <Download size={16} />
             تصدير Excel
           </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-dark-card p-6 rounded-xl border dark:border-dark-border space-y-6 shadow-sm">
        
        {/* Row 1: Sector, Commodities, Dates */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">تصفية السلع بالقطاع</label>
            <select 
              value={sectorFilter} 
              onChange={e => setSectorFilter(e.target.value)} 
              className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-bg dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">كل القطاعات</option>
              {sectors.map(s => <option key={s.sector_code} value={s.sector_code}>{s.name_ar}</option>)}
            </select>
          </div>
          
          <div className="md:col-span-5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
              <span>اختيار السلع</span>
              {selectedSymbols.length > 0 && (
                 <span className="text-primary-600 font-bold text-xs bg-primary-50 px-2 py-0.5 rounded-full">تم اختيار {selectedSymbols.length} سلع</span>
              )}
            </label>
            <div className="border dark:border-dark-border rounded-lg overflow-hidden flex flex-col bg-slate-50 dark:bg-dark-bg">
              <div className="p-2 border-b dark:border-dark-border flex gap-2 items-center bg-white dark:bg-dark-card">
                <Search size={16} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder="بحث حسب الرمز، الاسم، أو القطاع..." 
                  value={searchCommodity}
                  onChange={(e) => setSearchCommodity(e.target.value)}
                  className="w-full outline-none text-sm bg-transparent dark:text-white"
                />
              </div>
              
              <div className="p-2 bg-white dark:bg-dark-card border-b dark:border-dark-border flex flex-wrap gap-2 text-xs">
                <button onClick={selectAllFiltered} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300">تحديد الكل</button>
                <button onClick={deselectAllFiltered} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300">إلغاء التحديد</button>
                <button onClick={invertSelectionFiltered} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300">عكس التحديد</button>
              </div>

              <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                {filteredCatalog.map(c => (
                  <label key={c.symbol} className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition">
                    <input 
                      type="checkbox" 
                      checked={selectedSymbols.includes(c.symbol)}
                      onChange={() => toggleCommodity(c.symbol)}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-bold">{c.symbol}</span> - {c.name_ar} - {sectors.find(s => s.sector_code === c.sector)?.name_ar || c.sector}
                    </span>
                  </label>
                ))}
                {filteredCatalog.length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-500">لا توجد سلع مطابقة للبحث</div>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-4 space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">من تاريخ</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-bg dark:text-white focus:ring-2 focus:ring-primary-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">إلى تاريخ</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-bg dark:text-white focus:ring-2 focus:ring-primary-500 text-sm" />
              </div>
          </div>
        </div>

        {/* Row 2: Actions */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between border-t dark:border-dark-border pt-6">
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start items-center">
            <span className="text-sm font-medium text-slate-500 py-1 mr-2">اختصارات التاريخ:</span>
            <button onClick={() => setDateShortcut('today')} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition font-medium">اليوم</button>
            <button onClick={() => setDateShortcut('7days')} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition font-medium">آخر 7 أيام</button>
            <button onClick={() => setDateShortcut('30days')} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition font-medium">آخر 30 يوم</button>
            <button onClick={() => setDateShortcut('90days')} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition font-medium">آخر 90 يوم</button>
            <button onClick={() => setDateShortcut('thisMonth')} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition font-medium">هذا الشهر</button>
            <button onClick={() => setDateShortcut('lastMonth')} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition font-medium">الشهر السابق</button>
            <button onClick={() => setDateShortcut('thisYear')} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition font-medium">هذا العام</button>
            <button onClick={() => setDateShortcut('all')} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition font-medium">الكل</button>
          </div>

          <div className="flex gap-3">
            <button onClick={resetFilters} className="px-4 py-2 border border-slate-300 dark:border-dark-border text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition font-medium text-sm">إعادة ضبط</button>
            <button onClick={showAllData} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition font-medium text-sm">عرض الكل</button>
            <button onClick={applyFilters} className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium text-sm flex items-center gap-2 shadow-sm">
              <Filter size={16} />
              تطبيق الفلتر
            </button>
          </div>
        </div>
      </div>

      {!hasAppliedFilter && (
        <div className="bg-white dark:bg-dark-card rounded-xl p-16 text-center border dark:border-dark-border shadow-sm">
           <Filter className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
           <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">تحديد بيانات الأرشيف</h3>
           <p className="text-slate-500">يرجى اختيار السلع المطلوبة وتحديد فترة التاريخ لعرض أو تصدير الأرشيف بدقة وسرعة</p>
        </div>
      )}

      {hasAppliedFilter && loading && (
         <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border">
            <RefreshCw className="w-10 h-10 text-primary-500 animate-spin mb-4" />
            <p className="text-slate-500">جاري جلب بيانات الأرشيف...</p>
         </div>
      )}

      {hasAppliedFilter && !loading && error && (
         <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-center">{error}</div>
      )}

      {hasAppliedFilter && !loading && !error && history.length === 0 && (
         <div className="bg-white dark:bg-dark-card rounded-xl p-16 text-center border dark:border-dark-border shadow-sm">
           <Search className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
           <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">لا توجد بيانات مطابقة</h3>
           <p className="text-slate-500">لم يتم العثور على أي سجلات في الأرشيف حسب الفلاتر المحددة.</p>
        </div>
      )}

      {hasAppliedFilter && !loading && history.length > 0 && (
        <div className="space-y-6">
          
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setShowChart(!showChart)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition font-medium text-sm text-slate-700 dark:text-slate-300 shadow-sm"
            >
               <BarChart2 size={18} />
               {showChart ? 'إخفاء الرسم البياني' : 'عرض الرسم البياني للسلع المحددة'}
            </button>
          </div>

          {/* Chart Section */}
          {showChart && (
            <div className="bg-white dark:bg-dark-card p-6 rounded-xl border dark:border-dark-border shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                 <div>
                   <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">الرسم البياني لحركة السعر</h3>
                   <p className="text-xs text-slate-500">مقارنة أسعار السلع المحددة خلال الفترة الزمنية المختارة</p>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={downloadChartPNG} className="flex items-center gap-1 text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition font-medium">
                      <Download size={14} />
                      تحميل PNG
                    </button>
                    <button onClick={downloadChartPDF} className="flex items-center gap-1 text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition font-medium">
                      <Download size={14} />
                      تحميل PDF
                    </button>
                 </div>
              </div>
              <div ref={chartRef} className="h-96 w-full bg-white dark:bg-dark-card p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{fontSize: 12, fill: '#64748b'}} 
                      tickMargin={12}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis 
                      tick={{fontSize: 12, fill: '#64748b'}} 
                      domain={['auto', 'auto']}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => value.toLocaleString()}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                      labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {selectedSymbols.map((symbol, idx) => {
                      const color = CHART_COLORS[idx % CHART_COLORS.length];
                      const c = catalog.find(x => x.symbol === symbol);
                      return (
                        <Line 
                          key={symbol} 
                          type="monotone" 
                          dataKey={symbol} 
                          name={c?.name_ar || symbol}
                          stroke={color} 
                          strokeWidth={2.5}
                          dot={{r: 4, strokeWidth: 2}}
                          activeDot={{r: 6, strokeWidth: 0}}
                          connectNulls
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-dark-card rounded-xl border dark:border-dark-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b dark:border-dark-border">
                  <tr>
                    <th className="px-4 py-4 font-semibold w-10">
                      <div className="flex items-center justify-center">
                        <CheckSquare size={16} className="text-slate-400" />
                      </div>
                    </th>
                    <th className="px-4 py-4 font-semibold">التاريخ</th>
                    <th className="px-4 py-4 font-semibold">الرمز</th>
                    <th className="px-4 py-4 font-semibold">السلعة</th>
                    <th className="px-4 py-4 font-semibold">القطاع</th>
                    <th className="px-4 py-4 font-semibold text-left">السعر</th>
                    <th className="px-4 py-4 font-semibold text-left">السعر السابق</th>
                    <th className="px-4 py-4 font-semibold text-left">التغير</th>
                    <th className="px-4 py-4 font-semibold text-left">% التغير</th>
                    <th className="px-4 py-4 font-semibold text-left">أعلى</th>
                    <th className="px-4 py-4 font-semibold text-left">أقل</th>
                    <th className="px-4 py-4 font-semibold">المصدر</th>
                    <th className="px-4 py-4 font-semibold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                  {history.map((item) => {
                    const c = catalog.find(x => x.symbol === item.symbol);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3">
                           <div className="flex items-center justify-center">
                             <input type="checkbox" className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                           </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" dir="ltr">
                          {formatAdminDateTime(item.recorded_at || item.created_at)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {item.symbol}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200 font-medium">
                          {c?.name_ar || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {sectors.find(s => s.sector_code === (c?.sector || item.sector))?.name_ar || item.sector || '-'}
                        </td>
                        <td className="px-4 py-3 text-left font-mono font-bold text-slate-900 dark:text-white">
                          {item.price}
                        </td>
                        <td className="px-4 py-3 text-left font-mono text-slate-500">
                          {item.previous_price || '-'}
                        </td>
                        <td className={`px-4 py-3 text-left font-mono font-bold ${item.change_value > 0 ? 'text-emerald-600' : item.change_value < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                          {item.change_value > 0 ? '+' : ''}{item.change_value}
                        </td>
                        <td className={`px-4 py-3 text-left font-mono font-bold ${item.change_percent > 0 ? 'text-emerald-600' : item.change_percent < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                          {item.change_percent > 0 ? '+' : ''}{item.change_percent}%
                        </td>
                        <td className="px-4 py-3 text-left font-mono text-slate-500">
                          {item.high || '-'}
                        </td>
                        <td className="px-4 py-3 text-left font-mono text-slate-500">
                          {item.low || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {item.source || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                if (!adminUser?.can_manage_prices && adminUser?.role !== 'super_admin') {
                                  alert('ليس لديك صلاحية تعديل بيانات الأرشيف');
                                  return;
                                }
                                setEditingItem({...item, recorded_at: item.recorded_at ? new Date(item.recorded_at).toISOString().slice(0,16) : ''});
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                              title="تعديل"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                              title="حذف"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="p-4 border-t dark:border-dark-border flex justify-center items-center gap-4 bg-slate-50 dark:bg-dark-bg">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50 text-sm font-medium">السابق</button>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">صفحة {page} من {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50 text-sm font-medium">التالي</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-lg border dark:border-dark-border overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b dark:border-dark-border bg-slate-50 dark:bg-dark-bg">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                تعديل الأرشيف
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">السعر</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    required
                    value={editingItem?.price || ''} 
                    onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value) || 0})} 
                    className="w-full border dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:bg-dark-bg dark:text-white transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">السعر السابق</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={editingItem?.previous_price || ''} 
                    onChange={e => setEditingItem({...editingItem, previous_price: parseFloat(e.target.value) || 0})} 
                    className="w-full border dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:bg-dark-bg dark:text-white transition"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">أعلى سعر (اختياري)</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={editingItem?.high || ''} 
                    onChange={e => setEditingItem({...editingItem, high: parseFloat(e.target.value) || null})} 
                    className="w-full border dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:bg-dark-bg dark:text-white transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">أقل سعر (اختياري)</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={editingItem?.low || ''} 
                    onChange={e => setEditingItem({...editingItem, low: parseFloat(e.target.value) || null})} 
                    className="w-full border dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:bg-dark-bg dark:text-white transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">المصدر (اختياري)</label>
                <input 
                  type="text" 
                  value={editingItem?.source || ''} 
                  onChange={e => setEditingItem({...editingItem, source: e.target.value})} 
                  className="w-full border dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:bg-dark-bg dark:text-white transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">التاريخ والوقت</label>
                <input 
                  type="datetime-local"
                  required
                  value={editingItem?.recorded_at || ''} 
                  onChange={e => setEditingItem({...editingItem, recorded_at: e.target.value})} 
                  className="w-full border dark:border-dark-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:bg-dark-bg dark:text-white transition"
                />
              </div>
              <div className="pt-6 flex justify-end gap-3 border-t dark:border-dark-border">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 border border-slate-300 dark:border-dark-border rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
