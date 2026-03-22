// src/app/api/admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user)                    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN")    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") ?? "overview";

  if (section === "overview") {
    const [userCount, ownerCount, tenantCount, propertyCount, offerCount, agreementCount, paymentCount, totalRevenue] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "OWNER" } }),
        prisma.user.count({ where: { role: "TENANT" } }),
        prisma.property.count(),
        prisma.offer.count(),
        prisma.agreement.count(),
        prisma.payment.count({ where: { status: "SUCCESS" } }),
        prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
      ]);

    return NextResponse.json({
      users:        { total: userCount, owners: ownerCount, tenants: tenantCount },
      properties:   propertyCount,
      offers:       offerCount,
      agreements:   agreementCount,
      payments:     { count: paymentCount, totalAmount: totalRevenue._sum.amount ?? 0 },
    });
  }

  if (section === "users") {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true,
        walletAddress: true, createdAt: true,
        _count: { select: { properties: true, offers: true, agreementsAsOwner: true, agreementsAsTenant: true } },
      },
    });
    return NextResponse.json(users);
  }

  if (section === "properties") {
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { name: true, email: true } },
        _count: { select: { offers: true, agreements: true } },
      },
    });
    return NextResponse.json(properties);
  }

  if (section === "agreements") {
    const agreements = await prisma.agreement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        property: { select: { title: true, location: true } },
        owner:    { select: { name: true, email: true } },
        tenant:   { select: { name: true, email: true } },
        payments: { where: { status: "SUCCESS" } },
      },
    });
    return NextResponse.json(agreements);
  }

  if (section === "payments") {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        agreement: { include: { property: { select: { title: true } } } },
        tenant:    { select: { name: true, email: true } },
        owner:     { select: { name: true, email: true } },
      },
    });
    return NextResponse.json(payments);
  }

  return NextResponse.json({ error: "Invalid section" }, { status: 400 });
}
