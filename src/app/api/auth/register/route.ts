// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, role, walletAddress } = body;

    // ── Validation ──────────────────────────────────────────
    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!["OWNER", "TENANT"].includes(role)) {
      return NextResponse.json({ error: "Role must be OWNER or TENANT" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const normalizedWallet =
      walletAddress == null ? null : (typeof walletAddress === "string" ? walletAddress.trim() : null);
    if (walletAddress != null && typeof walletAddress !== "string") {
      return NextResponse.json({ error: "Invalid wallet address format" }, { status: 400 });
    }
    if (normalizedWallet && !/^0x[a-fA-F0-9]{40}$/.test(normalizedWallet)) {
      return NextResponse.json({ error: "Invalid wallet address format" }, { status: 400 });
    }

    // ── Check duplicate ─────────────────────────────────────
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // ── Create user ─────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role, walletAddress: normalizedWallet },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role as any });

    return NextResponse.json({ user, token }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = Array.isArray(err.meta?.target) ? err.meta?.target.join(",") : String(err.meta?.target || "");
      if (target.includes("walletAddress")) {
        return NextResponse.json({ error: "Wallet address already registered" }, { status: 409 });
      }
      if (target.includes("email")) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
