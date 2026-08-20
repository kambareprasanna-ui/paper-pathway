import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAuth";
import type { PaperRow } from "@/lib/queries";
import { StatusBadge } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/coord")({
  head: () => ({
    meta: [
      { title: "Exam coordinator — Paper Path" },
      { name: "description", content: "Print and release DQC-approved question papers." },
      { property: "og:title", content: "Exam coordinator — Paper Path" },
      { property: "og:description", content: "Approved papers ready for printing and release." },
    ],
  }),
  component: CoordHome,
});

function CoordHome() {
  const { roles } = useProfile();

  const approved = useQuery({
    queryKey: ["approved-papers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("papers")
        .select("*")
        .eq("status", "approved")
        .order("finalized_at", { ascending: false });
      return (data ?? []) as PaperRow[];
    },
  });

  if (!roles.includes("coord")) {
    return (
      <p className="surface p-8 text-center text-sm text-muted-foreground">
        Printing and download are restricted to the Exam Coordinator.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Exam coordinator</h1>
        <p className="text-sm text-muted-foreground">
          Only DQC-approved papers appear here. Student copies never show course outcomes.
        </p>
      </div>

      <div className="grid gap-3">
        {(approved.data ?? []).map((paper) => (
          <div key={paper.id} className="surface flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {paper.course_code} — {paper.course_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {paper.class_name} • {paper.exam_type} • {paper.max_marks} marks
              </p>
            </div>
            <StatusBadge status={paper.status} />
            <Button asChild size="sm">
              <Link to="/coord/print/$paperId" params={{ paperId: paper.id }}>
                <Printer className="mr-2 size-4" /> Print / download
              </Link>
            </Button>
          </div>
        ))}
        {approved.isFetched && !(approved.data ?? []).length && (
          <p className="surface p-8 text-center text-sm text-muted-foreground">
            No approved papers waiting for release.
          </p>
        )}
      </div>
    </div>
  );
}
