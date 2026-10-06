import { endpointGet, endpointPost } from "./http";
import type {
  ConfigSeguranca,
  Feature,
  LogAcaoSensivel,
  LogAcesso,
  Perfil,
  PerfilResumo,
  Role,
  Tenant,
  TenantFeature,
  TenantFeatureHistorico,
  SalaResumo,
} from "./types";

/* ---------------- Sessão atual ---------------- */

export const getSessaoAtual = endpointGet<{
  perfil: Perfil | null;
  tenant: Tenant | null;
  features: { id: string; chave: string; nome: string }[];
}>("/sessao");

/** O servidor decide o destino inicial por papel; o cliente só navega para a rota recebida. */
export const resolverDestinoInicial = endpointGet<{ destino: string | null }>(
  "/sessao/destino-inicial",
);

/* ---------------- Painel Master ---------------- */

export const masterDashboard = endpointGet<{
  tenants: Tenant[];
  features: Feature[];
  tenantFeatures: TenantFeature[];
  usuarios: PerfilResumo[];
  acessos7d: { sucesso: boolean; created_at: string }[];
}>("/master/dashboard");

export const salvarHospital = endpointPost<
  {
    id?: string | null | undefined;
    nome: string;
    cnpj?: string | null | undefined;
    endereco?: string | null | undefined;
    contato_nome?: string | null | undefined;
    contato_email?: string | null | undefined;
    contato_telefone?: string | null | undefined;
    status: "ativo" | "inativo" | "inadimplente";
    limite_salas?: number | null | undefined;
  },
  { id: string }
>("/master/hospitais/salvar");

export const alternarFeature = endpointPost<
  { tenantId: string; featureId: string; habilitada: boolean },
  { ok: true }
>("/master/features/alternar");

export const salasDoTenantMaster = endpointPost<
  { tenantId: string },
  { salas: SalaResumo[]; limite: number | null }
>("/master/salas/listar");

export const salvarSalaMaster = endpointPost<
  { tenantId: string; id?: string | undefined; nome: string; ativa?: boolean | undefined },
  { ok: true }
>("/master/salas/salvar");

export const excluirSalaMaster = endpointPost<{ tenantId: string; id: string }, { ok: true }>(
  "/master/salas/excluir",
);

export const listarUsuarios = endpointGet<Perfil[]>("/master/usuarios");

export const criarUsuario = endpointPost<
  {
    email: string;
    senha: string;
    nome: string;
    role: Role;
    tenantId?: string | null | undefined;
    featureId?: string | null | undefined;
  },
  { id: string }
>("/master/usuarios/criar");

export const resetarSenha = endpointPost<{ usuarioId: string; senha: string }, { ok: true }>(
  "/master/usuarios/resetar-senha",
);

export const alternarUsuarioAtivo = endpointPost<
  { usuarioId: string; ativo: boolean },
  { ok: true }
>("/master/usuarios/alternar-ativo");

export const atualizarUsuario = endpointPost<
  { usuarioId: string; nome: string; email: string },
  { ok: true }
>("/master/usuarios/atualizar");

export const painelSeguranca = endpointGet<{
  acessos: LogAcesso[];
  acoes: LogAcaoSensivel[];
  config: ConfigSeguranca | null;
  tenants: { id: string; nome: string }[];
  historicoFeatures: TenantFeatureHistorico[];
}>("/master/seguranca/painel");

export const salvarConfigSeguranca = endpointPost<
  { max_tentativas: number; janela_minutos: number; bloqueio_minutos: number },
  { ok: true }
>("/master/seguranca/config");

/* ---------------- Painel do Hospital ---------------- */

export const usuariosDoMeuHospital = endpointGet<Perfil[]>("/hospital/usuarios");
