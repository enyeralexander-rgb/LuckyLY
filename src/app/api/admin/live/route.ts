import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";

const DEFAULT_STREAM_URL = "https://player.kick.com/luckylywin";
const DEFAULT_CHAT_URL =
  "https://botrix.live/widgets/chat/?bid=aSnlGm44JPKtyWE0KrhPgA&bots=false&emojis=true&hideCommands=false&hideMessages=true&hideMessagesSeconds=10&widgetSize=21&trovo=true&twitch=true&youtube=true&kick=true&platformIcon=false&theme=default&ignoredUsers=&streamTogether=true&cheer=true&pointsReward=false&animation=popIn&showTimestamp=false&shadowThickness=1";

export async function GET(request: Request) {
  try {
    requireAuth(request, [Role.SUPERADMIN, Role.MASTER]);
    let config = await prisma.liveConfig.findFirst({
      orderBy: { updatedAt: "desc" }
    });
    if (!config) {
      config = await prisma.liveConfig.create({
        data: {
          streamUrl: DEFAULT_STREAM_URL,
          chatIframeUrl: DEFAULT_CHAT_URL
        }
      });
    }
    return NextResponse.json({
      streamUrl: config.streamUrl ?? DEFAULT_STREAM_URL,
      chatIframeUrl: config.chatIframeUrl ?? DEFAULT_CHAT_URL
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
    const auth = requireAuth(request, [Role.SUPERADMIN, Role.MASTER]);
    const body = await request.json();
    const streamUrl = typeof body.streamUrl === "string" ? body.streamUrl.trim() || null : null;
    const chatIframeUrl = typeof body.chatIframeUrl === "string" ? body.chatIframeUrl.trim() || null : null;

    let config = await prisma.liveConfig.findFirst({
      orderBy: { updatedAt: "desc" }
    });
    if (!config) {
      config = await prisma.liveConfig.create({
        data: {
          streamUrl: streamUrl ?? DEFAULT_STREAM_URL,
          chatIframeUrl: chatIframeUrl ?? DEFAULT_CHAT_URL,
          updatedById: auth.userId
        }
      });
    } else {
      config = await prisma.liveConfig.update({
        where: { id: config.id },
        data: {
          ...(streamUrl !== undefined && { streamUrl: streamUrl ?? DEFAULT_STREAM_URL }),
          ...(chatIframeUrl !== undefined && { chatIframeUrl: chatIframeUrl ?? DEFAULT_CHAT_URL }),
          updatedById: auth.userId
        }
      });
    }
    return NextResponse.json({
      streamUrl: config.streamUrl ?? DEFAULT_STREAM_URL,
      chatIframeUrl: config.chatIframeUrl ?? DEFAULT_CHAT_URL
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al actualizar configuración En vivo" }, { status: 500 });
  }
}
