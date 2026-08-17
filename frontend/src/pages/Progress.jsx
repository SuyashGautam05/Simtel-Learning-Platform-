import { BarChart3 } from "lucide-react";
import { useProducts } from "../hooks/useProducts.js";
import { useMyProducts } from "../hooks/useMyProducts.js";
import ProgressOverview from "../components/dashboard/ProgressOverview.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";

export default function Progress() {
  const { authorized, locked, loading: productsLoading } = useProducts();
  const { products: myProducts, loading: myLoading } = useMyProducts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Progress</h1>
        <p className="mt-1 text-sm text-navy-400">Your module unlock progress across the platform.</p>
      </div>

      {!productsLoading && (
        <ProgressOverview
          authorizedCount={authorized.length}
          lockedCount={locked.length}
          totalCount={authorized.length + locked.length}
        />
      )}

      <div className="card p-5">
        <h2 className="mb-4 font-semibold text-navy-900">Per-module progress</h2>
        {myLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-navy-50/60" />
            ))}
          </div>
        ) : myProducts.length === 0 ? (
          <EmptyState icon={BarChart3} message="Unlock a module to start tracking progress." />
        ) : (
          <div className="space-y-4">
            {myProducts.map((p) => (
              <div key={p.id}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-navy-800">{p.name}</span>
                  <span className="text-xs text-navy-400">Not yet tracked</span>
                </div>
                <ProgressBar percent={0} />
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-navy-300">
          Lesson-level completion tracking is coming soon — this view will show real percentages once
          it's wired up.
        </p>
      </div>
    </div>
  );
}