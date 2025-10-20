-- Add Form Pages Support to VoiseForm
-- Run this SQL in your Supabase SQL Editor

-- 1. Create form_pages table to store different pages of a form
CREATE TABLE IF NOT EXISTS form_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  page_order INTEGER NOT NULL DEFAULT 0,
  is_intro_page BOOLEAN DEFAULT FALSE,
  -- New: optional fullscreen images for desktop and mobile
  desktop_image_url TEXT,
  mobile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS on form_pages
ALTER TABLE form_pages ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for form_pages
CREATE POLICY "Users can view pages for their forms" ON form_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_pages.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

CREATE POLICY "Users can insert pages for their forms" ON form_pages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_pages.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

CREATE POLICY "Users can update pages for their forms" ON form_pages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_pages.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

CREATE POLICY "Users can delete pages for their forms" ON form_pages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_pages.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

-- 4. Update questions table to reference form_pages instead of forms directly
ALTER TABLE questions ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES form_pages(id) ON DELETE CASCADE;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_form_pages_form_id ON form_pages(form_id);
CREATE INDEX IF NOT EXISTS idx_form_pages_page_order ON form_pages(page_order);
CREATE INDEX IF NOT EXISTS idx_questions_page_id ON questions(page_id);

-- 6. Create a function to automatically create an intro page when a form is created
CREATE OR REPLACE FUNCTION create_form_intro_page()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a default intro page for the new form
  INSERT INTO form_pages (form_id, title, content, page_order, is_intro_page)
  VALUES (
    NEW.id,
    'Welcome',
    'Thank you for taking the time to provide your feedback. Please answer the following questions to help us improve our services.',
    0,
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to automatically create intro page
DROP TRIGGER IF EXISTS on_form_created ON forms;
CREATE TRIGGER on_form_created
  AFTER INSERT ON forms
  FOR EACH ROW EXECUTE FUNCTION create_form_intro_page();

-- 8. Update the user_overview view to include form page counts
DROP VIEW IF EXISTS user_overview;
CREATE OR REPLACE VIEW user_overview AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'name',
    p.full_name
  ) as display_name,
  p.full_name as profile_name,
  p.avatar_url,
  p.created_at as profile_created_at,
  p.updated_at as profile_updated_at,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'display_name', 
    u.raw_user_meta_data->>'name',
    p.full_name,
    'No name set'
  ) as full_name
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
ORDER BY u.created_at DESC;

-- 9. Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON form_pages TO anon, authenticated;
GRANT SELECT ON user_overview TO authenticated;

-- 10. Create a function to get form structure with pages and questions
CREATE OR REPLACE FUNCTION get_form_structure(form_uuid UUID)
RETURNS TABLE (
  page_id UUID,
  page_title TEXT,
  page_content TEXT,
  page_order INTEGER,
  is_intro_page BOOLEAN,
  question_id UUID,
  question_text TEXT,
  question_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.id as page_id,
    fp.title as page_title,
    fp.content as page_content,
    fp.page_order,
    fp.is_intro_page,
    q.id as question_id,
    q.text as question_text,
    q.question_order
  FROM form_pages fp
  LEFT JOIN questions q ON fp.id = q.page_id
  WHERE fp.form_id = form_uuid
  ORDER BY fp.page_order, q.question_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_form_structure(UUID) TO authenticated;
