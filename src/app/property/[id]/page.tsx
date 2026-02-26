"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatInr } from "@/lib/currency";

const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSqFt?: number;
  imageCIDs: string[];
  videoCIDs: string[];
  isAvailable: boolean;
  owner: { id: string; name: string; email: string; walletAddress?: string };
  offers: any[];
}

function DetailBlock({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-4xl text-gray-700">{label}:</p>
      <p className={`mt-1 font-semibold ${highlight ? "text-5xl text-blue-600" : "text-4xl text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

function PropertyDetailsCard({ property }: { property: Property }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="aspect-[16/9] w-full bg-gray-100">
        {property.imageCIDs.length > 0 ? (
          <img
            src={`${GATEWAY}/${property.imageCIDs[0]}`}
            alt={property.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl text-gray-300">Home</div>
        )}
      </div>

      <div className="space-y-6 p-6 md:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-950">{property.title}</h1>

        <div className="space-y-3">
          <h2 className="text-5xl font-semibold text-gray-900">Description</h2>
          <p className="text-xl leading-8 text-gray-700">{property.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailBlock label="Price" value={`${formatInr(property.price)} / month`} highlight />
          <DetailBlock label="Location" value={property.location} />
          <DetailBlock label="Bedrooms" value={`${property.bedrooms}`} />
          <DetailBlock label="Bathrooms" value={`${property.bathrooms}`} />
        </div>

        <div>
          <span
            className={`inline-flex rounded-full px-5 py-2 text-xl font-medium ${
              property.isAvailable ? "bg-green-100 text-green-900" : "bg-red-100 text-red-700"
            }`}
          >
            Status: {property.isAvailable ? "OPEN" : "CLOSED"}
          </span>
        </div>
      </div>
    </section>
  );
}

function OfferCard({
  property,
  offerRentInr,
  offerMsg,
  status,
  onOfferRentInrChange,
  onOfferMsgChange,
  onSubmit,
}: {
  property: Property;
  offerRentInr: string;
  offerMsg: string;
  status: string;
  onOfferRentInrChange: (value: string) => void;
  onOfferMsgChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => Promise<void>;
}) {
  return (
    <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-8">
      <h2 className="text-2xl font-bold text-gray-950">Make an Offer</h2>
      <p className="mt-4 text-xl text-gray-700">Listed Price: {formatInr(property.price)}/month</p>

      {property.isAvailable ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="offer-amount" className="mb-2 block text-xl font-semibold text-gray-900">
              Your Offer (INR / month) *
            </label>
            <input
              id="offer-amount"
              type="number"
              step="1"
              min="1"
              required
              value={offerRentInr}
              onChange={(event) => onOfferRentInrChange(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="offer-message" className="mb-2 block text-xl font-semibold text-gray-900">
              Message (optional)
            </label>
            <textarea
              id="offer-message"
              rows={4}
              placeholder="Add a message to the owner..."
              value={offerMsg}
              onChange={(event) => onOfferMsgChange(event.target.value)}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            className="inline-flex rounded-xl bg-slate-900 px-6 py-3 text-lg font-semibold text-white transition hover:bg-slate-800"
          >
            Submit Offer
          </button>

          {status && (
            <p className={`text-sm ${status.startsWith("Success:") ? "text-green-600" : "text-red-600"}`}>
              {status}
            </p>
          )}
        </form>
      ) : (
        <p className="mt-6 text-sm font-medium text-red-600">This property is no longer available.</p>
      )}
    </aside>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [offerRentInr, setOfferRentInr] = useState("");
  const [offerMsg, setOfferMsg] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then((response) => response.json())
      .then(setProperty);
  }, [id]);

  async function placeOffer(event: React.FormEvent) {
    event.preventDefault();
    if (!offerRentInr) return;

    const rentInr = parseFloat(offerRentInr);
    if (!Number.isFinite(rentInr) || rentInr <= 0) {
      setStatus("Error: Enter a valid INR offer amount.");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    const response = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ propertyId: id, rentInr, message: offerMsg }),
    });

    const data = await response.json();
    setStatus(response.ok ? "Success: Offer submitted successfully." : `Error: ${data.error}`);
  }

  if (!property) return <p className="p-8 text-gray-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,380px)]">
        <PropertyDetailsCard property={property} />
        <OfferCard
          property={property}
          offerRentInr={offerRentInr}
          offerMsg={offerMsg}
          status={status}
          onOfferRentInrChange={setOfferRentInr}
          onOfferMsgChange={setOfferMsg}
          onSubmit={placeOffer}
        />
      </div>
    </div>
  );
}
