"use client";

import { useEffect, useState } from "react";
import { formatInr } from "@/lib/currency";

type AdminTab = "overview" | "users" | "properties" | "agreements" | "payments";

const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  const colors: Record<string, string> = {
    green:  "bg-green-100 text-green-700",
    blue:   "bg-blue-100 text-blue-700",
    indigo: "bg-indigo-100 text-indigo-700",
    red:    "bg-red-100 text-red-600",
    gray:   "bg-gray-100 text-gray-500",
    amber:  "bg-amber-100 text-amber-700",
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[color] ?? colors.gray}`}>{text}</span>;
}

export default function AdminDashboardPage() {
  const [tab,     setTab]     = useState<AdminTab>("overview");
  const [token,   setToken]   = useState("");
  const [loading, setLoading] = useState(true);
  const [data,    setData]    = useState<any>(null);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const t = localStorage.getItem("token") || "";
    const r = localStorage.getItem("role") || "";
    if (!t) { window.location.href = "/login"; return; }
    if (r !== "ADMIN") { window.location.href = "/dashboard"; return; }
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchSection(tab);
  }, [token, tab]);

  async function fetchSection(section: AdminTab) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin?section=${section}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setError("Failed to load data."); return; }
      const json = await res.json();
      setData(json);
    } catch { setError("Network error."); }
    finally   { setLoading(false); }
  }

  const tabs: { key: AdminTab; label: string; icon: string }[] = [
    { key: "overview",   label: "Overview",   icon: "📊" },
    { key: "users",      label: "Users",      icon: "👥" },
    { key: "properties", label: "Properties", icon: "🏠" },
    { key: "agreements", label: "Agreements", icon: "📄" },
    { key: "payments",   label: "Payments",   icon: "💳" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Platform monitoring and management</p>
        </div>
        <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">ADMIN</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-gray-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 transition ${
              tab === t.key ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500 hover:text-gray-700"
            }`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === "overview" && data && data.users && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Total Users"      value={data.users.total}       color="text-indigo-600" />
                <StatCard label="Property Owners"  value={data.users.owners}      color="text-blue-600" />
                <StatCard label="Tenants"          value={data.users.tenants}     color="text-green-600" />
                <StatCard label="Total Properties" value={data.properties}        color="text-purple-600" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Total Offers"  value={data.offers}                               color="text-amber-600" />
                <StatCard label="Agreements"    value={data.agreements}                           color="text-teal-600" />
                <StatCard label="Payments Made" value={data.payments.count}                       color="text-green-600" />
                <StatCard label="Total Revenue" value={formatInr(data.payments.totalAmount)}      color="text-green-700" sub="All successful payments" />
              </div>

              {/* Quick nav cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                {[
                  { label: "Manage Users",    icon: "👥", section: "users"      as AdminTab, color: "bg-blue-50 border-blue-100 text-blue-700"   },
                  { label: "View Agreements", icon: "📄", section: "agreements" as AdminTab, color: "bg-teal-50 border-teal-100 text-teal-700"   },
                  { label: "Payment History", icon: "💳", section: "payments"   as AdminTab, color: "bg-green-50 border-green-100 text-green-700" },
                ].map((c) => (
                  <button key={c.label} onClick={() => setTab(c.section)}
                    className={`rounded-xl border p-5 text-left hover:shadow-md transition ${c.color}`}>
                    <span className="text-3xl">{c.icon}</span>
                    <p className="font-semibold mt-2">{c.label} →</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === "users" && Array.isArray(data) && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{data.length} registered users</p>
              {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <span className="text-5xl mb-3">👥</span>
                  <p className="text-sm font-medium">No users registered yet.</p>
                </div>
              ) : data.map((u: any) => (
                <div key={u.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                        {u.walletAddress && (
                          <p className="text-xs font-mono text-indigo-500 mt-0.5">
                            {u.walletAddress.slice(0, 10)}...{u.walletAddress.slice(-8)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge text={u.role} color={u.role === "OWNER" ? "indigo" : u.role === "TENANT" ? "green" : "red"} />
                      <p className="text-xs text-gray-400">
                        Joined {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  {u.role !== "ADMIN" && (
                    <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500">
                      {u.role === "OWNER"  && <span>🏠 {u._count?.properties ?? 0} properties</span>}
                      <span>📋 {u._count?.offers ?? 0} offers</span>
                      {u.role === "OWNER"  && <span>📄 {u._count?.agreementsAsOwner ?? 0} agreements (owner)</span>}
                      {u.role === "TENANT" && <span>📄 {u._count?.agreementsAsTenant ?? 0} agreements (tenant)</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── PROPERTIES ── */}
          {tab === "properties" && Array.isArray(data) && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{data.length} properties listed</p>
              {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <span className="text-5xl mb-3">🏠</span>
                  <p className="text-sm font-medium">No properties listed for now.</p>
                </div>
              ) : data.map((p: any) => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-4">
                      {p.imageCIDs?.length > 0 ? (
                        <img src={`${GATEWAY}/${p.imageCIDs[0]}`} alt={p.title}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🏠</div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{p.title}</p>
                        <p className="text-sm text-gray-500">{p.location}</p>
                        <p className="text-sm text-indigo-600 font-medium">{formatInr(p.price)} / month</p>
                        <p className="text-xs text-gray-400 mt-0.5">Owner: {p.owner?.name} ({p.owner?.email})</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge text={p.isAvailable ? "AVAILABLE" : "RENTED"} color={p.isAvailable ? "green" : "gray"} />
                      <p className="text-xs text-gray-400">{p._count?.offers ?? 0} offers · {p._count?.agreements ?? 0} agreements</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── AGREEMENTS ── */}
          {tab === "agreements" && Array.isArray(data) && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{data.length} agreements total</p>
              {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <span className="text-5xl mb-3">📄</span>
                  <p className="text-sm font-medium">No agreements created yet.</p>
                </div>
              ) : data.map((a: any) => {
                const statusColor: Record<string, string> = {
                  ACTIVE: "green", TERMINATED: "red", EXPIRED: "gray", PENDING: "amber",
                };
                return (
                  <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="font-semibold text-gray-900">{a.property?.title}</p>
                        <p className="text-xs text-gray-500">{a.property?.location}</p>
                        <p className="text-sm text-indigo-600 font-medium mt-1">{formatInr(a.monthlyRent)} / month</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                          <span>Owner: {a.owner?.name}</span>
                          <span>Tenant: {a.tenant?.name}</span>
                          <span>{new Date(a.startDate).toLocaleDateString("en-IN")} → {new Date(a.endDate).toLocaleDateString("en-IN")}</span>
                        </div>
                        <div className="flex gap-3 mt-2">
                          {a.txHash && (
                            <a href={`https://sepolia.etherscan.io/tx/${a.txHash}`} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-indigo-500 hover:underline">🔗 Etherscan</a>
                          )}
                          {a.ipfsCID && (
                            <a href={`${GATEWAY}/${a.ipfsCID}`} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-indigo-500 hover:underline">📄 IPFS</a>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge text={a.status} color={statusColor[a.status] ?? "gray"} />
                        <p className="text-xs text-gray-400">{a.payments?.length ?? 0} payments</p>
                        {a.onChainId && <p className="text-xs font-mono text-gray-400">Chain ID: {a.onChainId}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PAYMENTS ── */}
          {tab === "payments" && Array.isArray(data) && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Transactions"   value={data.length}                                                                                       color="text-indigo-600" />
                <StatCard label="Total Platform Revenue" value={formatInr(data.filter((p: any) => p.status === "SUCCESS").reduce((s: number, p: any) => s + p.amount, 0))} color="text-green-700" />
                <StatCard label="Successful Payments"  value={data.filter((p: any) => p.status === "SUCCESS").length}                                            color="text-green-600" />
              </div>

              <p className="text-sm text-gray-500">{data.length} payment records</p>

              {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <span className="text-5xl mb-3">💳</span>
                  <p className="text-sm font-medium">No payments recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.map((p: any) => (
                    <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-semibold text-gray-900">{p.agreement?.property?.title ?? "Property"}</p>
                          <p className="text-sm text-indigo-600 font-medium">{formatInr(p.amount)}</p>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                            <span>From: {p.tenant?.name}</span>
                            <span>To: {p.owner?.name}</span>
                            <span>Month: {p.month}</span>
                          </div>
                          <p className="text-xs font-mono text-gray-400 mt-1">TXN: {p.transactionId}</p>
                          {p.upiId  && <p className="text-xs text-gray-400">UPI: {p.upiId}</p>}
                          {p.paidAt && (
                            <p className="text-xs text-gray-400">
                              Paid: {new Date(p.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          )}
                        </div>
                        <Badge text={p.status} color={p.status === "SUCCESS" ? "green" : p.status === "FAILED" ? "red" : "amber"} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
