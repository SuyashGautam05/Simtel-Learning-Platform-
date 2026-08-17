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
  GraduationCap,
  User,
  Shield,
  Package,
  FileBadge,
  ScrollText,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

const studentLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/my-learning", label: "My Learning", icon: GraduationCap },
  { to: "/modules", label: "Modules", icon: Library },
  { to: "/activate", label: "Activate Product", icon: KeyRound },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
];

// College Admin — not built in this step, kept as placeholders for a
// future ADMIN-facing section.
const adminLinks = [{ to: "/admin/students", label: "Students", icon: Users }];

// SUPER_ADMIN gets its own dedicated nav — the platform-owner surface is
// distinct enough from the student experience that merging them into one
// list would bury the 9 admin sections under student links a super admin
// rarely needs day to day.
const superAdminLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/colleges", label: "Colleges", icon: Building2 },
  { to: "/admin/admins", label: "Admins", icon: Shield },
  { to: "/admin/all-users", label: "Users", icon: Users },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/product-keys", label: "Product Keys", icon: KeyRound },
  { to: "/admin/licenses", label: "Licenses", icon: FileBadge },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { to: "/admin/settings", label: "System Settings", icon: Settings },
];

export default function Sidebar() {
  const { user } = useAuth();

  const links =
    user?.role === "SUPER_ADMIN"
      ? superAdminLinks
      : user?.role === "ADMIN"
        ? [...studentLinks, ...adminLinks]
        : studentLinks;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-navy-100 bg-white md:flex">
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-gold shadow-card">
          <Zap size={18} className="fill-gold" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-navy-900">Simtel</p>
          <p className="text-[11px] font-medium leading-tight text-navy-400">
            {user?.role === "SUPER_ADMIN" ? "Platform Owner" : "Learning Platform"}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/admin"}
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
          {user?.role === "SUPER_ADMIN" ? (
            <>
              <p className="font-semibold text-navy">Platform Owner</p>
              <p className="mt-1">Full administrative access.</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-navy">Need a module?</p>
              <p className="mt-1">Contact your college admin for a product key.</p>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}