import { supabase } from "@/integrations/supabase/client";
import type { PaperStatus, YearLevel } from "@/lib/types";

export interface AcademicYearRow {
  id: string;
  label: string;
  is_active: boolean;
}

export interface SemesterRow {
  id: string;
  label: string;
  year_level: YearLevel;
  academic_year_id: string;
  is_active: boolean;
}

export const academicYearsQuery = {
  queryKey: ["academic-years"],
  queryFn: async (): Promise<AcademicYearRow[]> => {
    const { data } = await supabase
      .from("academic_years")
      .select("id, label, is_active")
      .order("label", { ascending: false });
    return data ?? [];
  },
};

export const semestersQuery = {
  queryKey: ["semesters"],
  queryFn: async (): Promise<SemesterRow[]> => {
    const { data } = await supabase
      .from("semesters")
      .select("id, label, year_level, academic_year_id, is_active")
      .order("label");
    return data ?? [];
  },
};

export interface PaperRow {
  id: string;
  course_code: string;
  course_name: string;
  class_name: string;
  exam_type: string;
  department: string;
  year_level: YearLevel | null;
  status: PaperStatus;
  duration_minutes: number;
  max_marks: number;
  course_outcomes: unknown;
  sets: unknown;
  academic_year_id: string | null;
  semester_id: string | null;
  created_by: string;
  created_at: string;
  finalized_at: string | null;
}

export async function fetchPaper(id: string): Promise<PaperRow | null> {
  const { data } = await supabase.from("papers").select("*").eq("id", id).maybeSingle();
  return (data as PaperRow | null) ?? null;
}
