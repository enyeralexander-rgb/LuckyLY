import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const terms = await prisma.termsAndConditions.findFirst();
    return NextResponse.json({ content: terms?.content || "" });
  } catch (error) {
    return NextResponse.json({ content: "" });
  }
}

