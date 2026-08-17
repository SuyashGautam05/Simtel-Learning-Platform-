import { useEffect, useState } from "react";
import { Lock, Unlock, Cpu } from "lucide-react";
import apiClient from "../api/axiosClient.js";

export default function ModuleLibrary() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/modules")
      .then(({ data }) => setModules(data.data.modules))
      .catch(() => setModules([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Module Library</h1>
        <p className="mt-1 text-sm text-navy-400">
          Modules unlock automatically once a valid product key is assigned to your account.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-32 animate-pulse bg-navy-50/60" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => (
            <div
              key={m.id}
              className="card animate-fade-in p-5"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy">
                  <Cpu size={18} />
                </div>
                {m.unlocked ? (
                  <span className="flex items-center gap-1 rounded-full bg-gold-50 px-2 py-1 text-[10px] font-semibold text-gold-700">
                    <Unlock size={11} /> UNLOCKED
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-navy-50 px-2 py-1 text-[10px] font-semibold text-navy-400">
                    <Lock size={11} /> LOCKED
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-semibold text-navy-900">{m.name}</h3>
              <p className="mt-1 text-xs text-navy-400">{m.code}</p>
              <button
                disabled={!m.unlocked}
                className="btn-primary mt-4 w-full disabled:bg-navy-100 disabled:text-navy-300"
              >
                {m.unlocked ? "Open Module" : "Locked"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
