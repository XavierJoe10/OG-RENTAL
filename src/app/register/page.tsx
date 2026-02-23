"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [role,     setRole]     = useState<"OWNER" | "TENANT">("TENANT");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);

  function getInjectedWalletProvider() {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return null;

    if (Array.isArray(ethereum.providers) && ethereum.providers.length > 0) {
      return ethereum.providers.find((p: any) => p?.isMetaMask) || ethereum.providers[0];
    }

    return ethereum;
  }

  async function connectMetaMask() {
    setError("");

    try {
      setConnectingWallet(true);
      let provider = getInjectedWalletProvider();

      // Some browser-extension setups inject after initial page load.
      if (!provider) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        provider = getInjectedWalletProvider();
      }

      if (!provider?.request) {
        setError("No browser wallet detected. Install/unlock MetaMask or paste address manually.");
        return;
      }

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const wallet = Array.isArray(accounts) ? accounts[0] : "";
      if (!wallet) {
        setError("No wallet account returned by your wallet extension.");
        return;
      }
      setWalletAddress(wallet);
    } catch {
      setError("Unable to connect MetaMask wallet.");
    } finally {
      setConnectingWallet(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res  = await fetch("/api/auth/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, email, password, role, walletAddress }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    localStorage.setItem("token",  data.token);
    localStorage.setItem("role",   data.user.role);
    localStorage.setItem("name",   data.user.name);
    localStorage.setItem("userId", data.user.id);

    router.push("/dashboard");
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1">Create an account</h1>
        <p className="text-gray-500 text-sm mb-6">Join RentChain as an owner or tenant</p>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Wallet Address (optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={connectMetaMask}
                disabled={connectingWallet}
                className="whitespace-nowrap border border-indigo-200 text-indigo-700 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-50 disabled:opacity-50"
              >
                {connectingWallet ? "Connecting..." : "Connect Wallet"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Recommended for tenants to enable on-chain agreements.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">I am a…</label>
            <div className="grid grid-cols-2 gap-3">
              {(["TENANT", "OWNER"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-2.5 rounded-lg border text-sm font-medium transition ${
                    role === r
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-400"
                  }`}
                >
                  {r === "TENANT" ? "🏠 Tenant" : "🏢 Property Owner"}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-indigo-600 font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
