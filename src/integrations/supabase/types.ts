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
      ai_decisions: {
        Row: {
          content_style_chosen: string | null
          created_at: string
          decision_type: string
          design_styles_chosen: string[] | null
          generation_mode_chosen: string | null
          hook_style_chosen: string | null
          hypothesis_id: string | null
          id: string
          reasoning: string | null
          slide_count_chosen: number | null
          slideshow_id: string | null
          user_id: string
        }
        Insert: {
          content_style_chosen?: string | null
          created_at?: string
          decision_type?: string
          design_styles_chosen?: string[] | null
          generation_mode_chosen?: string | null
          hook_style_chosen?: string | null
          hypothesis_id?: string | null
          id?: string
          reasoning?: string | null
          slide_count_chosen?: number | null
          slideshow_id?: string | null
          user_id: string
        }
        Update: {
          content_style_chosen?: string | null
          created_at?: string
          decision_type?: string
          design_styles_chosen?: string[] | null
          generation_mode_chosen?: string | null
          hook_style_chosen?: string | null
          hypothesis_id?: string | null
          id?: string
          reasoning?: string | null
          slide_count_chosen?: number | null
          slideshow_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      brand_identity: {
        Row: {
          accent_muted: string | null
          background_dark: string
          background_light: string
          body_font: string
          body_weight: string
          brand_name: string
          brand_tagline: string | null
          brand_url: string | null
          corner_radius: string
          created_at: string
          heading_font: string
          heading_weight: string
          id: string
          primary_color: string
          secondary_color: string | null
          slide_mood: string
          text_on_dark: string
          text_on_light: string
          updated_at: string
          use_brand_watermark: boolean
          use_dividers: boolean
          use_icons: boolean
          use_numbers: boolean
          user_id: string
        }
        Insert: {
          accent_muted?: string | null
          background_dark?: string
          background_light?: string
          body_font?: string
          body_weight?: string
          brand_name: string
          brand_tagline?: string | null
          brand_url?: string | null
          corner_radius?: string
          created_at?: string
          heading_font?: string
          heading_weight?: string
          id?: string
          primary_color?: string
          secondary_color?: string | null
          slide_mood?: string
          text_on_dark?: string
          text_on_light?: string
          updated_at?: string
          use_brand_watermark?: boolean
          use_dividers?: boolean
          use_icons?: boolean
          use_numbers?: boolean
          user_id: string
        }
        Update: {
          accent_muted?: string | null
          background_dark?: string
          background_light?: string
          body_font?: string
          body_weight?: string
          brand_name?: string
          brand_tagline?: string | null
          brand_url?: string | null
          corner_radius?: string
          created_at?: string
          heading_font?: string
          heading_weight?: string
          id?: string
          primary_color?: string
          secondary_color?: string | null
          slide_mood?: string
          text_on_dark?: string
          text_on_light?: string
          updated_at?: string
          use_brand_watermark?: boolean
          use_dividers?: boolean
          use_icons?: boolean
          use_numbers?: boolean
          user_id?: string
        }
        Relationships: []
      }
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
      generated_images: {
        Row: {
          created_at: string
          generation_model: string | null
          generation_time_ms: number | null
          id: string
          image_prompt: string
          image_url: string
          negative_space_position: string
          slide_index: number | null
          slideshow_id: string | null
          storage_path: string | null
          style_keywords: string[] | null
          text_placement: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          generation_model?: string | null
          generation_time_ms?: number | null
          id?: string
          image_prompt: string
          image_url: string
          negative_space_position?: string
          slide_index?: number | null
          slideshow_id?: string | null
          storage_path?: string | null
          style_keywords?: string[] | null
          text_placement?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          generation_model?: string | null
          generation_time_ms?: number | null
          id?: string
          image_prompt?: string
          image_url?: string
          negative_space_position?: string
          slide_index?: number | null
          slideshow_id?: string | null
          storage_path?: string | null
          style_keywords?: string[] | null
          text_placement?: Json
          user_id?: string
        }
        Relationships: []
      }
      generation_style_performance: {
        Row: {
          created_at: string
          id: string
          negative_space_position: string | null
          performance_score: number | null
          posted_slideshow_id: string | null
          style_keywords: string[] | null
          text_fill_color: string | null
          text_font_size: number | null
          text_stroke_color: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          negative_space_position?: string | null
          performance_score?: number | null
          posted_slideshow_id?: string | null
          style_keywords?: string[] | null
          text_fill_color?: string | null
          text_font_size?: number | null
          text_stroke_color?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          negative_space_position?: string | null
          performance_score?: number | null
          posted_slideshow_id?: string | null
          style_keywords?: string[] | null
          text_fill_color?: string | null
          text_font_size?: number | null
          text_stroke_color?: string | null
          user_id?: string
        }
        Relationships: []
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
      post_metrics: {
        Row: {
          comments: number
          engagement_rate: number
          fetched_at: string
          follows_gained: number
          id: string
          likes: number
          performance_score: number
          posted_slideshow_id: string
          raw_apify_data: Json | null
          shares: number
          user_id: string
          views: number
        }
        Insert: {
          comments?: number
          engagement_rate?: number
          fetched_at?: string
          follows_gained?: number
          id?: string
          likes?: number
          performance_score?: number
          posted_slideshow_id: string
          raw_apify_data?: Json | null
          shares?: number
          user_id: string
          views?: number
        }
        Update: {
          comments?: number
          engagement_rate?: number
          fetched_at?: string
          follows_gained?: number
          id?: string
          likes?: number
          performance_score?: number
          posted_slideshow_id?: string
          raw_apify_data?: Json | null
          shares?: number
          user_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_metrics_posted_slideshow_id_fkey"
            columns: ["posted_slideshow_id"]
            isOneToOne: false
            referencedRelation: "posted_slideshows"
            referencedColumns: ["id"]
          },
        ]
      }
      posted_slideshows: {
        Row: {
          all_slide_texts: string[]
          auto_imported: boolean
          caption: string | null
          created_at: string
          hook_text: string
          id: string
          image_ids: string[]
          last_synced_at: string | null
          posted_at: string
          slide_count: number
          slideshow_id: string | null
          style: string
          sync_status: string
          thumbnail_url: string | null
          tiktok_account_id: string | null
          tiktok_handle: string
          tiktok_post_url: string | null
          topic: string
          user_id: string
        }
        Insert: {
          all_slide_texts?: string[]
          auto_imported?: boolean
          caption?: string | null
          created_at?: string
          hook_text: string
          id?: string
          image_ids?: string[]
          last_synced_at?: string | null
          posted_at?: string
          slide_count: number
          slideshow_id?: string | null
          style?: string
          sync_status?: string
          thumbnail_url?: string | null
          tiktok_account_id?: string | null
          tiktok_handle: string
          tiktok_post_url?: string | null
          topic?: string
          user_id: string
        }
        Update: {
          all_slide_texts?: string[]
          auto_imported?: boolean
          caption?: string | null
          created_at?: string
          hook_text?: string
          id?: string
          image_ids?: string[]
          last_synced_at?: string | null
          posted_at?: string
          slide_count?: number
          slideshow_id?: string | null
          style?: string
          sync_status?: string
          thumbnail_url?: string | null
          tiktok_account_id?: string | null
          tiktok_handle?: string
          tiktok_post_url?: string | null
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posted_slideshows_slideshow_id_fkey"
            columns: ["slideshow_id"]
            isOneToOne: false
            referencedRelation: "slideshows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posted_slideshows_tiktok_account_id_fkey"
            columns: ["tiktok_account_id"]
            isOneToOne: false
            referencedRelation: "tiktok_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apify_sync_enabled: boolean
          brand_voice: string | null
          created_at: string
          current_period_end: string | null
          default_cta: string | null
          default_image_source: string
          display_name: string | null
          email: string | null
          id: string
          insights_last_seen_at: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          target_audience: string | null
          tiktok_handle: string | null
          updated_at: string
        }
        Insert: {
          apify_sync_enabled?: boolean
          brand_voice?: string | null
          created_at?: string
          current_period_end?: string | null
          default_cta?: string | null
          default_image_source?: string
          display_name?: string | null
          email?: string | null
          id: string
          insights_last_seen_at?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          target_audience?: string | null
          tiktok_handle?: string | null
          updated_at?: string
        }
        Update: {
          apify_sync_enabled?: boolean
          brand_voice?: string | null
          created_at?: string
          current_period_end?: string | null
          default_cta?: string | null
          default_image_source?: string
          display_name?: string | null
          email?: string | null
          id?: string
          insights_last_seen_at?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          target_audience?: string | null
          tiktok_handle?: string | null
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
      slide_templates: {
        Row: {
          created_at: string
          html_template: string
          id: string
          is_system: boolean
          layout_type: string
          name: string
          preview_svg: string | null
          suitable_for: string[]
        }
        Insert: {
          created_at?: string
          html_template: string
          id?: string
          is_system?: boolean
          layout_type: string
          name: string
          preview_svg?: string | null
          suitable_for?: string[]
        }
        Update: {
          created_at?: string
          html_template?: string
          id?: string
          is_system?: boolean
          layout_type?: string
          name?: string
          preview_svg?: string | null
          suitable_for?: string[]
        }
        Relationships: []
      }
      slideshows: {
        Row: {
          ai_decided: boolean
          all_slide_texts: string[] | null
          content_style: string | null
          created_at: string
          cta: string | null
          cta_text: string | null
          design_styles: string[] | null
          generation_error: string | null
          generation_mode: string
          generation_progress: Json
          hook_style: string | null
          hook_text: string | null
          icons_used: string[] | null
          id: string
          image_ids: string[]
          num_slides: number
          slides: Json
          status: Database["public"]["Enums"]["slideshow_status"]
          target_audience: string | null
          templates_used: string[] | null
          title: string
          topic: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          ai_decided?: boolean
          all_slide_texts?: string[] | null
          content_style?: string | null
          created_at?: string
          cta?: string | null
          cta_text?: string | null
          design_styles?: string[] | null
          generation_error?: string | null
          generation_mode?: string
          generation_progress?: Json
          hook_style?: string | null
          hook_text?: string | null
          icons_used?: string[] | null
          id?: string
          image_ids?: string[]
          num_slides?: number
          slides?: Json
          status?: Database["public"]["Enums"]["slideshow_status"]
          target_audience?: string | null
          templates_used?: string[] | null
          title?: string
          topic?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          ai_decided?: boolean
          all_slide_texts?: string[] | null
          content_style?: string | null
          created_at?: string
          cta?: string | null
          cta_text?: string | null
          design_styles?: string[] | null
          generation_error?: string | null
          generation_mode?: string
          generation_progress?: Json
          hook_style?: string | null
          hook_text?: string | null
          icons_used?: string[] | null
          id?: string
          image_ids?: string[]
          num_slides?: number
          slides?: Json
          status?: Database["public"]["Enums"]["slideshow_status"]
          target_audience?: string | null
          templates_used?: string[] | null
          title?: string
          topic?: string | null
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
      tiktok_accounts: {
        Row: {
          created_at: string
          handle: string
          id: string
          label: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          last_synced_at: string | null
          sync_enabled: boolean
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          handle: string
          id?: string
          label?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          sync_enabled?: boolean
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          handle?: string
          id?: string
          label?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage: {
        Row: {
          ai_cost_cents: number
          created_at: string
          designed_slideshows_generated: number
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
          designed_slideshows_generated?: number
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
          designed_slideshows_generated?: number
          id?: string
          images_uploaded?: number
          period_start?: string
          slideshows_generated?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_insights: {
        Row: {
          best_image_types: string[]
          best_posting_topics: string[]
          best_slide_count: number | null
          best_style: string | null
          generated_at: string
          id: string
          insight_summary: string
          is_current: boolean
          next_hook_suggestion: string | null
          posts_analyzed: number
          raw_analysis: Json | null
          top_hook_patterns: string[]
          user_id: string
          worst_hook_patterns: string[]
        }
        Insert: {
          best_image_types?: string[]
          best_posting_topics?: string[]
          best_slide_count?: number | null
          best_style?: string | null
          generated_at?: string
          id?: string
          insight_summary: string
          is_current?: boolean
          next_hook_suggestion?: string | null
          posts_analyzed: number
          raw_analysis?: Json | null
          top_hook_patterns?: string[]
          user_id: string
          worst_hook_patterns?: string[]
        }
        Update: {
          best_image_types?: string[]
          best_posting_topics?: string[]
          best_slide_count?: number | null
          best_style?: string | null
          generated_at?: string
          id?: string
          insight_summary?: string
          is_current?: boolean
          next_hook_suggestion?: string | null
          posts_analyzed?: number
          raw_analysis?: Json | null
          top_hook_patterns?: string[]
          user_id?: string
          worst_hook_patterns?: string[]
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
          allowed_generation_modes: string[]
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
          allowed_generation_modes?: string[]
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
          allowed_generation_modes?: string[]
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
