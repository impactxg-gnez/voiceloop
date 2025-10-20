-- Supabase SQL Schema for VoiceLoop/Vocalize
-- This file contains the database schema needed for the application

-- Create forms table
CREATE TABLE IF NOT EXISTS forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  owner_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  question_count INTEGER DEFAULT 0
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  audio_url TEXT DEFAULT '',
  transcription TEXT NOT NULL,
  submitter_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forms_owner_uid ON forms(owner_uid);
CREATE INDEX IF NOT EXISTS idx_questions_form_id ON questions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_question_id ON submissions(question_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitter_uid ON submissions(submitter_uid);

-- Row Level Security Policies

-- Forms: Users can only see their own forms
CREATE POLICY "Users can view their own forms" ON forms
  FOR SELECT USING (auth.uid() = owner_uid);

CREATE POLICY "Users can insert their own forms" ON forms
  FOR INSERT WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Users can update their own forms" ON forms
  FOR UPDATE USING (auth.uid() = owner_uid);

CREATE POLICY "Users can delete their own forms" ON forms
  FOR DELETE USING (auth.uid() = owner_uid);

-- Questions: Users can only see questions for their own forms
CREATE POLICY "Users can view questions for their forms" ON questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = questions.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

CREATE POLICY "Users can insert questions for their forms" ON questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = questions.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

CREATE POLICY "Users can update questions for their forms" ON questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = questions.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

CREATE POLICY "Users can delete questions for their forms" ON questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = questions.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

-- Submissions: Users can see submissions for their forms, and anyone can submit
CREATE POLICY "Users can view submissions for their forms" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = submissions.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

CREATE POLICY "Anyone can submit responses" ON submissions
  FOR INSERT WITH CHECK (true);

-- Enable RLS on all tables
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_forms_updated_at 
  BEFORE UPDATE ON forms 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
