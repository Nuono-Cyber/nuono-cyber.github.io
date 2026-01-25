-- Add personal_email column to profiles
ALTER TABLE public.profiles 
ADD COLUMN personal_email TEXT;

-- Update the handle_new_user function to include personal_email from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  assigned_role app_role;
  user_personal_email TEXT;
  user_full_name TEXT;
BEGIN
  user_email := NEW.email;
  user_personal_email := NEW.raw_user_meta_data->>'personal_email';
  user_full_name := NEW.raw_user_meta_data->>'full_name';
  
  -- Check if it's a super admin
  IF user_email IN ('gabrielnbn@nadenterprise.com', 'nadsongl@nadenterprise.com') THEN
    assigned_role := 'super_admin';
  ELSE
    assigned_role := 'user';
  END IF;
  
  -- Create profile with personal email
  INSERT INTO public.profiles (user_id, email, personal_email, full_name)
  VALUES (NEW.id, user_email, user_personal_email, user_full_name);
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  RETURN NEW;
END;
$$;