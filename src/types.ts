export type DCNStatus = 
  | 'RECEBIDA'
  | 'EM_AVALIACAO'
  | 'AGUARDANDO_MATERIAL'
  | 'PRONTA_IMPLEMENTACAO'
  | 'IMPLEMENTADA'
  | 'ENCERRADA';

export type UserRole = 'ADMIN' | 'ENGINEER' | 'OPERATOR';

export interface User {
  id: string;
  login: string;
  nome: string;
  role: UserRole;
  senha?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PriorityLevel = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';


export type MaterialStatus = 'PENDENTE' | 'PEDIDO_EMITIDO' | 'EM_TRANSITO' | 'RECEBIDO_ESTOQUE' | 'INSPECIONADO_APROVADO';

export interface MaterialItem {
  id: string;
  code: string;
  description: string;
  quantity: number;
  unit: string;
  supplier: string;
  expectedDate: string;
  arrivalDate?: string;
  status: MaterialStatus;
  notes?: string;
}

export type ShiftType = '1º Turno' | '2º Turno' | '3º Turno' | 'Administrativo' | 'Comercial' | '';

export interface Technician {
  id: string;
  name: string;
  badge?: string;
  department?: string;
  shift?: ShiftType;
  role: string;

  email?: string;
  phone?: string;
  active: boolean;
  skills?: string[];
  trainedDCNIds: string[];
  createdAt: string;
  notes?: string;
}

export interface TrainingAttendee {
  technicianId?: string;
  name: string;
  badge?: string;
  department?: string;
  signedDate?: string;
  status?: 'CONCLUIDO' | 'PENDENTE' | 'JUSTIFICADO';
  score?: number;
}

export interface TrainingRecord {
  id: string;
  instructor: string;
  targetAudience: string;
  department: string;
  estimatedHours: number;
  scheduledDate?: string;
  completionDate?: string;
  totalTrained: number;
  totalPlanned: number;
  status: 'PENDENTE' | 'AGENDADO' | 'EM_ANDAMENTO' | 'CONCLUIDO';
  trainingTopics: string[];
  attendeesList?: TrainingAttendee[];
  evidenceDoc?: string;
}

export interface ImplementationChecklist {
  id: string;
  title: string;
  responsible: string;
  completed: boolean;
  completedAt?: string;
  mandatory: boolean;
}

export interface DCNAttachment {
  id: string;
  name: string;
  type: 'PDF' | 'DOC' | 'IMG' | 'SPREADSHEET' | 'VIDEO';
  size: string;
  category: 'PDF_OFICIAL' | 'DOCUMENTO_COMPLEMENTAR' | 'FOTO_EVIDENCIA' | 'DESENHO_TECNICO' | 'REGISTRO_TREINAMENTO';
  uploadedAt: string;
  uploadedBy: string;
  url?: string;
  objectKey?: string;
  mimeType?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: string;
  fromStatus?: DCNStatus;
  toStatus?: DCNStatus;
  comment?: string;
}

export interface DCN {
  id: string;
  dcnNumber: string;
  revision?: string;
  title: string;
  description: string;
  area: string;
  responsible: string;
  receivedDate: string;
  dueDate: string;
  status: DCNStatus;
  priority: PriorityLevel;
  
  // Requisitos específicos
  needsMaterial: boolean;
  materials: MaterialItem[];
  
  needsTraining: boolean;
  training?: TrainingRecord;

  // Implementação & Auditoria
  implementationChecklist: ImplementationChecklist[];
  implementationDate?: string;
  implementedBy?: string;
  
  attachments: DCNAttachment[];
  auditTrail: AuditLogEntry[];

  // Avaliação Técnica da Engenharia
  engineeringReview?: {
    approved: boolean;
    reviewer: string;
    reviewDate: string;
    technicalImpact: string;
    risksIdentified: string[];
    costImpactEstimate?: string;
  };

  closureNotes?: string;
  closedAt?: string;
  closedBy?: string;
}

export interface FilterOptions {
  search: string;
  status: string;
  area: string;
  responsible: string;
  priority: string;
  needsMaterial?: boolean | null;
  needsTraining?: boolean | null;
  overdueOnly: boolean;
  dateRange: {
    start: string;
    end: string;
  };
}
