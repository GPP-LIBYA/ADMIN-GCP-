import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Report } from '../types';
import { Search, Filter, Download, Eye, Calendar, FileText, ChevronRight, ChevronLeft, Printer } from 'lucide-react';

export default function PublicReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  
  const [sectors, setSectors] = useState<any[]>([]);
  
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch sectors
    const { data: sectorsData } = await supabase.from('sectors_catalog').select('*');
    if (sectorsData) setSectors(sectorsData);
    
    // Fetch published reports
    const { data: reportsData } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'published')
      .order('report_date', { ascending: false });
      
    if (reportsData) setReports(reportsData);
    
    setLoading(false);
  };

  const trackView = async (report: Report) => {
    setViewingReport(report);
    // Increment view count
    await supabase.rpc('increment_report_views', { report_id: report.id });
    
    // Fallback if RPC doesn't exist (since we couldn't run DDL easily for RPC)
    await supabase.from('reports').update({ views_count: report.views_count + 1 }).eq('id', report.id);
  };

  const trackDownload = async (report: Report) => {
    // Increment download count
    await supabase.from('reports').update({ downloads_count: report.downloads_count + 1 }).eq('id', report.id);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = 
      r.title_ar.includes(searchTerm) || 
      r.title_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tags.some(t => t.includes(searchTerm));
      
    const matchesSector = selectedSector === '' || r.sector === selectedSector;
    
    const reportDate = new Date(r.report_date);
    const matchesYear = selectedYear === '' || reportDate.getFullYear().toString() === selectedYear;
    const matchesMonth = selectedMonth === '' || (reportDate.getMonth() + 1).toString() === selectedMonth;
    
    return matchesSearch && matchesSector && matchesYear && matchesMonth;
  });

  const years = Array.from(new Set(reports.map(r => new Date(r.report_date).getFullYear().toString()))).sort((a,b)=>b.localeCompare(a));
  const months = Array.from({length: 12}, (_, i) => (i + 1).toString());

  if (viewingReport) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewingReport(null)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ChevronRight size={24} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{viewingReport.title_ar}</h1>
              <p className="text-sm text-slate-500" dir="ltr">{viewingReport.title_en}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                const iframe = document.getElementById('pdf-viewer') as HTMLIFrameElement;
                iframe?.contentWindow?.print();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
            >
              <Printer size={18} />
              <span>طباعة</span>
            </button>
            <a 
              href={viewingReport.pdf_url}
              download
              onClick={() => trackDownload(viewingReport)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-lg transition-colors font-bold shadow-sm"
            >
              <Download size={18} />
              <span>تحميل PDF</span>
            </a>
          </div>
        </header>
        
        <main className="flex-1 w-full max-w-5xl mx-auto p-4 flex flex-col">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
            <iframe 
              id="pdf-viewer"
              src={`${viewingReport.pdf_url}#toolbar=0`} 
              className="w-full h-[80vh] border-none"
              title="PDF Viewer"
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1e3a8a] rounded-lg flex items-center justify-center text-white font-bold text-xl">
              GCP
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1e3a8a]">منصة الأسعار العالمية</h1>
              <p className="text-xs text-slate-500 font-medium">التقارير والتحليلات</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">التقارير والدراسات الرسمية</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            تصفح أحدث التقارير والتحليلات الخاصة بأسعار السلع العالمية والمحلية الصادرة عن شبكة ليبيا للتجارة.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="ابحث عن تقرير، كلمات مفتاحية..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white outline-none transition-all"
              />
            </div>
            
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white outline-none transition-all"
            >
              <option value="">جميع القطاعات</option>
              {sectors.map(s => (
                <option key={s.id} value={s.sector_code}>{s.name_ar}</option>
              ))}
            </select>
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white outline-none transition-all"
            >
              <option value="">جميع السنوات</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white outline-none transition-all"
            >
              <option value="">جميع الأشهر</option>
              {months.map(m => (
                <option key={m} value={m}>شهر {m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a]"></div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
            <FileText className="mx-auto h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد تقارير مطابقة</h3>
            <p className="text-slate-500">حاول تغيير معايير البحث أو تصفح جميع التقارير.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredReports.map((report) => (
              <div key={report.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden flex-shrink-0 border-b border-slate-200">
                  {report.cover_image_url ? (
                    <img 
                      src={report.cover_image_url} 
                      alt={report.title_ar} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                      <FileText className="w-20 h-20 text-slate-300" />
                    </div>
                  )}
                  
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <span className="bg-white/90 backdrop-blur text-[#1e3a8a] text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                      {sectors.find(s => s.sector_code === report.sector)?.name_ar || 'عام'}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-3">
                    <Calendar size={14} />
                    <span dir="ltr">{report.report_date}</span>
                    <span className="mx-2">•</span>
                    <span dir="ltr">{formatFileSize(report.file_size)}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2 leading-tight">
                    {report.title_ar}
                  </h3>
                  
                  <p className="text-slate-600 text-sm mb-6 line-clamp-3 leading-relaxed flex-1">
                    {report.description_ar}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {report.tags.map(tag => (
                      <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => trackView(report)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-[#1e3a8a] text-slate-700 hover:text-white rounded-xl transition-colors font-bold text-sm border border-slate-200 hover:border-transparent"
                    >
                      <Eye size={18} />
                      <span>عرض</span>
                    </button>
                    <a 
                      href={report.pdf_url}
                      download
                      onClick={() => trackDownload(report)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-[#1e3a8a] text-slate-700 hover:text-white rounded-xl transition-colors font-bold text-sm border border-slate-200 hover:border-transparent"
                    >
                      <Download size={18} />
                      <span>تحميل</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
