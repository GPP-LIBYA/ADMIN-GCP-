import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const ReportSettings: React.FC = () => {
  const { adminUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [logos, setLogos] = useState({
    report_logo_left: 'https://i.postimg.cc/tCPyyJnm/58f6eba6-9dd7-45e2-8434-6730f9b4412c-removebg-preview.png',
    report_logo_middle: 'https://i.postimg.cc/zfx5Psf9/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png',
    report_logo_right: 'https://i.postimg.cc/j2mzhLdn/557538f9788c4d0bacb9518b4e9eaa16.webp'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['report_logo_left', 'report_logo_middle', 'report_logo_right']);

      if (error) throw error;

      if (data && data.length > 0) {
        const newLogos = { ...logos };
        data.forEach(item => {
          if (item.key in newLogos && item.value) {
            newLogos[item.key as keyof typeof logos] = item.value;
          }
        });
        setLogos(newLogos);
      }
    } catch (error) {
      console.error('Error fetching report settings:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Upsert logic for key-value table
      const keys = Object.keys(logos);
      for (const key of keys) {
        const value = logos[key as keyof typeof logos];
        
        // Check if exists
        const { data: existing } = await supabase
          .from('platform_settings')
          .select('id')
          .eq('key', key)
          .maybeSingle();
          
        if (existing) {
          await supabase
            .from('platform_settings')
            .update({ value })
            .eq('key', key);
        } else {
          await supabase
            .from('platform_settings')
            .insert({ key, value, description: 'شعار تقرير' });
        }
      }
      alert('تم حفظ إعدادات الشعارات بنجاح');
    } catch (error: any) {
      console.error('Error saving report settings:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof typeof logos, value: string) => {
    setLogos(prev => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (key: keyof typeof logos, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${key}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('report_logos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('report_logos')
        .getPublicUrl(filePath);

      handleChange(key, publicUrl);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('خطأ أثناء رفع الصورة: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (adminUser?.role !== 'super_admin' && !adminUser?.can_manage_settings) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">ليس لديك صلاحية للوصول إلى هذا القسم</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">إعدادات التقارير</h2>
          <p className="text-slate-500 mt-1">إدارة الشعارات والهوية البصرية للتقارير المصدرة</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading || fetching}
          className="flex items-center gap-2 px-6 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-blue-900 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span>حفظ التعديلات</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-8">
        <h3 className="text-lg font-bold text-[#1e3a8a] border-b pb-2">الشعارات (تظهر في الصفحة الأولى)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Right Logo */}
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700">الشعار الأيمن</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center min-h-[150px] bg-slate-50 relative group">
              {logos.report_logo_right ? (
                <>
                  <img src={logos.report_logo_right} alt="Right Logo" className="h-20 object-contain" />
                  <button onClick={() => handleChange('report_logo_right', '')} className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="text-center text-slate-400">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <span className="text-sm">لا يوجد شعار</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="رابط الصورة (URL)"
                value={logos.report_logo_right}
                onChange={(e) => handleChange('report_logo_right', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-left"
                dir="ltr"
              />
              <label className="flex-shrink-0 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg border border-slate-200 transition-colors flex items-center justify-center">
                <Upload className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('report_logo_right', e)} />
              </label>
            </div>
          </div>

          {/* Middle Logo */}
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700">الشعار الأوسط (شبكة ليبيا للتجارة)</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center min-h-[150px] bg-slate-50 relative group">
              {logos.report_logo_middle ? (
                <>
                  <img src={logos.report_logo_middle} alt="Middle Logo" className="h-20 object-contain" />
                  <button onClick={() => handleChange('report_logo_middle', '')} className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="text-center text-slate-400">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <span className="text-sm">لا يوجد شعار</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="رابط الصورة (URL)"
                value={logos.report_logo_middle}
                onChange={(e) => handleChange('report_logo_middle', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-left"
                dir="ltr"
              />
              <label className="flex-shrink-0 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg border border-slate-200 transition-colors flex items-center justify-center">
                <Upload className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('report_logo_middle', e)} />
              </label>
            </div>
          </div>

          {/* Left Logo */}
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700">الشعار الأيسر</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center min-h-[150px] bg-slate-50 relative group">
              {logos.report_logo_left ? (
                <>
                  <img src={logos.report_logo_left} alt="Left Logo" className="h-20 object-contain" />
                  <button onClick={() => handleChange('report_logo_left', '')} className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="text-center text-slate-400">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <span className="text-sm">لا يوجد شعار</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="رابط الصورة (URL)"
                value={logos.report_logo_left}
                onChange={(e) => handleChange('report_logo_left', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-left"
                dir="ltr"
              />
              <label className="flex-shrink-0 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg border border-slate-200 transition-colors flex items-center justify-center">
                <Upload className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload('report_logo_left', e)} />
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
        <h3 className="text-lg font-bold text-[#1e3a8a] border-b pb-2">معاينة الترويسة (الصفحة الأولى)</h3>
        <div className="border border-slate-200 rounded-lg p-8 bg-white" style={{ minHeight: '200px' }}>
          <div className="flex justify-between items-center mb-6">
            {logos.report_logo_right ? <img src={logos.report_logo_right} alt="Right Logo" className="h-16 w-auto object-contain" /> : <div className="h-16 w-32 bg-slate-100 rounded"></div>}
            {logos.report_logo_middle ? <img src={logos.report_logo_middle} alt="Middle Logo" className="h-16 w-auto object-contain" /> : <div className="h-16 w-32 bg-slate-100 rounded"></div>}
            {logos.report_logo_left ? <img src={logos.report_logo_left} alt="Left Logo" className="h-16 w-auto object-contain" /> : <div className="h-16 w-32 bg-slate-100 rounded"></div>}
          </div>
          <div className="text-center mt-8">
            <h1 className="text-xl font-bold text-[#1e3a8a]">منصة الأسعار العالمية (GCP)</h1>
            <h2 className="text-lg font-bold text-slate-600">Global Prices Platform (GCP)</h2>
            <h3 className="text-lg font-bold text-slate-800 mt-4">عنوان التقرير التجريبي</h3>
            <p className="text-sm text-slate-500 font-mono mt-2" dir="ltr">{new Date().toLocaleString('en-GB')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportSettings;
