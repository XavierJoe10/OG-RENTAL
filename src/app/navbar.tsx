"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Me = {
  name: string;
  role: "TENANT" | "OWNER";
};

export default function Navbar() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  useEffect(() => {
    setName(localStorage.getItem("name"));
    setRole(localStorage.getItem("role"));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.name && data?.role) {
          setMe({ name: data.name, role: data.role });
        }
      })
      .catch(() => {});
  }, []);

  function logout() {
    localStorage.clear();
    setName(null);
    setRole(null);
    router.push("/");
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
      <a href="/" className="text-xl font-bold text-indigo-600 tracking-tight">
        🏠 RentChain
      </a>

      <div className="flex items-center gap-6 text-sm font-medium">
        <a href="/browse" className="text-gray-600 hover:text-indigo-600 transition">Browse</a>

        {me ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              👤 {me.name}
              <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {me.role}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-medium">Sign In</a>
            <a
              href="/register"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Register
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}