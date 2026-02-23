// src/app/page.tsx
export default function HomePage() {
  return (
    <div className="flex flex-col items-center text-center py-20 gap-6">
      <h1 className="text-5xl font-extrabold text-indigo-600 leading-tight">
        Rent Properties.<br />No Middlemen.
      </h1>
      <p className="text-lg text-gray-600 max-w-xl">
        RentChain connects property owners and tenants directly.
        All agreements are secured on Ethereum and stored permanently on IPFS.
      </p>
      <div className="flex gap-4 mt-4">
        <a
          href="/browse"
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
        >
          Browse Properties
        </a>
        <a
          href="/dashboard"
          className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition"
        >
          My Dashboard
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-4xl text-left">
        {[
          { icon: "🔗", title: "Blockchain Secured", desc: "Rental agreements are stored immutably on Ethereum." },
          { icon: "📁", title: "IPFS Storage", desc: "Media and documents pinned permanently via IPFS + Pinata." },
          { icon: "🤝", title: "Direct Negotiation", desc: "Tenants propose offers; owners accept or counter." },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:bg-sky-50 hover:border-sky-100 hover:shadow-md transition-colors"
          >
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-lg mb-1">{f.title}</h3>
            <p className="text-gray-500 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
