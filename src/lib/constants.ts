import type { ActivityType, LeadStatus, Role } from '@/lib/types';

export const BRAND = {
  name: 'Oryntal',
  product: 'Oryntal CRM',
  primary: '#0d1230',
  primaryDark: '#06070f',
  accent: '#c9a84c',
  accentLight: '#f0d080',
  accentDark: '#8b6914',
  backgroundColor: '#F8F9FA',
  tagline: 'AI & Web Agency',
};

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  intern: 'Intern',
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  follow_up: 'Follow Up',
  interested: 'Interested',
  not_interested: 'Not Interested',
  converted: 'Converted',
  lost: 'Lost',
};

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  'new',
  'contacted',
  'follow_up',
  'interested',
  'not_interested',
  'converted',
  'lost',
];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: 'Call',
  email: 'Email',
  whatsapp: 'WhatsApp',
  meeting: 'Meeting',
  note: 'Note',
  status_change: 'Status Change',
};

export const PRIORITY_ORDER = ['low', 'medium', 'high', 'urgent'] as const;

export const LEAD_SOURCES = [
  'Website',
  'Referral',
  'LinkedIn',
  'Instagram',
  'Google Ads',
  'Cold Email',
  'Upwork',
  'Event',
  'Other',
];

export const OUTREACH_PLATFORMS = [
  'LinkedIn',
  'Cold Email',
  'WhatsApp',
  'Call',
  'Instagram',
  'Upwork',
  'X (Twitter)',
  'Referral',
  'Event',
  'Other',
];

export const CSV_TEMPLATE_HEADERS = ['name', 'phone', 'email', 'company', 'source'];