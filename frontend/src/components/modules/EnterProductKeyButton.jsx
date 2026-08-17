import { useState } from "react";
import { KeyRound } from "lucide-react";
import EnterProductKeyModal from "./EnterProductKeyModal.jsx";

/**
 * Renders the standard "🔒 Enter Product Key" button and owns its modal.
 * Used by ModuleCard (compact) and ProductAccessGuard's locked screen.
 * `onActivated` is called with the unlocked product so callers can
 * refetch whatever list/access-check they're displaying.
 */
export default function EnterProductKeyButton({ onActivated, className = "", children }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          className ||
          "inline-flex items-center justify-center gap-2 rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-700 transition-colors hover:border-gold-400 hover:bg-gold-50 hover:text-gold-700"
        }
      >
        {children ?? (
          <>
            <KeyRound size={15} />
            Enter Product Key
          </>
        )}
      </button>
      <EnterProductKeyModal
        open={open}
        onClose={() => setOpen(false)}
        onActivated={(product) => {
          onActivated?.(product);
          setTimeout(() => setOpen(false), 1200);
        }}
      />
    </>
  );
}