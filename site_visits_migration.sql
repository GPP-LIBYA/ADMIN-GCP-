-- Drop the old table if exists (optional, or rename it)
-- DROP TABLE IF EXISTS public.site_visits;

CREATE TABLE IF NOT EXISTS public.site_visits (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    visitor_ip text,
    device_type text,
    browser_name text,
    operating_system text,
    screen_width integer,
    screen_height integer,
    language text,
    page_path text,
    referrer text,
    session_id text,
    user_agent text
);

-- Enable RLS
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Allow Edge Function to insert (using service_role)
-- No RLS policies needed if only service_role inserts, 
-- but if anon needs to read/insert, create policies.
-- Since they requested Edge Function, we don't need anon insert policy.

-- Create policy for admins to select (view) stats
CREATE POLICY "Admins can view site visits" ON public.site_visits
FOR SELECT USING (
  auth.role() = 'authenticated'
);
