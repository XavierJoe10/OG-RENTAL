// src/app/api/properties/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/jwt";
import { pinFile } from "@/lib/ipfs";

// ── GET /api/properties ─────────────────────────────────────
// Public: list available properties with optional filters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const location  = searchParams.get("location");
  const minPrice  = searchParams.get("minPrice");
  const maxPrice  = searchParams.get("maxPrice");
  const page      = Number(searchParams.get("page") || 1);
  const limit     = Number(searchParams.get("limit") || 12);

  const where: any = { isAvailable: true };
  if (location) where.location = { contains: location, mode: "insensitive" };
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.property.count({ where }),
  ]);

  return NextResponse.json({ properties, total, page, limit });
}

// ── POST /api/properties ────────────────────────────────────
// Owner only: create a new listing with IPFS file uploads
export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "OWNER")
    return NextResponse.json({ error: "Only owners can list properties" }, { status: 403 });

  const formData = await req.formData();

  const title       = formData.get("title")       as string;
  const description = formData.get("description") as string;
  const location    = formData.get("location")    as string;
  const rentInrRaw  = (formData.get("rentInr") ?? formData.get("price")) as string;
  const price       = parseFloat(rentInrRaw);
  const bedrooms    = parseInt(formData.get("bedrooms")  as string);
  const bathrooms   = parseInt(formData.get("bathrooms") as string);
  const areaSqFt    = formData.get("areaSqFt") ? parseFloat(formData.get("areaSqFt") as string) : null;

  if (!title || !description || !location || !price || !bedrooms || !bathrooms) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Upload images to IPFS
  const imageCIDs: string[] = [];
  const imageFiles = formData.getAll("images") as File[];
  for (const img of imageFiles) {
    const buffer = Buffer.from(await img.arrayBuffer());
    const cid = await pinFile(buffer, img.name, img.type);
    imageCIDs.push(cid);
  }

  // Upload videos to IPFS
  const videoCIDs: string[] = [];
  const videoFiles = formData.getAll("videos") as File[];
  for (const vid of videoFiles) {
    const buffer = Buffer.from(await vid.arrayBuffer());
    const cid = await pinFile(buffer, vid.name, vid.type);
    videoCIDs.push(cid);
  }

  const property = await prisma.property.create({
    data: {
      title, description, location, price, bedrooms, bathrooms,
      areaSqFt, imageCIDs, videoCIDs,
      ownerId: user.userId,
    },
  });

  return NextResponse.json(property, { status: 201 });
}
