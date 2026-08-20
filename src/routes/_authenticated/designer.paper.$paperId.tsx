import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchPaper, academicYearsQuery, semestersQuery } from "@/lib/queries";
import { resolveDqc, finalizePaper } from "@/lib/paperpath.functions";
import type { DqcCandidate } from "@/lib/paperpath.functions";
import {
  BT_LABELS,
  YEAR_LEVEL_LABELS,
  safeOutcomes,
  safeSets,
  type BtLevel,
  type PaperSet,
  type YearLevel,
} from "@/lib/types";
import { StatusBadge } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/designer/paper/$paperId")({
  head: () => ({
    meta: [
      { title: "Paper editor — Paper Path" },
      { name: "description", content: "Edit questions, course outcomes and BT levels, then submit for review." },
      { property: "og:title", content: "Paper editor — Paper Path" },
      { property: "og:description", content: "Design a question paper and route it to the DQC." },
    ],
  }),
  component: PaperEditor,
});

const YEARS: YearLevel[] = ["SY", "TY", "LY"];

function PaperEditor() {
  const { paperId } = Route.useParams();
  const navigate = useNavigate();
  const resolve = useServerFn(resolveDqc);
  const finalize = useServerFn(finalizePaper);

  const paperQuery = useQuery({ queryKey: ["paper", paperId], queryFn: () => fetchPaper(paperId) });
  const years = useQuery(academicYearsQuery);
  const semesters = useQuery(semestersQuery);

  const [meta, setMeta] = useState({
    course_code: "",
    course_name: "",
    class_name: "",
    exam_type: "",
    duration_minutes: 60,
    max_marks: 30,
    year_level: "" as YearLevel | "",
    academic_year_id: "",
    semester_id: "",
  });
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [sets, setSets] = useState<PaperSet[]>([]);
  const [candidates, setCandidates] = useState<DqcCandidate[] | null>(null);

  useEffect(() => {
    const paper = paperQuery.data;
    if (!paper) return;
    setMeta({
      course_code: paper.course_code,
      course_name: paper.course_name,
      class_name: paper.class_name,
      exam_type: paper.exam_type,
      duration_minutes: paper.duration_minutes,
      max_marks: paper.max_marks,
      year_level: paper.year_level ?? "",
      academic_year_id: paper.academic_year_id ?? "",
      semester_id: paper.semester_id ?? "",
    });
    setOutcomes(safeOutcomes(paper.course_outcomes));
    setSets(safeSets(paper.sets));
  }, [paperQuery.data]);

  // Semesters are scoped by the chosen academic year AND the year level.
  const filteredSemesters = useMemo(() => {
    return (semesters.data ?? []).filter(
      (s) =>
        (!meta.academic_year_id || s.academic_year_id === meta.academic_year_id) &&
        (!meta.year_level || s.year_level === meta.year_level),
    );
  }, [semesters.data, meta.academic_year_id, meta.year_level]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("papers")
        .update({
          course_code: meta.course_code,
          course_name: meta.course_name,
          class_name: meta.class_name,
          exam_type: meta.exam_type,
          duration_minutes: Number(meta.duration_minutes),
          max_marks: Number(meta.max_marks),
          year_level: meta.year_level || null,
          academic_year_id: meta.academic_year_id || null,
          semester_id: meta.semester_id || null,
          course_outcomes: outcomes,
          sets: sets as unknown as never,
        })
        .eq("id", paperId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Draft saved");
      void paperQuery.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startSubmit = useMutation({
    mutationFn: async () => {
      if (!meta.year_level) throw new Error("Pick a year level so the paper can reach the right DQC");
      await save.mutateAsync();
      const result = await resolve({ data: { yearLevel: meta.year_level as YearLevel } });
      return result.candidates;
    },
    onSuccess: (list) => {
      if (!list.length) {
        toast.error("No active DQC is scoped to this year level yet — ask your HOD to assign one.");
        return;
      }
      if (list.length === 1) {
        submit.mutate(list[0]!.id);
        return;
      }
      setCandidates(list);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submit = useMutation({
    mutationFn: async (assignedTo: string) => finalize({ data: { paperId, assignedTo } }),
    onSuccess: () => {
      setCandidates(null);
      toast.success("Sent to the DQC for review");
      void navigate({ to: "/designer" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const paper = paperQuery.data;
  const readOnly = paper ? ["submitted", "in_review", "approved"].includes(paper.status) : true;

  if (paperQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading paper…</p>;
  }
  if (!paper) {
    return <p className="surface p-8 text-center text-sm text-muted-foreground">Paper not found.</p>;
  }

  function updateSet(index: number, next: Partial<PaperSet>) {
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, ...next } : s)));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">
            {meta.course_code} — {meta.course_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {readOnly
              ? "This paper is locked while it is with the DQC."
              : "Every question needs a CO tag and a BT level (H or M)."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={paper.status} />
          <Button variant="outline" onClick={() => save.mutate()} disabled={readOnly || save.isPending}>
            <Save className="mr-2 size-4" /> Save
          </Button>
          <Button onClick={() => startSubmit.mutate()} disabled={readOnly || startSubmit.isPending}>
            <Send className="mr-2 size-4" /> Submit to DQC
          </Button>
        </div>
      </div>

      <section className="surface space-y-4 p-5">
        <h2 className="font-display text-lg">Paper details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Course code">
            <Input
              value={meta.course_code}
              disabled={readOnly}
              onChange={(e) => setMeta({ ...meta, course_code: e.target.value })}
            />
          </Field>
          <Field label="Course name">
            <Input
              value={meta.course_name}
              disabled={readOnly}
              onChange={(e) => setMeta({ ...meta, course_name: e.target.value })}
            />
          </Field>
          <Field label="Class">
            <Input
              value={meta.class_name}
              disabled={readOnly}
              onChange={(e) => setMeta({ ...meta, class_name: e.target.value })}
            />
          </Field>
          <Field label="Exam type">
            <Input
              value={meta.exam_type}
              disabled={readOnly}
              onChange={(e) => setMeta({ ...meta, exam_type: e.target.value })}
            />
          </Field>
          <Field label="Duration (minutes)">
            <Input
              type="number"
              value={meta.duration_minutes}
              disabled={readOnly}
              onChange={(e) => setMeta({ ...meta, duration_minutes: Number(e.target.value) })}
            />
          </Field>
          <Field label="Maximum marks">
            <Input
              type="number"
              value={meta.max_marks}
              disabled={readOnly}
              onChange={(e) => setMeta({ ...meta, max_marks: Number(e.target.value) })}
            />
          </Field>
          <Field label="Academic year">
            <Select
              value={meta.academic_year_id}
              disabled={readOnly}
              onValueChange={(v) => setMeta({ ...meta, academic_year_id: v, semester_id: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {(years.data ?? []).map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Year level (routes the DQC)">
            <Select
              value={meta.year_level}
              disabled={readOnly}
              onValueChange={(v) => setMeta({ ...meta, year_level: v as YearLevel, semester_id: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {YEAR_LEVEL_LABELS[y]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Semester">
            <Select
              value={meta.semester_id}
              disabled={readOnly || !filteredSemesters.length}
              onValueChange={(v) => setMeta({ ...meta, semester_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder={filteredSemesters.length ? "Select semester" : "Pick year first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredSemesters.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className="surface space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Course outcomes</h2>
          <Button
            variant="outline"
            size="sm"
            disabled={readOnly}
            onClick={() => setOutcomes([...outcomes, `CO${outcomes.length + 1}: `])}
          >
            <Plus className="mr-2 size-4" /> Add CO
          </Button>
        </div>
        {outcomes.map((co, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={co}
              disabled={readOnly}
              onChange={(e) => setOutcomes(outcomes.map((c, idx) => (idx === i ? e.target.value : c)))}
            />
            <Button
              variant="ghost"
              size="icon"
              disabled={readOnly}
              onClick={() => setOutcomes(outcomes.filter((_, idx) => idx !== i))}
              aria-label="Remove outcome"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {!outcomes.length && <p className="text-sm text-muted-foreground">No course outcomes added yet.</p>}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Question sets</h2>
          <Button
            variant="outline"
            size="sm"
            disabled={readOnly}
            onClick={() =>
              setSets([
                ...sets,
                { label: `Set ${String.fromCharCode(65 + sets.length)}`, bt: "M", questions: [] },
              ])
            }
          >
            <Plus className="mr-2 size-4" /> Add set
          </Button>
        </div>

        {sets.map((set, si) => (
          <div key={si} className="surface space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                className="max-w-[10rem]"
                value={set.label}
                disabled={readOnly}
                onChange={(e) => updateSet(si, { label: e.target.value })}
              />
              <Select
                value={set.bt}
                disabled={readOnly}
                onValueChange={(v) => updateSet(si, { bt: v as BtLevel })}
              >
                <SelectTrigger className="max-w-[10rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["H", "M"] as BtLevel[]).map((bt) => (
                    <SelectItem key={bt} value={bt}>
                      BT {bt} — {BT_LABELS[bt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {set.questions.reduce((sum, q) => sum + Number(q.marks || 0), 0)} marks
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
                disabled={readOnly}
                onClick={() => setSets(sets.filter((_, i) => i !== si))}
                aria-label="Remove set"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {set.questions.map((q, qi) => (
              <div key={qi} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-12">
                <Input
                  className="sm:col-span-1"
                  value={q.no}
                  disabled={readOnly}
                  placeholder="Q1"
                  onChange={(e) =>
                    updateSet(si, {
                      questions: set.questions.map((x, i) => (i === qi ? { ...x, no: e.target.value } : x)),
                    })
                  }
                />
                <Textarea
                  className="sm:col-span-6"
                  rows={2}
                  value={q.text}
                  disabled={readOnly}
                  placeholder="Question text"
                  onChange={(e) =>
                    updateSet(si, {
                      questions: set.questions.map((x, i) => (i === qi ? { ...x, text: e.target.value } : x)),
                    })
                  }
                />
                <Input
                  className="sm:col-span-1"
                  type="number"
                  value={q.marks}
                  disabled={readOnly}
                  onChange={(e) =>
                    updateSet(si, {
                      questions: set.questions.map((x, i) =>
                        i === qi ? { ...x, marks: Number(e.target.value) } : x,
                      ),
                    })
                  }
                />
                <Input
                  className="sm:col-span-2"
                  value={q.co}
                  disabled={readOnly}
                  placeholder="CO1"
                  onChange={(e) =>
                    updateSet(si, {
                      questions: set.questions.map((x, i) => (i === qi ? { ...x, co: e.target.value } : x)),
                    })
                  }
                />
                <Select
                  value={q.bt}
                  disabled={readOnly}
                  onValueChange={(v) =>
                    updateSet(si, {
                      questions: set.questions.map((x, i) => (i === qi ? { ...x, bt: v as BtLevel } : x)),
                    })
                  }
                >
                  <SelectTrigger className="sm:col-span-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="H">H</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:col-span-1"
                  disabled={readOnly}
                  aria-label="Remove question"
                  onClick={() =>
                    updateSet(si, { questions: set.questions.filter((_, i) => i !== qi) })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            <Button
              variant="ghost"
              size="sm"
              disabled={readOnly}
              onClick={() =>
                updateSet(si, {
                  questions: [
                    ...set.questions,
                    { no: `Q${set.questions.length + 1}`, text: "", marks: 5, co: "CO1", bt: set.bt },
                  ],
                })
              }
            >
              <Plus className="mr-2 size-4" /> Add question
            </Button>
          </div>
        ))}
        {!sets.length && (
          <p className="surface p-8 text-center text-sm text-muted-foreground">
            No question sets yet.
          </p>
        )}
      </section>

      <Dialog open={Boolean(candidates)} onOpenChange={(open) => !open && setCandidates(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose the reviewing DQC</DialogTitle>
            <DialogDescription>
              More than one DQC covers {meta.year_level && YEAR_LEVEL_LABELS[meta.year_level as YearLevel]}.
              The lightest workload is listed first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(candidates ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => submit.mutate(c.id)}
                disabled={submit.isPending}
                className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-muted"
              >
                <span>
                  <span className="block text-sm font-medium">{c.full_name}</span>
                  <span className="block text-xs text-muted-foreground">{c.email}</span>
                </span>
                <span className="text-xs text-muted-foreground">{c.open_load} open</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
