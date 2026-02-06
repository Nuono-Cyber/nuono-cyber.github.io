-- Drop existing restrictive policies for admins
DROP POLICY IF EXISTS "Admins can view posts" ON public.instagram_posts;

-- Create new policy allowing admins to manage posts (INSERT, UPDATE, SELECT)
CREATE POLICY "Admins can manage posts" 
ON public.instagram_posts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Also ensure authenticated users can insert their own data uploads
CREATE POLICY "Authenticated users can insert posts" 
ON public.instagram_posts 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update posts" 
ON public.instagram_posts 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);