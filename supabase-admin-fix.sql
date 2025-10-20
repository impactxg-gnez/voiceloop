-- Simplified Admin Authentication Fix
-- Run this SQL in your Supabase SQL Editor

-- 1. Drop the existing function and recreate it with proper permissions
DROP FUNCTION IF EXISTS verify_admin_credentials(TEXT, TEXT);

-- 2. Create a simpler admin verification function
CREATE OR REPLACE FUNCTION verify_admin_credentials(
  input_username TEXT,
  input_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  -- Check if admin user exists with correct credentials
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE username = input_username 
    AND password_hash = 'admin_' || input_password
  ) INTO admin_exists;
  
  -- If admin exists, update last login
  IF admin_exists THEN
    UPDATE admin_users 
    SET last_login = NOW() 
    WHERE username = input_username;
  END IF;
  
  RETURN admin_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant proper permissions
GRANT EXECUTE ON FUNCTION verify_admin_credentials(TEXT, TEXT) TO anon, authenticated;

-- 4. Make sure the admin user exists with correct password
INSERT INTO admin_users (username, password_hash) 
VALUES ('voise', 'admin_VoiseForm999!') 
ON CONFLICT (username) DO UPDATE SET 
  password_hash = 'admin_VoiseForm999!';

-- 5. Test the function (optional - you can run this to verify)
-- SELECT verify_admin_credentials('voise', 'VoiseForm999!');
