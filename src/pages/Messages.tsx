import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Trash2, Mail, MailOpen, Eye, Archive, CheckCircle, X } from 'lucide-react';
import { formatAdminDateTime } from '../utils/dateUtils';

export default function Messages() {
  const { adminUser } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (err) throw err;
      setMessages(data || []);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ في جلب الرسائل');
    } finally {
      setLoading(false);
    }
  };

  const hasManagePermission = adminUser?.role === 'super_admin' || adminUser?.can_manage_messages;
  const hasDeletePermission = adminUser?.role === 'super_admin';

  const updateMessageStatus = async (id: string, updates: any) => {
    if (!hasManagePermission) {
      alert("ليس لديك صلاحية لتنفيذ هذه العملية");
      return;
    }
    try {
      const { error: err } = await supabase
        .from('messages')
        .update(updates)
        .eq('id', id);
        
      if (err) throw err;
      setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
      
      if (selectedMessage?.id === id) {
        setSelectedMessage({ ...selectedMessage, ...updates });
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التحديث');
    }
  };

  const deleteMessage = async (id: string) => {
    if (!hasDeletePermission) {
      alert("ليس لديك صلاحية الحذف، هذه العملية متاحة للسوبر أدمن فقط.");
      return;
    }
    
    if (!window.confirm("هل أنت متأكد من حذف هذه الرسالة؟ لا يمكن التراجع عن هذا الإجراء.")) {
      return;
    }
        
    try {
      const { error: err } = await supabase.from('messages').delete().eq('id', id);
      if (err) throw err;
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  if (loading && messages.length === 0) return <div className="p-8 text-center text-slate-500">جاري التحميل...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">صندوق الرسائل</h1>
        <div className="text-sm text-slate-500">إجمالي الرسائل: {messages.length}</div>
      </div>
      
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-dark-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b dark:border-dark-border">
              <tr>
                <th className="px-4 py-3 font-semibold">حالة القراءة</th>
                <th className="px-4 py-3 font-semibold">المرسل</th>
                <th className="px-4 py-3 font-semibold">البريد الإلكتروني</th>
                <th className="px-4 py-3 font-semibold">رقم الهاتف</th>
                <th className="px-4 py-3 font-semibold">المؤسسة</th>
                <th className="px-4 py-3 font-semibold">الموضوع</th>
                <th className="px-4 py-3 font-semibold">تاريخ الإرسال</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
              {messages.map(msg => (
                <tr key={msg.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${!msg.is_read ? 'bg-primary-50/20' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      {msg.is_read ? (
                        <MailOpen size={18} className="text-slate-400" />
                      ) : (
                        <Mail size={18} className="text-primary-600" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{msg.full_name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300" dir="ltr">{msg.email}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300" dir="ltr">{msg.phone || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{msg.organization || '-'}</td>
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{msg.subject || '-'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs" dir="ltr">{formatAdminDateTime(msg.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${msg.status === 'archived' ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                      {msg.status === 'archived' ? 'مؤرشفة' : 'جديدة'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedMessage(msg)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                        title="عرض التفاصيل"
                      >
                        <Eye size={18} />
                      </button>
                      
                      <button
                        onClick={() => updateMessageStatus(msg.id, { is_read: !msg.is_read })}
                        disabled={!hasManagePermission}
                        className={`p-1.5 rounded-lg transition ${!hasManagePermission ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800'} ${msg.is_read ? 'text-slate-500' : 'text-primary-600'}`}
                        title={msg.is_read ? "تحديد كغير مقروءة" : "تحديد كمقروءة"}
                      >
                        <CheckCircle size={18} />
                      </button>
                      
                      <button
                        onClick={() => updateMessageStatus(msg.id, { status: msg.status === 'archived' ? 'new' : 'archived' })}
                        disabled={!hasManagePermission}
                        className={`p-1.5 rounded-lg transition ${!hasManagePermission ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800'} text-amber-600`}
                        title={msg.status === 'archived' ? "إلغاء الأرشفة" : "أرشفة"}
                      >
                        <Archive size={18} />
                      </button>
                      
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        disabled={!hasDeletePermission}
                        className={`p-1.5 rounded-lg transition ${!hasDeletePermission ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 dark:hover:bg-red-900/30'} text-red-600`}
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <MailOpen size={32} className="text-slate-300" />
                      <p>لا توجد رسائل</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message Details Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-2xl border dark:border-dark-border overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b dark:border-dark-border bg-slate-50 dark:bg-dark-bg">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                تفاصيل الرسالة
              </h2>
              <button 
                onClick={() => {
                  setSelectedMessage(null);
                  if (!selectedMessage.is_read && hasManagePermission) {
                    updateMessageStatus(selectedMessage.id, { is_read: true });
                  }
                }} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">المرسل</h4>
                  <p className="text-slate-800 dark:text-slate-200 font-medium">{selectedMessage.full_name}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">تاريخ الإرسال</h4>
                  <p className="text-slate-800 dark:text-slate-200 text-sm" dir="ltr">{formatAdminDateTime(selectedMessage.created_at)}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">البريد الإلكتروني</h4>
                  <p className="text-slate-800 dark:text-slate-200" dir="ltr">{selectedMessage.email}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">رقم الهاتف</h4>
                  <p className="text-slate-800 dark:text-slate-200" dir="ltr">{selectedMessage.phone || 'غير متوفر'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">المؤسسة</h4>
                  <p className="text-slate-800 dark:text-slate-200">{selectedMessage.organization || 'غير متوفر'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">الحالة</h4>
                  <p className="text-slate-800 dark:text-slate-200">{selectedMessage.status === 'archived' ? 'مؤرشفة' : 'جديدة'}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t dark:border-dark-border">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">الموضوع</h4>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedMessage.subject || 'بدون موضوع'}</p>
              </div>
              
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">الرسالة</h4>
                <div className="bg-slate-50 dark:bg-dark-bg p-4 rounded-xl border dark:border-dark-border whitespace-pre-wrap text-slate-700 dark:text-slate-300 text-sm leading-relaxed min-h-[120px]">
                  {selectedMessage.message}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t dark:border-dark-border bg-slate-50 dark:bg-dark-bg flex justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => updateMessageStatus(selectedMessage.id, { is_read: !selectedMessage.is_read })}
                  disabled={!hasManagePermission}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!hasManagePermission ? 'opacity-50' : 'bg-white border dark:bg-dark-card dark:border-dark-border hover:bg-slate-100'} ${selectedMessage.is_read ? 'text-slate-600 dark:text-slate-400' : 'text-primary-600'}`}
                >
                  {selectedMessage.is_read ? 'تحديد كغير مقروءة' : 'تحديد كمقروءة'}
                </button>
                <button
                  onClick={() => updateMessageStatus(selectedMessage.id, { status: selectedMessage.status === 'archived' ? 'new' : 'archived' })}
                  disabled={!hasManagePermission}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!hasManagePermission ? 'opacity-50' : 'bg-white border dark:bg-dark-card dark:border-dark-border hover:bg-slate-100'} text-amber-600`}
                >
                  {selectedMessage.status === 'archived' ? 'إلغاء الأرشفة' : 'أرشفة'}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteMessage(selectedMessage.id)}
                  disabled={!hasDeletePermission}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!hasDeletePermission ? 'opacity-50' : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40'}`}
                >
                  حذف
                </button>
                <button 
                  onClick={() => {
                    setSelectedMessage(null);
                    if (!selectedMessage.is_read && hasManagePermission) {
                      updateMessageStatus(selectedMessage.id, { is_read: true });
                    }
                  }} 
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
