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
    },
  },
} as const
