import { NextResponse } from "next/server";
import { liveConfig } from "../../../../lib/db";

const DEFAULT_STREAM_URL = "https://player.kick.com/luckylywin";
const DEFAULT_CHAT_URL =
  "https://botrix.live/widgets/chat/?bid=aSnlGm44JPKtyWE0KrhPgA&bots=false&emojis=true&hideCommands=false&hideMessages=true&hideMessagesSeconds=10&widgetSize=21&trovo=true&twitch=true&youtube=true&kick=true&platformIcon=false&theme=default&ignoredUsers=&streamTogether=true&cheer=true&pointsReward=false&animation=popIn&showTimestamp=false&shadowThickness=1";

export async function GET() {
  try {
    const config = await liveConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json({
      streamUrl: config?.streamUrl ?? DEFAULT_STREAM_URL,
      chatIframeUrl: config?.chatIframeUrl ?? DEFAULT_CHAT_URL,
    });
  } catch {
    return NextResponse.json({
      streamUrl: DEFAULT_STREAM_URL,
      chatIframeUrl: DEFAULT_CHAT_URL,
    });
  }
}
