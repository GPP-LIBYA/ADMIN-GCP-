import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp,
  History,
  BarChart3,
  BookOpen,
  Settings2,
  Newspaper, 
  LineChart, 
  Mail, 
  Eye, 
  Settings as SettingsIcon,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Sparkles,
  RotateCcw,
  Check,
  Edit2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useState, useEffect, ReactNode } from 'react';
import { cn } from '../lib/utils';

// Role-based Avatar configuration
interface RoleAvatarConfig {
  defaultAvatar: string;
  options: string[];
  roleTitleAr: string;
  badgeClass: string;
  avatarBgClass: string;
}

const ROLE_AVATAR_CONFIGS: Record<string, RoleAvatarConfig> = {
  super_admin: {
    defaultAvatar: '👑',
    options: ['👑', '🛡️', '🧑‍💼', '👨‍💻', '⚡'],
    roleTitleAr: 'Super Admin',
    badgeClass: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
    avatarBgClass: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
  },
  admin: {
    defaultAvatar: '👨‍💼',
    options: ['👨‍💼', '🧑‍💻', '🔑', '⚙️', '📊'],
    roleTitleAr: 'Admin',
    badgeClass: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
    avatarBgClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
  },
  editor: {
    defaultAvatar: '✍️',
    options: ['✍️', '📝', '🧑‍💻', '📋', '🎨'],
    roleTitleAr: 'Editor',
    badgeClass: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
    avatarBgClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
  },
  analyst: {
    defaultAvatar: '📊',
    options: ['📊', '📈', '🔍', '🧠', '📉'],
    roleTitleAr: 'Analyst',
    badgeClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
    avatarBgClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
  },
  viewer: {
    defaultAvatar: '👤',
    options: ['👤', '👁️', '📖', '🔎', '💻'],
    roleTitleAr: 'Viewer',
    badgeClass: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    avatarBgClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
  }
};

const getRoleConfig = (role?: string): RoleAvatarConfig => {
  if (!role) return ROLE_AVATAR_CONFIGS.viewer;
  const normalized = role.toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized.includes('super')) return ROLE_AVATAR_CONFIGS.super_admin;
  if (normalized.includes('admin')) return ROLE_AVATAR_CONFIGS.admin;
  if (normalized.includes('edit')) return ROLE_AVATAR_CONFIGS.editor;
  if (normalized.includes('analy')) return ROLE_AVATAR_CONFIGS.analyst;
  return ROLE_AVATAR_CONFIGS.viewer;
};

export default function Layout({ children }: { children: ReactNode }) {
  const { adminUser, signOut } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Avatar Management
  const userIdentifier = adminUser?.email || adminUser?.id || 'default_user';
  const storageKey = `gpp_admin_avatar_${userIdentifier}`;
  const roleConfig = getRoleConfig(adminUser?.role);

  const [userAvatar, setUserAvatar] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && roleConfig.options.includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return roleConfig.defaultAvatar;
  });

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [selectedTempAvatar, setSelectedTempAvatar] = useState<string>(userAvatar);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && roleConfig.options.includes(saved)) {
        setUserAvatar(saved);
        setSelectedTempAvatar(saved);
      } else {
        setUserAvatar(roleConfig.defaultAvatar);
        setSelectedTempAvatar(roleConfig.defaultAvatar);
      }
    } catch {
      setUserAvatar(roleConfig.defaultAvatar);
      setSelectedTempAvatar(roleConfig.defaultAvatar);
    }
  }, [adminUser?.role, storageKey]);

  const handleOpenModal = () => {
    setSelectedTempAvatar(userAvatar);
    setIsAvatarModalOpen(true);
  };

  const handleSaveAvatar = () => {
    setUserAvatar(selectedTempAvatar);
    try {
      localStorage.setItem(storageKey, selectedTempAvatar);
    } catch (e) {
      console.warn('LocalStorage unavailable', e);
    }
    setIsAvatarModalOpen(false);
  };

  const handleResetAvatar = () => {
    setSelectedTempAvatar(roleConfig.defaultAvatar);
    setUserAvatar(roleConfig.defaultAvatar);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn('LocalStorage unavailable', e);
    }
    setIsAvatarModalOpen(false);
  };

  // Upgraded Sidebar Navigation Icons & Theme Configuration
  const navigation = [
    { 
      name: 'الرئيسية', 
      href: '/dashboard', 
      icon: LayoutDashboard, 
      show: true,
      iconColor: 'text-blue-600 dark:text-blue-400',
      activeBg: 'bg-blue-50/90 dark:bg-blue-950/40',
      activeBorder: 'border-blue-200/90 dark:border-blue-800/60',
      activeText: 'text-blue-950 dark:text-blue-100 font-bold',
      activeIndicator: 'bg-blue-600 dark:bg-blue-400',
      hoverBg: 'hover:bg-blue-50/60 dark:hover:bg-blue-950/25',
      hoverText: 'hover:text-blue-900 dark:hover:text-blue-200',
    },
    { 
      name: 'الأسعار', 
      href: '/prices', 
      icon: TrendingUp, 
      show: adminUser?.role === 'super_admin' || adminUser?.can_manage_prices,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      activeBg: 'bg-emerald-50/90 dark:bg-emerald-950/40',
      activeBorder: 'border-emerald-200/90 dark:border-emerald-800/60',
      activeText: 'text-emerald-950 dark:text-emerald-100 font-bold',
      activeIndicator: 'bg-emerald-600 dark:bg-emerald-400',
      hoverBg: 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/25',
      hoverText: 'hover:text-emerald-900 dark:hover:text-emerald-200',
    },
    { 
      name: 'أرشيف الأسعار', 
      href: '/history', 
      icon: History, 
      show: adminUser?.role === 'super_admin' || adminUser?.can_manage_prices || adminUser?.can_view_reports,
      iconColor: 'text-purple-600 dark:text-purple-400',
      activeBg: 'bg-purple-50/90 dark:bg-purple-950/40',
      activeBorder: 'border-purple-200/90 dark:border-purple-800/60',
      activeText: 'text-purple-950 dark:text-purple-100 font-bold',
      activeIndicator: 'bg-purple-600 dark:bg-purple-400',
      hoverBg: 'hover:bg-purple-50/60 dark:hover:bg-purple-950/25',
      hoverText: 'hover:text-purple-900 dark:hover:text-purple-200',
    },
    { 
      name: 'التقارير', 
      href: '/reports', 
      icon: BarChart3, 
      show: adminUser?.role === 'super_admin',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      activeBg: 'bg-indigo-50/90 dark:bg-indigo-950/40',
      activeBorder: 'border-indigo-200/90 dark:border-indigo-800/60',
      activeText: 'text-indigo-950 dark:text-indigo-100 font-bold',
      activeIndicator: 'bg-indigo-600 dark:bg-indigo-400',
      hoverBg: 'hover:bg-indigo-50/60 dark:hover:bg-indigo-950/25',
      hoverText: 'hover:text-indigo-900 dark:hover:text-indigo-200',
    },
    { 
      name: 'التقارير المنشورة', 
      href: '/published-reports', 
      icon: BookOpen, 
      show: adminUser?.role === 'super_admin' || adminUser?.can_manage_analysis,
      iconColor: 'text-teal-600 dark:text-teal-400',
      activeBg: 'bg-teal-50/90 dark:bg-teal-950/40',
      activeBorder: 'border-teal-200/90 dark:border-teal-800/60',
      activeText: 'text-teal-950 dark:text-teal-100 font-bold',
      activeIndicator: 'bg-teal-600 dark:bg-teal-400',
      hoverBg: 'hover:bg-teal-50/60 dark:hover:bg-teal-950/25',
      hoverText: 'hover:text-teal-900 dark:hover:text-teal-200',
    },
    { 
      name: 'إعدادات التقارير', 
      href: '/report-settings', 
      icon: Settings2, 
      show: adminUser?.role === 'super_admin' || adminUser?.can_manage_settings,
      iconColor: 'text-slate-600 dark:text-slate-400',
      activeBg: 'bg-slate-100/90 dark:bg-slate-800/70',
      activeBorder: 'border-slate-300 dark:border-slate-700',
      activeText: 'text-slate-950 dark:text-slate-100 font-bold',
      activeIndicator: 'bg-slate-600 dark:bg-slate-400',
      hoverBg: 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40',
      hoverText: 'hover:text-slate-900 dark:hover:text-slate-200',
    },
    { 
      name: 'الأخبار', 
      href: '/news', 
      icon: Newspaper, 
      show: adminUser?.role === 'super_admin' || adminUser?.can_manage_news,
      iconColor: 'text-orange-600 dark:text-orange-400',
      activeBg: 'bg-orange-50/90 dark:bg-orange-950/40',
      activeBorder: 'border-orange-200/90 dark:border-orange-800/60',
      activeText: 'text-orange-950 dark:text-orange-100 font-bold',
      activeIndicator: 'bg-orange-600 dark:bg-orange-400',
      hoverBg: 'hover:bg-orange-50/60 dark:hover:bg-orange-950/25',
      hoverText: 'hover:text-orange-900 dark:hover:text-orange-200',
    },
    { 
      name: 'التحليلات', 
      href: '/analysis', 
      icon: LineChart, 
      show: adminUser?.role === 'super_admin' || adminUser?.can_manage_analysis,
      iconColor: 'text-violet-600 dark:text-violet-400',
      activeBg: 'bg-violet-50/90 dark:bg-violet-950/40',
      activeBorder: 'border-violet-200/90 dark:border-violet-800/60',
      activeText: 'text-violet-950 dark:text-violet-100 font-bold',
      activeIndicator: 'bg-violet-600 dark:bg-violet-400',
      hoverBg: 'hover:bg-violet-50/60 dark:hover:bg-violet-950/25',
      hoverText: 'hover:text-violet-900 dark:hover:text-violet-200',
    },
    { 
      name: 'الرسائل', 
      href: '/messages', 
      icon: Mail, 
      show: adminUser?.role === 'super_admin' || adminUser?.can_manage_messages,
      iconColor: 'text-pink-600 dark:text-pink-400',
      activeBg: 'bg-pink-50/90 dark:bg-pink-950/40',
      activeBorder: 'border-pink-200/90 dark:border-pink-800/60',
      activeText: 'text-pink-950 dark:text-pink-100 font-bold',
      activeIndicator: 'bg-pink-600 dark:bg-pink-400',
      hoverBg: 'hover:bg-pink-50/60 dark:hover:bg-pink-950/25',
      hoverText: 'hover:text-pink-900 dark:hover:text-pink-200',
    },
    { 
      name: 'الزيارات', 
      href: '/visits', 
      icon: Eye, 
      show: adminUser?.role === 'super_admin' || adminUser?.can_view_visits,
      iconColor: 'text-sky-600 dark:text-sky-400',
      activeBg: 'bg-sky-50/90 dark:bg-sky-950/40',
      activeBorder: 'border-sky-200/90 dark:border-sky-800/60',
      activeText: 'text-sky-950 dark:text-sky-100 font-bold',
      activeIndicator: 'bg-sky-600 dark:bg-sky-400',
      hoverBg: 'hover:bg-sky-50/60 dark:hover:bg-sky-950/25',
      hoverText: 'hover:text-sky-900 dark:hover:text-sky-200',
    },
    { 
      name: 'الإعدادات', 
      href: '/settings', 
      icon: SettingsIcon, 
      show: adminUser?.role === 'super_admin' || adminUser?.can_manage_settings,
      iconColor: 'text-zinc-600 dark:text-zinc-400',
      activeBg: 'bg-zinc-100/90 dark:bg-zinc-800/70',
      activeBorder: 'border-zinc-300 dark:border-zinc-700',
      activeText: 'text-zinc-950 dark:text-zinc-100 font-bold',
      activeIndicator: 'bg-zinc-600 dark:bg-zinc-400',
      hoverBg: 'hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40',
      hoverText: 'hover:text-zinc-900 dark:hover:text-zinc-200',
    },
    { 
      name: 'إدارة الأدمن', 
      href: '/admins', 
      icon: ShieldCheck, 
      show: adminUser?.role === 'super_admin' || adminUser?.can_manage_admins,
      iconColor: 'text-amber-600 dark:text-amber-400',
      activeBg: 'bg-amber-50/90 dark:bg-amber-950/40',
      activeBorder: 'border-amber-200/90 dark:border-amber-800/60',
      activeText: 'text-amber-950 dark:text-amber-100 font-bold',
      activeIndicator: 'bg-amber-600 dark:bg-amber-400',
      hoverBg: 'hover:bg-amber-50/60 dark:hover:bg-amber-950/25',
      hoverText: 'hover:text-amber-900 dark:hover:text-amber-200',
    },
  ];

  const handleSignOut = () => {
    signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex flex-col md:flex-row transition-colors duration-200">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between bg-white dark:bg-dark-card border-b dark:border-dark-border p-4 transition-colors duration-200">
        <img 
          src="https://i.postimg.cc/bwVPbtwT/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png" 
          alt="Logo LTN" 
          className="h-10 w-auto"
        />
        <div className="flex items-center gap-2">
          {/* Mobile Avatar trigger */}
          <button
            onClick={handleOpenModal}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-lg border shadow-sm transition-transform active:scale-95 ${roleConfig.avatarBgClass}`}
            title="تغيير الصورة الرمزية"
          >
            {userAvatar}
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 p-1"
          >
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "bg-white dark:bg-dark-card w-full md:w-72 border-l dark:border-dark-border flex-col transition-all duration-300 z-10",
        isMobileMenuOpen ? "flex fixed inset-0 top-[73px]" : "hidden md:flex sticky top-0 h-screen"
      )}>
        {/* Top Logo Container */}
        <div className="hidden md:flex h-24 items-center justify-center border-b dark:border-dark-border px-4 relative">
          <img 
            src="https://i.postimg.cc/bwVPbtwT/cropped-NEW-LOGO-LTN-06-1-removebg-preview.png" 
            alt="Logo LTN" 
            className="h-14 w-auto drop-shadow-sm"
          />
          <button
            onClick={toggleTheme}
            className="absolute left-4 p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={theme === 'dark' ? "الوضع الفاتح" : "الوضع الداكن"}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        
        {/* User Profile Card with Interactive Avatar (38-42px) */}
        <div className="p-3.5 border-b dark:border-dark-border bg-slate-50/60 dark:bg-dark-card/50">
          <div className="flex items-center gap-3">
            {/* Clickable Avatar Circle (40px) */}
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={handleOpenModal}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:shadow-md cursor-pointer ${roleConfig.avatarBgClass}`}
                title="اضغط لتغيير الصورة الرمزية"
              >
                <span>{userAvatar}</span>
              </button>
              {/* Edit Badge overlay */}
              <button
                type="button"
                onClick={handleOpenModal}
                className="absolute -bottom-1 -left-1 w-4.5 h-4.5 rounded-full bg-white dark:bg-dark-card text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm opacity-90 group-hover:opacity-100 transition-opacity"
                title="تعديل الصورة الرمزية"
              >
                <Edit2 size={9} />
              </button>
            </div>

            {/* User Info & Role Badge with improved spacing */}
            <div className="min-w-0 flex-1 flex flex-col justify-center space-y-1">
              <p className="text-[13.5px] font-bold text-slate-900 dark:text-white truncate leading-snug" title={adminUser?.full_name || adminUser?.email}>
                {adminUser?.full_name || adminUser?.email}
              </p>
              <div className="flex items-center gap-1.5">
                <span className={`inline-block px-2 py-0.5 text-[10.5px] font-bold rounded-md border ${roleConfig.badgeClass}`}>
                  {roleConfig.roleTitleAr}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          <ul className="space-y-1 px-3">
            {navigation.filter(item => item.show).map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "group relative flex items-center gap-3.5 px-3.5 h-[46px] min-h-[46px] rounded-lg text-[13.5px] transition-all duration-200 ease-in-out border overflow-hidden",
                      isActive 
                        ? cn(item.activeBg, item.activeBorder, item.activeText, "shadow-sm") 
                        : cn("border-transparent text-slate-600 dark:text-slate-400 font-medium", item.hoverBg, item.hoverText)
                    )}
                  >
                    {/* Active side indicator pill on the right (RTL start) */}
                    {isActive && (
                      <span className={cn("absolute right-0 top-2 bottom-2 w-1 rounded-l-full", item.activeIndicator)} />
                    )}

                    {/* Always-colored icon with smooth micro-interaction */}
                    <item.icon 
                      size={20} 
                      className={cn(
                        "shrink-0 transition-transform duration-200 ease-in-out group-hover:scale-110 group-hover:-translate-x-0.5",
                        item.iconColor
                      )} 
                    />
                    
                    <span className="truncate leading-none">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sign Out Button */}
        <div className="p-3 border-t dark:border-dark-border">
          <button
            onClick={handleSignOut}
            className="group flex w-full items-center gap-3.5 px-3.5 h-[46px] min-h-[46px] rounded-lg text-[13.5px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200 ease-in-out border border-transparent hover:border-red-200 dark:hover:border-red-900/40"
          >
            <LogOut size={20} className="shrink-0 transition-transform duration-200 ease-in-out group-hover:scale-110 group-hover:-translate-x-0.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden p-4 md:p-8 text-slate-900 dark:text-white">
        {children}
      </main>

      {/* Avatar Selection Modal Dialog */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-md bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-slate-200 dark:border-dark-border p-6 space-y-5 text-right"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    اختيار الصورة الرمزية
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تخصيص أيقونة حسابك كـ ({roleConfig.roleTitleAr})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Preview Box */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2 shadow-sm shrink-0 ${roleConfig.avatarBgClass}`}>
                {selectedTempAvatar}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-xs font-semibold text-slate-400">
                  معاينة فورية للظهور
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm truncate">
                  {adminUser?.full_name || adminUser?.email}
                </div>
                <div className="inline-block">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${roleConfig.badgeClass}`}>
                    {roleConfig.roleTitleAr}
                  </span>
                </div>
              </div>
            </div>

            {/* Options Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                الخيارات المتاحة لرتبتك:
              </label>
              <div className="grid grid-cols-5 gap-3">
                {roleConfig.options.map((emoji) => {
                  const isSelected = selectedTempAvatar === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedTempAvatar(emoji)}
                      className={`h-14 rounded-xl flex items-center justify-center text-2xl border-2 transition-all relative ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 shadow-md scale-105'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span>{emoji}</span>
                      {isSelected && (
                        <span className="absolute top-1 left-1 w-4 h-4 bg-primary-600 text-white rounded-full flex items-center justify-center text-[10px]">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notice */}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              يتم حفظ تفضيل الصورة الرمزية محلياً في متصفحك الحالي لضمان الخصوصية والسرعة دون المساس ببيانات الخادم أو الصلاحيات.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleResetAvatar}
                className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RotateCcw size={13} />
                <span>استعادة الصورة الافتراضية</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveAvatar}
                  className="px-4 py-2 text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-sm transition"
                >
                  حفظ الاختيار
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
