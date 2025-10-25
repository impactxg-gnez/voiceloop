-- Create form_responses table to store all form submissions
-- This replaces Google Sheets integration
-- Run this in your Supabase SQL Editor

-- Drop existing submissions table if needed and recreate with better structure
DROP TABLE IF EXISTS submissions CASCADE;

-- Create form_responses table
CREATE TABLE IF NOT EXISTS form_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_user_id ON form_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_question_id ON form_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_created_at ON form_responses(created_at);

-- Enable Row Level Security
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Form owners can see all responses to their forms
CREATE POLICY "Form owners can view responses to their forms" ON form_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_responses.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

-- Anyone can insert responses (for public forms)
CREATE POLICY "Anyone can submit form responses" ON form_responses
  FOR INSERT WITH CHECK (true);

-- Form owners can update responses to their forms
CREATE POLICY "Form owners can update responses to their forms" ON form_responses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_responses.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

-- Form owners can delete responses to their forms
CREATE POLICY "Form owners can delete responses to their forms" ON form_responses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_responses.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

-- Create a view for easy response aggregation
CREATE OR REPLACE VIEW form_responses_summary AS
SELECT 
  f.id AS form_id,
  f.title AS form_title,
  f.owner_uid,
  COUNT(DISTINCT fr.user_id) AS total_respondents,
  COUNT(fr.id) AS total_responses,
  MAX(fr.created_at) AS last_response_at
FROM forms f
LEFT JOIN form_responses fr ON f.id = fr.form_id
GROUP BY f.id, f.title, f.owner_uid;

-- Grant access to the view
GRANT SELECT ON form_responses_summary TO authenticated;
GRANT SELECT ON form_responses_summary TO anon;



