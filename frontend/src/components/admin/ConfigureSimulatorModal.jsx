import { useState, useEffect } from "react";
import { PlayCircle } from "lucide-react";
import AdminModal from "./AdminModal.jsx";
import { updateProduct } from "../../api/products.js";

/**
 * The entire "plug an existing simulator into the platform" workflow for
 * a Super Admin: paste the URL where that module's own bundle is already
 * hosted, save. No code deploy, no rebuild — MODULE_INTEGRATION.md's
 * whole point is that this is the only integration step required.
 */
export default function ConfigureSimulatorModal({ open, product, onClose, onSaved }) {
  const [entryPointUrl, setEntryPointUrl] = useState("");
  const [integrationType, setIntegrationType] = useState("IFRAME");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && product) {
      setEntryPointUrl(product.entryPointUrl || "");
      setIntegrationType(product.integrationType === "NONE" ? "IFRAME" : product.integrationType);
      setError("");
    }
  }, [open, product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const updated = await updateProduct(product.id, { entryPointUrl, integrationType });
      onSaved?.(updated);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save the simulator configuration.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisable = async () => {
    setSubmitting(true);
    setError("");
    try {
      const updated = await updateProduct(product.id, { entryPointUrl: null, integrationType: "NONE" });
      onSaved?.(updated);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update the module.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Configure Simulator" icon={PlayCircle}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-xs text-navy-400">
          Point this module at its existing simulator bundle — an already-hosted HTML/JS app
          (Canvas, Three.js, React, whatever it's built with). The platform embeds it in a
          sandboxed iframe; nothing about it needs to change.
        </p>

        <div>
          <label className="mb-1 block text-xs font-semibold text-navy-700">Entry point URL</label>
          <input
            type="url"
            required
            placeholder="https://sims.simtel.example/plc/index.html"
            value={entryPointUrl}
            onChange={(e) => setEntryPointUrl(e.target.value)}
            className="input-field font-mono text-xs"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-navy-700">Integration type</label>
          <select
            value={integrationType}
            onChange={(e) => setIntegrationType(e.target.value)}
            className="input-field"
          >
            <option value="IFRAME">Iframe (recommended — works with any existing module)</option>
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Saving..." : "Save Configuration"}
        </button>

        {product?.entryPointUrl && (
          <button
            type="button"
            onClick={handleDisable}
            disabled={submitting}
            className="w-full text-center text-xs font-semibold text-red-600 hover:underline"
          >
            Remove simulator (revert to content-only)
          </button>
        )}
      </form>
    </AdminModal>
  );
}