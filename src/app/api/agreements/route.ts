// src/app/api/agreements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/jwt";
import { pinJSON } from "@/lib/ipfs";
import { createOnChainAgreement } from "@/lib/blockchain";

// ── GET /api/agreements ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where: any =
    user.role === "OWNER"  ? { ownerId:  user.userId } :
    user.role === "TENANT" ? { tenantId: user.userId } :
    {};  // ADMIN sees all

  const agreements = await prisma.agreement.findMany({
    where,
    include: {
      property: { select: { id: true, title: true, location: true } },
      owner:    { select: { id: true, name: true, email: true } },
      tenant:   { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(agreements);
}

// ── POST /api/agreements ────────────────────────────────────
// Owner finalises a deal by creating the agreement on IPFS + blockchain
export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "OWNER")
    return NextResponse.json({ error: "Only owners can finalize agreements" }, { status: 403 });

  const { offerId, startDate, endDate } = await req.json();
  if (!offerId || !startDate || !endDate)
    return NextResponse.json({ error: "offerId, startDate and endDate required" }, { status: 400 });

  const offer = await prisma.offer.findUnique({
    where:   { id: offerId },
    include: { property: true, tenant: true },
  });

  if (!offer)                      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  if (offer.status !== "ACCEPTED") return NextResponse.json({ error: "Offer must be accepted first" }, { status: 400 });
  if (offer.property.ownerId !== user.userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (offer.agreement)
    return NextResponse.json({ error: "Agreement already created for this offer" }, { status: 409 });

  if (!offer.tenant.walletAddress)
    return NextResponse.json({ error: "Tenant has no wallet address on file" }, { status: 400 });

  // 1. Build agreement document and pin to IPFS
  const monthlyRentInr = offer.price;
  const agreementDoc = {
    property:     { id: offer.propertyId, title: offer.property.title, location: offer.property.location },
    owner:        { userId: user.userId },
    tenant:       { userId: offer.tenantId, name: offer.tenant.name, email: offer.tenant.email },
    monthlyRentInr,
    startDate,
    endDate,
    offerId,
    generatedAt:  new Date().toISOString(),
  };

  const ipfsCID = await pinJSON(agreementDoc, `agreement-${offerId}`);

  // 2. Store on blockchain
  const { onChainId, txHash } = await createOnChainAgreement({
    tenantWallet:   offer.tenant.walletAddress,
    propertyId:     offer.propertyId,
    monthlyRentInr,
    startDate:      new Date(startDate),
    endDate:        new Date(endDate),
    ipfsCID,
  });

  // 3. Save to PostgreSQL
  const agreement = await prisma.agreement.create({
    data: {
      monthlyRent: monthlyRentInr,
      startDate:   new Date(startDate),
      endDate:     new Date(endDate),
      ipfsCID,
      onChainId,
      txHash,
      status:      "ACTIVE",
      propertyId:  offer.propertyId,
      ownerId:     user.userId,
      tenantId:    offer.tenantId,
      offerId,
    },
  });

  // 4. Mark property as no longer available
  await prisma.property.update({
    where: { id: offer.propertyId },
    data:  { isAvailable: false },
  });

  return NextResponse.json(agreement, { status: 201 });
}
