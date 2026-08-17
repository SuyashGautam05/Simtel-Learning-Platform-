import { useNavigate } from "react-router-dom";
import { Cpu, Lock, ArrowRight } from "lucide-react";
import EnterProductKeyButton from "./EnterProductKeyButton.jsx";

/**
 * The one card component used everywhere a module is shown (Dashboard's
 * authorized/locked grids, the Modules catalog, My Learning). Authorization
 * state (`product.unlocked`) always comes from the backend — this
 * component never decides access itself, only how to render it:
 *   unlocked -> "OPEN MODULE"
 *   locked   -> "🔒 ENTER PRODUCT KEY"
 * A locked module is always rendered, never hidden.
 */
export default function ModuleCard({ product, onActivated, compact = false }) {
  const navigate = useNavigate();
  const { id, name, code, description, unlocked } = product;

  return (
    <div
      className={`card flex flex-col p-5 animate-fade-in ${!unlocked ? "opacity-90" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy">
          <Cpu size={18} />
        </div>
        {unlocked ? (
          <span className="rounded-full bg-gold-50 px-2 py-1 text-[10px] font-semibold text-gold-700">
            UNLOCKED
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-navy-50 px-2 py-1 text-[10px] font-semibold text-navy-400">
            <Lock size={10} /> LOCKED
          </span>
        )}
      </div>

      <h3 className="mt-4 font-semibold text-navy-900">{name}</h3>
      <p className="mt-0.5 text-xs font-medium text-navy-300">{code}</p>
      {!compact && description && (
        <p className="mt-2 line-clamp-2 text-xs text-navy-400">{description}</p>
      )}

      <div className="mt-4 flex-1" />

      {unlocked ? (
        <button onClick={() => navigate(`/modules/${id}`)} className="btn-primary w-full uppercase tracking-wide">
          Open Module <ArrowRight size={15} />
        </button>
      ) : (
        <EnterProductKeyButton onActivated={onActivated} className="btn-accent w-full uppercase tracking-wide">
          🔒 Enter Product Key
        </EnterProductKeyButton>
      )}
    </div>
  );
}