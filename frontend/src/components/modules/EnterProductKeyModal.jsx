import { useState } from "react";
import { X, KeyRound, CheckCircle2 } from "lucide-react";
import { activateProductKey } from "../../api/productKeys";

export default function EnterProductKeyModal({ open, onClose, onActivated }) {
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await activateProductKey(key.trim());
      setSuccess(result.product);
      onActivated?.(result.product);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't activate that key. Please check it and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setKey("");
    setError("");
    setSuccess(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card-hover animate-fade-in-scale">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy">
              <KeyRound size={17} />
            </div>
            <h3 className="font-semibold text-navy-900">Enter product key</h3>
          </div>
          <button onClick={handleClose} className="text-navy-300 hover:text-navy">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-4 text-center animate-fade-in">
            <CheckCircle2 size={32} className="text-gold-600" />
            <p className="text-sm font-semibold text-navy-900">{success.name} unlocked!</p>
            <button onClick={handleClose} className="btn-primary mt-4 w-full">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <p className="text-xs text-navy-400">
              Enter the key exactly as it was given to you, e.g. <code className="text-navy-500">PLC-4F2A-9K1B-77QX</code>
            </p>
            <input
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="CODE-XXXX-XXXX-XXXX"
              className="input-field font-mono tracking-wide"
              required
            />
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 animate-fade-in">
                {error}
              </div>
            )}
            <button type="submit" disabled={submitting} className="btn-accent w-full">
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy-900/30 border-t-navy-900" />
              ) : (
                "Activate"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}