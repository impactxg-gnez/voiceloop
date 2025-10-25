-- Table for storing user Google Drive links
CREATE TABLE IF NOT EXISTS public.user_google_drive_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL,
  folder_url TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_google_drive_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own Google Drive links
CREATE POLICY "Users can view their own Google Drive links" ON public.user_google_drive_links
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own Google Drive links
CREATE POLICY "Users can insert their own Google Drive links" ON public.user_google_drive_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own Google Drive links
CREATE POLICY "Users can update their own Google Drive links" ON public.user_google_drive_links
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own Google Drive links
CREATE POLICY "Users can delete their own Google Drive links" ON public.user_google_drive_links
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_google_drive_links_user_id ON public.user_google_drive_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_google_drive_links_form_id ON public.user_google_drive_links(form_id);
CREATE INDEX IF NOT EXISTS idx_user_google_drive_links_user_form ON public.user_google_drive_links(user_id, form_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_google_drive_links_updated_at 
  BEFORE UPDATE ON public.user_google_drive_links 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


