import { getSql } from "./neon";
import type { HomePageConfig } from "../db-types";

export async function findFirst(params?: { orderBy?: { updatedAt: "desc" } }): Promise<HomePageConfig | null> {
  const sql = getSql();
  const rows = params?.orderBy?.updatedAt === "desc"
    ? await sql`SELECT * FROM "HomePageConfig" ORDER BY "updatedAt" DESC LIMIT 1`
    : await sql`SELECT * FROM "HomePageConfig" LIMIT 1`;
  return (rows[0] as HomePageConfig) ?? null;
}

type HomePageUpdate = Partial<{
  heroImages: unknown;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroEffect: string | null;
  heroEffectParams: unknown;
  heroAutoSlide: boolean;
  heroAutoSlideMode: string | null;
  heroAutoSlideInterval: number;
  heroPauseOnHover: boolean;
  heroScrollFade: boolean;
  heroOpacity: number;
  heroBlur: number;
  heroTextColor: string | null;
  heroSubtitleColor: string | null;
  heroOverlayColor: string | null;
  heroOverlayOpacity: number;
  heroImageSize: string | null;
  instagramVideoUrl: string | null;
  headerConfig: unknown;
  contactConfig: unknown;
  footerConfig: unknown;
  sectionOrder: unknown;
  sectionVisibility: unknown;
  updatedById: string | null;
}>;

export async function create(data: {
  id: string;
  heroImages?: unknown;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroEffect?: string | null;
  heroEffectParams?: unknown;
  heroAutoSlide?: boolean;
  heroAutoSlideMode?: string | null;
  heroAutoSlideInterval?: number;
  heroPauseOnHover?: boolean;
  heroScrollFade?: boolean;
  heroOpacity?: number;
  heroBlur?: number;
  heroTextColor?: string | null;
  heroSubtitleColor?: string | null;
  heroOverlayColor?: string | null;
  heroOverlayOpacity?: number;
  heroImageSize?: string | null;
  instagramVideoUrl?: string | null;
  headerConfig?: unknown;
  contactConfig?: unknown;
  footerConfig?: unknown;
  sectionOrder?: unknown;
  sectionVisibility?: unknown;
  updatedById?: string | null;
}): Promise<HomePageConfig> {
  const sql = getSql();
  const now = new Date();
  const heroImages = data.heroImages != null ? JSON.stringify(data.heroImages) : null;
  const heroEffectParams = data.heroEffectParams != null ? JSON.stringify(data.heroEffectParams) : null;
  const headerConfig = data.headerConfig != null ? JSON.stringify(data.headerConfig) : null;
  const contactConfig = data.contactConfig != null ? JSON.stringify(data.contactConfig) : null;
  const footerConfig = data.footerConfig != null ? JSON.stringify(data.footerConfig) : null;
  const sectionOrder = data.sectionOrder != null ? JSON.stringify(data.sectionOrder) : null;
  const sectionVisibility = data.sectionVisibility != null ? JSON.stringify(data.sectionVisibility) : null;
  await sql`
    INSERT INTO "HomePageConfig" (id, "heroImages", "heroTitle", "heroSubtitle", "heroEffect", "heroEffectParams",
      "heroAutoSlide", "heroAutoSlideMode", "heroAutoSlideInterval", "heroPauseOnHover", "heroScrollFade",
      "heroOpacity", "heroBlur", "heroTextColor", "heroSubtitleColor", "heroOverlayColor", "heroOverlayOpacity",
      "heroImageSize", "instagramVideoUrl", "headerConfig", "contactConfig", "footerConfig", "sectionOrder", "sectionVisibility",
      "updatedAt", "updatedById")
    VALUES (${data.id}, ${heroImages}, ${data.heroTitle ?? null}, ${data.heroSubtitle ?? null}, ${data.heroEffect ?? null}, ${heroEffectParams},
      ${data.heroAutoSlide ?? false}, ${data.heroAutoSlideMode ?? null}, ${data.heroAutoSlideInterval ?? 5000}, ${data.heroPauseOnHover ?? false}, ${data.heroScrollFade ?? true},
      ${data.heroOpacity ?? 0.8}, ${data.heroBlur ?? 0}, ${data.heroTextColor ?? null}, ${data.heroSubtitleColor ?? null}, ${data.heroOverlayColor ?? null}, ${data.heroOverlayOpacity ?? 0.7},
      ${data.heroImageSize ?? null}, ${data.instagramVideoUrl ?? null}, ${headerConfig}, ${contactConfig}, ${footerConfig}, ${sectionOrder}, ${sectionVisibility},
      ${now}, ${data.updatedById ?? null})
  `;
  const rows = await sql`SELECT * FROM "HomePageConfig" WHERE id = ${data.id}`;
  return rows[0] as HomePageConfig;
}

export async function update(id: string, data: HomePageUpdate): Promise<HomePageConfig> {
  const sql = getSql();
  const now = new Date();
  const currentRows = await sql`SELECT * FROM "HomePageConfig" WHERE id = ${id}`;
  const current = (currentRows[0] as Record<string, unknown>) ?? {};
  const merged = { ...current, ...data, updatedAt: now };
  const heroImages = merged.heroImages != null ? (typeof merged.heroImages === "string" ? merged.heroImages : JSON.stringify(merged.heroImages)) : null;
  const heroEffectParams = merged.heroEffectParams != null ? (typeof merged.heroEffectParams === "string" ? merged.heroEffectParams : JSON.stringify(merged.heroEffectParams)) : null;
  const headerConfig = merged.headerConfig != null ? (typeof merged.headerConfig === "string" ? merged.headerConfig : JSON.stringify(merged.headerConfig)) : null;
  const contactConfig = merged.contactConfig != null ? (typeof merged.contactConfig === "string" ? merged.contactConfig : JSON.stringify(merged.contactConfig)) : null;
  const footerConfig = merged.footerConfig != null ? (typeof merged.footerConfig === "string" ? merged.footerConfig : JSON.stringify(merged.footerConfig)) : null;
  const sectionOrder = merged.sectionOrder != null ? (typeof merged.sectionOrder === "string" ? merged.sectionOrder : JSON.stringify(merged.sectionOrder)) : null;
  const sectionVisibility = merged.sectionVisibility != null ? (typeof merged.sectionVisibility === "string" ? merged.sectionVisibility : JSON.stringify(merged.sectionVisibility)) : null;
  await sql`
    UPDATE "HomePageConfig" SET
      "heroImages" = ${heroImages},
      "heroTitle" = ${merged.heroTitle as string | null ?? null},
      "heroSubtitle" = ${merged.heroSubtitle as string | null ?? null},
      "heroEffect" = ${merged.heroEffect as string | null ?? null},
      "heroEffectParams" = ${heroEffectParams},
      "heroAutoSlide" = ${(merged.heroAutoSlide as boolean) ?? false},
      "heroAutoSlideMode" = ${merged.heroAutoSlideMode as string | null ?? null},
      "heroAutoSlideInterval" = ${Number(merged.heroAutoSlideInterval) ?? 5000},
      "heroPauseOnHover" = ${(merged.heroPauseOnHover as boolean) ?? false},
      "heroScrollFade" = ${(merged.heroScrollFade as boolean) ?? true},
      "heroOpacity" = ${Number(merged.heroOpacity) ?? 0.8},
      "heroBlur" = ${Number(merged.heroBlur) ?? 0},
      "heroTextColor" = ${merged.heroTextColor as string | null ?? null},
      "heroSubtitleColor" = ${merged.heroSubtitleColor as string | null ?? null},
      "heroOverlayColor" = ${merged.heroOverlayColor as string | null ?? null},
      "heroOverlayOpacity" = ${Number(merged.heroOverlayOpacity) ?? 0.7},
      "heroImageSize" = ${merged.heroImageSize as string | null ?? null},
      "instagramVideoUrl" = ${merged.instagramVideoUrl as string | null ?? null},
      "headerConfig" = ${headerConfig},
      "contactConfig" = ${contactConfig},
      "footerConfig" = ${footerConfig},
      "sectionOrder" = ${sectionOrder},
      "sectionVisibility" = ${sectionVisibility},
      "updatedAt" = ${now},
      "updatedById" = ${merged.updatedById as string | null ?? null}
    WHERE id = ${id}
  `;
  const rows = await sql`SELECT * FROM "HomePageConfig" WHERE id = ${id}`;
  return rows[0] as HomePageConfig;
}
