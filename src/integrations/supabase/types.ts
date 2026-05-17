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
      advocate_reviews: {
        Row: {
          advocate_id: string
          case_id: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewer_user_id: string
        }
        Insert: {
          advocate_id: string
          case_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer_user_id: string
        }
        Update: {
          advocate_id?: string
          case_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advocate_reviews_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advocate_reviews_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advocate_reviews_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          allow_general_fallback: boolean
          groq_model: string | null
          id: number
          kb_threshold: number
          model: string
          provider: string
          system_prompt: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_general_fallback?: boolean
          groq_model?: string | null
          id?: number
          kb_threshold?: number
          model?: string
          provider?: string
          system_prompt?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_general_fallback?: boolean
          groq_model?: string | null
          id?: number
          kb_threshold?: number
          model?: string
          provider?: string
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
      bhramar_chats: {
        Row: {
          case_id: string
          client_id: string | null
          content: string
          created_at: string
          id: string
          role: string
          session_type: string
        }
        Insert: {
          case_id: string
          client_id?: string | null
          content: string
          created_at?: string
          id?: string
          role: string
          session_type: string
        }
        Update: {
          case_id?: string
          client_id?: string | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bhramar_chats_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bhramar_chats_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "case_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      case_clients: {
        Row: {
          age: number | null
          case_id: string
          client_access_pin: string | null
          created_at: string
          custody_location: string | null
          district: string | null
          gender: string | null
          id: string
          is_in_custody: boolean
          legal_aid_eligible: string | null
          name: string
          occupation: string | null
          preferred_language: string
          relationship_to_case: string
          state: string | null
        }
        Insert: {
          age?: number | null
          case_id: string
          client_access_pin?: string | null
          created_at?: string
          custody_location?: string | null
          district?: string | null
          gender?: string | null
          id?: string
          is_in_custody?: boolean
          legal_aid_eligible?: string | null
          name: string
          occupation?: string | null
          preferred_language?: string
          relationship_to_case?: string
          state?: string | null
        }
        Update: {
          age?: number | null
          case_id?: string
          client_access_pin?: string | null
          created_at?: string
          custody_location?: string | null
          district?: string | null
          gender?: string | null
          id?: string
          is_in_custody?: boolean
          legal_aid_eligible?: string | null
          name?: string
          occupation?: string | null
          preferred_language?: string
          relationship_to_case?: string
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_clients_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_files"
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
      case_documents: {
        Row: {
          ai_summary: string | null
          case_id: string
          created_at: string
          doc_date: string | null
          doc_type: string
          filename: string
          id: string
          storage_path: string | null
        }
        Insert: {
          ai_summary?: string | null
          case_id: string
          created_at?: string
          doc_date?: string | null
          doc_type: string
          filename: string
          id?: string
          storage_path?: string | null
        }
        Update: {
          ai_summary?: string | null
          case_id?: string
          created_at?: string
          doc_date?: string | null
          doc_type?: string
          filename?: string
          id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_files"
            referencedColumns: ["id"]
          },
        ]
      }
      case_files: {
        Row: {
          advocate_id: string
          case_number: string | null
          case_title: string
          case_type: string
          court: string | null
          created_at: string
          current_stage: string
          date_of_arrest: string | null
          date_of_charge_sheet: string | null
          date_of_fir: string | null
          id: string
          io_name: string | null
          is_bailable: string | null
          is_cognizable: string | null
          judge: string | null
          key_facts: string | null
          limitation_deadline: string | null
          next_date: string | null
          next_date_purpose: string | null
          opposing_counsel: string | null
          police_station: string | null
          pp_name: string | null
          primary_act: string | null
          sections_charged: string[] | null
          updated_at: string
        }
        Insert: {
          advocate_id: string
          case_number?: string | null
          case_title: string
          case_type?: string
          court?: string | null
          created_at?: string
          current_stage?: string
          date_of_arrest?: string | null
          date_of_charge_sheet?: string | null
          date_of_fir?: string | null
          id?: string
          io_name?: string | null
          is_bailable?: string | null
          is_cognizable?: string | null
          judge?: string | null
          key_facts?: string | null
          limitation_deadline?: string | null
          next_date?: string | null
          next_date_purpose?: string | null
          opposing_counsel?: string | null
          police_station?: string | null
          pp_name?: string | null
          primary_act?: string | null
          sections_charged?: string[] | null
          updated_at?: string
        }
        Update: {
          advocate_id?: string
          case_number?: string | null
          case_title?: string
          case_type?: string
          court?: string | null
          created_at?: string
          current_stage?: string
          date_of_arrest?: string | null
          date_of_charge_sheet?: string | null
          date_of_fir?: string | null
          id?: string
          io_name?: string | null
          is_bailable?: string | null
          is_cognizable?: string | null
          judge?: string | null
          key_facts?: string | null
          limitation_deadline?: string | null
          next_date?: string | null
          next_date_purpose?: string | null
          opposing_counsel?: string | null
          police_station?: string | null
          pp_name?: string | null
          primary_act?: string | null
          sections_charged?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      case_hearings: {
        Row: {
          case_id: string
          court: string | null
          created_at: string
          hearing_date: string
          id: string
          order_passed: string | null
          what_happened: string | null
        }
        Insert: {
          case_id: string
          court?: string | null
          created_at?: string
          hearing_date: string
          id?: string
          order_passed?: string | null
          what_happened?: string | null
        }
        Update: {
          case_id?: string
          court?: string | null
          created_at?: string
          hearing_date?: string
          id?: string
          order_passed?: string | null
          what_happened?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_hearings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_files"
            referencedColumns: ["id"]
          },
        ]
      }
      case_notes: {
        Row: {
          case_id: string
          created_at: string
          id: string
          note_text: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          note_text: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          note_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_files"
            referencedColumns: ["id"]
          },
        ]
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
      case_prompt_suggestions: {
        Row: {
          case_id: string
          generated_at: string
          suggestions: Json
          user_id: string
        }
        Insert: {
          case_id: string
          generated_at?: string
          suggestions?: Json
          user_id: string
        }
        Update: {
          case_id?: string
          generated_at?: string
          suggestions?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_prompt_suggestions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
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
      cell_messages: {
        Row: {
          cell_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          cell_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cell_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cell_messages_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "court_cells"
            referencedColumns: ["id"]
          },
        ]
      }
      cell_notices: {
        Row: {
          body: string
          cell_id: string
          created_at: string
          id: string
          pinned: boolean
          posted_by: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          cell_id: string
          created_at?: string
          id?: string
          pinned?: boolean
          posted_by: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          cell_id?: string
          created_at?: string
          id?: string
          pinned?: boolean
          posted_by?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cell_notices_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "court_cells"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_summaries: {
        Row: {
          case_id: string | null
          created_at: string | null
          id: string
          summary: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string | null
          id?: string
          summary: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          created_at?: string | null
          id?: string
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_summaries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
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
          summary: string | null
          summary_until_message_id: string | null
          summary_updated_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          id?: string
          summary?: string | null
          summary_until_message_id?: string | null
          summary_updated_at?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          id?: string
          summary?: string | null
          summary_until_message_id?: string | null
          summary_updated_at?: string | null
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
      court_cells: {
        Row: {
          city: string | null
          court_name: string
          created_at: string
          description: string | null
          id: string
          level: string
          slug: string
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          court_name: string
          created_at?: string
          description?: string | null
          id?: string
          level: string
          slug: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          court_name?: string
          created_at?: string
          description?: string | null
          id?: string
          level?: string
          slug?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
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
      emergency_consultations: {
        Row: {
          advocate_id: string
          citizen_user_id: string | null
          created_at: string
          description: string | null
          district: string | null
          id: string
          issue_type: string
          state: string | null
          status: string
        }
        Insert: {
          advocate_id: string
          citizen_user_id?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          id?: string
          issue_type: string
          state?: string | null
          status?: string
        }
        Update: {
          advocate_id?: string
          citizen_user_id?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          id?: string
          issue_type?: string
          state?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_consultations_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_consultations_citizen_user_id_fkey"
            columns: ["citizen_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      impersonation_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          revoked: boolean
          token: string
          used: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          revoked?: boolean
          token?: string
          used?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          revoked?: boolean
          token?: string
          used?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      kb_files: {
        Row: {
          created_at: string
          id: string
          is_global: boolean
          item_count: number
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_global?: boolean
          item_count?: number
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_global?: boolean
          item_count?: number
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_news_cache: {
        Row: {
          cache_key: string
          category: string | null
          court: string | null
          created_at: string
          id: string
          items: Json
          refreshed_at: string
          state: string | null
          updated_at: string
        }
        Insert: {
          cache_key: string
          category?: string | null
          court?: string | null
          created_at?: string
          id?: string
          items?: Json
          refreshed_at?: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          cache_key?: string
          category?: string | null
          court?: string | null
          created_at?: string
          id?: string
          items?: Json
          refreshed_at?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      limitation_periods: {
        Row: {
          act_reference: string
          category: string
          description: string
          id: string
          period_days: number | null
          period_label: string
          sort_order: number
          urgent_flag: boolean
        }
        Insert: {
          act_reference: string
          category: string
          description: string
          id?: string
          period_days?: number | null
          period_label: string
          sort_order?: number
          urgent_flag?: boolean
        }
        Update: {
          act_reference?: string
          category?: string
          description?: string
          id?: string
          period_days?: number | null
          period_label?: string
          sort_order?: number
          urgent_flag?: boolean
        }
        Relationships: []
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          payload: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          advocate_id: string | null
          age: number | null
          avatar_url: string | null
          bar_council: string | null
          court_of_practice: string | null
          created_at: string
          district: string | null
          earning_bracket: string | null
          email: string | null
          enrollment_number: string | null
          family_background: string | null
          firm_id: string | null
          firm_role: string | null
          full_name: string | null
          gender: string | null
          has_children: boolean | null
          id: string
          is_available_for_emergency: boolean
          marital_status: string | null
          occupation: string | null
          onboarding_completed: boolean
          physical_condition: string | null
          plan_name: string | null
          prior_case_history: string | null
          religion: string | null
          specializations: string[] | null
          state: string | null
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          suspended: boolean
          updated_at: string
          user_type: string
          vakeel_reviews_count: number
          vakeel_score: number
          years_experience: number | null
        }
        Insert: {
          advocate_id?: string | null
          age?: number | null
          avatar_url?: string | null
          bar_council?: string | null
          court_of_practice?: string | null
          created_at?: string
          district?: string | null
          earning_bracket?: string | null
          email?: string | null
          enrollment_number?: string | null
          family_background?: string | null
          firm_id?: string | null
          firm_role?: string | null
          full_name?: string | null
          gender?: string | null
          has_children?: boolean | null
          id: string
          is_available_for_emergency?: boolean
          marital_status?: string | null
          occupation?: string | null
          onboarding_completed?: boolean
          physical_condition?: string | null
          plan_name?: string | null
          prior_case_history?: string | null
          religion?: string | null
          specializations?: string[] | null
          state?: string | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          suspended?: boolean
          updated_at?: string
          user_type?: string
          vakeel_reviews_count?: number
          vakeel_score?: number
          years_experience?: number | null
        }
        Update: {
          advocate_id?: string | null
          age?: number | null
          avatar_url?: string | null
          bar_council?: string | null
          court_of_practice?: string | null
          created_at?: string
          district?: string | null
          earning_bracket?: string | null
          email?: string | null
          enrollment_number?: string | null
          family_background?: string | null
          firm_id?: string | null
          firm_role?: string | null
          full_name?: string | null
          gender?: string | null
          has_children?: boolean | null
          id?: string
          is_available_for_emergency?: boolean
          marital_status?: string | null
          occupation?: string | null
          onboarding_completed?: boolean
          physical_condition?: string | null
          plan_name?: string | null
          prior_case_history?: string | null
          religion?: string | null
          specializations?: string[] | null
          state?: string | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          suspended?: boolean
          updated_at?: string
          user_type?: string
          vakeel_reviews_count?: number
          vakeel_score?: number
          years_experience?: number | null
        }
        Relationships: []
      }
      prompt_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          prompt_text: string
          version_label: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          prompt_text: string
          version_label: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          prompt_text?: string
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_upload_queue: {
        Row: {
          error_message: string | null
          file_path: string
          file_size_bytes: number | null
          id: string
          original_filename: string
          processed_at: string | null
          source: string
          status: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          error_message?: string | null
          file_path: string
          file_size_bytes?: number | null
          id?: string
          original_filename: string
          processed_at?: string | null
          source: string
          status?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          error_message?: string | null
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          original_filename?: string
          processed_at?: string | null
          source?: string
          status?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_upload_queue_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      system_config: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      team_cases: {
        Row: {
          case_id: string
          id: string
          shared_at: string
          shared_by: string
          team_id: string
        }
        Insert: {
          case_id: string
          id?: string
          shared_at?: string
          shared_by: string
          team_id: string
        }
        Update: {
          case_id?: string
          id?: string
          shared_at?: string
          shared_by?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_cases_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          invited_at: string
          joined_at: string | null
          role: string
          status: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string
          joined_at?: string | null
          role?: string
          status?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string
          joined_at?: string | null
          role?: string
          status?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          status: string
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      token_addon_purchases: {
        Row: {
          amount_paise: number
          created_at: string
          id: string
          pack_size: number
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          id?: string
          pack_size: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          id?: string
          pack_size?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      token_balances: {
        Row: {
          addon_tokens: number
          daily_quota: number
          daily_remaining: number
          last_daily_reset: string
          last_monthly_reset: string
          monthly_quota: number
          monthly_remaining: number
          updated_at: string
          user_id: string
        }
        Insert: {
          addon_tokens?: number
          daily_quota?: number
          daily_remaining?: number
          last_daily_reset?: string
          last_monthly_reset?: string
          monthly_quota?: number
          monthly_remaining?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          addon_tokens?: number
          daily_quota?: number
          daily_remaining?: number
          last_daily_reset?: string
          last_monthly_reset?: string
          monthly_quota?: number
          monthly_remaining?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      token_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          reason: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          reason?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          reason?: string | null
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
      admin_kb_files: {
        Args: never
        Returns: {
          chunk_count: number
          created_at: string
          id: string
          is_global: boolean
          item_count: number
          name: string
          user_email: string
          user_id: string
        }[]
      }
      admin_list_audit: {
        Args: { _limit?: number }
        Returns: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          user_email: string
          user_id: string
        }[]
      }
      admin_list_profiles: {
        Args: { _limit?: number; _offset?: number; _search?: string }
        Returns: {
          created_at: string
          district: string
          email: string
          full_name: string
          id: string
          state: string
          subscription_expires_at: string
          subscription_started_at: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
        }[]
      }
      admin_list_training_logs: {
        Args: {
          _from?: string
          _limit?: number
          _role?: string
          _search?: string
          _to?: string
          _user?: string
        }
        Returns: {
          case_id: string
          citations: Json
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_email: string
          user_id: string
        }[]
      }
      archive_case: { Args: { _case_id: string }; Returns: undefined }
      consume_token: {
        Args: { p_amount?: number; p_reason?: string }
        Returns: Json
      }
      delete_case_with_log: { Args: { _case_id: string }; Returns: undefined }
      find_advocate_by_id: {
        Args: { _advocate_id: string }
        Returns: {
          advocate_id: string
          avatar_url: string
          bar_council: string
          court_of_practice: string
          full_name: string
          id: string
          specializations: string[]
          state: string
          user_type: string
          vakeel_reviews_count: number
          vakeel_score: number
        }[]
      }
      generate_advocate_id: { Args: { _state: string }; Returns: string }
      generate_case_number: { Args: never; Returns: string }
      get_public_profile: {
        Args: { _advocate_id: string }
        Returns: {
          advocate_id: string
          bar_council: string
          court_of_practice: string
          district: string
          enrollment_number: string
          full_name: string
          specializations: string[]
          state: string
          user_type: string
          vakeel_reviews_count: number
          vakeel_score: number
          years_experience: number
        }[]
      }
      grant_addon_tokens: {
        Args: { p_amount: number; p_order: string; p_user: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_cell_member: {
        Args: { _cell_id: string; _user_id: string }
        Returns: boolean
      }
      is_enterprise_admin: { Args: { p_firm: string }; Returns: boolean }
      is_firm_member: { Args: { _firm_id: string }; Returns: boolean }
      is_firm_owner: { Args: { _firm_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_owner: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      list_cell_members: {
        Args: { _cell_id: string }
        Returns: {
          advocate_id: string
          court_of_practice: string
          full_name: string
          profile_id: string
          specializations: string[]
          state: string
          vakeel_score: number
        }[]
      }
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
      my_court_cell: {
        Args: never
        Returns: {
          city: string | null
          court_name: string
          created_at: string
          description: string | null
          id: string
          level: string
          slug: string
          state: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "court_cells"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      owns_case_file: { Args: { _case_id: string }; Returns: boolean }
      recompute_vakeel_score: {
        Args: { _advocate: string }
        Returns: undefined
      }
      refresh_token_balance: { Args: { p_user: string }; Returns: undefined }
      state_code: { Args: { _state: string }; Returns: string }
      tier_quotas: {
        Args: { _tier: string }
        Returns: {
          daily: number
          monthly: number
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
