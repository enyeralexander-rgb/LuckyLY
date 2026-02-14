import { getSql } from "./neon";
import type { SocialMedia } from "../db-types";

export async function findFirst(): Promise<SocialMedia | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "SocialMedia" LIMIT 1`;
  return (rows[0] as SocialMedia) ?? null;
}

export async function create(data: {
  id: string;
  facebook?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  whatsapp?: string | null;
  facebookEnabled?: boolean;
  instagramEnabled?: boolean;
  twitterEnabled?: boolean;
  youtubeEnabled?: boolean;
  tiktokEnabled?: boolean;
  whatsappEnabled?: boolean;
  updatedById?: string | null;
}): Promise<SocialMedia> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO "SocialMedia" (id, facebook, instagram, twitter, youtube, tiktok, whatsapp,
      "facebookEnabled", "instagramEnabled", "twitterEnabled", "youtubeEnabled", "tiktokEnabled", "whatsappEnabled",
      "updatedAt", "updatedById")
    VALUES (${data.id}, ${data.facebook ?? null}, ${data.instagram ?? null}, ${data.twitter ?? null}, ${data.youtube ?? null}, ${data.tiktok ?? null}, ${data.whatsapp ?? null},
      ${data.facebookEnabled ?? true}, ${data.instagramEnabled ?? true}, ${data.twitterEnabled ?? true}, ${data.youtubeEnabled ?? true}, ${data.tiktokEnabled ?? true}, ${data.whatsappEnabled ?? true},
      ${now}, ${data.updatedById ?? null})
  `;
  const rows = await sql`SELECT * FROM "SocialMedia" WHERE id = ${data.id}`;
  return rows[0] as SocialMedia;
}

export async function update(id: string, data: Partial<Record<string, unknown>> & { updatedById?: string | null }): Promise<SocialMedia> {
  const sql = getSql();
  const now = new Date();
  const currentRows = await sql`SELECT * FROM "SocialMedia" WHERE id = ${id}`;
  const current = (currentRows[0] as Record<string, unknown>) ?? {};
  const merged: Record<string, unknown> = { ...current, ...data, updatedAt: now };
  await sql`
    UPDATE "SocialMedia" SET
      facebook = ${(merged.facebook as string | null) ?? null},
      instagram = ${(merged.instagram as string | null) ?? null},
      twitter = ${(merged.twitter as string | null) ?? null},
      youtube = ${(merged.youtube as string | null) ?? null},
      tiktok = ${(merged.tiktok as string | null) ?? null},
      whatsapp = ${(merged.whatsapp as string | null) ?? null},
      "facebookEnabled" = ${(merged.facebookEnabled as boolean) ?? true},
      "instagramEnabled" = ${(merged.instagramEnabled as boolean) ?? true},
      "twitterEnabled" = ${(merged.twitterEnabled as boolean) ?? true},
      "youtubeEnabled" = ${(merged.youtubeEnabled as boolean) ?? true},
      "tiktokEnabled" = ${(merged.tiktokEnabled as boolean) ?? true},
      "whatsappEnabled" = ${(merged.whatsappEnabled as boolean) ?? true},
      "updatedAt" = ${now},
      "updatedById" = ${(merged.updatedById as string | null) ?? null}
    WHERE id = ${id}
  `;
  const rows = await sql`SELECT * FROM "SocialMedia" WHERE id = ${id}`;
  return rows[0] as SocialMedia;
}
