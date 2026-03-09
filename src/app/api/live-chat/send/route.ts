import { NextResponse } from "next/server";
import Pusher from "pusher";

const CHANNEL = "live-chat";
const EVENT = "message";

function getPusher(): Pusher | null {
  const appId = process.env.PUSHER_APP_ID?.trim();
  const key = process.env.PUSHER_KEY?.trim();
  const secret = process.env.PUSHER_SECRET?.trim();
  const cluster = (process.env.PUSHER_CLUSTER?.trim() || "us2").toLowerCase();
  if (!appId || !key || !secret) return null;
  return new Pusher({ appId, key, secret, cluster, useTLS: true });
}

export type LiveChatMessagePayload = {
  id: string;
  user: string;
  text: string;
  ts: number;
};

/**
 * POST /api/live-chat/send
 * Body: { user?: string, text: string }
 * Publica el mensaje en Pusher para que todos los clientes lo reciban.
 */
export async function POST(request: Request) {
  const pusher = getPusher();
  if (!pusher) {
    return NextResponse.json(
      { error: "Chat en vivo no configurado (Pusher)" },
      { status: 503 }
    );
  }

  let body: { user?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 500) : "";
  if (!text) {
    return NextResponse.json({ error: "text es obligatorio" }, { status: 400 });
  }

  const user = typeof body?.user === "string"
    ? body.user.slice(0, 50) || "Anónimo"
    : "Anónimo";

  const payload: LiveChatMessagePayload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    user,
    text,
    ts: Date.now(),
  };

  try {
    await pusher.trigger(CHANNEL, EVENT, payload);
    return NextResponse.json({ ok: true, id: payload.id });
  } catch (err) {
    console.error("[live-chat/send] Pusher trigger error:", err);
    return NextResponse.json(
      { error: "Error al publicar el mensaje" },
      { status: 500 }
    );
  }
}
