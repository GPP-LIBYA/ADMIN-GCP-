import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { PlatformLogoSettings } from '../../types';
import { 
  Save, 
  Upload, 
  Eye, 
  RotateCcw, 
  ShieldAlert, 
  Check, 
  Sliders, 
  Smartphone, 
  Tablet, 
  Monitor, 
  AlignRight, 
  AlignCenter, 
  AlignLeft, 
  ArrowUp, 
  ArrowDown, 
  HelpCircle,
  Copy,
  ExternalLink,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

const DEFAULT_SETTINGS: PlatformLogoSettings = {
  header_logo_enabled: true,
  header_logo_path: '',
  header_logo_height: 36,
  header_logo_alignment: 'right',
  header_logo_order: 'before_text',
  header_logo_gap: 12,

  hero_logo_enabled: true,
  hero_logo_path: '',
  hero_logo_size: 140,
  hero_logo_alignment: 'center',
  hero_logo_vertical_position: 'top',
  hero_logo_offset_y: 0,
};

const SETTING_DESCRIPTIONS: Record<keyof PlatformLogoSettings, string> = {
  header_logo_enabled: 'تفعيل أو إخفاء شعار الهيدر في Public GPP',
  header_logo_path: 'مسار أو رابط شعار الهيدر في Public GPP',
  header_logo_height: 'ارتفاع شعار الهيدر بالبكسل (20 إلى 80)',
  header_logo_alignment: 'محاذاة شعار الهيدر (right / center / left)',
  header_logo_order: 'ترتيب ظهور شعار الهيدر بالنسبة للنص (before_text / after_text)',
  header_logo_gap: 'المسافة بين شعار الهيدر والنص بالبكسل (0 إلى 40)',

  hero_logo_enabled: 'تفعيل أو إخفاء شعار الهيرو في Public GPP',
  hero_logo_path: 'مسار أو رابط شعار الهيرو في Public GPP',
  hero_logo_size: 'حجم شعار الهيرو بالبكسل (80 إلى 400)',
  hero_logo_alignment: 'محاذاة شعار الهيرو أفقياً (right / center / left)',
  hero_logo_vertical_position: 'الموضع الرأسي لشعار الهيرو بالنسبة للعنوان (top / center / bottom)',
  hero_logo_offset_y: 'إزاحة شعار الهيرو الرأسية بالبكسل (-100 إلى 100)',
};

export default function PlatformLogosTab() {
  const { adminUser } = useAuthStore();
  const isSuperAdmin = adminUser?.role === 'super_admin' && adminUser?.is_active === true;

  const [settings, setSettings] = useState<PlatformLogoSettings>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<PlatformLogoSettings>(DEFAULT_SETTINGS);
  const [defaultPlatformLogo, setDefaultPlatformLogo] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Uploading state
  const [uploadingHeader, setUploadingHeader] = useState<boolean>(false);
  const [uploadingHero, setUploadingHero] = useState<boolean>(false);

  // Preview viewport simulation (desktop, tablet, mobile)
  const [headerPreviewDevice, setHeaderPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [heroPreviewDevice, setHeroPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Active section tab: 'header' | 'hero' | 'both'
  const [sectionView, setSectionView] = useState<'all' | 'header' | 'hero'>('all');

  // SQL code box copied state
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const headerFileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      loadSettings();
    }
  }, [isSuperAdmin]);

  // Helper to resolve public URL for Supabase storage paths or HTTP links
  const resolveImageUrl = (pathOrUrl: string): string => {
    if (!pathOrUrl || pathOrUrl.trim() === '') {
      return defaultPlatformLogo || '';
    }
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    // Storage path from platform-logos
    try {
      const { data: platData } = supabase.storage.from('platform-logos').getPublicUrl(pathOrUrl);
      return platData?.publicUrl || pathOrUrl;
    } catch {
      return pathOrUrl;
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      // Load all logo setting keys plus default platform_logo_url
      const keysToFetch = [
        ...Object.keys(DEFAULT_SETTINGS),
        'platform_logo_url'
      ];

      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', keysToFetch);

      if (error) throw error;

      const loadedMap: Record<string, string> = {};
      if (data) {
        data.forEach(item => {
          if (item.key && item.value !== null && item.value !== undefined) {
            loadedMap[item.key] = item.value;
          }
        });
      }

      if (loadedMap.platform_logo_url) {
        setDefaultPlatformLogo(loadedMap.platform_logo_url);
      }

      // Merge loaded settings with default values safely
      const parsed: PlatformLogoSettings = {
        header_logo_enabled: loadedMap.header_logo_enabled !== undefined 
          ? loadedMap.header_logo_enabled === 'true' 
          : DEFAULT_SETTINGS.header_logo_enabled,
        header_logo_path: loadedMap.header_logo_path || '',
        header_logo_height: loadedMap.header_logo_height !== undefined 
          ? Math.min(80, Math.max(20, parseInt(loadedMap.header_logo_height, 10) || DEFAULT_SETTINGS.header_logo_height)) 
          : DEFAULT_SETTINGS.header_logo_height,
        header_logo_alignment: (['right', 'center', 'left'].includes(loadedMap.header_logo_alignment) 
          ? loadedMap.header_logo_alignment 
          : DEFAULT_SETTINGS.header_logo_alignment) as 'right' | 'center' | 'left',
        header_logo_order: (['before_text', 'after_text'].includes(loadedMap.header_logo_order) 
          ? loadedMap.header_logo_order 
          : DEFAULT_SETTINGS.header_logo_order) as 'before_text' | 'after_text',
        header_logo_gap: loadedMap.header_logo_gap !== undefined 
          ? Math.min(40, Math.max(0, parseInt(loadedMap.header_logo_gap, 10) || DEFAULT_SETTINGS.header_logo_gap)) 
          : DEFAULT_SETTINGS.header_logo_gap,

        hero_logo_enabled: loadedMap.hero_logo_enabled !== undefined 
          ? loadedMap.hero_logo_enabled === 'true' 
          : DEFAULT_SETTINGS.hero_logo_enabled,
        hero_logo_path: loadedMap.hero_logo_path || '',
        hero_logo_size: loadedMap.hero_logo_size !== undefined 
          ? Math.min(400, Math.max(80, parseInt(loadedMap.hero_logo_size, 10) || DEFAULT_SETTINGS.hero_logo_size)) 
          : DEFAULT_SETTINGS.hero_logo_size,
        hero_logo_alignment: (['right', 'center', 'left'].includes(loadedMap.hero_logo_alignment) 
          ? loadedMap.hero_logo_alignment 
          : DEFAULT_SETTINGS.hero_logo_alignment) as 'right' | 'center' | 'left',
        hero_logo_vertical_position: (['top', 'center', 'bottom'].includes(loadedMap.hero_logo_vertical_position) 
          ? loadedMap.hero_logo_vertical_position 
          : DEFAULT_SETTINGS.hero_logo_vertical_position) as 'top' | 'center' | 'bottom',
        hero_logo_offset_y: loadedMap.hero_logo_offset_y !== undefined 
          ? Math.min(100, Math.max(-100, parseInt(loadedMap.hero_logo_offset_y, 10) || DEFAULT_SETTINGS.hero_logo_offset_y)) 
          : DEFAULT_SETTINGS.hero_logo_offset_y,
      };

      setSettings(parsed);
      setInitialSettings(parsed);
    } catch (err: any) {
      console.error('Error loading platform logo settings:', err);
      setErrorMessage('حدث خطأ أثناء تحميل إعدادات الشعارات من قاعدة البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (type: 'header' | 'hero', file: File) => {
    if (!isSuperAdmin) {
      alert('غير مصرح لك بتنفيذ هذه العملية');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت');
      return;
    }

    const setUploading = type === 'header' ? setUploadingHeader : setUploadingHero;
    setUploading(true);
    setErrorMessage(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const sanitizedExt = ext.replace(/[^a-z0-9]/gi, '');
      const uniqueName = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${sanitizedExt}`;
      const filePath = `${type}/${uniqueName}`;

      // Upload exclusively to 'platform-logos' bucket with subfolders header/ or hero/
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('platform-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false // Standard INSERT operation with unique file name
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'فشل رفع الصورة إلى سحابة التخزين');
      }

      if (!uploadData?.path) {
        throw new Error('لم يتم استرجاع مسار الملف بعد الرفع');
      }

      // Store the exact storage path (e.g., 'header/header_1750000000.png')
      const storedPath = uploadData.path;

      if (type === 'header') {
        setSettings(prev => ({ ...prev, header_logo_path: storedPath }));
      } else {
        setSettings(prev => ({ ...prev, hero_logo_path: storedPath }));
      }
      setErrorMessage(null);
    } catch (err: any) {
      console.error(`Error uploading ${type} logo:`, err);
      const msg = err.message || 'فشل رفع الصورة إلى platform-logos';
      setErrorMessage(`خطأ في رفع صورة ${type === 'header' ? 'الهيدر' : 'الهيرو'}: ${msg}`);
      alert(`خطأ أثناء رفع الصورة: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!isSuperAdmin) {
      alert('ليس لديك صلاحية لتنفيذ هذه العملية. الميزة مخصصة للمدير العام (Super Admin) فقط.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSaveSuccess(false);

      // Strictly disallow Base64 / data:image/... strings in platform settings
      if (settings.header_logo_path.startsWith('data:') || settings.hero_logo_path.startsWith('data:')) {
        throw new Error('ممنوع تخزين صورة بصيغة Base64 في إعدادات المنصة. يرجى رفع الملف إلى platform-logos.');
      }

      // Validate constraints before saving
      const validated: PlatformLogoSettings = {
        header_logo_enabled: Boolean(settings.header_logo_enabled),
        header_logo_path: settings.header_logo_path.trim(),
        header_logo_height: Math.min(80, Math.max(20, Number(settings.header_logo_height) || 36)),
        header_logo_alignment: settings.header_logo_alignment,
        header_logo_order: settings.header_logo_order,
        header_logo_gap: Math.min(40, Math.max(0, Number(settings.header_logo_gap) || 0)),

        hero_logo_enabled: Boolean(settings.hero_logo_enabled),
        hero_logo_path: settings.hero_logo_path.trim(),
        hero_logo_size: Math.min(400, Math.max(80, Number(settings.hero_logo_size) || 140)),
        hero_logo_alignment: settings.hero_logo_alignment,
        hero_logo_vertical_position: settings.hero_logo_vertical_position,
        hero_logo_offset_y: Math.min(100, Math.max(-100, Number(settings.hero_logo_offset_y) || 0)),
      };

      // Save each setting into platform_settings table
      const keys = Object.keys(validated) as Array<keyof PlatformLogoSettings>;
      
      for (const key of keys) {
        const value = String(validated[key]);
        const description = SETTING_DESCRIPTIONS[key] || 'إعداد شعار المنصة';

        // Check if key already exists
        const { data: existing } = await supabase
          .from('platform_settings')
          .select('id')
          .eq('key', key)
          .maybeSingle();

        if (existing) {
          const { error: updateError } = await supabase
            .from('platform_settings')
            .update({ 
              value, 
              description,
              updated_at: new Date().toISOString() 
            })
            .eq('key', key);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('platform_settings')
            .insert({ 
              key, 
              value, 
              description, 
              updated_at: new Date().toISOString() 
            });

          if (insertError) throw insertError;
        }
      }

      setSettings(validated);
      setInitialSettings(validated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving logo settings:', err);
      setErrorMessage(`حدث خطأ أثناء حفظ الإعدادات: ${err.message || 'تحقق من صلاحيات Super Admin وقاعدة البيانات'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('هل أنت متأكد من التراجع عن جميع التغييرات غير المحفوظة والعودة للقيم السابقة؟')) {
      setSettings(initialSettings);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('هل ترغب في إعادة جميع إعدادات شعار الهيدر والهيرو إلى القيم الافتراضية القياسية؟')) {
      setSettings({
        ...DEFAULT_SETTINGS,
        header_logo_path: defaultPlatformLogo,
        hero_logo_path: defaultPlatformLogo,
      });
    }
  };

  const copySqlToClipboard = () => {
    const sql = `-- ==============================================================================
-- إعدادات شعارات المنصة (Header & Hero Logos) في public.platform_settings
-- ==============================================================================
INSERT INTO public.platform_settings (key, value, description, updated_at)
VALUES 
  ('header_logo_enabled', 'true', 'تفعيل أو إخفاء شعار الهيدر في Public GPP', NOW()),
  ('header_logo_path', '', 'مسار أو رابط شعار الهيدر في Public GPP', NOW()),
  ('header_logo_height', '36', 'ارتفاع شعار الهيدر بالبكسل (20 إلى 80)', NOW()),
  ('header_logo_alignment', 'right', 'محاذاة شعار الهيدر (right / center / left)', NOW()),
  ('header_logo_order', 'before_text', 'ترتيب ظهور شعار الهيدر بالنسبة للنص (before_text / after_text)', NOW()),
  ('header_logo_gap', '12', 'المسافة بين شعار الهيدر والنص بالبكسل (0 إلى 40)', NOW()),

  ('hero_logo_enabled', 'true', 'تفعيل أو إخفاء شعار الهيرو في Public GPP', NOW()),
  ('hero_logo_path', '', 'مسار أو رابط شعار الهيرو في Public GPP', NOW()),
  ('hero_logo_size', '140', 'حجم شعار الهيرو بالبكسل (80 إلى 400)', NOW()),
  ('hero_logo_alignment', 'center', 'محاذاة شعار الهيرو أفقياً (right / center / left)', NOW()),
  ('hero_logo_vertical_position', 'top', 'الموضع الرأسي لشعار الهيرو بالنسبة للعنوان (top / center / bottom)', NOW()),
  ('hero_logo_offset_y', '0', 'إزاحة شعار الهيرو الرأسية بالبكسل (-100 إلى 100)', NOW())
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;

-- ==============================================================================
-- إنشاء Bucket مخصص لشعارات المنصة (platform-logos) والتذييل
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('platform-logos', 'platform-logos', true),
  ('footer-logos', 'footer-logos', true),
  ('report_logos', 'report_logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- سياسات RLS للـ Storage
DROP POLICY IF EXISTS "Public Access platform-logos" ON storage.objects;
DROP POLICY IF EXISTS "Public view platform logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload platform-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update platform-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete platform-logos" ON storage.objects;
DROP POLICY IF EXISTS "Super Admin upload platform logos" ON storage.objects;
DROP POLICY IF EXISTS "Super Admin update platform logos" ON storage.objects;
DROP POLICY IF EXISTS "Super Admin delete platform logos" ON storage.objects;

-- قراءة عامة للزوار
CREATE POLICY "Public Access platform-logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id IN ('platform-logos', 'footer-logos', 'report_logos'));

-- رفع وإدارة للمستخدمين المصادق عليهم
CREATE POLICY "Authenticated users can upload platform-logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('platform-logos', 'footer-logos', 'report_logos'));

CREATE POLICY "Authenticated users can update platform-logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('platform-logos', 'footer-logos', 'report_logos'));

CREATE POLICY "Authenticated users can delete platform-logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('platform-logos', 'footer-logos', 'report_logos'));`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Guard for Super Admin
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-dark-card rounded-xl border border-red-200 dark:border-red-900/40 text-center max-w-2xl mx-auto my-8 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">وصول محظور (Super Admin Only)</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
          إدارة شعارات وهوية Public GPP مخصصة حصرياً للمدير العام النشط (Super Admin). حسابك الحالي لا يمتلك الصلاحيات المطلوبة للوصول إلى هذا القسم.
        </p>
        <span className="text-xs font-mono px-3 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800/40">
          Role: {adminUser?.role || 'none'} | Active: {adminUser?.is_active ? 'true' : 'false'}
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
        <span className="text-sm text-slate-500 dark:text-slate-400">جاري تحميل إعدادات شعارات المنصة...</span>
      </div>
    );
  }

  const headerResolvedImage = resolveImageUrl(settings.header_logo_path);
  const heroResolvedImage = resolveImageUrl(settings.hero_logo_path);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Bar */}
      <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border dark:border-dark-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              Super Admin Only
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="text-primary-600 dark:text-primary-400" size={22} />
              إدارة شعارات منصة الأسعار العالمية (Public GPP)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            التحكم الشامل والمستقل في شعار الترويسة (Header Logo) وشعار الواجهة الترحيبية (Hero Logo) لـ Public GPP مع معاينة تفاعلية متجاوبة.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 text-xs font-medium rounded-lg border dark:border-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-border transition flex items-center gap-1.5"
            title="تراجع عن التعديلات غير المحفوظة"
          >
            <RotateCcw size={14} />
            تراجع
          </button>
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3 py-2 text-xs font-medium rounded-lg border dark:border-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-border transition flex items-center gap-1.5"
            title="استعادة القيم الافتراضية"
          >
            <Sliders size={14} />
            القيم الافتراضية
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={15} />
            )}
            حفظ إعدادات الشعارات
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-300 text-sm flex items-center gap-2 animate-in fade-in">
          <Check size={18} className="text-green-600" />
          <span>تم حفظ وتحديث إعدادات شعارات Public GPP بنجاح في قاعدة البيانات!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 text-sm flex items-center gap-2">
          <ShieldAlert size={18} className="text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Section Filter Pills */}
      <div className="flex items-center gap-2 border-b dark:border-dark-border pb-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-2">طريقة العرض:</span>
        <button
          type="button"
          onClick={() => setSectionView('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            sectionView === 'all'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-dark-card text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          كافة الأقسام (Header + Hero)
        </button>
        <button
          type="button"
          onClick={() => setSectionView('header')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            sectionView === 'header'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-dark-card text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          1. شعار الترويسة (Header Logo)
        </button>
        <button
          type="button"
          onClick={() => setSectionView('hero')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            sectionView === 'hero'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-dark-card text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          2. شعار الواجهة الترحيبية (Hero Logo)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. HEADER LOGO SECTION */}
      {/* ========================================================================= */}
      {(sectionView === 'all' || sectionView === 'header') && (
        <div className="bg-white dark:bg-dark-card rounded-2xl border dark:border-dark-border shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="p-5 border-b dark:border-dark-border bg-slate-50/80 dark:bg-dark-bg/60 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  شعار الترويسة (Header Logo)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  الشعار الصغير أعلى الصفحة بجانب اسم المنصة "منصة الأسعار العالمية GPP"
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center gap-3 bg-white dark:bg-dark-card px-3 py-1.5 rounded-xl border dark:border-dark-border">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                حالة العرض:
              </span>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, header_logo_enabled: !prev.header_logo_enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  settings.header_logo_enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.header_logo_enabled ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
              <span className={`text-xs font-bold ${settings.header_logo_enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                {settings.header_logo_enabled ? 'مفعل (ظاهر)' : 'مخفي'}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Form Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column: Image Upload & Source */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    صورة شعار الهيدر (Header Image)
                  </label>
                  
                  {/* File Upload Box */}
                  <div className="border-2 border-dashed border-slate-200 dark:border-dark-border rounded-xl p-4 bg-slate-50/50 dark:bg-dark-bg/40 flex flex-col items-center justify-center text-center">
                    <input
                      ref={headerFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('header', file);
                      }}
                    />

                    {headerResolvedImage ? (
                      <div className="relative group flex flex-col items-center">
                        <div className="p-3 bg-white dark:bg-dark-card rounded-lg border dark:border-dark-border shadow-xs mb-2">
                          <img
                            src={headerResolvedImage}
                            alt="Header Logo Preview"
                            style={{ height: `${Math.min(50, settings.header_logo_height)}px` }}
                            className="max-w-[180px] object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => headerFileInputRef.current?.click()}
                            disabled={uploadingHeader}
                            className="text-xs px-3 py-1 rounded-md bg-primary-50 dark:bg-primary-950/40 text-primary-600 hover:bg-primary-100 transition flex items-center gap-1"
                          >
                            <Upload size={12} />
                            تغيير الصورة
                          </button>
                          {settings.header_logo_path && (
                            <button
                              type="button"
                              onClick={() => setSettings(prev => ({ ...prev, header_logo_path: '' }))}
                              className="text-xs px-2 py-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                              title="استعادة الشعار الافتراضي للمنصة"
                            >
                              إعادة للافتراضي
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mb-2">
                          <Upload size={20} />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                          اسحب الصورة هنا أو اضغط للاختيار
                        </p>
                        <p className="text-[11px] text-slate-400">
                          PNG, SVG, JPG, WebP (بحد أقصى 5MB)
                        </p>
                        <button
                          type="button"
                          onClick={() => headerFileInputRef.current?.click()}
                          disabled={uploadingHeader}
                          className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-dark-card border dark:border-dark-border font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-xs"
                        >
                          {uploadingHeader ? 'جاري الرفع...' : 'اختيار صورة من الجهاز'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct URL / Path input */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    أو أدخل مسار أو رابط مباشر للصورة (URL / Storage Path):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={settings.header_logo_path}
                    onChange={(e) => setSettings(prev => ({ ...prev, header_logo_path: e.target.value }))}
                    placeholder={defaultPlatformLogo ? `الافتراضي: ${defaultPlatformLogo}` : 'https://...'}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg border dark:border-dark-border bg-white dark:bg-dark-card text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              {/* Right Column: Dimensions, Alignment, Order & Gap */}
              <div className="space-y-4">
                {/* 1. Height Slider + Input (20 to 80px) */}
                <div className="p-3.5 bg-slate-50 dark:bg-dark-bg/60 border dark:border-dark-border rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        ارتفاع شعار الهيدر (Header Logo Height)
                      </span>
                      <p className="text-[11px] text-slate-500">المدى: 20 إلى 80 بكسل</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={20}
                        max={80}
                        step={1}
                        value={settings.header_logo_height}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setSettings(prev => ({ ...prev, header_logo_height: Math.min(80, Math.max(20, val)) }));
                          }
                        }}
                        className="w-16 text-center font-mono font-bold text-xs border dark:border-dark-border rounded-lg px-2 py-1 bg-white dark:bg-dark-card text-primary-600 dark:text-primary-400 outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="text-xs text-slate-500 font-mono">px</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={20}
                    max={80}
                    step={1}
                    value={settings.header_logo_height}
                    onChange={(e) => setSettings(prev => ({ ...prev, header_logo_height: parseInt(e.target.value, 10) }))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>20 px</span>
                    <span className="text-slate-500 font-medium">36 px (افتراضي)</span>
                    <span>80 px</span>
                  </div>
                </div>

                {/* 2. Gap Slider + Input (0 to 40px) */}
                <div className="p-3.5 bg-slate-50 dark:bg-dark-bg/60 border dark:border-dark-border rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        المسافة بين الشعار واسم المنصة (Gap)
                      </span>
                      <p className="text-[11px] text-slate-500">المدى: 0 إلى 40 بكسل</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={40}
                        step={1}
                        value={settings.header_logo_gap}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setSettings(prev => ({ ...prev, header_logo_gap: Math.min(40, Math.max(0, val)) }));
                          }
                        }}
                        className="w-16 text-center font-mono font-bold text-xs border dark:border-dark-border rounded-lg px-2 py-1 bg-white dark:bg-dark-card text-primary-600 dark:text-primary-400 outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="text-xs text-slate-500 font-mono">px</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={settings.header_logo_gap}
                    onChange={(e) => setSettings(prev => ({ ...prev, header_logo_gap: parseInt(e.target.value, 10) }))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0 px</span>
                    <span className="text-slate-500 font-medium">12 px (افتراضي)</span>
                    <span>40 px</span>
                  </div>
                </div>

                {/* 3. Alignment & Order Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Alignment */}
                  <div className="p-3 bg-slate-50 dark:bg-dark-bg/60 border dark:border-dark-border rounded-xl">
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      محاذاة الهيدر (Alignment)
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, header_logo_alignment: 'right' }))}
                        className={`py-1 text-xs rounded font-medium flex items-center justify-center gap-1 transition ${
                          settings.header_logo_alignment === 'right'
                            ? 'bg-white dark:bg-dark-card text-primary-600 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                        title="محاذاة لليمين"
                      >
                        <AlignRight size={13} />
                        يمين
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, header_logo_alignment: 'center' }))}
                        className={`py-1 text-xs rounded font-medium flex items-center justify-center gap-1 transition ${
                          settings.header_logo_alignment === 'center'
                            ? 'bg-white dark:bg-dark-card text-primary-600 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                        title="محاذاة للوسط"
                      >
                        <AlignCenter size={13} />
                        وسط
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, header_logo_alignment: 'left' }))}
                        className={`py-1 text-xs rounded font-medium flex items-center justify-center gap-1 transition ${
                          settings.header_logo_alignment === 'left'
                            ? 'bg-white dark:bg-dark-card text-primary-600 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                        title="محاذاة لليسار"
                      >
                        <AlignLeft size={13} />
                        يسار
                      </button>
                    </div>
                  </div>

                  {/* Order */}
                  <div className="p-3 bg-slate-50 dark:bg-dark-bg/60 border dark:border-dark-border rounded-xl">
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      ترتيب الشعار والنص (Order)
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, header_logo_order: 'before_text' }))}
                        className={`py-1 text-xs rounded font-medium transition ${
                          settings.header_logo_order === 'before_text'
                            ? 'bg-white dark:bg-dark-card text-primary-600 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        قبل النص
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, header_logo_order: 'after_text' }))}
                        className={`py-1 text-xs rounded font-medium transition ${
                          settings.header_logo_order === 'after_text'
                            ? 'bg-white dark:bg-dark-card text-primary-600 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        بعد النص
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE PREVIEW: Header Logo */}
            <div className="border dark:border-dark-border rounded-xl overflow-hidden bg-slate-900 text-white">
              {/* Preview Bar Controls */}
              <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Eye size={14} className="text-primary-400" />
                  <span className="text-xs font-bold text-slate-200">معاينة حية لشريط الترويسة (Header Live Preview)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    H: {settings.header_logo_height}px | Gap: {settings.header_logo_gap}px | {settings.header_logo_alignment}
                  </span>
                </div>

                {/* Device Selector */}
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setHeaderPreviewDevice('desktop')}
                    className={`p-1.5 rounded text-xs transition ${
                      headerPreviewDevice === 'desktop' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="شاشة سطح المكتب (Desktop 1440px)"
                  >
                    <Monitor size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeaderPreviewDevice('tablet')}
                    className={`p-1.5 rounded text-xs transition ${
                      headerPreviewDevice === 'tablet' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="شاشة التابلت (Tablet 768px)"
                  >
                    <Tablet size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeaderPreviewDevice('mobile')}
                    className={`p-1.5 rounded text-xs transition ${
                      headerPreviewDevice === 'mobile' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="شاشة الهاتف (Mobile 375px)"
                  >
                    <Smartphone size={13} />
                  </button>
                </div>
              </div>

              {/* Simulated Browser Canvas */}
              <div className="p-6 bg-slate-900/60 flex justify-center">
                <div 
                  className={`transition-all duration-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden ${
                    headerPreviewDevice === 'mobile' ? 'w-[375px]' : headerPreviewDevice === 'tablet' ? 'w-[720px]' : 'w-full'
                  }`}
                >
                  {/* Simulated Navbar Header */}
                  <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    
                    {/* Header Branding (The subject of test) */}
                    <div 
                      className={`flex items-center flex-1 ${
                        settings.header_logo_alignment === 'right' 
                          ? 'justify-start' 
                          : settings.header_logo_alignment === 'center' 
                            ? 'justify-center' 
                            : 'justify-end'
                      }`}
                    >
                      <div 
                        className={`flex items-center ${
                          settings.header_logo_order === 'after_text' ? 'flex-row-reverse' : 'flex-row'
                        }`}
                        style={{ gap: `${settings.header_logo_gap}px` }}
                      >
                        {settings.header_logo_enabled && (
                          <div className="shrink-0 flex items-center">
                            {headerResolvedImage ? (
                              <img
                                src={headerResolvedImage}
                                alt="Header Logo"
                                style={{
                                  height: `${settings.header_logo_height}px`,
                                  width: 'auto',
                                  objectFit: 'contain'
                                }}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div 
                                style={{ height: `${settings.header_logo_height}px`, width: `${settings.header_logo_height}px` }}
                                className="rounded bg-blue-600/20 text-blue-600 flex items-center justify-center font-bold text-xs"
                              >
                                GPP
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-col">
                          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                            منصة الأسعار العالمية GPP
                          </span>
                          <span className="text-[10px] text-slate-400 leading-tight">
                            شبكة ليبيا للتجارة
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Simulated Nav Links (Hidden on small mobile for realism) */}
                    {headerPreviewDevice !== 'mobile' && (
                      <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span className="hover:text-primary-600 cursor-pointer">الرئيسية</span>
                        <span className="hover:text-primary-600 cursor-pointer">السلع</span>
                        <span className="hover:text-primary-600 cursor-pointer">التقارير</span>
                        <span className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 text-xs">اتصل بنا</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. HERO LOGO SECTION */}
      {/* ========================================================================= */}
      {(sectionView === 'all' || sectionView === 'hero') && (
        <div className="bg-white dark:bg-dark-card rounded-2xl border dark:border-dark-border shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="p-5 border-b dark:border-dark-border bg-slate-50/80 dark:bg-dark-bg/60 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  شعار الواجهة الترحيبية (Hero Logo)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  الشعار الكبير في منتصف قسم Hero فوق العنوان الرئيسي "منصة الأسعار العالمية GPP"
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center gap-3 bg-white dark:bg-dark-card px-3 py-1.5 rounded-xl border dark:border-dark-border">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                حالة العرض:
              </span>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, hero_logo_enabled: !prev.hero_logo_enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  settings.hero_logo_enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.hero_logo_enabled ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
              <span className={`text-xs font-bold ${settings.hero_logo_enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                {settings.hero_logo_enabled ? 'مفعل (ظاهر)' : 'مخفي'}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Form Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column: Image Upload & Source */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    صورة شعار الهيرو (Hero Image)
                  </label>
                  
                  {/* File Upload Box */}
                  <div className="border-2 border-dashed border-slate-200 dark:border-dark-border rounded-xl p-4 bg-slate-50/50 dark:bg-dark-bg/40 flex flex-col items-center justify-center text-center">
                    <input
                      ref={heroFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('hero', file);
                      }}
                    />

                    {heroResolvedImage ? (
                      <div className="relative group flex flex-col items-center">
                        <div className="p-3 bg-white dark:bg-dark-card rounded-lg border dark:border-dark-border shadow-xs mb-2">
                          <img
                            src={heroResolvedImage}
                            alt="Hero Logo Preview"
                            style={{ height: `${Math.min(90, settings.hero_logo_size * 0.6)}px` }}
                            className="max-w-[220px] object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => heroFileInputRef.current?.click()}
                            disabled={uploadingHero}
                            className="text-xs px-3 py-1 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 hover:bg-purple-100 transition flex items-center gap-1"
                          >
                            <Upload size={12} />
                            تغيير الصورة
                          </button>
                          {settings.header_logo_path && settings.hero_logo_path !== settings.header_logo_path && (
                            <button
                              type="button"
                              onClick={() => setSettings(prev => ({ ...prev, hero_logo_path: prev.header_logo_path }))}
                              className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                              title="استخدام نفس صورة الهيدر"
                            >
                              مطابقة شعار الهيدر
                            </button>
                          )}
                          {settings.hero_logo_path && (
                            <button
                              type="button"
                              onClick={() => setSettings(prev => ({ ...prev, hero_logo_path: '' }))}
                              className="text-xs px-2 py-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                              title="استعادة الشعار الافتراضي للمنصة"
                            >
                              إعادة للافتراضي
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center mb-2">
                          <Upload size={20} />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                          اسحب صورة الهيرو هنا أو اضغط للاختيار
                        </p>
                        <p className="text-[11px] text-slate-400">
                          PNG, SVG, JPG, WebP (بحد أقصى 5MB)
                        </p>
                        <button
                          type="button"
                          onClick={() => heroFileInputRef.current?.click()}
                          disabled={uploadingHero}
                          className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-dark-card border dark:border-dark-border font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-xs"
                        >
                          {uploadingHero ? 'جاري الرفع...' : 'اختيار صورة من الجهاز'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct URL / Path input */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    أو أدخل مسار أو رابط مباشر للصورة (URL / Storage Path):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={settings.hero_logo_path}
                    onChange={(e) => setSettings(prev => ({ ...prev, hero_logo_path: e.target.value }))}
                    placeholder={defaultPlatformLogo ? `الافتراضي: ${defaultPlatformLogo}` : 'https://...'}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg border dark:border-dark-border bg-white dark:bg-dark-card text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Right Column: Size, Alignment, Vertical Position, Offset Y */}
              <div className="space-y-4">
                {/* 1. Size Slider + Input (80 to 400px) */}
                <div className="p-3.5 bg-slate-50 dark:bg-dark-bg/60 border dark:border-dark-border rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        حجم شعار الهيرو (Hero Logo Size / Width)
                      </span>
                      <p className="text-[11px] text-slate-500">المدى: 80 إلى 400 بكسل (مع حماية تلقائية للأجهزة الصغيرة)</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={80}
                        max={400}
                        step={1}
                        value={settings.hero_logo_size}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setSettings(prev => ({ ...prev, hero_logo_size: Math.min(400, Math.max(80, val)) }));
                          }
                        }}
                        className="w-20 text-center font-mono font-bold text-xs border dark:border-dark-border rounded-lg px-2 py-1 bg-white dark:bg-dark-card text-purple-600 dark:text-purple-400 outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-xs text-slate-500 font-mono">px</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={80}
                    max={400}
                    step={1}
                    value={settings.hero_logo_size}
                    onChange={(e) => setSettings(prev => ({ ...prev, hero_logo_size: parseInt(e.target.value, 10) }))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>80 px</span>
                    <span className="text-slate-500 font-medium">140 px (افتراضي)</span>
                    <span>400 px</span>
                  </div>
                </div>

                {/* 2. Vertical Offset Y Slider + Input (-100 to +100px) */}
                <div className="p-3.5 bg-slate-50 dark:bg-dark-bg/60 border dark:border-dark-border rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        الإزاحة الرأسية (Vertical Offset Y)
                      </span>
                      <p className="text-[11px] text-slate-500">المدى: -100 إلى +100 بكسل</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={-100}
                        max={100}
                        step={1}
                        value={settings.hero_logo_offset_y}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setSettings(prev => ({ ...prev, hero_logo_offset_y: Math.min(100, Math.max(-100, val)) }));
                          }
                        }}
                        className="w-20 text-center font-mono font-bold text-xs border dark:border-dark-border rounded-lg px-2 py-1 bg-white dark:bg-dark-card text-purple-600 dark:text-purple-400 outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-xs text-slate-500 font-mono">px</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={1}
                    value={settings.hero_logo_offset_y}
                    onChange={(e) => setSettings(prev => ({ ...prev, hero_logo_offset_y: parseInt(e.target.value, 10) }))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>-100 px (للأعلى)</span>
                    <span className="text-slate-500 font-medium">0 px (الموضع الطبيعي)</span>
                    <span>+100 px (للأسفل)</span>
                  </div>
                </div>

                {/* 3. Horizontal Alignment & Vertical Position */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Horizontal Alignment */}
                  <div className="p-3 bg-slate-50 dark:bg-dark-bg/60 border dark:border-dark-border rounded-xl">
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      المحاذاة الأفقية (Horizontal Alignment)
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, hero_logo_alignment: 'right' }))}
                        className={`py-1 text-xs rounded font-medium flex items-center justify-center gap-1 transition ${
                          settings.hero_logo_alignment === 'right'
                            ? 'bg-white dark:bg-dark-card text-purple-600 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <AlignRight size={13} />
                        يمين
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, hero_logo_alignment: 'center' }))}
                        className={`py-1 text-xs rounded font-medium flex items-center justify-center gap-1 transition ${
                          settings.hero_logo_alignment === 'center'
                            ? 'bg-white dark:bg-dark-card text-purple-600 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <AlignCenter size={13} />
                        وسط
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, hero_logo_alignment: 'left' }))}
                        className={`py-1 text-xs rounded font-medium flex items-center justify-center gap-1 transition ${
                          settings.hero_logo_alignment === 'left'
                            ? 'bg-white dark:bg-dark-card text-purple-600 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <AlignLeft size={13} />
                        يسار
                      </button>
                    </div>
                  </div>

                  {/* Vertical Position */}
                  <div className="p-3 bg-slate-50 dark:bg-dark-bg/60 border dark:border-dark-border rounded-xl">
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      الموضع الرأسي (Vertical Position)
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, hero_logo_vertical_position: 'top' }))}
                        className={`py-1 text-xs rounded font-medium transition flex items-center justify-center gap-0.5 ${
                          settings.hero_logo_vertical_position === 'top'
                            ? 'bg-white dark:bg-dark-card text-purple-600 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <ArrowUp size={12} />
                        أعلى
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, hero_logo_vertical_position: 'center' }))}
                        className={`py-1 text-xs rounded font-medium transition ${
                          settings.hero_logo_vertical_position === 'center'
                            ? 'bg-white dark:bg-dark-card text-purple-600 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        وسط
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, hero_logo_vertical_position: 'bottom' }))}
                        className={`py-1 text-xs rounded font-medium transition flex items-center justify-center gap-0.5 ${
                          settings.hero_logo_vertical_position === 'bottom'
                            ? 'bg-white dark:bg-dark-card text-purple-600 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <ArrowDown size={12} />
                        أسفل
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE PREVIEW: Hero Logo */}
            <div className="border dark:border-dark-border rounded-xl overflow-hidden bg-slate-950 text-white">
              {/* Preview Bar Controls */}
              <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-400" />
                  <span className="text-xs font-bold text-slate-200">معاينة حية لقسم الواجهة الترحيبية (Hero Live Preview)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Size: {settings.hero_logo_size}px | Offset Y: {settings.hero_logo_offset_y}px | {settings.hero_logo_alignment}
                  </span>
                </div>

                {/* Device Selector */}
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setHeroPreviewDevice('desktop')}
                    className={`p-1.5 rounded text-xs transition ${
                      heroPreviewDevice === 'desktop' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="سطح المكتب (Desktop 1440px)"
                  >
                    <Monitor size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroPreviewDevice('tablet')}
                    className={`p-1.5 rounded text-xs transition ${
                      heroPreviewDevice === 'tablet' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="التابلت (Tablet 768px)"
                  >
                    <Tablet size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroPreviewDevice('mobile')}
                    className={`p-1.5 rounded text-xs transition ${
                      heroPreviewDevice === 'mobile' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="الهاتف (Mobile 375px)"
                  >
                    <Smartphone size={13} />
                  </button>
                </div>
              </div>

              {/* Simulated Hero Section */}
              <div className="p-6 bg-slate-900/60 flex justify-center overflow-x-auto">
                <div 
                  className={`transition-all duration-300 rounded-2xl shadow-xl overflow-hidden relative border border-slate-700/60 ${
                    heroPreviewDevice === 'mobile' ? 'w-[375px]' : heroPreviewDevice === 'tablet' ? 'w-[720px]' : 'w-full'
                  }`}
                  style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)'
                  }}
                >
                  {/* Subtle Grid / Glow Backdrop */}
                  <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

                  <div className="relative z-10 px-6 py-12 flex flex-col items-center text-center">
                    
                    {/* Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-medium mb-4">
                      <span>شبكة ليبيا للتجارة • مركز بيانات ومعلومات التجارة</span>
                    </div>

                    {/* Container for Logo + Title with Vertical Position Handling */}
                    <div 
                      className={`w-full flex ${
                        settings.hero_logo_vertical_position === 'center' 
                          ? 'flex-col sm:flex-row items-center justify-center gap-6' 
                          : settings.hero_logo_vertical_position === 'bottom'
                            ? 'flex-col-reverse items-center'
                            : 'flex-col items-center'
                      }`}
                    >
                      {/* Hero Logo Element */}
                      {settings.hero_logo_enabled && (
                        <div 
                          className={`w-full flex ${
                            settings.hero_logo_alignment === 'right' 
                              ? 'justify-start' 
                              : settings.hero_logo_alignment === 'center' 
                                ? 'justify-center' 
                                : 'justify-end'
                          }`}
                          style={{
                            transform: `translateY(${settings.hero_logo_offset_y}px)`,
                            transition: 'transform 0.15s ease-out'
                          }}
                        >
                          <div className="relative p-2">
                            {heroResolvedImage ? (
                              <img
                                src={heroResolvedImage}
                                alt="Hero Logo"
                                style={{
                                  width: `${settings.hero_logo_size}px`,
                                  maxWidth: 'min(100%, 85vw)',
                                  height: 'auto',
                                  objectFit: 'contain'
                                }}
                                className="drop-shadow-lg mx-auto"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div 
                                style={{
                                  width: `${settings.hero_logo_size}px`,
                                  maxWidth: 'min(100%, 85vw)',
                                  height: `${settings.hero_logo_size * 0.75}px`
                                }}
                                className="rounded-2xl border-2 border-dashed border-blue-400/40 bg-blue-900/30 flex items-center justify-center text-blue-200 font-bold"
                              >
                                شعار الهيرو GPP
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Main Title & Description */}
                      <div className="mt-2 space-y-2 max-w-xl">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                          منصة الأسعار العالمية GPP
                        </h1>
                        <p className="text-xs sm:text-sm text-blue-100/80 leading-relaxed">
                          متابعة وتحليل الأسعار العالمية للسلع الاستراتيجية والطاقة والمعادن لحظة بلحظة وفق أحدث مؤشرات الأسواق الدولية.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SQL & DATABASE INTEGRATION GUIDE BOX */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 dark:bg-dark-card rounded-2xl border dark:border-dark-border p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Info size={20} className="text-primary-600" />
            <h4 className="font-bold text-sm">كود SQL المطلوب لقاعدة بيانات Supabase (SQL Required)</h4>
          </div>
          <button
            type="button"
            onClick={copySqlToClipboard}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-dark-bg border dark:border-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition flex items-center gap-1.5 shadow-xs"
          >
            {copiedSql ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            {copiedSql ? 'تم النسخ بنجاح!' : 'نسخ كود SQL'}
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          وفق التعليمات الصارمة، لم يتم تنفيذ أي استعلام SQL تلقائياً على Supabase. يمكنك نسخ هذا الاستعلام لتسجيل مفاتيح الإعدادات وإنشاء Bucket الـ Storage الخاص بالشعارات <code>platform-logos</code> مع سياسات الأمان المخصصة للمدير العام (Super Admin):
        </p>

        <pre 
          dir="ltr" 
          className="text-[11px] font-mono p-4 rounded-xl bg-slate-900 text-slate-100 overflow-x-auto border border-slate-800 max-h-56 leading-relaxed"
        >
{`-- 1. إضافة مفاتيح الإعدادات في جدول platform_settings
INSERT INTO public.platform_settings (key, value, description)
VALUES 
  ('header_logo_enabled', 'true', 'تفعيل أو إخفاء شعار الهيدر في Public GPP'),
  ('header_logo_path', '', 'مسار أو رابط شعار الهيدر في Public GPP'),
  ('header_logo_height', '36', 'ارتفاع شعار الهيدر بالبكسل (20 إلى 80)'),
  ('header_logo_alignment', 'right', 'محاذاة شعار الهيدر (right / center / left)'),
  ('header_logo_order', 'before_text', 'ترتيب ظهور شعار الهيدر بالنسبة للنص (before_text / after_text)'),
  ('header_logo_gap', '12', 'المسافة بين شعار الهيدر والنص بالبكسل (0 إلى 40)'),

  ('hero_logo_enabled', 'true', 'تفعيل أو إخفاء شعار الهيرو في Public GPP'),
  ('hero_logo_path', '', 'مسار أو رابط شعار الهيرو في Public GPP'),
  ('hero_logo_size', '140', 'حجم شعار الهيرو بالبكسل (80 إلى 400)'),
  ('hero_logo_alignment', 'center', 'محاذاة شعار الهيرو أفقياً (right / center / left)'),
  ('hero_logo_vertical_position', 'top', 'الموضع الرأسي لشعار الهيرو بالنسبة للعنوان (top / center / bottom)'),
  ('hero_logo_offset_y', '0', 'إزاحة شعار الهيرو الرأسية بالبكسل (-100 إلى 100)')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

-- 2. إنشاء Bucket لشعارات المنصة platform-logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-logos', 'platform-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. سياسات RLS للـ Storage (Super Admin حصرياً للرفع، والقراءة عامة)
CREATE POLICY "Public view platform logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'platform-logos');
CREATE POLICY "Super Admin upload platform logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'platform-logos' AND public.is_active_super_admin());
CREATE POLICY "Super Admin update platform logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'platform-logos' AND public.is_active_super_admin());
CREATE POLICY "Super Admin delete platform logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'platform-logos' AND public.is_active_super_admin());`}
        </pre>
      </div>
    </div>
  );
}
