import { useState } from "react";
import { UserPlus } from "lucide-react";
import AdminModal from "../admin/AdminModal.jsx";
import { createUser } from "../../api/admin.js";

/**
 * No college selector here on purpose — createUser forces role: USER and
 * the backend forces collegeId to the requesting ADMIN's own college
 * regardless of anything sent in the body (see user.service.js#createUser).
 * There is structurally no way for this form to place a student in
 * another college even if it tried to.
 */
export default function CreateStudentModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await createUser({ ...form, role: "USER" });
      onCreated?.(user);
      setForm({ name: "", email: "", password: "" });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't create the student account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Create Student" icon={UserPlus}>
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
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </div>
        )}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Creating..." : "Create Student"}
        </button>
      </form>
    </AdminModal>
  );
}