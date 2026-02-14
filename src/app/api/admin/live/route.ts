import { NextResponse } from "next/server";
import { liveConfig } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import type { Role } from "../../../../lib/db-types";
import { newId } from "../../../../lib/id";

const DEFAULT_STREAM_URL = "https://player.kick.com/luckylywin";
const DEFAULT_CHAT_URL =
  "https://botrix.live/widgets/chat/?bid=aSnlGm44JPKtyWE0KrhPgA&bots=false&emojis=true&hideCommands=false&hideMessages=true&hideMessagesSeconds=10&widgetSize=21&trovo=true&twitch=true&youtube=true&kick=true&platformIcon=false&theme=default&ignoredUsers=&streamTogether=true&cheer=true&pointsReward=false&animation=popIn&showTimestamp=false&shadowThickness=1";

const ROLES: Role[] = ["SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ROLES);
    let config = await liveConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!config) {
      config = await liveConfig.create({
        id: newId(),
        streamUrl: DEFAULT_STREAM_URL,
        chatIframeUrl: DEFAULT_CHAT_URL,
      });
    }
    return NextResponse.json({
      streamUrl: config.streamUrl ?? DEFAULT_STREAM_URL,
      chatIframeUrl: config.chatIframeUrl ?? DEFAULT_CHAT_URL,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener configuración En vivo" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, ROLES);
    const body = await request.json();
    const streamUrl = typeof body.streamUrl === "string" ? body.streamUrl.trim() || null : null;
    const chatIframeUrl = typeof body.chatIframeUrl === "string" ? body.chatIframeUrl.trim() || null : null;

    let config = await liveConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!config) {
      config = await liveConfig.create({
        id: newId(),
        streamUrl: streamUrl ?? DEFAULT_STREAM_URL,
        chatIframeUrl: chatIframeUrl ?? DEFAULT_CHAT_URL,
        updatedById: auth.userId,
      });
    } else {
      await liveConfig.update(config.id, {
        ...(streamUrl !== undefined && { streamUrl: streamUrl ?? DEFAULT_STREAM_URL }),
        ...(chatIframeUrl !== undefined && { chatIframeUrl: chatIframeUrl ?? DEFAULT_CHAT_URL }),
        updatedById: auth.userId,
      });
      config = await liveConfig.findFirst({ orderBy: { updatedAt: "desc" } }) ?? config;
    }
    return NextResponse.json({
      streamUrl: config.streamUrl ?? DEFAULT_STREAM_URL,
      chatIframeUrl: config.chatIframeUrl ?? DEFAULT_CHAT_URL,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al actualizar configuración En vivo" }, { status: 500 });
  }
}
