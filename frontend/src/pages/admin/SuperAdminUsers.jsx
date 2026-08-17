import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import DataTable from "../../components/admin/DataTable.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import { fetchUsers } from "../../api/admin.js";

const ROLE_FILTERS = [
  { key: "", label: "All Roles" },
  { key: "USER", label: "Students" },
  { key: "ADMIN", label: "Admins" },
  { key: "SUPER_ADMIN", label: "Super Admins" },
];

export default function SuperAdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchUsers(roleFilter ? { role: roleFilter } : {})
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [roleFilter]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Users" subtitle="Every account on the platform, across every college." />

      <div className="flex gap-2">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setRoleFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              roleFilter === f.key ? "bg-navy text-white" : "bg-navy-50 text-navy-500 hover:bg-navy-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <DataTable
        loading={loading}
        emptyIcon={Users}
        emptyMessage="No users match this filter."
        rows={users}
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role" },
          { key: "collegeId", label: "College ID", render: (r) => r.collegeId || "—" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          {
            key: "lastLoginAt",
            label: "Last Login",
            render: (r) => (r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString() : "Never"),
          },
        ]}
      />
    </div>
  );
}