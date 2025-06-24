-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create function to verify admin password
CREATE OR REPLACE FUNCTION verify_admin_password(p_email TEXT, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_stored_hash TEXT;
BEGIN
  -- Get stored password hash for admin
  SELECT password_hash INTO v_stored_hash
  FROM admins
  WHERE email = p_email
    AND is_active = true;
    
  -- If no admin found or password doesn't match, return false
  IF v_stored_hash IS NULL OR v_stored_hash != crypt(p_password, v_stored_hash) THEN
    RETURN false;
  END IF;
  
  -- Update last login timestamp
  UPDATE admins 
  SET last_login_at = NOW()
  WHERE email = p_email;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 