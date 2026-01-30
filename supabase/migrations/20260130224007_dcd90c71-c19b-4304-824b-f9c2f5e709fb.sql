-- Add code column to invites table for hexadecimal codes
ALTER TABLE public.invites 
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Create index for code lookups
CREATE INDEX IF NOT EXISTS idx_invites_code ON public.invites(code);

-- Update existing invites to have a code if they don't have one
UPDATE public.invites 
SET code = encode(gen_random_bytes(5), 'hex')
WHERE code IS NULL;