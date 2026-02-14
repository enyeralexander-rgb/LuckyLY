import { NextResponse } from "next/server";
import { rules } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rulesData = await rules.findFirst();
    const res = NextResponse.json({ content: rulesData?.content || "" });
    res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
    return res;
  } catch (error) {
    return NextResponse.json({ content: "" });
  }
}
