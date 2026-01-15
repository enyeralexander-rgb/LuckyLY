import { NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/auth";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    
    return NextResponse.json({
      valid: true,
      user: {
        id: auth.userId,
        role: auth.role
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, error: err.message || "Token inválido" },
      { status: 401 }
    );
  }
}



