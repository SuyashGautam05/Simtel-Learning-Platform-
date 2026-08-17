import { useEffect, useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import DataTable from "../../components/admin/DataTable.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import ConfirmDialog from "../../components/admin/ConfirmDialog.jsx";
import GenerateKeysModal from "../../components/admin/GenerateKeysModal.jsx";
import { fetchProductKeys, revokeProductKey, reactivateProductKey } from "../../api/productKeys.js";
import { useConfirmDialog } from "../../hooks/useConfirmDialog.js";

export default function SuperAdminProductKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { confirm, dialogProps } = useConfirmDialog();

  const load = () => {
    setLoading(true);
    fetchProductKeys()
      .then((data) => setKeys(data.keys))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRevoke = (key) => {
    confirm({
      title: "Revoke this product key?",
      message: `${key.maskedKey} will be permanently invalidated and can never be activated again. This does not affect access already granted through it.`,
      confirmLabel: "Revoke Key",
      danger: true,
      onConfirm: async () => {
        await revokeProductKey(key.id);
        load();
      },
    });
  };

  const handleReactivate = (key) => {
    confirm({
      title: "Reactivate this product key?",
      message: `${key.maskedKey} will become usable again.`,
      confirmLabel: "Reactivate",
      danger: false,
      onConfirm: async () => {
        await reactivateProductKey(key.id);
        load();
      },
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Product Keys"
        subtitle="Every key generated across the platform. Raw values are never stored or shown again after generation."
        action={
          <button onClick={() => setModalOpen(true)} className="btn-accent">
            <Plus size={16} /> Generate Keys
          </button>
        }
      />

      <DataTable
        loading={loading}
        emptyIcon={KeyRound}
        emptyMessage="No product keys generated yet."
        rows={keys}
        columns={[
          { key: "maskedKey", label: "Key", render: (r) => <code className="text-xs">{r.maskedKey}</code> },
          { key: "productCode", label: "Module" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          {
            key: "activations",
            label: "Activations",
            render: (r) => `${r.activationsCount} / ${r.maxActivations}`,
          },
          {
            key: "expiresAt",
            label: "Expires",
            render: (r) => (r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "Never"),
          },
          {
            key: "actions",
            label: "",
            render: (r) => (
              <div className="flex gap-3">
                {r.status === "REVOKED" && r.activationsCount === 0 && (
                  <button onClick={() => handleReactivate(r)} className="text-xs font-semibold text-navy hover:underline">
                    Reactivate
                  </button>
                )}
                {r.status !== "REVOKED" && (
                  <button onClick={() => handleRevoke(r)} className="text-xs font-semibold text-red-600 hover:underline">
                    Revoke
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <GenerateKeysModal open={modalOpen} onClose={() => setModalOpen(false)} onGenerated={load} />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}