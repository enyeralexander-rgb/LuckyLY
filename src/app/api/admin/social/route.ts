import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    let social = await prisma.socialMedia.findFirst();
    if (!social) {
      social = await prisma.socialMedia.create({
        data: {
          facebook: null,
          instagram: null,
          twitter: null,
          youtube: null,
          tiktok: null,
          whatsapp: null,
          facebookEnabled: true,
          instagramEnabled: true,
          twitterEnabled: true,
          youtubeEnabled: true,
          tiktokEnabled: true,
          whatsappEnabled: true
        }
      });
    }
    return NextResponse.json(social);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener redes sociales" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    const body = await request.json();
    const {
      facebook,
      instagram,
      twitter,
      youtube,
      tiktok,
      whatsapp,
      facebookEnabled,
      instagramEnabled,
      twitterEnabled,
      youtubeEnabled,
      tiktokEnabled,
      whatsappEnabled
    } = body;

    let social = await prisma.socialMedia.findFirst();
    const urlData = {
      facebook: typeof facebook === "string" ? facebook.trim() || null : undefined,
      instagram: typeof instagram === "string" ? instagram.trim() || null : undefined,
      twitter: typeof twitter === "string" ? twitter.trim() || null : undefined,
      youtube: typeof youtube === "string" ? youtube.trim() || null : undefined,
      tiktok: typeof tiktok === "string" ? tiktok.trim() || null : undefined,
      whatsapp: typeof whatsapp === "string" ? whatsapp.trim() || null : undefined
    };
    const enabledData = {
      ...(typeof facebookEnabled === "boolean" && { facebookEnabled }),
      ...(typeof instagramEnabled === "boolean" && { instagramEnabled }),
      ...(typeof twitterEnabled === "boolean" && { twitterEnabled }),
      ...(typeof youtubeEnabled === "boolean" && { youtubeEnabled }),
      ...(typeof tiktokEnabled === "boolean" && { tiktokEnabled }),
      ...(typeof whatsappEnabled === "boolean" && { whatsappEnabled })
    };

    if (!social) {
      social = await prisma.socialMedia.create({
        data: {
          facebook: urlData.facebook ?? null,
          instagram: urlData.instagram ?? null,
          twitter: urlData.twitter ?? null,
          youtube: urlData.youtube ?? null,
          tiktok: urlData.tiktok ?? null,
          whatsapp: urlData.whatsapp ?? null,
          facebookEnabled: true,
          instagramEnabled: true,
          twitterEnabled: true,
          youtubeEnabled: true,
          tiktokEnabled: true,
          whatsappEnabled: true,
          ...enabledData,
          updatedById: auth.userId
        }
      });
    } else {
      social = await prisma.socialMedia.update({
        where: { id: social.id },
        data: {
          ...(urlData.facebook !== undefined && { facebook: urlData.facebook }),
          ...(urlData.instagram !== undefined && { instagram: urlData.instagram }),
          ...(urlData.twitter !== undefined && { twitter: urlData.twitter }),
          ...(urlData.youtube !== undefined && { youtube: urlData.youtube }),
          ...(urlData.tiktok !== undefined && { tiktok: urlData.tiktok }),
          ...(urlData.whatsapp !== undefined && { whatsapp: urlData.whatsapp }),
          ...enabledData,
          updatedById: auth.userId
        }
      });
    }
    return NextResponse.json(social);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al actualizar redes sociales" }, { status: 500 });
  }
}

