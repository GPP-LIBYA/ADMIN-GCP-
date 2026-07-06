import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { X, TrendingUp, Download, Image as ImageIcon, FileText as FileTextIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatAdminDate } from '../utils/dateUtils';

interface PriceChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  commodity: { symbol: string; name_ar: string; name_en: string; sector: string } | null;
}

export default function PriceChartModal({ isOpen, onClose, commodity }: PriceChartModalProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'7' | '30' | '90' | 'all'>('30');
  const chartRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');
  
  useEffect(() => {
    if (isOpen && commodity) {
      fetchHistory();
    }
  }, [isOpen, commodity, timeFilter]);

  const fetchHistory = async () => {
    if (!commodity) return;
    setLoading(true);
    try {
      let query = supabase
        .from('commodity_price_history')
        .select('symbol, price, recorded_at, created_at')
        .eq('symbol', commodity.symbol)
        .order('recorded_at', { ascending: true })
        .limit(100);

      const { data: result, error } = await query;
      if (error) throw error;
      
      let processedData = (result || []).map(row => ({
        ...row,
        date: new Date(row.recorded_at || row.created_at),
        dateStr: formatAdminDate(row.recorded_at || row.created_at)
      }));

      // Filter locally based on timeFilter
      if (timeFilter !== 'all') {
        const days = parseInt(timeFilter);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        processedData = processedData.filter(d => d.date >= cutoff);
      }
      
      setData(processedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !commodity) return null;

  const currentPrice = data.length > 0 ? data[data.length - 1].price : 0;
  const firstPrice = data.length > 0 ? data[0].price : 0;
  const maxPrice = data.length > 0 ? Math.max(...data.map(d => d.price)) : 0;
  const minPrice = data.length > 0 ? Math.min(...data.map(d => d.price)) : 0;
  const avgPrice = data.length > 0 ? data.reduce((acc, curr) => acc + curr.price, 0) / data.length : 0;
  const changeValue = currentPrice - firstPrice;
  const changePercent = firstPrice !== 0 ? (changeValue / firstPrice) * 100 : 0;

  const getFormattedDate = () => {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  };

  const handleDownloadPNG = async () => {
    if (!chartRef.current || data.length === 0) return;
    setIsDownloading(true);
    setDownloadMessage('جاري تجهيز الملف...');
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: '#0A1128',
        useCORS: true
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${commodity.symbol}-price-chart-${getFormattedDate().replace(/\//g, '-')}.png`;
      link.href = dataUrl;
      link.click();
      setDownloadMessage('تم تحميل الرسم البياني بنجاح');
    } catch (err) {
      console.error(err);
      setDownloadMessage('حدث خطأ أثناء التحميل');
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadMessage('');
      }, 2000);
    }
  };

  const handleDownloadPDF = async () => {
    if (!chartRef.current || data.length === 0) return;
    setIsDownloading(true);
    setDownloadMessage('جاري تجهيز الملف...');
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: '#0A1128',
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${commodity.symbol}-price-chart-${getFormattedDate().replace(/\//g, '-')}.pdf`);
      setDownloadMessage('تم تحميل الرسم البياني بنجاح');
    } catch (err) {
      console.error(err);
      setDownloadMessage('حدث خطأ أثناء التحميل');
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadMessage('');
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-card w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 md:p-6 border-b dark:border-dark-border bg-slate-50 dark:bg-dark-bg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {commodity.name_ar} <span className="text-sm font-mono text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded" dir="ltr">{commodity.symbol}</span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">حركة الأسعار التاريخية</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {downloadMessage && (
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400 hidden sm:inline-block">
                {downloadMessage}
              </span>
            )}
            <button 
              onClick={handleDownloadPNG}
              disabled={isDownloading || data.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-gold text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition text-sm font-medium"
            >
              <ImageIcon size={16} />
              <span className="hidden sm:inline">تحميل PNG</span>
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading || data.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 disabled:opacity-50 transition text-sm font-medium"
            >
              <FileTextIcon size={16} />
              <span className="hidden sm:inline">تحميل PDF</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition mr-2">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setTimeFilter('7')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${timeFilter === '7' ? 'bg-gold text-white' : 'bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>آخر 7 أيام</button>
            <button onClick={() => setTimeFilter('30')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${timeFilter === '30' ? 'bg-gold text-white' : 'bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>آخر 30 يوم</button>
            <button onClick={() => setTimeFilter('90')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${timeFilter === '90' ? 'bg-gold text-white' : 'bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>آخر 90 يوم</button>
            <button onClick={() => setTimeFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${timeFilter === 'all' ? 'bg-gold text-white' : 'bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>الكل</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-slate-50 dark:bg-dark-bg p-4 rounded-xl border dark:border-dark-border">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">السعر الحالي</p>
              <p className="font-mono font-bold text-lg text-slate-900 dark:text-white" dir="ltr">{currentPrice}</p>
            </div>
            <div className="bg-slate-50 dark:bg-dark-bg p-4 rounded-xl border dark:border-dark-border">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">أعلى سعر</p>
              <p className="font-mono font-bold text-lg text-green-600 dark:text-green-400" dir="ltr">{maxPrice}</p>
            </div>
            <div className="bg-slate-50 dark:bg-dark-bg p-4 rounded-xl border dark:border-dark-border">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">أقل سعر</p>
              <p className="font-mono font-bold text-lg text-red-600 dark:text-red-400" dir="ltr">{minPrice}</p>
            </div>
            <div className="bg-slate-50 dark:bg-dark-bg p-4 rounded-xl border dark:border-dark-border">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">متوسط السعر</p>
              <p className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400" dir="ltr">{avgPrice.toFixed(2)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-dark-bg p-4 rounded-xl border dark:border-dark-border">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">نسبة التغير</p>
              <p className={`font-mono font-bold text-lg ${changeValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} dir="ltr">
                {changeValue > 0 ? '+' : ''}{changePercent.toFixed(2)}%
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[280px] md:h-[360px] lg:h-[420px]">
              <div className="animate-spin h-8 w-8 border-4 border-gold border-t-transparent rounded-full"></div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] md:h-[360px] lg:h-[420px] bg-slate-50 dark:bg-dark-bg rounded-xl border dark:border-dark-border border-dashed">
              <p className="text-slate-500 dark:text-slate-400">لا توجد بيانات تاريخية لهذه السلعة</p>
            </div>
          ) : (
            <div ref={chartRef} className="relative bg-[#0A1128] rounded-3xl p-6">
              <img
                src="https://i.postimg.cc/bwVPbtwT/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png"
                alt="LTN Watermark"
                className="absolute inset-0 m-auto w-48 opacity-5 pointer-events-none select-none"
              />
              {/* Header inside the exported image */}
              <div className="flex justify-between items-start mb-6 text-white border-b border-[#1C2E5A] pb-4">
                <div>
                  <h3 className="text-xl font-bold font-sans">{commodity.name_ar}</h3>
                  <p className="text-[#94A3B8] text-sm mt-1">رمز السلعة: <span dir="ltr">{commodity.symbol}</span> | الفترة: {timeFilter === 'all' ? 'الكل' : `آخر ${timeFilter} يوم`}</p>
                </div>
                <div className="text-left" dir="ltr">
                  <p className="text-sm font-bold text-[#D4AF37]">Libya Trade Network</p>
                  <p className="text-xs text-[#94A3B8]">Global Prices Platform</p>
                  <p className="text-xs text-[#64748B] mt-1">{getFormattedDate()}</p>
                </div>
              </div>

              <div className="w-full h-[280px] md:h-[360px] lg:h-[420px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1C2E5A" opacity={0.5} vertical={false} />
                    <XAxis dataKey="dateStr" stroke="#64748B" fontSize={12} tickMargin={10} minTickGap={30} />
                    <YAxis stroke="#64748B" fontSize={12} tickMargin={10} tickFormatter={(val) => val.toFixed(1)} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#121E3D', borderColor: '#1C2E5A', color: '#fff', borderRadius: '8px' }}
                      itemStyle={{ color: '#D4AF37' }}
                      labelStyle={{ color: '#94A3B8', marginBottom: '4px' }}
                      formatter={(value: number) => [value, 'Price']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#D4AF37" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: '#D4AF37', stroke: '#fff', strokeWidth: 2 }}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
