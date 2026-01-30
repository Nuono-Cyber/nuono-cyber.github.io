import { supabase } from '@/integrations/supabase/client';

export interface ActivityLog {
  action: string;
  details?: Record<string, any>;
}

export async function logActivity(action: string, details?: Record<string, any>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('Activity (not logged in):', action, details);
      return;
    }

    const { error } = await supabase
      .from('activity_logs' as any)
      .insert({
        user_id: user.id,
        action,
        details: details || null
      });

    if (error) {
      // Silently fail if table doesn't exist yet
      if (!error.message?.includes('does not exist')) {
        console.error('Error logging activity:', error);
      }
    }
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}
