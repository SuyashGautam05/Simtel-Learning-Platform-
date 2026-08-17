import ModuleCard from "./ModuleCard.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import { LayoutGrid } from "lucide-react";

export default function ModuleGrid({ products, onActivated, emptyMessage = "No modules to show.", compact = false }) {
  if (!products || products.length === 0) {
    return <EmptyState icon={LayoutGrid} message={emptyMessage} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p, i) => (
        <div key={p.id} style={{ animationDelay: `${i * 40}ms` }}>
          <ModuleCard product={p} onActivated={onActivated} compact={compact} />
        </div>
      ))}
    </div>
  );
}