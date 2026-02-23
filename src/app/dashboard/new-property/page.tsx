"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewPropertyPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [areaSqFt, setAreaSqFt] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const role = typeof window !== "undefined" ? localStorage.getItem("role") || "" : "";

  const isOwner = useMemo(() => role === "OWNER", [role]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setStatus("Please log in first.");
      return;
    }

    setSubmitting(true);
    setStatus("");

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("location", location.trim());
    formData.append("rentInr", price);
    formData.append("bedrooms", bedrooms);
    formData.append("bathrooms", bathrooms);
    if (areaSqFt.trim()) formData.append("areaSqFt", areaSqFt);

    for (const image of images) formData.append("images", image);
    for (const video of videos) formData.append("videos", video);

    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Failed to create listing.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setStatus("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOwner) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-2">New Listing</h1>
        <p className="text-sm text-gray-600 mb-4">Only owner accounts can create property listings.</p>
        <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New Listing</h1>

      <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Rent (INR / month)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Area (sq ft, optional)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={areaSqFt}
              onChange={(e) => setAreaSqFt(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Bedrooms</label>
            <input
              type="number"
              min="1"
              step="1"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Bathrooms</label>
            <input
              type="number"
              min="1"
              step="1"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Images (optional)</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setImages(Array.from(e.target.files || []))}
            className="w-full text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Videos (optional)</label>
          <input
            type="file"
            multiple
            accept="video/*"
            onChange={(e) => setVideos(Array.from(e.target.files || []))}
            className="w-full text-sm"
          />
        </div>

        {status && <p className="text-sm text-red-600">{status}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Listing"}
          </button>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
