import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rules = await prisma.rules.findFirst();
    const res = NextResponse.json({ content: rules?.content || "" });
    res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
    return res;
  } catch (error) {
    return NextResponse.json({ content: "" });
  }
}
