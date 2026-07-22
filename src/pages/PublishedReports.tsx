import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { FileText, Plus, Search, Edit, Trash2, Eye, Download, Archive, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Report } from '../types';

export default function PublishedReports() {
  const { adminUser } = useAuthStore();
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
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  
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
      setTags(report.tags.join(', '));
      setReportDate(report.report_date);
      setStatus(report.status);
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
    }
    setPdfFile(null);
    setCoverFile(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      let pdfUrl = editingReport?.pdf_url || '';
      let coverUrl = editingReport?.cover_image_url || null;
      let fileSize = editingReport?.file_size || null;
      let pageCount = editingReport?.page_count || null;

      // Upload PDF if selected
      if (pdfFile) {
        const fileExt = pdfFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `pdfs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(filePath, pdfFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('reports')
          .getPublicUrl(filePath);
          
        pdfUrl = publicUrl;
        fileSize = pdfFile.size;
        // In a real app we might parse the PDF to get page count, but for now we leave it null or ask user
      }

      // Upload Cover if selected
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `covers/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(filePath, coverFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('reports')
          .getPublicUrl(filePath);
          
        coverUrl = publicUrl;
      }

      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);

      const reportData = {
        title_ar: titleAr,
        title_en: titleEn,
        description_ar: descriptionAr,
        description_en: descriptionEn,
        sector,
        tags: tagsArray,
        report_date: reportDate,
        status,
        pdf_url: pdfUrl,
        cover_image_url: coverUrl,
        file_size: fileSize,
        page_count: pageCount,
        uploaded_by: adminUser?.id,
        updated_at: new Date().toISOString()
      };

      if (editingReport) {
        const { error } = await supabase
          .from('reports')
          .update(reportData)
          .eq('id', editingReport.id);
        if (error) throw error;
      } else {
        if (!pdfUrl) {
          throw new Error('يجب اختيار ملف PDF');
        }
        const { error } = await supabase
          .from('reports')
          .insert(reportData);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchReports();
    } catch (err: any) {
      console.error(err);
      alert('خطأ أثناء الحفظ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, pdfUrl: string, coverUrl: string | null) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التقرير؟ سيتم حذف الملفات المرتبطة به أيضاً.')) return;
    
    try {
      // Extract file paths from URLs and delete from storage
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

  const handleStatusChange = async (id: string, newStatus: string) => {
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
        <div className="flex items-center gap-3">
          <a
            href="#/public-reports"
            target="_blank"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-bold border border-slate-200"
          >
            <Eye size={20} />
            <span>معاينة المنصة العامة</span>
          </a>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-blue-900 transition-colors"
          >
            <Plus size={20} />
            <span>إضافة تقرير جديد</span>
          </button>
        </div>
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
                        <a 
                          href={report.pdf_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all"
                          title="عرض PDF"
                        >
                          <Eye size={18} />
                        </a>
                        <button 
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
              <form id="report-form" onSubmit={handleSave} className="space-y-8">
                
                {/* Titles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">عنوان التقرير (عربي) *</label>
                    <input 
                      required
                      type="text" 
                      value={titleAr}
                      onChange={e => setTitleAr(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">عنوان التقرير (إنجليزي) *</label>
                    <input 
                      required
                      type="text" 
                      value={titleEn}
                      onChange={e => setTitleEn(e.target.value)}
                      dir="ltr"
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all" 
                    />
                  </div>
                </div>

                {/* Descriptions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">وصف مختصر (عربي)</label>
                    <textarea 
                      rows={3}
                      value={descriptionAr}
                      onChange={e => setDescriptionAr(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all resize-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">وصف مختصر (إنجليزي)</label>
                    <textarea 
                      rows={3}
                      value={descriptionEn}
                      onChange={e => setDescriptionEn(e.target.value)}
                      dir="ltr"
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all resize-none" 
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">القطاع</label>
                    <select 
                      value={sector}
                      onChange={e => setSector(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all"
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
                      value={reportDate}
                      onChange={e => setReportDate(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all font-mono" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">حالة النشر</label>
                    <select 
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all"
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
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="طاقة، نفط، 2026..."
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all" 
                  />
                </div>

                {/* Files */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700">ملف التقرير (PDF) {editingReport ? '' : '*'}</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".pdf"
                        onChange={e => setPdfFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="pdf-upload"
                      />
                      <label 
                        htmlFor="pdf-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-600 font-medium">
                          {pdfFile ? pdfFile.name : (editingReport?.pdf_url ? 'تغيير الملف الحالي' : 'اختر ملف PDF')}
                        </span>
                        {editingReport?.pdf_url && !pdfFile && (
                          <span className="text-xs text-blue-600 mt-1">ملف مرفوع مسبقاً</span>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700">صورة الغلاف (اختياري)</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => setCoverFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="cover-upload"
                      />
                      <label 
                        htmlFor="cover-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors overflow-hidden relative"
                      >
                        {coverFile ? (
                          <img src={URL.createObjectURL(coverFile)} alt="Preview" className="w-full h-full object-cover" />
                        ) : editingReport?.cover_image_url ? (
                          <img src={editingReport.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                            <span className="text-sm text-slate-600 font-medium">اختر صورة غلاف</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl mt-auto">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                disabled={saving}
              >
                إلغاء
              </button>
              <button
                type="submit"
                form="report-form"
                disabled={saving}
                className="flex items-center justify-center gap-2 px-8 py-2.5 bg-[#1e3a8a] text-white font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-70 min-w-[140px]"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

// Needed missing import
import { Save } from 'lucide-react';
