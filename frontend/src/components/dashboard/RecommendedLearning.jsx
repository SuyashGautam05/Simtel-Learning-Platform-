import { Sparkles } from "lucide-react";
import SectionCard from "../ui/SectionCard.jsx";
import ModuleGrid from "../modules/ModuleGrid.jsx";

/**
 * Recommends modules the student hasn't unlocked yet — a real,
 * data-backed recommendation (not fabricated), since "locked" is exactly
 * the set of modules that would benefit from a nudge to activate.
 */
export default function RecommendedLearning({ lockedProducts, onActivated }) {
  const recommended = lockedProducts.slice(0, 3);
  if (recommended.length === 0) return null;

  return (
    <SectionCard
      title="Recommended for You"
      subtitle="Modules you don't have access to yet"
      icon={Sparkles}
    >
      <ModuleGrid products={recommended} onActivated={onActivated} compact />
    </SectionCard>
  );
}