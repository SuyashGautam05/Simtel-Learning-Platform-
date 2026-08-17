import { useEffect, useState } from "react";
import { GraduationCap, CheckCircle2, Package, FileBadge, TrendingUp, Clock, KeyRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { fetchCollegeStats, fetchCollegeRecentActivity } from "../../api/collegeAdmin.js";
import StatCard from "../../components/ui/StatCard.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";

const STAT_DEFS = [
  { key: "totalStudents", label: "Total Students", icon: GraduationCap },
  { key: "activeStudents", label: "Active Students", icon: CheckCircle2, accent: true },
  { key: "assignedModules", label: "Assigned Modules", icon: Package },
  { key: "activeLicenses", label: "Active Licenses", icon: FileBadge },
];

export default function CollegeAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.collegeId) return;
    Promise.all([fetchCollegeStats(user.collegeId), fetchCollegeRecentActivity(user.collegeId)])
      .then(([s, a]) => {
        setStats(s);
        setActivity(a);
      })
      .finally(() => setLoading(false));
  }, [user?.collegeId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">College Dashboard</h1>
        <p className="mt-1 text-sm text-navy-400">Your college's students, modules, and licenses.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-28 animate-pulse bg-navy-50/60" />
            ))
          : STAT_DEFS.map(({ key, label, icon, accent }, i) => (
              <StatCard key={key} icon={icon} label={label} value={stats?.[key] ?? 0} accent={accent} delay={i * 40} />
            ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50 text-navy">
            <TrendingUp size={16} />
          </div>
          <h2 className="font-bold text-navy-900">Average Progress</h2>
        </div>
        <p className="mt-2 text-sm text-navy-400">
          {stats?.averageProgress == null
            ? "Not yet tracked — lesson-level completion data isn't available yet."
            : `${stats.averageProgress}%`}
        </p>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50 text-navy">
            <Clock size={16} />
          </div>
          <h2 className="font-bold text-navy-900">Recent Activity</h2>
        </div>

        {loading ? (
          <div className="card h-40 animate-pulse bg-navy-50/60" />
        ) : activity.length === 0 ? (
          <EmptyState icon={Clock} message="No student activity yet." />
        ) : (
          <div className="card divide-y divide-navy-50">
            {activity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-700">
                  <KeyRound size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy-800">
                    <span className="font-semibold">{a.student.name}</span> unlocked{" "}
                    <span className="font-semibold">{a.product.name}</span>
                  </p>
                  <p className="text-xs text-navy-400">
                    {a.activatedAt ? new Date(a.activatedAt).toLocaleString() : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}