export type Role = 'super_admin' | 'admin' | 'intern';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'follow_up'
  | 'interested'
  | 'not_interested'
  | 'converted'
  | 'lost';

export type ActivityType =
  | 'call'
  | 'email'
  | 'whatsapp'
  | 'meeting'
  | 'note'
  | 'status_change';

export interface Profile {
  id: string;
  full_name: string;
  email?: string | null;
  role: Role;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
}

export interface ProfileWithLeadCount extends Profile {
  lead_count?: number;
}

export interface Lead {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  source?: string | null;
  status: LeadStatus;
  priority: string;
  assigned_to?: string | null;
  created_by?: string | null;
  notes?: string | null;
  next_follow_up_date?: string | null;
  created_at: string;
  updated_at: string;
  assigned_to_profile?: Pick<Profile, 'id' | 'full_name' | 'role'> | null;
  created_by_profile?: Pick<Profile, 'id' | 'full_name' | 'role'> | null;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id?: string | null;
  type: ActivityType;
  description?: string | null;
  outcome?: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'id' | 'full_name' | 'role'> | null;
}

export interface OutreachContact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  platform?: string | null;
  notes?: string | null;
  last_connected_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  created_by_profile?: Pick<Profile, 'id' | 'full_name' | 'role'> | null;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ImportLeadRow {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  source?: string;
}

export const DASHBOARD_PATH: Record<Role, string> = {
  super_admin: '/super-admin',
  admin: '/admin',
  intern: '/intern',
};