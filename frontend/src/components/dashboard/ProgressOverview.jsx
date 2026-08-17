import { BarChart3, BookOpen, Lock } from "lucide-react";
import StatCard from "../ui/StatCard.jsx";

/**
 * Module-unlock counts are real (derived from /api/products). Per-lesson
 * completion percentages aren't tracked by the backend yet — no Progress
 * model exists — so this section reports what's actually knowable today
 * rather than inventing numbers. Wire in real completion data here once
 * a progress-tracking API exists.
 */
export default function ProgressOverview({ authorizedCount, totalCount, lockedCount }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard icon={BookOpen} label="Modules Unlocked" value={authorizedCount} />
      <StatCard icon={Lock} label="Modules Locked" value={lockedCount} delay={40} />
      <StatCard
        icon={BarChart3}
        label="Catalog Coverage"
        value={totalCount ? `${Math.round((authorizedCount / totalCount) * 100)}%` : "—"}
        accent
        delay={80}
      />
    </div>
  );
}