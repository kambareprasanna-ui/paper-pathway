import { safeOutcomes, safeSets, BT_LABELS } from "@/lib/types";
import type { PaperRow } from "@/lib/queries";
import { SOMAIYA_LOGO_DATA_URI } from "@/lib/branding";

/**
 * On-screen render of a paper. Exam-facing copies pass showCourseOutcomes={false}
 * so CO/BT tags never reach students.
 */
export function PaperPreview({
  paper,
  showCourseOutcomes,
}: {
  paper: PaperRow;
  showCourseOutcomes: boolean;
}) {
  const sets = safeSets(paper.sets);
  const outcomes = safeOutcomes(paper.course_outcomes);

  return (
    <article className="surface space-y-6 p-6">
      <header className="flex items-center gap-4 border-b border-border pb-4">
        <img src={SOMAIYA_LOGO_DATA_URI} alt="Somaiya" className="h-12" />
        <div className="text-center flex-1">
          <h2 className="font-display text-xl">
            {paper.course_code} — {paper.course_name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {paper.class_name} • {paper.exam_type}
          </p>
          <p className="text-sm text-muted-foreground">
            Duration: {paper.duration_minutes} min • Max marks: {paper.max_marks}
          </p>
        </div>
      </header>

      {showCourseOutcomes && outcomes.length > 0 && (
        <section>
          <h3 className="font-display text-base">Course outcomes</h3>
          <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
            {outcomes.map((co, i) => (
              <li key={i}>{co}</li>
            ))}
          </ul>
        </section>
      )}

      {sets.map((set, i) => (
        <section key={i} className="space-y-2">
          <h3 className="font-display text-base">
            {set.label}
            {showCourseOutcomes ? ` — BT ${set.bt} (${BT_LABELS[set.bt]})` : ""}
          </h3>
          <ol className="space-y-2">
            {set.questions.map((q, qi) => (
              <li key={qi} className="flex gap-3 text-sm">
                <span className="w-10 shrink-0 font-medium">{q.no}</span>
                <span className="flex-1 whitespace-pre-wrap">{q.text}</span>
                {showCourseOutcomes && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {q.co} • BT {q.bt}
                  </span>
                )}
                <span className="w-12 shrink-0 text-right">[{q.marks}]</span>
              </li>
            ))}
          </ol>
          {!set.questions.length && (
            <p className="text-sm text-muted-foreground">No questions in this set.</p>
          )}
        </section>
      ))}
      {!sets.length && <p className="text-sm text-muted-foreground">This paper has no question sets.</p>}
    </article>
  );
}
