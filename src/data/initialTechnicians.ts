import { Technician } from '../types';

export const INITIAL_TECHNICIANS: Technician[] = [
  {
    id: 'tech-001',
    name: 'Marcos Vinícius Silva',
    badge: 'TEC-4412',
    department: 'Produção',
    shift: '1º Turno',
    role: 'Técnico Eletrônico Pleno',
    email: 'marcos.silva@ctdi-eng.com',
    phone: '(19) 98765-4321',
    active: true,
    skills: ['Soldagem IPC-A-610', 'Calibração Pneumática', 'Operação Máquina Pick & Place', 'Leitura DWG'],
    trainedDCNIds: ['DCN-2025-001', 'DCN-2025-004'],
    createdAt: '2024-03-15',
    notes: 'Líder técnico do posto de montagem de gabinetes solares.'
  },
  {
    id: 'tech-002',
    name: 'Fernanda Oliveira Santos',
    badge: 'TEC-4419',
    department: 'Produção',
    shift: '1º Turno',
    role: 'Operadora Especialista de Montagem',
    email: 'fernanda.oliveira@ctdi-eng.com',
    phone: '(19) 98765-1122',
    active: true,
    skills: ['Inspeção Óptica AOI', 'Alimentação de Feeders', 'Solda Manual'],

    trainedDCNIds: ['DCN-2025-001'],
    createdAt: '2024-05-10',
    notes: 'Responsável pela troca rápida de setups na Linha SMT 2.'
  },
  {
    id: 'tech-003',
    name: 'Renato Guimarães da Costa',
    badge: 'TEC-1092',
    department: 'Qualidade CQ',
    shift: 'Administrativo',
    role: 'Inspetor de Qualidade Assegurada',

    email: 'renato.guimaraes@ctdi-eng.com',
    phone: '(19) 99123-4567',
    active: true,
    skills: ['Inspeção Dimensional', 'Metrologia Tridimensional', 'Auditoria ISO 9001', 'Testes de Névoa Salina'],
    trainedDCNIds: ['DCN-2025-001', 'DCN-2025-002'],
    createdAt: '2023-11-01',
    notes: 'Avaliador chave para laudos de CQ de entrada e aprovação de primeiro lote.'
  },
  {
    id: 'tech-004',
    name: 'Lucas Gabriel Albuquerque',
    badge: 'TEC-3055',
    department: 'Teste & Reparo',
    shift: '2º Turno',
    role: 'Técnico de Testes Funcionais (ICT/FCT)',
    email: 'lucas.albuquerque@ctdi-eng.com',
    phone: '(19) 99234-8899',
    active: true,
    skills: ['Programação de JTAG', 'Osciloscópio Digital', 'Reparo BGA', 'Análise de Falhas'],
    trainedDCNIds: ['DCN-2025-004'],
    createdAt: '2024-01-20',
    notes: 'Especialista em bancada de alta potência e gabaritos de teste dielétrico.'
  },
  {
    id: 'tech-005',
    name: 'Juliana Mendes Rocha',
    badge: 'TEC-5120',
    department: 'Qualidade CQ',
    shift: '1º Turno',
    role: 'Técnica de Confiabilidade & Processos',
    email: 'juliana.rocha@ctdi-eng.com',
    phone: '(19) 99345-7711',
    active: true,
    skills: ['FMEA de Processo', 'Controle Estatístico de Processo (CEP)', 'Auditora Interna IATF 16949'],
    trainedDCNIds: ['DCN-2025-001'],
    createdAt: '2023-08-14',
    notes: 'Validadora de listas de presença e auditorias de posto.'
  },
  {
    id: 'tech-006',
    name: 'Thiago Barbosa Lima',
    badge: 'TEC-2188',
    department: 'Manutenção & Automação',
    shift: 'Administrativo',
    role: 'Técnico Mecatrônico Sênior',

    email: 'thiago.lima@ctdi-eng.com',
    phone: '(19) 99456-3322',
    active: true,
    skills: ['Programação CLP Siemens', 'Pneumática Festo', 'Robótica Industrial', 'Calibração de Torquímetro'],
    trainedDCNIds: ['DCN-2025-001', 'DCN-2025-005'],
    createdAt: '2023-02-18',
    notes: 'Responsável pela alteração mecânica de berços e esteiras.'
  },
  {
    id: 'tech-007',
    name: 'Camila Rodrigues Neves',
    badge: 'TEC-4433',
    department: 'Produção',
    shift: '2º Turno',
    role: 'Operadora Líder de Linha',

    email: 'camila.neves@ctdi-eng.com',
    phone: '(19) 99567-8844',
    active: true,
    skills: ['5S', 'Kaizen', 'Balanceamento de Linha', 'Instruções de Trabalho (FIT)'],
    trainedDCNIds: [],
    createdAt: '2024-07-02',
    notes: 'Supervisora de turno no setor de montagem secundária.'
  },
  {
    id: 'tech-008',
    name: 'Eduardo Martins Paiva',
    badge: 'TEC-3110',
    department: 'Teste & Reparo',
    shift: '1º Turno',
    role: 'Técnico de Bancada de Reparo',
    email: 'eduardo.paiva@ctdi-eng.com',
    phone: '(19) 99678-9900',
    active: true,
    skills: ['Estação de Retrabalho IR', 'Microscopia Estéreo', 'Esquemas Elétricos'],
    trainedDCNIds: [],
    createdAt: '2024-09-12',
    notes: 'Recém-integrado à equipe de diagnóstico de placas controladoras.'
  }
];
