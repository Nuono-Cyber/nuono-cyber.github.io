-- Table to store Meta/Instagram integration configuration
CREATE TABLE public.meta_integration_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instagram_account_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_instagram UNIQUE (user_id, instagram_account_id)
);

-- Enable RLS
ALTER TABLE public.meta_integration_config ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage integrations
CREATE POLICY "Super admins can manage meta integrations"
ON public.meta_integration_config
FOR ALL
USING (is_super_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_meta_integration_config_updated_at
BEFORE UPDATE ON public.meta_integration_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table to store sync history/logs
CREATE TABLE public.meta_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.meta_integration_config(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  records_fetched INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.meta_sync_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view sync logs
CREATE POLICY "Super admins can view sync logs"
ON public.meta_sync_logs
FOR SELECT
USING (is_super_admin(auth.uid()));