"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

type Me = {
  name:          string;
  email:         string;
  role:          "TENANT" | "OWNER" | "ADMIN";
  walletAddress?: string | null;
  createdAt?:    string;
};

export default function Navbar() {
  const router   = useRouter();
  const pathname = usePathname();

  const [me,          setMe]          = useState<Me | null>(null);
  const [ready,       setReady]       = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMe(null);
      setReady(true);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.name && data?.role) {
          setMe({
            name:          data.name,
            email:         data.email         ?? "",
            role:          data.role,
            walletAddress: data.walletAddress  ?? null,
            createdAt:     data.createdAt      ?? null,
          });
        } else {
          setMe(null);
        }
      })
      .catch(() => setMe(null))
      .finally(() => setReady(true));
  }, [pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAccount(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function logout() {
    localStorage.clear();
    setMe(null);
    router.push("/");
  }

  const roleColor =
    me?.role === "ADMIN"  ? "bg-red-100 text-red-700"     :
    me?.role === "OWNER"  ? "bg-indigo-100 text-indigo-700" :
                            "bg-green-100 text-green-700";

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">

      <a href="/" className="flex items-center">
        <img
          src="/RentChainlogo-removebg-preview (1).png"
          alt="RentChain"
          className="h-12 w-auto object-contain transform scale-150 drop-shadow-sm"
        />
      </a>

      <div className="flex items-center gap-6 text-sm font-medium">

        {pathname !== "/browse" && (
          <a href="/browse" className="text-gray-600 hover:text-indigo-600 transition">
            Browse
          </a>
        )}

        {me && (
          <a href={me.role === "ADMIN" ? "/dashboard/admin" : "/dashboard"} className="text-gray-600 hover:text-indigo-600 transition">
            {me.role === "ADMIN" ? "Admin Dashboard" : "Dashboard"}
          </a>
        )}

        {/* Only render auth section after localStorage has been checked */}
        {ready && (
          me ? (
            <div className="flex items-center gap-3">
              <div className="relative" ref={dropdownRef}>

                {/* Avatar + name button */}
                <button
                  onClick={() => setShowAccount((v) => !v)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition"
                >
                  <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    {me.name.charAt(0).toUpperCase()}
                  </span>
                  <span>{me.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColor}`}>
                    {me.role}
                  </span>
                  <span className="text-gray-400 text-xs">▾</span>
                </button>

                {/* Account dropdown */}
                {showAccount && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xl">
                          {me.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-bold text-base">{me.name}</p>
                          <p className="text-indigo-200 text-xs">{me.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Account details */}
                    <div className="px-5 py-4 space-y-3">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Account</p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Role</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColor}`}>
                          {me.role}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Email</span>
                        <span className="text-xs text-gray-700 font-medium">{me.email}</span>
                      </div>

                      {/* Wallet — only shown for OWNER and TENANT */}
                      {me.role !== "ADMIN" && (
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs text-gray-500 flex-shrink-0">Wallet</span>
                          {me.walletAddress ? (
                            <span className="text-xs font-mono text-indigo-600 break-all text-right">
                              {me.walletAddress.slice(0, 10)}...{me.walletAddress.slice(-8)}
                              <span className="ml-1 text-green-500">✓</span>
                            </span>
                          ) : (
                            <span className="text-xs text-amber-500 font-medium">Not connected</span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Switch Account</span>
                        <button
                          onClick={() => { logout(); router.push("/login"); }}
                          className="text-xs text-indigo-600 hover:underline font-medium"
                        >
                          → Sign in as different user
                        </button>
                      </div>
                    </div>

                    {/* Footer actions */}
                    <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
                      <a href={me.role === "ADMIN" ? "/dashboard/admin" : "/dashboard"} onClick={() => setShowAccount(false)} className="text-xs text-indigo-600 font-semibold hover:underline">
                        My Dashboard →
                      </a>
                      <button
                        onClick={logout}
                        className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium transition"
                      >
                        Logout
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <a href="/login" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition">
                Sign In
              </a>
              <a href="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
                Register
              </a>
            </div>
          )
        )}

      </div>
    </nav>
  );
}
