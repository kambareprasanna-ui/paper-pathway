# Paper Pathway

https://github.com/priyathombare03/kjsit-qpd-db9ac69d    Paper Path — HOD / DQC workflow, year routing and export upgrade

What changes for users

Login screen gets an institution/portal selector (radio or dropdown) plus role selection.

Two primary roles: HOD (creates/assigns papers) and DQC (reviews papers for the year level they own: SY, TY, LY). Faculty designer and Exam Coordinator stay as secondary roles so the existing generation and distribution flows keep working.

Academic year is a dropdown; picking a year filters the semester dropdown to only the semesters valid for that year (SY -> III/IV, TY -> V/VI, LY -> VII/VIII).

Selecting the year auto-routes the paper to the DQC that owns that year level; the assignee is shown before submit and can be overridden.

Paper sets carry a BT level tag of H (High) or M (Medium) instead of the current Easy/Medium/Hard label.

Printing and downloading live only in the Exam Coordinator login, and only after the DQC approves. Before approval the paper cannot be printed or downloaded anywhere; the designer and DQC screens keep a read-only internal preview with CO/BT columns visible.

The coordinator's Print direct button opens the exam-facing paper with Course Outcomes hidden and sends it straight to the printer; Download PDF / Word produces the same CO-free exam copy with the Somaiya logo in the page header.

New Index / Tracking dashboard: one row per assignment showing course, year, assigned DQC, submitter, submitted-at, and status — so it is clear at a glance who has and has not submitted.

Accounts, sign-up and password reset

Faculty self-registration: a Register screen (name, institution, department, email, password) creates the account with the designer (faculty) role. New accounts land in a pending state until an HOD approves them, so strangers cannot enter the department workspace.

HOD sees a Pending faculty list on their dashboard and approves or rejects; approval flips the profile to active and the faculty member gets a notification.

Forgot password link on the login screen for every role: email entry -> reset email -> /auth/reset screen to set a new password. Reset uses the built-in auth email flow, so no passwords are ever handled by app code.

Realtime notifications: the bell in the header subscribes to live inserts on notifications instead of polling every 15 seconds, so approval, assignment, decision and reminder events appear immediately. A notifications panel lists them with read/unread state.

Email the DQC when a paper is finalized

When a faculty member finalizes a paper, the system resolves the DQC for that year level, creates the assignment, and immediately emails that DQC — no waiting for them to notice an inbox.

The email is branded (Somaiya logo, course, class/semester, set count, who submitted, due date) and contains a Review and approve button that deep-links straight to /dqc/paper/<id> for that specific paper.

Clicking the link opens the review screen; if they are not signed in they land on login and are returned to the same paper afterwards. Approve/Return still happens on that screen, so nothing is approved by clicking an email link alone — that keeps a stray forwarded email from approving a paper.

The in-app DQC queue and bell notification stay as a backup view, but the email is the primary trigger.

Reminder emails reuse the same mechanism: an overdue assignment can re-email the DQC (or the faculty member) with the same deep link, throttled by the existing reminder counters.

Setup note: sending real email needs an email sending domain verified for the project. I will scaffold the templates and the sender; you (or IT) add the DNS records once, then mails go out. Until then the app falls back to in-app notifications only.

Submission reminders

The tracking dashboard flags any assignment past its due date with nothing submitted.

The Exam Coordinator (and HOD) can press Send reminder on such a row — individually or "remind all pending" — which writes a notification to the faculty member (delivered live via the bell) and records reminder_count / last_reminded_at on the assignment so nobody is spammed blindly.

Reminder history is visible on the row, and the faculty member's own dashboard shows an "Action required" banner for reminded papers.

Proposed database schema

Existing papers and notifications tables stay; new tables are added around them.

profiles            id (auth user), email, full_name, institution_id, department,
                    account_status (pending|active|rejected), approved_by, approved_at
institutions        id, code, name              -- powers the login portal selector
user_roles          id, user_id, role           -- enum: hod | dqc | designer | coord
dqc_scopes          id, user_id, year_level     -- enum: SY | TY | LY, one row per year a DQC owns
academic_years      id, label ("2026-27"), is_active
semesters           id, academic_year_id, year_level, label ("V"), is_active
paper_assignments   id, paper_id, assigned_by (HOD), assigned_to (DQC),
                    year_level, academic_year_id, semester_id,
                    status (assigned|in_review|approved|returned),
                    is_primary, due_at, submitted_at, decided_at, note,
                    reminder_count, last_reminded_at, last_reminded_by
notifications       (existing) + type (assignment|decision|reminder|approval), realtime enabled

papers gains: institution_id, year_level, academic_year_id, semester_id, and bt_level per set (stored inside the existing sets JSON as bt: "H" | "M").

Access rules in plain English:

A user only sees papers from their own institution.

HOD sees papers in their department, and every assignment they created.

DQC sees only papers assigned to them (through paper_assignments), which naturally limits them to their year levels.

Roles live in their own table and are checked through a security-definer helper, never read from a profile field.

Frontend views

View

Purpose

/ login

Institution selector + email/password sign in, links to register and forgot password

/auth/register

Faculty self-registration (name, institution, department, email, password)

/auth/forgot + /auth/reset

Request a reset email, then set a new password

/hod

HOD inbox: papers in the department, filter by year/semester/status, plus pending-faculty approvals

/hod/assign/$paperId

Pick academic year -> semester (filtered) -> auto-resolved DQC, confirm/override, assign

/dqc

Assigned-to-me queue, grouped by year level

/dqc/paper/$id

Existing review screen + BT (H/M) per set, approve / return

/index (tracking)

Table of all assignments: course, year, DQC, submitted by, submitted at, status, overdue flag, Send reminder

/designer/*

Existing generation flow, updated to the new year/semester dropdowns; no print/download

/coord

Coordinator inbox of DQC-approved papers only, with Print direct / Download PDF / Download Word per paper

/coord/print/$id

Exam-facing print view (coordinator-only): logo header, CO hidden, auto window.print()

Notifications panel

Realtime list from the header bell, mark-as-read

Routing logic and the overlap edge case

Resolution order when a year level is selected:

Look up all active DQC users whose dqc_scopes include that year level, scoped to the same institution and department.

Exactly one match -> assign automatically; the UI shows the resolved name.

No match -> block auto-assign, surface "No DQC configured for TY", and fall back to a manual picker for the HOD (paper stays unassigned, flagged on the tracking dashboard).

Two or more matches (overlap) -> do not guess. Two supported behaviours, chosen per department setting:

Choose one (default): the HOD sees a disambiguation dropdown of the matching DQCs, pre-selected by least current open load (round-robin tiebreak). One assignment row, is_primary = true.

Parallel review: create one paper_assignments row per matching DQC, all is_primary = false except the first. The paper is approved when all primary-eligible reviewers approve, and returned as soon as any one returns it, with all notes shown together.

This is why assignment is its own table rather than a column on papers: multiple reviewers, reassignment history, and per-reviewer submitted/decided timestamps all fall out of it, and the tracking dashboard is a straight read of that table.

Technical notes

Real Supabase auth replaces the current localStorage demo session; the _authenticated route gate protects HOD/DQC areas, and RLS policies scope every table by auth.uid() and role.

Year -> semester filtering is data-driven from semesters, not hardcoded, so a new academic year needs no code change.

DQC resolution runs in a server function so scope tables are not exposed to the browser.

PDF/Word export in src/lib/export.ts embeds the Somaiya logo as a base64 image in the page header, and emits the CO block only when includeCourseOutcomes is true — the coordinator's exam copy passes false.

Export and print are gated twice: the buttons render only for the coordinator role, and the underlying route/server function refuses any paper whose status is not approved, so an unapproved paper cannot be printed even by URL.

Migration is one step: create the new tables with grants and RLS, backfill existing papers to the current institution and derive year_level from className.

Registration creates the profile via a trigger on new auth users with account_status = 'pending'; a security-definer approval function flips it, callable only by an HOD of the same department. Signups stay email-confirmed (no auto-confirm, no anonymous access).

Password reset uses the platform's built-in reset email plus a /auth/reset page; if you want the reset mail branded with the Somaiya identity, that needs a verified sending domain — tell me and I will wire it.

Realtime notifications use a Supabase realtime subscription on notifications filtered to the signed-in user's email, replacing the 15-second polling in AppHeader.

Reminders are sent through a server function that verifies the caller is a coordinator or HOD, writes the notification, and increments the reminder counters.

The DQC email is a React Email template sent from the same server function that finalizes the paper, right after the assignment row is written, with an idempotency key per assignment so retries do not duplicate mail. Send failures are logged and never block finalization — the in-app assignment still exists.

Mobile / installable app (PWA)

The app gets a web app manifest plus Somaiya app icons, so faculty can open it in a phone browser and "Add to Home Screen" — it then launches full-screen with its own icon, like an app.

No offline mode: papers, AI generation and approvals all need the network, and an offline cache would risk showing stale paper data. Say the word if you want offline viewing of already-downloaded papers and I will add it properly.

Alongside installability, the screens faculty use most on a phone — login/register, notifications, the paper list and the tracking dashboard — get a mobile pass: stacked cards instead of wide tables, larger tap targets, and a bottom-safe-area-aware header.

Suggested build order

Migration: institutions, profiles (+status), roles, DQC scopes, academic years/semesters, assignments, notification types (+ grants and RLS).

Real auth: login with institution selector, faculty registration with HOD approval, forgot/reset password.

Year/semester cascading dropdowns and BT H/M set labels.

HOD assign flow with DQC resolution (including overlap handling).

DQC queue filtered by assignment.

Email sending domain + DQC "paper ready for review" email with deep link (queue stays as backup).

Tracking dashboard, realtime notification bell, and coordinator/HOD reminders (in-app + email).

Coordinator-only print/download of DQC-approved papers: CO hidden, Somaiya logo in the header.

PWA manifest, icons and mobile responsive pass.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0f9ad805-ac4f-493b-a584-97953814ec51).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
