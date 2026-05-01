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
      ai_settings: {
        Row: {
          id: number
          model: string
          system_prompt: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          model?: string
          system_prompt?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          model?: string
          system_prompt?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
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
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          firm_id: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          firm_id?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          firm_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
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
          assigned_to: string | null
          case_number: string | null
          client_id: string | null
          client_name: string | null
          complaint: string | null
          created_at: string
          deadline: string | null
          firm_id: string | null
          id: string
          name: string
          priority: string | null
          stage: string | null
          status: Database["public"]["Enums"]["case_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          case_number?: string | null
          client_id?: string | null
          client_name?: string | null
          complaint?: string | null
          created_at?: string
          deadline?: string | null
          firm_id?: string | null
          id?: string
          name: string
          priority?: string | null
          stage?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          case_number?: string | null
          client_id?: string | null
          client_name?: string | null
          complaint?: string | null
          created_at?: string
          deadline?: string | null
          firm_id?: string | null
          id?: string
          name?: string
          priority?: string | null
          stage?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          age: number | null
          avatar_url: string | null
          created_at: string
          district: string | null
          earning_bracket: string | null
          email: string | null
          family_background: string | null
          firm_id: string | null
          full_name: string
          gender: string | null
          has_children: boolean | null
          id: string
          marital_status: string | null
          notes: string | null
          occupation: string | null
          phone: string | null
          physical_condition: string | null
          prior_case_history: string | null
          religion: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          district?: string | null
          earning_bracket?: string | null
          email?: string | null
          family_background?: string | null
          firm_id?: string | null
          full_name: string
          gender?: string | null
          has_children?: boolean | null
          id?: string
          marital_status?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          physical_condition?: string | null
          prior_case_history?: string | null
          religion?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          district?: string | null
          earning_bracket?: string | null
          email?: string | null
          family_background?: string | null
          firm_id?: string | null
          full_name?: string
          gender?: string | null
          has_children?: boolean | null
          id?: string
          marital_status?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          physical_condition?: string | null
          prior_case_history?: string | null
          religion?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
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
      events: {
        Row: {
          case_id: string | null
          client_id: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          firm_id: string | null
          id: string
          kind: string
          location: string | null
          starts_at: string
          title: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          firm_id?: string | null
          id?: string
          kind?: string
          location?: string | null
          starts_at: string
          title: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          firm_id?: string | null
          id?: string
          kind?: string
          location?: string | null
          starts_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          created_at: string
          description: string | null
          firm_id: string | null
          id: string
          rate: number
          service_name: string
          unit: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          firm_id?: string | null
          id?: string
          rate?: number
          service_name: string
          unit?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          firm_id?: string | null
          id?: string
          rate?: number
          service_name?: string
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fees_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          case_id: string | null
          client_id: string | null
          created_at: string
          firm_id: string | null
          id: string
          kind: string
          mime_type: string | null
          name: string
          parent_id: string | null
          size_bytes: number | null
          storage_path: string | null
          user_id: string
        }
        Insert: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          firm_id?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          name: string
          parent_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          user_id: string
        }
        Update: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          firm_id?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          name?: string
          parent_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_members: {
        Row: {
          email: string
          firm_id: string
          full_name: string | null
          id: string
          invited_at: string
          joined_at: string | null
          role: string
          status: string
          user_id: string | null
        }
        Insert: {
          email: string
          firm_id: string
          full_name?: string | null
          id?: string
          invited_at?: string
          joined_at?: string | null
          role?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          email?: string
          firm_id?: string
          full_name?: string | null
          id?: string
          invited_at?: string
          joined_at?: string | null
          role?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firm_members_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          case_id: string | null
          client_id: string | null
          created_at: string
          due_on: string | null
          firm_id: string | null
          id: string
          invoice_number: string
          issued_on: string
          notes: string | null
          paid_on: string | null
          status: string
          tax: number
          user_id: string
        }
        Insert: {
          amount?: number
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          due_on?: string | null
          firm_id?: string | null
          id?: string
          invoice_number: string
          issued_on?: string
          notes?: string | null
          paid_on?: string | null
          status?: string
          tax?: number
          user_id: string
        }
        Update: {
          amount?: number
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          due_on?: string | null
          firm_id?: string | null
          id?: string
          invoice_number?: string
          issued_on?: string
          notes?: string | null
          paid_on?: string | null
          status?: string
          tax?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
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
          age: number | null
          avatar_url: string | null
          court_of_practice: string | null
          created_at: string
          district: string | null
          earning_bracket: string | null
          email: string | null
          family_background: string | null
          full_name: string | null
          gender: string | null
          has_children: boolean | null
          id: string
          marital_status: string | null
          occupation: string | null
          physical_condition: string | null
          prior_case_history: string | null
          religion: string | null
          state: string | null
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          court_of_practice?: string | null
          created_at?: string
          district?: string | null
          earning_bracket?: string | null
          email?: string | null
          family_background?: string | null
          full_name?: string | null
          gender?: string | null
          has_children?: boolean | null
          id: string
          marital_status?: string | null
          occupation?: string | null
          physical_condition?: string | null
          prior_case_history?: string | null
          religion?: string | null
          state?: string | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          court_of_practice?: string | null
          created_at?: string
          district?: string | null
          earning_bracket?: string | null
          email?: string | null
          family_background?: string | null
          full_name?: string | null
          gender?: string | null
          has_children?: boolean | null
          id?: string
          marital_status?: string | null
          occupation?: string | null
          physical_condition?: string | null
          prior_case_history?: string | null
          religion?: string | null
          state?: string | null
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
      smtp_configs: {
        Row: {
          created_at: string
          from_email: string
          from_name: string | null
          host: string
          id: string
          password_encrypted: string
          port: number
          updated_at: string
          use_tls: boolean
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name?: string | null
          host: string
          id?: string
          password_encrypted: string
          port?: number
          updated_at?: string
          use_tls?: boolean
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string | null
          host?: string
          id?: string
          password_encrypted?: string
          port?: number
          updated_at?: string
          use_tls?: boolean
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          assigned_to: string | null
          body: string | null
          client_id: string | null
          created_at: string
          firm_id: string | null
          id: string
          priority: string
          resolved_at: string | null
          sla_due_at: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          body?: string | null
          client_id?: string | null
          created_at?: string
          firm_id?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          body?: string | null
          client_id?: string | null
          created_at?: string
          firm_id?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_requests_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          case_id: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          firm_id: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          case_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          firm_id?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          case_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          firm_id?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
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
      user_roles: {
        Row: {
          created_at: string
          firm_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          firm_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          firm_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_recordings: {
        Row: {
          ai_summary: string | null
          case_id: string | null
          client_id: string | null
          duration_seconds: number | null
          id: string
          recorded_at: string
          storage_path: string
          transcript: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          case_id?: string | null
          client_id?: string | null
          duration_seconds?: number | null
          id?: string
          recorded_at?: string
          storage_path: string
          transcript?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          case_id?: string | null
          client_id?: string | null
          duration_seconds?: number | null
          id?: string
          recorded_at?: string
          storage_path?: string
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_recordings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_recordings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_case: { Args: { _case_id: string }; Returns: undefined }
      delete_case_with_log: { Args: { _case_id: string }; Returns: undefined }
      generate_case_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_firm_member: { Args: { _firm_id: string }; Returns: boolean }
      is_firm_owner: { Args: { _firm_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
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
      app_role: "owner" | "admin" | "advocate" | "member" | "client"
      case_status: "Active" | "Closed" | "Draft"
      chunk_source: "corpus" | "user" | "kb"
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
      app_role: ["owner", "admin", "advocate", "member", "client"],
      case_status: ["Active", "Closed", "Draft"],
      chunk_source: ["corpus", "user", "kb"],
      message_role: ["user", "assistant", "system"],
      subscription_tier: ["Free", "Pro", "Firm"],
    },
  },
} as const
