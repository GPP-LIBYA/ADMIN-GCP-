-- ==============================================================================
-- إضافة حقلي created_by و updated_by إلى جدول commodities في Supabase
-- لتتبع المسؤول الذي قام بإدخال السعر لأول مرة والمسؤول الذي قام بآخر تعديل
-- ==============================================================================

-- 1. إضافة العمودين بنوع UUID والربط مع معرفات المستخدمين auth.users(id)
ALTER TABLE public.commodities 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. في حال كان حقل updated_by موجوداً مسبقاً بنوع TEXT، يمكن تعديله إلى UUID:
-- DO $$ 
-- BEGIN
--     IF EXISTS (
--         SELECT 1 FROM information_schema.columns 
--         WHERE table_schema = 'public' 
--         AND table_name = 'commodities' 
--         AND column_name = 'updated_by' 
--         AND data_type = 'text'
--     ) THEN
--         ALTER TABLE public.commodities ALTER COLUMN updated_by DROP DEFAULT;
--         ALTER TABLE public.commodities ALTER COLUMN updated_by TYPE UUID USING NULL;
--     END IF;
-- END $$;

-- 3. إنشاء فهارس (Indexes) لتسريع الاستعلامات والربط مع المسؤولين
CREATE INDEX IF NOT EXISTS idx_commodities_created_by ON public.commodities(created_by);
CREATE INDEX IF NOT EXISTS idx_commodities_updated_by ON public.commodities(updated_by);

-- 4. تحديث الصلاحيات إن لزم (RLS):
-- الجداول تخضع بالفعل لسياسات الأمان المحددة في المشروع
