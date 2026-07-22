CREATE TABLE public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    sector TEXT,
    tags TEXT[] DEFAULT '{}',
    report_date DATE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    cover_image_url TEXT,
    pdf_url TEXT NOT NULL,
    file_size BIGINT,
    page_count INTEGER,
    uploaded_by UUID REFERENCES public.admin_users(id),
    views_count INTEGER DEFAULT 0,
    downloads_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow public to select published reports
CREATE POLICY "Public can view published reports" ON public.reports
FOR SELECT USING (status = 'published');

-- Allow authenticated admins to do all operations
CREATE POLICY "Admins can do everything on reports" ON public.reports
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create a storage bucket for reports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the reports bucket
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'reports');

CREATE POLICY "Authenticated users can upload reports" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reports');

CREATE POLICY "Authenticated users can update reports" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'reports');

CREATE POLICY "Authenticated users can delete reports" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'reports');

-- RPC to increment views
CREATE OR REPLACE FUNCTION increment_report_views(report_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.reports
  SET views_count = views_count + 1
  WHERE id = report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
