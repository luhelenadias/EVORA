// Role-based access control configuration
export const ROLES = {
  ADMIN: 'admin',
  TECNICO: 'tecnico',
  CLINICO: 'clinico',
  GESTOR: 'gestor',
};

export const ROLE_LABELS = {
  admin: 'Administrador',
  tecnico: 'Técnico de Manutenção',
  clinico: 'Clínico',
  gestor: 'Gestor de Eng. Clínica',
};

export const MENU_BY_ROLE = {
  admin: ['dashboard', 'chamados', 'equipamentos', 'equipe', 'manutencoes', 'preventivas', 'contratos', 'pecas', 'usuarios', 'indicadores'],
  gestor: ['dashboard', 'chamados', 'manutencoes', 'equipamentos', 'contratos_readonly', 'indicadores'],
  tecnico: ['meus_chamados', 'agenda_manutencoes', 'equipamentos_readonly'],
  clinico: ['abrir_chamado', 'meus_chamados'],
};

export function hasAccess(userRole, feature) {
  const roleMenu = MENU_BY_ROLE[userRole] || [];
  return roleMenu.includes(feature) || roleMenu.includes(feature + '_readonly');
}

export function isReadOnly(userRole, feature) {
  const roleMenu = MENU_BY_ROLE[userRole] || [];
  return roleMenu.includes(feature + '_readonly');
}

export function canManageUsers(userRole) {
  return userRole === ROLES.ADMIN;
}