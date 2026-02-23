"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setName(localStorage.getItem("name"));
    setRole(localStorage.getItem("role"));
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

        {name ? (
          <>
            <a href="/dashboard" className="text-gray-600 hover:text-indigo-600 transition">Dashboard</a>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">
                👤 {name}
                <span className="ml-1 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                  {role}
                </span>
              </span>
              <button
                onClick={logout}
                className="text-red-500 hover:text-red-600 transition text-sm"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <a href="/login" className="text-gray-600 hover:text-indigo-600 transition">
              Sign In
            </a>
            <a href="/register" className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition">
              Register
            </a>
          </>
        )}
      </div>
    </nav>
  );
}