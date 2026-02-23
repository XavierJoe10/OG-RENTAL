// src/app/api/offers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/jwt";

// ── PATCH /api/offers/:id  { action: "accept" | "reject" | "withdraw" } ────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offer = await prisma.offer.findUnique({
    where: { id: params.id },
    include: { property: true, tenant: true },
  });

  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  if (offer.status !== "PENDING")
    return NextResponse.json({ error: "Offer is no longer pending" }, { status: 400 });

  const { action } = await req.json();

  // ── Withdraw (tenant only) ──────────────────────────────
  if (action === "withdraw") {
    if (offer.tenantId !== user.userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updated = await prisma.offer.update({
      where: { id: params.id },
      data: { status: "WITHDRAWN" },
    });
    return NextResponse.json(updated);
  }

  // ── Accept / Reject (owner only) ───────────────────────
  if (!["accept", "reject"].includes(action))
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  if (offer.property.ownerId !== user.userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED";

  const updated = await prisma.offer.update({
    where: { id: params.id },
    data: { status: newStatus },
  });

  // If accepted, reject all other pending offers for this property
  if (action === "accept") {
    await prisma.offer.updateMany({
      where: {
        propertyId: offer.propertyId,
        id:         { not: params.id },
        status:     "PENDING",
      },
      data: { status: "REJECTED" },
    });
  }

  return NextResponse.json(updated);
}
