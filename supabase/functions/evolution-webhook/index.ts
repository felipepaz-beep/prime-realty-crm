import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type MessageType = "text" | "image" | "pdf" | "audio" | "video" | "location" | "contact" | "sticker" | "system";

interface ExtractedMessage {
  content: string | null;
  type: MessageType;
  attachment: Record<string, unknown> | null;
}

function extractMessage(message: Record<string, unknown>): ExtractedMessage {
  if (!message) return { content: null, type: "text", attachment: null };
  if (message.conversation || (message.extendedTextMessage as Record<string, unknown>)?.text) {
    return {
      content: (message.conversation as string) || ((message.extendedTextMessage as Record<string, unknown>)?.text as string),
      type: "text",
      attachment: null,
    };
  }
  if (message.imageMessage) {
    const img = message.imageMessage as Record<string, unknown>;
    return { content: (img.caption as string) || null, type: "image", attachment: { name: "imagem.jpg", type: "image/jpeg", url: img.url, size: img.fileLength } };
  }
  if (message.audioMessage || message.pttMessage) {
    const audio = (message.audioMessage || message.pttMessage) as Record<string, unknown>;
    return { content: null, type: "audio", attachment: { name: "audio.ogg", type: "audio/ogg", url: audio.url, size: audio.fileLength } };
  }
  if (message.videoMessage) {
    const vid = message.videoMessage as Record<string, unknown>;
    return { content: (vid.caption as string) || null, type: "video", attachment: { name: "video.mp4", type: "video/mp4", url: vid.url, size: vid.fileLength } };
  }
  if (message.documentMessage || (message.documentWithCaptionMessage as Record<string, unknown>)?.message) {
    const doc = (message.documentMessage || ((message.documentWithCaptionMessage as Record<string, unknown>)?.message as Record<string, unknown>)?.documentMessage) as Record<string, unknown>;
    return { content: (doc?.caption as string) || null, type: "pdf", attachment: { name: doc?.fileName || "documento", type: doc?.mimetype, url: doc?.url, size: doc?.fileLength } };
  }
  if (message.stickerMessage) {
    const sticker = message.stickerMessage as Record<string, unknown>;
    return { content: null, type: "sticker", attachment: { name: "sticker.webp", type: "image/webp", url: sticker.url } };
  }
  if (message.locationMessage) {
    const loc = message.locationMessage as Record<string, unknown>;
    return { content: `📍 ${loc.degreesLatitude},${loc.degreesLongitude}`, type: "location", attachment: null };
  }
  if (message.contactMessage) {
    const contact = message.contactMessage as Record<string, unknown>;
    return { content: `📱 Contato: ${contact.displayName}`, type: "contact", attachment: null };
  }
  return { content: "[mensagem não suportada]", type: "text", attachment: null };
}

function normalizePhone(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  const variants: string[] = [digits, `+${digits}`];
  if (digits.startsWith("55") && digits.length === 13) {
    const without9 = digits.slice(0, 4) + digits.slice(5);
    variants.push(without9, `+${without9}`);
  }
  return variants;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }

  if (payload.event !== "messages.upsert") return new Response("OK", { status: 200 });

  const data = payload.data as Record<string, unknown>;
  if (!data) return new Response("OK", { status: 200 });

  const key = data.key as Record<string, unknown>;
  if (key?.fromMe === true) return new Response("OK", { status: 200 });

  const remoteJid = key?.remoteJid as string;
  if (!remoteJid || remoteJid.endsWith("@g.us")) return new Response("OK", { status: 200 });

  const instanceName = payload.instance as string;
  const rawPhone = remoteJid.split("@")[0];
  const pushName = (data.pushName as string) || rawPhone;
  const messageTimestamp = data.messageTimestamp as number;
  const message = data.message as Record<string, unknown>;

  const { data: integration } = await supabase.from("integrations").select("owner_id, configuration").eq("provider", "whatsapp").eq("status", "connected").maybeSingle();
  if (!integration) return new Response("No integration", { status: 200 });

  const config = integration.configuration as Record<string, unknown>;
  if (config?.instance_name && config.instance_name !== instanceName) return new Response("Instance mismatch", { status: 200 });

  const ownerId = integration.owner_id as string;
  const phoneVariants = normalizePhone(rawPhone);

  const { data: client } = await supabase.from("clients").select("id").eq("owner_id", ownerId).is("deleted_at", null).or(phoneVariants.flatMap((p) => [`telefone.eq.${p}`, `whatsapp.eq.${p}`]).join(",")).maybeSingle();

  let clientId: string;
  if (client) {
    clientId = client.id;
  } else {
    const { data: newClient, error: clientErr } = await supabase.from("clients").insert({ owner_id: ownerId, nome: pushName, whatsapp: `+${rawPhone}`, origem: "whatsapp", etapa_funil: "novo_lead", tags: ["lead_inbound"] }).select("id").single();
    if (clientErr || !newClient) return new Response("Error creating client", { status: 500 });
    clientId = newClient.id;
  }

  const { data: existingConv } = await supabase.from("conversations").select("id").eq("client_id", clientId).eq("channel", "whatsapp").eq("status", "open").is("deleted_at", null).maybeSingle();

  let conversationId: string;
  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    const { data: newConv, error: convErr } = await supabase.from("conversations").insert({ owner_id: ownerId, client_id: clientId, channel: "whatsapp", status: "open", metadata: { remote_jid: remoteJid } }).select("id").single();
    if (convErr || !newConv) return new Response("Error creating conversation", { status: 500 });
    conversationId = newConv.id;
  }

  const { content, type, attachment } = extractMessage(message || {});
  const sentAt = messageTimestamp ? new Date(messageTimestamp * 1000).toISOString() : new Date().toISOString();

  const { error: msgErr } = await supabase.from("messages").insert({ conversation_id: conversationId, direction: "incoming", sender: pushName, type, content, attachment, status: "delivered", sent_at: sentAt, metadata: { provider_msg_id: key?.id, remote_jid: remoteJid } });
  if (msgErr) return new Response("Error saving message", { status: 500 });

  return new Response("OK", { status: 200 });
});
