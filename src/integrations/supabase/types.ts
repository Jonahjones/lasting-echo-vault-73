export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_access_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          level_required: number
          name: string
          svg_icon: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          level_required: number
          name: string
          svg_icon: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          level_required?: number
          name?: string
          svg_icon?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at: string
          email: string | null
          full_name: string
          id: string
          invitation_status: string | null
          is_primary: boolean | null
          phone: string | null
          relationship: string | null
          role: Database["public"]["Enums"]["trusted_contact_role"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          invitation_status?: string | null
          is_primary?: boolean | null
          phone?: string | null
          relationship?: string | null
          role?: Database["public"]["Enums"]["trusted_contact_role"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          invitation_status?: string | null
          is_primary?: boolean | null
          phone?: string | null
          relationship?: string | null
          role?: Database["public"]["Enums"]["trusted_contact_role"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_prompts: {
        Row: {
          created_at: string
          date: string
          id: string
          prompt_text: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          prompt_text: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          prompt_text?: string
        }
        Relationships: []
      }
      daily_xp_caps: {
        Row: {
          action_type: string
          cap_date: string
          current_count: number
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          cap_date?: string
          current_count?: number
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          cap_date?: string
          current_count?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_logs: {
        Row: {
          attempted_at: string
          contact_id: string
          delivered_at: string | null
          delivery_method: string
          error_message: string | null
          id: string
          status: string
          video_id: string
        }
        Insert: {
          attempted_at?: string
          contact_id: string
          delivered_at?: string | null
          delivery_method: string
          error_message?: string | null
          id?: string
          status: string
          video_id: string
        }
        Update: {
          attempted_at?: string
          contact_id?: string
          delivered_at?: string | null
          delivery_method?: string
          error_message?: string | null
          id?: string
          status?: string
          video_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          first_video_recorded: boolean
          id: string
          last_name: string | null
          onboarding_completed: boolean
          tagline: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          first_video_recorded?: boolean
          id?: string
          last_name?: string | null
          onboarding_completed?: boolean
          tagline?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          first_video_recorded?: boolean
          id?: string
          last_name?: string | null
          onboarding_completed?: boolean
          tagline?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_gamification: {
        Row: {
          created_at: string
          current_level: number
          id: string
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          id?: string
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: number
          id?: string
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      video_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_user_id: string
          status: string
          video_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_user_id: string
          status?: string
          video_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_user_id?: string
          status?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_reports_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_shares: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          recipient_email: string
          recipient_id: string
          shared_at: string
          status: string
          updated_at: string
          video_id: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          recipient_email: string
          recipient_id: string
          shared_at?: string
          status?: string
          updated_at?: string
          video_id: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          recipient_email?: string
          recipient_id?: string
          shared_at?: string
          status?: string
          updated_at?: string
          video_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_shares_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration: string | null
          file_path: string | null
          file_size: number | null
          flag_reason: string | null
          flagged_at: string | null
          flagged_by_user_id: string | null
          id: string
          is_featured: boolean
          is_flagged: boolean
          is_public: boolean
          likes_count: number
          mime_type: string | null
          prompt: string | null
          scheduled_delivery_date: string | null
          shared_with_contacts: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          file_path?: string | null
          file_size?: number | null
          flag_reason?: string | null
          flagged_at?: string | null
          flagged_by_user_id?: string | null
          id?: string
          is_featured?: boolean
          is_flagged?: boolean
          is_public?: boolean
          likes_count?: number
          mime_type?: string | null
          prompt?: string | null
          scheduled_delivery_date?: string | null
          shared_with_contacts?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          file_path?: string | null
          file_size?: number | null
          flag_reason?: string | null
          flagged_at?: string | null
          flagged_by_user_id?: string | null
          id?: string
          is_featured?: boolean
          is_flagged?: boolean
          is_public?: boolean
          likes_count?: number
          mime_type?: string | null
          prompt?: string | null
          scheduled_delivery_date?: string | null
          shared_with_contacts?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      xp_config: {
        Row: {
          action_type: string
          created_at: string
          daily_cap: number
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
          xp_amount: number
        }
        Insert: {
          action_type: string
          created_at?: string
          daily_cap?: number
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          xp_amount: number
        }
        Update: {
          action_type?: string
          created_at?: string
          daily_cap?: number
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          xp_amount?: number
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          reference_id: string | null
          transaction_date: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          reference_id?: string | null
          transaction_date?: string
          user_id: string
          xp_amount: number
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          reference_id?: string | null
          transaction_date?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      admin_role: "super_admin" | "moderator"
      contact_type: "trusted" | "regular"
      trusted_contact_role: "executor" | "legacy_messenger" | "guardian"
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
      admin_role: ["super_admin", "moderator"],
      contact_type: ["trusted", "regular"],
      trusted_contact_role: ["executor", "legacy_messenger", "guardian"],
    },
  },
} as const
