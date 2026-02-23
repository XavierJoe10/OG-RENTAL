import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ethers } from "ethers";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { buildWalletAuthMessage } from "@/lib/wallet-auth";

const CHALLENGE_COOKIE = "wallet_nonce";

type WalletChallengePayload = {
  type: "wallet_nonce";
  address: string;
  nonce: string;
  iat?: number;
  exp?: number;
};

export async function POST(req: NextRequest) {
  try {
    const { address, signature } = await req.json();
    if (!address || !signature) {
      return NextResponse.json({ error: "Address and signature are required" }, { status: 400 });
    }

    let normalizedAddress: string;
    try {
      normalizedAddress = ethers.getAddress(address).toLowerCase();
    } catch {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const challengeCookie = req.cookies.get(CHALLENGE_COOKIE)?.value;
    if (!challengeCookie) {
      return NextResponse.json({ error: "Challenge not found or expired" }, { status: 401 });
    }

    let payload: WalletChallengePayload;
    try {
      payload = jwt.verify(challengeCookie, process.env.JWT_SECRET!) as WalletChallengePayload;
    } catch {
      return NextResponse.json({ error: "Challenge not found or expired" }, { status: 401 });
    }

    if (payload.type !== "wallet_nonce" || payload.address !== normalizedAddress) {
      return NextResponse.json({ error: "Invalid challenge payload" }, { status: 401 });
    }

    const message = buildWalletAuthMessage(payload.address, payload.nonce);
    const recovered = ethers.verifyMessage(message, signature).toLowerCase();
    if (recovered !== normalizedAddress) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: {
        walletAddress: { equals: normalizedAddress, mode: "insensitive" },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Wallet address is not registered" }, { status: 404 });
    }
    if (user.role !== "TENANT") {
      return NextResponse.json({ error: "Wallet login is available for tenants only" }, { status: 403 });
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role as any });
    const res = NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, walletAddress: user.walletAddress },
    });
    res.cookies.set(CHALLENGE_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 0,
    });

    return res;
  } catch (err) {
    console.error("[auth/verify]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

