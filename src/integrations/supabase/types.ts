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
      abastecimentos: {
        Row: {
          created_at: string
          cupom_url: string | null
          data: string
          id: string
          km: number
          litros: number
          motorista_id: string | null
          observacoes: string | null
          posto: string | null
          secretaria_id: string | null
          tipo_combustivel: Database["public"]["Enums"]["tipo_combustivel"]
          updated_at: string
          valor_litro: number
          valor_total: number
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          cupom_url?: string | null
          data?: string
          id?: string
          km: number
          litros: number
          motorista_id?: string | null
          observacoes?: string | null
          posto?: string | null
          secretaria_id?: string | null
          tipo_combustivel: Database["public"]["Enums"]["tipo_combustivel"]
          updated_at?: string
          valor_litro: number
          valor_total: number
          veiculo_id: string
        }
        Update: {
          created_at?: string
          cupom_url?: string | null
          data?: string
          id?: string
          km?: number
          litros?: number
          motorista_id?: string | null
          observacoes?: string | null
          posto?: string | null
          secretaria_id?: string | null
          tipo_combustivel?: Database["public"]["Enums"]["tipo_combustivel"]
          updated_at?: string
          valor_litro?: number
          valor_total?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abastecimentos_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          anexo_url: string | null
          created_at: string
          custo: number | null
          data_abertura: string
          data_conclusao: string | null
          descricao: string
          id: string
          km: number | null
          observacoes: string | null
          oficina: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["status_manutencao"]
          tipo: Database["public"]["Enums"]["tipo_manutencao"]
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          anexo_url?: string | null
          created_at?: string
          custo?: number | null
          data_abertura?: string
          data_conclusao?: string | null
          descricao: string
          id?: string
          km?: number | null
          observacoes?: string | null
          oficina?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_manutencao"]
          tipo: Database["public"]["Enums"]["tipo_manutencao"]
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          anexo_url?: string | null
          created_at?: string
          custo?: number | null
          data_abertura?: string
          data_conclusao?: string | null
          descricao?: string
          id?: string
          km?: number | null
          observacoes?: string | null
          oficina?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_manutencao"]
          tipo?: Database["public"]["Enums"]["tipo_manutencao"]
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          matricula: string | null
          nome: string
          secretaria_id: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          matricula?: string | null
          nome?: string
          secretaria_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          matricula?: string | null
          nome?: string
          secretaria_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      secretarias: {
        Row: {
          created_at: string
          id: string
          nome: string
          sigla: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          sigla?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          sigla?: string | null
          updated_at?: string
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
      veiculos: {
        Row: {
          ano: number | null
          cor: string | null
          created_at: string
          id: string
          km_atual: number
          marca: string | null
          modelo: string
          observacoes: string | null
          placa: string
          secretaria_id: string | null
          status: Database["public"]["Enums"]["veiculo_status"]
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ano?: number | null
          cor?: string | null
          created_at?: string
          id?: string
          km_atual?: number
          marca?: string | null
          modelo: string
          observacoes?: string | null
          placa: string
          secretaria_id?: string | null
          status?: Database["public"]["Enums"]["veiculo_status"]
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number | null
          cor?: string | null
          created_at?: string
          id?: string
          km_atual?: number
          marca?: string | null
          modelo?: string
          observacoes?: string | null
          placa?: string
          secretaria_id?: string | null
          status?: Database["public"]["Enums"]["veiculo_status"]
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      viagens: {
        Row: {
          assinatura_url: string | null
          combustivel: string | null
          created_at: string
          destino: string
          foto_hodometro_retorno_url: string | null
          foto_hodometro_saida_url: string | null
          hora_chegada: string | null
          hora_saida: string
          id: string
          km_retorno: number | null
          km_saida: number
          motorista_id: string
          numero: number
          objetivo: string | null
          ocorrencias: string | null
          origem: string
          secretaria_id: string | null
          servidor_matricula: string | null
          servidor_nome: string | null
          status: Database["public"]["Enums"]["viagem_status"]
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          assinatura_url?: string | null
          combustivel?: string | null
          created_at?: string
          destino: string
          foto_hodometro_retorno_url?: string | null
          foto_hodometro_saida_url?: string | null
          hora_chegada?: string | null
          hora_saida?: string
          id?: string
          km_retorno?: number | null
          km_saida: number
          motorista_id: string
          numero?: number
          objetivo?: string | null
          ocorrencias?: string | null
          origem: string
          secretaria_id?: string | null
          servidor_matricula?: string | null
          servidor_nome?: string | null
          status?: Database["public"]["Enums"]["viagem_status"]
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          assinatura_url?: string | null
          combustivel?: string | null
          created_at?: string
          destino?: string
          foto_hodometro_retorno_url?: string | null
          foto_hodometro_saida_url?: string | null
          hora_chegada?: string | null
          hora_saida?: string
          id?: string
          km_retorno?: number | null
          km_saida?: number
          motorista_id?: string
          numero?: number
          objetivo?: string | null
          ocorrencias?: string | null
          origem?: string
          secretaria_id?: string | null
          servidor_matricula?: string | null
          servidor_nome?: string | null
          status?: Database["public"]["Enums"]["viagem_status"]
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viagens_motorista_profile_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_gestor: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "administrador" | "gestor" | "motorista"
      status_manutencao: "aberta" | "em_andamento" | "concluida" | "cancelada"
      tipo_combustivel:
        | "gasolina"
        | "etanol"
        | "diesel"
        | "diesel_s10"
        | "gnv"
        | "flex"
      tipo_manutencao: "preventiva" | "corretiva"
      veiculo_status: "disponivel" | "em_uso" | "em_manutencao"
      viagem_status: "em_andamento" | "finalizada" | "cancelada"
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
      app_role: ["administrador", "gestor", "motorista"],
      status_manutencao: ["aberta", "em_andamento", "concluida", "cancelada"],
      tipo_combustivel: [
        "gasolina",
        "etanol",
        "diesel",
        "diesel_s10",
        "gnv",
        "flex",
      ],
      tipo_manutencao: ["preventiva", "corretiva"],
      veiculo_status: ["disponivel", "em_uso", "em_manutencao"],
      viagem_status: ["em_andamento", "finalizada", "cancelada"],
    },
  },
} as const
