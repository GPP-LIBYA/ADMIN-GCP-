import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { AdminUser, AdminRole } from '../types';
import { useAuthStore } from '../store/authStore';
import { adminService } from '../services/adminService';
import { 
  Plus, Edit2, ShieldAlert, X, ShieldCheck, Trash2, 
  KeyRound, Copy, Check, Eye, EyeOff, UserCheck, UserX, RefreshCw 
} from 'lucide-react';

export default function Admins() {
  const { adminUser: currentUser } = useAuthStore();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminUser | null>(null);
  const [creationMode, setCreationMode] = useState<'invite' | 'password'>('invite');
  const [tempPasswordInput, setTempPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Created credentials modal
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    fullName: string;
    role: string;
    tempPassword: string | null;
    invited: boolean;
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Form State
  const [form, setForm] = useState<{
    email: string;
    full_name: string;
    role: 'Admin' | 'Viewer' | 'super_admin';
    is_active: boolean;
    can_manage_admins: boolean;
    can_manage_prices: boolean;
    can_import_prices: boolean;
    can_manage_news: boolean;
    can_manage_analysis: boolean;
    can_manage_messages: boolean;
    can_view_visits: boolean;
    can_manage_settings: boolean;
  }>({
    email: '',
    full_name: '',
    role: 'Admin',
    is_active: true,
    can_manage_admins: false,
    can_manage_prices: true,
    can_import_prices: false,
    can_manage_news: true,
    can_manage_analysis: true,
    can_manage_messages: false,
    can_view_visits: true,
    can_manage_settings: false
  });
  
  const [saving, setSaving] = useState(false);
  const [actionLoadingEmail, setActionLoadingEmail] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Authorization checks
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isViewer = currentUser?.role === 'Viewer';
  const canManage = isSuperAdmin || (currentUser?.can_manage_admins && !isViewer);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (err) throw err;
      setAdmins(data || []);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ في جلب بيانات المسؤولين');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormError(null);
    setCreationMode('invite');
    setTempPasswordInput('');
    setShowPassword(false);
    setForm({
      email: '',
      full_name: '',
      role: 'Admin',
      is_active: true,
      can_manage_admins: false,
      can_manage_prices: true,
      can_import_prices: false,
      can_manage_news: true,
      can_manage_analysis: true,
      can_manage_messages: false,
      can_view_visits: true,
      can_manage_settings: false
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: AdminUser) => {
    setEditingItem(item);
    setFormError(null);
    setForm({
      email: item.email,
      full_name: item.full_name || '',
      role: item.role as any,
      is_active: item.is_active,
      can_manage_admins: item.can_manage_admins || false,
      can_manage_prices: item.can_manage_prices || false,
      can_import_prices: item.can_import_prices || false,
      can_manage_news: item.can_manage_news || false,
      can_manage_analysis: item.can_manage_analysis || false,
      can_manage_messages: item.can_manage_messages || false,
      can_view_visits: item.can_view_visits || false,
      can_manage_settings: item.can_manage_settings || false
    });
    setIsModalOpen(true);
  };

  const handleRoleChange = (newRole: 'Admin' | 'Viewer') => {
    if (newRole === 'Viewer') {
      // Clear all permissions for Viewer
      setForm(prev => ({
        ...prev,
        role: newRole,
        can_manage_admins: false,
        can_manage_prices: false,
        can_import_prices: false,
        can_manage_news: false,
        can_manage_analysis: false,
        can_manage_messages: false,
        can_view_visits: false,
        can_manage_settings: false
      }));
    } else {
      // Default permissions for Admin
      setForm(prev => ({
        ...prev,
        role: newRole,
        can_manage_prices: true,
        can_manage_news: true,
        can_manage_analysis: true,
        can_view_visits: true
      }));
    }
  };

  const saveAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.email) {
      setFormError('البريد الإلكتروني مطلوب');
      return;
    }

    if (!isSuperAdmin) {
      setFormError('تقتصر إدارة وحفظ المسؤولين على Super Admin فقط');
      return;
    }

    try {
      setSaving(true);

      if (editingItem) {
        // Edit mode
        const isTargetSelf = currentUser?.auth_user_id && editingItem.auth_user_id
          ? currentUser.auth_user_id === editingItem.auth_user_id
          : (currentUser?.email?.toLowerCase() === editingItem.email?.toLowerCase() || currentUser?.id === editingItem.id);

        if (editingItem.role === 'super_admin' && !isTargetSelf) {
          setFormError('لا يمكنك تعديل بيانات Super Admin آخر');
          return;
        }

        const res = await adminService.updateAdmin({
          email: editingItem.email,
          full_name: form.full_name,
          role: form.role,
          permissions: {
            can_manage_admins: form.can_manage_admins,
            can_manage_prices: form.can_manage_prices,
            can_import_prices: form.can_import_prices,
            can_manage_news: form.can_manage_news,
            can_manage_analysis: form.can_manage_analysis,
            can_manage_messages: form.can_manage_messages,
            can_view_visits: form.can_view_visits,
            can_manage_settings: form.can_manage_settings
          }
        });

        setIsModalOpen(false);
        setSuccessMsg(res.message || 'تم تحديث بيانات المسؤول بنجاح');
        setTimeout(() => setSuccessMsg(null), 5000);
        await fetchAdmins();

      } else {
        // Create mode
        if (creationMode === 'password' && (!tempPasswordInput || tempPasswordInput.length < 6)) {
          setFormError('كلمة المرور المؤقتة يجب أن تتكون من 6 خانات على الأقل');
          return;
        }

        const res = await adminService.createAdmin({
          email: form.email,
          full_name: form.full_name,
          role: form.role as 'Admin' | 'Viewer',
          invite_mode: creationMode === 'invite',
          password: creationMode === 'password' ? tempPasswordInput : undefined,
          permissions: {
            can_manage_admins: form.can_manage_admins,
            can_manage_prices: form.can_manage_prices,
            can_import_prices: form.can_import_prices,
            can_manage_news: form.can_manage_news,
            can_manage_analysis: form.can_manage_analysis,
            can_manage_messages: form.can_manage_messages,
            can_view_visits: form.can_view_visits,
            can_manage_settings: form.can_manage_settings
          }
        });

        setIsModalOpen(false);
        await fetchAdmins();

        // Show credentials result
        setCreatedCredentials({
          email: form.email,
          fullName: form.full_name,
          role: form.role,
          tempPassword: res.temp_password || (creationMode === 'password' ? tempPasswordInput : null),
          invited: !!res.invited
        });
      }

    } catch (err: any) {
      setFormError(err.message || 'تعذر تنفيذ العملية');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: AdminUser) => {
    if (!isSuperAdmin) {
      alert('ليس لديك صلاحية لتنفيذ هذه العملية. تتطلب صلاحية Super Admin');
      return;
    }

    const isSelf = currentUser?.auth_user_id && item.auth_user_id
      ? currentUser.auth_user_id === item.auth_user_id
      : (item.email?.toLowerCase() === currentUser?.email?.toLowerCase() || item.id === currentUser?.id);

    if (isSelf) {
      alert('لا يمكنك تعطيل حسابك الخاص');
      return;
    }

    if (item.role === 'super_admin') {
      alert('لا يمكن تعطيل حساب Super Admin');
      return;
    }

    const actionText = item.is_active ? 'تعطيل' : 'تفعيل';
    if (!window.confirm(`هل أنت متأكد من ${actionText} حساب "${item.full_name || item.email}"؟`)) {
      return;
    }

    try {
      setActionLoadingEmail(item.email);
      const res = await adminService.toggleActive(item.email);
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(null), 5000);
      setAdmins(prev => prev.map(a => a.email === item.email ? { ...a, is_active: !a.is_active } : a));
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تعديل حالة الحساب');
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const handleResetPassword = async (item: AdminUser) => {
    if (!isSuperAdmin) {
      alert('ليس لديك صلاحية لتنفيذ هذه العملية');
      return;
    }

    if (!window.confirm(`هل تريد إرسال رابط إعادة تعيين كلمة المرور إلى البريد: ${item.email}؟`)) {
      return;
    }

    try {
      setActionLoadingEmail(item.email);
      const res = await adminService.resetPassword(item.email);
      alert(res.message);
    } catch (err: any) {
      alert(err.message || 'تعذر إرسال رابط إعادة التعيين');
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const deleteAdmin = async (item: AdminUser) => {
    if (!isSuperAdmin) {
      alert('ليس لديك صلاحية لتنفيذ هذه العملية. يقتصر الحذف على Super Admin فقط.');
      return;
    }

    const isSelf = currentUser?.auth_user_id && item.auth_user_id
      ? currentUser.auth_user_id === item.auth_user_id
      : (item.email?.toLowerCase() === currentUser?.email?.toLowerCase() || item.id === currentUser?.id);

    if (isSelf) {
      alert('لا يمكنك حذف حسابك الخاص');
      return;
    }

    if (item.role === 'super_admin') {
      const superAdmins = admins.filter(a => a.role === 'super_admin');
      if (superAdmins.length <= 1) {
        alert('لا يمكن حذف آخر Super Admin في النظام!');
        return;
      }
    }

    const confirmMsg = `تنبيه أمني هام:
أنت على وشك حذف حساب المسؤول: "${item.full_name || item.email}" نهائياً.

هل أنت متأكد من المتابعة وحذف الحساب بالكامل؟
(ملاحظة: يمكنك استخدام خيار "التعطيل" بدلاً من الحذف للحفاظ على سجلات النشاط).`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setActionLoadingEmail(item.email);
      const res = await adminService.deleteAdmin(item.email);
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(null), 5000);
      setAdmins(prev => prev.filter(a => a.email !== item.email));
    } catch (err: any) {
      alert(err.message || 'تعذر حذف المسؤول');
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 3000);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading && admins.length === 0) {
    return <div className="p-12 text-center text-slate-500 font-medium">جاري تحميل بيانات المسؤولين...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إدارة مدراء النظام</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            إدارة الحسابات الإدارية والصلاحيات وحالة النشاط عبر نظام آمن موحد
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdmins}
            disabled={loading}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-border rounded-lg transition"
            title="تحديث القائمة"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          {canManage && (
            <button 
              onClick={openAddModal}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 transition font-medium text-sm shadow-sm"
            >
              <Plus size={18} />
              إضافة مسؤول جديد
            </button>
          )}
        </div>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 p-4 rounded-xl flex items-center gap-3 text-sm">
          <Check size={18} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border p-4 rounded-xl flex items-start gap-3">
        <ShieldAlert className="mt-0.5 shrink-0 text-primary-600" size={20} />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-slate-900 dark:text-white">نظام إدارة الأدمن الآمن (Supabase Integration)</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            تتم جميع عمليات إنشاء الحسابات وتعديل الصلاحيات وتفعيل/تعطيل المسؤولين بشكل تلقائي وآمن عبر Supabase Edge Functions. لا حاجة للدخول يدوياً إلى لوحة تحكم Supabase.
          </p>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 dark:bg-dark-bg text-slate-600 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-dark-border">
              <tr>
                <th className="px-4 py-3.5">الاسم</th>
                <th className="px-4 py-3.5">البريد الإلكتروني</th>
                <th className="px-4 py-3.5 text-center">الدور</th>
                <th className="px-4 py-3.5 text-center">الحالة</th>
                <th className="px-4 py-3.5 text-center">تاريخ الإنشاء</th>
                <th className="px-4 py-3.5 text-center">آخر تحديث</th>
                <th className="px-4 py-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
              {admins.map(item => {
                const isItemSuperAdmin = item.role === 'super_admin';
                const isCurrentAccount = item.email?.toLowerCase() === currentUser?.email?.toLowerCase();
                const canEditThisItem = isSuperAdmin && (!isItemSuperAdmin || isCurrentAccount);
                const canToggleThisItem = isSuperAdmin && !isItemSuperAdmin && !isCurrentAccount;
                const canDeleteThisItem = isSuperAdmin && !isCurrentAccount;

                return (
                  <tr key={item.email} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{item.full_name || '-'}</span>
                        {isCurrentAccount && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                            (أنت)
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300 text-xs" dir="ltr">
                      {item.email}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isItemSuperAdmin 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                          : item.role === 'Admin'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {isItemSuperAdmin ? 'Super Admin' : item.role === 'Admin' ? 'Admin' : 'Viewer'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {isSuperAdmin && !isItemSuperAdmin && !isCurrentAccount ? (
                        <button
                          onClick={() => toggleActive(item)}
                          disabled={actionLoadingEmail === item.email}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                            item.is_active 
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300' 
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-300'
                          }`}
                          title="اضغط لتغيير حالة التفعيل"
                        >
                          {item.is_active ? <UserCheck size={14} /> : <UserX size={14} />}
                          <span>{item.is_active ? 'نشط' : 'معطل'}</span>
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          item.is_active 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                        }`}>
                          {item.is_active ? 'نشط' : 'معطل'}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(item.created_at)}
                    </td>

                    <td className="px-4 py-3.5 text-center text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(item.updated_at)}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {isViewer ? (
                        <span className="text-xs text-slate-400">عرض فقط</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          {canEditThisItem && (
                            <button 
                              onClick={() => openEditModal(item)} 
                              className="p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-md transition"
                              title="تعديل البيانات والصلاحيات"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}

                          {isSuperAdmin && (
                            <button
                              onClick={() => handleResetPassword(item)}
                              disabled={actionLoadingEmail === item.email}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-md transition"
                              title="إرسال رابط إعادة تعيين كلمة المرور"
                            >
                              <KeyRound size={16} />
                            </button>
                          )}

                          {canDeleteThisItem && (
                            <button 
                              onClick={() => deleteAdmin(item)} 
                              disabled={actionLoadingEmail === item.email}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition"
                              title="حذف الحساب نهائياً"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-dark-border">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/60 flex items-center justify-center text-primary-600 dark:text-primary-400">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingItem ? 'تعديل بيانات وصلاحيات المسؤول' : 'إضافة مسؤول إداري جديد'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {editingItem ? `تحديث حساب: ${editingItem.email}` : 'سيتم إنشاء الحساب في نظام المصادقة وربط الصلاحيات تلقائياً'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300 p-3.5 rounded-xl text-sm">
                  {formError}
                </div>
              )}

              <form id="admin-form" onSubmit={saveAdmin} className="space-y-5">
                {/* Basic Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      البريد الإلكتروني <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="email" 
                      dir="ltr"
                      required 
                      disabled={!!editingItem}
                      value={form.email} 
                      onChange={e => setForm({...form, email: e.target.value})} 
                      placeholder="admin@example.com"
                      className="w-full border border-slate-300 dark:border-dark-border rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none dark:bg-dark-bg dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      الاسم الكامل
                    </label>
                    <input 
                      type="text" 
                      value={form.full_name} 
                      onChange={e => setForm({...form, full_name: e.target.value})} 
                      placeholder="مثال: أحمد محمد"
                      className="w-full border border-slate-300 dark:border-dark-border rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none dark:bg-dark-bg dark:text-white" 
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    الدور (Role) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={editingItem?.role === 'super_admin'}
                      onClick={() => handleRoleChange('Admin')}
                      className={`p-3 rounded-xl border text-right transition flex flex-col gap-1 ${
                        form.role === 'Admin'
                          ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-950/30 text-primary-900 dark:text-primary-200'
                          : 'border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="font-bold text-sm">مسؤول (Admin)</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">صلاحيات قابلة للتخصيص لإدارة الأسعار والأخبار والتحليلات</span>
                    </button>

                    <button
                      type="button"
                      disabled={editingItem?.role === 'super_admin'}
                      onClick={() => handleRoleChange('Viewer')}
                      className={`p-3 rounded-xl border text-right transition flex flex-col gap-1 ${
                        form.role === 'Viewer'
                          ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-950/30 text-primary-900 dark:text-primary-200'
                          : 'border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="font-bold text-sm">مشاهد فقط (Viewer)</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">اطلاع فقط دون إمكانية التعديل أو الحذف أو إدارة المستخدمين</span>
                    </button>
                  </div>
                  {editingItem?.role === 'super_admin' && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1.5">
                      دور Super Admin محمي ولا يمكن تغييره.
                    </p>
                  )}
                </div>

                {/* Creation Mode (For New Admin only) */}
                {!editingItem && (
                  <div className="bg-slate-50 dark:bg-dark-bg p-4 rounded-xl border border-slate-200 dark:border-dark-border space-y-3">
                    <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                      طريقة تفعيل الحساب
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="creation_mode"
                          checked={creationMode === 'invite'}
                          onChange={() => setCreationMode('invite')}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <span>إرسال دعوة بالبريد الإلكتروني (موصى به)</span>
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="creation_mode"
                          checked={creationMode === 'password'}
                          onChange={() => setCreationMode('password')}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <span>تعيين كلمة مرور مؤقتة مباشرة</span>
                      </label>
                    </div>

                    {creationMode === 'password' && (
                      <div className="pt-2">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          كلمة المرور المؤقتة (6 خانات على الأقل)
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            dir="ltr"
                            value={tempPasswordInput}
                            onChange={e => setTempPasswordInput(e.target.value)}
                            placeholder="أدخل كلمة مرور قوية"
                            className="w-full border border-slate-300 dark:border-dark-border rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none dark:bg-dark-card dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Detailed Permissions */}
                <div className="border-t border-slate-200 dark:border-dark-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      الصلاحيات التفصيلية
                    </h3>
                    {form.role === 'Viewer' && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        (غير مفعلة لحساب المشاهد Viewer)
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 bg-slate-50 dark:bg-dark-bg p-4 rounded-xl border border-slate-200 dark:border-dark-border">
                    {[
                      { key: 'can_manage_prices', label: 'إدارة وتعديل الأسعار' },
                      { key: 'can_import_prices', label: 'استيراد الأسعار من CSV' },
                      { key: 'can_manage_news', label: 'إدارة وتحديث الأخبار' },
                      { key: 'can_manage_analysis', label: 'إدارة ونشر التحليلات' },
                      { key: 'can_manage_messages', label: 'إدارة الرسائل الواردة' },
                      { key: 'can_view_visits', label: 'الاطلاع على إحصائيات الزيارات' },
                      { key: 'can_manage_admins', label: 'إدارة حسابات الأدمن' },
                      { key: 'can_manage_settings', label: 'إدارة الإعدادات العامة' },
                    ].map(perm => (
                      <div key={perm.key} className="flex items-center gap-2.5">
                        <input 
                          type="checkbox" 
                          id={perm.key} 
                          checked={(form as any)[perm.key]} 
                          onChange={e => setForm({...form, [perm.key]: e.target.checked})} 
                          className="w-4 h-4 rounded border-slate-300 dark:border-dark-border text-primary-600 focus:ring-primary-500 disabled:opacity-50" 
                          disabled={form.role === 'Viewer' || form.role === 'super_admin'}
                        />
                        <label 
                          htmlFor={perm.key} 
                          className={`text-sm select-none ${
                            form.role === 'Viewer' 
                              ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                              : 'text-slate-700 dark:text-slate-300 cursor-pointer'
                          }`}
                        >
                          {perm.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-dark-border flex justify-end gap-3 bg-slate-50 dark:bg-dark-bg rounded-b-2xl">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-4 py-2.5 border border-slate-300 dark:border-dark-border rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-dark-card hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                إلغاء
              </button>
              <button 
                type="submit" 
                form="admin-form" 
                disabled={saving} 
                className="px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {saving && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>}
                {editingItem ? 'حفظ التعديلات' : 'إنشاء الحساب الإداري'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created Credentials Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-200 dark:border-dark-border space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto">
              <Check size={28} />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                تم إنشاء حساب المسؤول بنجاح
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {createdCredentials.invited 
                  ? 'تم إرسال رابط الدعوة إلى البريد الإلكتروني للمسؤول بنجاح.'
                  : 'تم تفعيل الحساب بكلمة مرور مؤقتة، يرجى مشاركتها مع المسؤول بشكل آمن.'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-dark-bg p-4 rounded-xl border border-slate-200 dark:border-dark-border space-y-2 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-dark-border">
                <span className="text-slate-500">الاسم:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{createdCredentials.fullName || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-dark-border">
                <span className="text-slate-500">البريد الإلكتروني:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200" dir="ltr">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-dark-border">
                <span className="text-slate-500">الدور:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{createdCredentials.role}</span>
              </div>

              {createdCredentials.tempPassword && (
                <div className="pt-2">
                  <span className="block text-xs font-semibold text-slate-500 mb-1">كلمة المرور المؤقتة:</span>
                  <div className="flex items-center justify-between bg-white dark:bg-dark-card border border-primary-200 dark:border-primary-900 rounded-lg p-2.5">
                    <span className="font-mono text-sm font-bold text-primary-700 dark:text-primary-300" dir="ltr">
                      {createdCredentials.tempPassword}
                    </span>
                    <button
                      onClick={() => copyToClipboard(createdCredentials.tempPassword!)}
                      className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition flex items-center gap-1 text-xs"
                      title="نسخ كلمة المرور"
                    >
                      {copiedPassword ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                      <span>{copiedPassword ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setCreatedCredentials(null)}
                className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition"
              >
                تم، إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
