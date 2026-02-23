import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { ethers } from "ethers";
import { buildWalletAuthMessage } from "@/lib/wallet-auth";

const CHALLENGE_COOKIE = "wallet_nonce";
const CHALLENGE_TTL_SECONDS = 60 * 5;
const SECRET = process.env.JWT_SECRET!;

type WalletChallengePayload = {
  type: "wallet_nonce";
  address: string;
  nonce: string;
};

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");
    if (!address) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    let normalizedAddress: string;
    try {
      normalizedAddress = ethers.getAddress(address).toLowerCase();
    } catch {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const nonce = crypto.randomBytes(16).toString("hex");
    const payload: WalletChallengePayload = { type: "wallet_nonce", address: normalizedAddress, nonce };
    const challengeToken = jwt.sign(payload, SECRET, { expiresIn: CHALLENGE_TTL_SECONDS });
    const message = buildWalletAuthMessage(normalizedAddress, nonce);

    const res = NextResponse.json({ nonce, message, expiresIn: CHALLENGE_TTL_SECONDS });
    res.cookies.set(CHALLENGE_COOKIE, challengeToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: CHALLENGE_TTL_SECONDS,
    });

    return res;
  } catch (err) {
    console.error("[auth/nonce]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

