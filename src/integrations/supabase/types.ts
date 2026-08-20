export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          id: string
          is_active: boolean
          label: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          label: string
        }
        Update: {
          id?: string
          is_active?: boolean
          label?: string
        }
        Relationships: []
      }
      dqc_scopes: {
        Row: {
          id: string
          user_id: string
          year_level: Database["public"]["Enums"]["year_level"]
        }
        Insert: {
          id?: string
          user_id: string
          year_level: Database["public"]["Enums"]["year_level"]
        }
        Update: {
          id?: string
          user_id?: string
          year_level?: Database["public"]["Enums"]["year_level"]
        }
        Relationships: []
      }
      institutions: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      paper_assignments: {
        Row: {
          academic_year_id: string | null
          assigned_by: string | null
          assigned_to: string | null
          created_at: string
          decided_at: string | null
          due_at: string | null
          id: string
          is_primary: boolean
          last_reminded_at: string | null
          last_reminded_by: string | null
          note: string | null
          paper_id: string
          reminder_count: number
          semester_id: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          submitted_at: string | null
          year_level: Database["public"]["Enums"]["year_level"] | null
        }
        Insert: {
          academic_year_id?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          created_at?: string
          decided_at?: string | null
          due_at?: string | null
          id?: string
          is_primary?: boolean
          last_reminded_at?: string | null
          last_reminded_by?: string | null
          note?: string | null
          paper_id: string
          reminder_count?: number
          semester_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          submitted_at?: string | null
          year_level?: Database["public"]["Enums"]["year_level"] | null
        }
        Update: {
          academic_year_id?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          created_at?: string
          decided_at?: string | null
          due_at?: string | null
          id?: string
          is_primary?: boolean
          last_reminded_at?: string | null
          last_reminded_by?: string | null
          note?: string | null
          paper_id?: string
          reminder_count?: number
          semester_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          submitted_at?: string | null
          year_level?: Database["public"]["Enums"]["year_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "paper_assignments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_assignments_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_assignments_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      papers: {
        Row: {
          academic_year_id: string | null
          class_name: string
          course_code: string
          course_name: string
          course_outcomes: Json
          created_at: string
          created_by: string
          department: string
          duration_minutes: number
          exam_type: string
          finalized_at: string | null
          id: string
          institution_id: string | null
          max_marks: number
          semester_id: string | null
          sets: Json
          status: Database["public"]["Enums"]["paper_status"]
          updated_at: string
          year_level: Database["public"]["Enums"]["year_level"] | null
        }
        Insert: {
          academic_year_id?: string | null
          class_name?: string
          course_code?: string
          course_name: string
          course_outcomes?: Json
          created_at?: string
          created_by: string
          department?: string
          duration_minutes?: number
          exam_type?: string
          finalized_at?: string | null
          id?: string
          institution_id?: string | null
          max_marks?: number
          semester_id?: string | null
          sets?: Json
          status?: Database["public"]["Enums"]["paper_status"]
          updated_at?: string
          year_level?: Database["public"]["Enums"]["year_level"] | null
        }
        Update: {
          academic_year_id?: string | null
          class_name?: string
          course_code?: string
          course_name?: string
          course_outcomes?: Json
          created_at?: string
          created_by?: string
          department?: string
          duration_minutes?: number
          exam_type?: string
          finalized_at?: string | null
          id?: string
          institution_id?: string | null
          max_marks?: number
          semester_id?: string | null
          sets?: Json
          status?: Database["public"]["Enums"]["paper_status"]
          updated_at?: string
          year_level?: Database["public"]["Enums"]["year_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "papers_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papers_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          approved_at: string | null
          approved_by: string | null
          created_at: string
          department: string
          email: string
          full_name: string
          id: string
          institution_id: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          department?: string
          email: string
          full_name?: string
          id: string
          institution_id?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          department?: string
          email?: string
          full_name?: string
          id?: string
          institution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          academic_year_id: string
          id: string
          is_active: boolean
          label: string
          year_level: Database["public"]["Enums"]["year_level"]
        }
        Insert: {
          academic_year_id: string
          id?: string
          is_active?: boolean
          label: string
          year_level: Database["public"]["Enums"]["year_level"]
        }
        Update: {
          academic_year_id?: string
          id?: string
          is_active?: boolean
          label?: string
          year_level?: Database["public"]["Enums"]["year_level"]
        }
        Relationships: [
          {
            foreignKeyName: "semesters_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_department: { Args: never; Returns: string }
      my_institution: { Args: never; Returns: string }
      set_faculty_status: {
        Args: {
          _status: Database["public"]["Enums"]["account_status"]
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "pending" | "active" | "rejected"
      app_role: "hod" | "dqc" | "designer" | "coord"
      assignment_status: "assigned" | "in_review" | "approved" | "returned"
      notification_type: "assignment" | "decision" | "reminder" | "approval"
      paper_status:
        | "draft"
        | "submitted"
        | "in_review"
        | "approved"
        | "returned"
      year_level: "SY" | "TY" | "LY"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["pending", "active", "rejected"],
      app_role: ["hod", "dqc", "designer", "coord"],
      assignment_status: ["assigned", "in_review", "approved", "returned"],
      notification_type: ["assignment", "decision", "reminder", "approval"],
      paper_status: ["draft", "submitted", "in_review", "approved", "returned"],
      year_level: ["SY", "TY", "LY"],
    },
  },
} as const
