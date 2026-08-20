import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/AppHeader";
import type { PaperRow } from "@/lib/queries";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/designer")({
  head: () => ({
    meta: [
      { title: "My papers — Paper Path" },
      { name: "description", content: "Draft, edit and submit your question papers for DQC review." },
      { property: "og:title", content: "My papers — Paper Path" },
      { property: "og:description", content: "Faculty workspace for question paper design." },
    ],
  }),
  component: DesignerHome,
});

function DesignerHome() {
  const { user, profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const papers = useQuery({
    queryKey: ["my-papers", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("papers")
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as PaperRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("papers")
        .insert({
          created_by: user!.id,
          institution_id: profile?.institution_id ?? null,
          department: profile?.department ?? "",
          course_code: "NEW101",
          course_name: "Untitled course",
          class_name: "TE-A",
          exam_type: "Unit Test 1",
          duration_minutes: 60,
          max_marks: 30,
          course_outcomes: [],
          sets: [],
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ["my-papers"] });
      void navigate({ to: "/designer/paper/$paperId", params: { paperId: id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const locked = profile?.account_status !== "active";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">My papers</h1>
          <p className="text-sm text-muted-foreground">
            Draft a paper, tag every question with a CO and a BT level, then send it to the DQC.
          </p>
        </div>
        <Button onClick={() => create.mutate()} disabled={locked || create.isPending}>
          <Plus className="mr-2 size-4" /> New paper
        </Button>
      </div>

      {locked && (
        <div className="surface p-4 text-sm text-muted-foreground">
          Your account is still pending HOD approval, so paper creation is disabled.
        </div>
      )}

      <div className="grid gap-3">
        {(papers.data ?? []).map((paper) => (
          <Link
            key={paper.id}
            to="/designer/paper/$paperId"
            params={{ paperId: paper.id }}
            className="surface flex flex-wrap items-center gap-3 p-4 transition-shadow hover:shadow-md"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {paper.course_code} — {paper.course_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {paper.class_name} • {paper.exam_type} • {paper.max_marks} marks
              </p>
            </div>
            <StatusBadge status={paper.status} />
          </Link>
        ))}
        {papers.isFetched && (papers.data ?? []).length === 0 && (
          <p className="surface p-8 text-center text-sm text-muted-foreground">
            No papers yet. Start with “New paper”.
          </p>
        )}
      </div>
    </div>
  );
}
