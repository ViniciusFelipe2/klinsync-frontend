export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      auditoria: {
        Row: {
          acao: string;
          created_at: string;
          dados_antes: Json | null;
          dados_depois: Json | null;
          id: string;
          registro_id: string | null;
          tabela: string;
          usuario_id: string | null;
        };
        Insert: {
          acao: string;
          created_at?: string;
          dados_antes?: Json | null;
          dados_depois?: Json | null;
          id?: string;
          registro_id?: string | null;
          tabela: string;
          usuario_id?: string | null;
        };
        Update: {
          acao?: string;
          created_at?: string;
          dados_antes?: Json | null;
          dados_depois?: Json | null;
          id?: string;
          registro_id?: string | null;
          tabela?: string;
          usuario_id?: string | null;
        };
        Relationships: [];
      };
      check_ins: {
        Row: {
          checked_in_at: string;
          created_at: string;
          doctor_name: string;
          id: string;
          photo_path: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          checked_in_at?: string;
          created_at?: string;
          doctor_name: string;
          id?: string;
          photo_path: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          checked_in_at?: string;
          created_at?: string;
          doctor_name?: string;
          id?: string;
          photo_path?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "check_ins_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      checkin_rate_limits: {
        Row: {
          attempts: number;
          client_key: string;
          id: string;
          window_start: string;
        };
        Insert: {
          attempts?: number;
          client_key: string;
          id?: string;
          window_start?: string;
        };
        Update: {
          attempts?: number;
          client_key?: string;
          id?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      config_seguranca: {
        Row: {
          bloqueio_minutos: number;
          id: boolean;
          janela_minutos: number;
          max_tentativas: number;
          updated_at: string;
        };
        Insert: {
          bloqueio_minutos?: number;
          id?: boolean;
          janela_minutos?: number;
          max_tentativas?: number;
          updated_at?: string;
        };
        Update: {
          bloqueio_minutos?: number;
          id?: boolean;
          janela_minutos?: number;
          max_tentativas?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      convites: {
        Row: {
          aceito_em: string | null;
          aceito_por: string | null;
          created_at: string;
          criado_por: string | null;
          email: string;
          expira_em: string;
          feature_id: string | null;
          id: string;
          nome: string;
          revogado_em: string | null;
          revogado_por: string | null;
          role: Database["public"]["Enums"]["app_role"];
          tenant_id: string | null;
          token_hash: string;
          updated_at: string;
        };
        Insert: {
          aceito_em?: string | null;
          aceito_por?: string | null;
          created_at?: string;
          criado_por?: string | null;
          email: string;
          expira_em?: string;
          feature_id?: string | null;
          id?: string;
          nome: string;
          revogado_em?: string | null;
          revogado_por?: string | null;
          role: Database["public"]["Enums"]["app_role"];
          tenant_id?: string | null;
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          aceito_em?: string | null;
          aceito_por?: string | null;
          created_at?: string;
          criado_por?: string | null;
          email?: string;
          expira_em?: string;
          feature_id?: string | null;
          id?: string;
          nome?: string;
          revogado_em?: string | null;
          revogado_por?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          tenant_id?: string | null;
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "convites_feature_id_fkey";
            columns: ["feature_id"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "convites_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      eventos_giro: {
        Row: {
          cirurgia_anterior: string | null;
          cirurgia_proxima: string | null;
          created_at: string;
          duracao_segundos: number | null;
          fim: string | null;
          id: string;
          inicio: string;
          sala_id: string;
          tipo_evento: Database["public"]["Enums"]["tipo_evento_giro"];
          usuario_fim_id: string | null;
          usuario_inicio_id: string;
        };
        Insert: {
          cirurgia_anterior?: string | null;
          cirurgia_proxima?: string | null;
          created_at?: string;
          duracao_segundos?: number | null;
          fim?: string | null;
          id?: string;
          inicio?: string;
          sala_id: string;
          tipo_evento: Database["public"]["Enums"]["tipo_evento_giro"];
          usuario_fim_id?: string | null;
          usuario_inicio_id: string;
        };
        Update: {
          cirurgia_anterior?: string | null;
          cirurgia_proxima?: string | null;
          created_at?: string;
          duracao_segundos?: number | null;
          fim?: string | null;
          id?: string;
          inicio?: string;
          sala_id?: string;
          tipo_evento?: Database["public"]["Enums"]["tipo_evento_giro"];
          usuario_fim_id?: string | null;
          usuario_inicio_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "eventos_giro_sala_id_fkey";
            columns: ["sala_id"];
            isOneToOne: false;
            referencedRelation: "salas";
            referencedColumns: ["id"];
          },
        ];
      };
      eventos_sala_parada: {
        Row: {
          created_at: string;
          duracao_segundos: number | null;
          fim: string | null;
          id: string;
          inicio: string;
          sala_id: string;
          usuario_fim_id: string | null;
          usuario_inicio_id: string;
        };
        Insert: {
          created_at?: string;
          duracao_segundos?: number | null;
          fim?: string | null;
          id?: string;
          inicio?: string;
          sala_id: string;
          usuario_fim_id?: string | null;
          usuario_inicio_id: string;
        };
        Update: {
          created_at?: string;
          duracao_segundos?: number | null;
          fim?: string | null;
          id?: string;
          inicio?: string;
          sala_id?: string;
          usuario_fim_id?: string | null;
          usuario_inicio_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "eventos_sala_parada_sala_id_fkey";
            columns: ["sala_id"];
            isOneToOne: false;
            referencedRelation: "salas";
            referencedColumns: ["id"];
          },
        ];
      };
      features: {
        Row: {
          chave: string;
          created_at: string;
          descricao: string | null;
          id: string;
          nome_exibicao: string;
        };
        Insert: {
          chave: string;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          nome_exibicao: string;
        };
        Update: {
          chave?: string;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          nome_exibicao?: string;
        };
        Relationships: [];
      };
      ip_bloqueios: {
        Row: {
          bloqueado_ate: string | null;
          created_at: string;
          criado_por: string | null;
          id: string;
          ip: string;
          motivo: string;
          permanente: boolean;
          updated_at: string;
        };
        Insert: {
          bloqueado_ate?: string | null;
          created_at?: string;
          criado_por?: string | null;
          id?: string;
          ip: string;
          motivo?: string;
          permanente?: boolean;
          updated_at?: string;
        };
        Update: {
          bloqueado_ate?: string | null;
          created_at?: string;
          criado_por?: string | null;
          id?: string;
          ip?: string;
          motivo?: string;
          permanente?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      log_acessos: {
        Row: {
          created_at: string;
          email_tentado: string | null;
          id: string;
          ip: string | null;
          pais_regiao: string | null;
          sucesso: boolean;
          tenant_id: string | null;
          usuario_id: string | null;
        };
        Insert: {
          created_at?: string;
          email_tentado?: string | null;
          id?: string;
          ip?: string | null;
          pais_regiao?: string | null;
          sucesso: boolean;
          tenant_id?: string | null;
          usuario_id?: string | null;
        };
        Update: {
          created_at?: string;
          email_tentado?: string | null;
          id?: string;
          ip?: string | null;
          pais_regiao?: string | null;
          sucesso?: boolean;
          tenant_id?: string | null;
          usuario_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "log_acessos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      log_acoes_sensiveis: {
        Row: {
          acao: string;
          created_at: string;
          detalhes: Json;
          id: string;
          usuario_id: string | null;
        };
        Insert: {
          acao: string;
          created_at?: string;
          detalhes?: Json;
          id?: string;
          usuario_id?: string | null;
        };
        Update: {
          acao?: string;
          created_at?: string;
          detalhes?: Json;
          id?: string;
          usuario_id?: string | null;
        };
        Relationships: [];
      };
      sala_dispositivos: {
        Row: {
          created_at: string;
          device_id: string;
          sala_id: string;
          ultimo_sinal: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          device_id: string;
          sala_id: string;
          ultimo_sinal?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          device_id?: string;
          sala_id?: string;
          ultimo_sinal?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sala_dispositivos_sala_id_fkey";
            columns: ["sala_id"];
            isOneToOne: true;
            referencedRelation: "salas";
            referencedColumns: ["id"];
          },
        ];
      };
      salas: {
        Row: {
          ativa: boolean;
          cirurgia_atual: string | null;
          created_at: string;
          id: string;
          nome: string;
          status_atual: Database["public"]["Enums"]["sala_status"];
          tenant_id: string | null;
          updated_at: string;
        };
        Insert: {
          ativa?: boolean;
          cirurgia_atual?: string | null;
          created_at?: string;
          id?: string;
          nome: string;
          status_atual?: Database["public"]["Enums"]["sala_status"];
          tenant_id?: string | null;
          updated_at?: string;
        };
        Update: {
          ativa?: boolean;
          cirurgia_atual?: string | null;
          created_at?: string;
          id?: string;
          nome?: string;
          status_atual?: Database["public"]["Enums"]["sala_status"];
          tenant_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "salas_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_features: {
        Row: {
          feature_id: string;
          habilitada: boolean;
          habilitada_em: string;
          habilitada_por: string | null;
          id: string;
          tenant_id: string;
        };
        Insert: {
          feature_id: string;
          habilitada?: boolean;
          habilitada_em?: string;
          habilitada_por?: string | null;
          id?: string;
          tenant_id: string;
        };
        Update: {
          feature_id?: string;
          habilitada?: boolean;
          habilitada_em?: string;
          habilitada_por?: string | null;
          id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_features_feature_id_fkey";
            columns: ["feature_id"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_features_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_features_historico: {
        Row: {
          alterado_por: string | null;
          created_at: string;
          feature_id: string;
          habilitada: boolean;
          id: string;
          tenant_id: string;
        };
        Insert: {
          alterado_por?: string | null;
          created_at?: string;
          feature_id: string;
          habilitada: boolean;
          id?: string;
          tenant_id: string;
        };
        Update: {
          alterado_por?: string | null;
          created_at?: string;
          feature_id?: string;
          habilitada?: boolean;
          id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_features_historico_feature_id_fkey";
            columns: ["feature_id"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_features_historico_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          cnpj: string | null;
          contato_email: string | null;
          contato_nome: string | null;
          contato_telefone: string | null;
          contratado_em: string;
          created_at: string;
          endereco: string | null;
          id: string;
          limite_salas: number | null;
          nome: string;
          status: string;
        };
        Insert: {
          cnpj?: string | null;
          contato_email?: string | null;
          contato_nome?: string | null;
          contato_telefone?: string | null;
          contratado_em?: string;
          created_at?: string;
          endereco?: string | null;
          id?: string;
          limite_salas?: number | null;
          nome: string;
          status?: string;
        };
        Update: {
          cnpj?: string | null;
          contato_email?: string | null;
          contato_nome?: string | null;
          contato_telefone?: string | null;
          contratado_em?: string;
          created_at?: string;
          endereco?: string | null;
          id?: string;
          limite_salas?: number | null;
          nome?: string;
          status?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      usuarios_perfil: {
        Row: {
          ativo: boolean;
          created_at: string;
          email: string | null;
          feature_id: string | null;
          id: string;
          nome: string;
          role: Database["public"]["Enums"]["app_role"];
          tenant_id: string | null;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          email?: string | null;
          feature_id?: string | null;
          id: string;
          nome?: string;
          role: Database["public"]["Enums"]["app_role"];
          tenant_id?: string | null;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          email?: string | null;
          feature_id?: string | null;
          id?: string;
          nome?: string;
          role?: Database["public"]["Enums"]["app_role"];
          tenant_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usuarios_perfil_feature_id_fkey";
            columns: ["feature_id"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usuarios_perfil_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      diagnostico_seguranca: { Args: never; Returns: Json };
      feature_habilitada: {
        Args: { _chave: string; _tenant_id: string };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      heartbeat_sala: {
        Args: { _device_id: string; _sala_id: string };
        Returns: undefined;
      };
      is_master_admin: { Args: never; Returns: boolean };
      liberar_sala: {
        Args: { _device_id: string; _sala_id: string };
        Returns: undefined;
      };
      meu_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      meu_tenant: { Args: never; Returns: string };
      minha_feature: { Args: never; Returns: string };
      purgar_dados_antigos: { Args: { _dias?: number }; Returns: Json };
      reservar_sala: {
        Args: { _device_id: string; _sala_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "operador" | "administrador" | "master_admin" | "hospital_admin";
      sala_status: "livre" | "desmontagem" | "limpeza" | "remontagem";
      tipo_evento_giro: "desmontagem" | "limpeza" | "remontagem";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["operador", "administrador", "master_admin", "hospital_admin"],
      sala_status: ["livre", "desmontagem", "limpeza", "remontagem"],
      tipo_evento_giro: ["desmontagem", "limpeza", "remontagem"],
    },
  },
} as const;
