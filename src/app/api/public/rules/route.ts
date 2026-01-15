import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const rules = await prisma.rules.findFirst();
    return NextResponse.json({ content: rules?.content || "" });
  } catch (error) {
    return NextResponse.json({ content: "" });
  }
}

