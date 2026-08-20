import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAuth";
import { fetchPaper } from "@/lib/queries";
import { decidePaper } from "@/lib/paperpath.functions";
import { PaperPreview } from "@/components/PaperPreview";
import { StatusBadge } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/dqc/paper/$paperId")({
  head: () => ({
    meta: [
      { title: "Review paper — Paper Path" },
      { name: "description", content: "Read the submitted paper and record an approval or return." },
      { property: "og:title", content: "Review paper — Paper Path" },
      { property: "og:description", content: "DQC decision screen for a submitted question paper." },
    ],
  }),
  component: DqcPaperReview,
});

function DqcPaperReview() {
  const { paperId } = Route.useParams();
  const { user } = useProfile();
  const navigate = useNavigate();
  const decide = useServerFn(decidePaper);
  const [note, setNote] = useState("");

  const paperQuery = useQuery({ queryKey: ["paper", paperId], queryFn: () => fetchPaper(paperId) });
  const assignment = useQuery({
    queryKey: ["assignment", paperId, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("paper_assignments")
        .select("id, status, due_at, note")
        .eq("paper_id", paperId)
        .eq("assigned_to", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const submitDecision = useMutation({
    mutationFn: async (approve: boolean) => {
      if (!assignment.data) throw new Error("You are not the reviewer for this paper");
      if (!approve && !note.trim()) throw new Error("Add a note so the faculty knows what to fix");
      return decide({ data: { assignmentId: assignment.data.id, approve, note: note.trim() } });
    },
    onSuccess: (result) => {
      toast.success(result.status === "approved" ? "Paper approved" : "Paper returned to faculty");
      void navigate({ to: "/dqc" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const paper = paperQuery.data;
  if (paperQuery.isLoading) return <p className="text-sm text-muted-foreground">Loading paper…</p>;
  if (!paper) return <p className="surface p-8 text-center text-sm text-muted-foreground">Paper not found.</p>;

  const decided = assignment.data && ["approved", "returned"].includes(assignment.data.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">
            {paper.course_code} — {paper.course_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {paper.class_name} • {paper.exam_type} • {paper.max_marks} marks •{" "}
            {paper.duration_minutes} min
          </p>
        </div>
        <StatusBadge status={paper.status} />
      </div>

      <PaperPreview paper={paper} showCourseOutcomes />

      <section className="surface space-y-3 p-5">
        <h2 className="font-display text-lg">Your decision</h2>
        {decided ? (
          <p className="text-sm text-muted-foreground">
            You already {assignment.data?.status} this paper.
            {assignment.data?.note ? ` Note: ${assignment.data.note}` : ""}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="note">Note to the faculty (required when returning)</Label>
              <Textarea
                id="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Q3 in Set B repeats last year's paper; rebalance BT H questions."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => submitDecision.mutate(true)} disabled={submitDecision.isPending}>
                <Check className="mr-2 size-4" /> Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => submitDecision.mutate(false)}
                disabled={submitDecision.isPending}
              >
                <Undo2 className="mr-2 size-4" /> Return for changes
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
