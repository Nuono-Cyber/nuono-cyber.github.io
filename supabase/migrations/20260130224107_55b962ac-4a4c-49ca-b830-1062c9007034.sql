-- Create activity_logs table for user activity tracking
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Policy: Super admins can view all logs
CREATE POLICY "Super admins can view all activity logs" 
ON public.activity_logs 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Policy: Any authenticated user can insert their own logs
CREATE POLICY "Users can insert their own activity logs" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Super admins can manage all logs
CREATE POLICY "Super admins can manage all activity logs" 
ON public.activity_logs 
FOR ALL 
USING (is_super_admin(auth.uid()));