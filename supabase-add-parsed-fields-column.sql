-- Add parsed_fields column to form_responses table
-- This column stores structured data extracted from voice responses
-- Run this in your Supabase SQL Editor

ALTER TABLE form_responses 
ADD COLUMN IF NOT EXISTS parsed_fields JSONB DEFAULT '{}'::jsonb;

-- Create an index for better performance on JSONB queries
CREATE INDEX IF NOT EXISTS idx_form_responses_parsed_fields 
ON form_responses USING GIN (parsed_fields);

-- Add a comment to document the column
COMMENT ON COLUMN form_responses.parsed_fields IS 'Structured data extracted from voice responses using AI';

