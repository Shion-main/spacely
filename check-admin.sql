SELECT user_id, email, full_name, role, created_at 
FROM public.users 
WHERE role IN ('admin', 'super_admin') 
ORDER BY created_at; 