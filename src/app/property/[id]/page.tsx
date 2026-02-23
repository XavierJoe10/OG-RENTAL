"use client";
// src/app/property/[id]/page.tsx
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatInr } from "@/lib/currency";

const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

interface Property {
  id: string; title: string; description: string; location: string;
  price: number; bedrooms: number; bathrooms: number; areaSqFt?: number;
  imageCIDs: string[]; videoCIDs: string[]; isAvailable: boolean;
  owner: { id: string; name: string; email: string; walletAddress?: string };
  offers: any[];
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [offerRentInr, setOfferRentInr] = useState("");
  const [offerMsg,   setOfferMsg]   = useState("");
  const [status,     setStatus]     = useState("");
  const [imgIndex,   setImgIndex]   = useState(0);

  // Get token from localStorage (set at login)
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then((r) => r.json())
      .then(setProperty);
  }, [id]);

  async function placeOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!offerRentInr) return;
    const rentInr = parseFloat(offerRentInr);
    if (!Number.isFinite(rentInr) || rentInr <= 0) {
      setStatus("❌ Enter a valid INR offer amount.");
      return;
    }

    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ propertyId: id, rentInr, message: offerMsg }),
    });

    const data = await res.json();
    setStatus(res.ok ? "✅ Offer placed successfully!" : `❌ ${data.error}`);
  }

  if (!property) return <p className="text-gray-500 p-8">Loading…</p>;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Image gallery */}
      <div className="bg-gray-100 rounded-xl overflow-hidden h-80 mb-6 relative">
        {property.imageCIDs.length > 0 ? (
          <>
            <img
              src={`${GATEWAY}/${property.imageCIDs[imgIndex]}`}
              className="w-full h-full object-cover"
              alt="Property"
            />
            {property.imageCIDs.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {property.imageCIDs.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`w-2 h-2 rounded-full ${i === imgIndex ? "bg-white" : "bg-white/50"}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">🏠</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Details */}
        <div className="md:col-span-2">
          <div className="flex items-start justify-between">
            <h1 className="text-3xl font-bold">{property.title}</h1>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                property.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
              }`}
            >
              {property.isAvailable ? "Available" : "Rented"}
            </span>
          </div>
          <p className="text-gray-500 mt-1">📍 {property.location}</p>
          <div className="flex gap-4 mt-3 text-sm text-gray-600">
            <span>🛏 {property.bedrooms} bed</span>
            <span>🚿 {property.bathrooms} bath</span>
            {property.areaSqFt && <span>📐 {property.areaSqFt} ft²</span>}
          </div>
          <p className="mt-5 text-gray-700 leading-relaxed">{property.description}</p>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-500">Listed by</p>
            <p className="font-medium">{property.owner.name}</p>
            <p className="text-sm text-gray-500">{property.owner.email}</p>
            {property.owner.walletAddress && (
              <p className="text-xs text-gray-400 font-mono mt-1 break-all">
                {property.owner.walletAddress}
              </p>
            )}
          </div>
        </div>

        {/* Offer panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 h-fit">
          <p className="text-2xl font-bold text-indigo-600 mb-1">{formatInr(property.price)}</p>
          <p className="text-sm text-gray-500 mb-4">per month</p>

          {property.isAvailable ? (
            <form onSubmit={placeOffer} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Your Offer (INR / month)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  placeholder={String(property.price)}
                  value={offerRentInr}
                  onChange={(e) => setOfferRentInr(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Message (optional)</label>
                <textarea
                  rows={3}
                  placeholder="Introduce yourself…"
                  value={offerMsg}
                  onChange={(e) => setOfferMsg(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Place Offer
              </button>
              {status && (
                <p className={`text-sm mt-1 ${status.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
                  {status}
                </p>
              )}
            </form>
          ) : (
            <p className="text-sm text-red-500 font-medium">This property is no longer available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
