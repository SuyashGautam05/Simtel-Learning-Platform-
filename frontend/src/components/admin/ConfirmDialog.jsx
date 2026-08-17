import { AlertTriangle, X } from "lucide-react";

/**
 * The ONE confirmation dialog used for every destructive Super Admin
 * action (revoking a key, deactivating a college/admin/user, archiving a
 * product). Every destructive button opens this instead of acting
 * immediately — no destructive action in the admin UI fires on a single
 * click.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card-hover animate-fade-in-scale">
        <div className="flex items-start justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              danger ? "bg-red-50 text-red-600" : "bg-navy-50 text-navy"
            }`}
          >
            <AlertTriangle size={18} />
          </div>
          <button onClick={onCancel} className="text-navy-300 hover:text-navy">
            <X size={18} />
          </button>
        </div>

        <h3 className="mt-4 font-semibold text-navy-900">{title}</h3>
        <p className="mt-1.5 text-sm text-navy-500">{message}</p>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} disabled={loading} className="btn-secondary-outline">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-navy hover:bg-navy-800"
            }`}
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}