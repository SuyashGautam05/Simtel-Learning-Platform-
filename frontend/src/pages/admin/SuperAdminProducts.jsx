import { useEffect, useState } from "react";
import { Package, Plus, PlayCircle } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import DataTable from "../../components/admin/DataTable.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import ConfirmDialog from "../../components/admin/ConfirmDialog.jsx";
import CreateProductModal from "../../components/admin/CreateProductModal.jsx";
import ConfigureSimulatorModal from "../../components/admin/ConfigureSimulatorModal.jsx";
import { fetchProducts, setProductStatus, archiveProduct } from "../../api/products.js";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.js";

export default function SuperAdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [simulatorTarget, setSimulatorTarget] = useState(null);
  const { confirm, dialogProps } = useConfirmDialog();

  const load = () => {
    setLoading(true);
    fetchProducts({ includeAll: true })
      .then(setProducts)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSetStatus = (product, status) => {
    const isArchive = status === "ARCHIVED";
    confirm({
      title: isArchive ? "Archive this module?" : `Set status to ${status}?`,
      message: isArchive
        ? `${product.name} will be hidden from the catalog. Students who already have access keep it — this only stops new discovery/assignment.`
        : `${product.name}'s status will change to ${status}.`,
      confirmLabel: isArchive ? "Archive" : "Confirm",
      danger: isArchive || status === "INACTIVE",
      onConfirm: async () => {
        if (isArchive) await archiveProduct(product.id);
        else await setProductStatus(product.id, status);
        load();
      },
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Products"
        subtitle="Every module in the Simtel catalog, including drafts and archived ones."
        action={
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={16} /> Create Product
          </button>
        }
      />

      <DataTable
        loading={loading}
        emptyIcon={Package}
        emptyMessage="No modules yet."
        rows={products}
        columns={[
          { key: "name", label: "Name" },
          { key: "code", label: "Code" },
          { key: "version", label: "Version" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          {
            key: "simulator",
            label: "Simulator",
            render: (r) =>
              r.integrationType === "IFRAME" && r.entryPointUrl ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-2 py-1 text-[11px] font-semibold text-gold-700">
                  <PlayCircle size={11} /> Configured
                </span>
              ) : (
                <span className="text-[11px] text-navy-300">Not configured</span>
              ),
          },
          {
            key: "actions",
            label: "",
            render: (r) => (
              <div className="flex gap-3">
                <button
                  onClick={() => setSimulatorTarget(r)}
                  className="text-xs font-semibold text-navy hover:underline"
                >
                  {r.entryPointUrl ? "Edit Simulator" : "Add Simulator"}
                </button>
                {r.status !== "ACTIVE" && (
                  <button
                    onClick={() => handleSetStatus(r, "ACTIVE")}
                    className="text-xs font-semibold text-gold-700 hover:underline"
                  >
                    Activate
                  </button>
                )}
                {r.status === "ACTIVE" && (
                  <button
                    onClick={() => handleSetStatus(r, "INACTIVE")}
                    className="text-xs font-semibold text-navy hover:underline"
                  >
                    Deactivate
                  </button>
                )}
                {r.status !== "ARCHIVED" && (
                  <button
                    onClick={() => handleSetStatus(r, "ARCHIVED")}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Archive
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <CreateProductModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={load} />
      <ConfigureSimulatorModal
        open={!!simulatorTarget}
        product={simulatorTarget}
        onClose={() => setSimulatorTarget(null)}
        onSaved={load}
      />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}