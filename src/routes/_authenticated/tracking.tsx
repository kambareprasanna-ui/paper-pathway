import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAuth";
import { sendReminder } from "@/lib/paperpath.functions";
import { StatusBadge } from "@/components/AppHeader";
import { YEAR_LEVEL_LABELS, type YearLevel } from "@/lib/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tracking")({
  head: () => ({
    meta: [
      { title: "Assignment tracking — Paper Path" },
      { name: "description", content: "Track every paper assignment, its reviewer, due date and status." },
      { property: "og:title", content: "Assignment tracking — Paper Path" },
      { property: "og:description", content: "Live status board for question paper reviews." },
    ],
  }),
  component: Tracking,
});

interface TrackRow {
  id: string;
  status: string;
  due_at: string | null;
  reminder_count: number;
  year_level: YearLevel | null;
  papers: { course_code: string; course_name: string; class_name: string } | null;
}

function Tracking() {
  const { roles } = useProfile();
  const remind = useServerFn(sendReminder);
  const queryClient = useQueryClient();

  const rows = useQuery({
    queryKey: ["tracking"],
    queryFn: async () => {
      const { data } = await supabase
        .from("paper_assignments")
        .select("id, status, due_at, reminder_count, year_level, papers(course_code, course_name, class_name)")
        .order("due_at", { ascending: true });
      return (data ?? []) as unknown as TrackRow[];
    },
  });

  const list = rows.data ?? [];
  const overdue = list.filter(
    (r) => r.due_at && new Date(r.due_at) < new Date() && !["approved"].includes(r.status),
  );
  const canRemind = roles.includes("coord") || roles.includes("hod");

  const nudge = useMutation({
    mutationFn: async (ids: string[]) => remind({ data: { assignmentIds: ids } }),
    onSuccess: (result) => {
      toast.success(`${result.sent} reminder${result.sent === 1 ? "" : "s"} sent`);
      void queryClient.invalidateQueries({ queryKey: ["tracking"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const counts = {
    assigned: list.filter((r) => r.status === "assigned").length,
    in_review: list.filter((r) => r.status === "in_review").length,
    approved: list.filter((r) => r.status === "approved").length,
    returned: list.filter((r) => r.status === "returned").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Every assignment with its reviewer, due date and reminder history.
          </p>
        </div>
        {canRemind && overdue.length > 0 && (
          <Button onClick={() => nudge.mutate(overdue.map((r) => r.id))} disabled={nudge.isPending}>
            <BellRing className="mr-2 size-4" /> Remind {overdue.length} overdue
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(counts).map(([key, value]) => (
          <div key={key} className="surface p-4">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs capitalize text-muted-foreground">{key.replace("_", " ")}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3">
        {list.map((row) => {
          const late = row.due_at && new Date(row.due_at) < new Date() && row.status !== "approved";
          return (
            <div key={row.id} className="surface flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {row.papers?.course_code} — {row.papers?.course_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.papers?.class_name}
                  {row.year_level ? ` • ${YEAR_LEVEL_LABELS[row.year_level]}` : ""}
                  {row.due_at ? ` • due ${new Date(row.due_at).toLocaleDateString()}` : ""}
                  {row.reminder_count ? ` • ${row.reminder_count} reminder(s)` : ""}
                </p>
              </div>
              {late && (
                <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
                  Overdue
                </span>
              )}
              <StatusBadge status={row.status} />
            </div>
          );
        })}
        {rows.isFetched && !list.length && (
          <p className="surface p-8 text-center text-sm text-muted-foreground">
            No assignments yet.
          </p>
        )}
      </div>
    </div>
  );
}
