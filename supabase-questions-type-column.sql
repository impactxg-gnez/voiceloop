-- Add type column to questions table
-- Run this SQL in your Supabase SQL Editor

-- Add type column to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'voice';

-- Add options column for multiple choice and ranking questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS options JSONB;

-- Create index for better performance on type column
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);

-- Update existing questions to have default type
UPDATE questions SET type = 'voice' WHERE type IS NULL;

