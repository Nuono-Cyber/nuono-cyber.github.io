export interface ActivityLog {
  action: string;
  details?: Record<string, any>;
}

export async function logActivity(action: string, details?: Record<string, any>) {
  // Activity logging will be enabled once the migration is applied
  console.log('Activity:', action, details);
}