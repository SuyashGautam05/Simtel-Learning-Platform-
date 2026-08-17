import { useEffect, useState } from "react";
import {
  Building2,
  Shield,
  GraduationCap,
  Package,
  KeyRound,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react";
import { fetchPlatformStats } from "../../api/admin.js";
import StatCard from "../../components/ui/StatCard.jsx";

const STAT_DEFS = [
  { key: "totalColleges", label: "Total Colleges", icon: Building2 },
  { key: "totalAdmins", label: "Total Admins", icon: Shield },
  { key: "totalStudents", label: "Total Students", icon: GraduationCap },
  { key: "totalProducts", label: "Total Products", icon: Package },
  { key: "totalProductKeys", label: "Total Product Keys", icon: KeyRound },
  { key: "activeLicenses", label: "Active Licenses", icon: CheckCircle2, accent: true },
  { key: "expiredLicenses", label: "Expired Licenses", icon: XCircle },
  { key: "activeUsers", label: "Active Users", icon: Users },
];

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Platform Dashboard</h1>
        <p className="mt-1 text-sm text-navy-400">Simtel Learning Platform — owner overview.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card h-28 animate-pulse bg-navy-50/60" />
            ))
          : STAT_DEFS.map(({ key, label, icon, accent }, i) => (
              <StatCard
                key={key}
                icon={icon}
                label={label}
                value={stats?.[key] ?? 0}
                accent={accent}
                delay={i * 40}
              />
            ))}
      </div>
    </div>
  );
}