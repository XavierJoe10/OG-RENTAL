"use client";

import { useEffect, useState } from "react";
import { formatInr } from "@/lib/currency";

const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

type Tab = "offers" | "agreements" | "listings";

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

async function parseJsonSafely(res: Response): Promise<any | null> {
  const contentType = res.headers.get("content-type") || "";
  const rawBody = await res.text();
  const hasBody = rawBody.trim().length > 0;
  const isJson = contentType.toLowerCase().includes("application/json");

  if (!hasBody || !isJson) return null;

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

type CalendarDatePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
};

function CalendarDatePicker({ label, value, onChange, minDate }: CalendarDatePickerProps) {
  const initial = value ? parseYmd(value) : new Date();
  const [viewDate, setViewDate] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  return (
    <div className="bg-white border border-blue-100 rounded-lg p-3">
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>

      <div className="flex items-center justify-between mb-2 bg-blue-50 rounded-md px-2 py-1">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="px-2 py-1 text-sm text-blue-700 hover:bg-blue-100 rounded"
          aria-label="Previous month"
        >
          {"<"}
        </button>
        <span className="text-sm font-semibold text-blue-900">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="px-2 py-1 text-sm text-blue-700 hover:bg-blue-100 rounded"
          aria-label="Next month"
        >
          {">"}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-blue-900 mb-1">
        {[
          "Su",
          "Mo",
          "Tu",
          "We",
          "Th",
          "Fr",
          "Sa",
        ].map((w) => (
          <div key={w} className="text-center py-1 font-medium">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="h-8" />;

          const ymd = formatYmd(new Date(year, month, day));
          const isSelected = value === ymd;
          const isDisabled = Boolean(minDate) && ymd < minDate;

          return (
            <button
              key={ymd}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(ymd)}
              className={`h-8 rounded text-sm transition ${
                isSelected
                  ? "bg-blue-200 text-blue-900"
                  : isDisabled
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-700 hover:bg-blue-50"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("offers");
  const [offers, setOffers] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [agreementStartDate, setAgreementStartDate] = useState("");
  const [agreementEndDate, setAgreementEndDate] = useState("");
  const [creatingAgreement, setCreatingAgreement] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : "";

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const toRentInr = (value: any): number => {
    if (typeof value?.rentInr === "number") return value.rentInr;
    if (typeof value?.price === "number") return value.price;
    if (typeof value?.monthlyRent === "number") return value.monthlyRent;
    return 0;
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [offersRes, agreementsRes] = await Promise.all([
        fetch("/api/offers", { headers }),
        fetch("/api/agreements", { headers }),
      ]);
      setOffers(await offersRes.json());
      setAgreements(await agreementsRes.json());

      if (role === "OWNER" || role === "TENANT") {
        const listRes = await fetch("/api/properties", { headers });
        const data = await listRes.json();
        setListings(data.properties || []);
      }
      setLoading(false);
    }

    load();
  }, []);

  async function handleOfferAction(offerId: string, action: "accept" | "reject" | "withdraw") {
    const res = await fetch(`/api/offers/${offerId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action }),
    });

    const data = await parseJsonSafely(res);
    if (res.ok) {
      setActionMsg(`SUCCESS: Offer ${action}ed`);
    } else {
      setActionMsg(`ERROR: ${data?.error || `Request failed (${res.status})`}`);
    }

    const refreshed = await fetch("/api/offers", { headers });
    setOffers(await refreshed.json());
  }

  async function finalizeAgreement() {
    if (!selectedOfferId || !agreementStartDate || !agreementEndDate) return;

    if (agreementEndDate < agreementStartDate) {
      setActionMsg("ERROR: End date must be on or after start date.");
      return;
    }

    setCreatingAgreement(true);

    try {
      const res = await fetch("/api/agreements", {
        method: "POST",
        headers,
        body: JSON.stringify({
          offerId: selectedOfferId,
          startDate: agreementStartDate,
          endDate: agreementEndDate,
        }),
      });

      const data = await parseJsonSafely(res);

      if (res.ok) {
        const onChainId = data?.onChainId;
        setActionMsg(
          onChainId
            ? `SUCCESS: Agreement created. On-chain ID: ${onChainId}`
            : "SUCCESS: Agreement created successfully."
        );
        setSelectedOfferId(null);
        setAgreementStartDate("");
        setAgreementEndDate("");
      } else {
        setActionMsg(`ERROR: ${data?.error || `Request failed (${res.status})`}`);
      }

      const refreshed = await fetch("/api/agreements", { headers });
      setAgreements(await refreshed.json());
    } finally {
      setCreatingAgreement(false);
    }
  }

  if (loading) return <p className="text-gray-500 p-8">Loading dashboard...</p>;

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-700",
      ACCEPTED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-600",
      WITHDRAWN: "bg-gray-100 text-gray-500",
      ACTIVE: "bg-blue-100 text-blue-700",
      TERMINATED: "bg-red-100 text-red-600",
      EXPIRED: "bg-gray-100 text-gray-500",
    };
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[s] || "bg-gray-100 text-gray-500"}`}>
        {s}
      </span>
    );
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {actionMsg && (
        <div
          className={`mb-4 px-4 py-2 rounded-lg text-sm ${
            actionMsg.startsWith("SUCCESS:") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}
        >
          {actionMsg}
        </div>
      )}

      {selectedOfferId && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Select Agreement Dates</h2>
              <button
                type="button"
                onClick={() => {
                  if (creatingAgreement) return;
                  setSelectedOfferId(null);
                  setAgreementStartDate("");
                  setAgreementEndDate("");
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CalendarDatePicker
                label="Start Date"
                value={agreementStartDate}
                onChange={setAgreementStartDate}
              />
              <CalendarDatePicker
                label="End Date"
                value={agreementEndDate}
                onChange={setAgreementEndDate}
                minDate={agreementStartDate || undefined}
              />
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Selected: {agreementStartDate || "YYYY-MM-DD"} to {agreementEndDate || "YYYY-MM-DD"}
            </p>

            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={finalizeAgreement}
                disabled={!agreementStartDate || !agreementEndDate || creatingAgreement}
                className="bg-blue-200 text-blue-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-300 disabled:opacity-50"
              >
                {creatingAgreement ? "Finalizing..." : "Finalize Agreement"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (creatingAgreement) return;
                  setSelectedOfferId(null);
                  setAgreementStartDate("");
                  setAgreementEndDate("");
                }}
                className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([
          "offers",
          "agreements",
          ...((role === "OWNER" || role === "TENANT") ? ["listings"] : []),
        ] as string[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as Tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "offers" && (
        <div className="space-y-3">
          {offers.length === 0 ? (
            <p className="text-gray-400">No offers yet.</p>
          ) : (
            offers.map((o: any) => (
              <div
                key={o.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold">{o.property?.title ?? "-"}</p>
                  <p className="text-sm text-gray-500">
                    {role === "OWNER" ? `Tenant: ${o.tenant?.name}` : "Your offer"}
                    {" | "}
                    <span className="text-indigo-600 font-medium">{formatInr(toRentInr(o))} / month</span>
                  </p>
                  {o.message && <p className="text-xs text-gray-400 mt-0.5 italic">"{o.message}"</p>}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {statusBadge(o.status)}

                  {o.status === "PENDING" && role === "OWNER" && (
                    <>
                      <button
                        onClick={() => handleOfferAction(o.id, "accept")}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleOfferAction(o.id, "reject")}
                        className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {o.status === "ACCEPTED" && role === "OWNER" && !o.agreement && (
                    <button
                      onClick={() => {
                        setSelectedOfferId(o.id);
                        setAgreementStartDate("");
                        setAgreementEndDate("");
                      }}
                      className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700"
                    >
                      Finalize
                    </button>
                  )}

                  {o.status === "PENDING" && role === "TENANT" && (
                    <button
                      onClick={() => handleOfferAction(o.id, "withdraw")}
                      className="text-xs bg-gray-400 text-white px-3 py-1 rounded-lg hover:bg-gray-500"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "agreements" && (
        <div className="space-y-3">
          {agreements.length === 0 ? (
            <p className="text-gray-400">No agreements yet.</p>
          ) : (
            agreements.map((a: any) => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{a.property?.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(a.startDate).toLocaleDateString()} to {new Date(a.endDate).toLocaleDateString()}
                      {" | "}
                      <span className="text-indigo-600 font-medium">{formatInr(toRentInr(a))} / month</span>
                    </p>
                    {a.onChainId && (
                      <p className="text-xs text-gray-400 mt-1">
                        On-chain ID: <span className="font-mono">{a.onChainId}</span>
                      </p>
                    )}
                    {a.ipfsCID && (
                      <a
                        href={`${GATEWAY}/${a.ipfsCID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-500 hover:underline"
                      >
                        View on IPFS
                      </a>
                    )}
                    {a.txHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${a.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-500 hover:underline ml-3"
                      >
                        Etherscan
                      </a>
                    )}
                  </div>
                  {statusBadge(a.status)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "listings" && (role === "OWNER" || role === "TENANT") && (
        <div>
          {role === "OWNER" && (
            <a
              href="/dashboard/new-property"
              className="inline-block mb-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              + New Listing
            </a>
          )}

          <div className="space-y-3">
            {listings.length === 0 ? (
              <p className="text-gray-400">No available listings yet.</p>
            ) : (
              listings.map((p: any) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-sm text-gray-500">{p.location} | {formatInr(toRentInr(p))} / month</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {statusBadge(p.isAvailable ? "ACTIVE" : "RENTED")}
                    <a href={`/property/${p.id}`} className="text-xs text-indigo-500 hover:underline">
                      View
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
