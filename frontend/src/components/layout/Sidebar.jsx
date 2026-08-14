import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Library,
  BarChart3,
  Users,
  Building2,
  KeyRound,
  Settings,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

const studentLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/modules", label: "Module Library", icon: Library },
  { to: "/progress", label: "My Progress", icon: BarChart3 },
];

const adminLinks = [
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/keys", label: "Product Keys", icon: KeyRound },
];

const superAdminLinks = [
  { to: "/admin/colleges", label: "Colleges", icon: Building2 },
  { to: "/admin/settings", label: "Platform Settings", icon: Settings },
];

export default function Sidebar() {
  const { user } = useAuth();

  const links = [
    ...studentLinks,
    ...(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" ? adminLinks : []),
    ...(user?.role === "SUPER_ADMIN" ? superAdminLinks : []),
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-navy-100 bg-white md:flex">
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-gold shadow-card">
          <Zap size={18} className="fill-gold" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-navy-900">Simtel</p>
          <p className="text-[11px] font-medium leading-tight text-navy-400">Learning Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-navy text-white shadow-card"
                  : "text-navy-700 hover:bg-navy-50 hover:text-navy"
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-navy-100 p-4">
        <div className="rounded-xl bg-navy-50 p-3 text-xs text-navy-500">
          <p className="font-semibold text-navy">Need a module?</p>
          <p className="mt-1">Contact your college admin for a product key.</p>
        </div>
      </div>
    </aside>
  );
}
