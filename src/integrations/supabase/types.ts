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
      ai_alerts: {
        Row: {
          alert_type: string
          created_at: string
          dedupe_key: string | null
          id: string
          message: string
          metrics: Json | null
          notified: boolean
          severity: string
          store_id: string | null
          store_name: string | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          message: string
          metrics?: Json | null
          notified?: boolean
          severity?: string
          store_id?: string | null
          store_name?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          message?: string
          metrics?: Json | null
          notified?: boolean
          severity?: string
          store_id?: string | null
          store_name?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_alerts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analysis_history: {
        Row: {
          analysis_date: string
          analysis_type: string
          company_id: string | null
          created_at: string
          generated_by: string | null
          generated_text: string
          id: string
          store_id: string | null
        }
        Insert: {
          analysis_date?: string
          analysis_type: string
          company_id?: string | null
          created_at?: string
          generated_by?: string | null
          generated_text: string
          id?: string
          store_id?: string | null
        }
        Update: {
          analysis_date?: string
          analysis_type?: string
          company_id?: string | null
          created_at?: string
          generated_by?: string | null
          generated_text?: string
          id?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistants: {
        Row: {
          active: boolean
          assistant_name: string
          assistant_photo: string | null
          assistant_role: string
          company_id: string | null
          created_at: string
          id: string
          tone: string
        }
        Insert: {
          active?: boolean
          assistant_name?: string
          assistant_photo?: string | null
          assistant_role?: string
          company_id?: string | null
          created_at?: string
          id?: string
          tone?: string
        }
        Update: {
          active?: boolean
          assistant_name?: string
          assistant_photo?: string | null
          assistant_role?: string
          company_id?: string | null
          created_at?: string
          id?: string
          tone?: string
        }
        Relationships: []
      }
      ai_notification_settings: {
        Row: {
          active: boolean
          company_id: string | null
          conversion_alert: boolean
          created_at: string
          daily_report_enabled: boolean
          goal_risk_alert: boolean
          id: string
          last_daily_run_at: string | null
          last_monthly_run_at: string | null
          last_weekly_run_at: string | null
          monthly_day: number
          monthly_report_enabled: boolean
          ranking_alert: boolean
          sales_drop_alert: boolean
          send_time: string
          stock_alert: boolean
          ticket_average_alert: boolean
          timezone: string
          updated_at: string
          weekly_report_enabled: boolean
          weekly_weekday: number
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          conversion_alert?: boolean
          created_at?: string
          daily_report_enabled?: boolean
          goal_risk_alert?: boolean
          id?: string
          last_daily_run_at?: string | null
          last_monthly_run_at?: string | null
          last_weekly_run_at?: string | null
          monthly_day?: number
          monthly_report_enabled?: boolean
          ranking_alert?: boolean
          sales_drop_alert?: boolean
          send_time?: string
          stock_alert?: boolean
          ticket_average_alert?: boolean
          timezone?: string
          updated_at?: string
          weekly_report_enabled?: boolean
          weekly_weekday?: number
        }
        Update: {
          active?: boolean
          company_id?: string | null
          conversion_alert?: boolean
          created_at?: string
          daily_report_enabled?: boolean
          goal_risk_alert?: boolean
          id?: string
          last_daily_run_at?: string | null
          last_monthly_run_at?: string | null
          last_weekly_run_at?: string | null
          monthly_day?: number
          monthly_report_enabled?: boolean
          ranking_alert?: boolean
          sales_drop_alert?: boolean
          send_time?: string
          stock_alert?: boolean
          ticket_average_alert?: boolean
          timezone?: string
          updated_at?: string
          weekly_report_enabled?: boolean
          weekly_weekday?: number
        }
        Relationships: []
      }
      ai_notifications: {
        Row: {
          company_id: string | null
          created_at: string
          delivery_status: string
          id: string
          message: string
          notification_type: string
          recipient_name: string
          recipient_phone: string
          sent_at: string | null
          store_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          delivery_status?: string
          id?: string
          message: string
          notification_type: string
          recipient_name: string
          recipient_phone: string
          sent_at?: string | null
          store_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          delivery_status?: string
          id?: string
          message?: string
          notification_type?: string
          recipient_name?: string
          recipient_phone?: string
          sent_at?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recipients: {
        Row: {
          active: boolean
          alert_types: string[]
          cargo: string
          created_at: string
          created_by: string | null
          id: string
          lojas: string[]
          nome: string
          telefone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          alert_types?: string[]
          cargo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lojas?: string[]
          nome: string
          telefone: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          alert_types?: string[]
          cargo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lojas?: string[]
          nome?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_scheduler_logs: {
        Row: {
          analyses_generated: number
          company_id: string | null
          created_at: string
          details: Json | null
          duration_ms: number
          executed_at: string
          id: string
          message: string | null
          notifications_created: number
          run_type: string
          status: string
          trigger_source: string
        }
        Insert: {
          analyses_generated?: number
          company_id?: string | null
          created_at?: string
          details?: Json | null
          duration_ms?: number
          executed_at?: string
          id?: string
          message?: string | null
          notifications_created?: number
          run_type: string
          status?: string
          trigger_source?: string
        }
        Update: {
          analyses_generated?: number
          company_id?: string | null
          created_at?: string
          details?: Json | null
          duration_ms?: number
          executed_at?: string
          id?: string
          message?: string | null
          notifications_created?: number
          run_type?: string
          status?: string
          trigger_source?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          registro_id: string | null
          tabela: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string | null
          tabela: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string | null
          tabela?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      campanhas: {
        Row: {
          ano: number
          ativa: boolean
          created_at: string
          created_by: string | null
          criterios: string[]
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          filial_id: string | null
          id: string
          mes: number
          nome: string
          referencias: string[]
          tipo: string
          updated_at: string
        }
        Insert: {
          ano: number
          ativa?: boolean
          created_at?: string
          created_by?: string | null
          criterios?: string[]
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          filial_id?: string | null
          id?: string
          mes: number
          nome: string
          referencias?: string[]
          tipo?: string
          updated_at?: string
        }
        Update: {
          ano?: number
          ativa?: boolean
          created_at?: string
          created_by?: string | null
          criterios?: string[]
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          filial_id?: string | null
          id?: string
          mes?: number
          nome?: string
          referencias?: string[]
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_secrets: {
        Row: {
          created_at: string
          name: string
          token: string
        }
        Insert: {
          created_at?: string
          name: string
          token: string
        }
        Update: {
          created_at?: string
          name?: string
          token?: string
        }
        Relationships: []
      }
      feriados: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          descricao: string
          filial_id: string | null
          id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: string
          descricao: string
          filial_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string
          filial_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feriados_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias: {
        Row: {
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          id: string
          observacoes: string | null
          vendedor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          id?: string
          observacoes?: string | null
          vendedor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          id?: string
          observacoes?: string | null
          vendedor_id?: string
        }
        Relationships: []
      }
      filiais: {
        Row: {
          created_at: string
          endereco: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      folgas: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          id: string
          motivo: string | null
          vendedor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: string
          id?: string
          motivo?: string | null
          vendedor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          motivo?: string | null
          vendedor_id?: string
        }
        Relationships: []
      }
      metas: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          meta_ticket: number
          updated_at: string
          valor_meta: number
          vendedor_id: string
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          meta_ticket?: number
          updated_at?: string
          valor_meta?: number
          vendedor_id: string
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          meta_ticket?: number
          updated_at?: string
          valor_meta?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          filial_id: string | null
          foto_url: string | null
          id: string
          must_change_password: boolean
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          filial_id?: string | null
          foto_url?: string | null
          id: string
          must_change_password?: boolean
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          filial_id?: string | null
          foto_url?: string | null
          id?: string
          must_change_password?: boolean
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          created_at: string
          data: string
          devolucao: number
          editado_por: string | null
          id: string
          observacoes: string | null
          quantidade_vendas: number
          updated_at: string
          valor: number
          vendedor_id: string
        }
        Insert: {
          created_at?: string
          data: string
          devolucao?: number
          editado_por?: string | null
          id?: string
          observacoes?: string | null
          quantidade_vendas?: number
          updated_at?: string
          valor?: number
          vendedor_id: string
        }
        Update: {
          created_at?: string
          data?: string
          devolucao?: number
          editado_por?: string | null
          id?: string
          observacoes?: string | null
          quantidade_vendas?: number
          updated_at?: string
          valor?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_editado_por_fkey"
            columns: ["editado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config: {
        Row: {
          active: boolean
          base_url: string | null
          created_at: string
          id: string
          instance: string | null
          phone_number_id: string | null
          provider: string
          sender_label: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_url?: string | null
          created_at?: string
          id?: string
          instance?: string | null
          phone_number_id?: string | null
          provider?: string
          sender_label?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_url?: string | null
          created_at?: string
          id?: string
          instance?: string | null
          phone_number_id?: string | null
          provider?: string
          sender_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          attempt: number
          error: string | null
          executed_at: string
          http_status: number | null
          id: string
          message_id: string | null
          response: Json | null
          status: string
        }
        Insert: {
          attempt?: number
          error?: string | null
          executed_at?: string
          http_status?: number | null
          id?: string
          message_id?: string | null
          response?: Json | null
          status: string
        }
        Update: {
          attempt?: number
          error?: string | null
          executed_at?: string
          http_status?: number | null
          id?: string
          message_id?: string | null
          response?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          alert_id: string | null
          attempts: number
          created_at: string
          created_by: string | null
          id: string
          kind: string
          last_error: string | null
          media_filename: string | null
          media_url: string | null
          message: string | null
          next_attempt_at: string
          provider: string | null
          provider_message_id: string | null
          recipient_name: string
          recipient_phone: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alert_id?: string | null
          attempts?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          media_filename?: string | null
          media_url?: string | null
          message?: string | null
          next_attempt_at?: string
          provider?: string | null
          provider_message_id?: string | null
          recipient_name: string
          recipient_phone: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          alert_id?: string | null
          attempts?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          media_filename?: string | null
          media_url?: string | null
          message?: string | null
          next_attempt_at?: string
          provider?: string | null
          provider_message_id?: string | null
          recipient_name?: string
          recipient_phone?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_password_change: { Args: never; Returns: undefined }
      get_user_filial_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_diretor: { Args: { _user_id: string }; Returns: boolean }
      is_gerente: { Args: { _user_id: string }; Returns: boolean }
      verify_cron_secret: { Args: { _token: string }; Returns: boolean }
    }
    Enums: {
      user_role: "vendedor" | "gerente" | "diretor" | "admin"
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
      user_role: ["vendedor", "gerente", "diretor", "admin"],
    },
  },
} as const
