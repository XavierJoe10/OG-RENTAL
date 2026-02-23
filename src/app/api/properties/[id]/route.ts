// src/app/api/properties/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/jwt";

// ── GET /api/properties/:id ─────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const property = await prisma.property.findUnique({
    where: { id: params.id },
    include: {
      owner:  { select: { id: true, name: true, email: true, walletAddress: true } },
      offers: {
        where: { status: "PENDING" },
        include: { tenant: { select: { id: true, name: true } } },
      },
    },
  });

  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(property);
}

// ── PUT /api/properties/:id ─────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const property = await prisma.property.findUnique({ where: { id: params.id } });
  if (!property)           return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (property.ownerId !== user.userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const updated = await prisma.property.update({
    where: { id: params.id },
    data: {
      title:       body.title,
      description: body.description,
      location:    body.location,
      price:       body.price,
      bedrooms:    body.bedrooms,
      bathrooms:   body.bathrooms,
      areaSqFt:    body.areaSqFt,
      isAvailable: body.isAvailable,
    },
  });

  return NextResponse.json(updated);
}

// ── DELETE /api/properties/:id ──────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const property = await prisma.property.findUnique({ where: { id: params.id } });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (property.ownerId !== user.userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Soft-delete: mark unavailable instead of deleting
  await prisma.property.update({
    where: { id: params.id },
    data: { isAvailable: false },
  });

  return NextResponse.json({ message: "Property removed from listings" });
}
