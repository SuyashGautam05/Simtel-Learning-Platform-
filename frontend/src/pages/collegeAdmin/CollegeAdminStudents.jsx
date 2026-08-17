import { useEffect, useState } from "react";
import { GraduationCap, Plus } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import DataTable from "../../components/admin/DataTable.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import ConfirmDialog from "../../components/admin/ConfirmDialog.jsx";
import CreateStudentModal from "../../components/collegeAdmin/CreateStudentModal.jsx";
import ResetPasswordModal from "../../components/collegeAdmin/ResetPasswordModal.jsx";
import StudentAccessModal from "../../components/collegeAdmin/StudentAccessModal.jsx";
import { fetchUsers, deactivateUser, activateUser } from "../../api/admin.js";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.js";

/**
 * Every request this page makes (list/create/activate/deactivate/reset/
 * view-access) is automatically scoped to the logged-in admin's own
 * college BY THE BACKEND — see user.service.js. This page never sends a
 * collegeId anywhere; there's no filtering happening here client-side
 * that could be bypassed by editing a request.
 */
export default function CollegeAdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [accessTarget, setAccessTarget] = useState(null);
  const { confirm, dialogProps } = useConfirmDialog();

  const load = () => {
    setLoading(true);
    fetchUsers({ role: "USER" })
      .then(setStudents)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleToggleStatus = (student) => {
    const deactivating = student.status === "ACTIVE";
    confirm({
      title: deactivating ? "Deactivate this student?" : "Reactivate this student?",
      message: deactivating
        ? `${student.name} will immediately lose access to the platform.`
        : `${student.name} will regain access to the platform.`,
      confirmLabel: deactivating ? "Deactivate" : "Reactivate",
      danger: deactivating,
      onConfirm: async () => {
        if (deactivating) await deactivateUser(student.id);
        else await activateUser(student.id);
        load();
      },
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Students"
        subtitle="Students belonging to your college."
        action={
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus size={16} /> Create Student
          </button>
        }
      />

      <DataTable
        loading={loading}
        emptyIcon={GraduationCap}
        emptyMessage="No students yet. Create the first one to get started."
        rows={students}
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          {
            key: "lastLoginAt",
            label: "Last Login",
            render: (r) => (r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString() : "Never"),
          },
          {
            key: "actions",
            label: "",
            render: (r) => (
              <div className="flex gap-3">
                <button onClick={() => setAccessTarget(r)} className="text-xs font-semibold text-navy hover:underline">
                  View Progress
                </button>
                <button onClick={() => setResetTarget(r)} className="text-xs font-semibold text-navy hover:underline">
                  Reset Password
                </button>
                <button
                  onClick={() => handleToggleStatus(r)}
                  className={`text-xs font-semibold hover:underline ${
                    r.status === "ACTIVE" ? "text-red-600" : "text-gold-700"
                  }`}
                >
                  {r.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            ),
          },
        ]}
      />

      <CreateStudentModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <ResetPasswordModal open={!!resetTarget} student={resetTarget} onClose={() => setResetTarget(null)} />
      <StudentAccessModal open={!!accessTarget} student={accessTarget} onClose={() => setAccessTarget(null)} />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}