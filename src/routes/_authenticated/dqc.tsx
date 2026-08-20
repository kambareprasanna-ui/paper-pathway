import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/AppHeader";
import { YEAR_LEVEL_LABELS, type YearLevel } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dqc")({
  head: () => ({
    meta: [
      { title: "DQC review queue — Paper Path" },
      { name: "description", content: "Papers waiting for Department Quality Cell review and approval." },
      { property: "og:title", content: "DQC review queue — Paper Path" },
      { property: "og:description", content: "Review, approve or return submitted question papers." },
    ],
  }),
  component: DqcQueue,
});

interface QueueRow {
  id: string;
  status: string;
  due_at: string | null;
  year_level: YearLevel | null;
  papers: {
    id: string;
    course_code: string;
    course_name: string;
    class_name: string;
    exam_type: string;
  } | null;
}

function DqcQueue() {
  const { user } = useProfile();

  const queue = useQuery({
    queryKey: ["dqc-queue", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("paper_assignments")
        .select("id, status, due_at, year_level, papers(id, course_code, course_name, class_name, exam_type)")
        .eq("assigned_to", user!.id)
        .order("due_at", { ascending: true });
      return (data ?? []) as unknown as QueueRow[];
    },
  });

  const rows = queue.data ?? [];
  const open = rows.filter((r) => r.status === "assigned" || r.status === "in_review");
  const done = rows.filter((r) => r.status === "approved" || r.status === "returned");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Review queue</h1>
        <p className="text-sm text-muted-foreground">
          Papers routed to you by year level. Approve or return with a note.
        </p>
      </div>

      <Section title={`Awaiting your review (${open.length})`} rows={open} />
      <Section title="Decided" rows={done} muted />
    </div>
  );
}

function Section({ title, rows, muted }: { title: string; rows: QueueRow[]; muted?: boolean }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg">{title}</h2>
      {rows.map((row) => {
        const overdue =
          row.due_at && new Date(row.due_at) < new Date() && row.status !== "approved";
        return (
          <Link
            key={row.id}
            to="/dqc/paper/$paperId"
            params={{ paperId: row.papers?.id ?? "" }}
            className={`surface flex flex-wrap items-center gap-3 p-4 transition-shadow hover:shadow-md ${muted ? "opacity-70" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {row.papers?.course_code} — {row.papers?.course_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.papers?.class_name} • {row.papers?.exam_type}
                {row.year_level ? ` • ${YEAR_LEVEL_LABELS[row.year_level]}` : ""}
                {row.due_at ? ` • due ${new Date(row.due_at).toLocaleDateString()}` : ""}
              </p>
            </div>
            {overdue && (
              <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
                Overdue
              </span>
            )}
            <StatusBadge status={row.status} />
          </Link>
        );
      })}
      {!rows.length && (
        <p className="surface p-6 text-center text-sm text-muted-foreground">Nothing here.</p>
      )}
    </section>
  );
}
