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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string | null
          chinese_content_traditional: string | null
          chinese_title_traditional: string | null
          church_id: string | null
          created_at: string
          english_content: string | null
          english_title: string
          id: string
          is_published: boolean
          published_at: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          chinese_content_traditional?: string | null
          chinese_title_traditional?: string | null
          church_id?: string | null
          created_at?: string
          english_content?: string | null
          english_title: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          chinese_content_traditional?: string | null
          chinese_title_traditional?: string | null
          church_id?: string | null
          created_at?: string
          english_content?: string | null
          english_title?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      churches: {
        Row: {
          chinese_name_traditional: string | null
          contact_email: string
          contact_person: string
          contact_phone: string | null
          created_at: string
          district_or_address: string | null
          english_name: string
          id: string
          logo_url: string | null
          status: Database["public"]["Enums"]["church_status"]
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          chinese_name_traditional?: string | null
          contact_email: string
          contact_person: string
          contact_phone?: string | null
          created_at?: string
          district_or_address?: string | null
          english_name: string
          id?: string
          logo_url?: string | null
          status?: Database["public"]["Enums"]["church_status"]
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          chinese_name_traditional?: string | null
          contact_email?: string
          contact_person?: string
          contact_phone?: string | null
          created_at?: string
          district_or_address?: string | null
          english_name?: string
          id?: string
          logo_url?: string | null
          status?: Database["public"]["Enums"]["church_status"]
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      class_church_assignments: {
        Row: {
          church_id: string
          class_id: string
          created_at: string
          id: string
        }
        Insert: {
          church_id: string
          class_id: string
          created_at?: string
          id?: string
        }
        Update: {
          church_id?: string
          class_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_church_assignments_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_church_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          access_end: string | null
          access_start: string | null
          approval_mode: Database["public"]["Enums"]["approval_mode"]
          chinese_description_traditional: string | null
          chinese_title_traditional: string | null
          created_at: string
          english_description: string | null
          english_title: string
          enrollment_end: string | null
          enrollment_start: string | null
          gender_requirement: string | null
          id: string
          max_age: number | null
          max_enrollment: number | null
          min_age: number | null
          owner_church_id: string | null
          owner_type: Database["public"]["Enums"]["class_owner_type"]
          prerequisites: string | null
          retake_policy: string | null
          status: Database["public"]["Enums"]["class_status"]
          updated_at: string
        }
        Insert: {
          access_end?: string | null
          access_start?: string | null
          approval_mode?: Database["public"]["Enums"]["approval_mode"]
          chinese_description_traditional?: string | null
          chinese_title_traditional?: string | null
          created_at?: string
          english_description?: string | null
          english_title: string
          enrollment_end?: string | null
          enrollment_start?: string | null
          gender_requirement?: string | null
          id?: string
          max_age?: number | null
          max_enrollment?: number | null
          min_age?: number | null
          owner_church_id?: string | null
          owner_type?: Database["public"]["Enums"]["class_owner_type"]
          prerequisites?: string | null
          retake_policy?: string | null
          status?: Database["public"]["Enums"]["class_status"]
          updated_at?: string
        }
        Update: {
          access_end?: string | null
          access_start?: string | null
          approval_mode?: Database["public"]["Enums"]["approval_mode"]
          chinese_description_traditional?: string | null
          chinese_title_traditional?: string | null
          created_at?: string
          english_description?: string | null
          english_title?: string
          enrollment_end?: string | null
          enrollment_start?: string | null
          gender_requirement?: string | null
          id?: string
          max_age?: number | null
          max_enrollment?: number | null
          min_age?: number | null
          owner_church_id?: string | null
          owner_type?: Database["public"]["Enums"]["class_owner_type"]
          prerequisites?: string | null
          retake_policy?: string | null
          status?: Database["public"]["Enums"]["class_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_owner_church_id_fkey"
            columns: ["owner_church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          advisory_result: string | null
          church_id: string
          class_id: string
          created_at: string
          id: string
          member_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["enrollment_status"]
          updated_at: string
        }
        Insert: {
          advisory_result?: string | null
          church_id: string
          class_id: string
          created_at?: string
          id?: string
          member_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
        }
        Update: {
          advisory_result?: string | null
          church_id?: string
          class_id?: string
          created_at?: string
          id?: string
          member_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_bookmarks: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          chinese_title_traditional: string | null
          class_id: string
          created_at: string
          english_title: string
          file_url: string | null
          id: string
          is_published: boolean
          sort_order: number
          type: Database["public"]["Enums"]["material_type"]
          updated_at: string
        }
        Insert: {
          chinese_title_traditional?: string | null
          class_id: string
          created_at?: string
          english_title: string
          file_url?: string | null
          id?: string
          is_published?: boolean
          sort_order?: number
          type?: Database["public"]["Enums"]["material_type"]
          updated_at?: string
        }
        Update: {
          chinese_title_traditional?: string | null
          class_id?: string
          created_at?: string
          english_title?: string
          file_url?: string | null
          id?: string
          is_published?: boolean
          sort_order?: number
          type?: Database["public"]["Enums"]["material_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          chinese_message_traditional: string | null
          chinese_title_traditional: string | null
          created_at: string
          english_message: string | null
          english_title: string | null
          id: string
          is_read: boolean
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          chinese_message_traditional?: string | null
          chinese_title_traditional?: string | null
          created_at?: string
          english_message?: string | null
          english_title?: string | null
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id: string
        }
        Update: {
          chinese_message_traditional?: string | null
          chinese_title_traditional?: string | null
          created_at?: string
          english_message?: string | null
          english_title?: string | null
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          chinese_name_traditional: string | null
          church_id: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          english_name: string
          gender: string | null
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          chinese_name_traditional?: string | null
          church_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          english_name: string
          gender?: string | null
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          chinese_name_traditional?: string | null
          church_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          english_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
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
      get_user_church_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "church_admin" | "member"
      approval_mode: "auto" | "manual"
      church_status: "pending" | "active" | "inactive" | "disabled" | "archived"
      class_owner_type: "platform" | "church"
      class_status:
        | "draft"
        | "published"
        | "open"
        | "closed"
        | "archived"
        | "cancelled"
      enrollment_status:
        | "pending"
        | "approved"
        | "rejected"
        | "withdrawn"
        | "completed"
      material_type: "document" | "video" | "audio" | "link" | "image"
      member_status: "active" | "inactive" | "disabled" | "pending"
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
      app_role: ["super_admin", "church_admin", "member"],
      approval_mode: ["auto", "manual"],
      church_status: ["pending", "active", "inactive", "disabled", "archived"],
      class_owner_type: ["platform", "church"],
      class_status: [
        "draft",
        "published",
        "open",
        "closed",
        "archived",
        "cancelled",
      ],
      enrollment_status: [
        "pending",
        "approved",
        "rejected",
        "withdrawn",
        "completed",
      ],
      material_type: ["document", "video", "audio", "link", "image"],
      member_status: ["active", "inactive", "disabled", "pending"],
    },
  },
} as const
