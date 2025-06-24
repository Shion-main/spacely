-- First transaction: Add the enum value
BEGIN;
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
COMMIT;

-- Second transaction: Update the users
BEGIN;
  UPDATE users 
  SET role = 'super_admin'::user_role 
  WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
COMMIT; 