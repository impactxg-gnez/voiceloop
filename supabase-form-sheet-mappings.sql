-- Create table for storing form-sheet mappings
CREATE TABLE IF NOT EXISTS form_sheet_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  spreadsheet_id TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  sheet_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_form_sheet_mappings_form_id ON form_sheet_mappings(form_id);

-- Enable RLS
ALTER TABLE form_sheet_mappings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can view their own form sheet mappings" ON form_sheet_mappings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_sheet_mappings.form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- Create policy for inserting sheet mappings
CREATE POLICY "Users can create sheet mappings for their forms" ON form_sheet_mappings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_sheet_mappings.form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- Create policy for updating sheet mappings
CREATE POLICY "Users can update their own sheet mappings" ON form_sheet_mappings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_sheet_mappings.form_id 
      AND forms.user_id = auth.uid()
    )
  );
