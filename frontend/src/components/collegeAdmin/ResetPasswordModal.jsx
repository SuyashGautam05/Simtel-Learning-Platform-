import { useState, useEffect } from "react";
import { Lock, Copy, CheckCircle2 } from "lucide-react";
import AdminModal from "../admin/AdminModal.jsx";
import { resetUserPassword } from "../../api/collegeAdmin.js";

export default function ResetPasswordModal({ open, student, onClose }) {
  const [tempPassword, setTempPassword] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && student) {
      setTempPassword(null);
      setError("");
      setLoading(true);
      resetUserPassword(student.id)
        .then(setTempPassword)
        .catch((err) => setError(err.response?.data?.message || "Couldn't reset the password."))
        .finally(() => setLoading(false));
    }
  }, [open, student]);

  const copy = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Password Reset" icon={Lock}>
      {loading && (
        <div className="flex items-center justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-navy-100 border-t-navy" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      {tempPassword && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-gold-100 bg-gold-50 px-3 py-2 text-xs font-medium text-gold-700">
            <CheckCircle2 size={14} className="shrink-0" />
            This is the only time this password is shown. Share it with {student?.name} securely —
            their other sessions have been signed out.
          </div>
          <div className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2.5">
            <code className="text-base font-semibold tracking-wide text-navy-900">{tempPassword}</code>
            <button onClick={copy} className="text-navy-300 hover:text-navy">
              {copied ? <CheckCircle2 size={16} className="text-gold-600" /> : <Copy size={16} />}
            </button>
          </div>
          <button onClick={onClose} className="btn-primary w-full">
            Done
          </button>
        </div>
      )}
    </AdminModal>
  );
}