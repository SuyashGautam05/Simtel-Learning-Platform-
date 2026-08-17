import { useEffect, useState } from "react";
import { Shield, Plus } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import DataTable from "../../components/admin/DataTable.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import ConfirmDialog from "../../components/admin/ConfirmDialog.jsx";
import CreateAdminModal from "../../components/admin/CreateAdminModal.jsx";
import { fetchUsers, deactivateUser, activateUser } from "../../api/admin.js";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.js";

export default function SuperAdminAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { confirm, dialogProps } = useConfirmDialog();

  const load = () => {
    setLoading(true);
    fetchUsers({ role: "ADMIN" })
      .then(setAdmins)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleToggleStatus = (admin) => {
    const deactivating = admin.status === "ACTIVE";
    confirm({
      title: deactivating ? "Deactivate this admin?" : "Reactivate this admin?",
      message: deactivating
        ? `${admin.name} will lose access to their college's admin functions immediately.`
        : `${admin.name} will regain access to their college's admin functions.`,
      confirmLabel: deactivating ? "Deactivate" : "Reactivate",
      danger: deactivating,
      onConfirm: async () => {
        if (deactivating) await deactivateUser(admin.id);
        else await activateUser(admin.id);
        load();
      },
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admins"
        subtitle="College administrators across the platform."
        action={
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={16} /> Create Admin
          </button>
        }
      />

      <DataTable
        loading={loading}
        emptyIcon={Shield}
        emptyMessage="No college admins yet."
        rows={admins}
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "collegeId", label: "College ID", render: (r) => r.collegeId || "—" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          {
            key: "actions",
            label: "",
            render: (r) => (
              <button
                onClick={() => handleToggleStatus(r)}
                className={`text-xs font-semibold hover:underline ${
                  r.status === "ACTIVE" ? "text-red-600" : "text-navy"
                }`}
              >
                {r.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
              </button>
            ),
          },
        ]}
      />

      <CreateAdminModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={load} />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}