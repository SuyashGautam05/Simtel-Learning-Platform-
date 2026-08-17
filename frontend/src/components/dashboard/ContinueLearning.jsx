import { useNavigate } from "react-router-dom";
import { PlayCircle, ArrowRight } from "lucide-react";
import SectionCard from "../ui/SectionCard.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import ProgressBar from "../ui/ProgressBar.jsx";

/**
 * Shows the most recently activated authorized modules as "pick up where
 * you left off" cards. Per-lesson progress percentage isn't tracked by
 * the backend yet (no Progress model), so this reflects activation
 * recency honestly rather than fabricating a completion percentage.
 */
export default function ContinueLearning({ products, loading }) {
  const navigate = useNavigate();
  const recent = products.slice(0, 3);

  return (
    <SectionCard title="Continue Learning" subtitle="Pick up where you left off" icon={PlayCircle}>
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-32 animate-pulse bg-navy-50/60" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <EmptyState
          icon={PlayCircle}
          message="Activate a product key to start a module — it'll show up here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {recent.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/modules/${p.id}`)}
              className="card group p-4 text-left transition-transform hover:-translate-y-0.5"
            >
              <p className="text-xs font-semibold text-navy-300">{p.code}</p>
              <p className="mt-1 truncate font-semibold text-navy-900">{p.name}</p>
              <ProgressBar percent={0} className="mt-3" />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-navy-400">
                  {p.activatedAt ? `Unlocked ${new Date(p.activatedAt).toLocaleDateString()}` : "Ready to start"}
                </span>
                <ArrowRight size={14} className="text-navy-300 transition-colors group-hover:text-gold-600" />
              </div>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}