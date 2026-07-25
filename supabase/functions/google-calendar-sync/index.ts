// Google Calendar CRUD proxy — called from the CRM frontend via supabase.functions.invoke.
// Reads the user's refresh token from user_integrations (service-role) and proxies to Google Calendar API.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  gcalRefreshToken,
  gcalCreateEvent,
  gcalUpdateEvent,
  gcalDeleteEvent,
} from "../_shared/google-calendar.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify JWT via user Supabase client
  const userClient = createClient(SUPABASE_URL, authHeader.replace("Bearer ", ""));
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Read refresh token via service role (no RLS on user_integrations for authenticated)
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: integration } = await admin
    .from("user_integrations")
    .select("google_calendar_refresh_token_ciphertext")
    .eq("user_id", user.id)
    .maybeSingle();

  const refreshToken = integration?.google_calendar_refresh_token_ciphertext;
  if (!refreshToken) {
    return new Response(JSON.stringify({ error: "Google Calendar not connected" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, payload, googleEventId } = (await req.json()) as {
      action: "create" | "update" | "delete";
      payload?: Record<string, unknown>;
      googleEventId?: string;
    };

    const accessToken = await gcalRefreshToken(refreshToken);

    if (action === "create") {
      const id = await gcalCreateEvent(accessToken, payload as Parameters<typeof gcalCreateEvent>[1]);
      return new Response(JSON.stringify({ googleEventId: id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      if (!googleEventId) throw new Error("googleEventId required for update");
      await gcalUpdateEvent(accessToken, googleEventId, payload as Parameters<typeof gcalUpdateEvent>[2]);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!googleEventId) throw new Error("googleEventId required for delete");
      await gcalDeleteEvent(accessToken, googleEventId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[google-calendar-sync]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
