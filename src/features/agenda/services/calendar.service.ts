import { supabase } from "@/integrations/supabase/client";
import type { Activity } from "../types";

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
  async isConnected(): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("profiles")
      .select("google_calendar_connected")
      .maybeSingle();
    return (
      (data as { google_calendar_connected?: boolean } | null)?.google_calendar_connected ?? false
    );
  },

  async createEvent(payload: CalendarEventPayload): Promise<string> {
    const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
      body: { action: "create", payload },
    });
    if (error) throw error;
    return (data as { googleEventId: string }).googleEventId;
  },

  async updateEvent(externalId: string, payload: Partial<CalendarEventPayload>): Promise<void> {
    const { error } = await supabase.functions.invoke("google-calendar-sync", {
      body: { action: "update", googleEventId: externalId, payload },
    });
    if (error) throw error;
  },

  async deleteEvent(externalId: string): Promise<void> {
    const { error } = await supabase.functions.invoke("google-calendar-sync", {
      body: { action: "delete", googleEventId: externalId },
    });
    if (error) throw error;
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
      ? Math.round(
          (new Date(startAt).getTime() - new Date(activity.reminder_at).getTime()) / 60_000,
        )
      : undefined,
  };
}
