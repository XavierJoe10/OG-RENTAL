import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./navbar";

export const metadata: Metadata = {
  title: "RentChain – Decentralized Property Rental",
  description: "Peer-to-peer rentals powered by blockchain and IPFS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}