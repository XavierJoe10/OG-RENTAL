// src/app/api/payments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/jwt";

// ── GET /api/payments — fetch payments for logged-in user ──────────────────
export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const agreementId = searchParams.get("agreementId");

  const where: any = agreementId
    ? { agreementId }
    : user.role === "OWNER"
      ? { ownerId:  user.userId }
      : { tenantId: user.userId };

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      agreement: { include: { property: { select: { title: true } } } },
      tenant:    { select: { name: true, email: true } },
      owner:     { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(payments);
}

// ── POST /api/payments — create a mock UPI payment ────────────────────────
export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "TENANT") return NextResponse.json({ error: "Only tenants can make payments" }, { status: 403 });

  const { agreementId, upiId, month } = await req.json();

  if (!agreementId || !upiId || !month) {
    return NextResponse.json({ error: "agreementId, upiId and month are required" }, { status: 400 });
  }

  // Validate agreement belongs to this tenant
  const agreement = await prisma.agreement.findUnique({
    where: { id: agreementId },
    include: { property: true },
  });

  if (!agreement) return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  if (agreement.tenantId !== user.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (agreement.status !== "ACTIVE") return NextResponse.json({ error: "Agreement is not active" }, { status: 400 });

  // Check not already paid for this month
  const existing = await prisma.payment.findFirst({
    where: { agreementId, month, status: "SUCCESS" },
  });
  if (existing) {
    return NextResponse.json({ error: `Rent for ${month} is already paid` }, { status: 409 });
  }

  // Generate mock transaction ID
  const transactionId = "TXN" + Date.now() + Math.floor(Math.random() * 10000);

  // Simulate processing delay (handled on frontend)
  const payment = await prisma.payment.create({
    data: {
      amount:        agreement.monthlyRent,
      month,
      status:        "SUCCESS",
      upiId,
      transactionId,
      agreementId,
      tenantId:      user.userId,
      ownerId:       agreement.ownerId,
      paidAt:        new Date(),
    },
  });

  return NextResponse.json({ payment, transactionId }, { status: 201 });
}
