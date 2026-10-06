import type { Tables } from "./db-types";

export type Tenant = Tables<"tenants">;
export type Feature = Tables<"features">;
export type TenantFeature = Tables<"tenant_features">;
export type Perfil = Tables<"usuarios_perfil">;
export type Role = Perfil["role"];
export type LogAcesso = Tables<"log_acessos">;
export type LogAcaoSensivel = Tables<"log_acoes_sensiveis">;
export type ConfigSeguranca = Tables<"config_seguranca">;
export type TenantFeatureHistorico = Tables<"tenant_features_historico">;
export type IpBloqueioRow = Tables<"ip_bloqueios">;
/** O hash do token nunca é enviado ao navegador. */
export type Convite = Omit<Tables<"convites">, "token_hash">;

export type SalaResumo = Pick<
  Tables<"salas">,
  "id" | "nome" | "ativa" | "status_atual" | "cirurgia_atual" | "updated_at"
>;

export type PerfilResumo = Pick<
  Perfil,
  "id" | "nome" | "email" | "role" | "tenant_id" | "feature_id" | "ativo"
>;

export type Pagina<T> = { linhas: T[]; total: number };

export type FiltroPagina = {
  pagina?: number | undefined;
  porPagina?: number | undefined;
  de?: string | undefined;
  ate?: string | undefined;
};

/** Propriedades opcionais que aceitam `undefined` explícito (exactOptionalPropertyTypes). */
export type Parcial<T> = { [K in keyof T]?: T[K] | undefined };
