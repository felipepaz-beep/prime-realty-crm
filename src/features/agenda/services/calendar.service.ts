import type { Activity } from '../types';

export interface CalendarEventPayload {
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  location?: string;
  reminderMinutes?: number;
}

export interface CalendarServiceInterface {
  createEvent(payload: CalendarEventPayload): Promise<string>;
  updateEvent(externalId: string, payload: Partial<CalendarEventPayload>): Promise<void>;
  deleteEvent(externalId: string): Promise<void>;
  isConnected(): Promise<boolean>;
}

export const CalendarService: CalendarServiceInterface = {
  async createEvent(_payload: CalendarEventPayload): Promise<string> {
    console.info('[CalendarService] Google Calendar não conectado — evento não sincronizado.');
    return '';
  },
  async updateEvent(_externalId: string, _payload: Partial<CalendarEventPayload>): Promise<void> {
    console.info('[CalendarService] Google Calendar não conectado — atualização ignorada.');
  },
  async deleteEvent(_externalId: string): Promise<void> {
    console.info('[CalendarService] Google Calendar não conectado — exclusão ignorada.');
  },
  async isConnected(): Promise<boolean> {
    return false;
  },
};

export function activityToCalendarPayload(activity: Activity): CalendarEventPayload {
  const startAt = activity.scheduled_at ?? activity.due_at ?? new Date().toISOString();
  const endAt = activity.duration_minutes
    ? new Date(new Date(startAt).getTime() + activity.duration_minutes * 60_000).toISOString()
    : undefined;
  return {
    title: activity.title,
    description: activity.description ?? undefined,
    startAt,
    endAt,
    location: activity.location ?? undefined,
    reminderMinutes: activity.reminder_at
      ? Math.round((new Date(startAt).getTime() - new Date(activity.reminder_at).getTime()) / 60_000)
      : undefined,
  };
}
