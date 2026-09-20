-- ==============================================================================
-- إعداد Storage Buckets وسياسات RLS لشعارات المنصة والتذييل
-- المتوافقة مع Supabase Storage و RLS
-- ==============================================================================

-- 1. إنشاء الـ Buckets إن لم تكن موجودة وجعلها عامة (Public)
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('platform-logos', 'platform-logos', true),
  ('footer-logos', 'footer-logos', true),
  ('report_logos', 'report_logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. إزالة أي سياسات سابقة لتفادي التعارض
DROP POLICY IF EXISTS "Public Access platform-logos" ON storage.objects;
DROP POLICY IF EXISTS "Public view platform logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload platform-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update platform-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete platform-logos" ON storage.objects;
DROP POLICY IF EXISTS "Super Admin upload platform logos" ON storage.objects;
DROP POLICY IF EXISTS "Super Admin update platform logos" ON storage.objects;
DROP POLICY IF EXISTS "Super Admin delete platform logos" ON storage.objects;

DROP POLICY IF EXISTS "Public Access footer-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload footer-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update footer-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete footer-logos" ON storage.objects;

-- 3. سياسات القراءة العامة (SELECT to public)
CREATE POLICY "Public Access platform-logos" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id IN ('platform-logos', 'footer-logos', 'report_logos'));

-- 4. سياسات الرفع للمستخدمين المسجلين (INSERT to authenticated)
CREATE POLICY "Authenticated users can upload platform-logos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id IN ('platform-logos', 'footer-logos', 'report_logos'));

-- 5. سياسات التعديل والحذف للمستخدمين المسجلين (UPDATE/DELETE to authenticated)
CREATE POLICY "Authenticated users can update platform-logos" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id IN ('platform-logos', 'footer-logos', 'report_logos'));

CREATE POLICY "Authenticated users can delete platform-logos" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id IN ('platform-logos', 'footer-logos', 'report_logos'));
