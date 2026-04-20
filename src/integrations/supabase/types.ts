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
      images: {
        Row: {
          ai_description: string | null
          ai_error: string | null
          ai_palette: Json | null
          ai_status: string
          ai_tags: string[] | null
          created_at: string
          file_name: string | null
          height: number | null
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          ai_description?: string | null
          ai_error?: string | null
          ai_palette?: Json | null
          ai_status?: string
          ai_tags?: string[] | null
          created_at?: string
          file_name?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          ai_description?: string | null
          ai_error?: string | null
          ai_palette?: Json | null
          ai_status?: string
          ai_tags?: string[] | null
          created_at?: string
          file_name?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          brand_voice: string | null
          created_at: string
          current_period_end: string | null
          default_cta: string | null
          display_name: string | null
          email: string | null
          id: string
          plan: Database["public"]["Enums"]["plan_tier"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          brand_voice?: string | null
          created_at?: string
          current_period_end?: string | null
          default_cta?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          brand_voice?: string | null
          created_at?: string
          current_period_end?: string | null
          default_cta?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      slideshows: {
        Row: {
          created_at: string
          cta: string | null
          generation_error: string | null
          hook_style: string | null
          id: string
          image_ids: string[]
          slides: Json
          status: Database["public"]["Enums"]["slideshow_status"]
          target_audience: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cta?: string | null
          generation_error?: string | null
          hook_style?: string | null
          id?: string
          image_ids?: string[]
          slides?: Json
          status?: Database["public"]["Enums"]["slideshow_status"]
          target_audience?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cta?: string | null
          generation_error?: string | null
          hook_style?: string | null
          id?: string
          image_ids?: string[]
          slides?: Json
          status?: Database["public"]["Enums"]["slideshow_status"]
          target_audience?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage: {
        Row: {
          created_at: string
          id: string
          images_uploaded: number
          period_start: string
          slideshows_generated: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          images_uploaded?: number
          period_start?: string
          slideshows_generated?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          images_uploaded?: number
          period_start?: string
          slideshows_generated?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
    }
    Enums: {
      app_role: "admin" | "user"
      plan_tier: "none" | "starter" | "pro"
      slideshow_status: "draft" | "generating" | "ready" | "failed"
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
      app_role: ["admin", "user"],
      plan_tier: ["none", "starter", "pro"],
      slideshow_status: ["draft", "generating", "ready", "failed"],
    },
  },
} as const
