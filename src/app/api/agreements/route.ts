import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/jwt";
import { pinJSON } from "@/lib/ipfs";
import { createOnChainAgreement } from "@/lib/blockchain";

function parseYmdToLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(y, m - 1, d);
  if (
    parsed.getFullYear() !== y ||
    parsed.getMonth() !== m - 1 ||
    parsed.getDate() !== d
  ) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

// GET /api/agreements
export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where: any =
    user.role === "OWNER" ? { ownerId: user.userId } :
    user.role === "TENANT" ? { tenantId: user.userId } :
    {};

  const agreements = await prisma.agreement.findMany({
    where,
    include: {
      property: { select: { id: true, title: true, location: true } },
      owner: { select: { id: true, name: true, email: true } },
      tenant: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(agreements);
}

// POST /api/agreements
// Owner finalizes a deal by creating the agreement on IPFS + blockchain.
export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can finalize agreements" }, { status: 403 });
  }

  const { offerId, startDate, endDate } = await req.json();
  if (!offerId || !startDate || !endDate) {
    return NextResponse.json({ error: "offerId, startDate and endDate required" }, { status: 400 });
  }

  // Business rules:
  // 1) Start Date must be today or in the future.
  // 2) End Date must be strictly after Start Date.
  const start = parseYmdToLocalDate(String(startDate));
  const end = parseYmdToLocalDate(String(endDate));
  if (!start || !end) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD for startDate and endDate." },
      { status: 400 }
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start < today) {
    return NextResponse.json(
      { error: "Invalid start date: agreement cannot start in the past" },
      { status: 400 }
    );
  }

  if (end <= start) {
    return NextResponse.json(
      { error: "Invalid end date: must be after start date" },
      { status: 400 }
    );
  }

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { property: true, tenant: true },
  });

  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  if (offer.status !== "ACCEPTED") {
    return NextResponse.json({ error: "Offer must be accepted first" }, { status: 400 });
  }
  if (offer.property.ownerId !== user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (offer.agreement) {
    return NextResponse.json({ error: "Agreement already created for this offer" }, { status: 409 });
  }
  if (!offer.tenant.walletAddress) {
    return NextResponse.json({ error: "Tenant has no wallet address on file" }, { status: 400 });
  }

  const monthlyRentInr = offer.price;
  const agreementDoc = {
    property: { id: offer.propertyId, title: offer.property.title, location: offer.property.location },
    owner: { userId: user.userId },
    tenant: { userId: offer.tenantId, name: offer.tenant.name, email: offer.tenant.email },
    monthlyRentInr,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    offerId,
    generatedAt: new Date().toISOString(),
  };

  const ipfsCID = await pinJSON(agreementDoc, `agreement-${offerId}`);

  const { onChainId, txHash } = await createOnChainAgreement({
    tenantWallet: offer.tenant.walletAddress,
    propertyId: offer.propertyId,
    monthlyRentInr,
    startDate: start,
    endDate: end,
    ipfsCID,
  });

  const agreement = await prisma.agreement.create({
    data: {
      monthlyRent: monthlyRentInr,
      startDate: start,
      endDate: end,
      ipfsCID,
      onChainId,
      txHash,
      status: "ACTIVE",
      propertyId: offer.propertyId,
      ownerId: user.userId,
      tenantId: offer.tenantId,
      offerId,
    },
  });

  await prisma.property.update({
    where: { id: offer.propertyId },
    data: { isAvailable: false },
  });

  return NextResponse.json(agreement, { status: 201 });
}
