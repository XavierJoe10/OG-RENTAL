// src/app/api/auth/me/route.ts
// GET /api/auth/me — returns current logged-in user's profile including walletAddress

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where:  { id: user.userId },
    select: { id: true, name: true, email: true, role: true, walletAddress: true },
  });

  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(me);
}
