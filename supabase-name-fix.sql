-- Quick Fix for User Name Display
-- Run this SQL in your Supabase SQL Editor

-- 1. First, let's check what data we have in auth.users
-- SELECT id, email, raw_user_meta_data FROM auth.users;

-- 2. Update the user_overview view to properly extract the display name
DROP VIEW IF EXISTS user_overview;

CREATE OR REPLACE VIEW user_overview AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  -- Extract display name from raw_user_meta_data
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
  -- Use the extracted display name as full_name
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

-- 3. Grant permissions
GRANT SELECT ON user_overview TO authenticated;

-- 4. Test the view to see what we get
-- SELECT id, email, display_name, full_name FROM user_overview;
