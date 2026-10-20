import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  FileText, Plus, Search, Edit, Trash2, Eye, Download, Archive, Upload, X, 
  Image as ImageIcon, Save, CheckCircle2, AlertCircle, Loader2, Link as LinkIcon
} from 'lucide-react';
import { Report } from '../types';

export default function PublishedReports() {
  const { adminUser, session } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [sector, setSector] = useState('');
  const [tags, setTags] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  
  // PDF & Cover State
  const [pdfSourceType, setPdfSourceType] = useState<'upload' | 'url'>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrlInput, setPdfUrlInput] = useState('');

  const [coverSourceType, setCoverSourceType] = useState<'upload' | 'url'>('upload');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrlInput, setCoverUrlInput] = useState('');
  
  // Save & Feedback State
  const [saving, setSaving] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [sectors, setSectors] = useState<any[]>([]);

  useEffect(() => {
    fetchReports();
    fetchSectors();
  }, []);

  const fetchSectors = async () => {
    const { data } = await supabase.from('sectors_catalog').select('*').order('name_ar');
    if (data) setSectors(data);
  };

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching reports:', error);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  const handleOpenModal = (report?: Report) => {
    if (report) {
      setEditingReport(report);
      setTitleAr(report.title_ar);
      setTitleEn(report.title_en);
      setDescriptionAr(report.description_ar || '');
      setDescriptionEn(report.description_en || '');
      setSector(report.sector || '');
      setTags(report?.keywords ? report.keywords.join(', ') : '');
      setReportDate(report.report_date);
      setStatus(report.status);
      setPdfUrlInput(report.pdf_url || '');
      setCoverUrlInput(report.cover_image_url || '');
      setPdfSourceType('upload');
      setCoverSourceType('upload');
    } else {
      setEditingReport(null);
      setTitleAr('');
      setTitleEn('');
      setDescriptionAr('');
      setDescriptionEn('');
      setSector('');
      setTags('');
      setReportDate(new Date().toISOString().slice(0, 10));
      setStatus('draft');
      setPdfUrlInput('');
      setCoverUrlInput('');
      setPdfSourceType('upload');
      setCoverSourceType('upload');
    }
    setPdfFile(null);
    setCoverFile(null);
    setSaveError(null);
    setSaveSuccess(false);
    setSaveStatusText('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return; // Prevent double submit

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setSaveStatusText('جاري التحقق من البيانات...');
    
    // Track newly uploaded paths during this attempt for cleanup if database save fails
    const newlyUploadedPaths: string[] = [];

    try {
      // 0. Validation
      if (!titleAr.trim() || !titleEn.trim()) {
        throw new Error('يرجى إدخال عنوان التقرير باللغتين العربية والإنجليزية');
      }
      if (!reportDate) {
        throw new Error('يرجى تحديد تاريخ التقرير');
      }

      let finalPdfUrl = editingReport?.pdf_url || '';
      let finalCoverUrl = editingReport?.cover_image_url || null;
      let fileSize = editingReport?.file_size || null;
      const pageCount = editingReport?.pages_count || editingReport?.page_count || null;

      // 1. PDF Handling
      if (pdfSourceType === 'upload') {
        if (pdfFile) {
          const MAX_PDF_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
          if (pdfFile.size > MAX_PDF_SIZE_BYTES) {
            throw new Error('حجم ملف PDF يتجاوز الحد الأقصى المسموح به وهو 100MB.');
          }

          console.log('[PUBLISHED REPORT] PDF upload start');
          setSaveStatusText('جاري رفع ملف التقرير (PDF)...');
          
          const ext = (pdfFile.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
          const pdfPath = `pdfs/report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('reports')
            .upload(pdfPath, pdfFile, {
              contentType: 'application/pdf',
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.warn('[PUBLISHED REPORT] PDF upload error:', uploadError.message);
            const isSizeError = uploadError.message?.toLowerCase().includes('exceeded the maximum allowed size') || 
                                uploadError.message?.toLowerCase().includes('size') ||
                                uploadError.message?.toLowerCase().includes('too large') ||
                                uploadError.message?.toLowerCase().includes('413');
            if (pdfFile.size > 100 * 1024 * 1024) {
              throw new Error('حجم ملف PDF يتجاوز الحد الأقصى المسموح به وهو 100MB.');
            } else if (isSizeError) {
              const fileMb = (pdfFile.size / (1024 * 1024)).toFixed(2);
              throw new Error(`حجم ملف PDF (${fileMb} MB) تم رفضه بواسطة خدمة التخزين Supabase (The object exceeded the maximum allowed size). يرجى التأكد من رفع Global file size limit في إعدادات Supabase Storage أو استخدام خيار "رابط مباشر".`);
            }
            throw new Error(`خطأ أثناء رفع ملف PDF إلى التخزين: ${uploadError.message}`);
          }

          newlyUploadedPaths.push(pdfPath);
          
          const { data: { publicUrl } } = supabase.storage
            .from('reports')
            .getPublicUrl(uploadData?.path || pdfPath);

          finalPdfUrl = publicUrl;
          fileSize = pdfFile.size;
          console.log('[PUBLISHED REPORT] PDF upload success');
        } else if (editingReport?.pdf_url) {
          finalPdfUrl = editingReport.pdf_url;
        } else {
          throw new Error('يرجى اختيار ملف PDF للتقرير أو استخدام خيار رابط مباشر');
        }
      } else {
        // Direct URL for PDF
        if (!pdfUrlInput.trim()) {
          throw new Error('يرجى إدخال رابط ملف PDF المباشر');
        }
        if (pdfUrlInput.trim().startsWith('data:')) {
          throw new Error('ممنوع استخدام Data URL / Base64. يرجى إدخال رابط ويب صالح يبدأ بـ http:// أو https://');
        }
        finalPdfUrl = pdfUrlInput.trim();
      }

      // 2. Cover Handling
      if (coverSourceType === 'upload') {
        if (coverFile) {
          console.log('[PUBLISHED REPORT] Cover upload start');
          setSaveStatusText('جاري رفع صورة الغلاف...');
          
          const ext = (coverFile.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
          const coverPath = `covers/cover_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('reports')
            .upload(coverPath, coverFile, {
              contentType: coverFile.type || 'image/png',
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.warn('[PUBLISHED REPORT] Cover upload error:', uploadError.message);
            const isSizeError = uploadError.message?.toLowerCase().includes('exceeded the maximum allowed size') || 
                                uploadError.message?.toLowerCase().includes('size') ||
                                uploadError.message?.toLowerCase().includes('too large');
            if (isSizeError) {
              const sizeMb = (coverFile.size / (1024 * 1024)).toFixed(2);
              throw new Error(`حجم صورة الغلاف (${sizeMb} MB) يتجاوز الحد المسموح به للتخزين في Supabase.`);
            }
            throw new Error(`خطأ أثناء رفع صورة الغلاف إلى التخزين: ${uploadError.message}`);
          }

          newlyUploadedPaths.push(coverPath);

          const { data: { publicUrl } } = supabase.storage
            .from('reports')
            .getPublicUrl(uploadData?.path || coverPath);

          finalCoverUrl = publicUrl;
          console.log('[PUBLISHED REPORT] Cover upload success');
        } else {
          finalCoverUrl = editingReport?.cover_image_url || null;
        }
      } else {
        // Direct URL for Cover
        if (coverUrlInput.trim().startsWith('data:')) {
          throw new Error('ممنوع استخدام Data URL لصورة الغلاف. يرجى إدخال رابط يبدأ بـ http:// أو https://');
        }
        finalCoverUrl = coverUrlInput.trim() || null;
      }

      // 3. Database save
      console.log('[PUBLISHED REPORT] Database save start');
      setSaveStatusText('جاري حفظ بيانات التقرير في قاعدة البيانات...');
      
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      const authorId = session?.user?.id || (typeof adminUser?.id === 'string' && adminUser.id.length === 36 ? adminUser.id : adminUser?.auth_user_id) || null;

      const reportData: any = {
        title_ar: titleAr.trim(),
        title_en: titleEn.trim(),
        description_ar: descriptionAr.trim() || null,
        description_en: descriptionEn.trim() || null,
        sector: sector || null,
        keywords: tagsArray,
        report_date: reportDate,
        status,
        is_published: status === 'published',
        pdf_url: finalPdfUrl,
        cover_image_url: finalCoverUrl,
        file_size: fileSize,
        pages_count: pageCount,
        updated_at: new Date().toISOString()
      };

      let dbResult: any;
      if (editingReport) {
        dbResult = await supabase
          .from('reports')
          .update(reportData)
          .eq('id', editingReport.id)
          .select();
      } else {
        if (authorId) {
          reportData.created_by = authorId;
        }

        dbResult = await supabase
          .from('reports')
          .insert(reportData)
          .select();
      }

      console.log('[PUBLISHED REPORT] Database response:', {
        status: dbResult?.status,
        data: dbResult?.data,
        error: dbResult?.error
      });

      if (dbResult?.error) {
        // Cleanup newly uploaded orphan files if DB save failed
        if (newlyUploadedPaths.length > 0) {
          console.log('[PUBLISHED REPORT] Cleaning up orphan files after DB error:', newlyUploadedPaths);
          try {
            await supabase.storage.from('reports').remove(newlyUploadedPaths);
          } catch (cleanupErr) {
            console.warn('[PUBLISHED REPORT] Orphan cleanup warning:', cleanupErr);
          }
        }
        throw dbResult.error;
      }

      // 4. Confirm success to user
      setSaveStatusText('تم نشر التقرير بنجاح');
      setSaveSuccess(true);

      setTimeout(() => {
        setIsModalOpen(false);
        setSaving(false);
        setSaveStatusText('');
        setSaveSuccess(false);
        fetchReports();
      }, 700);

    } catch (err: any) {
      console.warn('[PUBLISHED REPORT] Save failed:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });

      // Cleanup newly uploaded orphan files if any were uploaded before the error
      if (newlyUploadedPaths.length > 0) {
        console.log('[PUBLISHED REPORT] Cleaning up orphan files after exception:', newlyUploadedPaths);
        try {
          await supabase.storage.from('reports').remove(newlyUploadedPaths);
        } catch (cleanupErr) {
          console.warn('[PUBLISHED REPORT] Orphan cleanup warning:', cleanupErr);
        }
      }

      const message = err.message || err.error_description || 'تعذر حفظ بيانات التقرير';
      setSaveError(message);
      setSaving(false);
      setSaveStatusText('');
    }
  };

  const handleViewPdf = (pdfUrl: string) => {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank');
  };

  const handleDownloadPdf = (pdfUrl: string, title: string) => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title || 'report'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string | number, pdfUrl: string, coverUrl: string | null) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التقرير؟ سيتم حذف الملفات المرتبطة به أيضاً.')) return;
    
    try {
      if (pdfUrl) {
        const pdfPath = pdfUrl.split('/reports/').pop();
        if (pdfPath) await supabase.storage.from('reports').remove([pdfPath]);
      }
      if (coverUrl) {
        const coverPath = coverUrl.split('/reports/').pop();
        if (coverPath) await supabase.storage.from('reports').remove([coverPath]);
      }

      const { error } = await supabase.from('reports').delete().eq('id', id);
      if (error) throw error;
      
      fetchReports();
    } catch (err: any) {
      console.error(err);
      alert('خطأ أثناء الحذف');
    }
  };

  const handleStatusChange = async (id: string | number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      fetchReports();
    } catch (err) {
      console.error(err);
      alert('خطأ أثناء تحديث الحالة');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const filteredReports = reports.filter(r => 
    r.title_ar.includes(searchTerm) || 
    r.title_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.sector && r.sector.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">التقارير والدراسات (PDF)</h1>
          <p className="text-slate-500 mt-1">إدارة التقارير المرفوعة والمنشورة على المنصة العامة</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-blue-900 transition-colors"
        >
          <Plus size={20} />
          <span>إضافة تقرير جديد</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="البحث في التقارير..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 font-bold text-slate-600">العنوان</th>
                <th className="py-4 px-6 font-bold text-slate-600">القطاع</th>
                <th className="py-4 px-6 font-bold text-slate-600">تاريخ النشر</th>
                <th className="py-4 px-6 font-bold text-slate-600">الحجم</th>
                <th className="py-4 px-6 font-bold text-slate-600 text-center">مشاهدات/تحميل</th>
                <th className="py-4 px-6 font-bold text-slate-600">الحالة</th>
                <th className="py-4 px-6 font-bold text-slate-600 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    جاري تحميل التقارير...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-12 h-12 text-slate-300 mb-4" />
                      <p className="text-slate-500 text-lg">لا توجد تقارير مطابقة للبحث</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {report.cover_image_url ? (
                          <img src={report.cover_image_url} alt="" className="w-10 h-12 object-cover rounded border" />
                        ) : (
                          <div className="w-10 h-12 bg-slate-100 rounded border flex items-center justify-center text-slate-400">
                            <FileText size={20} />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-800 line-clamp-1">{report.title_ar}</div>
                          <div className="text-xs text-slate-500 line-clamp-1" dir="ltr">{report.title_en}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {sectors.find(s => s.sector_code === report.sector)?.name_ar || report.sector || '-'}
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-mono text-sm" dir="ltr">
                      {report.report_date}
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-mono text-sm" dir="ltr">
                      {formatFileSize(report.file_size)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-4 text-slate-500 text-sm font-mono" dir="ltr">
                        <span className="flex items-center gap-1"><Eye size={14} /> {report.views_count}</span>
                        <span className="flex items-center gap-1"><Download size={14} /> {report.downloads_count}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={report.status}
                        onChange={(e) => handleStatusChange(report.id, e.target.value)}
                        className={`text-sm font-bold px-3 py-1 rounded-full outline-none appearance-none cursor-pointer border ${
                          report.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' :
                          report.status === 'draft' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="draft">مسودة</option>
                        <option value="published">منشور</option>
                        <option value="archived">مؤرشف</option>
                      </select>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          type="button"
                          onClick={() => handleViewPdf(report.pdf_url)} 
                          className="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all"
                          title="عرض PDF"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDownloadPdf(report.pdf_url, report.title_ar || report.title_en)} 
                          className="p-2 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all"
                          title="تحميل PDF"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleOpenModal(report)}
                          className="p-2 text-slate-400 hover:text-[#1e3a8a] bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all"
                          title="تعديل"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(report.id, report.pdf_url, report.cover_image_url)}
                          className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                {editingReport ? 'تعديل التقرير' : 'إضافة تقرير جديد'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="report-form" onSubmit={handleSave} className="space-y-6">
                
                {/* Error Banner */}
                {saveError && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                    <div className="flex-1 font-semibold">{saveError}</div>
                  </div>
                )}

                {/* Progress / Success Banner */}
                {(saving || saveSuccess) && (
                  <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-bold border transition-all ${
                    saveSuccess 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}>
                    {saveSuccess ? (
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                    ) : (
                      <Loader2 className="w-5 h-5 flex-shrink-0 text-[#1e3a8a] animate-spin" />
                    )}
                    <div className="flex-1">{saveStatusText || 'جاري معالجة ونشر التقرير...'}</div>
                  </div>
                )}

                {/* Titles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">عنوان التقرير (عربي) *</label>
                    <input 
                      required
                      type="text" 
                      disabled={saving}
                      value={titleAr}
                      onChange={e => setTitleAr(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">عنوان التقرير (إنجليزي) *</label>
                    <input 
                      required
                      type="text" 
                      disabled={saving}
                      value={titleEn}
                      onChange={e => setTitleEn(e.target.value)}
                      dir="ltr"
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400" 
                    />
                  </div>
                </div>

                {/* Descriptions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">وصف مختصر (عربي)</label>
                    <textarea 
                      rows={3}
                      disabled={saving}
                      value={descriptionAr}
                      onChange={e => setDescriptionAr(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all resize-none disabled:bg-slate-100 disabled:text-slate-400" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">وصف مختصر (إنجليزي)</label>
                    <textarea 
                      rows={3}
                      disabled={saving}
                      value={descriptionEn}
                      onChange={e => setDescriptionEn(e.target.value)}
                      dir="ltr"
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all resize-none disabled:bg-slate-100 disabled:text-slate-400" 
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">القطاع</label>
                    <select 
                      disabled={saving}
                      value={sector}
                      onChange={e => setSector(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">عام / جميع القطاعات</option>
                      {sectors.map(s => (
                        <option key={s.id} value={s.sector_code}>{s.name_ar}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">تاريخ التقرير *</label>
                    <input 
                      required
                      type="date" 
                      disabled={saving}
                      value={reportDate}
                      onChange={e => setReportDate(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all font-mono disabled:bg-slate-100 disabled:text-slate-400" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">حالة النشر</label>
                    <select 
                      disabled={saving}
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="draft">مسودة</option>
                      <option value="published">منشور</option>
                      <option value="archived">مؤرشف</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">الكلمات المفتاحية (مفصولة بفاصلة)</label>
                  <input 
                    type="text" 
                    disabled={saving}
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="طاقة، نفط، 2026..."
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400" 
                  />
                </div>

                {/* Files Section */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-xl border border-slate-200">
                    
                    {/* PDF Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-bold text-slate-700">
                          ملف التقرير (PDF) {editingReport ? '' : '*'}
                        </label>
                        <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-medium">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setPdfSourceType('upload')}
                            className={`px-3 py-1 rounded-md transition-all ${
                              pdfSourceType === 'upload' 
                                ? 'bg-white text-[#1e3a8a] font-bold shadow-sm' 
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <Upload size={12} />
                              رفع ملف
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setPdfSourceType('url')}
                            className={`px-3 py-1 rounded-md transition-all ${
                              pdfSourceType === 'url' 
                                ? 'bg-white text-[#1e3a8a] font-bold shadow-sm' 
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <LinkIcon size={12} />
                              رابط مباشر
                            </span>
                          </button>
                        </div>
                      </div>

                      {pdfSourceType === 'upload' ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <input 
                              type="file" 
                              accept=".pdf,application/pdf"
                              disabled={saving}
                              onChange={e => {
                                const file = e.target.files?.[0] || null;
                                setPdfFile(file);
                                if (file && file.size > 100 * 1024 * 1024) {
                                  setSaveError('حجم ملف PDF يتجاوز الحد الأقصى المسموح به وهو 100MB.');
                                } else if (saveError === 'حجم ملف PDF يتجاوز الحد الأقصى المسموح به وهو 100MB.') {
                                  setSaveError(null);
                                }
                              }}
                              className="hidden"
                              id="pdf-upload"
                            />
                            <label 
                              htmlFor={saving ? undefined : "pdf-upload"}
                              className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl transition-colors ${
                                saving ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-slate-100'
                              }`}
                            >
                              <Upload className="w-8 h-8 text-slate-400 mb-2" />
                              <span className="text-sm text-slate-600 font-medium text-center px-4 truncate max-w-full">
                                {pdfFile ? pdfFile.name : (editingReport?.pdf_url ? 'تغيير ملف PDF الحالي' : 'اختر ملف PDF من جهازك')}
                              </span>
                              {pdfFile && (
                                <span className={`text-xs font-semibold mt-1 ${pdfFile.size > 100 * 1024 * 1024 ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB {pdfFile.size > 100 * 1024 * 1024 ? '(يتجاوز 100MB)' : 'جاهز للرفع'}
                                </span>
                              )}
                              {editingReport?.pdf_url && !pdfFile && (
                                <span className="text-xs text-blue-600 mt-1 truncate max-w-[280px]">
                                  ملف التقرير المحفوظ
                                </span>
                              )}
                            </label>
                          </div>

                          {/* Pre-upload size notice if exceeds 100MB */}
                          {pdfFile && pdfFile.size > 100 * 1024 * 1024 && (
                            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold flex items-center gap-1.5 leading-relaxed">
                              <AlertCircle size={15} className="flex-shrink-0 text-red-500" />
                              <span>حجم ملف PDF يتجاوز الحد الأقصى المسموح به وهو 100MB.</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="relative">
                            <input 
                              type="url"
                              disabled={saving}
                              value={pdfUrlInput}
                              onChange={e => setPdfUrlInput(e.target.value)}
                              placeholder="https://drive.google.com/... أو https://example.com/report.pdf"
                              dir="ltr"
                              className="w-full p-3 pl-9 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all text-sm disabled:bg-slate-100"
                            />
                            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            أدخل رابطاً مباشراً لملف PDF (مثل رابط مشاركة عام من Google Drive أو Dropbox أو خادم خارجي).
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Cover Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-bold text-slate-700">
                          صورة الغلاف (اختياري)
                        </label>
                        <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-medium">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setCoverSourceType('upload')}
                            className={`px-3 py-1 rounded-md transition-all ${
                              coverSourceType === 'upload' 
                                ? 'bg-white text-[#1e3a8a] font-bold shadow-sm' 
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <Upload size={12} />
                              رفع صورة
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setCoverSourceType('url')}
                            className={`px-3 py-1 rounded-md transition-all ${
                              coverSourceType === 'url' 
                                ? 'bg-white text-[#1e3a8a] font-bold shadow-sm' 
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <LinkIcon size={12} />
                              رابط مباشر
                            </span>
                          </button>
                        </div>
                      </div>

                      {coverSourceType === 'upload' ? (
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*"
                            disabled={saving}
                            onChange={e => setCoverFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="cover-upload"
                          />
                          <label 
                            htmlFor={saving ? undefined : "cover-upload"}
                            className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl transition-colors overflow-hidden relative ${
                              saving ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-slate-100'
                            }`}
                          >
                            {coverFile ? (
                              <img src={URL.createObjectURL(coverFile)} alt="Preview" className="w-full h-full object-cover" />
                            ) : (editingReport?.cover_image_url && !coverFile) ? (
                              <img src={editingReport.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                              <>
                                <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                                <span className="text-sm text-slate-600 font-medium">اختر صورة غلاف</span>
                              </>
                            )}
                          </label>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="relative">
                            <input 
                              type="url"
                              disabled={saving}
                              value={coverUrlInput}
                              onChange={e => setCoverUrlInput(e.target.value)}
                              placeholder="https://example.com/cover.png"
                              dir="ltr"
                              className="w-full p-3 pl-9 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all text-sm disabled:bg-slate-100"
                            />
                            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          </div>
                          {coverUrlInput && (
                            <div className="h-20 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                              <img 
                                src={coverUrlInput} 
                                alt="Preview" 
                                className="h-full w-full object-cover" 
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} 
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl mt-auto">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                disabled={saving}
              >
                إلغاء
              </button>
              <button
                type="submit"
                form="report-form"
                disabled={saving}
                className="flex items-center justify-center gap-2 px-8 py-2.5 bg-[#1e3a8a] text-white font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-75 disabled:cursor-not-allowed min-w-[170px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-semibold">{saveStatusText || 'جاري الحفظ...'}</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span>تم النشر بنجاح</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>حفظ التقرير</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
