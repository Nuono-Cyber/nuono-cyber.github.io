-- Create table to store Instagram posts data
CREATE TABLE public.instagram_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL UNIQUE,
  account_id TEXT,
  username TEXT,
  account_name TEXT,
  description TEXT,
  duration INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  permalink TEXT,
  post_type TEXT,
  views INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  follows INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for super admins and admins
CREATE POLICY "Super admins can manage all posts" 
ON public.instagram_posts 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view posts" 
ON public.instagram_posts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view posts" 
ON public.instagram_posts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_instagram_posts_updated_at
BEFORE UPDATE ON public.instagram_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_instagram_posts_post_id ON public.instagram_posts(post_id);
CREATE INDEX idx_instagram_posts_published_at ON public.instagram_posts(published_at DESC);
CREATE INDEX idx_instagram_posts_post_type ON public.instagram_posts(post_type);