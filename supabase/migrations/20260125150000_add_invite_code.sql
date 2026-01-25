-- Add code column to invites table for hexadecimal codes
ALTER TABLE public.invites 
ADD COLUMN code TEXT UNIQUE;

-- Function to generate a 10-character hexadecimal code
CREATE OR REPLACE FUNCTION public.generate_hex_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 10-character hexadecimal code
    new_code := encode(gen_random_bytes(5), 'hex');
    
    -- Check if code already exists
    SELECT EXISTS (
      SELECT 1 FROM public.invites WHERE code = new_code
    ) INTO code_exists;
    
    -- If code doesn't exist, exit loop
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Set default for existing records (optional, can generate manually)
-- UPDATE public.invites SET code = public.generate_hex_code() WHERE code IS NULL;
