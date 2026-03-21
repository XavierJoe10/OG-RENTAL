"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatInr } from "@/lib/currency";

const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

interface Property {
  id:          string;
  title:       string;
  description: string;
  location:    string;
  price:       number;
  bedrooms:    number;
  bathrooms:   number;
  areaSqFt?:   number;
  imageCIDs:   string[];
  videoCIDs:   string[];
  isAvailable: boolean;
  owner:       { id: string; name: string; email: string; walletAddress?: string };
  offers:      any[];
}

// ── Detail block ──────────────────────────────────────────────────────────────
function DetailBlock({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-sm md:text-base text-gray-500 font-medium">{label}:</p>
      <p className={`mt-1 font-semibold text-base md:text-lg ${highlight ? "text-blue-600" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

// ── Property card (always shown) ──────────────────────────────────────────────
function PropertyDetailsCard({ property }: { property: Property }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Image */}
      <div className="aspect-[16/9] w-full bg-gray-100">
        {property.imageCIDs.length > 0 ? (
          <img
            src={`${GATEWAY}/${property.imageCIDs[0]}`}
            alt={property.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">🏠</div>
        )}
      </div>

      <div className="space-y-5 p-5 md:p-8">
        {/* Title */}
        <h1 className="text-lg md:text-2xl font-bold tracking-tight text-gray-950">
          {property.title}
        </h1>

        {/* Description */}
        <div className="space-y-2">
          <h2 className="text-base md:text-xl font-semibold text-gray-900">Description</h2>
          <p className="text-sm md:text-base leading-7 text-gray-600">{property.description}</p>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailBlock label="Price"     value={`${formatInr(property.price)} / month`} highlight />
          <DetailBlock label="Location"  value={property.location} />
          <DetailBlock label="Bedrooms"  value={`${property.bedrooms}`} />
          <DetailBlock label="Bathrooms" value={`${property.bathrooms}`} />
          {property.areaSqFt && (
            <DetailBlock label="Area" value={`${property.areaSqFt} sq.ft`} />
          )}
        </div>

        {/* Status badge */}
        <div>
          <span className={`inline-flex rounded-full px-4 py-1.5 text-sm md:text-base font-semibold ${
            property.isAvailable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
          }`}>
            Status: {property.isAvailable ? "OPEN" : "CLOSED"}
          </span>
        </div>
      </div>
    </section>
  );
}

// ── Offer card (only for tenants) ─────────────────────────────────────────────
function OfferCard({
  property, offerRentInr, offerMsg, status, isSubmitting, submitted,
  onOfferRentInrChange, onOfferMsgChange, onSubmit,
}: {
  property:              Property;
  offerRentInr:          string;
  offerMsg:              string;
  status:                string;
  isSubmitting:          boolean;
  submitted:             boolean;
  onOfferRentInrChange:  (v: string) => void;
  onOfferMsgChange:      (v: string) => void;
  onSubmit:              (e: React.FormEvent) => Promise<void>;
}) {
  return (
    <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm lg:sticky lg:top-8">
      <h2 className="text-base md:text-lg font-bold text-gray-950">Make an Offer</h2>
      <p className="mt-1 text-sm md:text-base text-gray-500">
        Listed Price: {formatInr(property.price)}/month
      </p>

      {property.isAvailable ? (
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm md:text-base font-semibold text-gray-800">
              Your Offer (INR / month) *
            </label>
            <input
              type="number" step="1" min="1" required
              value={offerRentInr}
              onChange={(e) => onOfferRentInrChange(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm md:text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm md:text-base font-semibold text-gray-800">
              Message (optional)
            </label>
            <textarea
              rows={4}
              placeholder="Add a message to the owner..."
              value={offerMsg}
              onChange={(e) => onOfferMsgChange(e.target.value)}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm md:text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || submitted}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm md:text-base font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : submitted ? "Submitted" : "Submit Offer"}
          </button>

          {status && (
            <p className={`text-xs md:text-sm font-medium ${status.startsWith("Success:") ? "text-green-600" : "text-red-600"}`}>
              {status}
            </p>
          )}
        </form>
      ) : (
        <p className="mt-4 text-sm font-medium text-red-600">This property is no longer available.</p>
      )}
    </aside>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [property,     setProperty]     = useState<Property | null>(null);
  const [offerRentInr, setOfferRentInr] = useState("");
  const [offerMsg,     setOfferMsg]     = useState("");
  const [status,       setStatus]       = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [role,         setRole]         = useState<string | null>(null);

  useEffect(() => {
    // Read role from localStorage
    setRole(localStorage.getItem("role"));

    fetch(`/api/properties/${id}`)
      .then((r) => r.json())
      .then(setProperty);
  }, [id]);

  async function placeOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!offerRentInr) return;

    const rentInr = parseFloat(offerRentInr);
    if (!Number.isFinite(rentInr) || rentInr <= 0) {
      setStatus("Error: Enter a valid INR offer amount.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    const token = localStorage.getItem("token") || "";
    const res   = await fetch("/api/offers", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ propertyId: id, rentInr, message: offerMsg }),
    });

    const data = await res.json();
    const ok   = res.ok;
    setStatus(ok ? "Success: Offer submitted successfully!" : `Error: ${data.error}`);
    setSubmitted(ok);
    setIsSubmitting(false);
  }

  if (!property) return <p className="p-8 text-gray-500">Loading...</p>;

  const isTenant = role === "TENANT";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      {isTenant ? (
        // ── Two column layout for tenants (property + offer form) ──
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <PropertyDetailsCard property={property} />
          <OfferCard
            property={property}
            offerRentInr={offerRentInr}
            offerMsg={offerMsg}
            status={status}
            isSubmitting={isSubmitting}
            submitted={submitted}
            onOfferRentInrChange={(v) => {
              setSubmitted(false);
              setOfferRentInr(v);
            }}
            onOfferMsgChange={(v) => {
              setSubmitted(false);
              setOfferMsg(v);
            }}
            onSubmit={placeOffer}
          />
        </div>
      ) : (
        // ── Single column for owners / guests (no offer form) ──
        <div className="max-w-3xl mx-auto">
          <PropertyDetailsCard property={property} />
        </div>
      )}
    </div>
  );
}
