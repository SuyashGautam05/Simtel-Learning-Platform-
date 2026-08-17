import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { activateProductKey } from "../../api/productKeys";

/**
 * The product-key activation flow, as a self-contained panel (used by the
 * dedicated Activate Product page).
 *
 * Security-relevant UX rule: on failure, we ALWAYS show the same generic
 * message — "Invalid or expired product key." — regardless of whether
 * the backend actually said "not found," "revoked," "expired," or
 * "already used." Surfacing the real reason would let someone probe
 * random key guesses and learn which ones are "closer" to valid (e.g.
 * "revoked" implies the key format/checksum was right, just deactivated
 * — that's exactly the kind of oracle you don't want to hand an
 * attacker). The backend already returns a properly-scoped message; this
 * component deliberately discards it and shows one fixed string instead.
 *
 * The frontend also never infers or displays which product a key belongs
 * to before activation succeeds — that determination happens entirely
 * server-side. We only display the product info the backend hands back
 * *after* a successful activation.
 */
export default function ActivationPanel({ onActivated }) {
  const navigate = useNavigate();
  const [key, setKey] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | failure
  const [activatedProduct, setActivatedProduct] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key.trim()) return;
    setStatus("loading");
    try {
      const result = await activateProductKey(key.trim());
      setActivatedProduct(result.product);
      setStatus("success");
      onActivated?.(result.product);
    } catch {
      // Deliberately ignore the specific backend error — see comment above.
      setStatus("failure");
    }
  };

  const reset = () => {
    setKey("");
    setStatus("idle");
    setActivatedProduct(null);
  };

  if (status === "success") {
    return (
      <div className="card flex flex-col items-center p-8 text-center animate-fade-in-scale">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-50 text-gold-600">
          <CheckCircle2 size={32} />
        </div>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-gold-700">
          ✓ Product Activated
        </p>
        <h2 className="mt-1 text-xl font-bold text-navy-900">{activatedProduct?.name}</h2>
        <p className="mt-1 text-sm font-medium text-navy-400">Access Granted</p>

        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={() => navigate(`/modules/${activatedProduct?.id}`)}
            className="btn-primary uppercase tracking-wide"
          >
            Open Module <ArrowRight size={15} />
          </button>
          <button onClick={reset} className="btn-secondary-outline">
            Activate another key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy">
          <KeyRound size={17} />
        </div>
        <h2 className="font-semibold text-navy-900">Activate Product</h2>
      </div>
      <p className="mt-1 text-sm text-navy-400">
        Enter the product key you were given to unlock a module.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <input
          autoFocus
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          disabled={status === "loading"}
          className="input-field text-center font-mono text-base tracking-widest"
          required
        />

        {status === "failure" && (
          <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 animate-fade-in">
            <XCircle size={16} className="shrink-0" />
            Invalid or expired product key.
          </div>
        )}

        <button type="submit" disabled={status === "loading"} className="btn-accent w-full">
          {status === "loading" ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy-900/30 border-t-navy-900" />
              Loading...
            </>
          ) : (
            "Activate"
          )}
        </button>
      </form>
    </div>
  );
}