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
 * Indicadores é a página inicial e substituiu o antigo Dashboard.
 */
export const ABAS = [
  { key: 'indicadores', label: 'Indicadores', path: '/' },
  { key: 'chamados', label: 'Chamados', path: '/chamados' },
  { key: 'equipamentos', label: 'Equipamentos', path: '/equipamentos' },
  { key: 'manutencoes', label: 'Manutenções', path: '/manutencoes' },
  { key: 'contratos', label: 'Contratos', path: '/contratos' },
  { key: 'pecas', label: 'Peças', path: '/pecas' },
  { key: 'usuarios', label: 'Usuários', path: '/usuarios' },
  { key: 'configuracoes', label: 'Configurações', path: '/configuracoes' },
];

/** Pré-definições por perfil, aplicadas enquanto o administrador não personalizar. */
export const ACESSOS_PADRAO = {
  admin: [
    'indicadores', 'chamados', 'equipamentos', 'manutencoes',
    'contratos', 'pecas', 'usuarios', 'configuracoes',
  ],
  gestor: ['indicadores', 'chamados', 'equipamentos', 'manutencoes', 'contratos'],
  tecnico: ['indicadores', 'chamados', 'manutencoes', 'equipamentos'],
  clinico: ['indicadores', 'chamados'],
};

/** Aba que não pode ser retirada do Administrador, para não travar o próprio ajuste. */
export const ABA_TRAVADA = 'configuracoes';

/** 'dashboard' era a chave do antigo painel: agora a página inicial é Indicadores. */
const CHAVES_RENOMEADAS = { dashboard: 'indicadores' };

/** Mantém apenas abas existentes, aplicando os nomes antigos. */
function chavesValidas(lista = []) {
  const chaves = lista.map((chave) => CHAVES_RENOMEADAS[chave] || chave);
  return [...new Set(chaves.filter((chave) => ABAS.some((aba) => aba.key === chave)))];
}

/** Chaves de aba liberadas para o perfil: as gravadas ou, sem personalização, as padrão. */
export function chavesDoPerfil(config, role) {
  const salvo = (config?.acessos_perfil || []).find((registro) => registro.perfil === role);
  // Abas que deixaram de existir não ficam gravadas como chave órfã.
  if (Array.isArray(salvo?.abas)) return chavesValidas(salvo.abas);
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

/** Chaves do usuário: as individuais, quando ele tem acessos próprios; senão as do perfil. */
export function chavesDoUsuario(config, user) {
  const individuais = chavesValidas(user?.acessos_individuais || []);
  if (!individuais.length) return chavesDoPerfil(config, user?.role);
  // O Administrador não perde a própria tela de configuração de acessos.
  return user?.role === ROLES.ADMIN ? [...new Set([...individuais, ABA_TRAVADA])] : individuais;
}

/** Abas liberadas para o usuário, já na ordem do menu. */
export function abasDoUsuario(config, user) {
  const chaves = chavesDoUsuario(config, user);
  return ABAS.filter((aba) => chaves.includes(aba.key));
}

/** Aba liberada que cobre a rota atual para este usuário; null quando não tem acesso. */
export function abaPermitidaDoUsuario(config, user, pathname) {
  return abasDoUsuario(config, user).find((aba) => rotaDaAba(aba, pathname)) || null;
}

/** Nomes das abas, para o log de auditoria. */
export function rotulosDeAcessos(chaves) {
  if (!chaves?.length) return 'segue o perfil';
  return ABAS.filter((aba) => chaves.includes(aba.key)).map((aba) => aba.label).join(', ');
}