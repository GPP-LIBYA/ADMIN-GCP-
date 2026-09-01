const fs = require('fs');

const content = `import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { SiteVisit } from '../types';
import { Activity, Monitor, Smartphone, Tablet, Globe, HardDrive } from 'lucide-react';
import { formatAdminDateTime } from '../utils/dateUtils';
import { useAuthStore } from '../store/authStore';

export default function Visits() {
  const { adminUser } = useAuthStore();
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    mobile: 0,
    desktop: 0,
    tablet: 0,
    topBrowser: '-',
    topOS: '-'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch total count
      const { count: total, error: errTotal } = await supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true });
        
      if (errTotal && errTotal.code !== '42P01') {
         // ignore table not found if migration not run yet
         console.warn(errTotal);
      }

      // Fetch recent visits for table and stats calculation
      const { data: latestRaw, error: errLatest } = await supabase
        .from('site_visits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
        
      if (errLatest && errLatest.code !== '42P01') {
         throw errLatest;
      }

      const data = latestRaw || [];
      setVisits(data.slice(0, 50)); // Show only latest 50 in table

      // Calculate stats from recent 1000
      let mobile = 0, desktop = 0, tablet = 0;
      const browsers: Record<string, number> = {};
      const osList: Record<string, number> = {};

      data.forEach(v => {
        const type = v.device_type?.toLowerCase() || 'unknown';
        if (type.includes('mobile')) mobile++;
        else if (type.includes('tablet')) tablet++;
        else desktop++;

        const browser = v.browser_name || 'Unknown';
        browsers[browser] = (browsers[browser] || 0) + 1;

        const os = v.operating_system || 'Unknown';
        osList[os] = (osList[os] || 0) + 1;
      });

      const topBrowser = Object.entries(browsers).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
      const topOS = Object.entries(osList).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

      setStats({
        total: total || data.length,
        mobile,
        desktop,
        tablet,
        topBrowser,
        topOS
      });

    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ في جلب بيانات الزيارات');
    } finally {
      setLoading(false);
    }
  };

  if (loading && visits.length === 0) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;

  const isSuperAdmin = adminUser?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إحصائيات الزوار</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
            <Activity size={20} />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">إجمالي الزيارات</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{stats.total.toLocaleString('en-US')}</h3>
        </div>
        
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className="p-3 rounded-lg bg-emerald-100 text-emerald-600">
            <Smartphone size={20} />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">الهاتف</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{stats.mobile.toLocaleString('en-US')}</h3>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
            <Monitor size={20} />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">الكمبيوتر</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{stats.desktop.toLocaleString('en-US')}</h3>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
            <Tablet size={20} />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">الأجهزة اللوحية</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{stats.tablet.toLocaleString('en-US')}</h3>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className="p-3 rounded-lg bg-indigo-100 text-indigo-600">
            <Globe size={20} />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">أكثر متصفح</p>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate w-full" title={stats.topBrowser}>{stats.topBrowser}</h3>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className="p-3 rounded-lg bg-rose-100 text-rose-600">
            <HardDrive size={20} />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">أكثر نظام تشغيل</p>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate w-full" title={stats.topOS}>{stats.topOS}</h3>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border overflow-hidden">
        <div className="p-4 border-b dark:border-dark-border bg-slate-50 dark:bg-dark-bg">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">آخر الزيارات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-white dark:bg-dark-card text-slate-500 dark:text-slate-400 border-b dark:border-dark-border">
              <tr>
                <th className="px-4 py-3 font-medium">المسار</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">الجهاز</th>
                <th className="px-4 py-3 font-medium">المتصفح</th>
                <th className="px-4 py-3 font-medium">النظام</th>
                <th className="px-4 py-3 font-medium">الوقـت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-border dark:border-dark-border">
              {visits.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 dark:bg-dark-bg/50">
                  <td className="px-4 py-3 font-mono text-xs text-primary-600" dir="ltr">{v.page_path || v.path}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                    {isSuperAdmin ? (v.visitor_ip || v.ip_address || '-') : '***.***.***.***'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{v.device_type || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{v.browser_name || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{v.operating_system || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {formatAdminDateTime(v.created_at || v.visited_at)}
                  </td>
                </tr>
              ))}
              {visits.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    لا توجد بيانات (يرجى تنفيذ ملف Migration)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/pages/Visits.tsx', content);
