import { DCN, NotificationLogEntry, NotificationRuleType, NotificationSettings, User } from '../types';
import {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  MATERIAL_STATUS_CONFIG,
  formatDate,
  getDaysRemaining,
  isOverdue
} from './helpers';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  weeklyPendingEnabled: true,
  weeklyDayOfWeek: 1, // 1 = Segunda-feira
  weeklyTime: '08:00',

  dailyOverdueEnabled: true,
  dailyTime: '08:00',

  slaApproachingEnabled: true,
  slaThresholdDays: 5, // 5 dias antes do vencimento
  slaTime: '08:00',

  responsibleAlertEnabled: true,

  directRecipients: [],
  excludedUserEmails: [],
  fixedRecipients: ['admin@ctdibrasil.com.br'],
  smtpHost: 'mail.ctdibrasil.com.br',
  smtpPort: 587,
  smtpUser: 'dcnmanagementsystem@ctdibrasil.com.br',
  smtpPass: '',
  smtpFrom: 'Gestão de DCNs CTDI <dcnmanagementsystem@ctdibrasil.com.br>',
  smtpEnabled: true
};

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado'
};

export const RULE_TYPE_LABELS: Record<NotificationRuleType, { title: string; badge: string; color: string }> = {
  WEEKLY_PENDING: {
    title: 'E-mail Semanal de DCNs Pendentes',
    badge: 'Semanal • Seg 08:00',
    color: 'indigo'
  },
  DAILY_OVERDUE: {
    title: 'E-mail Diário de DCNs Vencidas',
    badge: 'Diário • SLA Excedido',
    color: 'rose'
  },
  SLA_APPROACHING: {
    title: 'Lembrete de SLA Próximo do Vencimento',
    badge: 'Alerta Preventivo • SLA',
    color: 'amber'
  },
  RESPONSIBLE_ALERT: {
    title: 'Notificação Individual para Responsáveis',
    badge: 'Por Engenheiro Responsável',
    color: 'cyan'
  }
};

/**
 * Diagnóstico corporativo detalhado da razão pela qual uma DCN ainda não foi implementada ou encerrada
 */
export interface NonImplementationDiagnosis {
  stageLabel: string;
  reasonHeadline: string;
  reasonDetails: string[];
  actionRequired: string;
  severityColor: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
  };
  lastAuditInfo?: string;
}

export function getNonImplementationReasonDetails(dcn: DCN): NonImplementationDiagnosis {
  const stageCfg = STATUS_CONFIG[dcn.status];
  const stageLabel = stageCfg ? `Etapa ${stageCfg.step}/6 — ${stageCfg.label}` : dcn.status;

  // Última movimentação relevante na trilha de auditoria
  const latestAudit =
    dcn.auditTrail && dcn.auditTrail.length > 0
      ? dcn.auditTrail[dcn.auditTrail.length - 1]
      : undefined;
  const lastAuditInfo = latestAudit
    ? `${latestAudit.action}${latestAudit.comment ? ` — "${latestAudit.comment}"` : ''} (${latestAudit.user})`
    : undefined;

  switch (dcn.status) {
    case 'RECEBIDA': {
      return {
        stageLabel,
        reasonHeadline: 'Não implementada: Aguardando abertura e triagem técnica inicial da Engenharia.',
        reasonDetails: [
          'A DCN foi recebida e protocolada no sistema, mas ainda não entrou em avaliação técnica.',
          'Pendente análise de impacto no processo produtivo, definição de necessidade de materiais/ferramental (BOM) e elaboração do plano de treinamento operacional.'
        ],
        actionRequired: `O engenheiro responsável (${dcn.responsible}) deve iniciar a Etapa 2 (Em Avaliação) e registrar o parecer técnico da mudança.`,
        severityColor: {
          bg: '#f8fafc',
          border: '#cbd5e1',
          text: '#334155',
          badgeBg: '#e2e8f0'
        },
        lastAuditInfo
      };
    }

    case 'EM_AVALIACAO': {
      const details: string[] = [
        'A DCN encontra-se retida na fase de Avaliação de Engenharia (Etapa 2/6) sem liberação para implementação em chão de fábrica.'
      ];
      if (dcn.engineeringReview?.technicalImpact) {
        details.push(`Impacto técnico mapeado: ${dcn.engineeringReview.technicalImpact}`);
      } else {
        details.push('Parecer técnico de engenharia e mapeamento de riscos ainda não foram finalizados.');
      }
      if (dcn.needsMaterial && (!dcn.materials || dcn.materials.length === 0)) {
        details.push('A DCN indica necessidade de materiais/insumos, porém os itens da BOM ainda estão sendo levantados/cadastrados.');
      }

      return {
        stageLabel,
        reasonHeadline: 'Não implementada: Em análise de viabilidade técnica e levantamento de requisitos pela Engenharia.',
        reasonDetails: details,
        actionRequired: `Concluir a avaliação técnica e avançar a DCN para "Aguardando Material" (caso exija suprimentos) ou "Aguardando Treinamento".`,
        severityColor: {
          bg: '#fffbeb',
          border: '#fcd34d',
          text: '#92400e',
          badgeBg: '#fef3c7'
        },
        lastAuditInfo
      };
    }

    case 'AGUARDANDO_MATERIAL': {
      const pendingMaterials = (dcn.materials || []).filter(
        m => m.status !== 'RECEBIDO_ESTOQUE' && m.status !== 'INSPECIONADO_APROVADO'
      );
      const receivedMaterials = (dcn.materials || []).filter(
        m => m.status === 'RECEBIDO_ESTOQUE' || m.status === 'INSPECIONADO_APROVADO'
      );

      const details: string[] = [];
      if (!dcn.needsMaterial) {
        details.push('A DCN está posicionada na etapa de Materiais sem requisito de compra ativo; aguardando avanço para implementação.');
      } else if (!dcn.materials || dcn.materials.length === 0) {
        details.push(
          'Implementação bloqueada por falta de suprimentos: a DCN exige material para implementação, mas nenhum item/Part Number foi registrado na guia de Materiais.'
        );
      } else if (pendingMaterials.length > 0) {
        details.push(
          `Implementação bloqueada por indisponibilidade física de material (${pendingMaterials.length} de ${dcn.materials.length} item(ns) ainda não recebido(s) em estoque):`
        );
        pendingMaterials.forEach(m => {
          const matStatus = MATERIAL_STATUS_CONFIG[m.status]?.label || m.status;
          const prevStr = m.expectedDate ? ` | Previsão chegada: ${formatDate(m.expectedDate)}` : '';
          const suppStr = m.supplier ? ` | Fornecedor: ${m.supplier}` : '';
          const noteStr = m.notes ? ` — Obs: ${m.notes}` : '';
          details.push(
            `• [${m.code}] ${m.description} (${m.quantity} ${m.unit}) — Status: ${matStatus}${suppStr}${prevStr}${noteStr}`
          );
        });
      } else {
        details.push(
          `Todos os ${receivedMaterials.length} item(ns) de material já constam como Recebidos em Estoque, restando apenas a liberação formal da Engenharia para a Etapa 4.`
        );
      }

      return {
        stageLabel,
        reasonHeadline:
          pendingMaterials.length > 0
            ? `Não implementada: Bloqueada por pendência de Materiais / Suprimentos (${pendingMaterials.length} item(ns) aguardando recebimento em estoque).`
            : 'Não implementada: Retida na etapa de verificação de Materiais / Almoxarifado.',
        reasonDetails: details,
        actionRequired:
          pendingMaterials.length > 0
            ? 'Acompanhar entrega junto a Compras/Almoxarifado e atualizar o status dos itens para "Recebido em Estoque" assim que derem entrada física.'
            : 'Materiais disponíveis em estoque — avançar imediatamente a DCN para "4. Aguardando Treinamento".',
        severityColor: {
          bg: '#eff6ff',
          border: '#93c5fd',
          text: '#1e40af',
          badgeBg: '#dbeafe'
        },
        lastAuditInfo
      };
    }

    case 'PRONTA_IMPLEMENTACAO': {
      const scheduledDateFormatted = dcn.training?.scheduledDate
        ? formatDate(dcn.training.scheduledDate)
        : null;

      const headline = scheduledDateFormatted
        ? `Data de Treinamento Agendada: ${scheduledDateFormatted}.`
        : 'Data de Treinamento: Não agendada.';

      return {
        stageLabel,
        reasonHeadline: headline,
        reasonDetails: [],
        actionRequired: scheduledDateFormatted
          ? `Conduzir o treinamento na data agendada (${scheduledDateFormatted}), colher as assinaturas na ata e avançar a DCN para Implementada.`
          : `Definir a data do treinamento na aba Treinamento, capacitar os operadores/técnicos da área (${dcn.area}) e avançar para a Etapa 5 (Implementada).`,
        severityColor: {
          bg: '#eef2ff',
          border: '#a5b4fc',
          text: '#3730a3',
          badgeBg: '#e0e7ff'
        },
        lastAuditInfo
      };
    }

    case 'IMPLEMENTADA': {
      const attendees = dcn.training?.attendeesList || [];
      const hasTechsInAta = attendees.length > 0;
      const hasTrainingPdf = (dcn.attachments || []).some(
        a => a.category === 'REGISTRO_TREINAMENTO' && (a.type === 'PDF' || a.name.toLowerCase().endsWith('.pdf'))
      );

      const blockers: string[] = [];
      if (!hasTechsInAta) {
        blockers.push(
          'Falta cadastrar os técnicos/inspetores participantes na Ata de Treinamento (Aba 3 — Treinamento).'
        );
      } else {
        blockers.push(
          `Ata de Treinamento conta com ${attendees.length} colaborador(es) registrado(s).`
        );
      }

      if (!hasTrainingPdf) {
        blockers.push(
          'Falta anexar o arquivo PDF da Folha de Treinamento assinada (Aba 4 — Anexos, categoria Registro de Treinamento).'
        );
      } else {
        blockers.push('Folha de Treinamento em PDF já anexada ao dossiê da DCN.');
      }

      const isMissingMandatory = !hasTechsInAta || !hasTrainingPdf;

      return {
        stageLabel,
        reasonHeadline: isMissingMandatory
          ? 'Implementada em linha, porém NÃO ENCERRADA por pendência documental obrigatória de Treinamento (Gate ISO 9001).'
          : 'Implementada e com evidências de treinamento completas, aguardando apenas validação final de Encerramento.',
        reasonDetails: blockers,
        actionRequired: isMissingMandatory
          ? 'Inserir os técnicos participantes na Ata de Treinamento e fazer o upload da Folha de Treinamento assinada (PDF) para liberar o encerramento da DCN.'
          : `Efetivar o encerramento formal da DCN (Etapa 6 — Encerrada) pelo responsável (${dcn.responsible}).`,
        severityColor: {
          bg: '#f0fdfa',
          border: '#5eead4',
          text: '#115e59',
          badgeBg: '#ccfbf1'
        },
        lastAuditInfo
      };
    }

    default:
      return {
        stageLabel,
        reasonHeadline: 'DCN concluída e encerrada.',
        reasonDetails: ['Todos os requisitos técnicos, materiais e documentais foram atendidos.'],
        actionRequired: 'Nenhuma ação pendente.',
        severityColor: {
          bg: '#ecfdf5',
          border: '#6ee7b7',
          text: '#065f46',
          badgeBg: '#d1fae5'
        },
        lastAuditInfo
      };
  }
}

/**
 * Filtra as DCNs aplicáveis para cada regra de notificação recorrente
 */
export function filterDCNsForRule(
  dcns: DCN[],
  ruleType: NotificationRuleType,
  settings: NotificationSettings,
  targetResponsible?: string
): DCN[] {
  const activeDCNs = dcns.filter(d => d.status !== 'ENCERRADA');

  switch (ruleType) {
    case 'WEEKLY_PENDING':
      return activeDCNs;

    case 'DAILY_OVERDUE':
      return activeDCNs.filter(d => isOverdue(d.dueDate, d.status));

    case 'SLA_APPROACHING': {
      const threshold = settings.slaThresholdDays || 5;
      return activeDCNs.filter(d => {
        const days = getDaysRemaining(d.dueDate);
        return days >= 0 && days <= threshold;
      });
    }

    case 'RESPONSIBLE_ALERT': {
      if (targetResponsible && targetResponsible !== 'ALL') {
        return activeDCNs.filter(
          d => d.responsible.trim().toLowerCase() === targetResponsible.trim().toLowerCase()
        );
      }
      return activeDCNs;
    }
  }
}

/**
 * Resolve a lista de destinatários principais (Para: / To:)
 * Combina os e-mails adicionados manualmente no card de Responsáveis (directRecipients)
 * + os e-mails dos usuários responsáveis cadastrados no sistema (exceto os removidos manualmente).
 */
export function resolveRecipientsForDCNs(
  targetDCNs: DCN[],
  users: User[],
  settings: NotificationSettings,
  targetResponsible?: string
): string[] {
  const emailSet = new Set<string>();
  const excludedSet = new Set<string>(
    (settings.excludedUserEmails || []).map(e => e.trim().toLowerCase())
  );

  // 1. Adiciona destinatários diretos cadastrados no card de Responsáveis (Para:)
  (settings.directRecipients || []).forEach(email => {
    const clean = email.trim().toLowerCase();
    if (clean) emailSet.add(clean);
  });

  // 2. Vincula os responsáveis das DCNs aos usuários cadastrados no sistema
  const responsibles = new Set<string>(
    targetDCNs.map(d => d.responsible.trim().toLowerCase())
  );
  if (targetResponsible && targetResponsible !== 'ALL') {
    responsibles.add(targetResponsible.trim().toLowerCase());
  }

  users.forEach(u => {
    const matchesName = responsibles.has(u.nome.trim().toLowerCase());
    const matchesLogin = responsibles.has(u.login.trim().toLowerCase());
    if (matchesName || matchesLogin || u.role === 'ADMIN') {
      if (u.email && u.email.trim()) {
        const cleanUserEmail = u.email.trim().toLowerCase();
        if (!excludedSet.has(cleanUserEmail)) {
          emailSet.add(cleanUserEmail);
        }
      }
    }
  });

  return Array.from(emailSet);
}

/**
 * Resolve a lista de destinatários em cópia (Cc:)
 * Usa os e-mails cadastrados na Lista de Destinatários Fixos (CC / Gestão / Qualidade).
 */
export function resolveCcRecipientsForDCNs(
  settings: NotificationSettings,
  toRecipients: string[] = []
): string[] {
  const toSet = new Set(toRecipients.map(e => e.trim().toLowerCase()));
  const ccSet = new Set<string>();

  (settings.fixedRecipients || []).forEach(email => {
    const clean = email.trim().toLowerCase();
    if (clean && !toSet.has(clean)) {
      ccSet.add(clean);
    }
  });

  return Array.from(ccSet);
}

/**
 * Gera o template HTML corporativo da notificação por e-mail
 * Inclui resumo executivo, KPIs, tabela síntese e fichas técnicas detalhadas com a razão da não implementação/encerramento
 */
export function buildNotificationEmailHTML(
  ruleType: NotificationRuleType,
  targetDCNs: DCN[],
  settings: NotificationSettings,
  targetResponsible?: string
): { subject: string; html: string } {
  const nowObj = new Date();
  const nowStr = nowObj.toLocaleString('pt-BR');
  const dd = String(nowObj.getDate()).padStart(2, '0');
  const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
  const yy = String(nowObj.getFullYear()).slice(-2);
  const sendDateShort = `${dd}/${mm}/${yy}`;

  let headerTitle = '';
  let subtitle = '';
  let accentColor = '#002a54';
  let badgeLabel = 'COMUNICADO OFICIAL DE ENGENHARIA';
  let introParagraph = '';
  let subject = '';

  switch (ruleType) {
    case 'WEEKLY_PENDING':
      headerTitle = 'Relatório de DCNs Pendentes';
      subtitle = 'Acompanhamento Semanal de Implementação de DCNs';
      accentColor = '#002a54';
      badgeLabel = 'CTDI DO BRASIL RELATÓRIO SEMANAL DCN CONTROL';
      introParagraph =
        'Prezados Responsáveis e Equipe de Gestão,<br/><br/>Apresentamos abaixo a posição consolidada das <strong>Notificações de Mudança de Documento (DCNs)</strong> que permanecem <strong>em aberto (não encerradas)</strong> no fluxo de Engenharia e Qualidade da CTDI do Brasil. Para cada documento listado, consta o diagnóstico detalhado da <strong>razão pela qual a mudança ainda não foi implementada ou encerrada</strong>, bem como a ação requerida para regularização.';
      subject = `[CTDI • Gestão de DCNs] Relatório de DCN(s) Pendentes(s) - ${sendDateShort}`;
      break;

    case 'DAILY_OVERDUE':
      headerTitle = 'Relatório Crítico Diário: DCNs Não Encerradas com SLA Vencido';
      subtitle = 'Escalonamento Corporativo — Documentos com prazo regulamentar de implementação ultrapassado';
      accentColor = '#9f1239';
      badgeLabel = 'CTDI DO BRASIL • ESCALONAMENTO CRÍTICO • SLA ULTRAPASSADO';
      introParagraph =
        'Prezados Responsáveis e Liderança Técnica,<br/><br/>Identificamos no controle diário de conformidade que as <strong>DCNs relacionadas abaixo encontram-se com o prazo limite (SLA) vencido</strong> sem conclusão do encerramento formal. Solicitamos atuação prioritária sobre os motivos de bloqueio (materiais, execução em linha ou evidências de treinamento em PDF) detalhados em cada registro abaixo.';
      subject = `[URGENTE • SLA VENCIDO] ${targetDCNs.length} DCN(s) Não Encerrada(s) com Prazo Expirado — Justificativa e Plano de Ação`;
      break;

    case 'SLA_APPROACHING':
      headerTitle = `Aviso Preventivo de SLA: DCNs com Vencimento em até ${settings.slaThresholdDays} Dias`;
      subtitle = 'Monitoramento preventivo para evitar atrasos de implementação e auditoria';
      accentColor = '#b45309';
      badgeLabel = `CTDI DO BRASIL • ALERTA PREVENTIVO DE PRAZO (≤ ${settings.slaThresholdDays} DIAS)`;
      introParagraph =
        `Prezados Engenheiros e Coordenadores,<br/><br/>As DCNs listadas neste comunicado ainda não foram encerradas e possuem data limite de SLA vencendo nos próximos <strong>${settings.slaThresholdDays} dias</strong>. Verifique abaixo o detalhamento da razão pela qual cada DCN ainda não foi implementada ou encerrada para garantir o cumprimento do prazo.`;
      subject = `[Aviso Preventivo SLA] ${targetDCNs.length} DCN(s) Não Encerrada(s) vencem em até ${settings.slaThresholdDays} dias`;
      break;

    case 'RESPONSIBLE_ALERT': {
      const respLabel =
        targetResponsible && targetResponsible !== 'ALL' ? targetResponsible : 'Engenheiros Responsáveis';
      headerTitle = `Posição de DCNs Não Encerradas — Responsável: ${respLabel}`;
      subtitle = 'Cobrança técnica individualizada com detalhamento dos impedimentos de implementação e encerramento';
      accentColor = '#0369a1';
      badgeLabel = 'CTDI DO BRASIL • NOTIFICAÇÃO TÉCNICA DE RESPONSABILIDADE';
      introParagraph = `Prezado(a) <strong>${respLabel}</strong>,<br/><br/>Segue o extrato atualizado das DCNs sob sua responsabilidade técnica que permanecem abertas no sistema. Abaixo detalhamos a etapa atual, o status de prazo (SLA) e a <strong>razão específica pela qual cada DCN ainda não foi implementada ou encerrada</strong>, juntamente com as pendências que precisam ser sanadas.`;
      subject = `[CTDI • Cobrança Técnica DCN] ${targetDCNs.length} DCN(s) Pendente(s) de Implementação/Encerramento — ${respLabel}`;
      break;
    }
  }

  // Cálculo dos KPIs executivos
  const totalOpen = targetDCNs.length;
  const totalOverdue = targetDCNs.filter(d => isOverdue(d.dueDate, d.status)).length;
  const totalWaitingMaterial = targetDCNs.filter(d => d.status === 'AGUARDANDO_MATERIAL').length;
  const totalWaitingTrainingGate = targetDCNs.filter(d => d.status === 'IMPLEMENTADA').length;
  const totalNotYetImplemented = targetDCNs.filter(
    d =>
      d.status === 'RECEBIDA' ||
      d.status === 'EM_AVALIACAO' ||
      d.status === 'AGUARDANDO_MATERIAL' ||
      d.status === 'PRONTA_IMPLEMENTACAO'
  ).length;

  // Helper para criar pílula/badge com cantos arredondados compatível com Outlook Desktop (VML) e Webmail (CSS)
  const renderRoundedBadge = (
    text: string,
    bgColor: string,
    textColor: string,
    borderColor: string,
    widthPx = 136,
    heightPx = 28,
    fontSizePx = 11
  ) => `
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:${heightPx}px;v-text-anchor:middle;width:${widthPx}px;" arcsize="25%" strokecolor="${borderColor}" fillcolor="${bgColor}">
      <v:textbox inset="0,5px,0,0">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
          <tr>
            <td align="center" valign="middle" style="text-align:center;font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:${fontSizePx}px;font-weight:bold;color:${textColor};">
              <b>${text}</b>
            </td>
          </tr>
        </table>
      </v:textbox>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <span style="display: inline-block; background-color: ${bgColor}; color: ${textColor}; border: 1px solid ${borderColor}; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: ${fontSizePx}px; white-space: nowrap;">
      ${text}
    </span>
    <!--<![endif]-->
  `;

  // Helper para criar Card de KPI com cantos arredondados compatível com Outlook Desktop (VML) e Webmail (CSS)
  const renderKpiCard = (
    title: string,
    value: number,
    subtitleText: string,
    bgColor: string,
    borderColor: string,
    titleColor: string,
    valueColor: string,
    subColor: string
  ) => `
    <td width="25%" align="center" valign="top" style="width: 25%; padding: 0 6px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:96px;v-text-anchor:middle;width:236px;" arcsize="12%" strokecolor="${borderColor}" fillcolor="${bgColor}">
        <v:textbox inset="0,12px,0,10px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
            <tr>
              <td align="center" style="text-align:center;font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:10px;font-weight:bold;color:${titleColor};padding-bottom:4px;">
                <b>${title.toUpperCase()}</b>
              </td>
            </tr>
            <tr>
              <td align="center" style="text-align:center;font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:22px;font-weight:bold;color:${valueColor};line-height:26px;padding-bottom:4px;">
                <b>${value}</b>
              </td>
            </tr>
            <tr>
              <td align="center" style="text-align:center;font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:10px;color:${subColor};">
                ${subtitleText}
              </td>
            </tr>
          </table>
        </v:textbox>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <div style="background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 10px; padding: 14px 12px; text-align: center; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: ${titleColor};">${title.toUpperCase()}</div>
        <div style="font-size: 22px; font-weight: 800; color: ${valueColor}; margin: 4px 0;">${value}</div>
        <div style="font-size: 10px; color: ${subColor};">${subtitleText}</div>
      </div>
      <!--<![endif]-->
    </td>
  `;

  // Linhas da Tabela Executiva (10 Colunas Padrão Corporativo / Smartsheet)
  const summaryRowsHtml =
    targetDCNs.length === 0
      ? `<tr>
          <td colspan="10" style="padding: 28px; text-align: center; color: #475569; font-size: 13px; background: #f8fafc; border: 1px solid #cbd5e1;">
            <strong>Nenhuma DCN pendente enquadrada neste critério no momento.</strong><br/>
            Todas as DCNs correspondentes encontram-se devidamente implementadas e encerradas.
          </td>
        </tr>`
      : targetDCNs
          .map((dcn, index) => {
            const diag = getNonImplementationReasonDetails(dcn);
            const stLabel = STATUS_CONFIG[dcn.status]?.label || dcn.status;
            const days = getDaysRemaining(dcn.dueDate);
            const overdue = isOverdue(dcn.dueDate, dcn.status);
            const slaStatusHtml = overdue
              ? renderRoundedBadge(`VENCIDA (${Math.abs(days)}d)`, '#ffe4e6', '#be123c', '#fecdd3', 108, 24, 10)
              : days <= settings.slaThresholdDays
              ? renderRoundedBadge(`VENCE EM ${days}d`, '#fef3c7', '#b45309', '#fde68a', 108, 24, 10)
              : renderRoundedBadge(`NO PRAZO (${days}d)`, '#dcfce7', '#15803d', '#bbf7d0', 108, 24, 10);

            const statusBadgeHtml = renderRoundedBadge(
              stLabel,
              diag.severityColor.badgeBg,
              diag.severityColor.text,
              diag.severityColor.border,
              140,
              28,
              11
            );

            // Coluna N/P (Part Numbers dos materiais vinculados)
            const partNumbersHtml =
              dcn.materials && dcn.materials.length > 0
                ? dcn.materials
                    .map(
                      m =>
                        `<div style="font-family: Consolas, monospace; font-weight: 700; color: #1e293b;">${m.code || '-'}</div>`
                    )
                    .join('')
                : dcn.needsMaterial
                ? '<span style="color:#b45309; font-weight:600;">A definir</span>'
                : '<span style="color:#94a3b8;">N/A</span>';

            // Coluna Materials ETA (Previsão de chegada dos materiais)
            const materialsEtaHtml =
              dcn.materials && dcn.materials.length > 0
                ? dcn.materials
                    .map(m => {
                      if (m.status === 'RECEBIDO_ESTOQUE' || m.status === 'INSPECIONADO_APROVADO') {
                        return '<div style="color:#15803d; font-weight:700;">Recebido</div>';
                      }
                      return `<div style="font-weight:600; color:#1e40af;">${
                        m.expectedDate ? formatDate(m.expectedDate) : 'Sem ETA'
                      }</div>`;
                    })
                    .join('')
                : dcn.needsMaterial
                ? '<span style="color:#b45309;">Aguard. ETA</span>'
                : '<span style="color:#94a3b8;">N/A</span>';

            // Coluna Observation (Razão da não implementação + detalhes de bloqueio)
            const observationDetails =
              diag.reasonDetails.length > 0 ? `<div style="margin-top:3px; color:#475569; font-size:11px;">${diag.reasonDetails.join('<br/>')}</div>` : '';

            const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';

            return `
              <tr style="background-color: ${rowBg};">
                <td valign="middle" style="padding: 12px 10px; border: 1px solid #cbd5e1; vertical-align: middle; text-align: center; font-family: Consolas, 'Courier New', monospace; font-weight: 800; color: #002a54; font-size: 12px; white-space: nowrap;">
                  ${dcn.dcnNumber}
                </td>
                <td valign="middle" style="padding: 12px 8px; border: 1px solid #cbd5e1; vertical-align: middle; text-align: center; font-family: Consolas, 'Courier New', monospace; font-weight: 700; color: #4338ca; font-size: 11px; white-space: nowrap;">
                  ${dcn.revision || '-'}
                </td>
                <td valign="middle" style="padding: 12px 10px; border: 1px solid #cbd5e1; vertical-align: middle; text-align: center; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 12px; color: #0f172a; font-weight: 700;">
                  ${dcn.productFamily || '-'}
                </td>
                <td valign="middle" style="padding: 12px 8px; border: 1px solid #cbd5e1; vertical-align: middle; text-align: center; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 12px; color: #0f172a; font-weight: 700;">
                  ${dcn.area}
                </td>
                <td valign="middle" style="padding: 12px 10px; border: 1px solid #cbd5e1; vertical-align: middle; text-align: center; font-family: Consolas, 'Courier New', monospace; font-size: 11px; white-space: nowrap;">
                  ${partNumbersHtml}
                </td>
                <td valign="middle" align="center" style="padding: 12px 10px; border: 1px solid #cbd5e1; vertical-align: middle; text-align: center; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px;">
                  ${statusBadgeHtml}
                </td>
                <td valign="middle" style="padding: 12px 14px; border: 1px solid #cbd5e1; vertical-align: middle; text-align: left; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #1e293b; line-height: 1.45;">
                  <div style="font-weight: 700; color: ${diag.severityColor.text}; margin-bottom: 3px;">${diag.reasonHeadline}</div>
                  ${observationDetails}
                </td>
                <td valign="middle" style="padding: 12px 10px; border: 1px solid #cbd5e1; vertical-align: middle; text-align: center; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; white-space: nowrap;">
                  ${materialsEtaHtml}
                </td>
                <td valign="middle" style="padding: 12px 10px; border: 1px solid #cbd5e1; vertical-align: middle; text-align: center; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; font-weight: 600; color: #334155; white-space: nowrap;">
                  ${formatDate(dcn.receivedDate)}
                </td>
                <td valign="middle" align="center" style="padding: 12px 10px; border: 1px solid #cbd5e1; vertical-align: middle; text-align: center; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; white-space: nowrap;">
                  <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">${formatDate(dcn.dueDate)}</div>
                  ${slaStatusHtml}
                </td>
              </tr>
            `;
          })
          .join('');

  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #f1f5f9; margin: 0; padding: 0;">
      <tr>
        <td align="center" style="padding: 16px 12px;">
          <table width="1060" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 1060px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #0f172a;">
            <!-- Cabeçalho Corporativo Institucional CTDI -->
            <tr>
              <td bgcolor="${accentColor}" style="background-color: ${accentColor}; color: #ffffff; padding: 24px 28px; border-bottom: 4px solid #38bdf8;">
                <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #bae6fd; font-weight: 700;">
                  ${badgeLabel}
                </div>
                <h1 style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 8px 0 6px; font-size: 20px; font-weight: 800; line-height: 1.25; color: #ffffff;">
                  ${headerTitle}
                </h1>
                <p style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; font-size: 12px; color: #e0f2fe;">
                  ${subtitle}
                </p>
              </td>
            </tr>

            <!-- Corpo Principal com Padding Compatível com Outlook -->
            <tr>
              <td bgcolor="#ffffff" style="padding: 24px 28px; background-color: #ffffff;">
                <!-- Saudação e Contextualização Corporativa -->
                <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
                  ${introParagraph}
                </div>

                <!-- Painel de Indicadores (KPIs Executivos com Cantos Arredondados VML/CSS) -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin: 0 0 22px 0;">
                  <tr>
                    ${renderKpiCard(
                      'Total Não Encerradas',
                      totalOpen,
                      'DCN(s) ativas no fluxo',
                      '#f8fafc',
                      '#cbd5e1',
                      '#475569',
                      '#002a54',
                      '#64748b'
                    )}
                    ${renderKpiCard(
                      'Com SLA Vencido',
                      totalOverdue,
                      'Acima do prazo limite',
                      '#fff1f2',
                      '#fecdd3',
                      '#be123c',
                      '#be123c',
                      '#9f1239'
                    )}
                    ${renderKpiCard(
                      'Não Implementadas',
                      totalNotYetImplemented,
                      `${totalWaitingMaterial} aguardando material`,
                      '#eff6ff',
                      '#bfdbfe',
                      '#1d4ed8',
                      '#1e40af',
                      '#1e3a8a'
                    )}
                    ${renderKpiCard(
                      'Pendentes de Ata/PDF',
                      totalWaitingTrainingGate,
                      'Em validação de encerramento',
                      '#f0fdfa',
                      '#99f6e4',
                      '#0f766e',
                      '#115e59',
                      '#134e4a'
                    )}
                  </tr>
                </table>

                <!-- Quadro de DCNs Não Encerradas (10 Colunas) -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; text-align: left; border: 1px solid #94a3b8; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                  <thead>
                    <tr bgcolor="#cbd5e1" style="background-color: #cbd5e1; font-size: 11px; font-weight: 800; color: #0f172a;">
                      <th valign="middle" style="padding: 12px 10px; border: 1px solid #94a3b8; vertical-align: middle; text-align: center;">DOCUMENT</th>
                      <th valign="middle" style="padding: 12px 8px; border: 1px solid #94a3b8; vertical-align: middle; text-align: center;">REV</th>
                      <th valign="middle" style="padding: 12px 10px; border: 1px solid #94a3b8; vertical-align: middle; text-align: center;">FAMILY</th>
                      <th valign="middle" style="padding: 12px 8px; border: 1px solid #94a3b8; vertical-align: middle; text-align: center;">Project</th>
                      <th valign="middle" style="padding: 12px 10px; border: 1px solid #94a3b8; vertical-align: middle; text-align: center;">N/P</th>
                      <th valign="middle" style="padding: 12px 10px; border: 1px solid #94a3b8; vertical-align: middle; text-align: center;">Status</th>
                      <th valign="middle" style="padding: 12px 14px; border: 1px solid #94a3b8; vertical-align: middle; text-align: center;">Observation</th>
                      <th valign="middle" style="padding: 12px 10px; border: 1px solid #94a3b8; vertical-align: middle; text-align: center;">Materials<br/>ETA</th>
                      <th valign="middle" style="padding: 12px 10px; border: 1px solid #94a3b8; vertical-align: middle; text-align: center;">Release Date<br/>(SMART SHEET)</th>
                      <th valign="middle" style="padding: 12px 10px; border: 1px solid #94a3b8; vertical-align: middle; text-align: center;">SLA</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${summaryRowsHtml}
                  </tbody>
                </table>

                <!-- Rodapé Institucional -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 24px; border-top: 1px solid #e2e8f0;">
                  <tr>
                    <td style="padding-top: 16px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 13px; color: #475569;">
                      <p style="margin: 0 0 4px; color: #64748b;">Atenciosamente,</p>
                      <p style="margin: 0; font-weight: 700; color: #0f172a;">DCN Management System</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top: 20px; text-align: center; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 12px; color: #94a3b8;">
                      &#9888;&#65039; Este é um e-mail automático gerado pelo sistema, não responder.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return { subject, html };
}

/**
 * Cria um registro de log de notificação disparada
 */
export function createNotificationLogEntry(
  ruleType: NotificationRuleType,
  dcns: DCN[],
  users: User[],
  settings: NotificationSettings,
  triggerMode: 'AUTOMATICO' | 'MANUAL',
  targetResponsible?: string,
  smtpSent = false
): NotificationLogEntry {
  const targetDCNs = filterDCNsForRule(dcns, ruleType, settings, targetResponsible);
  const directTo = resolveRecipientsForDCNs(targetDCNs, users, settings, targetResponsible);
  const ccList = resolveCcRecipientsForDCNs(settings, directTo);
  const recipients = directTo.length > 0 ? directTo : ccList;
  const ccRecipients = directTo.length > 0 ? ccList : [];
  const { subject, html } = buildNotificationEmailHTML(ruleType, targetDCNs, settings, targetResponsible);

  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    ruleType,
    title: RULE_TYPE_LABELS[ruleType].title,
    subject,
    recipients,
    ccRecipients,
    dcnCount: targetDCNs.length,
    dcnNumbers: targetDCNs.map(d => d.dcnNumber),
    triggerMode,
    status: targetDCNs.length === 0 ? 'SEM_PENDENCIAS' : smtpSent ? 'ENVIADO_SMTP' : 'REGISTRADO_SISTEMA',
    htmlPreview: html
  };
}
