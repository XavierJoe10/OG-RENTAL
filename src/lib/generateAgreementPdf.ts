// src/lib/generateAgreementPdf.ts
// Install: npm install pdf-lib qrcode @types/qrcode

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";
import QRCode from "qrcode";

export interface AgreementPdfData {
  // Parties
  ownerName: string;
  ownerEmail: string;
  ownerWallet: string;
  tenantName: string;
  tenantEmail: string;
  tenantWallet: string;

  // Property
  propertyTitle: string;
  propertyLocation: string;

  // Agreement
  monthlyRentInr: number;
  startDate: Date;
  endDate: Date;
  modeOfPayment: string; // "UPI"

  // Blockchain
  ipfsCID: string;
  onChainId: number;
  txHash: string;
  offerId: string;
  agreementId: string;
}

// ─── Colours ──────────────────────────────────────────────────────────────────
const DARK_BLUE  = rgb(0.063, 0.22, 0.424);   // #103870
const MID_BLUE   = rgb(0.13,  0.40, 0.72);    // #2166B8
const LIGHT_BLUE = rgb(0.88,  0.93, 0.98);    // #E1EEF9
const GOLD       = rgb(0.78,  0.59, 0.09);    // #C79617
const DARK_GRAY  = rgb(0.2,   0.2,  0.2);
const MID_GRAY   = rgb(0.45,  0.45, 0.45);
const LIGHT_GRAY = rgb(0.95,  0.95, 0.95);
const WHITE      = rgb(1,     1,    1);
const GREEN      = rgb(0.1,   0.55, 0.25);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatInr(value: number): string {
  // The built‑in PDF fonts used by pdf-lib (Helvetica, etc.) only support
  // the WinAnsi character set, which doesn’t include the Indian rupee symbol
  // (₹).  Attempting to draw text containing that character throws the
  // "WinAnsi cannot encode \"₹\"" error seen in the stack trace.  To keep
  // things simple we format the amount normally and then replace the currency
  // symbol with a textual abbreviation instead.
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("₹", "INR "); // e.g. "₹1,000" → "INR 1,000"
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function shortHash(hash: string, len = 18): string {
  if (hash.length <= len) return hash;
  return hash.slice(0, len / 2) + "..." + hash.slice(-len / 2);
}

function drawHLine(
  page: PDFPage,
  y: number,
  color = MID_BLUE,
  opacity = 0.3,
  thickness = 0.5
) {
  const { width } = page.getSize();
  page.drawLine({
    start: { x: 48, y },
    end:   { x: width - 48, y },
    thickness,
    color,
    opacity,
  });
}

function drawLabel(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size = 8
) {
  page.drawText(text.toUpperCase(), {
    x, y,
    size,
    font,
    color: MID_BLUE,
    opacity: 0.85,
  });
}

function drawValue(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size = 11,
  color = DARK_GRAY
) {
  page.drawText(text, { x, y, size, font, color });
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateAgreementPdf(
  data: AgreementPdfData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle("RentChain Rental Agreement");
  pdfDoc.setAuthor("RentChain");
  pdfDoc.setSubject(`Rental Agreement - ${data.propertyTitle}`);

  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const oblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // ── PAGE 1 ─────────────────────────────────────────────────────────────────
  const page1 = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page1.getSize();

  // ── Header band ────────────────────────────────────────────────────────────
  page1.drawRectangle({
    x: 0, y: height - 90,
    width, height: 90,
    color: DARK_BLUE,
  });

  // Logo text
  page1.drawText("RC", {
    x: 48, y: height - 50,
    size: 20, font: bold, color: WHITE,
  });
  page1.drawText("RentChain", {
    x: 85, y: height - 42,
    size: 22, font: bold, color: WHITE,
  });
  page1.drawText("Decentralized Property Rental", {
    x: 86, y: height - 58,
    size: 9, font: regular, color: rgb(0.75, 0.87, 1),
  });

  // Right side badge
  page1.drawRectangle({
    x: width - 170, y: height - 75,
    width: 122, height: 50,
    color: GOLD,
    borderRadius: 4,
  });
  page1.drawText("RENTAL AGREEMENT", {
    x: width - 165, y: height - 46,
    size: 8, font: bold, color: WHITE,
  });
  page1.drawText("BLOCKCHAIN VERIFIED", {
    x: width - 163, y: height - 60,
    size: 7, font: regular, color: WHITE,
    opacity: 0.9,
  });

  // ── Sub-header ─────────────────────────────────────────────────────────────
  page1.drawRectangle({
    x: 0, y: height - 115,
    width, height: 26,
    color: LIGHT_BLUE,
  });
  page1.drawText(`Agreement ID: ${data.agreementId}`, {
    x: 50, y: height - 107,
    size: 8, font: regular, color: DARK_BLUE,
  });
  page1.drawText(`On-Chain ID: #${data.onChainId}`, {
    x: 280, y: height - 107,
    size: 8, font: regular, color: DARK_BLUE,
  });
  page1.drawText(`Generated: ${new Date().toLocaleDateString("en-IN")}`, {
    x: 450, y: height - 107,
    size: 8, font: regular, color: DARK_BLUE,
  });

  // ── Section: Parties ───────────────────────────────────────────────────────
  let y = height - 145;

  page1.drawText("PARTIES TO THE AGREEMENT", {
    x: 48, y,
    size: 11, font: bold, color: DARK_BLUE,
  });
  y -= 6;
  drawHLine(page1, y);
  y -= 20;

  // Owner box
  page1.drawRectangle({
    x: 48, y: y - 68,
    width: 228, height: 80,
    color: LIGHT_BLUE,
    borderRadius: 5,
  });
  page1.drawRectangle({
    x: 48, y: y + 6,
    width: 228, height: 18,
    color: DARK_BLUE,
    borderRadius: 5,
  });
  page1.drawText("PROPERTY OWNER / LESSOR", {
    x: 60, y: y + 10,
    size: 8, font: bold, color: WHITE,
  });
  drawLabel(page1, "Full Name",     58, y - 12, bold);
  drawValue(page1, data.ownerName,  58, y - 24, bold, 12);
  drawLabel(page1, "Email",         58, y - 40, bold);
  drawValue(page1, data.ownerEmail, 58, y - 52, regular, 9, MID_GRAY);
  drawLabel(page1, "Wallet Address",58, y - 65, bold);
  drawValue(page1, shortHash(data.ownerWallet, 28), 58, y - 77, regular, 8, DARK_GRAY);

  // Tenant box
  page1.drawRectangle({
    x: 318, y: y - 68,
    width: 228, height: 80,
    color: LIGHT_BLUE,
    borderRadius: 5,
  });
  page1.drawRectangle({
    x: 318, y: y + 6,
    width: 228, height: 18,
    color: MID_BLUE,
    borderRadius: 5,
  });
  page1.drawText("TENANT / LESSEE", {
    x: 330, y: y + 10,
    size: 8, font: bold, color: WHITE,
  });
  drawLabel(page1, "Full Name",      328, y - 12, bold);
  drawValue(page1, data.tenantName,  328, y - 24, bold, 12);
  drawLabel(page1, "Email",          328, y - 40, bold);
  drawValue(page1, data.tenantEmail, 328, y - 52, regular, 9, MID_GRAY);
  drawLabel(page1, "Wallet Address", 328, y - 65, bold);
  drawValue(page1, shortHash(data.tenantWallet, 28), 328, y - 77, regular, 8, DARK_GRAY);

  y -= 100;

  // ── Section: Property ──────────────────────────────────────────────────────
  page1.drawText("PROPERTY DETAILS", {
    x: 48, y,
    size: 11, font: bold, color: DARK_BLUE,
  });
  y -= 6;
  drawHLine(page1, y);
  y -= 20;

  page1.drawRectangle({
    x: 48, y: y - 40,
    width: 498, height: 52,
    color: LIGHT_GRAY,
    borderRadius: 4,
  });
  drawLabel(page1, "Property Name", 58, y - 5, bold);
  drawValue(page1, data.propertyTitle, 58, y - 17, bold, 13, DARK_BLUE);
  drawLabel(page1, "Location / Address", 58, y - 30, bold);
  drawValue(page1, data.propertyLocation, 58, y - 42, regular, 10);

  y -= 68;

  // ── Section: Agreement Terms ───────────────────────────────────────────────
  page1.drawText("AGREEMENT TERMS", {
    x: 48, y,
    size: 11, font: bold, color: DARK_BLUE,
  });
  y -= 6;
  drawHLine(page1, y);
  y -= 22;

  const colW = 120;
  const terms = [
    { label: "Monthly Rent",   value: formatInr(data.monthlyRentInr), highlight: true },
    { label: "Lease Start",    value: formatDate(data.startDate) },
    { label: "Lease End",      value: formatDate(data.endDate) },
    { label: "Mode of Payment",value: data.modeOfPayment },
  ];

  terms.forEach((term, i) => {
    const x = 48 + i * 130;
    page1.drawRectangle({
      x: x - 2, y: y - 38,
      width: colW + 10, height: 50,
      color: term.highlight ? DARK_BLUE : WHITE,
      borderRadius: 4,
      borderColor: term.highlight ? DARK_BLUE : rgb(0.8, 0.85, 0.92),
      borderWidth: 1,
    });
    drawLabel(
      page1, term.label,
      x + 4, y - 6, bold, 7.5
    );
    if (term.highlight) {
      page1.drawText(term.value, {
        x: x + 4, y: y - 24,
        size: 13, font: bold, color: GOLD,
      });
    } else {
      drawValue(page1, term.value, x + 4, y - 24, bold, 10,
        term.label === "Lease Start" ? GREEN : DARK_GRAY);
    }
  });

  y -= 60;

  // Lease duration
  const months = Math.round(
    (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  page1.drawRectangle({
    x: 48, y: y - 22,
    width: 498, height: 32,
    color: LIGHT_BLUE,
    borderRadius: 4,
  });
  page1.drawText(`Total Lease Duration: ${months} month${months !== 1 ? "s" : ""}  |  Total Payable: ${formatInr(data.monthlyRentInr * months)}`, {
    x: 58, y: y - 10,
    size: 10, font: bold, color: DARK_BLUE,
  });

  y -= 48;

  // ── Section: Terms & Conditions ────────────────────────────────────────────
  page1.drawText("TERMS & CONDITIONS", {
    x: 48, y,
    size: 11, font: bold, color: DARK_BLUE,
  });
  y -= 6;
  drawHLine(page1, y);
  y -= 15;

  const clauses = [
    "1. The Tenant shall pay the monthly rent of " + formatInr(data.monthlyRentInr) + " via " + data.modeOfPayment + " on or before the 5th of each calendar month.",
    "2. The Tenant shall use the premises solely for residential purposes and shall not sublet without written consent.",
    "3. The Owner shall ensure the property is in habitable condition at the commencement of the lease.",
    "4. Either party may terminate this agreement with 30 days written notice, subject to blockchain record update.",
    "5. Any damage to the property beyond normal wear and tear shall be deducted from the security deposit.",
    "6. This agreement is legally binding and its authenticity is verifiable on the Ethereum blockchain.",
    "7. Disputes shall be resolved through mutual negotiation. Governing law: Indian Contract Act, 1872.",
  ];

  clauses.forEach((clause) => {
    page1.drawText(clause, {
      x: 52, y,
      size: 8.5, font: regular, color: DARK_GRAY,
      maxWidth: 490,
      lineHeight: 13,
    });
    y -= 20;
  });

  // ── Signature Section ──────────────────────────────────────────────────────
  y -= 10;
  drawHLine(page1, y, DARK_BLUE, 0.15, 0.5);
  y -= 22;

  page1.drawText("CRYPTOGRAPHIC SIGNATURES (BLOCKCHAIN VERIFIED)", {
    x: 48, y,
    size: 10, font: bold, color: DARK_BLUE,
  });
  y -= 8;

  // Explanation note
  page1.drawRectangle({
    x: 48, y: y - 18,
    width: 498, height: 22,
    color: LIGHT_BLUE,
    borderRadius: 3,
  });
  page1.drawText(
    "This agreement is authenticated by an Ethereum transaction hash - a tamper-proof cryptographic signature on the blockchain.",
    { x: 56, y: y - 11, size: 7, font: regular, color: DARK_BLUE, maxWidth: 484 }
  );
  y -= 28;

  // ── Owner sign hash card ──────────────────────────────────────────────────
  page1.drawRectangle({
    x: 48, y: y - 78,
    width: 498, height: 90,
    color: WHITE,
    borderColor: DARK_BLUE,
    borderWidth: 1,
    borderRadius: 5,
  });
  // left accent bar
  page1.drawRectangle({
    x: 48, y: y - 78,
    width: 5, height: 90,
    color: DARK_BLUE,
    borderRadius: 3,
  });
  // Header row
  page1.drawRectangle({
    x: 53, y: y - 14,
    width: 493, height: 18,
    color: DARK_BLUE,
    borderRadius: 3,
  });
  page1.drawText("OWNER / LESSOR - BLOCKCHAIN SIGNATURE", {
    x: 62, y: y - 9,
    size: 7.5, font: bold, color: WHITE,
  });
  page1.drawText("OK  VERIFIED ON-CHAIN", {
    x: 430, y: y - 9,
    size: 7, font: bold, color: GOLD,
  });

  // Owner name + wallet
  drawLabel(page1, "Authorized Party",  62, y - 28, bold, 7);
  page1.drawText(data.ownerName, {
    x: 62, y: y - 39,
    size: 10, font: bold, color: DARK_GRAY,
  });
  drawLabel(page1, "Wallet Address",  220, y - 28, bold, 7);
  page1.drawText(shortHash(data.ownerWallet, 30), {
    x: 220, y: y - 39,
    size: 8, font: regular, color: MID_GRAY,
  });

  // TX hash label + value
  drawLabel(page1, "Transaction Hash (Cryptographic Signature)", 62, y - 54, bold, 7);
  // hash split into two lines so it fits
  const txHalf1 = data.txHash.slice(0, Math.ceil(data.txHash.length / 2));
  const txHalf2 = data.txHash.slice(Math.ceil(data.txHash.length / 2));
  page1.drawText(txHalf1, {
    x: 62, y: y - 64,
    size: 7.5, font: regular, color: MID_BLUE,
  });
  page1.drawText(txHalf2, {
    x: 62, y: y - 75,
    size: 7.5, font: regular, color: MID_BLUE,
  });

  y -= 100;

  // ── Tenant sign hash card ─────────────────────────────────────────────────
  page1.drawRectangle({
    x: 48, y: y - 78,
    width: 498, height: 90,
    color: WHITE,
    borderColor: MID_BLUE,
    borderWidth: 1,
    borderRadius: 5,
  });
  page1.drawRectangle({
    x: 48, y: y - 78,
    width: 5, height: 90,
    color: MID_BLUE,
    borderRadius: 3,
  });
  page1.drawRectangle({
    x: 53, y: y - 14,
    width: 493, height: 18,
    color: MID_BLUE,
    borderRadius: 3,
  });
  page1.drawText("TENANT / LESSEE - BLOCKCHAIN SIGNATURE", {
    x: 62, y: y - 9,
    size: 7.5, font: bold, color: WHITE,
  });
  page1.drawText("OK  VERIFIED ON-CHAIN", {
    x: 430, y: y - 9,
    size: 7, font: bold, color: GOLD,
  });

  drawLabel(page1, "Authorized Party",  62, y - 28, bold, 7);
  page1.drawText(data.tenantName, {
    x: 62, y: y - 39,
    size: 10, font: bold, color: DARK_GRAY,
  });
  drawLabel(page1, "Wallet Address",  220, y - 28, bold, 7);
  page1.drawText(shortHash(data.tenantWallet, 30), {
    x: 220, y: y - 39,
    size: 8, font: regular, color: MID_GRAY,
  });

  drawLabel(page1, "Transaction Hash (Cryptographic Signature)", 62, y - 54, bold, 7);
  page1.drawText(txHalf1, {
    x: 62, y: y - 64,
    size: 7.5, font: regular, color: MID_BLUE,
  });
  page1.drawText(txHalf2, {
    x: 62, y: y - 75,
    size: 7.5, font: regular, color: MID_BLUE,
  });

  // Blockchain seal
  page1.drawRectangle({
    x: 48, y: y - 102,
    width: 498, height: 18,
    color: LIGHT_BLUE,
    borderRadius: 3,
  });
  page1.drawText(
    `On-Chain ID: #${data.onChainId}   |   IPFS CID: ${shortHash(data.ipfsCID, 36)}   |   Network: Ethereum Sepolia`,
    { x: 58, y: y - 95, size: 7, font: regular, color: DARK_BLUE, maxWidth: 480 }
  );

  y -= 110;

  // ── Footer band ────────────────────────────────────────────────────────────
  page1.drawRectangle({
    x: 0, y: 0,
    width, height: 26,
    color: DARK_BLUE,
  });
  page1.drawText("RentChain | Decentralized Property Rental | Powered by Ethereum & IPFS", {
    x: 48, y: 9,
    size: 7.5, font: regular, color: rgb(0.7, 0.82, 1),
  });
  page1.drawText("Page 1 of 2", {
    x: width - 80, y: 9,
    size: 7.5, font: regular, color: WHITE,
  });

  // ── PAGE 2 – Blockchain Verification ──────────────────────────────────────
  const page2 = pdfDoc.addPage([595, 842]);

  // Header band
  page2.drawRectangle({
    x: 0, y: height - 90,
    width, height: 90,
    color: DARK_BLUE,
  });
  page2.drawText("RC", {
    x: 48, y: height - 50,
    size: 20, font: bold, color: WHITE,
  });
  page2.drawText("RentChain", {
    x: 85, y: height - 42,
    size: 22, font: bold, color: WHITE,
  });
  page2.drawText("Blockchain Verification Certificate", {
    x: 86, y: height - 58,
    size: 9, font: regular, color: rgb(0.75, 0.87, 1),
  });

  // Sub-header
  page2.drawRectangle({
    x: 0, y: height - 115,
    width, height: 26,
    color: LIGHT_BLUE,
  });
  page2.drawText("This document is cryptographically secured on the Ethereum Sepolia blockchain and stored immutably on IPFS.", {
    x: 50, y: height - 107,
    size: 7.5, font: regular, color: DARK_BLUE,
  });

  let y2 = height - 145;

  // ── QR Code ────────────────────────────────────────────────────────────────
  page2.drawText("VERIFICATION QR CODE", {
    x: 48, y: y2,
    size: 11, font: bold, color: DARK_BLUE,
  });
  y2 -= 6;
  drawHLine(page2, y2);
  y2 -= 18;

  const etherscanUrl = `https://sepolia.etherscan.io/tx/${data.txHash}`;
  const ipfsUrl      = `https://gateway.pinata.cloud/ipfs/${data.ipfsCID}`;

  // Generate QR for Etherscan tx
  const qrDataUrl = await QRCode.toDataURL(etherscanUrl, {
    errorCorrectionLevel: "H",
    width: 180,
    margin: 1,
    color: { dark: "#103870", light: "#FFFFFF" },
  });
  const qrBase64   = qrDataUrl.split(",")[1];
  const qrImage    = await pdfDoc.embedPng(Buffer.from(qrBase64, "base64"));
  const qrDims     = qrImage.scale(0.85);

  // QR card
  page2.drawRectangle({
    x: 48, y: y2 - qrDims.height - 30,
    width: qrDims.width + 24,
    height: qrDims.height + 44,
    color: WHITE,
    borderColor: MID_BLUE,
    borderWidth: 1.5,
    borderRadius: 8,
  });
  page2.drawImage(qrImage, {
    x: 60, y: y2 - qrDims.height - 12,
    width: qrDims.width, height: qrDims.height,
  });
  page2.drawText("Scan to verify on Etherscan", {
    x: 54, y: y2 - qrDims.height - 25,
    size: 8, font: bold, color: DARK_BLUE,
  });
  page2.drawText("Ethereum Transaction Record", {
    x: 54, y: y2 - 10,
    size: 8.5, font: bold, color: DARK_BLUE,
  });

  // IPFS QR
  const qrIPFSUrl = await QRCode.toDataURL(ipfsUrl, {
    errorCorrectionLevel: "H",
    width: 180,
    margin: 1,
    color: { dark: "#2166B8", light: "#FFFFFF" },
  });
  const qrIPFSBase64 = qrIPFSUrl.split(",")[1];
  const qrIPFSImage  = await pdfDoc.embedPng(Buffer.from(qrIPFSBase64, "base64"));
  const qrIPFSDims   = qrIPFSImage.scale(0.85);

  page2.drawRectangle({
    x: 318, y: y2 - qrIPFSDims.height - 30,
    width: qrIPFSDims.width + 24,
    height: qrIPFSDims.height + 44,
    color: WHITE,
    borderColor: MID_BLUE,
    borderWidth: 1.5,
    borderRadius: 8,
  });
  page2.drawImage(qrIPFSImage, {
    x: 330, y: y2 - qrIPFSDims.height - 12,
    width: qrIPFSDims.width, height: qrIPFSDims.height,
  });
  page2.drawText("Scan to view on IPFS", {
    x: 324, y: y2 - qrIPFSDims.height - 25,
    size: 8, font: bold, color: MID_BLUE,
  });
  page2.drawText("IPFS Document Record", {
    x: 324, y: y2 - 10,
    size: 8.5, font: bold, color: MID_BLUE,
  });

  y2 -= qrDims.height + 55;

  // ── Blockchain details ─────────────────────────────────────────────────────
  page2.drawText("BLOCKCHAIN RECORD", {
    x: 48, y: y2,
    size: 11, font: bold, color: DARK_BLUE,
  });
  y2 -= 6;
  drawHLine(page2, y2);
  y2 -= 18;

  const blockchainRows: Array<{ label: string; value: string; color?: any }> = [
    { label: "On-Chain Agreement ID", value: `#${data.onChainId}`,         color: GOLD },
    { label: "Transaction Hash",      value: data.txHash                              },
    { label: "Network",               value: "Ethereum Sepolia Testnet",    color: GREEN },
    { label: "Smart Contract",        value: "RentalAgreement.sol"                    },
    { label: "Etherscan URL",         value: etherscanUrl,                  color: MID_BLUE },
  ];

  blockchainRows.forEach((row, idx) => {
    const rowY = y2 - idx * 36;
    page2.drawRectangle({
      x: 48, y: rowY - 26,
      width: 498, height: 32,
      color: idx % 2 === 0 ? LIGHT_GRAY : WHITE,
      borderRadius: 3,
    });
    drawLabel(page2, row.label, 58, rowY - 6, bold, 7.5);
    page2.drawText(row.value, {
      x: 58, y: rowY - 19,
      size: 8.5, font: bold,
      color: row.color ?? DARK_GRAY,
      maxWidth: 480,
    });
  });

  y2 -= blockchainRows.length * 36 + 10;

  // ── IPFS details ───────────────────────────────────────────────────────────
  page2.drawText("IPFS STORAGE RECORD", {
    x: 48, y: y2,
    size: 11, font: bold, color: DARK_BLUE,
  });
  y2 -= 6;
  drawHLine(page2, y2);
  y2 -= 18;

  const ipfsRows: Array<{ label: string; value: string; color?: any }> = [
    { label: "IPFS CID (Content Identifier)", value: data.ipfsCID,  color: MID_BLUE },
    { label: "IPFS Gateway URL",              value: ipfsUrl,        color: MID_BLUE },
    { label: "Storage Provider",              value: "Pinata Cloud (IPFS Pinning Service)" },
    { label: "Document Type",                 value: "Rental Agreement JSON" },
  ];

  ipfsRows.forEach((row, idx) => {
    const rowY = y2 - idx * 36;
    page2.drawRectangle({
      x: 48, y: rowY - 26,
      width: 498, height: 32,
      color: idx % 2 === 0 ? LIGHT_GRAY : WHITE,
      borderRadius: 3,
    });
    drawLabel(page2, row.label, 58, rowY - 6, bold, 7.5);
    page2.drawText(row.value, {
      x: 58, y: rowY - 19,
      size: 8.5, font: bold,
      color: row.color ?? DARK_GRAY,
      maxWidth: 480,
    });
  });

  y2 -= ipfsRows.length * 36 + 10;

  // ── Verification note ──────────────────────────────────────────────────────
  page2.drawRectangle({
    x: 48, y: y2 - 50,
    width: 498, height: 62,
    color: LIGHT_BLUE,
    borderRadius: 6,
    borderColor: MID_BLUE,
    borderWidth: 1,
  });
  page2.drawText("HOW TO VERIFY THIS DOCUMENT", {
    x: 60, y: y2 - 8,
    size: 9, font: bold, color: DARK_BLUE,
  });
  page2.drawText(
    "1. Scan the Etherscan QR code or visit the URL above to confirm the transaction on-chain.",
    { x: 60, y: y2 - 22, size: 8, font: regular, color: DARK_GRAY, maxWidth: 478 }
  );
  page2.drawText(
    "2. Scan the IPFS QR code or visit the IPFS URL to view the original agreement document.",
    { x: 60, y: y2 - 36, size: 8, font: regular, color: DARK_GRAY, maxWidth: 478 }
  );
  page2.drawText(
    "3. Use verifyAgreement() on the smart contract with the CID above to confirm tamper-proof integrity.",
    { x: 60, y: y2 - 50, size: 8, font: regular, color: DARK_GRAY, maxWidth: 478 }
  );

  // Footer
  page2.drawRectangle({ x: 0, y: 0, width, height: 26, color: DARK_BLUE });
  page2.drawText("RentChain | Decentralized Property Rental | Powered by Ethereum & IPFS", {
    x: 48, y: 9,
    size: 7.5, font: regular, color: rgb(0.7, 0.82, 1),
  });
  page2.drawText("Page 2 of 2", {
    x: width - 80, y: 9,
    size: 7.5, font: regular, color: WHITE,
  });

  return pdfDoc.save();
}
