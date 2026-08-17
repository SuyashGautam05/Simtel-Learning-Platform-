import { useState, useEffect } from "react";
import { KeyRound, Copy, CheckCircle2 } from "lucide-react";
import AdminModal from "./AdminModal.jsx";
import { generateProductKeys } from "../../api/productKeys.js";
import { fetchProducts } from "../../api/products.js";
import { fetchColleges } from "../../api/admin.js";

export default function GenerateKeysModal({ open, onClose, onGenerated }) {
  const [products, setProducts] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [form, setForm] = useState({ productCode: "", quantity: 1, collegeId: "", maxActivations: 1, expiresAt: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [generatedKeys, setGeneratedKeys] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    if (open) {
      fetchProducts({ includeAll: true }).then(setProducts).catch(() => setProducts([]));
      fetchColleges().then(setColleges).catch(() => setColleges([]));
    }
  }, [open]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const keys = await generateProductKeys({
        productCode: form.productCode,
        quantity: Number(form.quantity),
        maxActivations: Number(form.maxActivations),
        collegeId: form.collegeId || undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      });
      setGeneratedKeys(keys);
      onGenerated?.(keys);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't generate keys.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({ productCode: "", quantity: 1, collegeId: "", maxActivations: 1, expiresAt: "" });
    setGeneratedKeys(null);
    setError("");
    onClose();
  };

  const copyKey = (key, i) => {
    navigator.clipboard.writeText(key);
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <AdminModal open={open} onClose={handleClose} title="Generate Product Keys" icon={KeyRound}>
      {generatedKeys ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-gold-100 bg-gold-50 px-3 py-2 text-xs font-medium text-gold-700">
            <CheckCircle2 size={14} className="shrink-0" />
            Save these now — raw key values are shown only once and can never be retrieved again.
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {generatedKeys.map((k, i) => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2">
                <code className="text-sm font-semibold text-navy-900">{k.key}</code>
                <button onClick={() => copyKey(k.key, i)} className="text-navy-300 hover:text-navy">
                  {copiedIndex === i ? <CheckCircle2 size={15} className="text-gold-600" /> : <Copy size={15} />}
                </button>
              </div>
            ))}
          </div>
          <button onClick={handleClose} className="btn-primary w-full">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <select required value={form.productCode} onChange={set("productCode")} className="input-field">
            <option value="" disabled>
              Select a module
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.code}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy-700">Quantity</label>
              <input type="number" min={1} max={500} value={form.quantity} onChange={set("quantity")} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy-700">Max activations / key</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={form.maxActivations}
                onChange={set("maxActivations")}
                className="input-field"
              />
            </div>
          </div>

          <select value={form.collegeId} onChange={set("collegeId")} className="input-field">
            <option value="">No specific college (unassigned pool)</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>

          <div>
            <label className="mb-1 block text-xs font-semibold text-navy-700">Expires (optional)</label>
            <input type="date" value={form.expiresAt} onChange={set("expiresAt")} className="input-field" />
          </div>

          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-accent w-full">
            {submitting ? "Generating..." : "Generate Keys"}
          </button>
        </form>
      )}
    </AdminModal>
  );
}