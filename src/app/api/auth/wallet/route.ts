// src/app/api/auth/wallet/route.ts
// PATCH /api/auth/wallet — link a MetaMask wallet to the logged-in user

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/jwt";
import { ethers } from "ethers";

export async function PATCH(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { walletAddress } = await req.json();

  if (!walletAddress) {
    return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
  }

  // Validate it's a real Ethereum address
  let normalized: string;
  try {
    normalized = ethers.getAddress(walletAddress).toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid wallet address format" }, { status: 400 });
  }

  // Block if wallet already linked — cannot be changed for security
  const currentUser = await prisma.user.findUnique({
    where:  { id: user.userId },
    select: { walletAddress: true },
  });
  if (currentUser?.walletAddress) {
    return NextResponse.json(
      { error: "A wallet is already permanently linked to this account and cannot be changed." },
      { status: 403 }
    );
  }

  // Check not already taken by another user
  const existing = await prisma.user.findFirst({
    where: {
      walletAddress: { equals: normalized, mode: "insensitive" },
      NOT: { id: user.userId },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "This wallet address is already linked to another account" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: user.userId },
    data:  { walletAddress: normalized },
    select: { id: true, name: true, email: true, role: true, walletAddress: true },
  });

  return NextResponse.json({ user: updated });
}
