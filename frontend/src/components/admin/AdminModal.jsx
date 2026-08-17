import { X } from "lucide-react";

export default function AdminModal({ open, title, icon: Icon, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card-hover animate-fade-in-scale">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy">
                <Icon size={17} />
              </div>
            )}
            <h3 className="font-semibold text-navy-900">{title}</h3>
          </div>
          <button onClick={onClose} className="text-navy-300 hover:text-navy">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}