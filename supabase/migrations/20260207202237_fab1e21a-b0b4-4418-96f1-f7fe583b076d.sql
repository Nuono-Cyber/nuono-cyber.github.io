-- Create internal chat messages table
CREATE TABLE public.internal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID, -- NULL means broadcast to all
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages sent to them or by them or broadcast messages
CREATE POLICY "Users can view their messages"
ON public.internal_messages
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid() OR 
    recipient_id IS NULL
  )
);

-- Users can send messages
CREATE POLICY "Users can send messages"
ON public.internal_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can mark their received messages as read
CREATE POLICY "Users can update read status of their messages"
ON public.internal_messages
FOR UPDATE
USING (auth.uid() = recipient_id);

-- Super admins can manage all messages
CREATE POLICY "Super admins can manage all messages"
ON public.internal_messages
FOR ALL
USING (is_super_admin(auth.uid()));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;

-- Add unique constraint on post_id for proper upsert
ALTER TABLE public.instagram_posts ADD CONSTRAINT instagram_posts_post_id_unique UNIQUE (post_id);