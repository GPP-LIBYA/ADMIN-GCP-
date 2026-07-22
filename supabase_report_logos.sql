-- Create a storage bucket for report logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('report_logos', 'report_logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to the bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'report_logos');

-- Allow authenticated users to upload to the bucket
CREATE POLICY "Authenticated users can upload logos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'report_logos');

-- Allow authenticated users to update/delete their logos
CREATE POLICY "Authenticated users can update logos" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'report_logos');

CREATE POLICY "Authenticated users can delete logos" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'report_logos');
