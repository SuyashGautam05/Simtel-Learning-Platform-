import { useEffect, useState } from "react";
import { Package, FileBadge } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import DataTable from "../../components/admin/DataTable.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import ProgressBar from "../../components/ui/ProgressBar.jsx";
import { fetchProducts } from "../../api/products.js";
import { fetchLicenses } from "../../api/admin.js";

/**
 * Both calls are role-scoped by the backend: GET /products returns the
 * ACTIVE catalog for an ADMIN caller, and GET /licenses is hard-scoped to
 * the requester's own college (see license.service.js) — this page never
 * passes or filters by collegeId itself.
 */
export default function CollegeAdminModules() {
  const [products, setProducts] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingLicenses, setLoadingLicenses] = useState(true);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .finally(() => setLoadingProducts(false));
    fetchLicenses()
      .then(setLicenses)
      .finally(() => setLoadingLicenses(false));
  }, []);

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Modules" subtitle="Modules available to your college and their license usage." />

      <div>
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50 text-navy">
            <Package size={16} />
          </div>
          <h2 className="font-bold text-navy-900">Available Modules</h2>
        </div>
        <DataTable
          loading={loadingProducts}
          emptyIcon={Package}
          emptyMessage="No modules available yet."
          rows={products}
          columns={[
            { key: "name", label: "Name" },
            { key: "code", label: "Code" },
            { key: "version", label: "Version" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50 text-navy">
            <FileBadge size={16} />
          </div>
          <h2 className="font-bold text-navy-900">License Usage</h2>
        </div>
        <DataTable
          loading={loadingLicenses}
          emptyIcon={FileBadge}
          emptyMessage="No seat licenses provisioned for your college yet."
          rows={licenses}
          columns={[
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
    </div>
  );
}