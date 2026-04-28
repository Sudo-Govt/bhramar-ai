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
      ai_training_logs: {
        Row: {
          case_id: string | null
          citations: Json | null
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          case_id?: string | null
          citations?: Json | null
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          case_id?: string | null
          citations?: Json | null
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      case_deletion_logs: {
        Row: {
          ai_summary: string | null
          case_name: string | null
          case_number: string | null
          client_name: string | null
          complaint: string | null
          conversations_text: string | null
          deleted_at: string
          documents_summary: string | null
          id: string
          notes_text: string | null
          original_case_id: string
          payments_summary: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          case_name?: string | null
          case_number?: string | null
          client_name?: string | null
          complaint?: string | null
          conversations_text?: string | null
          deleted_at?: string
          documents_summary?: string | null
          id?: string
          notes_text?: string | null
          original_case_id: string
          payments_summary?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          case_name?: string | null
          case_number?: string | null
          client_name?: string | null
          complaint?: string | null
          conversations_text?: string | null
          deleted_at?: string
          documents_summary?: string | null
          id?: string
          notes_text?: string | null
          original_case_id?: string
          payments_summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      case_payments: {
        Row: {
          case_id: string
          created_at: string
          fee_quoted: number
          fee_received: number
          id: string
          note: string | null
          occurred_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          fee_quoted?: number
          fee_received?: number
          id?: string
          note?: string | null
          occurred_on?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          fee_quoted?: number
          fee_received?: number
          id?: string
          note?: string | null
          occurred_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cases: {
        Row: {
          ai_summary: string | null
          archived_at: string | null
          case_number: string | null
          client_name: string | null
          complaint: string | null
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["case_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          archived_at?: string | null
          case_number?: string | null
          client_name?: string | null
          complaint?: string | null
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          archived_at?: string | null
          case_number?: string | null
          client_name?: string | null
          complaint?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          case_id: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          act_name: string | null
          case_id: string | null
          chunk_index: number
          content: string
          created_at: string
          document_id: string | null
          embedding: string
          id: string
          section_label: string | null
          source: Database["public"]["Enums"]["chunk_source"]
          user_id: string | null
        }
        Insert: {
          act_name?: string | null
          case_id?: string | null
          chunk_index?: number
          content: string
          created_at?: string
          document_id?: string | null
          embedding: string
          id?: string
          section_label?: string | null
          source: Database["public"]["Enums"]["chunk_source"]
          user_id?: string | null
        }
        Update: {
          act_name?: string | null
          case_id?: string | null
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string | null
          embedding?: string
          id?: string
          section_label?: string | null
          source?: Database["public"]["Enums"]["chunk_source"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_summary: string | null
          case_id: string | null
          chunk_count: number
          created_at: string
          filename: string
          id: string
          indexed_at: string | null
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          case_id?: string | null
          chunk_count?: number
          created_at?: string
          filename: string
          id?: string
          indexed_at?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          case_id?: string | null
          chunk_count?: number
          created_at?: string
          filename?: string
          id?: string
          indexed_at?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          citations: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["message_role"]
          user_id: string
        }
        Insert: {
          citations?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["message_role"]
          user_id: string
        }
        Update: {
          citations?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["message_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          case_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          case_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          case_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      razorpay_orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string
          payment_id: string | null
          plan: string
          signature: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          payment_id?: string | null
          plan: string
          signature?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          payment_id?: string | null
          plan?: string
          signature?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          created_at: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_case: { Args: { _case_id: string }; Returns: undefined }
      delete_case_with_log: { Args: { _case_id: string }; Returns: undefined }
      generate_case_number: { Args: never; Returns: string }
      match_chunks: {
        Args: {
          corpus_weight?: number
          match_count?: number
          match_user_id: string
          query_embedding: string
        }
        Returns: {
          act_name: string
          content: string
          document_id: string
          id: string
          section_label: string
          similarity: number
          source: Database["public"]["Enums"]["chunk_source"]
        }[]
      }
      unarchive_case: { Args: { _case_id: string }; Returns: undefined }
    }
    Enums: {
      case_status: "Active" | "Closed" | "Draft"
      chunk_source: "corpus" | "user"
      message_role: "user" | "assistant" | "system"
      subscription_tier: "Free" | "Pro" | "Firm"
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
      case_status: ["Active", "Closed", "Draft"],
      chunk_source: ["corpus", "user"],
      message_role: ["user", "assistant", "system"],
      subscription_tier: ["Free", "Pro", "Firm"],
    },
  },
} as const
