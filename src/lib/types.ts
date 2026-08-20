export type YearLevel = "SY" | "TY" | "LY";
export type AppRole = "hod" | "dqc" | "designer" | "coord";
export type BtLevel = "H" | "M";
export type AccountStatus = "pending" | "active" | "rejected";
export type PaperStatus = "draft" | "submitted" | "in_review" | "approved" | "returned";
export type AssignmentStatus = "assigned" | "in_review" | "approved" | "returned";

export interface PaperQuestion {
  no: string;
  text: string;
  marks: number;
  co: string;
  bt: BtLevel;
}

export interface PaperSet {
  label: string;
  bt: BtLevel;
  questions: PaperQuestion[];
}

export const YEAR_LEVEL_LABELS: Record<YearLevel, string> = {
  SY: "Second Year (SY)",
  TY: "Third Year (TY)",
  LY: "Final Year (LY)",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  hod: "Head of Department",
  dqc: "Department Quality Cell",
  designer: "Faculty (paper designer)",
  coord: "Exam Coordinator",
};

export const BT_LABELS: Record<BtLevel, string> = {
  H: "High",
  M: "Medium",
};

export const roleHome: Record<AppRole, string> = {
  hod: "/hod",
  dqc: "/dqc",
  coord: "/coord",
  designer: "/designer",
};

export function safeSets(value: unknown): PaperSet[] {
  if (!Array.isArray(value)) return [];
  return value as PaperSet[];
}

export function safeOutcomes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}
