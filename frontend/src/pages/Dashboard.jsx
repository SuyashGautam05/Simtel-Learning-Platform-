import { Lock, Unlock } from "lucide-react";
import { useProducts } from "../hooks/useProducts.js";
import { useMyProducts } from "../hooks/useMyProducts.js";
import WelcomeSection from "../components/dashboard/WelcomeSection.jsx";
import ContinueLearning from "../components/dashboard/ContinueLearning.jsx";
import ProgressOverview from "../components/dashboard/ProgressOverview.jsx";
import RecentActivity from "../components/dashboard/RecentActivity.jsx";
import RecommendedLearning from "../components/dashboard/RecommendedLearning.jsx";
import QuizResultsSummary from "../components/dashboard/QuizResultsSummary.jsx";
import ExperimentsSummary from "../components/dashboard/ExperimentsSummary.jsx";
import SimulationsSummary from "../components/dashboard/SimulationsSummary.jsx";
import SectionCard from "../components/ui/SectionCard.jsx";
import ModuleGrid from "../components/modules/ModuleGrid.jsx";

export default function Dashboard() {
  const { authorized, locked, loading: productsLoading, refetch: refetchProducts } = useProducts();
  const { products: myProducts, loading: myLoading, refetch: refetchMy } = useMyProducts();

  const refetchAll = () => {
    refetchProducts();
    refetchMy();
  };

  return (
    <div className="space-y-8">
      {/* 1. Welcome section */}
      <WelcomeSection authorizedCount={authorized.length} lockedCount={locked.length} />

      {/* 2. Continue Learning */}
      <ContinueLearning products={myProducts} loading={myLoading} />

      {/* 5. Progress */}
      <ProgressOverview
        authorizedCount={authorized.length}
        lockedCount={locked.length}
        totalCount={authorized.length + locked.length}
      />

      {/* 3. Authorized Modules */}
      <SectionCard
        title="Authorized Modules"
        subtitle="Modules you can open right now"
        icon={Unlock}
        viewAllHref="/modules"
      >
        {productsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card h-40 animate-pulse bg-navy-50/60" />
            ))}
          </div>
        ) : (
          <ModuleGrid
            products={authorized.slice(0, 6)}
            onActivated={refetchAll}
            emptyMessage="No modules unlocked yet — activate a product key to get started."
          />
        )}
      </SectionCard>

      {/* 4. Locked Modules — shown, never hidden */}
      <SectionCard
        title="Locked Modules"
        subtitle="Enter a product key to unlock these"
        icon={Lock}
        viewAllHref="/modules"
      >
        {productsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card h-40 animate-pulse bg-navy-50/60" />
            ))}
          </div>
        ) : (
          <ModuleGrid
            products={locked.slice(0, 6)}
            onActivated={refetchAll}
            emptyMessage="You have access to every available module."
          />
        )}
      </SectionCard>

      {/* 6. Recent Activity */}
      <RecentActivity products={myProducts} loading={myLoading} />

      {/* 7. Recommended Learning */}
      <RecommendedLearning lockedProducts={locked} onActivated={refetchAll} />

      {/* 8, 9, 10. Quiz results / Experiments / Simulations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <QuizResultsSummary />
        <ExperimentsSummary />
        <SimulationsSummary />
      </div>
    </div>
  );
}