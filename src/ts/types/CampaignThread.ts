// Quests, rumours and mysteries (worker/migrations/0003).

export const THREAD_STATUSES = ['rumour', 'active', 'resolved', 'failed'] as const;
export type ThreadStatus = typeof THREAD_STATUSES[number];

export const THREAD_STATUS_LABELS: Record<ThreadStatus, string> = {
  rumour: 'Rumour',
  active: 'Active',
  resolved: 'Resolved',
  failed: 'Failed',
};

export type CampaignThread = {
  id?: string;
  campaign_id?: string;
  title: string;
  status: ThreadStatus;
  next_step: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
};

export const defaultThread: CampaignThread = { title: '', status: 'active', next_step: '', notes: '' };

export const isOpenThread = (t: CampaignThread) => t.status === 'active' || t.status === 'rumour';
