import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useProducts } from "../hooks/useProducts.js";
import ModuleGrid from "../components/modules/ModuleGrid.jsx";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unlocked", label: "Unlocked" },
  { key: "locked", label: "Locked" },
];

export default function Modules() {
  const { products, loading, refetch } = useProducts();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = products;
    if (filter === "unlocked") list = list.filter((p) => p.unlocked);
    if (filter === "locked") list = list.filter((p) => !p.unlocked);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }
    return list;
  }, [products, filter, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Modules</h1>
          <p className="mt-1 text-sm text-navy-400">
            Every module in the Simtel catalog — unlocked and locked shown together.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules..."
            className="input-field pl-9"
          />
        </div>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.key ? "bg-navy text-white" : "bg-navy-50 text-navy-500 hover:bg-navy-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-44 animate-pulse bg-navy-50/60" />
          ))}
        </div>
      ) : (
        <ModuleGrid
          products={filtered}
          onActivated={refetch}
          emptyMessage="No modules match your search."
        />
      )}
    </div>
  );
}