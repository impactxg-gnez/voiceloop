-- Fix user name display and add admin security
-- Run this SQL in your Supabase SQL Editor

-- 1. Update the user_overview view to include display name from auth.users
DROP VIEW IF EXISTS user_overview;
CREATE OR REPLACE VIEW user_overview AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  u.raw_user_meta_data->>'full_name' as display_name,
  p.full_name as profile_name,
  p.avatar_url,
  p.created_at as profile_created_at,
  p.updated_at as profile_updated_at,
  -- Use display_name from auth.users if available, otherwise use profile_name
  COALESCE(u.raw_user_meta_data->>'full_name', p.full_name) as full_name
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
ORDER BY u.created_at DESC;

-- 2. Create an admin users table for admin authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- 3. Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for admin_users (only accessible by service role)
CREATE POLICY "Admin users are only accessible by service role" ON admin_users
  FOR ALL USING (false);

-- 5. Insert the admin user (password: VoiseForm999!)
-- Note: This is a simple hash for demo purposes. In production, use proper password hashing
INSERT INTO admin_users (username, password_hash) 
VALUES ('voise', 'admin_voiseform999') 
ON CONFLICT (username) DO NOTHING;

-- 6. Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON user_overview TO authenticated;
GRANT ALL ON admin_users TO service_role;

-- 7. Create a function to verify admin credentials
CREATE OR REPLACE FUNCTION verify_admin_credentials(
  input_username TEXT,
  input_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash 
  FROM admin_users 
  WHERE username = input_username;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Simple password check (in production, use proper hashing)
  IF stored_hash = 'admin_' || input_password THEN
    -- Update last login
    UPDATE admin_users 
    SET last_login = NOW() 
    WHERE username = input_username;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION verify_admin_credentials(TEXT, TEXT) TO authenticated;
