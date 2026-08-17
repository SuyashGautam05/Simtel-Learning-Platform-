import { useState, useEffect } from "react";
import { UserPlus } from "lucide-react";
import AdminModal from "./AdminModal.jsx";
import { createUser, fetchColleges } from "../../api/admin.js";

export default function CreateAdminModal({ open, onClose, onCreated }) {
  const [colleges, setColleges] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", collegeId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) fetchColleges().then(setColleges).catch(() => setColleges([]));
  }, [open]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await createUser({ ...form, role: "ADMIN" });
      onCreated?.(user);
      setForm({ name: "", email: "", password: "", collegeId: "" });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't create the admin account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Create College Admin" icon={UserPlus}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input required placeholder="Full name" value={form.name} onChange={set("name")} className="input-field" />
        <input required type="email" placeholder="Email" value={form.email} onChange={set("email")} className="input-field" />
        <input
          required
          type="password"
          minLength={8}
          placeholder="Temporary password"
          value={form.password}
          onChange={set("password")}
          className="input-field"
        />
        <select required value={form.collegeId} onChange={set("collegeId")} className="input-field">
          <option value="" disabled>
            Select a college
          </option>
          {colleges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </div>
        )}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Creating..." : "Create Admin"}
        </button>
      </form>
    </AdminModal>
  );
}