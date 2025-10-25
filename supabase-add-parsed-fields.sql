-- Add parsed_fields column to form_responses table
-- This stores structured data extracted from responses
-- Run this in your Supabase SQL Editor

-- Add JSONB column for parsed fields
ALTER TABLE form_responses 
ADD COLUMN IF NOT EXISTS parsed_fields JSONB DEFAULT '{}'::jsonb;

-- Create index for better JSON query performance
CREATE INDEX IF NOT EXISTS idx_form_responses_parsed_fields 
ON form_responses USING GIN (parsed_fields);

-- Example: Query responses where name = "Keval"
-- SELECT * FROM form_responses WHERE parsed_fields->>'name' = 'Keval';

-- Example: Query responses where age > 18
-- SELECT * FROM form_responses WHERE (parsed_fields->>'age')::int > 18;



