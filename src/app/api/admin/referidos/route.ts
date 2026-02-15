import { NextResponse } from "next/server";
import crypto from "node:crypto";
import * as db from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { newId } from "@/lib/id";
import { referidoCreateSchema } from "@/lib/validators";
import type { Role } from "@/lib/db-types";

const ROLES: Role[] = ["SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ROLES);
    const { searchParams } = new URL(request.url);
    const createdById = searchParams.get("createdById") ?? undefined;

    const links = await db.referralLink.findMany(createdById ? { createdById } : undefined);
    if (links.length === 0) return NextResponse.json([]);

    const linkIds = links.map((l) => l.id);
    const createdByIds = [...new Set(links.map((l) => l.createdById))];
    const visits = await db.referralVisit.findMany({ where: { referralLinkIds: linkIds }, take: 5000 });
    const userIds = [...new Set([...createdByIds, ...visits.map((v) => v.userId).filter(Boolean)])] as string[];
    const userList = userIds.length ? await db.users.findManyByIds(userIds) : [];
    const userMap = Object.fromEntries(userList.map((u) => [u.id, u]));

    const visitsByLinkId: Record<string, typeof visits> = {};
    for (const link of links) visitsByLinkId[link.id] = [];
    for (const v of visits) {
      if (visitsByLinkId[v.referralLinkId]) visitsByLinkId[v.referralLinkId].push(v);
    }

    const result = links.map((link) => ({
      ...link,
      createdBy: link.createdById ? userMap[link.createdById] ? { id: userMap[link.createdById].id, name: userMap[link.createdById].name, email: userMap[link.createdById].email } : null : null,
      visits: (visitsByLinkId[link.id] ?? []).slice(0, 100).map((v) => ({
        ...v,
        user: v.userId && userMap[v.userId] ? { id: userMap[v.userId].id, name: userMap[v.userId].name, email: userMap[v.userId].email } : null,
      })),
    }));

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al obtener links de referidos", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener links de referidos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, ROLES);
    const body = await request.json();
    const parsed = referidoCreateSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((e) => e.path.join(".") + ": " + e.message).join("; ");
      return NextResponse.json({ error: message || "Datos inválidos" }, { status: 400 });
    }
    const { name } = parsed.data;

    let code: string;
    let exists = true;
    while (exists) {
      code = crypto.randomBytes(8).toString("hex");
      const existing = await db.referralLink.findUnique({ code });
      exists = !!existing;
    }

    const linkId = newId();
    await db.referralLink.create({
      id: linkId,
      code: code!,
      name,
      createdById: auth.userId,
    });
    const link = await db.referralLink.findById(linkId);
    if (!link) {
      return NextResponse.json({ error: "Error al crear link" }, { status: 500 });
    }

    await db.auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: "CREATE_REFERRAL_LINK",
      entity: "ReferralLink",
      entityId: link.id,
      meta: { code: link.code, name: link.name },
    });

    const createdBy = await db.users.findById(link.createdById);
    const payload = {
      ...link,
      createdBy: createdBy ? { id: createdBy.id, name: createdBy.name, email: createdBy.email } : null,
    };
    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al crear link de referido", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al crear link de referido" }, { status: 500 });
  }
}
