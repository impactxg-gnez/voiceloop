-- Configurable demographic fields per form
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.form_demographic_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,          -- e.g., age, city, gender
  label TEXT NOT NULL,              -- e.g., Age
  input_type TEXT NOT NULL DEFAULT 'text',  -- 'text' | 'number' | 'select'
  required BOOLEAN NOT NULL DEFAULT TRUE,
  options JSONB,                    -- for select
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.form_demographic_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their demographic fields" ON public.form_demographic_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.forms f WHERE f.id = form_demographic_fields.form_id AND f.owner_uid = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f WHERE f.id = form_demographic_fields.form_id AND f.owner_uid = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_form_demographic_fields_form_id ON public.form_demographic_fields(form_id);
