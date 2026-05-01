import { api } from '@/lib/api';

export interface ActivityLog {
  action: string;
  details?: Record<string, any>;
}

export async function logActivity(action: string, details?: Record<string, any>) {
  try {
    if (!api.getToken()) return;
    await api.activity.create(action, details);
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}
