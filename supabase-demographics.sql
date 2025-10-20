-- Demographics capture table
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.demographics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  submitter_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  raw_text TEXT NOT NULL,
  parsed_json JSONB,
  age INTEGER,
  city TEXT,
  gender TEXT,
  source TEXT DEFAULT 'voice', -- 'voice' | 'text'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.demographics ENABLE ROW LEVEL SECURITY;

-- RLS: owners can see demographics for their forms; anyone can insert
CREATE POLICY "Owners can view demographics for their forms" ON public.demographics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = demographics.form_id AND f.owner_uid = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert demographics" ON public.demographics
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_demographics_form_id ON public.demographics(form_id);
CREATE INDEX IF NOT EXISTS idx_demographics_submitter_uid ON public.demographics(submitter_uid);
