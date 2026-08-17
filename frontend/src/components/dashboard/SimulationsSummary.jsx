import { Cpu } from "lucide-react";
import SectionCard from "../ui/SectionCard.jsx";
import EmptyState from "../ui/EmptyState.jsx";

export default function SimulationsSummary() {
  return (
    <SectionCard title="Simulations" icon={Cpu}>
      <EmptyState
        icon={Cpu}
        message="Simulations you've run in your unlocked modules will be tracked here."
      />
    </SectionCard>
  );
}