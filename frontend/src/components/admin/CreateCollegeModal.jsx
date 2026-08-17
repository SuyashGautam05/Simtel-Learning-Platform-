import { useState } from "react";
import { Building2 } from "lucide-react";
import AdminModal from "./AdminModal.jsx";
import { createCollege } from "../../api/admin.js";

export default function CreateCollegeModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", code: "", email: "", phone: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const college = await createCollege({
        name: form.name,
        code: form.code,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
      });
      onCreated?.(college);
      setForm({ name: "", code: "", email: "", phone: "", address: "" });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't create the college.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Create College" icon={Building2}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input required placeholder="College name" value={form.name} onChange={set("name")} className="input-field" />
        <input
          required
          placeholder="Code (e.g. LNCT-BPL)"
          value={form.code}
          onChange={set("code")}
          className="input-field"
        />
        <input type="email" placeholder="Email (optional)" value={form.email} onChange={set("email")} className="input-field" />
        <input placeholder="Phone (optional)" value={form.phone} onChange={set("phone")} className="input-field" />
        <input placeholder="Address (optional)" value={form.address} onChange={set("address")} className="input-field" />
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </div>
        )}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Creating..." : "Create College"}
        </button>
      </form>
    </AdminModal>
  );
}