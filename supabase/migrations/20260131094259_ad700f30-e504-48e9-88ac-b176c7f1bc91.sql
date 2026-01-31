-- Add personal_email column to invites table for sending invite notifications
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS personal_email text;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.invites.personal_email IS 'Email pessoal do convidado onde o código será enviado';