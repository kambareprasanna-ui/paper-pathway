import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { YearLevel } from "@/lib/types";

export interface DqcCandidate {
  id: string;
  full_name: string;
  email: string;
  open_load: number;
}

/**
 * Resolves the DQC owners for a year level inside the caller's institution +
 * department. Runs server-side so the scope tables are never exposed wholesale.
 */
export const resolveDqc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { yearLevel: YearLevel }) => {
    if (!["SY", "TY", "LY"].includes(input.yearLevel)) throw new Error("Invalid year level");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ candidates: DqcCandidate[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me } = await context.supabase
      .from("profiles")
      .select("institution_id, department")
      .eq("id", context.userId)
      .maybeSingle();
    if (!me?.institution_id) return { candidates: [] };

    const { data: scopes } = await supabaseAdmin
      .from("dqc_scopes")
      .select("user_id")
      .eq("year_level", data.yearLevel);
    const ids = (scopes ?? []).map((s) => s.user_id);
    if (!ids.length) return { candidates: [] };

    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "dqc")
      .in("user_id", ids);
    const dqcIds = (roleRows ?? []).map((r) => r.user_id);
    if (!dqcIds.length) return { candidates: [] };

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", dqcIds)
      .eq("institution_id", me.institution_id)
      .eq("department", me.department)
      .eq("account_status", "active");

    const candidates: DqcCandidate[] = [];
    for (const p of profiles ?? []) {
      const { count } = await supabaseAdmin
        .from("paper_assignments")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", p.id)
        .in("status", ["assigned", "in_review"]);
      candidates.push({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        open_load: count ?? 0,
      });
    }
    // Least open load first — the round-robin tiebreak for the disambiguation UI.
    candidates.sort((a, b) => a.open_load - b.open_load);
    return { candidates };
  });

/**
 * Finalizes a paper: locks it for review, writes the assignment row, notifies
 * the DQC in-app and (once an email sending domain is verified) by email.
 */
export const finalizePaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { paperId: string; assignedTo: string; dueAt?: string | null; note?: string }) => {
      if (!input.paperId || !input.assignedTo) throw new Error("Missing paper or reviewer");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: paper, error } = await supabase
      .from("papers")
      .select("*")
      .eq("id", data.paperId)
      .maybeSingle();
    if (error || !paper) throw new Error("Paper not found");
    if (paper.created_by !== userId) {
      const { data: isHod } = await supabase.rpc("has_role", { _user_id: userId, _role: "hod" });
      if (!isHod) throw new Error("Only the paper owner or an HOD can submit this paper");
    }

    const dueAt = data.dueAt ?? new Date(Date.now() + 3 * 86400000).toISOString();

    const { data: assignment, error: assignError } = await supabase
      .from("paper_assignments")
      .insert({
        paper_id: paper.id,
        assigned_by: userId,
        assigned_to: data.assignedTo,
        year_level: paper.year_level,
        academic_year_id: paper.academic_year_id,
        semester_id: paper.semester_id,
        status: "assigned",
        is_primary: true,
        due_at: dueAt,
        submitted_at: new Date().toISOString(),
        note: data.note ?? null,
      })
      .select("id")
      .single();
    if (assignError) throw new Error(assignError.message);

    await supabase
      .from("papers")
      .update({ status: "submitted", finalized_at: new Date().toISOString() })
      .eq("id", paper.id);

    await supabase.from("notifications").insert({
      user_id: data.assignedTo,
      type: "assignment",
      title: `Paper ready for review — ${paper.course_code} ${paper.course_name}`,
      body: `${paper.class_name} • ${paper.exam_type}. Review and approve before ${new Date(dueAt).toLocaleDateString()}.`,
      link: `/dqc/paper/${paper.id}`,
    });

    const emailed = await sendReviewEmail({
      to: data.assignedTo,
      paperId: paper.id,
      courseLabel: `${paper.course_code} ${paper.course_name}`,
      dueAt,
    });

    return { assignmentId: assignment.id, emailed };
  });

/** Records a DQC decision and notifies the paper owner. */
export const decidePaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { assignmentId: string; approve: boolean; note?: string }) => {
    if (!input.assignmentId) throw new Error("Missing assignment");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: assignment } = await supabase
      .from("paper_assignments")
      .select("id, paper_id, assigned_to")
      .eq("id", data.assignmentId)
      .maybeSingle();
    if (!assignment) throw new Error("Assignment not found");
    if (assignment.assigned_to !== userId) throw new Error("You are not the reviewer for this paper");

    const status = data.approve ? "approved" : "returned";
    await supabase
      .from("paper_assignments")
      .update({ status, decided_at: new Date().toISOString(), note: data.note ?? null })
      .eq("id", assignment.id);
    await supabase.from("papers").update({ status }).eq("id", assignment.paper_id);

    const { data: paper } = await supabase
      .from("papers")
      .select("course_code, course_name, created_by")
      .eq("id", assignment.paper_id)
      .maybeSingle();

    if (paper) {
      await supabase.from("notifications").insert({
        user_id: paper.created_by,
        type: "decision",
        title: data.approve
          ? `Approved — ${paper.course_code} ${paper.course_name}`
          : `Returned — ${paper.course_code} ${paper.course_name}`,
        body: data.note ?? (data.approve ? "The DQC approved your paper." : "The DQC returned your paper."),
        link: `/designer/paper/${assignment.paper_id}`,
      });
    }
    return { status };
  });

/** Coordinator / HOD reminder — writes a live notification and bumps counters. */
export const sendReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { assignmentIds: string[] }) => {
    if (!Array.isArray(input.assignmentIds) || !input.assignmentIds.length) {
      throw new Error("Nothing to remind");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: isCoord }, { data: isHod }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "coord" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "hod" }),
    ]);
    if (!isCoord && !isHod) throw new Error("Only a coordinator or HOD can send reminders");

    let sent = 0;
    for (const id of data.assignmentIds) {
      const { data: assignment } = await supabase
        .from("paper_assignments")
        .select("id, paper_id, assigned_to, reminder_count, status")
        .eq("id", id)
        .maybeSingle();
      if (!assignment) continue;

      const { data: paper } = await supabase
        .from("papers")
        .select("course_code, course_name, created_by")
        .eq("id", assignment.paper_id)
        .maybeSingle();
      if (!paper) continue;

      const target = assignment.status === "assigned" ? assignment.assigned_to : paper.created_by;
      if (!target) continue;

      await supabase.from("notifications").insert({
        user_id: target,
        type: "reminder",
        title: `Reminder — ${paper.course_code} ${paper.course_name}`,
        body: "This paper is past its due date and still needs action.",
        link:
          assignment.status === "assigned"
            ? `/dqc/paper/${assignment.paper_id}`
            : `/designer/paper/${assignment.paper_id}`,
      });

      await supabase
        .from("paper_assignments")
        .update({
          reminder_count: (assignment.reminder_count ?? 0) + 1,
          last_reminded_at: new Date().toISOString(),
          last_reminded_by: userId,
        })
        .eq("id", assignment.id);
      sent += 1;
    }
    return { sent };
  });

/**
 * Branded "paper ready for review" email with a deep link to /dqc/paper/<id>.
 * Sending needs a verified email domain for the project; until then this
 * resolves false and the in-app notification stays the delivery channel.
 */
async function sendReviewEmail(_args: {
  to: string;
  paperId: string;
  courseLabel: string;
  dueAt: string;
}): Promise<boolean> {
  return false;
}
