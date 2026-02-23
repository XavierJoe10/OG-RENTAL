"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function connectWallet(): Promise<string> {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      throw new Error("MetaMask not detected. Install it and try again.");
    }

    const provider = new ethers.BrowserProvider(ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    return signer.getAddress();
  }

  async function handleWalletLogin() {
    try {
      setWalletLoading(true);
      setError("");

      const address = await connectWallet();
      setWalletAddress(address);

      const nonceRes = await fetch(`/api/auth/nonce?address=${encodeURIComponent(address)}`);
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok) {
        setError(nonceData.error || "Failed to generate wallet challenge");
        return;
      }

      const ethereum = (window as any).ethereum;
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(nonceData.message);

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || "Wallet verification failed");
        return;
      }

      localStorage.setItem("token", verifyData.token);
      localStorage.setItem("role", verifyData.user.role);
      localStorage.setItem("name", verifyData.user.name);
      localStorage.setItem("userId", verifyData.user.id);

      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Wallet authentication failed");
    } finally {
      setWalletLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // Existing app pattern: JWT stored client-side for authenticated API calls.
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("name", data.user.name);
      localStorage.setItem("userId", data.user.id);

      router.push("/dashboard");
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-gray-500 text-sm mb-6">Sign in to your RentChain account</p>

        <div className="mb-5">
          <button
            type="button"
            onClick={handleWalletLogin}
            disabled={walletLoading}
            className="w-full border border-gray-200 bg-white py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
          >
            {walletLoading ? "Connecting wallet..." : "Connect Wallet with MetaMask"}
          </button>
          {walletAddress && (
            <p className="text-xs text-gray-500 mt-2 break-all">Connected: {walletAddress}</p>
          )}
        </div>

        <div className="relative my-5">
          <div className="h-px bg-gray-200" />
          <span className="absolute inset-0 -top-2 text-center text-xs text-gray-400 bg-white w-12 mx-auto">or</span>
        </div>

        <form onSubmit={handleLogin} autoComplete="off" className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <input
              type="email"
              name="login_email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
            <input
              type="password"
              name="login_password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              autoComplete="new-password"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || submitting}
            className="bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Don't have an account?{" "}
          <a href="/register" className="text-indigo-600 font-medium hover:underline">
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}