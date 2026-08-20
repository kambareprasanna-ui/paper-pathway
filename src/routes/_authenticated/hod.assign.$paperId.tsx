import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { fetchPaper } from "@/lib/queries";
import { resolveDqc, finalizePaper, type DqcCandidate } from "@/lib/paperpath.functions";
import { YEAR_LEVEL_LABELS, type YearLevel } from "@/lib/types";
import { PaperPreview } from "@/components/PaperPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/hod/assign/$paperId")({
  head: () => ({
    meta: [
      { title: "Assign a reviewer — Paper Path" },
      { name: "description", content: "Route a finalized paper to the DQC that owns the year level." },
      { property: "og:title", content: "Assign a reviewer — Paper Path" },
      { property: "og:description", content: "HOD assignment screen with workload-aware DQC routing." },
    ],
  }),
  component: AssignPaper,
});

const YEARS: YearLevel[] = ["SY", "TY", "LY"];

function AssignPaper() {
  const { paperId } = Route.useParams();
  const navigate = useNavigate();
  const resolve = useServerFn(resolveDqc);
  const finalize = useServerFn(finalizePaper);

  const paperQuery = useQuery({ queryKey: ["paper", paperId], queryFn: () => fetchPaper(paperId) });
  const [yearLevel, setYearLevel] = useState<YearLevel | "">("");
  const [candidates, setCandidates] = useState<DqcCandidate[]>([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [dueAt, setDueAt] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  );
  const [note, setNote] = useState("");

  useEffect(() => {
    if (paperQuery.data?.year_level) setYearLevel(paperQuery.data.year_level);
  }, [paperQuery.data]);

  // The year level decides the DQC pool, so re-resolve whenever it changes.
  useEffect(() => {
    if (!yearLevel) return;
    let active = true;
    void resolve({ data: { yearLevel } })
      .then((result) => {
        if (!active) return;
        setCandidates(result.candidates);
        setAssignedTo(result.candidates[0]?.id ?? "");
      })
      .catch((error: Error) => toast.error(error.message));
    return () => {
      active = false;
    };
  }, [yearLevel, resolve]);

  const assign = useMutation({
    mutationFn: async () => {
      if (!assignedTo) throw new Error("Pick a DQC reviewer");
      return finalize({
        data: {
          paperId,
          assignedTo,
          dueAt: new Date(`${dueAt}T23:59:00`).toISOString(),
          note: note.trim(),
        },
      });
    },
    onSuccess: () => {
      toast.success("Paper assigned for review");
      void navigate({ to: "/hod" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const paper = paperQuery.data;
  if (paperQuery.isLoading) return <p className="text-sm text-muted-foreground">Loading paper…</p>;
  if (!paper) return <p className="surface p-8 text-center text-sm text-muted-foreground">Paper not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Assign to DQC</h1>
        <p className="text-sm text-muted-foreground">
          {paper.course_code} — {paper.course_name}
        </p>
      </div>

      <section className="surface space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Year level</Label>
            <Select value={yearLevel} onValueChange={(v) => setYearLevel(v as YearLevel)}>
              <SelectTrigger>
                <SelectValue placeholder="Select year level" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {YEAR_LEVEL_LABELS[y]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reviewer (lightest workload first)</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo} disabled={!candidates.length}>
              <SelectTrigger>
                <SelectValue placeholder={candidates.length ? "Select DQC" : "No DQC for this year"} />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name} — {c.open_load} open
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="due">Due date</Label>
            <Input id="due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="note">Note for the reviewer</Label>
            <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => assign.mutate()} disabled={assign.isPending || !assignedTo}>
          Assign and notify
        </Button>
      </section>

      <PaperPreview paper={paper} showCourseOutcomes />
    </div>
  );
}
