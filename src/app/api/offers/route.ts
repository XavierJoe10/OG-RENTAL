// src/app/api/offers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/jwt";

// ── GET /api/offers?propertyId=...  or  ?tenantId=...  ──────
export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");

  let where: any = {};

  if (user.role === "TENANT") {
    // Tenants see only their own offers
    where.tenantId = user.userId;
  } else if (user.role === "OWNER") {
    if (propertyId) {
      // Verify ownership
      const prop = await prisma.property.findFirst({
        where: { id: propertyId, ownerId: user.userId },
      });
      if (!prop) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      where.propertyId = propertyId;
    } else {
      // All offers across owner's properties
      where.property = { ownerId: user.userId };
    }
  } else if (user.role === "ADMIN") {
    if (propertyId) where.propertyId = propertyId;
  }

  const offers = await prisma.offer.findMany({
    where,
    include: {
      tenant:   { select: { id: true, name: true, email: true, walletAddress: true } },
      property: { select: { id: true, title: true, location: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(offers);
}

// ── POST /api/offers ────────────────────────────────────────
// Tenant places an offer on a property
export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "TENANT")
    return NextResponse.json({ error: "Only tenants can place offers" }, { status: 403 });

  const { propertyId, price, rentInr, message } = await req.json();
  const offeredRentInr = typeof rentInr === "number" ? rentInr : Number(price);

  if (!propertyId || !Number.isFinite(offeredRentInr) || offeredRentInr <= 0) {
    return NextResponse.json({ error: "propertyId and rentInr required" }, { status: 400 });
  }

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property)              return NextResponse.json({ error: "Property not found" }, { status: 404 });
  if (!property.isAvailable)  return NextResponse.json({ error: "Property not available" }, { status: 400 });

  // Only one pending offer per tenant per property
  const existingPending = await prisma.offer.findFirst({
    where: { propertyId, tenantId: user.userId, status: "PENDING" },
  });
  if (existingPending) {
    return NextResponse.json({ error: "You already have a pending offer on this property" }, { status: 409 });
  }

  const offer = await prisma.offer.create({
    data: { propertyId, tenantId: user.userId, price: offeredRentInr, message },
    include: { property: { select: { id: true, title: true } } },
  });

  return NextResponse.json(offer, { status: 201 });
}
