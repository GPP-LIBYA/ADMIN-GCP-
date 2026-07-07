import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Download, Search, Filter, Edit2, Trash2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { SectorCatalog, CommodityCatalog } from '../types';
import { formatAdminDateTime } from '../utils/dateUtils';

export default function PriceHistory() {
  const { adminUser } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [sectors, setSectors] = useState<SectorCatalog[]>([]);
  const [catalog, setCatalog] = useState<CommodityCatalog[]>([]);
  
  // Filters
  const [sectorFilter, setSectorFilter] = useState('all');
  const [symbolFilter, setSymbolFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [updateMethodFilter, setUpdateMethodFilter] = useState('all');
  const [adminEmailFilter, setAdminEmailFilter] = useState('');
  
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

  useEffect(() => {
    fetchHistory();
  }, [sectorFilter, symbolFilter, periodFilter, fromDate, toDate, updateMethodFilter, adminEmailFilter, page]);

  const fetchCatalogs = async () => {
    const [sectorsRes, catalogRes] = await Promise.all([
      supabase.from('sectors_catalog').select('*').order('sort_order', { ascending: true }),
      supabase.from('commodity_catalog').select('symbol, name_ar, name_en').eq('is_active', true)
    ]);
    if (sectorsRes.data) setSectors(sectorsRes.data);
    if (catalogRes.data) setCatalog(catalogRes.data);
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase.from('commodity_price_history').select('*', { count: 'exact' });
      
      if (sectorFilter !== 'all') {
        query = query.eq('sector', sectorFilter);
      }
      if (symbolFilter !== 'all') {
        query = query.eq('symbol', symbolFilter);
      }
      
      if (periodFilter !== 'all' && periodFilter !== 'custom') {
        const days = parseInt(periodFilter);
        const from = new Date();
        from.setDate(from.getDate() - days);
        query = query.gte('recorded_at', from.toISOString());
      } else {
        if (fromDate) {
          query = query.gte('recorded_at', new Date(fromDate).toISOString());
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          query = query.lte('recorded_at', to.toISOString());
        }
      }

      if (updateMethodFilter !== 'all') {
        query = query.eq('update_method', updateMethodFilter);
      }
      if (adminEmailFilter) {
        query = query.ilike('admin_email', `%${adminEmailFilter}%`);
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
      console.log('Deleting history record:', item.id);
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
      console.log('Updating history record:', editingItem.id);
      
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

  const exportExcel = async () => {
    if (!adminUser?.can_manage_prices && !adminUser?.can_view_reports && adminUser?.role !== 'super_admin') {
      alert("ليس لديك صلاحية التصدير");
      return;
    }
    
    if (!fromDate && !toDate && sectorFilter === 'all') {
      if (!window.confirm('أنت على وشك تصدير كمية كبيرة من البيانات، هل تريد الاستمرار؟\nيفضل تحديد تاريخ أو قطاع قبل التصدير.')) {
        return;
      }
    }
    
    try {
      setLoading(true);
      let query = supabase.from('commodity_price_history').select('*');
      
      if (sectorFilter !== 'all') query = query.eq('sector', sectorFilter);
      if (symbolFilter !== 'all') query = query.eq('symbol', symbolFilter);
      
      if (periodFilter !== 'all' && periodFilter !== 'custom') {
        const days = parseInt(periodFilter);
        const from = new Date();
        from.setDate(from.getDate() - days);
        query = query.gte('recorded_at', from.toISOString());
      } else {
        if (fromDate) query = query.gte('recorded_at', new Date(fromDate).toISOString());
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          query = query.lte('recorded_at', to.toISOString());
        }
      }

      if (updateMethodFilter !== 'all') query = query.eq('update_method', updateMethodFilter);
      if (adminEmailFilter) query = query.ilike('admin_email', `%${adminEmailFilter}%`);
      
      query = query.order('recorded_at', { ascending: false });
      
      const { data, error: err } = await query;
      if (err) throw err;
      if (!data || data.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
      }
      
      const rows = data.map(r => ({
        symbol: r.symbol,
        name_ar: r.name_ar,
        name_en: r.name_en,
        sector: r.sector,
        price: r.price,
        previous_price: r.previous_price,
        change_value: r.change_value,
        change_percent: r.change_percent,
        trend: r.trend,
        unit: r.unit,
        source: r.source,
        update_method: r.update_method,
        admin_email: r.admin_email,
        recorded_at: formatAdminDateTime(r.recorded_at)
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'History');
      
      let fileName = 'history';
      if (sectorFilter !== 'all') fileName += `_${sectorFilter}`;
      else fileName += '_all';
      
      if (fromDate || toDate) {
         fileName += `_${fromDate || 'start'}_to_${toDate || 'now'}`;
      } else {
         const today = new Date().toISOString().split('T')[0];
         fileName += `_${today}`;
      }
      fileName += '.xlsx';
      
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">أرشيف الأسعار</h1>
        <button 
          onClick={exportExcel}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          <Download size={18} />
          تحميل أرشيف Excel
        </button>
      </div>

      <div className="bg-white dark:bg-dark-card p-4 rounded-xl border dark:border-dark-border space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">القطاع</label>
            <select value={sectorFilter} onChange={e => { setSectorFilter(e.target.value); setPage(1); }} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500 text-sm">
              <option value="all">كل القطاعات</option>
              {sectors.map(s => <option key={s.sector_code} value={s.sector_code}>{s.name_ar}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">السلعة</label>
            <select value={symbolFilter} onChange={e => { setSymbolFilter(e.target.value); setPage(1); }} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500 text-sm">
              <option value="all">كل السلع</option>
              {catalog.map(c => <option key={c.symbol} value={c.symbol}>{c.symbol} - {c.name_ar}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">الفترة</label>
            <select value={periodFilter} onChange={e => { setPeriodFilter(e.target.value); setPage(1); }} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500 text-sm">
              <option value="all">الكل</option>
              <option value="7">آخر 7 أيام</option>
              <option value="30">آخر 30 يوم</option>
              <option value="90">آخر 90 يوم</option>
              <option value="custom">مخصص</option>
            </select>
          </div>
          {periodFilter === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">من تاريخ</label>
                <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">إلى تاريخ</label>
                <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500 text-sm" />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">طريقة التحديث</label>
            <select value={updateMethodFilter} onChange={e => { setUpdateMethodFilter(e.target.value); setPage(1); }} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500 text-sm">
              <option value="all">الكل</option>
              <option value="admin">يدوي (Admin)</option>
              <option value="csv">استيراد (CSV)</option>
              <option value="api">آلي (API)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">الأدمن (البريد)</label>
            <input type="text" placeholder="بحث بالبريد" value={adminEmailFilter} onChange={e => { setAdminEmailFilter(e.target.value); setPage(1); }} className="w-full border dark:border-dark-border rounded-lg px-3 py-2 outline-none dark:bg-dark-card dark:text-white focus:ring-2 focus:ring-primary-500 text-sm" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">جاري التحميل...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 dark:bg-dark-bg text-slate-600 dark:text-slate-400 font-medium border-b dark:border-dark-border">
                <tr>
                  <th className="px-4 py-3">التاريخ والوقت</th>
                  <th className="px-4 py-3">الرمز</th>
                  <th className="px-4 py-3">السعر</th>
                  <th className="px-4 py-3">السعر السابق</th>
                  <th className="px-4 py-3 text-center">التغير</th>
                  <th className="px-4 py-3">أعلى</th>
                  <th className="px-4 py-3">أقل</th>
                  <th className="px-4 py-3">المصدر</th>
                  <th className="px-4 py-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-border dark:border-dark-border">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 dark:bg-dark-bg/50">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs" dir="ltr">
                      {formatAdminDateTime(item.recorded_at)}
                    </td>
                    <td className="px-4 py-3 font-medium font-mono text-slate-900 dark:text-white" dir="ltr">{item.symbol}</td>
                    <td className="px-4 py-3 font-mono font-medium" dir="ltr">
                      <span className={item.trend === 'up' ? 'text-green-600' : item.trend === 'down' ? 'text-red-600' : ''}>
                        {item.price}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400" dir="ltr">
                      {item.previous_price || '-'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs" dir="ltr">
                      <span className={item.change_value > 0 ? 'text-green-600' : item.change_value < 0 ? 'text-red-600' : 'text-slate-500 dark:text-slate-400'}>
                        {item.change_value > 0 ? '+' : ''}{item.change_value} ({item.change_percent}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400" dir="ltr">
                      {item.high || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400" dir="ltr">
                      {item.low || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {item.source || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            if (!adminUser?.can_manage_prices && adminUser?.role !== 'super_admin') {
                              alert('ليس لديك صلاحية تعديل بيانات الأرشيف');
                              return;
                            }
                            setEditingItem({...item, recorded_at: item.recorded_at ? new Date(item.recorded_at).toISOString().slice(0,16) : ''});
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md"
                          title="تعديل"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">لا يوجد بيانات مطابقة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="p-4 border-t dark:border-dark-border flex justify-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border dark:border-dark-border rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-dark-bg disabled:opacity-50">السابق</button>
              <span className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400">صفحة {page} من {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border dark:border-dark-border rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-dark-bg disabled:opacity-50">التالي</button>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b dark:border-dark-border">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                تعديل الأرشيف
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">السعر</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={editingItem?.price || ''} 
                    onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value) || 0})} 
                    className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">السعر السابق</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editingItem?.previous_price || ''} 
                    onChange={e => setEditingItem({...editingItem, previous_price: parseFloat(e.target.value) || 0})} 
                    className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">أعلى سعر (اختياري)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editingItem?.high || ''} 
                    onChange={e => setEditingItem({...editingItem, high: parseFloat(e.target.value) || null})} 
                    className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">أقل سعر (اختياري)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editingItem?.low || ''} 
                    onChange={e => setEditingItem({...editingItem, low: parseFloat(e.target.value) || null})} 
                    className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المصدر (اختياري)</label>
                <input 
                  type="text" 
                  value={editingItem?.source || ''} 
                  onChange={e => setEditingItem({...editingItem, source: e.target.value})} 
                  className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التاريخ والوقت</label>
                <input 
                  type="datetime-local"
                  required
                  value={editingItem?.recorded_at || ''} 
                  onChange={e => setEditingItem({...editingItem, recorded_at: e.target.value})} 
                  className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 border dark:border-dark-border rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50"
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
