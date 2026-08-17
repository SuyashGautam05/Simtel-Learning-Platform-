import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import AdminModal from "../admin/AdminModal.jsx";
import StatusBadge from "../admin/StatusBadge.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import { fetchUserAccess } from "../../api/collegeAdmin.js";

/**
 * "View progress" — shown honestly as module authorizations (the real
 * data that exists) rather than fabricated lesson-completion percentages
 * (no Progress model exists yet on the backend).
 */
export default function StudentAccessModal({ open, student, onClose }) {
  const [access, setAccess] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && student) {
      setLoading(true);
      fetchUserAccess(student.id)
        .then(setAccess)
        .finally(() => setLoading(false));
    }
  }, [open, student]);

  return (
    <AdminModal open={open} onClose={onClose} title={`${student?.name}'s Progress`} icon={BarChart3}>
      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-navy-50/60" />
          ))}
        </div>
      ) : access.length === 0 ? (
        <EmptyState icon={BarChart3} message="This student hasn't activated any modules yet." />
      ) : (
        <div className="divide-y divide-navy-50">
          {access.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold text-navy-900">{a.product.name}</p>
                <p className="text-[11px] text-navy-400">
                  {a.activatedAt ? `Activated ${new Date(a.activatedAt).toLocaleDateString()}` : ""}
                </p>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-navy-300">
        Lesson-level completion tracking isn't available yet — this shows module access status only.
      </p>
    </AdminModal>
  );
}