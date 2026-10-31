// Perfis de acesso, abas do sistema e pré-definições de permissão por perfil.

export const ROLES = {
  ADMIN: 'admin',
  TECNICO: 'tecnico',
  CLINICO: 'clinico',
  GESTOR: 'gestor',
};

export const ROLE_LABELS = {
  admin: 'Administrativo',
  tecnico: 'Equipe técnica',
  clinico: 'Clínica',
  gestor: 'Gestão',
};

/** Perfis na ordem em que aparecem nas telas de configuração. */
export const PERFIS = ['admin', 'tecnico', 'clinico', 'gestor'];

/**
 * Fonte única das abas da barra lateral. A chave é o que fica gravado em
 * ConfiguracaoInstituicao.acessos_perfil; a ordem é a ordem do menu.
 */
export const ABAS = [
  { key: 'dashboard', label: 'Dashboard', path: '/' },
  { key: 'chamados', label: 'Chamados', path: '/chamados' },
  { key: 'abrir_chamado', label: 'Abrir Chamado', path: '/chamados/novo' },
  { key: 'equipamentos', label: 'Equipamentos', path: '/equipamentos' },
  { key: 'manutencoes', label: 'Manutenções', path: '/manutencoes' },
  { key: 'contratos', label: 'Contratos', path: '/contratos' },
  { key: 'pecas', label: 'Peças', path: '/pecas' },
  { key: 'indicadores', label: 'Indicadores', path: '/indicadores' },
  { key: 'usuarios', label: 'Usuários', path: '/usuarios' },
  { key: 'configuracoes', label: 'Configurações', path: '/configuracoes' },
];

/** Pré-definições por perfil, aplicadas enquanto o administrador não personalizar. */
export const ACESSOS_PADRAO = {
  admin: [
    'dashboard', 'chamados', 'equipamentos', 'manutencoes',
    'contratos', 'pecas', 'indicadores', 'usuarios', 'configuracoes',
  ],
  gestor: ['dashboard', 'chamados', 'equipamentos', 'manutencoes', 'contratos', 'indicadores'],
  tecnico: ['chamados', 'manutencoes', 'equipamentos'],
  clinico: ['abrir_chamado', 'chamados'],
};

/** Aba que não pode ser retirada do Administrador, para não travar o próprio ajuste. */
export const ABA_TRAVADA = 'configuracoes';

/** Chaves de aba liberadas para o perfil: as gravadas ou, sem personalização, as padrão. */
export function chavesDoPerfil(config, role) {
  const salvo = (config?.acessos_perfil || []).find((registro) => registro.perfil === role);
  // Abas que deixaram de existir não ficam gravadas como chave órfã.
  if (Array.isArray(salvo?.abas)) return salvo.abas.filter((chave) => ABAS.some((aba) => aba.key === chave));
  return ACESSOS_PADRAO[role] || ACESSOS_PADRAO.clinico;
}

/** Abas liberadas para o perfil, já na ordem do menu. */
export function abasDoPerfil(config, role) {
  const chaves = chavesDoPerfil(config, role);
  return ABAS.filter((aba) => chaves.includes(aba.key));
}

/** A rota pertence ao módulo da aba ('/chamados' cobre '/chamados/novo'). */
export function rotaDaAba(aba, pathname) {
  if (aba.path === '/') return pathname === '/';
  return pathname === aba.path || pathname.startsWith(`${aba.path}/`);
}

/** Aba liberada que cobre a rota atual; null quando o perfil não tem acesso. */
export function abaPermitida(config, role, pathname) {
  return abasDoPerfil(config, role).find((aba) => rotaDaAba(aba, pathname)) || null;
}