CREATE TABLE public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    sector TEXT,
    keywords TEXT[] DEFAULT '{}',
    report_date DATE NOT NULL,
    status TEXT DEFAULT 'draft',
    pdf_url TEXT,
    cover_image_url TEXT,
    file_size BIGINT,
    pages_count INTEGER,
    created_by UUID REFERENCES auth.users(id),
    views_count INTEGER DEFAULT 0,
    downloads_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow public to select published reports
CREATE POLICY "Public can view published reports" ON public.reports
FOR SELECT USING (is_published = true);

-- Allow authenticated admins to do all operations
CREATE POLICY "Admins can do everything on reports" ON public.reports
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create a storage bucket for reports (if not exists)
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true)
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
