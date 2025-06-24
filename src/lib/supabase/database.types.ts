export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      chat_log_revisions: {
        Row: {
          created_at: string
          id: string
          original_log_id: string
          revised_answer: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_log_id: string
          revised_answer: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          original_log_id?: string
          revised_answer?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_original_log"
            columns: ["original_log_id"]
            isOneToOne: false
            referencedRelation: "chat_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_logs: {
        Row: {
          bot_response: string
          chatbot_id: string
          conversation_id: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          revised_answer: string | null
          source: string | null
          user_feedback: string | null
          user_message: string
        }
        Insert: {
          bot_response: string
          chatbot_id: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          revised_answer?: string | null
          source?: string | null
          user_feedback?: string | null
          user_message: string
        }
        Update: {
          bot_response?: string
          chatbot_id?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          revised_answer?: string | null
          source?: string | null
          user_feedback?: string | null
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_logs_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbots: {
        Row: {
          allow_embedding: boolean
          api_key: string | null
          auto_open_chat_window: boolean | null
          auto_open_delay_seconds: number | null
          chat_bubble_button_color: string | null
          chat_icon_size: number | null
          chat_icon_url: string | null
          collect_user_feedback: boolean | null
          created_at: string
          description: string | null
          display_name: string | null
          draft_auto_open_chat_window: boolean | null
          draft_auto_open_delay_seconds: number | null
          draft_chat_bubble_button_color: string | null
          draft_chat_icon_size: number | null
          draft_chat_icon_url: string | null
          draft_collect_user_feedback: boolean | null
          draft_display_name: string | null
          draft_enable_splash_screen: boolean | null
          draft_footer_text: string | null
          draft_hide_logo: boolean | null
          draft_initial_messages: string[] | null
          draft_is_published: boolean | null
          draft_message_contexts: Json | null
          draft_message_placeholder: string | null
          draft_model: string | null
          draft_profile_picture_url: string | null
          draft_regenerate_messages: boolean | null
          draft_show_footer: boolean | null
          draft_show_sources_with_response: boolean | null
          draft_splash_background_image_url: string | null
          draft_splash_headline_text: string | null
          draft_splash_subheadline_text: string | null
          draft_suggested_messages: string[] | null
          draft_system_prompt: string | null
          draft_tease_delay_seconds: number | null
          draft_tease_initial_messages: boolean | null
          draft_temperature: number | null
          draft_theme: string | null
          draft_user_message_color: string | null
          enable_splash_screen: boolean
          footer_text: string | null
          hide_logo: boolean
          id: string
          initial_messages: string[] | null
          is_active: boolean | null
          is_published: boolean | null
          message_contexts: Json | null
          message_placeholder: string | null
          model: string | null
          name: string
          profile_picture_url: string | null
          regenerate_messages: boolean | null
          show_footer: boolean
          show_sources_with_response: boolean | null
          splash_background_image_url: string | null
          splash_headline_text: string | null
          splash_subheadline_text: string | null
          suggested_messages: string[] | null
          system_prompt: string
          tease_delay_seconds: number | null
          tease_initial_messages: boolean | null
          temperature: number | null
          theme: string | null
          updated_at: string
          user_id: string
          user_message_color: string | null
        }
        Insert: {
          allow_embedding?: boolean
          api_key?: string | null
          auto_open_chat_window?: boolean | null
          auto_open_delay_seconds?: number | null
          chat_bubble_button_color?: string | null
          chat_icon_size?: number | null
          chat_icon_url?: string | null
          collect_user_feedback?: boolean | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          draft_auto_open_chat_window?: boolean | null
          draft_auto_open_delay_seconds?: number | null
          draft_chat_bubble_button_color?: string | null
          draft_chat_icon_size?: number | null
          draft_chat_icon_url?: string | null
          draft_collect_user_feedback?: boolean | null
          draft_display_name?: string | null
          draft_enable_splash_screen?: boolean | null
          draft_footer_text?: string | null
          draft_hide_logo?: boolean | null
          draft_initial_messages?: string[] | null
          draft_is_published?: boolean | null
          draft_message_contexts?: Json | null
          draft_message_placeholder?: string | null
          draft_model?: string | null
          draft_profile_picture_url?: string | null
          draft_regenerate_messages?: boolean | null
          draft_show_footer?: boolean | null
          draft_show_sources_with_response?: boolean | null
          draft_splash_background_image_url?: string | null
          draft_splash_headline_text?: string | null
          draft_splash_subheadline_text?: string | null
          draft_suggested_messages?: string[] | null
          draft_system_prompt?: string | null
          draft_tease_delay_seconds?: number | null
          draft_tease_initial_messages?: boolean | null
          draft_temperature?: number | null
          draft_theme?: string | null
          draft_user_message_color?: string | null
          enable_splash_screen?: boolean
          footer_text?: string | null
          hide_logo?: boolean
          id?: string
          initial_messages?: string[] | null
          is_active?: boolean | null
          is_published?: boolean | null
          message_contexts?: Json | null
          message_placeholder?: string | null
          model?: string | null
          name: string
          profile_picture_url?: string | null
          regenerate_messages?: boolean | null
          show_footer?: boolean
          show_sources_with_response?: boolean | null
          splash_background_image_url?: string | null
          splash_headline_text?: string | null
          splash_subheadline_text?: string | null
          suggested_messages?: string[] | null
          system_prompt?: string
          tease_delay_seconds?: number | null
          tease_initial_messages?: boolean | null
          temperature?: number | null
          theme?: string | null
          updated_at?: string
          user_id: string
          user_message_color?: string | null
        }
        Update: {
          allow_embedding?: boolean
          api_key?: string | null
          auto_open_chat_window?: boolean | null
          auto_open_delay_seconds?: number | null
          chat_bubble_button_color?: string | null
          chat_icon_size?: number | null
          chat_icon_url?: string | null
          collect_user_feedback?: boolean | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          draft_auto_open_chat_window?: boolean | null
          draft_auto_open_delay_seconds?: number | null
          draft_chat_bubble_button_color?: string | null
          draft_chat_icon_size?: number | null
          draft_chat_icon_url?: string | null
          draft_collect_user_feedback?: boolean | null
          draft_display_name?: string | null
          draft_enable_splash_screen?: boolean | null
          draft_footer_text?: string | null
          draft_hide_logo?: boolean | null
          draft_initial_messages?: string[] | null
          draft_is_published?: boolean | null
          draft_message_contexts?: Json | null
          draft_message_placeholder?: string | null
          draft_model?: string | null
          draft_profile_picture_url?: string | null
          draft_regenerate_messages?: boolean | null
          draft_show_footer?: boolean | null
          draft_show_sources_with_response?: boolean | null
          draft_splash_background_image_url?: string | null
          draft_splash_headline_text?: string | null
          draft_splash_subheadline_text?: string | null
          draft_suggested_messages?: string[] | null
          draft_system_prompt?: string | null
          draft_tease_delay_seconds?: number | null
          draft_tease_initial_messages?: boolean | null
          draft_temperature?: number | null
          draft_theme?: string | null
          draft_user_message_color?: string | null
          enable_splash_screen?: boolean
          footer_text?: string | null
          hide_logo?: boolean
          id?: string
          initial_messages?: string[] | null
          is_active?: boolean | null
          is_published?: boolean | null
          message_contexts?: Json | null
          message_placeholder?: string | null
          model?: string | null
          name?: string
          profile_picture_url?: string | null
          regenerate_messages?: boolean | null
          show_footer?: boolean
          show_sources_with_response?: boolean | null
          splash_background_image_url?: string | null
          splash_headline_text?: string | null
          splash_subheadline_text?: string | null
          suggested_messages?: string[] | null
          system_prompt?: string
          tease_delay_seconds?: number | null
          tease_initial_messages?: boolean | null
          temperature?: number | null
          theme?: string | null
          updated_at?: string
          user_id?: string
          user_message_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_jobs: {
        Row: {
          chatbot_id: string
          created_at: string
          error: string | null
          id: string
          options: Json
          progress: Json
          results: Json | null
          sitemap_url: string | null
          start_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chatbot_id: string
          created_at?: string
          error?: string | null
          id?: string
          options?: Json
          progress?: Json
          results?: Json | null
          sitemap_url?: string | null
          start_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chatbot_id?: string
          created_at?: string
          error?: string | null
          id?: string
          options?: Json
          progress?: Json
          results?: Json | null
          sitemap_url?: string | null
          start_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawl_jobs_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      document_stats: {
        Row: {
          char_count: number
          chatbot_id: string
          created_at: string
          id: string
          source_type: string | null
          training_source_id: string
          user_id: string
        }
        Insert: {
          char_count?: number
          chatbot_id: string
          created_at?: string
          id?: string
          source_type?: string | null
          training_source_id: string
          user_id: string
        }
        Update: {
          char_count?: number
          chatbot_id?: string
          created_at?: string
          id?: string
          source_type?: string | null
          training_source_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_stats_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_stats_training_source_id_fkey"
            columns: ["training_source_id"]
            isOneToOne: true
            referencedRelation: "training_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_integrations: {
        Row: {
          bot_token: string
          bot_user_id: string | null
          channel_name: string | null
          chatbot_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          workspace_name: string | null
        }
        Insert: {
          bot_token: string
          bot_user_id?: string | null
          channel_name?: string | null
          chatbot_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          workspace_name?: string | null
        }
        Update: {
          bot_token?: string
          bot_user_id?: string | null
          channel_name?: string | null
          chatbot_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          workspace_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slack_integrations_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: true
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sources: {
        Row: {
          chatbot_id: string
          content: string | null
          created_at: string
          embedding: string | null
          file_path: string | null
          id: string
          size_kb: number | null
          source_revision_id: string | null
          source_type: string
          status: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          chatbot_id: string
          content?: string | null
          created_at?: string
          embedding?: string | null
          file_path?: string | null
          id?: string
          size_kb?: number | null
          source_revision_id?: string | null
          source_type: string
          status?: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          chatbot_id?: string
          content?: string | null
          created_at?: string
          embedding?: string | null
          file_path?: string | null
          id?: string
          size_kb?: number | null
          source_revision_id?: string | null
          source_type?: string
          status?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sources_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sources_source_revision_id_fkey"
            columns: ["source_revision_id"]
            isOneToOne: false
            referencedRelation: "chat_log_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      trends_usage: {
        Row: {
          count: number
          created_at: string | null
          date: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string | null
          date: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string | null
          date?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          action_type: string
          created_at: string | null
          credits_used: number
          data_size_kb: number | null
          id: string
          message_length: number | null
          model_used: string | null
          url_count: number | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          credits_used?: number
          data_size_kb?: number | null
          id?: string
          message_length?: number | null
          model_used?: string | null
          url_count?: number | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          credits_used?: number
          data_size_kb?: number | null
          id?: string
          message_length?: number | null
          model_used?: string | null
          url_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_limits: {
        Row: {
          can_remove_branding: boolean
          created_at: string | null
          id: string
          message_credits: number
          message_credits_used: number
          plan_id: string
          reset_date: string | null
          training_data_size_kb: number
          training_data_used_kb: number
          training_urls: number
          training_urls_used: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_remove_branding?: boolean
          created_at?: string | null
          id?: string
          message_credits?: number
          message_credits_used?: number
          plan_id?: string
          reset_date?: string | null
          training_data_size_kb?: number
          training_data_used_kb?: number
          training_urls?: number
          training_urls_used?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_remove_branding?: boolean
          created_at?: string | null
          id?: string
          message_credits?: number
          message_credits_used?: number
          plan_id?: string
          reset_date?: string | null
          training_data_size_kb?: number
          training_data_used_kb?: number
          training_urls?: number
          training_urls_used?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      claim_next_pending_crawl_job: {
        Args: Record<PropertyKey, never> | { worker_id: string }
        Returns: {
          job_id: string
        }[]
      }
      commit_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      handle_user_data_deletion: {
        Args: { user_id_to_delete: string }
        Returns: undefined
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      match_training_sources: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
          p_chatbot_id: string
        }
        Returns: {
          id: string
          content: string
          source_type: string
          url: string
          file_path: string
          status: string
          chatbot_id: string
          created_at: string
          size_kb: number
          embedding: string
          similarity: number
          title: string
        }[]
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      user_owns_chat_log: {
        Args: { log_id: string }
        Returns: boolean
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
