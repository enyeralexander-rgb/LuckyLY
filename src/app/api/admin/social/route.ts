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
          whatsapp: null
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
    const { facebook, instagram, twitter, youtube, tiktok, whatsapp } = body;
    
    let social = await prisma.socialMedia.findFirst();
    if (!social) {
      social = await prisma.socialMedia.create({
        data: {
          facebook: facebook || null,
          instagram: instagram || null,
          twitter: twitter || null,
          youtube: youtube || null,
          tiktok: tiktok || null,
          whatsapp: whatsapp || null,
          updatedById: auth.userId
        }
      });
    } else {
      social = await prisma.socialMedia.update({
        where: { id: social.id },
        data: {
          facebook: facebook || null,
          instagram: instagram || null,
          twitter: twitter || null,
          youtube: youtube || null,
          tiktok: tiktok || null,
          whatsapp: whatsapp || null,
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

