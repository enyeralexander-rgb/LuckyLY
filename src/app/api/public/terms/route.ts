import { NextResponse } from "next/server";
import { termsAndConditions } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const terms = await termsAndConditions.findFirst();
    const res = NextResponse.json({ content: terms?.content || "" });
    res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
    return res;
  } catch (error) {
    return NextResponse.json({ content: "" });
  }
}
