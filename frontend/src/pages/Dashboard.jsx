import { BookOpen, Trophy, Clock, TrendingUp } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const stats = [
  { label: "Modules Unlocked", value: "—", icon: BookOpen },
  { label: "Avg. Progress", value: "—", icon: TrendingUp },
  { label: "Hours Learned", value: "—", icon: Clock },
  { label: "Quizzes Passed", value: "—", icon: Trophy },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Learning Dashboard</h1>
        <p className="mt-1 text-sm text-navy-400">
          Here's an overview of your progress, {user?.name?.split(" ")[0]}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }, i) => (
          <div
            key={label}
            className="card animate-fade-in p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy">
                <Icon size={18} />
              </div>
              <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-semibold text-gold-700">
                LIVE
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold text-navy-900">{value}</p>
            <p className="text-xs font-medium text-navy-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-navy-900">Getting started</h2>
        <p className="mt-1 text-sm text-navy-400">
          This dashboard is the foundation shell — module cards, progress charts, and
          recommended next lessons will render here as those features are built out.
        </p>
      </div>
    </div>
  );
}
