import { useState } from "react";
import { Package } from "lucide-react";
import AdminModal from "./AdminModal.jsx";
import { createProduct } from "../../api/products.js";

export default function CreateProductModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", code: "", description: "", version: "1.0.0" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const product = await createProduct({
        name: form.name,
        code: form.code.toUpperCase(),
        description: form.description || undefined,
        version: form.version,
      });
      onCreated?.(product);
      setForm({ name: "", code: "", description: "", version: "1.0.0" });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't create the module.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Create Module" icon={Package}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input required placeholder="Module name (e.g. DSP)" value={form.name} onChange={set("name")} className="input-field" />
        <input
          required
          placeholder="Code (e.g. DSP) — used as the key prefix"
          value={form.code}
          onChange={set("code")}
          className="input-field font-mono uppercase"
        />
        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={set("description")}
          rows={3}
          className="input-field resize-none"
        />
        <input placeholder="Version" value={form.version} onChange={set("version")} className="input-field" />
        <p className="text-xs text-navy-400">Created as DRAFT — activate it from the Products list when ready.</p>
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </div>
        )}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Creating..." : "Create Module"}
        </button>
      </form>
    </AdminModal>
  );
}