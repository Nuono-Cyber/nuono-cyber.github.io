-- Harden invite-based signup, post write permissions, and password reset abuse controls.

CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_email_created_at
  ON public.password_reset_attempts (corporate_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_ip_created_at
  ON public.password_reset_attempts (ip_address, created_at DESC);

DROP POLICY IF EXISTS "Anyone can view valid invites by token" ON public.invites;
DROP POLICY IF EXISTS "Super admins can manage invites" ON public.invites;

CREATE POLICY "Super admins can manage invites"
ON public.invites
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_invite_code(_code TEXT, _email TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.invites
    WHERE code = lower(trim(_code))
      AND used_at IS NULL
      AND expires_at > now()
      AND (
        _email IS NULL
        OR email IS NULL
        OR lower(email) = lower(trim(_email))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.validate_invite_code(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_personal_email TEXT;
  user_full_name TEXT;
  invite_code TEXT;
  invite_record public.invites%ROWTYPE;
BEGIN
  user_email := lower(NEW.email);
  user_personal_email := lower(NULLIF(NEW.raw_user_meta_data->>'personal_email', ''));
  user_full_name := NULLIF(NEW.raw_user_meta_data->>'full_name', '');
  invite_code := lower(NULLIF(NEW.raw_user_meta_data->>'invite_code', ''));

  IF user_email IS NULL OR user_email !~ '^[^@]+@nadenterprise\.com$' THEN
    RAISE EXCEPTION 'Corporate email is required';
  END IF;

  IF invite_code IS NULL THEN
    RAISE EXCEPTION 'Invite code is required';
  END IF;

  SELECT *
  INTO invite_record
  FROM public.invites
  WHERE code = invite_code
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  IF invite_record.email IS NOT NULL AND lower(invite_record.email) <> user_email THEN
    RAISE EXCEPTION 'Invite code does not match this email';
  END IF;

  INSERT INTO public.profiles (user_id, email, personal_email, full_name)
  VALUES (NEW.id, user_email, user_personal_email, user_full_name);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  UPDATE public.invites
  SET used_at = now()
  WHERE id = invite_record.id;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Super admins can manage all posts" ON public.instagram_posts;
DROP POLICY IF EXISTS "Admins can manage posts" ON public.instagram_posts;
DROP POLICY IF EXISTS "Authenticated users can insert posts" ON public.instagram_posts;
DROP POLICY IF EXISTS "Authenticated users can update posts" ON public.instagram_posts;

CREATE POLICY "Super admins can manage all posts"
ON public.instagram_posts
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can manage posts"
ON public.instagram_posts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
