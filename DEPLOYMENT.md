# دليل النشر والتثبيت الرسمي — لوحة تحكم GPP
# Official Deployment & Configuration Guide — GPP Admin Dashboard

**الرابط الرسمي المستهدف / Official Target URL:**  
`https://gpp.ltnet.gov.ly/admin/`

---

## الفهرس / Table of Contents
1. [العربية: دليل النشر للمهندس والمسؤول الفني](#الجزء-الأول-دليل-النشر-باللغة-العربية)
   - المتطلبات الفنية
   - متغيرات البيئة
   - أوامر التثبيت والبناء
   - إعداد خادم الويب (Nginx / Apache)
   - إعدادات Supabase وقواعد البيانات
   - الفحص والتحقق
2. [English: Production Deployment Guide](#part-two-english-deployment-guide)
   - Technical Requirements
   - Environment Variables
   - Installation & Build Commands
   - Web Server Configuration (Nginx / Apache)
   - Supabase & Database Configuration
   - Verification & Health Checks

---

# الجزء الأول: دليل النشر باللغة العربية

### 1. المتطلبات الفنية للبيئة والخادم
- **نظام التشغيل:** Linux (Ubuntu 22.04 LTS / Debian 12 / RHEL أو ما يماثلها).
- **Node.js:** إصدار 20 أو 22 LTS (`node -v`).
- **npm:** إصدار 10 وما فوق (`npm -v`).
- **خادم الويب:** Nginx أو Apache مع تفعيل دعم الـ Reverse Proxy أو استضافة الملفات الثابتة وتوجيه SPA.
- **شهادة أمان:** SSL/TLS صالحة للنطاق `gpp.ltnet.gov.ly`.

---

### 2. متغيرات البيئة (Environment Variables)
قم بنسخ ملف `.env.example` إلى `.env` في المجلد الرئيسي للمشروع:
```bash
cp .env.example .env
```

ثم قم بتعبئة المتغيرات بالقيم الفعلية الخاصة بالمشروع:
```dotenv
# رابط مشروع Supabase الخاص بمنصة GPP
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# المفتاح العام للمشروع (Anon Public Key) - يبدأ بـ eyJhbGciOi...
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# تحديد مسار النشر ليكون /admin/ الخاص بالرابط الرسمي
VITE_DEPLOY_TARGET=production

# اختياري: مفتاح Gemini API في حال تفعيل الميزات الذكية
VITE_GEMINI_API_KEY=
```

> **ملاحظة أمنية هامة:** لا تضع مفتاح `service_role` السري في بيئة الفرونت إند؛ استخدم مفتاح `anon public` فقط.

---

### 3. أوامر التثبيت والبناء المخصص للإنتاج الرسمي
قم بتنفيذ الأوامر التالية بالترتيب:

```bash
# 1. تثبيت الحزم بالاعتماد الكامل على شجرة الحزم المعتمدة
npm ci

# 2. فحص سلامة الأنواع برمجياً
npm run lint

# 3. بناء نسخة الإنتاج الرسمي (تستخدم تلقائياً مسار /admin/ كبادئة للأصول)
npm run build:production
```

- سينتج عن عملية البناء مجلد `dist/` يحتوي على ملفات HTML و JS و CSS الجاهزة للاستضافة، مع تضمين مسار الأصول:  
  `/admin/assets/...`

---

### 4. إعداد خادم الويب (Web Server Configuration)

بما أن لوحة التحكم تطبيق أحادي الصفحة (SPA - Single Page Application)، يجب توجيه جميع مسارات المسار الفرعي `/admin/` إلى الملف الرئيسي `/admin/index.html`.

#### خيار أ: إعداد Nginx (موصى به)
أضف الكتلة التالية داخل ملف تكوين الموقع الخاص بالنطاق `gpp.ltnet.gov.ly`:

```nginx
server {
    server_name gpp.ltnet.gov.ly;
    listen 443 ssl http2;
    # شهادات SSL ...

    # موقع ملفات لوحة التحكم
    location /admin/ {
        alias /var/www/gpp-admin/dist/;
        index index.html;
        try_files $uri $uri/ /admin/index.html;

        # التخزين المؤقت للملفات الثابتة
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

قم باختبار الإعدادات وإعادة تشغيل Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### خيار ب: إعداد Apache (`.htaccess`)
في حال استخدام Apache، تأكد من تفعيل `mod_rewrite` وإضافة ملف `.htaccess` داخل مجلد `dist/`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /admin/
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /admin/index.html [L]
</IfModule>
```

---

### 5. إعدادات Supabase وقواعد البيانات

1. **إعدادات النطاق المسموح في المصادقة (Auth Settings):**
   - ادخل إلى لوحة تحكم Supabase الخاصة بالمشروع:
     `Authentication -> URL Configuration`
   - اضبط **Site URL** إلى:  
     `https://gpp.ltnet.gov.ly/admin/`
   - أضف الرابط إلى قائمة **Redirect URLs**:  
     `https://gpp.ltnet.gov.ly/admin/**`

2. **تنفيذ ملفات SQL (في حال إعداد قاعدة بيانات جديدة):**
   - `commodities_price_tracking.sql`: جداول الأسعار وتتبع المشرفين.
   - `create_reports_table.sql`: جدول التقارير والدراسات.
   - `site_visits_migration.sql`: تتبع حركة الزوار.
   - `supabase_platform_logos.sql`: إعدادات الهوية البصرية.
   - `supabase_report_logos.sql`: لوغوهات التقارير.

3. **دوال السحابة (Edge Functions):**
   في حال نشر دوال السحابة المرفقة في مجلد `supabase/functions/`:
   ```bash
   supabase functions deploy manage-admin-user
   supabase functions deploy track-visit
   ```

---

### 6. التحقق والاختبار التشغيلي بعد النشر
1. فتح الرابط: `https://gpp.ltnet.gov.ly/admin/` والتأكد من فتح صفحة تسجيل الدخول بنجاح دون أي شاشة بيضاء أو خطأ 404 للأصول.
2. تسجيل الدخول بحساب المشرف والتأكد من فتح لوحة التحكم الرئيسية (`/dashboard`).
3. تجربة الانتقال المباشر بين الصفحات (`/prices`، `/history`، `/news`، `/settings`، `/admins`، `/reports`).
4. اختبار تحديث الصفحة (F5) على أي مسار فرعي للتأكد من عمل توجيه `try_files` في Nginx/Apache.

---

# Part Two: English Deployment Guide

### 1. Technical Requirements
- **Operating System:** Linux (Ubuntu 22.04 LTS, Debian 12, RHEL or equivalent).
- **Node.js:** v20 or v22 LTS (`node -v`).
- **npm:** v10 or higher (`npm -v`).
- **Web Server:** Nginx or Apache with SPA fallback rewrite support.
- **SSL/TLS:** Valid certificate for `gpp.ltnet.gov.ly`.

---

### 2. Environment Variables Configuration
Copy the template file `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set the project values:
```dotenv
# Supabase Project URL
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Anon Public JWT Key (starts with eyJhbGciOi...)
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# Set target base path to /admin/
VITE_DEPLOY_TARGET=production

# Optional: Gemini API Key
VITE_GEMINI_API_KEY=
```

---

### 3. Installation & Production Build
Run the following commands in the project root:

```bash
# 1. Clean reproducible dependency installation
npm ci

# 2. Type-checking validation
npm run lint

# 3. Production build (targets base path /admin/)
npm run build:production
```

The output files will be compiled inside the `dist/` directory, referencing assets under `/admin/assets/...`.

---

### 4. Web Server Configuration

#### Option A: Nginx (Recommended)
Add the following block to your virtual host configuration for `gpp.ltnet.gov.ly`:

```nginx
server {
    server_name gpp.ltnet.gov.ly;
    listen 443 ssl http2;
    # SSL cert configuration...

    location /admin/ {
        alias /var/www/gpp-admin/dist/;
        index index.html;
        try_files $uri $uri/ /admin/index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

Test and reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### Option B: Apache (`.htaccess`)
Ensure `mod_rewrite` is enabled and place an `.htaccess` inside `dist/`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /admin/
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /admin/index.html [L]
</IfModule>
```

---

### 5. Supabase Settings
- In Supabase Dashboard -> `Authentication` -> `URL Configuration`:
  - **Site URL:** `https://gpp.ltnet.gov.ly/admin/`
  - **Redirect URLs:** `https://gpp.ltnet.gov.ly/admin/**`

---

### 6. Post-Deployment Verification
1. Access `https://gpp.ltnet.gov.ly/admin/` and ensure the login page loads with all styling and JS assets.
2. Sign in with administrative credentials and navigate to the dashboard.
3. Test direct deep linking and browser refresh on internal routes (e.g., `/prices`, `/reports`) to confirm rewrite rules.
