// src/components/UpiPaymentModal.tsx
"use client";

import { useState } from "react";
import { formatInr } from "@/lib/currency";

type Step = "form" | "processing" | "success" | "failed";

interface Props {
  agreementId: string;
  amount:      number;
  month:       string;       // "2025-03"
  propertyTitle: string;
  token:       string;
  onClose:     () => void;
  onSuccess:   (transactionId: string) => void;
}

const UPI_APPS = [
  { name: "GPay",     color: "bg-white border-2 border-blue-100",   icon: "🔵", label: "Google Pay"  },
  { name: "PhonePe",  color: "bg-white border-2 border-purple-100", icon: "🟣", label: "PhonePe"     },
  { name: "Paytm",    color: "bg-white border-2 border-blue-100",   icon: "🔷", label: "Paytm"       },
  { name: "BHIM",     color: "bg-white border-2 border-orange-100", icon: "🟠", label: "BHIM UPI"    },
];

export default function UpiPaymentModal({
  agreementId, amount, month, propertyTitle, token, onClose, onSuccess,
}: Props) {
  const [step,    setStep]    = useState<Step>("form");
  const [upiId,   setUpiId]   = useState("");
  const [upiError, setUpiError] = useState("");
  const [txnId,   setTxnId]   = useState("");
  const [errMsg,  setErrMsg]  = useState("");

  const monthLabel = new Date(month + "-01").toLocaleDateString("en-IN", {
    month: "long", year: "numeric",
  });

  function validateUpi(id: string): boolean {
    // Basic UPI ID format: something@something
    return /^[\w.\-]+@[\w]+$/.test(id.trim());
  }

  function handleUpiAppClick(appName: string) {
    setUpiId(`demo_${appName.toLowerCase()}@upi`);
    setUpiError("");
  }

  async function handlePay() {
    if (!upiId.trim()) { setUpiError("Please enter a UPI ID"); return; }
    if (!validateUpi(upiId.trim())) { setUpiError("Invalid UPI ID format (e.g. name@upi)"); return; }
    setUpiError("");
    setStep("processing");

    // Simulate 3s processing
    await new Promise((r) => setTimeout(r, 3000));

    try {
      const res = await fetch("/api/payments", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ agreementId, upiId: upiId.trim(), month }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrMsg(data.error || "Payment failed. Please try again.");
        setStep("failed");
        return;
      }

      setTxnId(data.transactionId);
      setStep("success");
      onSuccess(data.transactionId);
    } catch {
      setErrMsg("Network error. Please try again.");
      setStep("failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-lg">Pay Rent</p>
            <p className="text-indigo-200 text-xs">{propertyTitle} • {monthLabel}</p>
          </div>
          {step !== "processing" && (
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">✕</button>
          )}
        </div>

        {/* ── Amount banner ── */}
        <div className="bg-indigo-50 px-6 py-3 flex items-center justify-between border-b border-indigo-100">
          <span className="text-sm text-indigo-700 font-medium">Amount to Pay</span>
          <span className="text-2xl font-bold text-indigo-700">{formatInr(amount)}</span>
        </div>

        {/* ── FORM step ── */}
        {step === "form" && (
          <div className="px-6 py-5 space-y-5">

            {/* UPI App shortcuts */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Pay using UPI app</p>
              <div className="grid grid-cols-4 gap-2">
                {UPI_APPS.map((app) => (
                  <button
                    key={app.name}
                    type="button"
                    onClick={() => handleUpiAppClick(app.name)}
                    className={`${app.color} rounded-xl p-3 flex flex-col items-center gap-1 hover:shadow-md transition`}
                  >
                    <span className="text-2xl">{app.icon}</span>
                    <span className="text-xs text-gray-600 font-medium">{app.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or enter UPI ID</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* UPI ID input */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">UPI ID</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => { setUpiId(e.target.value); setUpiError(""); }}
                placeholder="yourname@upi"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {upiError && <p className="text-xs text-red-500 mt-1">{upiError}</p>}
              <p className="text-xs text-gray-400 mt-1">e.g. mobilenumber@upi, name@okicici</p>
            </div>

            {/* Demo notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700">
                🧪 <strong>Demo Mode</strong> — No real money will be charged. This is a simulated payment for testing.
              </p>
            </div>

            <button
              type="button"
              onClick={handlePay}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition text-base"
            >
              Pay {formatInr(amount)}
            </button>
          </div>
        )}

        {/* ── PROCESSING step ── */}
        {step === "processing" && (
          <div className="px-6 py-12 flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-lg font-semibold text-gray-700">Processing Payment...</p>
            <p className="text-sm text-gray-400">Please wait, do not close this window</p>
            <div className="text-xs text-gray-400 space-y-1 text-center mt-2">
              <p>Connecting to UPI...</p>
              <p>Verifying transaction...</p>
            </div>
          </div>
        )}

        {/* ── SUCCESS step ── */}
        {step === "success" && (
          <div className="px-6 py-8 flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">✅</span>
            </div>
            <p className="text-xl font-bold text-green-700">Payment Successful!</p>
            <p className="text-sm text-gray-500">Rent for {monthLabel} has been paid</p>

            <div className="w-full bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Paid</span>
                <span className="font-bold text-green-700">{formatInr(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">UPI ID</span>
                <span className="font-mono text-gray-700">{upiId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction ID</span>
                <span className="font-mono text-indigo-600 text-xs">{txnId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="text-gray-700">{new Date().toLocaleDateString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="text-green-600 font-semibold">SUCCESS</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition"
            >
              Done
            </button>
          </div>
        )}

        {/* ── FAILED step ── */}
        {step === "failed" && (
          <div className="px-6 py-8 flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">❌</span>
            </div>
            <p className="text-xl font-bold text-red-600">Payment Failed</p>
            <p className="text-sm text-gray-500 text-center">{errMsg}</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setStep("form")}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
