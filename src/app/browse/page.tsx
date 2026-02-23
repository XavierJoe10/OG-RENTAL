"use client";
// src/app/browse/page.tsx
import { useEffect, useState } from "react";
import { formatInr } from "@/lib/currency";

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSqFt?: number;
  imageCIDs: string[];
  isAvailable: boolean;
  owner: { name: string };
}

const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

export default function BrowsePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]   = useState(true);
  const [location, setLocation] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  async function fetchProperties() {
    setLoading(true);
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (maxPrice) params.set("maxPrice",  maxPrice);

    const res  = await fetch(`/api/properties?${params}`);
    const data = await res.json();
    setProperties(data.properties || []);
    setLoading(false);
  }

  useEffect(() => { fetchProperties(); }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Browse Properties</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-8 flex-wrap">
        <input
          className="border rounded-lg px-4 py-2 text-sm w-52"
          placeholder="Search by location…"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <input
          className="border rounded-lg px-4 py-2 text-sm w-40"
          placeholder="Max rent (INR)"
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
        <button
          onClick={fetchProperties}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          Search
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading properties…</p>
      ) : properties.length === 0 ? (
        <p className="text-gray-500">No properties found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p) => (
            <a
              key={p.id}
              href={`/property/${p.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition"
            >
              {/* Thumbnail */}
              <div className="h-44 bg-gray-100">
                {p.imageCIDs.length > 0 ? (
                  <img
                    src={`${GATEWAY}/${p.imageCIDs[0]}`}
                    alt={p.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl">🏠</div>
                )}
              </div>

              <div className="p-4">
                <h2 className="font-bold text-lg truncate">{p.title}</h2>
                <p className="text-gray-500 text-sm mt-1">📍 {p.location}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-indigo-600 font-semibold">{formatInr(p.price)} / month</span>
                  <span className="text-xs text-gray-400">
                    {p.bedrooms}bd · {p.bathrooms}ba
                    {p.areaSqFt ? ` · ${p.areaSqFt} ft²` : ""}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Listed by {p.owner.name}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
