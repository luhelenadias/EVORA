# EVORA — Plataforma Inteligente para Gestão de Engenharia Clínica

> Trabalho de Conclusão de Curso — Engenharia Biomédica
> Instituto de Ciências e Tecnologia, Universidade Federal de São Paulo (ICT-UNIFESP)

**Título do trabalho:** EVORA — Plataforma Inteligente para Gestão de Engenharia Clínica com Apoio à Tomada de Decisão Baseada em Inteligência Artificial
**Discente:** Lucia Helena Dias
**Orientador:** Prof. Dr. Matheus Cardoso Moraes

---

## Acesso e demonstração

| Recurso | Acesso |
|---|---|
| Plataforma web | [yourevora.com](https://yourevora.com) |
| Aplicativo Android (APK) | [Release v1.0](https://github.com/luhelenadias/EVORA/releases/tag/v1.0) |
| Tutorial de uso da plataforma | [youtu.be/75JenC-VIAk](https://youtu.be/75JenC-VIAk) |
| Vídeo explicativo do trabalho | [youtu.be/3nzqj_7eqpo](https://youtu.be/3nzqj_7eqpo) |

### Vídeos demonstrativos

| Tutorial de uso da plataforma | Vídeo explicativo do trabalho |
|:---:|:---:|
| [![Tutorial de uso do EVORA](https://img.youtube.com/vi/75JenC-VIAk/hqdefault.jpg)](https://youtu.be/75JenC-VIAk) | [![Vídeo explicativo do EVORA](https://img.youtube.com/vi/3nzqj_7eqpo/hqdefault.jpg)](https://youtu.be/3nzqj_7eqpo) |
| Apresenta os principais fluxos de uso: indicadores, triagem e execução de chamados, uso em campo pelo aplicativo e recursos de IA. | Apresenta o trabalho de forma resumida, navegando em mais detalhes pela plataforma. |

O aplicativo Android reúne os cinco módulos usados em campo (Indicadores, Chamados, Equipamentos, Manutenções e Peças). Para instalá-lo, baixe o arquivo `.apk` da Release e permita a instalação de apps de fontes desconhecidas quando o Android solicitar.

---

## Sumário

1. [Contexto e problema](#1-contexto-e-problema)
2. [Objetivos](#2-objetivos)
3. [Metodologia](#3-metodologia)
4. [Visão geral da plataforma](#4-visão-geral-da-plataforma)
5. [Módulos funcionais](#5-módulos-funcionais)
6. [Recursos de Inteligência Artificial](#6-recursos-de-inteligência-artificial)
7. [Indicadores e métodos de priorização](#7-indicadores-e-métodos-de-priorização)
8. [Arquitetura e tecnologias](#8-arquitetura-e-tecnologias)
9. [Estrutura do repositório](#9-estrutura-do-repositório)
10. [Execução local](#10-execução-local)
11. [Referências](#11-referências)

---

## 1. Contexto e problema

Os equipamentos médico-hospitalares são essenciais para diagnóstico, monitoramento, terapia e suporte à vida. Cabe à Engenharia Clínica gerenciar essas tecnologias ao longo de todo o seu ciclo de vida, da incorporação à desativação, garantindo disponibilidade, segurança e confiabilidade [1–3].

Com o crescimento do parque tecnológico, aumenta também o volume de informações a registrar e analisar: inventário, histórico de manutenções, contratos, equipes técnicas e indicadores de desempenho. Na prática, esses dados costumam estar distribuídos entre planilhas, documentos e sistemas distintos, o que dificulta a rastreabilidade e limita o uso dos dados na tomada de decisão. Mesmo os sistemas informatizados existentes tendem a atuar como repositórios operacionais, deixando a interpretação dos indicadores a cargo da análise manual dos gestores [4].

O EVORA parte dessa lacuna: reunir em um único ambiente a gestão operacional da Engenharia Clínica, o monitoramento de indicadores e mecanismos de apoio à decisão baseados em Inteligência Artificial (IA) [5, 6].

## 2. Objetivos

### Objetivo geral

Desenvolver uma plataforma inteligente de apoio à gestão da Engenharia Clínica, capaz de centralizar informações sobre equipamentos médico-hospitalares, contratos, equipes técnicas e atividades de manutenção, incorporando recursos de IA para análise de indicadores e suporte à tomada de decisão.

### Objetivos específicos

- Identificar, por revisão bibliográfica e documental, os principais desafios da gestão de tecnologias em saúde;
- Levantar os requisitos funcionais e não funcionais da plataforma;
- Modelar a arquitetura da solução, seus módulos, fluxos operacionais e perfis de acesso;
- Desenvolver uma aplicação web que centralize equipamentos, contratos, equipes, ordens de serviço e indicadores;
- Implementar recursos de IA que analisem dados operacionais e forneçam recomendações de apoio à decisão;
- Disponibilizar o acompanhamento de indicadores de desempenho de manutenção e disponibilidade;
- Validar a solução em cenários simulados representativos da rotina da Engenharia Clínica.

## 3. Metodologia

A pesquisa é aplicada, de natureza tecnológica, e segue os princípios da **Design Science Research (DSR)** [7], que orienta a concepção, o desenvolvimento e a avaliação de um artefato voltado a um problema prático. O trabalho está organizado em cinco fases:

| Fase | Descrição | Resultado |
|---|---|---|
| 1. Identificação do problema | Revisão bibliográfica e normativa (ex.: ABNT NBR 15943) e análise de soluções existentes | Requisitos funcionais e não funcionais |
| 2. Modelagem da solução | Definição de módulos, fluxos operacionais e acessos por perfil | Especificação conceitual e fluxogramas |
| 3. Desenvolvimento | Implementação incremental na plataforma Base44 com testes funcionais preliminares | Versão funcional da plataforma |
| 4. Refinamento e IA | Ajustes de usabilidade e integração dos recursos de IA | Versão consolidada |
| 5. Validação | Avaliação com dados e cenários simulados (cadastro, manutenção, contratos, indicadores) | Análise de aplicabilidade e oportunidades de melhoria |

## 4. Visão geral da plataforma

O EVORA é uma aplicação web responsiva, organizada em torno do ciclo de vida do equipamento e da ordem de serviço (OS). O acesso é controlado por quatro perfis, cujas permissões padrão podem ser personalizadas pela instituição:

| Perfil | Papel na plataforma | Acesso padrão |
|---|---|---|
| **Administrativo** | Configura a instituição, usuários e permissões | Todos os módulos |
| **Gestão** | Faz a triagem dos chamados, acompanha contratos e indicadores | Indicadores, Chamados, Equipamentos, Manutenções, Contratos |
| **Equipe técnica** | Executa manutenções e registra os atendimentos | Indicadores, Chamados, Manutenções, Equipamentos |
| **Clínica** | Abre e acompanha chamados do seu setor | Indicadores, Chamados |

Regras sensíveis, como a triagem de chamados, são validadas também no servidor, e não apenas na interface.

## 5. Módulos funcionais

- **Indicadores** — página inicial com os indicadores de desempenho do parque e da manutenção, filtráveis por período, setor, criticidade e tipo de manutenção.
- **Chamados (ordens de serviço)** — abertura de chamados pela área clínica, triagem pela gestão (equipe interna, garantia, contrato ou fornecedor sem contrato), definição de prioridade, devolução para complemento, pausas justificadas e encerramento com relatório técnico. Cada OS recebe um código sequencial.
- **Equipamentos** — inventário com codificação padronizada por setor e tipo, criticidade, histórico de intervenções e etiqueta com QR Code que leva diretamente à ficha do equipamento.
- **Manutenções** — planos de manutenção preventiva e calibração, calendário por técnico, reagendamento e sugestões automáticas de agenda.
- **Contratos** — cadastro de contratos de serviços externos, vigência, SLA e periodicidade de preventivas, com extração automática de dados a partir do PDF do contrato.
- **Peças** — controle de estoque de peças de reposição e pedidos de peça vinculados às OS.
- **Alertas** — verificação diária automática de contratos vencendo ou vencidos, preventivas próximas ou atrasadas, SLA em risco ou estourado, estoque baixo, OS sem técnico e chamados parados, com níveis Urgente, Atenção e Informativo.
- **Auditoria** — registro, com data e hora do servidor, de toda criação e alteração de ordens de serviço e contratos, além da linha do tempo de cada OS.
- **Usuários e segurança** — convites por e-mail, perfis de acesso, autenticação em dois fatores (MFA) e exclusão de conta pelo próprio usuário.
- **Notificações** — e-mails de abertura de chamado e de mudanças de agenda, agrupados para evitar mensagens repetidas.

## 6. Recursos de Inteligência Artificial

A IA foi incorporada como **apoio** à decisão, nunca como substituta do julgamento técnico. O princípio adotado é separar o que é calculado por regras determinísticas, que são auditáveis e reprodutíveis, do que é gerado pelo modelo de linguagem. Toda saída da IA é apresentada como rascunho ou sugestão para revisão humana.

| Recurso | O que faz | Salvaguardas |
|---|---|---|
| **Relatório técnico por voz** | O técnico grava o relato do atendimento; o áudio é transcrito e convertido em rascunho estruturado (causa da falha, ação realizada, testes finais, pendências e peças utilizadas) | O modelo usa somente o que foi dito; campos incertos ficam vazios e são marcados para revisão; peças só podem vir do catálogo cadastrado; o modelo é fixado para garantir reprodutibilidade |
| **Sugestão de agenda** | Propõe data e técnico para OS sem data ou atrasadas | Data e técnico vêm de regras determinísticas; a IA apenas redige a justificativa; sugestões vencidas expiram automaticamente |
| **Leitura de contratos** | Extrai fornecedor, CNPJ, vigência, valores, periodicidade e serviços inclusos do PDF (inclusive digitalizado, via OCR) | Cada campo extraído vem acompanhado da página e do trecho de origem para conferência |

## 7. Indicadores e métodos de priorização

**Indicadores de desempenho** calculados pela plataforma, entre outros:

- **MTTR** (Tempo Médio para Reparo): duração média do reparo das manutenções corretivas concluídas;
- **MTBF** (Tempo Médio Entre Falhas): intervalo médio entre corretivas consecutivas;
- **Tempo médio de atendimento**: tempo entre a abertura do chamado e o início do serviço;
- Cumprimento de SLA, OS abertas e em espera, distribuição por tipo de manutenção, situação do parque e custos.

**Priorização de equipamentos para manutenção**, baseada no método de Fennigkoh & Smith e em suas extensões, com o modelo escolhido pela instituição:

| Modelo | Fórmula |
|---|---|
| Simples (EM) | `EM = Função + Risco físico + Requisitos de manutenção` |
| Avançado (EMR) | `EMR = Missão crítica + 2·Risco + 2·Manutenção` |
| Avançado com utilização (AEMR) | `AEMR = (Missão crítica + 2·Manutenção)·Utilização + 2·Risco` |

Equipamentos com pontuação igual ou superior ao limiar definido na plataforma são sinalizados como de prioridade alta. A fila de chamados combina criticidade do equipamento, situação do SLA e tempo em aberto.

## 8. Arquitetura e tecnologias

- **Desenvolvimento:** [Base44](https://base44.com), ambiente low-code com banco de dados, autenticação, funções de servidor, fluxos agendados e integrações de IA. O repositório é sincronizado com o editor da Base44.
- **Front-end:** React, Vite, Tailwind CSS, componentes shadcn/ui (Radix UI), React Router e TanStack Query.
- **Back-end:** funções em TypeScript executadas no servidor da Base44 (`base44/functions`) e fluxos automáticos (`base44/workflows`) para alertas diários, auditoria e notificações.
- **Modelo de dados:** entidades como `Equipment`, `ServiceOrder`, `MaintenancePlan`, `Contract`, `SparePart`, `PedidoPeca`, `Alerta`, `LogAuditoria` e `ConfiguracaoInstituicao` (`base44/entities`).
- **IA:** integrações nativas da Base44 para modelo de linguagem, transcrição de áudio e extração de dados de arquivos.

## 9. Estrutura do repositório

```
EVORA/
├── base44/
│   ├── entities/      # Esquemas das entidades (modelo de dados)
│   ├── functions/     # Funções de servidor (triagem, agenda, alertas, auditoria…)
│   ├── shared/        # Regras compartilhadas entre funções
│   ├── workflows/     # Rotinas automáticas (alertas diários, auditoria, notificações)
│   └── emails/        # Modelos de e-mail
├── src/
│   ├── pages/         # Telas da aplicação
│   ├── components/    # Componentes de interface por módulo
│   ├── lib/           # Regras de negócio (indicadores, priorização, SLA, IA…)
│   ├── hooks/         # Hooks React
│   └── api/           # Cliente da Base44
└── package.json
```

## 10. Execução local

**Pré-requisitos:** Node.js e npm.

1. Clone o repositório e instale as dependências:
   ```bash
   git clone https://github.com/luhelenadias/EVORA.git
   cd EVORA
   npm install
   ```
2. Crie um arquivo `.env.local` com as variáveis do app na Base44:
   ```
   VITE_BASE44_APP_ID=seu_app_id
   VITE_BASE44_APP_BASE_URL=sua_url_do_backend
   ```
3. Execute em modo de desenvolvimento:
   ```bash
   npm run dev
   ```

Alterações enviadas a este repositório são refletidas no editor da Base44, onde a publicação é feita. Documentação: [Base44 — Using GitHub](https://docs.base44.com/Integrations/Using-GitHub).

## 11. Referências

1. WORLD HEALTH ORGANIZATION. *Medical Equipment Maintenance Programme Overview*. Geneva: WHO, 2011.
2. CALIL, S. J.; TEIXEIRA, M. S. *Gerenciamento de Manutenção de Equipamentos Hospitalares*. São Paulo: Faculdade de Saúde Pública da USP, 1998.
3. ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. *ABNT NBR 15943: Gestão de equipamentos médicos para infraestrutura de serviços de saúde*. Rio de Janeiro: ABNT, 2011.
4. BAHREINI, R.; DOSHMANGIR, L.; IMANI, A. Influential factors on medical equipment maintenance management: in search of a framework. *Journal of Quality in Maintenance Engineering*, v. 25, n. 1, p. 128–143, 2019.
5. BRASIL. Ministério da Saúde. *Estratégia de Saúde Digital para o Brasil 2020–2028*. Brasília: MS, 2020.
6. JIANG, F. et al. Artificial intelligence in healthcare: past, present and future. *Stroke and Vascular Neurology*, v. 2, n. 4, p. 230–243, 2017.
7. PEFFERS, K. et al. A design science research methodology for information systems research. *Journal of Management Information Systems*, v. 24, n. 3, p. 45–77, 2007.
8. FENNIGKOH, L.; SMITH, B. Clinical equipment management. *JCAHO Plant, Technology & Safety Management Series*, n. 2, p. 5–14, 1989.
9. DIAS, L. H. *EVORA: tutorial de uso da plataforma*. YouTube, 2026. Disponível em: <https://youtu.be/75JenC-VIAk>.
10. DIAS, L. H. *EVORA: vídeo explicativo do trabalho*. YouTube, 2026. Disponível em: <https://youtu.be/3nzqj_7eqpo>.

---

*Projeto acadêmico desenvolvido para fins de pesquisa. Os dados utilizados na validação são simulados.*
