"use client";

import { useEffect, useState } from "react";
import { formatInr } from "@/lib/currency";
import { ethers } from "ethers";
import UpiPaymentModal from "@/components/UpiPaymentModal";

const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

type Tab = "offers" | "agreements" | "payments" | "listings";

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
function isValidYmd(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split("-").map(Number);
  const p = new Date(y, m - 1, d);
  return p.getFullYear() === y && p.getMonth() === m - 1 && p.getDate() === d;
}
function addDays(date: Date, days: number): Date {
  const next = new Date(date); next.setDate(next.getDate() + days); return next;
}
function getTodayYmd(): string {
  const t = new Date(); t.setHours(0, 0, 0, 0); return formatYmd(t);
}
function getCurrentMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(ym: string): string {
  return new Date(ym + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
async function parseJsonSafely(res: Response): Promise<any | null> {
  const ct = res.headers.get("content-type") || "";
  const body = await res.text();
  if (!body.trim() || !ct.includes("application/json")) return null;
  try { return JSON.parse(body); } catch { return null; }
}

function CalendarDatePicker({ label, value, onChange, minDate }: { label: string; value: string; onChange: (v: string) => void; minDate?: string }) {
  const initial = value ? parseYmd(value) : new Date();
  const [viewDate, setViewDate] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const year = viewDate.getFullYear(); const month = viewDate.getMonth();
  const monthLbl = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return (
    <div className="bg-white border border-blue-100 rounded-lg p-3">
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="flex items-center justify-between mb-2 bg-blue-50 rounded-md px-2 py-1">
        <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="px-2 py-1 text-sm text-blue-700 hover:bg-blue-100 rounded">{"<"}</button>
        <span className="text-sm font-semibold text-blue-900">{monthLbl}</span>
        <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="px-2 py-1 text-sm text-blue-700 hover:bg-blue-100 rounded">{">"}</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-blue-900 mb-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((w) => <div key={w} className="text-center py-1 font-medium">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="h-8" />;
          const ymd = formatYmd(new Date(year, month, day));
          const isSel = value === ymd;const isDis = Boolean(minDate) && ymd < (minDate ?? "");
          return <button key={ymd} type="button" disabled={isDis} onClick={() => onChange(ymd)}
            className={`h-8 rounded text-sm transition ${isSel ? "bg-blue-200 text-blue-900" : isDis ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-blue-50"}`}>{day}</button>;
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [tab, setTab]               = useState<Tab>("offers");
  const [offers, setOffers]         = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [payments, setPayments]     = useState<any[]>([]);
  const [listings, setListings]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [actionMsg, setActionMsg]   = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [role,  setRole]  = useState("");
  const [walletAddress,    setWalletAddress]    = useState<string | null>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [walletMsg,        setWalletMsg]        = useState("");
  const [dismissBanner,    setDismissBanner]    = useState(false);
  const [selectedOfferId,    setSelectedOfferId]    = useState<string | null>(null);
  const [agreementStartDate, setAgreementStartDate] = useState("");
  const [agreementEndDate,   setAgreementEndDate]   = useState("");
  const [agreementDateError, setAgreementDateError] = useState("");
  const [creatingAgreement,  setCreatingAgreement]  = useState(false);
  const [payModal, setPayModal] = useState<{ agreementId: string; amount: number; month: string; propertyTitle: string } | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const toRentInr = (v: any) => typeof v?.rentInr === "number" ? v.rentInr : typeof v?.price === "number" ? v.price : typeof v?.monthlyRent === "number" ? v.monthlyRent : 0;

  useEffect(() => {
    async function load() {
      const savedToken = localStorage.getItem("token") || "";
      const savedRole  = localStorage.getItem("role")  || "";
      if (!savedToken) { window.location.href = "/login"; return; }
      if (savedRole === "ADMIN") { window.location.href = "/dashboard/admin"; return; }
      setToken(savedToken); setRole(savedRole);
      const H = { "Content-Type": "application/json", Authorization: `Bearer ${savedToken}` };
      setLoading(true);
      const [or, ar, pr] = await Promise.all([
        fetch("/api/offers",     { headers: H }),
        fetch("/api/agreements", { headers: H }),
        fetch("/api/payments",   { headers: H }),
      ]);
      const od = await or.json(); const ad = await ar.json(); const pd = await pr.json();
      setOffers(Array.isArray(od) ? od : []);
      setAgreements(Array.isArray(ad) ? ad : []);
      setPayments(Array.isArray(pd) ? pd : []);
      if (savedRole === "OWNER" || savedRole === "TENANT") {
        const lr = await fetch("/api/properties", { headers: H });
        const ld = await lr.json();
        setListings(ld.properties || []);
      }
      try {
        const mr = await fetch("/api/auth/me", { headers: H });
        if (mr.ok) { const me = await mr.json(); setWalletAddress(me.walletAddress || null); }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  async function refreshPayments() {
    const res = await fetch("/api/payments", { headers: { Authorization: `Bearer ${token}` } });
    const d   = await res.json();
    setPayments(Array.isArray(d) ? d : []);
  }

  async function handleConnectWallet() {
    setConnectingWallet(true); setWalletMsg("");
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) { setWalletMsg("❌ MetaMask not detected."); return; }
      const provider = new ethers.BrowserProvider(ethereum);
      await provider.send("eth_requestAccounts", []);
      const address = await (await provider.getSigner()).getAddress();
      const res = await fetch("/api/auth/wallet", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ walletAddress: address }) });
      const data = await res.json();
      if (!res.ok) { setWalletMsg(`❌ ${data.error || "Failed to save wallet."}`); return; }
      setWalletAddress(address.toLowerCase());
      setWalletMsg("✅ Wallet connected!"); setDismissBanner(true);
    } catch (err: any) { setWalletMsg(`❌ ${err?.message || "Failed."}`); }
    finally { setConnectingWallet(false); }
  }

  async function handleOfferAction(offerId: string, action: "accept" | "reject" | "withdraw") {
    const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    const res = await fetch(`/api/offers/${offerId}`, { method: "PATCH", headers: H, body: JSON.stringify({ action }) });
    const data = await parseJsonSafely(res);
    setActionMsg(res.ok ? `SUCCESS: Offer ${action}ed` : `ERROR: ${data?.error || `Failed (${res.status})`}`);
    const r = await fetch("/api/offers", { headers: H }); const d = await r.json();
    setOffers(Array.isArray(d) ? d : []);
  }

  async function handleDownloadPdf(agreementId: string) {
    setDownloadingId(agreementId);
    try {
      const res = await fetch(`/api/agreements/${agreementId}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setActionMsg("ERROR: Failed to generate PDF."); return; }
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `rentchain-agreement-${agreementId.slice(0, 8)}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { setActionMsg("ERROR: Network error."); } finally { setDownloadingId(null); }
  }

  async function finalizeAgreement() {
    if (!selectedOfferId || !agreementStartDate || !agreementEndDate) return;
    const todayYmd = getTodayYmd();
    if (!isValidYmd(agreementStartDate) || !isValidYmd(agreementEndDate)) { setAgreementDateError("Invalid dates."); return; }
    if (agreementStartDate < todayYmd) { setAgreementDateError("Start date cannot be in the past."); return; }
    if (agreementEndDate <= agreementStartDate) { setAgreementDateError("End date must be after start."); return; }
    setAgreementDateError(""); setCreatingAgreement(true);
    const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    try {
      const res = await fetch("/api/agreements", { method: "POST", headers: H, body: JSON.stringify({ offerId: selectedOfferId, startDate: agreementStartDate, endDate: agreementEndDate }) });
      const data = await parseJsonSafely(res);
      setActionMsg(res.ok ? (data?.onChainId ? `SUCCESS: Agreement created. On-chain ID: ${data.onChainId}` : "SUCCESS: Agreement created.") : `ERROR: ${data?.error || `Failed (${res.status})`}`);
      if (res.ok) { setSelectedOfferId(null); setAgreementStartDate(""); setAgreementEndDate(""); }
      const r = await fetch("/api/agreements", { headers: H }); const d = await r.json();
      setAgreements(Array.isArray(d) ? d : []);
    } finally { setCreatingAgreement(false); }
  }

  const todayYmd   = getTodayYmd();
  const endMinDate = agreementStartDate ? formatYmd(addDays(parseYmd(agreementStartDate), 1)) : formatYmd(addDays(parseYmd(todayYmd), 1));
  const isPaidThisMonth = (agreementId: string) => payments.some((p) => p.agreementId === agreementId && p.month === getCurrentMonth() && p.status === "SUCCESS");

  const statusBadge = (s: string) => {
    const c: Record<string, string> = { PENDING: "bg-yellow-100 text-yellow-700", ACCEPTED: "bg-green-100 text-green-700", REJECTED: "bg-red-100 text-red-600", WITHDRAWN: "bg-gray-100 text-gray-500", ACTIVE: "bg-blue-100 text-blue-700", TERMINATED: "bg-red-100 text-red-600", EXPIRED: "bg-gray-100 text-gray-500", SUCCESS: "bg-green-100 text-green-700", FAILED: "bg-red-100 text-red-600" };
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c[s] || "bg-gray-100 text-gray-500"}`}>{s}</span>;
  };

  if (loading) return <p className="text-gray-500 p-8">Loading dashboard...</p>;

  const tabs: Tab[] = ["offers", "agreements", "payments", ...((role === "OWNER" || role === "TENANT") ? ["listings" as Tab] : [])];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {role === "OWNER" && !walletAddress && !dismissBanner && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🦊</span>
              <div>
                <p className="font-semibold text-amber-900 text-sm">Wallet Not Connected</p>
                <p className="text-amber-700 text-xs mt-1">Connect your MetaMask wallet to finalize agreements on the blockchain.</p>
                {walletMsg && <p className={`text-xs mt-2 font-medium ${walletMsg.startsWith("✅") ? "text-green-700" : "text-red-600"}`}>{walletMsg}</p>}
              </div>
            </div>
            <button type="button" onClick={() => setDismissBanner(true)} className="text-amber-400 hover:text-amber-600 text-lg">✕</button>
          </div>
          <div className="flex items-center gap-3 mt-4 ml-9">
            <button type="button" onClick={handleConnectWallet} disabled={connectingWallet} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition">
              {connectingWallet ? "⏳ Connecting..." : "🦊 Connect MetaMask Wallet"}
            </button>
            <span className="text-xs text-amber-600">Make sure MetaMask is installed and unlocked</span>
          </div>
        </div>
      )}
      {role === "OWNER" && walletAddress && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 flex items-center gap-3">
          <span className="text-green-600">✅</span>
          <p className="text-xs text-green-700 font-medium">Wallet linked: <span className="font-mono">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</span></p>
          <span className="text-xs text-green-500">• Permanently secured</span>
        </div>
      )}

      
      {/* ── Expiry Alert Banners ── */}
{agreements
  .filter((a) => a.status === "ACTIVE" && !dismissedAlerts.includes(a.id))
  .map((a) => {
    const end   = new Date(a.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff > 7) return null;

    let bg      = "";
    let icon    = "";
    let message = "";

    if (diff < 0) {
      bg = "bg-gray-100 border-gray-300 text-gray-700";
      icon = "⚫";
      message = `Agreement for "${a.property?.title}" has expired.`;
    } else if (diff === 0) {
      bg = "bg-red-100 border-red-400 text-red-800";
      icon = "🔴";
      message = `Agreement for "${a.property?.title}" expires TODAY!`;
    } else if (diff === 1) {
      bg = "bg-orange-100 border-orange-400 text-orange-800";
      icon = "🟠";
      message = `Agreement for "${a.property?.title}" expires TOMORROW.`;
    } else if (diff === 2) {
      bg = "bg-orange-50 border-orange-300 text-orange-700";
      icon = "🟠";
      message = `Agreement for "${a.property?.title}" expires in 2 days.`;
    } else {
      bg = "bg-yellow-50 border-yellow-300 text-yellow-700";
      icon = "🟡";
      message = `Agreement for "${a.property?.title}" expires in ${diff} days (${end.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}).`;
    }

    return (
      <div key={a.id} className={`mb-2 px-4 py-3 rounded-lg border text-sm font-medium flex items-center justify-between gap-2 ${bg}`}>
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span>{message}</span>
        </div>
        <button
          onClick={() => setDismissedAlerts((prev) => [...prev, a.id])}
          className="text-current opacity-50 hover:opacity-100 text-lg leading-none flex-shrink-0"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    );
  })}
  {actionMsg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${actionMsg.startsWith("SUCCESS:") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{actionMsg}</div>
      )}

      {selectedOfferId && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Select Agreement Dates</h2>
              <button type="button" onClick={() => { if (!creatingAgreement) { setSelectedOfferId(null); setAgreementStartDate(""); setAgreementEndDate(""); setAgreementDateError(""); } }} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CalendarDatePicker label="Start Date" value={agreementStartDate} onChange={(v) => { if (!isValidYmd(v)) { setAgreementDateError("Invalid start date."); return; } if (v < todayYmd) { setAgreementDateError("Cannot be in the past."); return; } setAgreementDateError(""); setAgreementStartDate(v); if (agreementEndDate && agreementEndDate <= v) { setAgreementEndDate(""); } }} minDate={todayYmd} />
              <CalendarDatePicker label="End Date"   value={agreementEndDate}   onChange={(v) => { if (!isValidYmd(v)) { setAgreementDateError("Invalid end date."); return; } if (!agreementStartDate) { setAgreementDateError("Select start first."); return; } if (v <= agreementStartDate) { setAgreementDateError("Must be after start."); return; } setAgreementDateError(""); setAgreementEndDate(v); }} minDate={endMinDate} />
            </div>
            <p className="text-xs text-gray-500 mt-3">Selected: {agreementStartDate || "YYYY-MM-DD"} → {agreementEndDate || "YYYY-MM-DD"}</p>
            {agreementDateError && <p className="text-xs text-red-600 mt-1">{agreementDateError}</p>}
            <div className="flex items-center gap-3 mt-4">
              <button type="button" onClick={finalizeAgreement} disabled={!agreementStartDate || !agreementEndDate || creatingAgreement} className="bg-blue-200 text-blue-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-300 disabled:opacity-50">
                {creatingAgreement ? "Finalizing..." : "Finalize Agreement"}
              </button>
              <button type="button" onClick={() => { if (!creatingAgreement) { setSelectedOfferId(null); setAgreementStartDate(""); setAgreementEndDate(""); setAgreementDateError(""); } }} className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {payModal && (
        <UpiPaymentModal
          agreementId={payModal.agreementId} amount={payModal.amount}
          month={payModal.month} propertyTitle={payModal.propertyTitle} token={token}
          onClose={() => setPayModal(null)}
          onSuccess={(txnId) => { setActionMsg(`SUCCESS: Payment done! TXN: ${txnId}`); setPayModal(null); refreshPayments(); }}
        />
      )}

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize transition ${tab === t ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>{t}</button>
        ))}
      </div>

      {/* Offers */}
      {tab === "offers" && (
        <div className="space-y-3">
          {offers.length === 0 ? <p className="text-gray-400">No offers yet.</p> : offers.map((o: any) => (
            <div key={o.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{o.property?.title ?? "-"}</p>
                <p className="text-sm text-gray-500">{role === "OWNER" ? `Tenant: ${o.tenant?.name}` : "Your offer"}{" | "}<span className="text-indigo-600 font-medium">{formatInr(toRentInr(o))} / month</span></p>
                {o.message && <p className="text-xs text-gray-400 mt-0.5 italic">"{o.message}"</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {statusBadge(o.status)}
                {o.status === "PENDING" && role === "OWNER" && (<><button onClick={() => handleOfferAction(o.id, "accept")} className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700">Accept</button><button onClick={() => handleOfferAction(o.id, "reject")} className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600">Reject</button></>)}
                {o.status === "ACCEPTED" && role === "OWNER" && !o.agreement && (<button onClick={() => { setSelectedOfferId(o.id); setAgreementStartDate(""); setAgreementEndDate(""); setAgreementDateError(""); }} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700">Finalize</button>)}
                {o.status === "ACCEPTED" && role === "OWNER" && o.agreement && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-lg font-semibold">
                    ✓ Done
                  </span>
                )}
                {o.status === "PENDING" && role === "TENANT" && (<button onClick={() => handleOfferAction(o.id, "withdraw")} className="text-xs bg-gray-400 text-white px-3 py-1 rounded-lg hover:bg-gray-500">Withdraw</button>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agreements */}
      {tab === "agreements" && (
        <div className="space-y-3">
          {agreements.length === 0 ? <p className="text-gray-400">No agreements yet.</p> : agreements.map((a: any) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-semibold">{a.property?.title}</p>
                  <p className="text-sm text-gray-500">{new Date(a.startDate).toLocaleDateString()} to {new Date(a.endDate).toLocaleDateString()}{" | "}<span className="text-indigo-600 font-medium">{formatInr(toRentInr(a))} / month</span></p>
                  {a.onChainId && <p className="text-xs text-gray-400 mt-1">On-chain ID: <span className="font-mono">{a.onChainId}</span></p>}
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {a.ipfsCID && <a href={`${GATEWAY}/${a.ipfsCID}`} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline">📄 View on IPFS</a>}
                    {a.txHash  && <a href={`https://sepolia.etherscan.io/tx/${a.txHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline">🔗 Etherscan</a>}
                    {a.ipfsCID && <button onClick={() => handleDownloadPdf(a.id)} disabled={downloadingId === a.id} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{downloadingId === a.id ? "⏳ Generating..." : "⬇ Download PDF"}</button>}
                    {role === "TENANT" && a.status === "ACTIVE" && (
                      isPaidThisMonth(a.id)
                        ? <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg font-semibold">✅ Paid this month</span>
                        : <button onClick={() => setPayModal({ agreementId: a.id, amount: toRentInr(a), month: getCurrentMonth(), propertyTitle: a.property?.title ?? "Property" })} className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 font-semibold">💳 Pay Rent</button>
                    )}
                  </div>
                </div>
                {statusBadge(a.status)}
              </div>
            </div>
          ))}
        </div>
      )}
{/* Payments */}
{tab === "payments" && (
  <div className="space-y-6">

    {/* Overall summary */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 mb-1">Total Payments</p>
        <p className="text-2xl font-bold text-indigo-600">{payments.length}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 mb-1">{role === "OWNER" ? "Total Received" : "Total Paid"}</p>
        <p className="text-2xl font-bold text-green-600">
          {formatInr(payments.filter((p) => p.status === "SUCCESS").reduce((s: number, p: any) => s + p.amount, 0))}
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 mb-1">This Month</p>
        <p className="text-2xl font-bold text-blue-600">
          {formatInr(payments.filter((p) => p.status === "SUCCESS" && p.month === getCurrentMonth()).reduce((s: number, p: any) => s + p.amount, 0))}
        </p>
      </div>
    </div>

    {payments.length === 0 ? (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">💳</p>
        <p className="text-gray-400 font-medium">No payments yet.</p>
        {role === "TENANT" && <p className="text-xs text-gray-400 mt-1">Go to the Agreements tab to pay rent.</p>}
      </div>
    ) : (
      (() => {
        // Group payments by property
        const groups: Record<string, { title: string; items: any[] }> = {};
        payments.forEach((p: any) => {
          const pid   = p.agreement?.property?.title ?? "Unknown Property";
          if (!groups[pid]) groups[pid] = { title: pid, items: [] };
          groups[pid].items.push(p);
        });

        return Object.entries(groups).map(([title, group]) => {
          const groupTotal = group.items
            .filter((p) => p.status === "SUCCESS")
            .reduce((s, p) => s + p.amount, 0);

          return (
            <div key={title} className="space-y-2">

              {/* Property header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏠</span>
                  <p className="font-semibold text-gray-800">{title}</p>
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                    {group.items.length} payment{group.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-sm font-bold text-green-600">{formatInr(groupTotal)}</p>
              </div>

              {/* Payment cards for this property */}
              {group.items.map((p: any) => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{monthLabel(p.month)}</p>
                      <p className="text-indigo-600 font-bold">{formatInr(p.amount)}</p>
                      {role === "OWNER" && <p className="text-xs text-gray-400 mt-0.5">From: {p.tenant?.name} ({p.tenant?.email})</p>}
                      {role === "TENANT" && <p className="text-xs text-gray-400 mt-0.5">To: {p.owner?.name}</p>}
                      <p className="text-xs font-mono text-gray-400 mt-1">TXN: {p.transactionId}</p>
                      {p.upiId  && <p className="text-xs text-gray-400">UPI: {p.upiId}</p>}
                      {p.paidAt && <p className="text-xs text-gray-400">Paid: {new Date(p.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>}
                    </div>
                    {statusBadge(p.status)}
                  </div>
                </div>
              ))}

            </div>
          );
        });
      })()
    )}
  </div>
)}
      {/* Listings */}
      {tab === "listings" && (role === "OWNER" || role === "TENANT") && (
        <div>
          {role === "OWNER" && <a href="/dashboard/new-property" className="inline-block mb-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Listing</a>}
          <div className="space-y-3">
            {listings.length === 0 ? <p className="text-gray-400">No listings yet.</p> : listings.map((p: any) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex justify-between items-center">
                <div><p className="font-semibold">{p.title}</p><p className="text-sm text-gray-500">{p.location} | {formatInr(toRentInr(p))} / month</p></div>
                <div className="flex gap-2 items-center">{statusBadge(p.isAvailable ? "ACTIVE" : "RENTED")}<a href={`/property/${p.id}`} className="text-xs text-indigo-500 hover:underline">View</a></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
