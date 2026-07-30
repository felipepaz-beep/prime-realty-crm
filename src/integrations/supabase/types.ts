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
      activities: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          due_at: string | null
          duration_minutes: number | null
          id: string
          location: string | null
          metadata: Json
          owner_id: string
          priority: string
          recurrence: Json | null
          reminder_at: string | null
          scheduled_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          metadata?: Json
          owner_id: string
          priority?: string
          recurrence?: Json | null
          reminder_at?: string | null
          scheduled_at?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          metadata?: Json
          owner_id?: string
          priority?: string
          recurrence?: Json | null
          reminder_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_followups_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_prioritarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_recentes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          category: string
          content: string
          created_at: string
          deleted_at: string | null
          description: string | null
          favorite: boolean
          id: string
          is_system: boolean
          metadata: Json
          name: string
          owner_id: string
          provider: string | null
          updated_at: string
          variables: Json
          version: number
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          favorite?: boolean
          id?: string
          is_system?: boolean
          metadata?: Json
          name: string
          owner_id: string
          provider?: string | null
          updated_at?: string
          variables?: Json
          version?: number
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          favorite?: boolean
          id?: string
          is_system?: boolean
          metadata?: Json
          name?: string
          owner_id?: string
          provider?: string | null
          updated_at?: string
          variables?: Json
          version?: number
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          action: string
          category: string
          client_id: string | null
          cost_usd: number | null
          created_at: string
          duration_ms: number | null
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          fallback_from: string | null
          id: string
          metadata: Json
          model: string
          output_tokens: number | null
          owner_id: string
          prompt_tokens: number | null
          provider: string
          status: string
          total_tokens: number | null
        }
        Insert: {
          action: string
          category: string
          client_id?: string | null
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          fallback_from?: string | null
          id?: string
          metadata?: Json
          model: string
          output_tokens?: number | null
          owner_id: string
          prompt_tokens?: number | null
          provider: string
          status?: string
          total_tokens?: number | null
        }
        Update: {
          action?: string
          category?: string
          client_id?: string | null
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          fallback_from?: string | null
          id?: string
          metadata?: Json
          model?: string
          output_tokens?: number | null
          owner_id?: string
          prompt_tokens?: number | null
          provider?: string
          status?: string
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_followups_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_prioritarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_recentes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          category: string
          client_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          extension: string
          favorite: boolean
          file_name: string
          file_size: number
          id: string
          metadata: Json
          mime_type: string
          original_name: string
          owner_id: string
          storage_path: string
          tags: Json
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          client_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          extension: string
          favorite?: boolean
          file_name: string
          file_size: number
          id?: string
          metadata?: Json
          mime_type: string
          original_name: string
          owner_id: string
          storage_path: string
          tags?: Json
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          extension?: string
          favorite?: boolean
          file_name?: string
          file_size?: number
          id?: string
          metadata?: Json
          mime_type?: string
          original_name?: string
          owner_id?: string
          storage_path?: string
          tags?: Json
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_followups_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_prioritarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_recentes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_timeline: {
        Row: {
          category: string
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json
          owner_id: string
          title: string
        }
        Insert: {
          category?: string
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json
          owner_id: string
          title: string
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          owner_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_timeline_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_timeline_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_followups_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_timeline_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_prioritarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_timeline_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_recentes"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          bairros_interesse: Json
          cidade: string | null
          cidades_interesse: Json
          codigo_imovel: string | null
          cpf: string | null
          created_at: string
          custom_fields: Json
          data_nascimento: string | null
          deleted_at: string | null
          email: string | null
          estado: string | null
          etapa_funil: string
          faixa_valor_max: number | null
          faixa_valor_min: number | null
          finalidade: string | null
          forma_pagamento: string | null
          id: string
          is_active: boolean
          nome: string
          observacoes: string | null
          origem_lead: string | null
          owner_id: string
          previsao_fechamento: string | null
          prioridade: string
          proximo_followup: string | null
          score: number
          status: string
          tags: Json
          telefone: string | null
          temperatura: string
          tipo_imovel: string | null
          ultima_visita: string | null
          ultimo_contato: string | null
          updated_at: string
          valor_negociado: number | null
          whatsapp: string | null
        }
        Insert: {
          bairros_interesse?: Json
          cidade?: string | null
          cidades_interesse?: Json
          codigo_imovel?: string | null
          cpf?: string | null
          created_at?: string
          custom_fields?: Json
          data_nascimento?: string | null
          deleted_at?: string | null
          email?: string | null
          estado?: string | null
          etapa_funil?: string
          faixa_valor_max?: number | null
          faixa_valor_min?: number | null
          finalidade?: string | null
          forma_pagamento?: string | null
          id?: string
          is_active?: boolean
          nome: string
          observacoes?: string | null
          origem_lead?: string | null
          owner_id: string
          previsao_fechamento?: string | null
          prioridade?: string
          proximo_followup?: string | null
          score?: number
          status?: string
          tags?: Json
          telefone?: string | null
          temperatura?: string
          tipo_imovel?: string | null
          ultima_visita?: string | null
          ultimo_contato?: string | null
          updated_at?: string
          valor_negociado?: number | null
          whatsapp?: string | null
        }
        Update: {
          bairros_interesse?: Json
          cidade?: string | null
          cidades_interesse?: Json
          codigo_imovel?: string | null
          cpf?: string | null
          created_at?: string
          custom_fields?: Json
          data_nascimento?: string | null
          deleted_at?: string | null
          email?: string | null
          estado?: string | null
          etapa_funil?: string
          faixa_valor_max?: number | null
          faixa_valor_min?: number | null
          finalidade?: string | null
          forma_pagamento?: string | null
          id?: string
          is_active?: boolean
          nome?: string
          observacoes?: string | null
          origem_lead?: string | null
          owner_id?: string
          previsao_fechamento?: string | null
          prioridade?: string
          proximo_followup?: string | null
          score?: number
          status?: string
          tags?: Json
          telefone?: string | null
          temperatura?: string
          tipo_imovel?: string | null
          ultima_visita?: string | null
          ultimo_contato?: string | null
          updated_at?: string
          valor_negociado?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          client_id: string | null
          commission_percentage: number
          commission_value: number
          created_at: string
          expected_date: string | null
          gross_value: number
          id: string
          notes: string | null
          owner_id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          property_code: string | null
          received_date: string | null
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          commission_percentage?: number
          commission_value?: number
          created_at?: string
          expected_date?: string | null
          gross_value?: number
          id?: string
          notes?: string | null
          owner_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          property_code?: string | null
          received_date?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          commission_percentage?: number
          commission_value?: number
          created_at?: string
          expected_date?: string | null
          gross_value?: number
          id?: string
          notes?: string | null
          owner_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          property_code?: string | null
          received_date?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_followups_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_prioritarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_recentes"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          channel: string
          client_id: string
          created_at: string
          deleted_at: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          metadata: Json
          owner_id: string
          status: string
          subject: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          channel?: string
          client_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          metadata?: Json
          owner_id: string
          status?: string
          subject?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          metadata?: Json
          owner_id?: string
          status?: string
          subject?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_followups_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_prioritarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_recentes"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          goal_commission: number
          goal_sales: number
          goal_value: number
          id: string
          month: number
          owner_id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          goal_commission?: number
          goal_sales?: number
          goal_value?: number
          id?: string
          month: number
          owner_id: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          goal_commission?: number
          goal_sales?: number
          goal_value?: number
          id?: string
          month?: number
          owner_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      integrations: {
        Row: {
          configuration: Json
          created_at: string
          id: string
          last_sync: string | null
          owner_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          id?: string
          last_sync?: string | null
          owner_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          id?: string
          last_sync?: string | null
          owner_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment: Json | null
          content: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          direction: string
          id: string
          metadata: Json
          read_at: string | null
          sender: string | null
          sent_at: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          attachment?: Json | null
          content?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          direction: string
          id?: string
          metadata?: Json
          read_at?: string | null
          sender?: string | null
          sent_at?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          attachment?: Json | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          direction?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          sender?: string | null
          sent_at?: string
          status?: string
          type?: string
          updated_at?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          creci: string | null
          currency_format: string
          date_format: string
          display_name: string | null
          email: string
          full_name: string
          google_calendar_connected: boolean
          id: string
          last_login_at: string | null
          locale: string
          phone: string | null
          signature: string | null
          state: string | null
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          creci?: string | null
          currency_format?: string
          date_format?: string
          display_name?: string | null
          email: string
          full_name?: string
          google_calendar_connected?: boolean
          id: string
          last_login_at?: string | null
          locale?: string
          phone?: string | null
          signature?: string | null
          state?: string | null
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          creci?: string | null
          currency_format?: string
          date_format?: string
          display_name?: string | null
          email?: string
          full_name?: string
          google_calendar_connected?: boolean
          id?: string
          last_login_at?: string | null
          locale?: string
          phone?: string | null
          signature?: string | null
          state?: string | null
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          created_at: string
          google_calendar_refresh_token_ciphertext: string | null
          openai_api_key_ciphertext: string | null
          updated_at: string
          user_id: string
          whatsapp_token_ciphertext: string | null
        }
        Insert: {
          created_at?: string
          google_calendar_refresh_token_ciphertext?: string | null
          openai_api_key_ciphertext?: string | null
          updated_at?: string
          user_id: string
          whatsapp_token_ciphertext?: string | null
        }
        Update: {
          created_at?: string
          google_calendar_refresh_token_ciphertext?: string | null
          openai_api_key_ciphertext?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_token_ciphertext?: string | null
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
      user_settings: {
        Row: {
          category: string
          created_at: string
          id: string
          key: string
          owner_id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          key: string
          owner_id: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          key?: string
          owner_id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      v_activities_atrasadas: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          due_at: string | null
          duration_minutes: number | null
          id: string | null
          location: string | null
          metadata: Json | null
          owner_id: string | null
          priority: string | null
          recurrence: Json | null
          reminder_at: string | null
          scheduled_at: string | null
          status: string | null
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          duration_minutes?: number | null
          id?: string | null
          location?: string | null
          metadata?: Json | null
          owner_id?: string | null
          priority?: string | null
          recurrence?: Json | null
          reminder_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          duration_minutes?: number | null
          id?: string | null
          location?: string | null
          metadata?: Json | null
          owner_id?: string | null
          priority?: string | null
          recurrence?: Json | null
          reminder_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_followups_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_prioritarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_recentes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_activities_hoje: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          due_at: string | null
          duration_minutes: number | null
          id: string | null
          location: string | null
          metadata: Json | null
          owner_id: string | null
          priority: string | null
          recurrence: Json | null
          reminder_at: string | null
          scheduled_at: string | null
          status: string | null
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          duration_minutes?: number | null
          id?: string | null
          location?: string | null
          metadata?: Json | null
          owner_id?: string | null
          priority?: string | null
          recurrence?: Json | null
          reminder_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          duration_minutes?: number | null
          id?: string | null
          location?: string | null
          metadata?: Json | null
          owner_id?: string | null
          priority?: string | null
          recurrence?: Json | null
          reminder_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_followups_pendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_prioritarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard_recentes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_analytics_atividades: {
        Row: {
          atrasadas: number | null
          status: string | null
          total: number | null
          type: string | null
        }
        Relationships: []
      }
      v_analytics_conversas: {
        Row: {
          channel: string | null
          mensagens_nao_lidas: number | null
          status: string | null
          total: number | null
        }
        Relationships: []
      }
      v_analytics_documentos: {
        Row: {
          category: string | null
          favoritos: number | null
          total: number | null
          total_bytes: number | null
        }
        Relationships: []
      }
      v_analytics_funil_conversao: {
        Row: {
          convertidos: number | null
          etapa_funil: string | null
          pct_total: number | null
          taxa_conversao: number | null
          total: number | null
        }
        Relationships: []
      }
      v_analytics_kpis: {
        Row: {
          clientes_ativos: number | null
          em_negociacao: number | null
          followups_atrasados: number | null
          leads_perdidos: number | null
          novos_este_mes: number | null
          propostas_enviadas: number | null
          score_medio: number | null
          taxa_conversao_geral: number | null
          total_clientes: number | null
          vendas_concluidas: number | null
          visitas_agendadas: number | null
        }
        Relationships: []
      }
      v_analytics_origem_leads: {
        Row: {
          convertidos: number | null
          origem: string | null
          taxa_conversao: number | null
          total: number | null
        }
        Relationships: []
      }
      v_analytics_timeline_eventos: {
        Row: {
          category: string | null
          event_type: string | null
          mes: string | null
          total: number | null
        }
        Relationships: []
      }
      v_dashboard_atividades_hoje: {
        Row: {
          atrasadas: number | null
          followups_hoje: number | null
          tarefas_hoje: number | null
          total_hoje: number | null
          visitas_hoje: number | null
        }
        Relationships: []
      }
      v_dashboard_followups_pendentes: {
        Row: {
          etapa_funil: string | null
          id: string | null
          nome: string | null
          prioridade: string | null
          proximo_followup: string | null
          situacao: string | null
          telefone: string | null
          temperatura: string | null
          whatsapp: string | null
        }
        Relationships: []
      }
      v_dashboard_funil: {
        Row: {
          etapa_funil: string | null
          total: number | null
        }
        Relationships: []
      }
      v_dashboard_indicadores: {
        Row: {
          clientes_inativos: number | null
          leads_captacao: number | null
          leads_com_origem: number | null
          leads_contato: number | null
          leads_ganhos: number | null
          leads_negociacao: number | null
          leads_perdidos: number | null
          leads_proposta: number | null
          leads_qualificados: number | null
          leads_visita: number | null
          receita_potencial: number | null
          score_medio: number | null
        }
        Relationships: []
      }
      v_dashboard_metricas: {
        Row: {
          clientes_ativos: number | null
          clientes_ganhos: number | null
          clientes_perdidos: number | null
          followups_atrasados: number | null
          followups_hoje: number | null
          leads_frios: number | null
          leads_mornos: number | null
          leads_quentes: number | null
          novos_este_mes: number | null
          receita_total: number | null
          total_clientes: number | null
        }
        Relationships: []
      }
      v_dashboard_prioritarios: {
        Row: {
          email: string | null
          etapa_funil: string | null
          id: string | null
          nome: string | null
          origem_lead: string | null
          prioridade: string | null
          proximo_followup: string | null
          score: number | null
          status: string | null
          telefone: string | null
          temperatura: string | null
          ultimo_contato: string | null
          whatsapp: string | null
        }
        Relationships: []
      }
      v_dashboard_recentes: {
        Row: {
          created_at: string | null
          etapa_funil: string | null
          id: string | null
          nome: string | null
          origem_lead: string | null
          prioridade: string | null
          temperatura: string | null
        }
        Relationships: []
      }
      v_financeiro_resumo: {
        Row: {
          atrasado_total: number | null
          owner_id: string | null
          previsto_mes_atual: number | null
          previsto_total: number | null
          qtd_previstas: number | null
          qtd_recebidas: number | null
          recebido_mes_atual: number | null
          recebido_total: number | null
        }
        Relationships: []
      }
      v_fluxo_mensal: {
        Row: {
          mes: string | null
          owner_id: string | null
          previsto: number | null
          realizado: number | null
        }
        Relationships: []
      }
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
      commission_status: "prevista" | "recebida" | "atrasada" | "cancelada"
      payment_method:
        | "pix"
        | "ted"
        | "transferencia"
        | "boleto"
        | "cheque"
        | "dinheiro"
        | "outro"
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
      commission_status: ["prevista", "recebida", "atrasada", "cancelada"],
      payment_method: [
        "pix",
        "ted",
        "transferencia",
        "boleto",
        "cheque",
        "dinheiro",
        "outro",
      ],
    },
  },
} as const
