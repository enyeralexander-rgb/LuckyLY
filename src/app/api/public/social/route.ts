import { NextResponse } from "next/server";
import { socialMedia } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const social = await socialMedia.findFirst();
    if (!social) {
      return NextResponse.json({});
    }
    const out: Record<string, string> = {};
    if (social.facebookEnabled && social.facebook) out.facebook = social.facebook;
    if (social.instagramEnabled && social.instagram) out.instagram = social.instagram;
    if (social.twitterEnabled && social.twitter) out.twitter = social.twitter;
    if (social.youtubeEnabled && social.youtube) out.youtube = social.youtube;
    if (social.tiktokEnabled && social.tiktok) out.tiktok = social.tiktok;
    if (social.whatsappEnabled && social.whatsapp) out.whatsapp = social.whatsapp;
    const res = NextResponse.json(out);
    res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
    return res;
  } catch {
    return NextResponse.json({});
  }
}
