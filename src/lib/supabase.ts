import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AdminUser, Commodity, NewsArticle, Report, Message, SiteVisit, SectorCatalog, UnitsCatalog, CommodityCatalog } from '../types';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isRealSupabaseConfigured = Boolean(
  envUrl &&
  envKey &&
  typeof envUrl === 'string' &&
  envUrl.startsWith('http') &&
  !envUrl.includes('placeholder')
);

// ---------------------------------------------------------------------------
// Seed Data for Mock Mode
// ---------------------------------------------------------------------------
const DEFAULT_ADMIN: AdminUser = {
  id: '1',
  auth_user_id: 'mock-super-admin-uuid',
  email: 'admin@gpp.ly',
  full_name: 'مدير المنصة الرئيسي',
  role: 'super_admin',
  is_active: true,
  can_manage_admins: true,
  can_manage_prices: true,
  can_view_reports: true,
  can_import_prices: true,
  can_manage_news: true,
  can_manage_analysis: true,
  can_manage_messages: true,
  can_view_visits: true,
  can_manage_settings: true,
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
};

const DEFAULT_SECTORS: SectorCatalog[] = [
  { id: '1', sector_code: 'ENERGY', name_ar: 'قطاع الطاقة والنفط', name_en: 'Energy & Oil', sort_order: 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', sector_code: 'METALS', name_ar: 'المعادن الثمينة والصناعية', name_en: 'Precious & Industrial Metals', sort_order: 2, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', sector_code: 'AGRI', name_ar: 'السلع الزراعية والحبوب', name_en: 'Agriculture & Grains', sort_order: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '4', sector_code: 'FERTILIZERS', name_ar: 'الأسمدة والكيماويات', name_en: 'Fertilizers & Chemicals', sort_order: 4, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const DEFAULT_UNITS: UnitsCatalog[] = [
  { id: '1', unit_code: 'BBL', unit_ar: 'برميل', unit_en: 'Barrel', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', unit_code: 'OZ', unit_ar: 'أونصة', unit_en: 'Ounce', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', unit_code: 'MT', unit_ar: 'طن متري', unit_en: 'Metric Ton', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '4', unit_code: 'MMBTU', unit_ar: 'مليون وحدة حرارية', unit_en: 'MMBtu', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const DEFAULT_CATALOG: CommodityCatalog[] = [
  { id: '1', symbol: 'BRENT', name_ar: 'نفط خام برنت', name_en: 'Brent Crude Oil', sector: 'قطاع الطاقة والنفط', default_unit: 'برميل', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', symbol: 'WTI', name_ar: 'خام غرب تكساس', name_en: 'WTI Crude Oil', sector: 'قطاع الطاقة والنفط', default_unit: 'برميل', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', symbol: 'GOLD', name_ar: 'الذهب عيار 24', name_en: 'Gold 24K', sector: 'المعادن الثمينة والصناعية', default_unit: 'أونصة', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '4', symbol: 'SILVER', name_ar: 'الفضة النقية', name_en: 'Pure Silver', sector: 'المعادن الثمينة والصناعية', default_unit: 'أونصة', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '5', symbol: 'WHEAT', name_ar: 'القمح اللين الصلب', name_en: 'Milling Wheat', sector: 'السلع الزراعية والحبوب', default_unit: 'طن متري', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '6', symbol: 'UREA', name_ar: 'سماد اليوريا المحبب 46%', name_en: 'Granular Urea 46%', sector: 'الأسمدة والكيماويات', default_unit: 'طن متري', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const DEFAULT_COMMODITIES: Commodity[] = [
  {
    id: 'comm-1',
    symbol: 'BRENT',
    name_ar: 'نفط خام برنت',
    name_en: 'Brent Crude Oil',
    sector: 'قطاع الطاقة والنفط',
    price: 82.45,
    previous_price: 81.10,
    change_value: 1.35,
    change_percent: 1.66,
    trend: 'up',
    high: 83.10,
    low: 80.85,
    status: 'active',
    is_visible: true,
    unit: 'برميل',
    source: 'GPP Market Feed',
    last_update_method: 'manual',
    created_by: 'mock-super-admin-uuid',
    updated_by: 'mock-super-admin-uuid',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'comm-2',
    symbol: 'WTI',
    name_ar: 'خام غرب تكساس',
    name_en: 'WTI Crude Oil',
    sector: 'قطاع الطاقة والنفط',
    price: 78.20,
    previous_price: 77.50,
    change_value: 0.70,
    change_percent: 0.90,
    trend: 'up',
    high: 78.60,
    low: 76.90,
    status: 'active',
    is_visible: true,
    unit: 'برميل',
    source: 'GPP Market Feed',
    last_update_method: 'manual',
    created_by: 'mock-super-admin-uuid',
    updated_by: 'mock-super-admin-uuid',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'comm-3',
    symbol: 'GOLD',
    name_ar: 'الذهب عيار 24',
    name_en: 'Gold 24K',
    sector: 'المعادن الثمينة والصناعية',
    price: 2650.80,
    previous_price: 2665.20,
    change_value: -14.40,
    change_percent: -0.54,
    trend: 'down',
    high: 2672.00,
    low: 2642.50,
    status: 'active',
    is_visible: true,
    unit: 'أونصة',
    source: 'Global Bullion',
    last_update_method: 'manual',
    created_by: 'mock-super-admin-uuid',
    updated_by: 'mock-super-admin-uuid',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'comm-4',
    symbol: 'SILVER',
    name_ar: 'الفضة النقية',
    name_en: 'Pure Silver',
    sector: 'المعادن الثمينة والصناعية',
    price: 31.75,
    previous_price: 31.50,
    change_value: 0.25,
    change_percent: 0.79,
    trend: 'up',
    high: 32.10,
    low: 31.20,
    status: 'active',
    is_visible: true,
    unit: 'أونصة',
    source: 'Global Bullion',
    last_update_method: 'manual',
    created_by: 'mock-super-admin-uuid',
    updated_by: 'mock-super-admin-uuid',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'comm-5',
    symbol: 'WHEAT',
    name_ar: 'القمح اللين الصلب',
    name_en: 'Milling Wheat',
    sector: 'السلع الزراعية والحبوب',
    price: 235.00,
    previous_price: 235.00,
    change_value: 0,
    change_percent: 0,
    trend: 'neutral',
    high: 238.00,
    low: 233.50,
    status: 'active',
    is_visible: true,
    unit: 'طن متري',
    source: 'AgriTrade Direct',
    last_update_method: 'manual',
    created_by: 'mock-super-admin-uuid',
    updated_by: 'mock-super-admin-uuid',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'comm-6',
    symbol: 'UREA',
    name_ar: 'سماد اليوريا المحبب 46%',
    name_en: 'Granular Urea 46%',
    sector: 'الأسمدة والكيماويات',
    price: 345.50,
    previous_price: 340.00,
    change_value: 5.50,
    change_percent: 1.62,
    trend: 'up',
    high: 350.00,
    low: 338.00,
    status: 'active',
    is_visible: true,
    unit: 'طن متري',
    source: 'Middle East Fertilizer Index',
    last_update_method: 'manual',
    created_by: 'mock-super-admin-uuid',
    updated_by: 'mock-super-admin-uuid',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_NEWS: NewsArticle[] = [
  {
    id: 'news-1',
    title_ar: 'صعود ملحوظ في عقود خام برنت إثر استقرار إمدادات موانئ التصدير',
    title_en: 'Brent Crude Rises Amid Stable Export Terminal Shipments',
    content_ar: 'سجلت أسعار النفط العالمية ارتفاعاً مدفوعاً بزيادة الطلب الآسيوي واستقرار عمليات الشحن في موانئ التصدير الرئيسية بالبحر المتوسط.',
    content_en: 'Global oil prices recorded gains driven by Asian demand and steady shipments.',
    summary_ar: 'ارتفاع أسعار خام برنت بنسبة 1.6% مدعوماً باستقرار حركة التصدير.',
    summary_en: 'Brent crude up 1.6% supported by export logistics.',
    source: 'وكالة الأنباء الاقتصادية',
    image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    is_published: true,
    published_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'news-2',
    title_ar: 'استقرار أسعار الأسمدة الزراعية وتوقعات بانفراجة في تدفقات الإمداد',
    title_en: 'Fertilizer Prices Stabilize With Expected Supply Inflows',
    content_ar: 'تشهد أسواق اليوريا والأسمدة الكيماوية حالة من التوازن السعري مع بدء شحنات جديدة للموسم الزراعي الحالي.',
    content_en: 'Urea and fertilizer markets maintain price balance with new seasonal shipments.',
    summary_ar: 'استقرار نسبي لأسعار اليوريا المحببة في الأسواق الإقليمية.',
    summary_en: 'Granular urea prices remain stable across regional markets.',
    source: 'مؤشر أسواق السلع',
    image_url: 'https://images.unsplash.com/photo-1595878715977-2e8f8df18ea8?auto=format&fit=crop&w=600&q=80',
    is_published: true,
    published_at: new Date(Date.now() - 172800000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_REPORTS: Report[] = [
  {
    id: 'rep-1',
    title_ar: 'التقرير الأسبوعي الشامل لحركة أسعار السلع والطاقة',
    title_en: 'Weekly Comprehensive Commodity & Energy Price Report',
    description_ar: 'مراجعة تفصيلية لحركة أسعار النفط والمعادن والسلع الزراعية مع مقارنات أسبوعية وشهرية.',
    description_en: 'Detailed weekly review of oil, metals, and agricultural commodities with historical comparisons.',
    sector: 'قطاع الطاقة والنفط',
    keywords: ['نفط', 'طاقة', 'ذهب', 'أسعار'],
    report_date: new Date().toISOString().split('T')[0],
    status: 'published',
    is_published: true,
    cover_image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
    pdf_url: '#',
    file_size: 1420000,
    pages_count: 12,
    created_by: 'mock-super-admin-uuid',
    views_count: 342,
    downloads_count: 89,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    sender_name: 'محمد عبد الله',
    sender_email: 'm.abdullah@example.com',
    subject: 'طلب اشتراك في النشرة السعرية اليومية للسلع',
    body: 'السلام عليكم، نود الاستفسار عن إمكانية الربط البرمجي المباشر لأسعار خام برنت والذهب مع نظامنا الداخلي.',
    is_read: false,
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'msg-2',
    sender_name: 'شركة الأفق للاستيراد والتصدير',
    sender_email: 'info@alofoq-trading.ly',
    subject: 'استفسار حول مؤشرات تسعير الحبوب',
    body: 'نرجو تزويدنا ببيانات السلاسل الزمنية التاريخية لأسعار القمح والذرة لعام 2025-2026.',
    is_read: true,
    created_at: new Date(Date.now() - 28 * 3600000).toISOString(),
  },
];

const generateMockVisits = (): SiteVisit[] => {
  const visits: SiteVisit[] = [];
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
  const osList = ['Windows', 'MacOS', 'Android', 'iOS'];
  const devices = ['Desktop', 'Desktop', 'Mobile', 'Mobile', 'Tablet'];
  const pages = ['/dashboard', '/prices', '/news', '/analysis', '/history'];

  for (let i = 0; i < 48; i++) {
    const hoursAgo = Math.floor(Math.random() * 72);
    visits.push({
      id: `visit-${i + 1}`,
      created_at: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
      visitor_ip: `102.164.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
      device_type: devices[Math.floor(Math.random() * devices.length)],
      browser_name: browsers[Math.floor(Math.random() * browsers.length)],
      operating_system: osList[Math.floor(Math.random() * osList.length)],
      screen_width: 1920,
      screen_height: 1080,
      language: 'ar',
      page_path: pages[Math.floor(Math.random() * pages.length)],
      referrer: 'https://gpp.ly',
      session_id: `session-${Math.floor(i / 3)}`,
      user_agent: 'Mozilla/5.0 Demo Browser',
    });
  }
  return visits;
};

// ---------------------------------------------------------------------------
// In-Memory & LocalStorage Storage Layer
// ---------------------------------------------------------------------------
class MockStore {
  private tables: Record<string, any[]> = {};
  private session: any = null;
  private authListeners: Array<(event: string, session: any) => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const saved = localStorage.getItem('gpp_mock_tables');
      if (saved) {
        this.tables = JSON.parse(saved);
      }
    } catch (_) {
      // Ignore localStorage read errors
    }

    if (!this.tables.admin_users || this.tables.admin_users.length === 0) {
      this.tables.admin_users = [DEFAULT_ADMIN];
    }
    if (!this.tables.sectors_catalog || this.tables.sectors_catalog.length === 0) {
      this.tables.sectors_catalog = DEFAULT_SECTORS;
    }
    if (!this.tables.units_catalog || this.tables.units_catalog.length === 0) {
      this.tables.units_catalog = DEFAULT_UNITS;
    }
    if (!this.tables.commodity_catalog || this.tables.commodity_catalog.length === 0) {
      this.tables.commodity_catalog = DEFAULT_CATALOG;
    }
    if (!this.tables.commodities || this.tables.commodities.length === 0) {
      this.tables.commodities = DEFAULT_COMMODITIES;
    }
    if (!this.tables.news || this.tables.news.length === 0) {
      this.tables.news = DEFAULT_NEWS;
    }
    if (!this.tables.reports || this.tables.reports.length === 0) {
      this.tables.reports = DEFAULT_REPORTS;
    }
    if (!this.tables.analyses || this.tables.analyses.length === 0) {
      this.tables.analyses = DEFAULT_REPORTS;
    }
    if (!this.tables.messages || this.tables.messages.length === 0) {
      this.tables.messages = DEFAULT_MESSAGES;
    }
    if (!this.tables.site_visits || this.tables.site_visits.length === 0) {
      this.tables.site_visits = generateMockVisits();
    }
    if (!this.tables.commodity_price_history) {
      this.tables.commodity_price_history = DEFAULT_COMMODITIES.map((c) => ({
        id: `hist-${c.id}`,
        symbol: c.symbol,
        name_ar: c.name_ar,
        name_en: c.name_en,
        sector: c.sector,
        price: c.price,
        previous_price: c.previous_price,
        change_value: c.change_value,
        change_percent: c.change_percent,
        trend: c.trend,
        high: c.high,
        low: c.low,
        unit: c.unit,
        source: c.source,
        recorded_at: c.updated_at,
        created_at: c.created_at || c.updated_at,
        updated_at: c.updated_at,
      }));
    }

    try {
      const savedSession = localStorage.getItem('gpp_mock_session');
      if (savedSession) {
        this.session = JSON.parse(savedSession);
      }
    } catch (_) {
      // Ignore
    }
  }

  save() {
    try {
      localStorage.setItem('gpp_mock_tables', JSON.stringify(this.tables));
      if (this.session) {
        localStorage.setItem('gpp_mock_session', JSON.stringify(this.session));
      } else {
        localStorage.removeItem('gpp_mock_session');
      }
    } catch (_) {
      // Ignore
    }
  }

  getTable(name: string): any[] {
    if (!this.tables[name]) {
      this.tables[name] = [];
    }
    return this.tables[name];
  }

  setTable(name: string, rows: any[]) {
    this.tables[name] = rows;
    this.save();
  }

  getSession() {
    return this.session;
  }

  setSession(session: any) {
    this.session = session;
    this.save();
    this.notifyAuth('SIGNED_IN', session);
  }

  clearSession() {
    this.session = null;
    this.save();
    this.notifyAuth('SIGNED_OUT', null);
  }

  addAuthListener(cb: (event: string, session: any) => void) {
    this.authListeners.push(cb);
    return () => {
      this.authListeners = this.authListeners.filter((l) => l !== cb);
    };
  }

  private notifyAuth(event: string, session: any) {
    this.authListeners.forEach((cb) => {
      try {
        cb(event, session);
      } catch (e) {
        console.error('Error in mock auth listener:', e);
      }
    });
  }
}

const mockStore = new MockStore();

// ---------------------------------------------------------------------------
// Mock Supabase Query Builder
// ---------------------------------------------------------------------------
class MockQueryBuilder {
  private tableName: string;
  private filters: Array<(row: any) => boolean> = [];
  private sortFn: ((a: any, b: any) => number) | null = null;
  private limitCount: number | null = null;
  private offsetCount: number = 0;
  private isHeadOnly = false;
  private isCountExact = false;
  private selectFields: string | null = null;
  private pendingInsert: any = null;
  private pendingUpdate: any = null;
  private pendingDelete = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields?: string, options?: { count?: string; head?: boolean }) {
    this.selectFields = fields || '*';
    if (options?.head) this.isHeadOnly = true;
    if (options?.count === 'exact') this.isCountExact = true;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((row) => {
      const v = row[column];
      return String(v) === String(value);
    });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push((row) => {
      const v = row[column];
      return String(v) !== String(value);
    });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push((row) => {
      const v = row[column];
      if (v === undefined || v === null) return false;
      return new Date(v).getTime() >= new Date(value).getTime() || v >= value;
    });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push((row) => {
      const v = row[column];
      if (v === undefined || v === null) return false;
      return new Date(v).getTime() <= new Date(value).getTime() || v <= value;
    });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push((row) => (row[column] > value));
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push((row) => (row[column] < value));
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push((row) => values.map(String).includes(String(row[column])));
    return this;
  }

  or(expr: string) {
    // Basic support for OR expressions like 'symbol.ilike.%test%,name_ar.ilike.%test%'
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    const ascending = opts?.ascending ?? true;
    this.sortFn = (a, b) => {
      const valA = a[column];
      const valB = b[column];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      const res = valA > valB ? 1 : -1;
      return ascending ? res : -res;
    };
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  insert(values: any | any[]) {
    this.pendingInsert = Array.isArray(values) ? values : [values];
    return this;
  }

  update(values: any) {
    this.pendingUpdate = values;
    return this;
  }

  upsert(values: any | any[]) {
    this.pendingInsert = Array.isArray(values) ? values : [values];
    return this;
  }

  delete() {
    this.pendingDelete = true;
    return this;
  }

  async single() {
    const res = await this.execute();
    const item = Array.isArray(res.data) ? res.data[0] : res.data;
    if (!item) {
      return { data: null, error: { code: 'PGRST116', message: 'Row not found' } };
    }
    return { data: item, error: null };
  }

  async maybeSingle() {
    const res = await this.execute();
    const item = Array.isArray(res.data) ? res.data[0] : res.data;
    return { data: item || null, error: null };
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: any; count?: number | null; error: any }> {
    const table = mockStore.getTable(this.tableName);

    // 1. Handle Insert
    if (this.pendingInsert) {
      const createdRows = this.pendingInsert.map((item: any) => ({
        id: item.id || crypto.randomUUID(),
        created_at: item.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...item,
      }));
      mockStore.setTable(this.tableName, [...table, ...createdRows]);
      return { data: createdRows, error: null };
    }

    // 2. Handle Update
    if (this.pendingUpdate) {
      let updatedCount = 0;
      const updatedRows: any[] = [];
      const newTable = table.map((row) => {
        const matches = this.filters.every((f) => f(row));
        if (matches) {
          updatedCount++;
          const updated = { ...row, ...this.pendingUpdate, updated_at: new Date().toISOString() };
          updatedRows.push(updated);
          return updated;
        }
        return row;
      });
      mockStore.setTable(this.tableName, newTable);
      return { data: updatedRows, count: updatedCount, error: null };
    }

    // 3. Handle Delete
    if (this.pendingDelete) {
      const remaining = table.filter((row) => !this.filters.every((f) => f(row)));
      mockStore.setTable(this.tableName, remaining);
      return { data: null, error: null };
    }

    // 4. Handle Select / Query
    let rows = table.filter((row) => this.filters.every((f) => f(row)));
    const totalCount = rows.length;

    if (this.sortFn) {
      rows = [...rows].sort(this.sortFn);
    }

    if (this.offsetCount > 0) {
      rows = rows.slice(this.offsetCount);
    }
    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    if (this.isHeadOnly) {
      return { data: null, count: totalCount, error: null };
    }

    return {
      data: rows,
      count: this.isCountExact ? totalCount : rows.length,
      error: null,
    };
  }
}

// ---------------------------------------------------------------------------
// Mock Supabase Client Object
// ---------------------------------------------------------------------------
const createMockSupabaseClient = () => {
  return {
    from: (table: string) => new MockQueryBuilder(table),
    auth: {
      async getSession() {
        return { data: { session: mockStore.getSession() }, error: null };
      },
      async getUser() {
        const session = mockStore.getSession();
        return { data: { user: session?.user || null }, error: null };
      },
      async signInWithPassword({ email }: { email: string; password?: string }) {
        const user = {
          id: 'mock-super-admin-uuid',
          email: email || 'admin@gpp.ly',
          user_metadata: { full_name: 'مدير المنصة الرئيسي' },
        };
        const session = {
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'mock-refresh-token',
          user,
        };
        mockStore.setSession(session);
        return { data: { session, user }, error: null };
      },
      async signOut() {
        mockStore.clearSession();
        return { error: null };
      },
      onAuthStateChange(callback: (event: string, session: any) => void) {
        const unsubscribe = mockStore.addAuthListener(callback);
        return {
          data: {
            subscription: {
              unsubscribe,
            },
          },
        };
      },
    },
    functions: {
      async invoke(fnName: string, options?: { body?: any }) {
        const body = options?.body || {};
        console.log(`[Mock Supabase Edge Function] invoke ${fnName}:`, body);

        if (fnName === 'manage-admin-user') {
          const action = body.action;
          if (action === 'create') {
            const newAdmin: AdminUser = {
              id: Date.now().toString(),
              auth_user_id: crypto.randomUUID(),
              email: body.email,
              full_name: body.full_name || '',
              role: body.role || 'Admin',
              is_active: true,
              can_manage_admins: Boolean(body.permissions?.can_manage_admins),
              can_manage_prices: Boolean(body.permissions?.can_manage_prices),
              can_import_prices: Boolean(body.permissions?.can_import_prices),
              can_manage_news: Boolean(body.permissions?.can_manage_news),
              can_manage_analysis: Boolean(body.permissions?.can_manage_analysis),
              can_manage_messages: Boolean(body.permissions?.can_manage_messages),
              can_view_visits: Boolean(body.permissions?.can_view_visits),
              can_manage_settings: Boolean(body.permissions?.can_manage_settings),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            const currentAdmins = mockStore.getTable('admin_users');
            mockStore.setTable('admin_users', [...currentAdmins, newAdmin]);
            return {
              data: {
                success: true,
                message: 'تم إنشاء المستخدم الإداري بنجاح (وضع المعاينة)',
                data: newAdmin,
                temp_password: body.password || 'GppAdmin@2026',
                invited: body.invite_mode,
              },
              error: null,
            };
          }
          if (action === 'toggle_active') {
            const currentAdmins = mockStore.getTable('admin_users');
            let updatedActive = true;
            const next = currentAdmins.map((a) => {
              if (a.email === body.email) {
                updatedActive = !a.is_active;
                return { ...a, is_active: updatedActive };
              }
              return a;
            });
            mockStore.setTable('admin_users', next);
            return { data: { success: true, is_active: updatedActive }, error: null };
          }
          if (action === 'delete') {
            const currentAdmins = mockStore.getTable('admin_users');
            mockStore.setTable('admin_users', currentAdmins.filter((a) => a.email !== body.email));
            return { data: { success: true, message: 'تم حذف الحساب بنجاح' }, error: null };
          }
          return { data: { success: true, message: 'تمت العملية بنجاح' }, error: null };
        }

        if (fnName === 'track-visit') {
          const currentVisits = mockStore.getTable('site_visits');
          mockStore.setTable('site_visits', [
            { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...body },
            ...currentVisits,
          ]);
          return { data: { success: true, message: 'Visit tracked' }, error: null };
        }

        return { data: { success: true }, error: null };
      },
    },
    storage: {
      from: (bucket: string) => ({
        async upload(path: string, file: File | Blob, options?: any) {
          const fakeUrl = `https://mock-storage.local/${bucket}/${path}`;
          return { data: { path, id: path, fullPath: `${bucket}/${path}` }, error: null };
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: `https://mock-storage.local/${bucket}/${path}` } };
        },
        async remove(paths: string[]) {
          return { data: paths, error: null };
        },
      }),
    },
  } as unknown as SupabaseClient;
};

// ---------------------------------------------------------------------------
// Supabase Client Export
// ---------------------------------------------------------------------------
export const supabase: SupabaseClient = isRealSupabaseConfigured
  ? createClient(envUrl!, envKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        fetch: (...args) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          return fetch(args[0], {
            ...args[1],
            signal: controller.signal,
          })
            .then((res) => {
              clearTimeout(timeoutId);
              return res;
            })
            .catch((err) => {
              clearTimeout(timeoutId);
              if (err.name === 'AbortError') {
                throw new Error('انتهت مهلة الاتصال بالخادم (Timeout).');
              }
              throw err;
            });
        },
      },
    })
  : createMockSupabaseClient();
