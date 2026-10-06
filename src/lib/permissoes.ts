/**
 * Matriz de permissões do ecossistema KlinSync.
 * Fonte única de verdade: UI e verificações de servidor consultam este arquivo.
 */

export type Papel = "master_admin" | "hospital_admin" | "operador";

export type Nivel = "sim" | "nao" | "contratado" | "vinculado" | "parcial";

export type Recurso = {
  chave: string;
  nome: string;
  descricao: string;
  grupo: "Plataforma" | "Hospital" | "Módulos";
  niveis: Record<Papel, Nivel>;
  observacao?: Partial<Record<Papel, string>>;
};

export const PAPEIS: { valor: Papel; nome: string; descricao: string }[] = [
  {
    valor: "master_admin",
    nome: "Equipe Trizion",
    descricao: "Controle total da plataforma, hospitais, features e acessos.",
  },
  {
    valor: "hospital_admin",
    nome: "Admin do hospital",
    descricao: "Gerencia os logins operacionais e acompanha os módulos contratados.",
  },
  {
    valor: "operador",
    nome: "Operacional",
    descricao: "Um login por feature, com acesso apenas ao módulo vinculado.",
  },
];

export const RECURSOS: Recurso[] = [
  {
    chave: "hospitais",
    nome: "Hospitais (cadastro e edição)",
    descricao: "Criar, editar e mudar o status contratual dos hospitais.",
    grupo: "Plataforma",
    niveis: { master_admin: "sim", hospital_admin: "nao", operador: "nao" },
  },
  {
    chave: "features_por_hospital",
    nome: "Features por hospital",
    descricao: "Ativar ou desativar módulos contratados de cada hospital.",
    grupo: "Plataforma",
    niveis: { master_admin: "sim", hospital_admin: "nao", operador: "nao" },
  },
  {
    chave: "usuarios_plataforma",
    nome: "Usuários da plataforma",
    descricao: "Criar, resetar senha e ativar/desativar qualquer login.",
    grupo: "Plataforma",
    niveis: { master_admin: "sim", hospital_admin: "nao", operador: "nao" },
  },
  {
    chave: "seguranca",
    nome: "Política de segurança",
    descricao: "Tentativas máximas de login, janela e tempo de bloqueio.",
    grupo: "Plataforma",
    niveis: { master_admin: "sim", hospital_admin: "nao", operador: "nao" },
  },
  {
    chave: "usuarios_hospital",
    nome: "Usuários do próprio hospital",
    descricao: "Ver e administrar os logins do hospital.",
    grupo: "Hospital",
    niveis: { master_admin: "sim", hospital_admin: "sim", operador: "nao" },
  },
  {
    chave: "convites",
    nome: "Convites de acesso",
    descricao: "Gerar link de convite para novos logins.",
    grupo: "Hospital",
    niveis: { master_admin: "sim", hospital_admin: "parcial", operador: "nao" },
    observacao: { hospital_admin: "Somente logins operacionais do próprio hospital." },
  },
  {
    chave: "auditoria_global",
    nome: "Auditoria da plataforma",
    descricao: "Acessos, ações sensíveis e histórico de features de todos os hospitais.",
    grupo: "Plataforma",
    niveis: { master_admin: "sim", hospital_admin: "nao", operador: "nao" },
  },
  {
    chave: "auditoria_hospital",
    nome: "Auditoria do hospital",
    descricao: "Registro de acessos e ações do próprio hospital.",
    grupo: "Hospital",
    niveis: { master_admin: "sim", hospital_admin: "sim", operador: "nao" },
  },
  {
    chave: "modulo_check_in",
    nome: "Módulo Check-in",
    descricao: "Registro de entrada de médicos com foto.",
    grupo: "Módulos",
    niveis: { master_admin: "sim", hospital_admin: "contratado", operador: "vinculado" },
  },
  {
    chave: "modulo_giro_sala",
    nome: "Módulo Giro de Sala",
    descricao: "Cronometragem de desmontagem, limpeza e paradas de sala.",
    grupo: "Módulos",
    niveis: { master_admin: "sim", hospital_admin: "contratado", operador: "vinculado" },
  },
];

export const ROTULO_NIVEL: Record<Nivel, string> = {
  sim: "Permitido",
  nao: "Bloqueado",
  contratado: "Se contratado",
  vinculado: "Se vinculado",
  parcial: "Parcial",
};

/** Recursos liberados para um papel (usado no resumo por usuário). */
export function recursosDoPapel(papel: Papel): Recurso[] {
  return RECURSOS.filter((r) => r.niveis[papel] !== "nao");
}

/** Verificação simples usada pelos guards de servidor. */
export function podeRecurso(papel: Papel | null | undefined, chave: string): boolean {
  if (!papel) return false;
  const r = RECURSOS.find((x) => x.chave === chave);
  if (!r) return false;
  return r.niveis[papel] !== "nao";
}
