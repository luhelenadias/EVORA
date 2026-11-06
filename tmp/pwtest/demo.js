const { chromium, devices } = require('playwright');
const fs = require('fs');
const APP = process.env.VITE_BASE44_APP_ID || '6a38513d2a393bf827b5c6b8';
const BASE = 'http://localhost:4173';
const now = Date.now();
const iso = (diasAtras, h = 0) => new Date(now - diasAtras * 864e5 - h * 36e5).toISOString();
const dia = (d) => new Date(now + d * 864e5).toISOString().slice(0, 10);
let n = 0;
const id = (p) => `${p}${String(++n).padStart(4, '0')}`;

const me = { id: 'u1', email: 'lhdias@unifesp.br', full_name: 'Lúcia Helena Dias', role: 'admin', status: 'ativo' };

const equipDefs = [
  ['Ventilador Pulmonar', 'UA-VT0124', 'PAT-202401', 'Suporte à Vida', 'UTI Adulto', 'Ativo', 28, 'Crítica', 'Dräger', 'Evita V500'],
  ['Monitor Multiparamétrico', 'UA-MM0121', 'PAT-202311', 'Suporte à Vida', 'Leito 01', 'Ativo', 27, 'Crítica', 'Philips', 'IntelliVue MX450'],
  ['Desfibrilador', 'PS-DF0103', 'PAT-202209', 'Suporte à Vida', 'Pronto-Socorro', 'Parado', 26, 'Crítica', 'Zoll', 'R Series'],
  ['Bomba de Infusão', 'UA-BI0207', 'PAT-202318', 'Alto Risco', 'UTI Adulto', 'Ativo', 21, 'Alta', 'BD Medical', 'Alaris'],
  ['Autoclave Horizontal', 'CM-AC0102', 'PAT-202105', 'Alto Risco', 'Centro de Material', 'Em Manutenção', 19, 'Alta', 'Baumer', 'HI-VAC'],
  ['Bisturi Elétrico', 'CC-BE0106', 'PAT-202214', 'Alto Risco', 'Centro Cirúrgico', 'Ativo', 18, 'Alta', 'Valleylab', 'Force FX'],
  ['Aparelho de Raios-X Móvel', 'RX-RM0101', 'PAT-202009', 'Médio Risco', 'Radiologia', 'Ativo', 14, 'Média', 'GE', 'AMX-4'],
  ['Eletrocardiógrafo', 'AM-EC0112', 'PAT-202316', 'Médio Risco', 'Ambulatório', 'Ativo', 11, 'Média', 'Philips', 'PageWriter'],
  ['Oxímetro de Pulso', 'EN-OX0145', 'PAT-202401', 'Baixo Risco', 'Enfermaria', 'Ativo', 6, 'Baixa', 'Masimo', 'Rad-97'],
  ['Balança Antropométrica', 'AM-BA0120', 'PAT-201905', 'Baixo Risco', 'Ambulatório', 'Ativo', 4, 'Baixa', 'Welmy', 'W300'],
];
const contrato = {
  id: 'c1', contract_number: 'CTR-2025-004', supplier_name: 'Philips Healthcare', status: 'Vigente',
  start_date: dia(-300), end_date: dia(65), monthly_value: 4200, total_value: 50400,
  sla_response_hours: 4, sla_response_hours_: 4, sla_resolution_hours: 24, preventive_frequency: 'Trimestral',
  included_services: ['Manutenção preventiva', 'Manutenção corretiva'], covered_equipment_ids: [], notes: '', historico_alteracoes: [],
};
const contratoVencido = { ...contrato, id: 'c2', contract_number: 'CTR-2022-010', supplier_name: 'BD Medical', status: 'Vencido', end_date: '2025-12-31', monthly_value: 900, total_value: 43200, sla_resolution_hours: 120, sla_response_hours: 24 };
const equipment = equipDefs.map((d, i) => ({
  id: `e${i + 1}`, name: d[0], codigo_equipamento: d[1], patrimony_number: d[2], criticality: d[3], location_sector: d[4],
  location_unit: 'Hospital EVORA — Unidade Central', operational_status: d[5], prioridade_score: d[6], prioridade_faixa: d[7],
  prioridade_modelo: 'AEMR', prioridade_posicao: i + 1, prioridade_alta: i < 3, status_priorizacao: 'calculado',
  manufacturer: d[8], model: d[9], serial_number: `SN-${d[1]}`, acquisition_date: '2024-02-10', acquisition_value: 38000 + i * 4000,
  contract_id: i < 3 ? 'c1' : i === 3 ? 'c2' : null, periodicidade_preventiva_dias: 90, data_ultima_preventiva: dia(-60), data_proxima_preventiva: dia(30 - i * 9),
  weekly_usage_hours: 120, warranty_end: dia(400), created_date: iso(200),
}));
contrato.covered_equipment_ids = ['e1', 'e2', 'e3'];
contratoVencido.covered_equipment_ids = ['e4'];

const mkOS = (code, eq, type, status, priority, abertoH, extra = {}) => {
  const e = equipment[eq];
  return {
    id: id('os'), code, equipment_id: e.id, equipment_name: e.name, equipment_criticality: e.criticality, sector: e.location_sector,
    type, status, priority, origin: type === 'Preventiva' ? 'Agendada' : 'Manual', open_date: iso(0, abertoH),
    problem_description: type === 'Preventiva' ? 'Manutenção preventiva programada' : extra.desc || 'Falha reportada pelo setor',
    requester_id: extra.req === false ? null : 'u9', requester_name: extra.req === false ? null : 'Enfermagem UTI',
    technician_id: extra.tec ? 't1' : null, technician_name: extra.tec ? 'Guilherme Ferreira' : null,
    sla_status: 'Sem SLA Definido', sla_response_status: 'Sem SLA Definido', parts_used: [], pausas: [], attachments: [],
    created_date: iso(0, abertoH), ...extra.f,
  };
};
const orders = [
  mkOS('OS-2026-037', 1, 'Preventiva', 'Novo', 'Crítica', 20, { f: { scheduled_date: dia(5) } }),
  mkOS('OS-2026-036', 7, 'Corretiva', 'Novo', 'Média', 70, { desc: 'Cabo de paciente com mau contato' }),
  mkOS('OS-2026-035', 4, 'Corretiva', 'Novo', 'Alta', 52, { desc: 'Não atinge a temperatura de esterilização' }),
  mkOS('OS-2026-034', 6, 'Corretiva', 'Novo', 'Média', 80, { desc: 'Colimador desalinhado' }),
  mkOS('OS-2026-033', 1, 'Corretiva', 'Em Andamento', 'Crítica', 30, { tec: true, desc: 'Alarme de SpO2 intermitente', f: { start_date: iso(0, 24) } }),
  mkOS('OS-2026-032', 1, 'Corretiva', 'Em Andamento', 'Crítica', 36, { tec: true, desc: 'Tela com falhas de imagem', f: { start_date: iso(0, 30) } }),
  mkOS('OS-2026-031', 5, 'Corretiva', 'Novo', 'Alta', 100, { desc: 'Cabo de retorno danificado' }),
  mkOS('OS-2026-030', 2, 'Corretiva', 'Aguardando Peça', 'Crítica', 140, { tec: true, desc: 'Bateria não sustenta carga', f: { start_date: iso(0, 120) } }),
  mkOS('OS-2026-029', 0, 'Preventiva', 'Concluído', 'Média', 400, { tec: true, f: { start_date: iso(0, 380), completion_date: iso(0, 376), response_time_minutes: 40, total_cost: 320, technical_report: 'Inspeção geral, limpeza e testes de segurança elétrica. Sem não conformidades.' } }),
  mkOS('OS-2026-028', 3, 'Corretiva', 'Concluído', 'Alta', 600, { tec: true, desc: 'Oclusão falsa recorrente', f: { start_date: iso(0, 590), completion_date: iso(0, 580), response_time_minutes: 55, total_cost: 150, technical_report: 'Sensor de oclusão substituído e calibrado.' } }),
  mkOS('OS-2026-027', 7, 'Corretiva', 'Concluído', 'Média', 800, { tec: true, f: { start_date: iso(0, 795), completion_date: iso(0, 790), response_time_minutes: 30, total_cost: 80 } }),
];
const alertas = [
  ['SLA estourado', 'Urgente', 'OS-2026-032 passou do prazo de resolução — Monitor Multiparamétrico'],
  ['OS aguardando triagem', 'Urgente', 'Aguardando triagem há 3 dias — Aparelho de Raios-X Móvel'],
  ['OS sem técnico', 'Atenção', 'OS-2026-035 aberta sem técnico — Autoclave Horizontal'],
  ['Preventiva próxima', 'Informativo', 'Preventiva em 5 dias — Monitor Multiparamétrico'],
  ['Estoque baixo', 'Atenção', 'Sensor de SpO2 abaixo do estoque mínimo'],
  ['Contrato vencendo', 'Atenção', 'CTR-2025-004 vence em 65 dias — Philips Healthcare'],
].map((a, i) => ({ id: `al${i}`, tipo: a[0], nivel: a[1], titulo: a[2], mensagem: '', status: 'Novo', destinatario_perfis: ['admin', 'gestor'], created_date: iso(0, i) }));
const pecas = [
  ['Sensor de SpO2 adulto', 'SP-001', 2, 5, 380], ['Cabo ECG 5 vias', 'SP-002', 6, 4, 190], ['Bateria 12V selada', 'SP-003', 1, 3, 240],
  ['Filtro HEPA', 'SP-004', 9, 4, 95], ['Eletrodo de bisturi', 'SP-005', 14, 10, 12],
].map((p, i) => ({ id: `p${i}`, name: p[0], part_number: p[1], current_stock: p[2], minimum_stock: p[3], unit_cost: p[4], unit: 'un', location: 'Almoxarifado', created_date: iso(100) }));
const config = {
  id: 'cfg', custo_hora_tecnica: 80, modelo_priorizacao: 'avancado', faixa_critica_ate_pct: 25, faixa_alta_ate_pct: 50, faixa_media_ate_pct: 75,
  alertas_ativos: ['SLA estourado', 'OS sem técnico', 'Estoque baixo', 'Preventiva próxima', 'Contrato vencendo', 'OS aguardando triagem'],
  alerta_preventiva_antecedencia_dias: 7, alerta_sla_risco_pct: 80, alerta_triagem_dias: 1, alerta_contrato_dias: [90, 60, 30], alerta_pausa_dias: 3, alerta_chamado_parado_dias: 5,
  acessos_perfil: [{ perfil: 'admin', abas: ['dashboard', 'chamados', 'equipamentos', 'manutencoes', 'contratos', 'pecas', 'indicadores', 'usuarios', 'configuracoes'] }],
};
const planos = equipment.slice(0, 6).map((e, i) => ({ id: `mp${i}`, equipment_id: e.id, equipment_name: e.name, frequency_days: 90, next_date: dia(10 + i * 6), last_date: dia(-60), status: 'Ativo' }));
const data = { Equipment: equipment, ServiceOrder: orders, Contract: [contrato, contratoVencido], SparePart: pecas, Alerta: alertas, ConfiguracaoInstituicao: [config], MaintenancePlan: planos, PedidoPeca: [] };
const tecnicos = [{ id: 't1', full_name: 'Guilherme Ferreira', email: 'g@x.br', role: 'tecnico' }, { id: 't2', full_name: 'Marina Souza', email: 'm@x.br', role: 'tecnico' }];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  await ctx.addInitScript(() => { try { localStorage.setItem('base44_access_token', 'demo'); localStorage.setItem('token', 'demo'); sessionStorage.setItem('alertas:verificados', '1'); } catch {} });
  const unmatched = new Set();
  await ctx.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    let m;
    if (/public-settings/.test(p)) return json({ id: APP, public_settings: { requires_auth: true } });
    if (/\/entities\/User\/me$/.test(p) || /\/auth\/me$/.test(p)) return json(me);
    if ((m = p.match(/\/entities\/(\w+)(?:\/(\w+))?$/))) {
      const [, name, rid] = m;
      if (name === 'User') return json([me, ...tecnicos]);
      const rows = data[name] || [];
      if (rid) return json(rows.find((r) => r.id === rid) || {});
      return json(rows);
    }
    if ((m = p.match(/\/functions\/(\w+)$/))) {
      if (m[1] === 'listarEquipeTecnica') return json({ tecnicos });
      if (m[1] === 'aplicarConvite') return json({ aplicado: false });
      return json({});
    }
    unmatched.add(`${route.request().method()} ${p}`);
    return json({});
  });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  fs.mkdirSync('/tmp/shots', { recursive: true });
  const shot = async (nome) => { await page.waitForTimeout(900); await page.screenshot({ path: `/tmp/shots/${nome}.jpg`, type: 'jpeg', quality: 80 }); console.log('shot', nome); };
  const ir = async (path) => { await page.goto(BASE + path, { waitUntil: 'networkidle' }); };

  await ir('/');
  await shot('01_inicio');
  await page.evaluate(() => window.scrollTo(0, 620)); await shot('02_indicadores');
  await ir('/chamados'); await shot('03_chamados');
  try { await page.locator('tbody tr').first().click(); await shot('04_os_detalhe'); await page.keyboard.press('Escape'); } catch (e) { console.log('os detalhe falhou', e.message); }
  await ir('/equipamentos'); await shot('05_equipamentos');
  try { await page.locator('text=Ventilador Pulmonar').first().click(); await shot('06_equipamento_ficha'); } catch (e) { console.log('ficha falhou', e.message); }
  for (const [nome, path] of [['07_manutencoes', '/manutencoes'], ['08_contratos', '/contratos'], ['09_pecas', '/pecas']]) {
    try { await ir(path); await shot(nome); } catch (e) { console.log(nome, 'falhou', e.message); }
  }
  await ir('/'); 
  try { await page.locator('button.lg\\:hidden').first().click(); await shot('10_menu'); } catch (e) { console.log('menu falhou', e.message); }
  console.log('ERROS', JSON.stringify(erros));
  console.log('UNMATCHED', JSON.stringify([...unmatched]));
  await browser.close();
})();
