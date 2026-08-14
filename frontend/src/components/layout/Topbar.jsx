import { LogOut, Bell, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

const roleLabel = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "College Admin",
  USER: "Student",
};

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-navy-100 bg-white/80 px-6 backdrop-blur">
      <div>
        <p className="text-sm text-navy-400">Welcome back,</p>
        <p className="text-base font-semibold text-navy-900">{user?.name}</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-full p-2 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy">
          <Bell size={19} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 animate-pulse-glow rounded-full bg-gold" />
        </button>

        <div className="flex items-center gap-2 rounded-full border border-navy-100 py-1 pl-1 pr-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-50 text-navy">
            <User size={16} />
          </div>
          <span className="text-xs font-semibold text-navy-700">{roleLabel[user?.role]}</span>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-full p-2 text-navy-400 transition-colors hover:bg-red-50 hover:text-red-500"
          title="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
