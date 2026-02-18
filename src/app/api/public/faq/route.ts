import { NextResponse } from "next/server";
import { faqItem } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await faqItem.findManyActive();
    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
