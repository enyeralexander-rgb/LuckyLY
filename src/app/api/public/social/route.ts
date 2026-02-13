import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const social = await prisma.socialMedia.findFirst();
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
    return NextResponse.json(out);
  } catch {
    return NextResponse.json({});
  }
}

