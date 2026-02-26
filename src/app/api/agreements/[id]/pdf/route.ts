// src/app/api/agreements/[id]/pdf/route.ts
// Download a rental agreement as a professional PDF

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/jwt";
import { generateAgreementPdf } from "@/lib/generateAgreementPdf";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth check
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch agreement with all related data
  const agreement = await prisma.agreement.findUnique({
    where: { id: params.id },
    include: {
      property: true,
      owner:    { select: { id: true, name: true, email: true, walletAddress: true } },
      tenant:   { select: { id: true, name: true, email: true, walletAddress: true } },
    },
  });

  if (!agreement) {
    return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  }

  // Only owner or tenant can download
  if (agreement.ownerId !== user.userId && agreement.tenantId !== user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate PDF
  const pdfBytes = await generateAgreementPdf({
    ownerName:      agreement.owner.name,
    ownerEmail:     agreement.owner.email,
    ownerWallet:    agreement.owner.walletAddress  ?? "Not linked",
    tenantName:     agreement.tenant.name,
    tenantEmail:    agreement.tenant.email,
    tenantWallet:   agreement.tenant.walletAddress ?? "Not linked",
    propertyTitle:  agreement.property.title,
    propertyLocation: agreement.property.location,
    monthlyRentInr: agreement.monthlyRent,
    startDate:      new Date(agreement.startDate),
    endDate:        new Date(agreement.endDate),
    modeOfPayment:  "UPI",
    ipfsCID:        agreement.ipfsCID,
    onChainId:      agreement.onChainId ?? 0,
    txHash:         agreement.txHash    ?? "",
    offerId:        agreement.offerId   ?? "",
    agreementId:    agreement.id,
  });

  const filename = `rentchain-agreement-${agreement.id.slice(0, 8)}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":      pdfBytes.byteLength.toString(),
    },
  });
}
