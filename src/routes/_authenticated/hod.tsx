import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/AppHeader";
import type { PaperRow } from "@/lib/queries";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/hod")({
  head: () => ({
    meta: [
      { title: "HOD console — Paper Path" },
      { name: "description", content: "Approve faculty accounts and route papers to the right DQC." },
      { property: "og:title", content: "HOD console — Paper Path" },
      { property: "og:description", content: "Department head workspace for approvals and assignment." },
    ],
  }),
  component: HodConsole,
});

interface PendingProfile {
  id: string;
  full_name: string;
  email: string;
  department: string;
  created_at: string;
}

function HodConsole() {
  const { roles } = useProfile();
  const queryClient = useQueryClient();

  const pending = useQuery({
    queryKey: ["pending-faculty"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, department, created_at")
        .eq("account_status", "pending")
        .order("created_at", { ascending: true });
      return (data ?? []) as PendingProfile[];
    },
  });

  const papers = useQuery({
    queryKey: ["dept-papers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("papers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as PaperRow[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc("set_faculty_status", {
        _user_id: id,
        _status: approve ? "active" : "rejected",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Account updated");
      void queryClient.invalidateQueries({ queryKey: ["pending-faculty"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!roles.includes("hod")) {
    return (
      <p className="surface p-8 text-center text-sm text-muted-foreground">
        This console is for Heads of Department.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">HOD console</h1>
        <p className="text-sm text-muted-foreground">
          Approve new faculty, then assign finalized papers to the DQC that owns the year.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg">
          Faculty awaiting approval ({(pending.data ?? []).length})
        </h2>
        {(pending.data ?? []).map((person) => (
          <div key={person.id} className="surface flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{person.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {person.email} • {person.department}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => decide.mutate({ id: person.id, approve: true })}
              disabled={decide.isPending}
            >
              <Check className="mr-2 size-4" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => decide.mutate({ id: person.id, approve: false })}
              disabled={decide.isPending}
            >
              <X className="mr-2 size-4" /> Reject
            </Button>
          </div>
        ))}
        {pending.isFetched && !(pending.data ?? []).length && (
          <p className="surface p-6 text-center text-sm text-muted-foreground">
            No pending registrations.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg">Department papers</h2>
        {(papers.data ?? []).map((paper) => (
          <div key={paper.id} className="surface flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {paper.course_code} — {paper.course_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {paper.class_name} • {paper.exam_type}
              </p>
            </div>
            <StatusBadge status={paper.status} />
            {paper.status === "draft" && (
              <Button asChild size="sm" variant="outline">
                <Link to="/hod/assign/$paperId" params={{ paperId: paper.id }}>
                  Assign DQC
                </Link>
              </Button>
            )}
          </div>
        ))}
        {papers.isFetched && !(papers.data ?? []).length && (
          <p className="surface p-6 text-center text-sm text-muted-foreground">No papers yet.</p>
        )}
      </section>
    </div>
  );
}
