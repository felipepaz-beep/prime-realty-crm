export type ActivityType = 'TASK' | 'FOLLOWUP' | 'VISIT' | 'CALL' | 'MEETING' | 'EMAIL' | 'PERSONAL';
export type ActivityStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ActivityPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ActivityMetadata {
  google_calendar_event_id?: string;
  google_calendar_synced_at?: string;
  property_code?: string;
  call_duration_seconds?: number;
  [key: string]: unknown;
}

export interface ActivityRecurrence {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  until?: string;
  count?: number;
}

export interface Activity {
  id: string;
  owner_id: string;
  client_id: string | null;
  type: ActivityType;
  title: string;
  description: string | null;
  status: ActivityStatus;
  priority: ActivityPriority;
  scheduled_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  reminder_at: string | null;
  duration_minutes: number | null;
  location: string | null;
  metadata: ActivityMetadata;
  recurrence: ActivityRecurrence | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  client?: { nome: string } | null;
}

export type ActivityInsert = Pick<Activity, 'type' | 'title'> &
  Partial<Omit<Activity, 'id' | 'owner_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'type' | 'title' | 'client'>>;

export type ActivityUpdate = Partial<ActivityInsert>;

export interface ActivityFiltros {
  type?: ActivityType[];
  status?: ActivityStatus[];
  priority?: ActivityPriority[];
  client_id?: string;
  dateStart?: string;
  dateEnd?: string;
  busca?: string;
  ordenarPor?: 'scheduled_at' | 'due_at' | 'created_at' | 'priority';
  ordem?: 'asc' | 'desc';
  pagina?: number;
  porPagina?: number;
}

export interface ActivitiesPaginadas {
  data: Activity[];
  total: number;
  pagina: number;
  porPagina: number;
}
