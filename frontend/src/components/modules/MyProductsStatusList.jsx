import { CheckCircle2, Lock } from "lucide-react";

/**
 * The simple status listing from the spec:
 *   PLC          ✓ Active
 *   Electrical   🔒 Not Activated
 *   Embedded     🔒 Not Activated
 * Authorization state (`unlocked`) always comes from the backend
 * (GET /api/products) — this component only renders it.
 */
export default function MyProductsStatusList({ products, loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-navy-50/60" />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return <p className="text-sm text-navy-400">No modules available yet.</p>;
  }

  return (
    <div className="card divide-y divide-navy-50">
      {products.map((p) => (
        <div key={p.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-navy-900">{p.name}</p>
            <p className="text-[11px] font-medium text-navy-300">{p.code}</p>
          </div>
          {p.unlocked ? (
            <span className="flex items-center gap-1.5 rounded-full bg-gold-50 px-2.5 py-1 text-xs font-semibold text-gold-700">
              <CheckCircle2 size={13} /> Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-400">
              <Lock size={13} /> Not Activated
            </span>
          )}
        </div>
      ))}
    </div>
  );
}