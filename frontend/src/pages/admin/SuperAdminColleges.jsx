import { useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import DataTable from "../../components/admin/DataTable.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import ConfirmDialog from "../../components/admin/ConfirmDialog.jsx";
import CreateCollegeModal from "../../components/admin/CreateCollegeModal.jsx";
import { fetchColleges, deactivateCollege } from "../../api/admin.js";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.js";

export default function SuperAdminColleges() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { confirm, dialogProps } = useConfirmDialog();

  const load = () => {
    setLoading(true);
    fetchColleges()
      .then(setColleges)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDeactivate = (college) => {
    confirm({
      title: "Deactivate this college?",
      message: `${college.name} (${college.code}) will be archived. Existing student accounts and licenses are not deleted, but the college becomes inactive.`,
      confirmLabel: "Deactivate",
      danger: true,
      onConfirm: async () => {
        await deactivateCollege(college.id);
        load();
      },
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Colleges"
        subtitle="Institutions provisioned on the platform."
        action={
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={16} /> Create College
          </button>
        }
      />

      <DataTable
        loading={loading}
        emptyIcon={Building2}
        emptyMessage="No colleges yet. Create the first one to get started."
        rows={colleges}
        columns={[
          { key: "name", label: "Name" },
          { key: "code", label: "Code" },
          { key: "email", label: "Email", render: (r) => r.email || "—" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          {
            key: "actions",
            label: "",
            render: (r) => (
              <button
                onClick={() => handleDeactivate(r)}
                disabled={r.status !== "ACTIVE"}
                className="text-xs font-semibold text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-navy-300 disabled:no-underline"
              >
                Deactivate
              </button>
            ),
          },
        ]}
      />

      <CreateCollegeModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={load} />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}