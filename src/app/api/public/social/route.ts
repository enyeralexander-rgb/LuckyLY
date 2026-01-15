import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const social = await prisma.socialMedia.findFirst();
    return NextResponse.json(social || {
      facebook: null,
      instagram: null,
      twitter: null,
      youtube: null,
      tiktok: null,
      whatsapp: null
    });
  } catch (error) {
    return NextResponse.json({
      facebook: null,
      instagram: null,
      twitter: null,
      youtube: null,
      tiktok: null,
      whatsapp: null
    });
  }
}

