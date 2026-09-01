import { DCN } from '../types';

export const INITIAL_DCNS: DCN[] = [
  {
    id: 'DCN-2025-001',
    dcnNumber: 'DCN-BR-2025-089-R2',
    title: 'Substituição de Parafuso M4 Inox por M4 Zincado de Alta Resistência (Linha SMT)',
    description: 'Alteração na especificação do torque e fixação dos gabinetes metálicos do inversor solar para atender nova norma anti-vibração e otimizar custo produtivo.',
    area: 'EVM',
    responsible: 'Eng. Carlos Eduardo Mendes',
    receivedDate: '2025-01-12',
    dueDate: '2025-02-15',
    status: 'ENCERRADA',
    priority: 'ALTA',
    needsMaterial: true,
    materials: [
      {
        id: 'mat-1',
        code: 'PAR-M4X12-ZN88',
        description: 'Parafuso Philips Cabeça Panela M4x12mm Aço 8.8 Zincado Branco',
        quantity: 50000,
        unit: 'UN',
        supplier: 'Fixadores Ciser S.A.',
        expectedDate: '2025-01-20',
        arrivalDate: '2025-01-19',
        status: 'INSPECIONADO_APROVADO',
        notes: 'Laudo dimensional e teste de névoa salina 480h aprovados pelo CQ.'
      }
    ],
    needsTraining: true,
    training: {
      id: 'trn-1',
      instructor: 'Eng. Carlos Eduardo Mendes',
      targetAudience: 'Operadores de Montagem SMT e Inspetores de Qualidade',
      department: 'Produção / Qualidade',
      estimatedHours: 2,
      scheduledDate: '2025-01-25',
      completionDate: '2025-01-26',
      totalPlanned: 18,
      totalTrained: 18,
      status: 'CONCLUIDO',
      trainingTopics: [
        'Novo torque de aperto calibrado em 2.2 N.m',
        'Inspeção visual da camada de zinco e ausência de rebarbas',
        'Registro na folha de processo F-ENG-089'
      ],
      attendeesList: [
        { name: 'Marcos Vinícius Silva', badge: 'OP-4412', department: 'Montagem SMT', signedDate: '2025-01-26' },
        { name: 'Fernanda Oliveira', badge: 'OP-4419', department: 'Montagem SMT', signedDate: '2025-01-26' },
        { name: 'Renato Guimarães', badge: 'IQ-1092', department: 'CQ Entrada', signedDate: '2025-01-26' }
      ],
      evidenceDoc: 'Lista_Presenca_DCN_089_Assinada.pdf'
    },
    implementationChecklist: [
      { id: 'chk-1', title: 'Atualização da Ficha de Instrução de Trabalho (FIT-ENG-42)', responsible: 'Carlos Mendes', completed: true, completedAt: '2025-01-22', mandatory: true },
      { id: 'chk-2', title: 'Aferição e recalibração das parafusadeiras pneumáticas para 2.2 N.m', responsible: 'Manutenção Mecânica', completed: true, completedAt: '2025-01-23', mandatory: true },
      { id: 'chk-3', title: 'Inspeção do 1º lote piloto (50 unidades)', responsible: 'Qualidade Assegurada', completed: true, completedAt: '2025-01-27', mandatory: true },
      { id: 'chk-4', title: 'Expedição do lote piloto liberada no SAP', responsible: 'PCP / Logística', completed: true, completedAt: '2025-01-28', mandatory: true }
    ],
    implementationDate: '2025-01-28',
    implementedBy: 'Carlos Mendes',
    engineeringReview: {
      approved: true,
      reviewer: 'Gerente Técnico Dr. Roberto Albuquerque',
      reviewDate: '2025-01-14',
      technicalImpact: 'Redução de 14% de retrabalho por espanamento e economia de R$ 38.000/ano em matéria-prima.',
      risksIdentified: ['Risco de uso de parafuso antigo no posto 3', 'Necessidade de segregar lote legado'],
      costImpactEstimate: 'Economia estimada de R$ 3.200/mês'
    },
    attachments: [
      { id: 'att-1', name: 'DCN_BR_2025_089_Oficial_Aprovada.pdf', type: 'PDF', size: '2.4 MB', category: 'PDF_OFICIAL', uploadedAt: '2025-01-12', uploadedBy: 'Carlos Mendes' },
      { id: 'att-2', name: 'Desenho_Tecnico_DWG_M4_Rev2.pdf', type: 'PDF', size: '4.1 MB', category: 'DESENHO_TECNICO', uploadedAt: '2025-01-13', uploadedBy: 'Carlos Mendes' },
      { id: 'att-3', name: 'Foto_Antes_Depois_Gabinete_Inox.jpg', type: 'IMG', size: '1.8 MB', category: 'FOTO_EVIDENCIA', uploadedAt: '2025-01-27', uploadedBy: 'Renato Guimarães' }
    ],
    auditTrail: [
      { id: 'aud-1', timestamp: '2025-01-12 08:30', user: 'Carlos Mendes', userRole: 'Engenheiro de Processos', action: 'DCN Cadastrada no Sistema', toStatus: 'RECEBIDA', comment: 'Recebimento do pacote de engenharia global matriz.' },
      { id: 'aud-2', timestamp: '2025-01-14 14:15', user: 'Roberto Albuquerque', userRole: 'Gerente de Engenharia', action: 'Avaliação Técnica Aprovada', fromStatus: 'RECEBIDA', toStatus: 'EM_AVALIACAO', comment: 'Impacto técnico e financeiro validado.' },
      { id: 'aud-3', timestamp: '2025-01-15 09:00', user: 'Carlos Mendes', userRole: 'Engenheiro de Processos', action: 'Solicitação de Amostras e Lote de Materiais', fromStatus: 'EM_AVALIACAO', toStatus: 'AGUARDANDO_MATERIAL', comment: 'Pedido de compra PO-9921 emitido para Ciser.' },
      { id: 'aud-4', timestamp: '2025-01-19 16:40', user: 'Almoxarifado Geral', userRole: 'Logística', action: 'Material Recebido e Inspecionado com Sucesso', fromStatus: 'AGUARDANDO_MATERIAL', toStatus: 'PRONTA_IMPLEMENTACAO', comment: 'Nota Fiscal NF-8891 registrada e liberada no CQ.' },
      { id: 'aud-5', timestamp: '2025-01-28 17:00', user: 'Carlos Mendes', userRole: 'Engenheiro de Processos', action: 'Implementação em Chão de Fábrica Concluída', fromStatus: 'PRONTA_IMPLEMENTACAO', toStatus: 'IMPLEMENTADA', comment: 'Checklist 100% preenchido e lote piloto liberado.' },
      { id: 'aud-6', timestamp: '2025-02-02 11:20', user: 'Auditor da Qualidade', userRole: 'Qualidade Corporativa', action: 'Encerramento Formal da DCN', fromStatus: 'IMPLEMENTADA', toStatus: 'ENCERRADA', comment: 'Treinamento concluído e documentação arquivada conforme ISO 9001:2015 item 8.5.6.' }
    ],
    closureNotes: 'Alteração 100% operacional sem não conformidades após 5 dias de produção contínua.',
    closedAt: '2025-02-02',
    closedBy: 'Engª. Juliana Viana (Auditoria)'
  },
  {
    id: 'DCN-2025-002',
    dcnNumber: 'DCN-BR-2025-104-R0',
    title: 'Adição de Dissipador de Calor Adicional na Placa Controladora Principal (Rev 4.0)',
    description: 'Implementação de novo thermal pad e dissipador de alumínio anodizado na CPU principal da placa de automação para evitar corte térmico em ambientes de até 60°C.',
    area: 'AIT',
    responsible: 'Engª. Beatriz Souza Lima',
    receivedDate: '2025-02-01',
    dueDate: '2025-03-10',
    status: 'AGUARDANDO_MATERIAL',
    priority: 'CRITICA',
    needsMaterial: true,
    materials: [
      {
        id: 'mat-2',
        code: 'DIS-ALU-45X45-BK',
        description: 'Dissipador de Calor de Alumínio Extrudado 45x45x15mm com Pin Fin',
        quantity: 2500,
        unit: 'UN',
        supplier: 'TermoTech Soluções Térmicas Ltda',
        expectedDate: '2025-03-05',
        status: 'EM_TRANSITO',
        notes: 'Carga em transporte rodoviário saindo de Joinville/SC.'
      },
      {
        id: 'mat-3',
        code: 'PAD-THM-05MM-3M',
        description: 'Thermal Interface Pad 3M 5590H espessura 0.5mm alta condutividade 3.0 W/mK',
        quantity: 3000,
        unit: 'UN',
        supplier: '3M do Brasil',
        expectedDate: '2025-02-28',
        arrivalDate: '2025-02-27',
        status: 'RECEBIDO_ESTOQUE',
        notes: 'Material entregue no almoxarifado de eletrônicos.'
      }
    ],
    needsTraining: true,
    training: {
      id: 'trn-2',
      instructor: 'Engª. Beatriz Souza Lima',
      targetAudience: 'Operadores de Montagem Eletrônica e Inspetores AOI',
      department: 'Manufatura SMT',
      estimatedHours: 3,
      scheduledDate: '2025-03-08',
      totalPlanned: 12,
      totalTrained: 0,
      status: 'AGENDADO',
      trainingTopics: [
        'Técnica correta de aplicação do pad térmico sem bolhas de ar',
        'Posicionamento e pressão de encaixe do clipe do dissipador',
        'Critérios de aceitação IPC-A-610 Classe 3'
      ]
    },
    implementationChecklist: [
      { id: 'chk-10', title: 'Desenvolvimento do dispositivo de montagem manual (Jig)', responsible: 'Eng. Dispositivos', completed: true, completedAt: '2025-02-18', mandatory: true },
      { id: 'chk-11', title: 'Atualização do programa de inspeção óptica automática (AOI)', responsible: 'Eng. Beatriz', completed: false, mandatory: true },
      { id: 'chk-12', title: 'Teste de estresse em câmara climática por 72h', responsible: 'Laboratório de Validação', completed: false, mandatory: true }
    ],
    attachments: [
      { id: 'att-10', name: 'DCN_104_Relatorio_Termico_Simulacao_Ansys.pdf', type: 'PDF', size: '8.7 MB', category: 'PDF_OFICIAL', uploadedAt: '2025-02-01', uploadedBy: 'Beatriz Souza' },
      { id: 'att-11', name: 'Layout_Placa_PCB_TopLayer_Dissipador.pdf', type: 'PDF', size: '3.2 MB', category: 'DESENHO_TECNICO', uploadedAt: '2025-02-03', uploadedBy: 'Beatriz Souza' }
    ],
    auditTrail: [
      { id: 'aud-10', timestamp: '2025-02-01 10:00', user: 'Beatriz Souza', userRole: 'Engenheira de HW', action: 'DCN Aberta e Recebida', toStatus: 'RECEBIDA', comment: 'Origem: Reclamação de campo no cliente de mineração (Chile).' },
      { id: 'aud-11', timestamp: '2025-02-04 15:30', user: 'Roberto Albuquerque', userRole: 'Gerente de Engenharia', action: 'Aprovação de Engenharia', fromStatus: 'RECEBIDA', toStatus: 'EM_AVALIACAO', comment: 'Aprovado em regime de urgência.' },
      { id: 'aud-12', timestamp: '2025-02-06 11:00', user: 'Beatriz Souza', userRole: 'Engenheira de HW', action: 'Requisição de Materiais Estratégicos', fromStatus: 'EM_AVALIACAO', toStatus: 'AGUARDANDO_MATERIAL', comment: 'Aguardando entrega do fornecedor TermoTech.' }
    ]
  },
  {
    id: 'DCN-2025-003',
    dcnNumber: 'DCN-BR-2025-112-R1',
    title: 'Atualização de Firmware v4.22 para Correção de Comunicação CAN Bus no Testador Final',
    description: 'Novo release de software embutido no microcontrolador STM32 com ajuste no baudrate do barramento CAN e protocolo de telemetria.',
    area: 'EVM',
    responsible: 'Eng. Lucas Rossi',
    receivedDate: '2025-02-15',
    dueDate: '2025-02-28',
    status: 'PRONTA_IMPLEMENTACAO',
    priority: 'ALTA',
    needsMaterial: false,
    materials: [],
    needsTraining: true,
    training: {
      id: 'trn-3',
      instructor: 'Eng. Lucas Rossi',
      targetAudience: 'Técnicos de Teste de Fim de Linha (EOLT)',
      department: 'Controle de Qualidade / Testes',
      estimatedHours: 1.5,
      scheduledDate: '2025-03-01',
      totalPlanned: 8,
      totalTrained: 0,
      status: 'AGENDADO',
      trainingTopics: [
        'Procedimento de gravação via JTAG Segger',
        'Validação do checksum após flashing',
        'Identificação de erros nos logs do analisador de protocolo'
      ]
    },
    implementationChecklist: [
      { id: 'chk-20', title: 'Homologação do binário v4.22 no simulador HIL', responsible: 'Lucas Rossi', completed: true, completedAt: '2025-02-20', mandatory: true },
      { id: 'chk-21', title: 'Backup dos firmwares das estações de gravação', responsible: 'T.I. Industrial', completed: true, completedAt: '2025-02-22', mandatory: true },
      { id: 'chk-22', title: 'Atualização das estações de teste EOLT 01 e EOLT 02', responsible: 'Lucas Rossi', completed: false, mandatory: true }
    ],
    attachments: [
      { id: 'att-20', name: 'Release_Notes_Firmware_v4.22.pdf', type: 'PDF', size: '1.1 MB', category: 'PDF_OFICIAL', uploadedAt: '2025-02-15', uploadedBy: 'Lucas Rossi' },
      { id: 'att-21', name: 'Relatorio_Teste_Carga_CAN_Bus.pdf', type: 'PDF', size: '2.5 MB', category: 'DOCUMENTO_COMPLEMENTAR', uploadedAt: '2025-02-21', uploadedBy: 'Lucas Rossi' }
    ],
    auditTrail: [
      { id: 'aud-20', timestamp: '2025-02-15 09:10', user: 'Lucas Rossi', userRole: 'Engenheiro de Firmware', action: 'Cadastro de DCN', toStatus: 'RECEBIDA' },
      { id: 'aud-21', timestamp: '2025-02-17 14:00', user: 'Lucas Rossi', userRole: 'Engenheiro de Firmware', action: 'Avaliação de Risco e Compatibilidade', fromStatus: 'RECEBIDA', toStatus: 'EM_AVALIACAO' },
      { id: 'aud-22', timestamp: '2025-02-23 16:30', user: 'Lucas Rossi', userRole: 'Engenheiro de Firmware', action: 'Sem dependência de materiais - Pronta para Chão de Fábrica', fromStatus: 'EM_AVALIACAO', toStatus: 'PRONTA_IMPLEMENTACAO', comment: 'Todas as ferramentas digitais preparadas.' }
    ]
  },
  {
    id: 'DCN-2025-004',
    dcnNumber: 'DCN-BR-2025-118-R0',
    title: 'Revisão da Etiqueta de Identificação e Código Datamatrix QR (Norma Anatel / CE)',
    description: 'Adequação da etiqueta externa de número de série com inclusão do novo logotipo de certificação CE e ampliação do contraste do código Datamatrix para leitura por scanner 2D.',
    area: 'AIT',
    responsible: 'Engª. Mariana Castilho',
    receivedDate: '2025-02-20',
    dueDate: '2025-03-25',
    status: 'EM_AVALIACAO',
    priority: 'MEDIA',
    needsMaterial: true,
    materials: [
      {
        id: 'mat-4',
        code: 'LBL-POLY-50X25-CE',
        description: 'Etiqueta Poliéster Prata Fosco 50x25mm com Ribbon Resina Alta Aderência',
        quantity: 10000,
        unit: 'UN',
        supplier: 'Avery Dennison do Brasil',
        expectedDate: '2025-03-12',
        status: 'PEDIDO_EMITIDO',
        notes: 'Pedido de compras aguardando envio de amostra gráfica.'
      }
    ],
    needsTraining: false,
    implementationChecklist: [
      { id: 'chk-30', title: 'Validação da arte gráfica pelo departamento Regulatório', responsible: 'Mariana Castilho', completed: true, completedAt: '2025-02-24', mandatory: true },
      { id: 'chk-31', title: 'Ajuste do layout no software Zebra Designer', responsible: 'Mariana Castilho', completed: false, mandatory: true }
    ],
    attachments: [
      { id: 'att-30', name: 'Layout_Etiqueta_Anatel_CE_v3.pdf', type: 'PDF', size: '1.4 MB', category: 'PDF_OFICIAL', uploadedAt: '2025-02-20', uploadedBy: 'Mariana Castilho' }
    ],
    auditTrail: [
      { id: 'aud-30', timestamp: '2025-02-20 11:45', user: 'Mariana Castilho', userRole: 'Engenheira de Embalagem', action: 'DCN Registrada', toStatus: 'RECEBIDA' },
      { id: 'aud-31', timestamp: '2025-02-22 10:20', user: 'Mariana Castilho', userRole: 'Engenheira de Embalagem', action: 'Início da Avaliação Técnica e Regulamentar', fromStatus: 'RECEBIDA', toStatus: 'EM_AVALIACAO' }
    ]
  },
  {
    id: 'DCN-2025-005',
    dcnNumber: 'DCN-BR-2025-125-R0',
    title: 'Introdução de Novo Agente Desengraxante Biodegradável para Usinagem de Carcaças',
    description: 'Substituição do solvente clorado por desengraxante aquoso ecológico em atendimento às metas ESG e redução de toxicidade para os operadores na linha de usinagem.',
    area: 'EVM',
    responsible: 'Eng. Rodrigo Falcão',
    receivedDate: '2025-02-22',
    dueDate: '2025-03-01',
    status: 'RECEBIDA',
    priority: 'ALTA',
    needsMaterial: true,
    materials: [
      {
        id: 'mat-5',
        code: 'QUIM-ECO-CLN-200L',
        description: 'Detergente Industrial Alcalino Biodegradável Tambor 200L',
        quantity: 4,
        unit: 'TB',
        supplier: 'Química Verde Ambiental',
        expectedDate: '2025-03-04',
        status: 'PENDENTE',
        notes: 'Aguardando aprovação de FISPQ / Ficha de Segurança pelo SESMT.'
      }
    ],
    needsTraining: true,
    training: {
      id: 'trn-5',
      instructor: 'Eng. Rodrigo Falcão + SESMT',
      targetAudience: 'Operadores de Lavadora de Peças e Usinagem CNC',
      department: 'Usinagem Mecânica',
      estimatedHours: 2,
      totalPlanned: 15,
      totalTrained: 0,
      status: 'PENDENTE',
      trainingTopics: [
        'Concentração de diluição correta (3% a 5% em água desmineralizada)',
        'Uso correto de EPIs de proteção química e descarte sustentável',
        'Controle diário com refratômetro óptico'
      ]
    },
    implementationChecklist: [
      { id: 'chk-40', title: 'Homologação química pelo laboratório de materiais', responsible: 'Rodrigo Falcão', completed: false, mandatory: true },
      { id: 'chk-41', title: 'Laudo de compatibilidade com ligas de alumínio fundido', responsible: 'Rodrigo Falcão', completed: false, mandatory: true }
    ],
    attachments: [
      { id: 'att-40', name: 'FISPQ_Seguranca_EcoClean_Quimica.pdf', type: 'PDF', size: '920 KB', category: 'DOCUMENTO_COMPLEMENTAR', uploadedAt: '2025-02-22', uploadedBy: 'Rodrigo Falcão' },
      { id: 'att-41', name: 'DCN_125_Aprovacao_EHS_ESG.pdf', type: 'PDF', size: '2.1 MB', category: 'PDF_OFICIAL', uploadedAt: '2025-02-22', uploadedBy: 'Rodrigo Falcão' }
    ],
    auditTrail: [
      { id: 'aud-40', timestamp: '2025-02-22 14:00', user: 'Rodrigo Falcão', userRole: 'Engenheiro de Manufatura', action: 'DCN Cadastrada e em Fila de Avaliação', toStatus: 'RECEBIDA' }
    ]
  },
  {
    id: 'DCN-2025-006',
    dcnNumber: 'DCN-BR-2025-072-R3',
    title: 'Modificação do Chicote Elétrico Principal com Trava de Segurança Automotiva (IP67)',
    description: 'Implementação de novo conector Deutsch selado e aumento de 50mm no comprimento do chicote da bomba hidráulica para prevenir tensão mecânica.',
    area: 'AIT',
    responsible: 'Eng. Carlos Eduardo Mendes',
    receivedDate: '2025-01-05',
    dueDate: '2025-02-10',
    status: 'IMPLEMENTADA',
    priority: 'CRITICA',
    needsMaterial: true,
    materials: [
      {
        id: 'mat-6',
        code: 'CON-DEUTSCH-DT06-6S',
        description: 'Conector Selado Macho 6 Vias Deutsch Série DT com Cunha e Vedação IP67',
        quantity: 1200,
        unit: 'UN',
        supplier: 'TE Connectivity do Brasil',
        expectedDate: '2025-01-20',
        arrivalDate: '2025-01-18',
        status: 'INSPECIONADO_APROVADO'
      }
    ],
    needsTraining: true,
    training: {
      id: 'trn-6',
      instructor: 'Eng. Carlos Mendes',
      targetAudience: 'Operadores de Fiação e Chicoteamento',
      department: 'Montagem Elétrica',
      estimatedHours: 4,
      scheduledDate: '2025-01-24',
      completionDate: '2025-01-24',
      totalPlanned: 10,
      totalTrained: 10,
      status: 'CONCLUIDO',
      trainingTopics: [
        'Crimpagem correta do terminal Deutsch com alicate calibrado HDT-48-00',
        'Inserção da cunha de travamento secundária (Wedge Lock)',
        'Teste elétrico de continuidade e estanqueidade'
      ],
      attendeesList: [
        { name: 'Gabriel Santana', badge: 'OP-5102', department: 'Montagem Elétrica', signedDate: '2025-01-24' },
        { name: 'Tatiane Ramos', badge: 'OP-5114', department: 'Montagem Elétrica', signedDate: '2025-01-24' }
      ],
      evidenceDoc: 'Ata_Treinamento_Conectores_Deutsch.pdf'
    },
    implementationChecklist: [
      { id: 'chk-50', title: 'Atualização do esquemático elétrico E-PLAN rev 3.4', responsible: 'Carlos Mendes', completed: true, completedAt: '2025-01-12', mandatory: true },
      { id: 'chk-51', title: 'Calibração dos alicates de crimpagem no laboratório dimensional', responsible: 'Metrologia', completed: true, completedAt: '2025-01-15', mandatory: true },
      { id: 'chk-52', title: 'Fabricação do lote piloto e teste em dinamômetro', responsible: 'Carlos Mendes', completed: true, completedAt: '2025-01-29', mandatory: true }
    ],
    implementationDate: '2025-01-30',
    implementedBy: 'Carlos Mendes',
    attachments: [
      { id: 'att-50', name: 'DCN_072_Chicote_Eletrico_Deutsch.pdf', type: 'PDF', size: '3.6 MB', category: 'PDF_OFICIAL', uploadedAt: '2025-01-05', uploadedBy: 'Carlos Mendes' },
      { id: 'att-51', name: 'Diagrama_Eletrico_Rev34.pdf', type: 'PDF', size: '5.2 MB', category: 'DESENHO_TECNICO', uploadedAt: '2025-01-10', uploadedBy: 'Carlos Mendes' }
    ],
    auditTrail: [
      { id: 'aud-50', timestamp: '2025-01-05 08:00', user: 'Carlos Mendes', userRole: 'Engenheiro de Processos', action: 'DCN Criada', toStatus: 'RECEBIDA' },
      { id: 'aud-51', timestamp: '2025-01-08 11:20', user: 'Carlos Mendes', userRole: 'Engenheiro de Processos', action: 'Análise de Risco IATF 16949 / FMEA', fromStatus: 'RECEBIDA', toStatus: 'EM_AVALIACAO' },
      { id: 'aud-52', timestamp: '2025-01-10 14:00', user: 'Carlos Mendes', userRole: 'Engenheiro de Processos', action: 'Compra de Conectores e Cabos', fromStatus: 'EM_AVALIACAO', toStatus: 'AGUARDANDO_MATERIAL' },
      { id: 'aud-53', timestamp: '2025-01-18 10:15', user: 'CQ Entrada', userRole: 'Qualidade', action: 'Materiais Liberados', fromStatus: 'AGUARDANDO_MATERIAL', toStatus: 'PRONTA_IMPLEMENTACAO' },
      { id: 'aud-54', timestamp: '2025-01-30 18:00', user: 'Carlos Mendes', userRole: 'Engenheiro de Processos', action: 'Implementação Concluída com Sucesso', fromStatus: 'PRONTA_IMPLEMENTACAO', toStatus: 'IMPLEMENTADA' }
    ]
  },
  {
    id: 'DCN-2025-007',
    dcnNumber: 'DCN-BR-2025-130-R0',
    title: 'Reforço Estrutural do Suporte do Motor de Tração (Redução de Fadiga por Vibração)',
    description: 'Aumento da espessura da chapa de aço estrutural SAE 1020 de 3.0mm para 4.5mm com aplicação de solda contínua robotizada.',
    area: 'EVM',
    responsible: 'Engª. Beatriz Souza Lima',
    receivedDate: '2025-02-10',
    dueDate: '2025-02-25',
    status: 'EM_AVALIACAO',
    priority: 'ALTA',
    needsMaterial: true,
    materials: [
      {
        id: 'mat-7',
        code: 'CHP-A36-45MM',
        description: 'Chapa de Aço Carbono ASTM A36 / SAE 1020 espessura 4.5mm cortada a laser',
        quantity: 500,
        unit: 'PC',
        supplier: 'Gerdau Aços Especiais',
        expectedDate: '2025-03-02',
        status: 'PEDIDO_EMITIDO'
      }
    ],
    needsTraining: true,
    training: {
      id: 'trn-7',
      instructor: 'Eng. de Solda N2',
      targetAudience: 'Soldadores TIG/MIG e Operadores de Célula Robótica',
      department: 'Soldagem e Caldeiraria',
      estimatedHours: 4,
      totalPlanned: 8,
      totalTrained: 0,
      status: 'PENDENTE',
      trainingTopics: [
        'Novo parâmetro de corrente e velocidade do robô KUKA',
        'Inspeção por Líquido Penetrante (LP) conforme norma AWS D1.1'
      ]
    },
    implementationChecklist: [
      { id: 'chk-60', title: 'Simulação de fadiga por Elementos Finitos (FEA)', responsible: 'Beatriz Souza', completed: true, completedAt: '2025-02-18', mandatory: true },
      { id: 'chk-61', title: 'Reprogramação do CNC de corte a laser e célula de solda', responsible: 'Técnico de Automação', completed: false, mandatory: true }
    ],
    attachments: [
      { id: 'att-60', name: 'DCN_130_Laudo_Analise_Elementos_Finitos.pdf', type: 'PDF', size: '12.4 MB', category: 'PDF_OFICIAL', uploadedAt: '2025-02-10', uploadedBy: 'Beatriz Souza' }
    ],
    auditTrail: [
      { id: 'aud-60', timestamp: '2025-02-10 16:20', user: 'Beatriz Souza', userRole: 'Engenheira de Estruturas', action: 'Cadastro da DCN', toStatus: 'RECEBIDA' },
      { id: 'aud-61', timestamp: '2025-02-14 09:00', user: 'Beatriz Souza', userRole: 'Engenheira de Estruturas', action: 'Análise de Viabilidade Técnica', fromStatus: 'RECEBIDA', toStatus: 'EM_AVALIACAO' }
    ]
  }
];
