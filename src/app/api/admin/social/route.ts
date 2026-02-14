import { NextResponse } from "next/server";
import { socialMedia } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import type { Role } from "../../../../lib/db-types";
import { newId } from "../../../../lib/id";

const MASTER: Role = "MASTER";

export async function GET(request: Request) {
  try {
    requireAuth(request, [MASTER]);
    let social = await socialMedia.findFirst();
    if (!social) {
      social = await socialMedia.create({
        id: newId(),
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
        whatsappEnabled: true,
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
    const auth = requireAuth(request, [MASTER]);
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
      whatsappEnabled,
    } = body;

    const urlData: Record<string, string | null | undefined> = {
      facebook: typeof facebook === "string" ? facebook.trim() || null : undefined,
      instagram: typeof instagram === "string" ? instagram.trim() || null : undefined,
      twitter: typeof twitter === "string" ? twitter.trim() || null : undefined,
      youtube: typeof youtube === "string" ? youtube.trim() || null : undefined,
      tiktok: typeof tiktok === "string" ? tiktok.trim() || null : undefined,
      whatsapp: typeof whatsapp === "string" ? whatsapp.trim() || null : undefined,
    };
    const enabledData: Record<string, boolean> = {};
    if (typeof facebookEnabled === "boolean") enabledData.facebookEnabled = facebookEnabled;
    if (typeof instagramEnabled === "boolean") enabledData.instagramEnabled = instagramEnabled;
    if (typeof twitterEnabled === "boolean") enabledData.twitterEnabled = twitterEnabled;
    if (typeof youtubeEnabled === "boolean") enabledData.youtubeEnabled = youtubeEnabled;
    if (typeof tiktokEnabled === "boolean") enabledData.tiktokEnabled = tiktokEnabled;
    if (typeof whatsappEnabled === "boolean") enabledData.whatsappEnabled = whatsappEnabled;

    let social = await socialMedia.findFirst();
    const updatePayload = { ...urlData, ...enabledData, updatedById: auth.userId };
    const hasUpdates = Object.keys(updatePayload).some((k) => updatePayload[k as keyof typeof updatePayload] !== undefined);

    if (!social) {
      social = await socialMedia.create({
        id: newId(),
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
        updatedById: auth.userId,
      });
    } else if (hasUpdates) {
      social = await socialMedia.update(social.id, updatePayload);
    }
    return NextResponse.json(social);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al actualizar redes sociales" }, { status: 500 });
  }
}
