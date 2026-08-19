import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import DataTable from "../../components/admin/DataTable.jsx";
import { fetchAuditLogs } from "../../api/admin.js";

/**
 * Same endpoint as SuperAdminAuditLogs — GET /api/audit-logs — but for an
 * ADMIN caller the backend (audit.service.js#listAuditLogs) automatically
 * scopes results to activity where the actor or target belongs to their
 * own college. This page never passes or needs a collegeId; there's
 * nothing to filter client-side because the server never returns another
 * college's entries in the first place.
 */
export default function CollegeAdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  useEffect(() => {
    setLoading(true);
    fetchAuditLogs({ page, pageSize })
      .then((data) => {
        setLogs(data.logs);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit Logs"
        subtitle="Activity relevant to your college — logins, student changes, and module access."
      />

      <DataTable
        loading={loading}
        emptyIcon={ScrollText}
        emptyMessage="No audit entries yet."
        rows={logs}
        columns={[
          { key: "action", label: "Action", render: (r) => <code className="text-xs">{r.action}</code> },
          { key: "actorEmail", label: "Actor" },
          { key: "targetType", label: "Target" },
          {
            key: "createdAt",
            label: "When",
            render: (r) => new Date(r.createdAt).toLocaleString(),
          },
        ]}
      />

      {!loading && total > pageSize && (
        <div className="flex items-center justify-between text-sm text-navy-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary-outline px-3 py-1.5 text-xs disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary-outline px-3 py-1.5 text-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}