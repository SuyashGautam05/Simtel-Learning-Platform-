import { Clock, KeyRound } from "lucide-react";
import SectionCard from "../ui/SectionCard.jsx";
import EmptyState from "../ui/EmptyState.jsx";

/**
 * Built from the real activation timestamps already on each authorized
 * product (activatedAt from /api/my-products) — genuine recent activity,
 * not a fabricated feed. Lesson/quiz-level activity will extend this list
 * once that tracking exists on the backend.
 */
export default function RecentActivity({ products, loading }) {
  const recent = [...products]
    .filter((p) => p.activatedAt)
    .sort((a, b) => new Date(b.activatedAt) - new Date(a.activatedAt))
    .slice(0, 5);

  return (
    <SectionCard title="Recent Activity" icon={Clock}>
      {loading ? (
        <div className="card h-40 animate-pulse bg-navy-50/60" />
      ) : recent.length === 0 ? (
        <EmptyState icon={Clock} message="Your recent activity will show up here." />
      ) : (
        <div className="card divide-y divide-navy-50">
          {recent.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-700">
                <KeyRound size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-navy-800">
                  Unlocked <span className="font-semibold">{p.name}</span>
                </p>
                <p className="text-xs text-navy-400">{new Date(p.activatedAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}