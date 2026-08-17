import { GraduationCap } from "lucide-react";
import { useMyProducts } from "../hooks/useMyProducts.js";
import ModuleGrid from "../components/modules/ModuleGrid.jsx";

export default function MyLearning() {
  const { products, loading, refetch } = useMyProducts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">My Learning</h1>
        <p className="mt-1 text-sm text-navy-400">Modules you're authorized to access.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-44 animate-pulse bg-navy-50/60" />
          ))}
        </div>
      ) : (
        <ModuleGrid
          products={products}
          onActivated={refetch}
          emptyMessage="You haven't unlocked any modules yet. Head to Modules to activate a product key."
        />
      )}

      {!loading && products.length === 0 && (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <GraduationCap size={28} className="text-navy-300" />
          <p className="text-sm text-navy-400">Your learning journey starts with your first product key.</p>
        </div>
      )}
    </div>
  );
}