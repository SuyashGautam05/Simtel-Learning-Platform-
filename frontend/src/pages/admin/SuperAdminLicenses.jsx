import { useEffect, useState } from "react";
import { FileBadge } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import DataTable from "../../components/admin/DataTable.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import ProgressBar from "../../components/ui/ProgressBar.jsx";
import { fetchLicenses } from "../../api/admin.js";

export default function SuperAdminLicenses() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLicenses()
      .then(setLicenses)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Licenses"
        subtitle="College-level bulk seat licenses and their usage."
      />

      <DataTable
        loading={loading}
        emptyIcon={FileBadge}
        emptyMessage="No college licenses provisioned yet."
        rows={licenses}
        columns={[
          { key: "college", label: "College", render: (r) => r.college.name },
          { key: "product", label: "Module", render: (r) => `${r.product.name} (${r.product.code})` },
          {
            key: "usage",
            label: "Seats used",
            render: (r) => (
              <div className="min-w-[140px]">
                <div className="mb-1 flex justify-between text-xs text-navy-500">
                  <span>
                    {r.usedSeats} / {r.totalSeats}
                  </span>
                  <span>{r.usagePercent}%</span>
                </div>
                <ProgressBar percent={r.usagePercent} />
              </div>
            ),
          },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          {
            key: "expiresAt",
            label: "Expires",
            render: (r) => (r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "Never"),
          },
        ]}
      />
    </div>
  );
}