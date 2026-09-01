import { DCNStatus, PriorityLevel, MaterialStatus } from '../types';

export const STATUS_CONFIG: Record<DCNStatus, {
  label: string;
  step: number;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  description: string;
}> = {
  RECEBIDA: {
    label: 'DCN Recebida',
    step: 1,
    badgeBg: 'bg-slate-100 dark:bg-slate-800/60',
    badgeText: 'text-slate-800 dark:text-slate-200',
    badgeBorder: 'border-slate-300 dark:border-slate-700',
    dotColor: 'bg-slate-500',
    description: 'Documento recebido formalmente, aguardando início da triagem técnica.'
  },
  EM_AVALIACAO: {
    label: 'Em Avaliação',
    step: 2,
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeText: 'text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-300 dark:border-amber-700/60',
    dotColor: 'bg-amber-500',
    description: 'Análise de viabilidade técnica, impacto em processos e verificação de materiais.'
  },
  AGUARDANDO_MATERIAL: {
    label: 'Aguardando Material',
    step: 3,
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
    badgeText: 'text-blue-800 dark:text-blue-300',
    badgeBorder: 'border-blue-300 dark:border-blue-700/60',
    dotColor: 'bg-blue-500',
    description: 'Requisição de compra ou amostras emitida. Aguardando entrega pelo fornecedor.'
  },
  PRONTA_IMPLEMENTACAO: {
    label: 'Pronta p/ Implementação',
    step: 4,
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    badgeText: 'text-indigo-800 dark:text-indigo-300',
    badgeBorder: 'border-indigo-300 dark:border-indigo-700/60',
    dotColor: 'bg-indigo-500',
    description: 'Materiais em estoque e documentos revisados. Pronta para setup em fábrica.'
  },
  IMPLEMENTADA: {
    label: 'Implementada',
    step: 5,
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40',
    badgeText: 'text-teal-800 dark:text-teal-300',
    badgeBorder: 'border-teal-300 dark:border-teal-700/60',
    dotColor: 'bg-teal-500',
    description: 'Alteração em chão de fábrica efetuada. Em fase de validação e treinamentos.'
  },
  ENCERRADA: {
    label: 'Encerrada',
    step: 6,
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    badgeBorder: 'border-emerald-300 dark:border-emerald-700/60',
    dotColor: 'bg-emerald-500',
    description: 'Treinamento concluído, lote piloto validado e documentação arquivada.'
  }
};

export const PRIORITY_CONFIG: Record<PriorityLevel, {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}> = {
  BAIXA: {
    label: 'Baixa',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200'
  },
  MEDIA: {
    label: 'Média',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-200'
  },
  ALTA: {
    label: 'Alta',
    badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',
    badgeText: 'text-orange-800',
    badgeBorder: 'border-orange-200'
  },
  CRITICA: {
    label: 'Crítica / Urgente',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-200'
  }
};

export const MATERIAL_STATUS_CONFIG: Record<MaterialStatus, {
  label: string;
  color: string;
  badgeClass: string;
}> = {
  PENDENTE: {
    label: 'Pendente Requisição',
    color: 'text-slate-500',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  PEDIDO_EMITIDO: {
    label: 'Pedido de Compra Emitido',
    color: 'text-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  EM_TRANSITO: {
    label: 'Em Trânsito / Transporte',
    color: 'text-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  RECEBIDO_ESTOQUE: {
    label: 'Recebido no Almoxarifado',
    color: 'text-indigo-500',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  INSPECIONADO_APROVADO: {
    label: 'Inspecionado & Aprovado pelo CQ',
    color: 'text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
};

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

export function isOverdue(dueDate: string, status: DCNStatus): boolean {
  if (status === 'ENCERRADA') return false;
  const today = new Date().toISOString().split('T')[0];
  return dueDate < today;
}

export function getDaysRemaining(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dueDate);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function exportDCNsToCSV(dcns: any[]): void {
  const headers = [
    'ID',
    'Número DCN',
    'Título',
    'Área',
    'Responsável',
    'Data Recebimento',
    'Data Limite',
    'Status',
    'Prioridade',
    'Necessita Material',
    'Necessita Treinamento',
    'Treinamento Concluído'
  ];

  const rows = dcns.map(d => [
    `"${d.id}"`,
    `"${d.dcnNumber}"`,
    `"${(d.title || '').replace(/"/g, '""')}"`,
    `"${d.area}"`,
    `"${d.responsible}"`,
    `"${d.receivedDate}"`,
    `"${d.dueDate}"`,
    `"${d.status}"`,
    `"${d.priority}"`,
    `"${d.needsMaterial ? 'SIM' : 'NÃO'}"`,
    `"${d.needsTraining ? 'SIM' : 'NÃO'}"`,
    `"${d.training?.status === 'CONCLUIDO' ? 'SIM' : 'NÃO'}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `DCN_Export_Relatorio_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
