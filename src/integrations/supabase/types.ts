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
      feedback: {
        Row: {
          body: string
          created_at: string
          email: string | null
          id: string
          subject: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          email?: string | null
          id?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          email?: string | null
          id?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          auto: boolean
          created_at: string
          id: string
          name: string
          system: boolean
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          auto?: boolean
          created_at?: string
          id?: string
          name: string
          system?: boolean
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          auto?: boolean
          created_at?: string
          id?: string
          name?: string
          system?: boolean
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      image_folders: {
        Row: {
          created_at: string
          folder_id: string
          image_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_id: string
          image_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string
          image_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_folders_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_folders_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
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
          is_product_shot: boolean
          mime_type: string | null
          quality: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string
          user_id: string
          width: number | null
          workspace_id: string | null
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
          is_product_shot?: boolean
          mime_type?: string | null
          quality?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          user_id: string
          width?: number | null
          workspace_id?: string | null
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
          is_product_shot?: boolean
          mime_type?: string | null
          quality?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          user_id?: string
          width?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "images_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          brand_voice: string | null
          created_at: string
          current_period_end: string | null
          default_cta: string | null
          default_image_source: string
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
          default_image_source?: string
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
          default_image_source?: string
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
      release_note_comments: {
        Row: {
          author_name: string | null
          body: string
          created_at: string
          id: string
          release_note_id: string
        }
        Insert: {
          author_name?: string | null
          body: string
          created_at?: string
          id?: string
          release_note_id: string
        }
        Update: {
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          release_note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_note_comments_release_note_id_fkey"
            columns: ["release_note_id"]
            isOneToOne: false
            referencedRelation: "release_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      release_note_updates: {
        Row: {
          body: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          release_note_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          release_note_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          release_note_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_note_updates_release_note_id_fkey"
            columns: ["release_note_id"]
            isOneToOne: false
            referencedRelation: "release_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      release_notes: {
        Row: {
          body: string | null
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          published_at: string
          sort_order: number
          status: string
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          published_at?: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          published_at?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          version?: string | null
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
          num_slides: number
          slides: Json
          status: Database["public"]["Enums"]["slideshow_status"]
          target_audience: string | null
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          cta?: string | null
          generation_error?: string | null
          hook_style?: string | null
          id?: string
          image_ids?: string[]
          num_slides?: number
          slides?: Json
          status?: Database["public"]["Enums"]["slideshow_status"]
          target_audience?: string | null
          title?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          cta?: string | null
          generation_error?: string | null
          hook_style?: string | null
          id?: string
          image_ids?: string[]
          num_slides?: number
          slides?: Json
          status?: Database["public"]["Enums"]["slideshow_status"]
          target_audience?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slideshows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_images: {
        Row: {
          ai_description: string
          ai_tags: string[]
          category: string
          created_at: string
          filename: string
          id: string
          public_url: string
          storage_path: string
        }
        Insert: {
          ai_description?: string
          ai_tags?: string[]
          category?: string
          created_at?: string
          filename: string
          id?: string
          public_url: string
          storage_path: string
        }
        Update: {
          ai_description?: string
          ai_tags?: string[]
          category?: string
          created_at?: string
          filename?: string
          id?: string
          public_url?: string
          storage_path?: string
        }
        Relationships: []
      }
      usage: {
        Row: {
          ai_cost_cents: number
          created_at: string
          id: string
          images_uploaded: number
          period_start: string
          slideshows_generated: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_cost_cents?: number
          created_at?: string
          id?: string
          images_uploaded?: number
          period_start?: string
          slideshows_generated?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_cost_cents?: number
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
      workspaces: {
        Row: {
          brand_voice: string | null
          created_at: string
          default_cta: string | null
          id: string
          name: string
          story_style_history: Json
          tagline: string | null
          target_audience: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_voice?: string | null
          created_at?: string
          default_cta?: string | null
          id?: string
          name?: string
          story_style_history?: Json
          tagline?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_voice?: string | null
          created_at?: string
          default_cta?: string | null
          id?: string
          name?: string
          story_style_history?: Json
          tagline?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_increment_ai_cost: {
        Args: { _cost_cents: number; _user_id: string }
        Returns: boolean
      }
      create_workspace_with_folder: {
        Args: {
          _audience: string
          _brand_voice: string
          _cta: string
          _name: string
          _tagline: string
        }
        Returns: string
      }
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
