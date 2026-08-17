import { FlaskConical } from "lucide-react";
import SectionCard from "../ui/SectionCard.jsx";
import EmptyState from "../ui/EmptyState.jsx";

export default function ExperimentsSummary() {
  return (
    <SectionCard title="Experiments" icon={FlaskConical}>
      <EmptyState
        icon={FlaskConical}
        message="Completed experiments from your unlocked modules will be tracked here."
      />
    </SectionCard>
  );
}