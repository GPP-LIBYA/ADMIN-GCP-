import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { FooterLogo } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  AlertCircle, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink, 
  Image as ImageIcon, 
  Eye, 
  EyeOff, 
  Upload, 
  ShieldAlert,
  CheckCircle2,
  Globe
} from 'lucide-react';

export default function FooterLogosTab() {
  const { adminUser } = useAuthStore();
  
  // Strict Super Admin check
  const isSuperAdmin = adminUser?.role === 'super_admin' && adminUser?.is_active === true;

  const [logos, setLogos] = useState<FooterLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLogo, setEditingLogo] = useState<FooterLogo | null>(null);
  const [formName, setFormName] = useState('');
  const [formLinkUrl, setFormLinkUrl] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Delete confirmation state
  const [logoToDelete, setLogoToDelete] = useState<FooterLogo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchLogos();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  const fetchLogos = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from('footer_logos')
        .select('*')
        .order('display_order', { ascending: true });

      if (fetchErr) throw fetchErr;
      setLogos(data || []);
    } catch (err: any) {
      console.error('Error fetching footer logos:', err);
      setError(err?.message || 'تعذر تحميل شعارات التذييل');
    } finally {
      setLoading(false);
    }
  };

  const getPublicImageUrl = (storagePath: string): string => {
    if (!storagePath) return '';
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      return storagePath;
    }
    const { data } = supabase.storage.from('footer-logos').getPublicUrl(storagePath);
    return data?.publicUrl || '';
  };

  const handleOpenAddModal = () => {
    setEditingLogo(null);
    setFormName('');
    setFormLinkUrl('');
    // Next display order is highest order + 10 or 10
    const nextOrder = logos.length > 0 
      ? Math.max(...logos.map(l => l.display_order || 0)) + 10 
      : 10;
    setFormDisplayOrder(nextOrder);
    setFormIsActive(true);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (logo: FooterLogo) => {
    setEditingLogo(logo);
    setFormName(logo.name || '');
    setFormLinkUrl(logo.link_url || '');
    setFormDisplayOrder(logo.display_order || 0);
    setFormIsActive(logo.is_active);
    setSelectedFile(null);
    setPreviewUrl(getPublicImageUrl(logo.storage_path));
    setError(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create instant local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setError('ليس لديك صلاحية لتنفيذ هذه العملية. تقتصر إدارة الشعارات على Super Admin فقط.');
      return;
    }

    if (!formName.trim()) {
      setError('اسم الشعار مطلوب');
      return;
    }

    if (!editingLogo && !selectedFile) {
      setError('يرجى اختيار صورة الشعار');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      let storagePath = editingLogo ? editingLogo.storage_path : '';

      // Upload image if a new file is chosen
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'png';
        const sanitizedExt = fileExt.replace(/[^a-z0-9]/gi, '');
        const newStoragePath = `logo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${sanitizedExt}`;

        const { error: uploadError } = await supabase.storage
          .from('footer-logos')
          .upload(newStoragePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw new Error('فشل رفع الصورة إلى Storage: ' + uploadError.message);
        }

        // If editing and had an old storage path, remove old file from bucket
        if (editingLogo && editingLogo.storage_path && !editingLogo.storage_path.startsWith('http')) {
          await supabase.storage
            .from('footer-logos')
            .remove([editingLogo.storage_path])
            .catch(err => console.warn('Could not remove previous storage file:', err));
        }

        storagePath = newStoragePath;
      }

      const payload = {
        name: formName.trim(),
        storage_path: storagePath,
        link_url: formLinkUrl.trim() || null,
        display_order: Number(formDisplayOrder) || 0,
        is_active: formIsActive,
        updated_at: new Date().toISOString()
      };

      if (editingLogo) {
        const { error: updateError } = await supabase
          .from('footer_logos')
          .update(payload)
          .eq('id', editingLogo.id);

        if (updateError) throw updateError;
        setSuccessMessage('تم تحديث الشعار بنجاح');
      } else {
        const { error: insertError } = await supabase
          .from('footer_logos')
          .insert([{
            ...payload,
            created_at: new Date().toISOString()
          }]);

        if (insertError) throw insertError;
        setSuccessMessage('تمت إضافة الشعار بنجاح');
      }

      setIsModalOpen(false);
      fetchLogos();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error('Error saving footer logo:', err);
      setError(err?.message || 'حدث خطأ أثناء حفظ الشعار');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (logo: FooterLogo) => {
    if (!isSuperAdmin) {
      alert('ليس لديك صلاحية لتنفيذ هذه العملية. تقتصر على Super Admin فقط.');
      return;
    }

    try {
      const newStatus = !logo.is_active;
      const { error: updateErr } = await supabase
        .from('footer_logos')
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', logo.id);

      if (updateErr) throw updateErr;

      setLogos(prev => prev.map(l => l.id === logo.id ? { ...l, is_active: newStatus } : l));
    } catch (err: any) {
      console.error('Error toggling logo status:', err);
      alert('تعذر تغيير حالة الشعار: ' + (err?.message || 'خطأ غير معروف'));
    }
  };

  const handleMoveOrder = async (logo: FooterLogo, direction: 'up' | 'down') => {
    if (!isSuperAdmin) return;
    const currentIndex = logos.findIndex(l => l.id === logo.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= logos.length) return;

    const targetLogo = logos[targetIndex];

    try {
      // Swap display_order
      const orderA = targetLogo.display_order;
      const orderB = logo.display_order === targetLogo.display_order 
        ? (direction === 'up' ? orderA - 1 : orderA + 1)
        : logo.display_order;

      await Promise.all([
        supabase.from('footer_logos').update({ display_order: orderA, updated_at: new Date().toISOString() }).eq('id', logo.id),
        supabase.from('footer_logos').update({ display_order: orderB, updated_at: new Date().toISOString() }).eq('id', targetLogo.id)
      ]);

      fetchLogos();
    } catch (err: any) {
      console.error('Error reordering logos:', err);
      alert('تعذر تغيير ترتيب الشعار: ' + err?.message);
    }
  };

  const confirmDelete = async () => {
    if (!isSuperAdmin || !logoToDelete) return;

    try {
      setDeleting(true);

      // 1. Delete file from Storage
      if (logoToDelete.storage_path && !logoToDelete.storage_path.startsWith('http')) {
        const { error: removeStorageErr } = await supabase.storage
          .from('footer-logos')
          .remove([logoToDelete.storage_path]);

        if (removeStorageErr) {
          console.warn('Storage file deletion warning:', removeStorageErr.message);
        }
      }

      // 2. Delete record from database
      const { error: deleteDbErr } = await supabase
        .from('footer_logos')
        .delete()
        .eq('id', logoToDelete.id);

      if (deleteDbErr) throw deleteDbErr;

      setSuccessMessage(`تم حذف الشعار "${logoToDelete.name}" بنجاح`);
      setLogoToDelete(null);
      fetchLogos();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error('Error deleting footer logo:', err);
      alert('تعذر حذف الشعار: ' + (err?.message || 'خطأ غير معروف'));
    } finally {
      setDeleting(false);
    }
  };

  // Guard: Super Admin Only
  if (!isSuperAdmin) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-xl p-8 border border-red-200 dark:border-red-900/40 text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">صلاحية وصول محظورة</h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
          إدارة شعارات التذييل (Footer Logos) مخصصة حصرياً للمسؤول الأعلى (Super Admin) النشط فقط، ولا تتاح لأي رتبة إدارية أخرى.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-400 flex items-center gap-3">
          <AlertCircle className="shrink-0" size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-700 dark:text-emerald-400 flex items-center gap-3">
          <CheckCircle2 className="shrink-0" size={20} />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 rounded-lg">
              <ImageIcon size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">شعارات التذييل (Footer Logos)</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة وعرض شعارات الشركاء والرعاة في أسفل الموقع للجمهور (حصرية لـ Super Admin).
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition shadow-sm hover:shadow"
        >
          <Plus size={18} />
          <span>إضافة شعار جديد</span>
        </button>
      </div>

      {/* Logos List */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin"></div>
            <span className="text-sm">جاري تحميل الشعارات...</span>
          </div>
        ) : logos.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
              <ImageIcon size={28} />
            </div>
            <p className="font-medium text-slate-700 dark:text-slate-300">لا توجد شعارات تذييل مضافة حتى الآن</p>
            <p className="text-xs text-slate-400 max-w-sm">
              اضغط على زر "إضافة شعار جديد" لإدراج أول شعار يظهر في تذييل المنصة.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-2 text-xs bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 px-3 py-1.5 rounded-lg border border-primary-200 dark:border-primary-800 hover:bg-primary-100 transition"
            >
              + إضافة شعار الآن
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-dark-bg border-b dark:border-dark-border text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold w-16 text-center">الترتيب</th>
                  <th className="py-3 px-4 font-semibold w-24">المعاينة</th>
                  <th className="py-3 px-4 font-semibold">اسم الشعار</th>
                  <th className="py-3 px-4 font-semibold">رابط التوجيه</th>
                  <th className="py-3 px-4 font-semibold w-28 text-center">الحالة</th>
                  <th className="py-3 px-4 font-semibold w-32 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-dark-border">
                {logos.map((logo, index) => {
                  const logoUrl = getPublicImageUrl(logo.storage_path);
                  return (
                    <tr 
                      key={logo.id} 
                      className={`hover:bg-slate-50/70 dark:hover:bg-dark-bg/50 transition ${
                        !logo.is_active ? 'opacity-60 bg-slate-50/40 dark:bg-dark-bg/30' : ''
                      }`}
                    >
                      {/* Reorder / Display Order */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-700 dark:text-slate-300">
                            {logo.display_order}
                          </span>
                          <div className="flex flex-col">
                            <button
                              onClick={() => handleMoveOrder(logo, 'up')}
                              disabled={index === 0}
                              title="تحريك لأعلى"
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20 transition"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              onClick={() => handleMoveOrder(logo, 'down')}
                              disabled={index === logos.length - 1}
                              title="تحريك لأسفل"
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-20 transition"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Preview Image */}
                      <td className="py-3 px-4">
                        <div className="w-16 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-dark-border flex items-center justify-center overflow-hidden p-1">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={logo.name}
                              className="max-h-full max-w-full object-contain"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <ImageIcon size={18} className="text-slate-400" />
                          )}
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {logo.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]" title={logo.storage_path}>
                          {logo.storage_path}
                        </div>
                      </td>

                      {/* Link */}
                      <td className="py-3 px-4">
                        {logo.link_url ? (
                          <a
                            href={logo.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline max-w-[240px] truncate"
                            title={logo.link_url}
                          >
                            <Globe size={13} className="shrink-0" />
                            <span className="truncate" dir="ltr">{logo.link_url}</span>
                            <ExternalLink size={11} className="shrink-0" />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">لا يوجد رابط</span>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(logo)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                            logo.is_active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                          title={logo.is_active ? 'انقر للتعطيل والإخفاء' : 'انقر للتفعيل والعرض'}
                        >
                          {logo.is_active ? (
                            <>
                              <Eye size={12} />
                              <span>نشط</span>
                            </>
                          ) : (
                            <>
                              <EyeOff size={12} />
                              <span>مخفي</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(logo)}
                            title="تعديل الشعار"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-primary-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-primary-400 dark:hover:bg-slate-800 transition"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setLogoToDelete(logo)}
                            title="حذف الشعار"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/40 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl max-w-lg w-full border dark:border-dark-border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b dark:border-dark-border flex justify-between items-center bg-slate-50 dark:bg-dark-bg">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary-100 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 rounded-lg">
                  <ImageIcon size={18} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {editingLogo ? 'تعديل شعار التذييل' : 'إضافة شعار جديد'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Logo Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم الشعار / الجهة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: وزارة التجارة والصناعة أو شريك استراتيجي"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white"
                />
              </div>

              {/* Image Picker & Preview */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  صورة الشعار {!editingLogo && <span className="text-red-500">*</span>}
                </label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                />

                <div className="flex items-center gap-4">
                  {/* Thumbnail / Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-28 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 bg-slate-50 dark:bg-dark-bg flex flex-col items-center justify-center cursor-pointer overflow-hidden transition group relative"
                  >
                    {previewUrl ? (
                      <>
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-full max-w-full object-contain p-1"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium">
                          تغيير
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-2 text-slate-400 group-hover:text-primary-500 transition">
                        <Upload size={20} className="mx-auto mb-1" />
                        <span className="text-[11px] block">اختر صورة</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      الصيغ المدعومة: PNG, JPG, SVG, WebP
                    </p>
                    <p>الحد الأقصى للحجم: 5 ميجابايت.</p>
                    <p className="text-[11px] text-slate-400">
                      يُفضل استخدام شعارات بخلفية شفافة (Transparent PNG أو SVG) لمظهر احترافي.
                    </p>
                  </div>
                </div>
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  رابط الموقع (اختياري)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    dir="ltr"
                    placeholder="https://example.com"
                    value={formLinkUrl}
                    onChange={(e) => setFormLinkUrl(e.target.value)}
                    className="w-full border dark:border-dark-border rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white"
                  />
                  <Globe size={16} className="absolute left-3 top-2.5 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  عند النقر على الشعار في الـ Footer سيتم توجيه الزائر إلى هذا الرابط في نافذة جديدة.
                </p>
              </div>

              {/* Display Order & Status */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ترتيب العرض
                  </label>
                  <input
                    type="number"
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(parseInt(e.target.value) || 0)}
                    className="w-full border dark:border-dark-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">الأقل رقماً يظهر أولاً.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    حالة الشعار
                  </label>
                  <label className="flex items-center gap-2.5 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500 dark:border-slate-700 dark:bg-dark-card"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {formIsActive ? 'نشط (ظاهر في الـ Footer)' : 'مخفي (غير ظاهر)'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-dark-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 border dark:border-dark-border rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  ) : null}
                  <span>{editingLogo ? 'حفظ التعديلات' : 'إضافة الشعار'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {logoToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl max-w-md w-full border dark:border-dark-border p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                تأكيد حذف الشعار
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                هل أنت متأكد من حذف الشعار <strong className="text-slate-900 dark:text-white">"{logoToDelete.name}"</strong>؟
                <br />
                <span className="text-xs text-red-500 mt-1 block">
                  سيتم حذف السجل نهائياً وحذف الصورة المرفوعة من Storage (footer-logos).
                </span>
              </p>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setLogoToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 border dark:border-dark-border rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                ) : null}
                <span>تأكيد الحذف</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
