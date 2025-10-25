-- Add is_published field to forms table
-- Run this SQL in your Supabase SQL Editor

-- Add is_published column to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- Update existing forms to be published if they have questions
UPDATE forms 
SET is_published = TRUE 
WHERE question_count > 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_forms_is_published ON forms(is_published);

