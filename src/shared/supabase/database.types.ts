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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          deleted_at?: string | null
          deleted_by?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount_limit: number
          category_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          reference_month: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          amount_limit: number
          category_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          reference_month: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Update: {
          amount_limit?: number
          category_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          reference_month?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          icon: string | null
          id: string
          name: string
          parent_category_id: string | null
          system_category_id: string | null
          type: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_category_id?: string | null
          system_category_id?: string | null
          type: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_category_id?: string | null
          system_category_id?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_system_category_id_fkey"
            columns: ["system_category_id"]
            isOneToOne: false
            referencedRelation: "system_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          closing_day: number
          created_at: string
          created_by: string | null
          credit_limit: number
          default_account_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          due_day: number
          id: string
          name: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          closing_day: number
          created_at?: string
          created_by?: string | null
          credit_limit: number
          default_account_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_day: number
          id?: string
          name: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Update: {
          closing_day?: number
          created_at?: string
          created_by?: string | null
          credit_limit?: number
          default_account_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_day?: number
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_allocations: {
        Row: {
          amount: number
          created_at: string
          goal_id: string
          id: string
          note: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          goal_id: string
          id?: string
          note?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          goal_id?: string
          id?: string
          note?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_allocations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
          status?: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          status?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          closing_date: string
          created_at: string
          created_by: string | null
          credit_card_id: string
          due_date: string
          id: string
          paid_at: string | null
          reference_month: string
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          closing_date: string
          created_at?: string
          created_by?: string | null
          credit_card_id: string
          due_date: string
          id?: string
          paid_at?: string | null
          reference_month: string
          status: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Update: {
          closing_date?: string
          created_at?: string
          created_by?: string | null
          credit_card_id?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          reference_month?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_installments: {
        Row: {
          amount: number
          due_date: string
          id: string
          installment_number: number
          loan_id: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          due_date: string
          id?: string
          installment_number: number
          loan_id: string
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          due_date?: string
          id?: string
          installment_number?: number
          loan_id?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_installments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_installments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          default_account_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          installments_count: number
          interest_rate: number
          name: string
          principal_amount: number
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency: string
          default_account_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          installments_count: number
          interest_rate: number
          name: string
          principal_amount: number
          status: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          default_account_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          installments_count?: number
          interest_rate?: number
          name?: string
          principal_amount?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_rules: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string
          created_at: string
          created_by: string | null
          credit_card_id: string | null
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          end_date: string | null
          frequency: string
          id: string
          next_occurrence_date: string
          type: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id: string
          created_at?: string
          created_by?: string | null
          credit_card_id?: string | null
          currency: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_date?: string | null
          frequency: string
          id?: string
          next_occurrence_date: string
          type: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string
          created_at?: string
          created_by?: string | null
          credit_card_id?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          next_occurrence_date?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrence_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrence_rules_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      system_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_internal: boolean
          name: string
          sort_order: number
          type: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_internal?: boolean
          name: string
          sort_order?: number
          type: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_internal?: boolean
          name?: string
          sort_order?: number
          type?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          invoice_id: string | null
          occurred_at: string
          paid_at: string | null
          purchase_group_id: string | null
          recurrence_date: string | null
          recurrence_rule_id: string | null
          status: string
          type: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          occurred_at: string
          paid_at?: string | null
          purchase_group_id?: string | null
          recurrence_date?: string | null
          recurrence_rule_id?: string | null
          status: string
          type: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          occurred_at?: string
          paid_at?: string | null
          purchase_group_id?: string | null
          recurrence_date?: string | null
          recurrence_rule_id?: string | null
          status?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_invoice"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurrence_rule_id_fkey"
            columns: ["recurrence_rule_id"]
            isOneToOne: false
            referencedRelation: "recurrence_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          created_at: string
          destination_transaction_id: string
          id: string
          origin_transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_transaction_id: string
          id?: string
          origin_transaction_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          destination_transaction_id?: string
          id?: string
          origin_transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_destination_transaction_id_fkey"
            columns: ["destination_transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_origin_transaction_id_fkey"
            columns: ["origin_transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          financial_month_start_day: number
          id: string
          language: string
          plan_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          financial_month_start_day?: number
          id: string
          language?: string
          plan_id?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          financial_month_start_day?: number
          id?: string
          language?: string
          plan_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      alocar_recurso_na_meta: {
        Args: {
          p_account_id?: string
          p_amount: number
          p_at?: string
          p_goal_id: string
          p_note?: string
        }
        Returns: string
      }
      close_due_invoices: { Args: never; Returns: number }
      create_account_with_initial_balance: {
        Args: {
          p_color?: string
          p_currency: string
          p_icon?: string
          p_initial_balance?: number
          p_name: string
          p_occurred_at?: string
        }
        Returns: string
      }
      criar_emprestimo: {
        Args: {
          p_currency: string
          p_default_account_id: string
          p_installments: Json
          p_installments_count: number
          p_interest_rate: number
          p_name: string
          p_principal_amount: number
        }
        Returns: string
      }
      efetivar_transferencia: {
        Args: {
          p_amount: number
          p_description?: string
          p_destination_account_id: string
          p_occurred_at?: string
          p_origin_account_id: string
        }
        Returns: string
      }
      generate_recurrences: { Args: never; Returns: number }
      get_account_balance: { Args: { p_account_id: string }; Returns: number }
      get_balances_by_currency: {
        Args: never
        Returns: {
          balance: number
          currency: string
        }[]
      }
      get_budgets_with_usage: {
        Args: { p_end_exclusive: string; p_start: string; p_timezone?: string }
        Returns: {
          amount_limit: number
          category_id: string
          category_name: string
          id: string
          percentage: number
          spent: number
        }[]
      }
      get_card_available_limit: { Args: { p_card_id: string }; Returns: number }
      get_category_expenses: {
        Args: { p_end_exclusive: string; p_start: string; p_timezone?: string }
        Returns: {
          category_id: string
          category_name: string
          total: number
        }[]
      }
      get_invoice_total: { Args: { p_invoice_id: string }; Returns: number }
      get_month_expenses_total: {
        Args: { p_end_exclusive: string; p_start: string; p_timezone?: string }
        Returns: number
      }
      get_or_create_invoice: {
        Args: {
          p_card_id: string
          p_closing_date: string
          p_due_date: string
          p_reference_month: string
        }
        Returns: string
      }
      pagar_fatura: {
        Args: { p_account_id: string; p_invoice_id: string; p_paid_at?: string }
        Returns: undefined
      }
      pagar_parcela_emprestimo: {
        Args: {
          p_account_id: string
          p_installment_id: string
          p_paid_at?: string
        }
        Returns: string
      }
      registrar_compra_cartao: {
        Args: {
          p_category_id: string
          p_description?: string
          p_installments: Json
          p_purchase_group_id?: string
        }
        Returns: undefined
      }
      uuid_generate_v7: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
