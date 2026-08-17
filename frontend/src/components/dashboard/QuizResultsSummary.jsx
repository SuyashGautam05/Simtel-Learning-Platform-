import { ClipboardCheck } from "lucide-react";
import SectionCard from "../ui/SectionCard.jsx";
import EmptyState from "../ui/EmptyState.jsx";

/**
 * No quiz-attempt/scoring model exists on the backend yet, so this is an
 * honest empty state rather than fabricated scores. Once quiz results are
 * tracked, wire the real list in here — the section shell stays the same.
 */
export default function QuizResultsSummary() {
  return (
    <SectionCard title="Quiz Results" icon={ClipboardCheck}>
      <EmptyState
        icon={ClipboardCheck}
        message="Quiz results will appear here after you complete a quiz in one of your modules."
      />
    </SectionCard>
  );
}