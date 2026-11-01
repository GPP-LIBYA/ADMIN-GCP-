import React from 'react';
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Printer, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Sparkles
} from 'lucide-react';

export type DashboardExportScope = 'all' | 'kpis' | 'heatmap' | 'base100' | 'topmovers';

interface DashboardExportToolbarProps {
  exportScope: DashboardExportScope;
  onScopeChange: (scope: DashboardExportScope) => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onExportPNG: () => void;
  onPrint: () => void;
  isExporting: boolean;
  statusMessage?: string;
  successMessage?: string;
}

export const DashboardExportToolbar: React.FC<DashboardExportToolbarProps> = ({
  exportScope,
  onScopeChange,
  onExportPDF,
  onExportExcel,
  onExportPNG,
  onPrint,
  isExporting,
  statusMessage,
  successMessage
}) => {
  return (
    <div className="w-full bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl p-4 shadow-sm no-print space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left / Info & Scope Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-sm">
            <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <span>أدوات التصدير والطباعة (Power BI Tools):</span>
          </div>

          {/* Scope Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">نطاق التصدير:</label>
            <select
              value={exportScope}
              onChange={(e) => onScopeChange(e.target.value as DashboardExportScope)}
              disabled={isExporting}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <option value="all">كامل اللوحة التنفيذية (شامل)</option>
              <option value="kpis">بطاقات المؤشرات (KPIs) فقط</option>
              <option value="heatmap">الخريطة الحرارية للقطاعات فقط</option>
              <option value="base100">مخطط المقارنة المعيارية Base-100 فقط</option>
              <option value="topmovers">مخطط السلع الأكثر تحركاً فقط</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* PDF Export */}
          <button
            type="button"
            onClick={onExportPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
            title="تصدير اللوحة إلى مستند PDF أفقي عالي الجودة"
          >
            <Download size={15} />
            <span>تحميل PDF</span>
          </button>

          {/* Excel Export */}
          <button
            type="button"
            onClick={onExportExcel}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
            title="تصدير بيانات اللوحة ومؤشراتها إلى مصنف Excel متعدد الأوراق"
          >
            <FileSpreadsheet size={15} />
            <span>تحميل Excel</span>
          </button>

          {/* PNG Export */}
          <button
            type="button"
            onClick={onExportPNG}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
            title="تصدير اللوحة أو الرسم المحدد كصورة عالية الدقة PNG"
          >
            <ImageIcon size={15} />
            <span>تحميل PNG</span>
          </button>

          {/* Print Dashboard */}
          <button
            type="button"
            onClick={onPrint}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
            title="طباعة لوحة التحليل بتنسيق A4 أفقي مباشر"
          >
            <Printer size={15} />
            <span>طباعة اللوحة</span>
          </button>
        </div>
      </div>

      {/* Dynamic Feedback Banner */}
      {isExporting && statusMessage && (
        <div className="bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 rounded-lg p-2.5 text-xs text-primary-800 dark:text-primary-300 flex items-center gap-2 animate-pulse">
          <Loader2 size={15} className="animate-spin text-primary-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {!isExporting && successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};
export default DashboardExportToolbar;
