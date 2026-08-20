import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useAuth";
import { fetchPaper, academicYearsQuery, semestersQuery, type PaperRow } from "@/lib/queries";
import { downloadPdf, downloadWord, printPaper, type ExportablePaper } from "@/lib/export";
import { safeOutcomes, safeSets } from "@/lib/types";
import { PaperPreview } from "@/components/PaperPreview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/coord/print/$paperId")({
  head: () => ({
    meta: [
      { title: "Print paper — Paper Path" },
      { name: "description", content: "Print or download an approved paper as PDF or Word." },
      { property: "og:title", content: "Print paper — Paper Path" },
      { property: "og:description", content: "Coordinator release screen for approved question papers." },
    ],
  }),
  component: PrintPaper,
});

function PrintPaper() {
  const { paperId } = Route.useParams();
  const { roles } = useProfile();
  const [examCopy, setExamCopy] = useState(true);

  const paperQuery = useQuery({ queryKey: ["paper", paperId], queryFn: () => fetchPaper(paperId) });
  const years = useQuery(academicYearsQuery);
  const semesters = useQuery(semestersQuery);

  if (!roles.includes("coord")) {
    return (
      <p className="surface p-8 text-center text-sm text-muted-foreground">
        Printing and download are restricted to the Exam Coordinator.
      </p>
    );
  }
  if (paperQuery.isLoading) return <p className="text-sm text-muted-foreground">Loading paper…</p>;
  const paper = paperQuery.data;
  if (!paper) return <p className="surface p-8 text-center text-sm text-muted-foreground">Paper not found.</p>;
  if (paper.status !== "approved") {
    return (
      <p className="surface p-8 text-center text-sm text-muted-foreground">
        This paper is not approved by the DQC yet, so it can't be released.
      </p>
    );
  }

  function toExportable(row: PaperRow): ExportablePaper {
    return {
      course_code: row.course_code,
      course_name: row.course_name,
      class_name: row.class_name,
      exam_type: row.exam_type,
      duration_minutes: row.duration_minutes,
      max_marks: row.max_marks,
      course_outcomes: safeOutcomes(row.course_outcomes),
      sets: safeSets(row.sets),
      semester_label: (semesters.data ?? []).find((s) => s.id === row.semester_id)?.label ?? null,
      academic_year_label: (years.data ?? []).find((y) => y.id === row.academic_year_id)?.label ?? null,
    };
  }

  const options = { includeCourseOutcomes: !examCopy };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Release paper</h1>
          <p className="text-sm text-muted-foreground">
            {paper.course_code} — {paper.course_name}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-2">
          <Switch id="exam-copy" checked={examCopy} onCheckedChange={setExamCopy} />
          <Label htmlFor="exam-copy" className="text-sm">
            Exam copy (hide course outcomes)
          </Label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => printPaper(toExportable(paper), options)}>
          <Printer className="mr-2 size-4" /> Print
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            void downloadPdf(toExportable(paper), options).catch((error: Error) =>
              toast.error(error.message),
            );
          }}
        >
          <Download className="mr-2 size-4" /> PDF
        </Button>
        <Button variant="outline" onClick={() => downloadWord(toExportable(paper), options)}>
          <FileText className="mr-2 size-4" /> Word
        </Button>
      </div>

      <PaperPreview paper={paper} showCourseOutcomes={!examCopy} />
    </div>
  );
}
