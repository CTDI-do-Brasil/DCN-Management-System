import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { DCN, DCNStatus, FilterOptions, MaterialItem, PriorityLevel, TrainingRecord, DCNAttachment, ImplementationChecklist, Technician, TrainingAttendee } from '../types';
import { INITIAL_DCNS } from '../data/initialDCNs';
import { INITIAL_TECHNICIANS } from '../data/initialTechnicians';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

interface DCNStats {
  receivedCount: number;
  inReviewCount: number;
  awaitingMaterialCount: number;
  readyForImplementationCount: number;
  implementedCount: number;
  closedCount: number;
  totalYearCount: number;
  overdueCount: number;
  pendingTrainingsCount: number;
  pendingMaterialsCount: number;
  techniciansCount: number;
  activeTechniciansCount: number;
  totalCertificationsCount: number;
}

interface DCNContextType {
  dcns: DCN[];
  selectedDCN: DCN | null;
  setSelectedDCN: (dcn: DCN | null) => void;
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  resetFilters: () => void;
  filteredDCNs: DCN[];
  stats: DCNStats;
  currentEngineer: { name: string; role: string; email: string };
  
  // Technicians Management
  technicians: Technician[];
  addTechnician: (tech: Omit<Technician, 'id' | 'createdAt' | 'trainedDCNIds'>) => Technician;
  updateTechnician: (id: string, updatedFields: Partial<Technician>) => void;
  deleteTechnician: (id: string) => void;
  toggleTechnicianStatus: (id: string) => void;
  assignTechniciansToDCN: (dcnId: string, technicianIds: string[]) => void;
  removeTechnicianFromDCN: (dcnId: string, badgeOrId: string) => void;
  signTechnicianTraining: (dcnId: string, badgeOrId: string) => void;

  // Actions
  createDCN: (newDCN: Omit<DCN, 'id' | 'auditTrail'>) => DCN;
  updateDCN: (id: string, updatedFields: Partial<DCN>, auditComment?: string) => void;
  deleteDCN: (id: string) => void;
  advanceDCNStatus: (id: string, targetStatus?: DCNStatus, comment?: string) => void;
  revertDCNStatus: (id: string, targetStatus: DCNStatus, reason: string) => void;
  
  // Material actions
  updateMaterialStatus: (dcnId: string, materialId: string, newStatus: MaterialItem['status']) => void;
  addMaterialItem: (dcnId: string, item: Omit<MaterialItem, 'id'>) => void;
  
  // Training actions
  updateTrainingDetails: (dcnId: string, training: Partial<TrainingRecord>) => void;
  markTrainingCompleted: (dcnId: string, evidenceDoc?: string) => void;
  
  // Implementation & Checklist actions
  toggleChecklistItem: (dcnId: string, checklistId: string) => void;
  addChecklistItem: (dcnId: string, title: string, mandatory?: boolean) => void;
  
  // Attachments
  addAttachment: (dcnId: string, attachment: Omit<DCNAttachment, 'id' | 'uploadedAt' | 'uploadedBy'>) => void;
  uploadAttachmentFile: (dcnId: string, file: File, category?: DCNAttachment['category']) => Promise<DCNAttachment>;
  removeAttachment: (dcnId: string, attachmentId: string) => void;

  // Reset demo data
  resetToDefaultData: () => void;
}

const STORAGE_KEY = 'dcn_control_center_data_v1';
const TECHNICIANS_STORAGE_KEY = 'dcn_technicians_data_v1';

const defaultFilters: FilterOptions = {
  search: '',
  status: 'ALL',
  area: 'ALL',
  responsible: 'ALL',
  priority: 'ALL',
  needsMaterial: null,
  needsTraining: null,
  overdueOnly: false,
  dateRange: { start: '', end: '' }
};

const DCNContext = createContext<DCNContextType | undefined>(undefined);

export const DCNProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dcns, setDcns] = useState<DCN[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved DCNs from localStorage', e);
      }
    }
    return INITIAL_DCNS;
  });

  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    const savedTechs = localStorage.getItem(TECHNICIANS_STORAGE_KEY);
    if (savedTechs) {
      try {
        return JSON.parse(savedTechs);
      } catch (e) {
        console.error('Failed to parse saved technicians from localStorage', e);
      }
    }
    return INITIAL_TECHNICIANS;
  });

  const [selectedDCN, setSelectedDCN] = useState<DCN | null>(null);
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);

  const currentEngineer = useMemo(() => ({
    name: 'Eng. Carlos Eduardo Mendes',
    role: 'Especialista em Engenharia de Processos & Qualidade',
    email: 'carlos.mendes@dcn-enterprise.com'
  }), []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dcns));
    if (selectedDCN) {
      const updatedSelected = dcns.find(d => d.id === selectedDCN.id);
      if (updatedSelected) {
        setSelectedDCN(updatedSelected);
      }
    }
  }, [dcns]);

  useEffect(() => {
    localStorage.setItem(TECHNICIANS_STORAGE_KEY, JSON.stringify(technicians));
  }, [technicians]);

  // Carregar dados atualizados do banco PostgreSQL via API ao iniciar
  useEffect(() => {
    let isMounted = true;
    async function loadDataFromDatabase() {
      try {
        const [remoteDCNs, remoteTechs] = await Promise.all([
          api.getDCNs(),
          api.getTechnicians()
        ]);
        if (isMounted) {
          if (Array.isArray(remoteDCNs) && remoteDCNs.length > 0) {
            setDcns(remoteDCNs);
          }
          if (Array.isArray(remoteTechs) && remoteTechs.length > 0) {
            setTechnicians(remoteTechs);
          }
        }
      } catch {
        // Backend ou PostgreSQL ainda offline/em configuração - continua com dados locais
      }
    }
    loadDataFromDatabase();
    return () => {
      isMounted = false;
    };
  }, []);

  const resetFilters = () => setFilters(defaultFilters);

  const resetToDefaultData = () => {
    setDcns(INITIAL_DCNS);
    setTechnicians(INITIAL_TECHNICIANS);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TECHNICIANS_STORAGE_KEY);
    if (selectedDCN) {
      setSelectedDCN(INITIAL_DCNS[0] || null);
    }
  };

  // Filtered DCNs
  const filteredDCNs = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return dcns.filter(dcn => {
      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchNumber = dcn.dcnNumber.toLowerCase().includes(query);
        const matchTitle = dcn.title.toLowerCase().includes(query);
        const matchDesc = dcn.description.toLowerCase().includes(query);
        const matchResp = dcn.responsible.toLowerCase().includes(query);
        const matchArea = dcn.area.toLowerCase().includes(query);
        if (!matchNumber && !matchTitle && !matchDesc && !matchResp && !matchArea) {
          return false;
        }
      }

      // Status
      if (filters.status !== 'ALL' && dcn.status !== filters.status) {
        return false;
      }

      // Area
      if (filters.area !== 'ALL' && dcn.area !== filters.area) {
        return false;
      }

      // Responsible
      if (filters.responsible !== 'ALL' && dcn.responsible !== filters.responsible) {
        return false;
      }

      // Priority
      if (filters.priority !== 'ALL' && dcn.priority !== filters.priority) {
        return false;
      }

      // Needs Material
      if (filters.needsMaterial !== null && dcn.needsMaterial !== filters.needsMaterial) {
        return false;
      }

      // Needs Training
      if (filters.needsTraining !== null && dcn.needsTraining !== filters.needsTraining) {
        return false;
      }

      // Overdue
      if (filters.overdueOnly) {
        const isClosed = dcn.status === 'ENCERRADA';
        const isPastDue = dcn.dueDate < today;
        if (isClosed || !isPastDue) return false;
      }

      // Date Range
      if (filters.dateRange.start && dcn.receivedDate < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end && dcn.receivedDate > filters.dateRange.end) {
        return false;
      }

      return true;
    });
  }, [dcns, filters]);

  // Statistics calculation for Dashboard
  const stats: DCNStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let received = 0;
    let inReview = 0;
    let awaitingMaterial = 0;
    let ready = 0;
    let implemented = 0;
    let closed = 0;
    let overdue = 0;
    let pendingTrainings = 0;
    let pendingMaterials = 0;

    dcns.forEach(dcn => {
      switch (dcn.status) {
        case 'RECEBIDA': received++; break;
        case 'EM_AVALIACAO': inReview++; break;
        case 'AGUARDANDO_MATERIAL': awaitingMaterial++; break;
        case 'PRONTA_IMPLEMENTACAO': ready++; break;
        case 'IMPLEMENTADA': implemented++; break;
        case 'ENCERRADA': closed++; break;
      }

      // Overdue check
      if (dcn.status !== 'ENCERRADA' && dcn.dueDate < today) {
        overdue++;
      }

      // Pending materials check
      if (dcn.needsMaterial && dcn.status !== 'ENCERRADA') {
        const hasPendingItems = dcn.materials.some(
          m => m.status !== 'RECEBIDO_ESTOQUE' && m.status !== 'INSPECIONADO_APROVADO'
        );
        if (hasPendingItems || dcn.materials.length === 0) {
          pendingMaterials++;
        }
      }

      // Pending trainings check
      if (dcn.needsTraining && dcn.status !== 'ENCERRADA') {
        if (!dcn.training || dcn.training.status !== 'CONCLUIDO') {
          pendingTrainings++;
        }
      }
    });

    const totalCertifications = technicians.reduce((acc, t) => acc + (t.trainedDCNIds?.length || 0), 0);

    return {
      receivedCount: received,
      inReviewCount: inReview,
      awaitingMaterialCount: awaitingMaterial,
      readyForImplementationCount: ready,
      implementedCount: implemented,
      closedCount: closed,
      totalYearCount: dcns.length,
      overdueCount: overdue,
      pendingTrainingsCount: pendingTrainings,
      pendingMaterialsCount: pendingMaterials,
      techniciansCount: technicians.length,
      activeTechniciansCount: technicians.filter(t => t.active).length,
      totalCertificationsCount: totalCertifications
    };
  }, [dcns, technicians]);

  // ==========================================
  // TECHNICIANS MANAGEMENT METHODS
  // ==========================================
  const addTechnician = (techData: Omit<Technician, 'id' | 'createdAt' | 'trainedDCNIds'>): Technician => {
    const nextId = `tech-${Date.now()}`;
    const newTech: Technician = {
      ...techData,
      id: nextId,
      trainedDCNIds: [],
      createdAt: new Date().toISOString().split('T')[0]
    };
    setTechnicians(prev => [newTech, ...prev]);
    api.createTechnician(techData).catch(() => {});
    return newTech;
  };

  const updateTechnician = (id: string, updatedFields: Partial<Technician>) => {
    setTechnicians(prev => prev.map(t => t.id === id ? { ...t, ...updatedFields } : t));
    api.updateTechnician(id, updatedFields).catch(() => {});
  };

  const deleteTechnician = (id: string) => {
    setTechnicians(prev => prev.filter(t => t.id !== id));
    api.deleteTechnician(id).catch(() => {});
  };

  const toggleTechnicianStatus = (id: string) => {
    setTechnicians(prev => prev.map(t => {
      if (t.id === id) {
        const nextActive = !t.active;
        api.updateTechnician(id, { active: nextActive }).catch(() => {});
        return { ...t, active: nextActive };
      }
      return t;
    }));
  };

  // Associate Technicians to a DCN Training Record
  const assignTechniciansToDCN = (dcnId: string, technicianIds: string[]) => {
    const selectedTechs = technicians.filter(t => technicianIds.includes(t.id));
    if (selectedTechs.length === 0) return;

    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId) return dcn;

      const currentAttendees: TrainingAttendee[] = dcn.training?.attendeesList || [];
      const newAttendees: TrainingAttendee[] = [...currentAttendees];

      selectedTechs.forEach(tech => {
        const alreadyIn = newAttendees.some(a => a.badge === tech.badge || a.technicianId === tech.id);
        if (!alreadyIn) {
          newAttendees.push({
            technicianId: tech.id,
            name: tech.name,
            badge: tech.badge,
            department: tech.department,
            status: dcn.training?.status === 'CONCLUIDO' ? 'CONCLUIDO' : 'PENDENTE',
            signedDate: dcn.training?.status === 'CONCLUIDO' ? new Date().toISOString().split('T')[0] : undefined
          });
        }
      });

      const currentTraining = dcn.training || {
        id: `trn-${Date.now()}`,
        instructor: currentEngineer.name,
        targetAudience: `${selectedTechs[0]?.department || 'Produção / Operações'}`,
        department: dcn.area,
        estimatedHours: 2,
        totalPlanned: newAttendees.length,
        totalTrained: newAttendees.filter(a => a.status === 'CONCLUIDO').length,
        status: 'PENDENTE' as const,
        trainingTopics: ['Procedimento Operacional Padronizado', 'Critérios de Inspeção da DCN']
      };

      return {
        ...dcn,
        needsTraining: true,
        training: {
          ...currentTraining,
          attendeesList: newAttendees,
          totalPlanned: Math.max(currentTraining.totalPlanned, newAttendees.length),
          totalTrained: newAttendees.filter(a => a.status === 'CONCLUIDO').length
        }
      };
    }));
  };

  // Remove technician from DCN training list
  const removeTechnicianFromDCN = (dcnId: string, badgeOrId: string) => {
    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId || !dcn.training) return dcn;

      const filteredAttendees = (dcn.training.attendeesList || []).filter(
        a => a.badge !== badgeOrId && a.technicianId !== badgeOrId
      );

      return {
        ...dcn,
        training: {
          ...dcn.training,
          attendeesList: filteredAttendees,
          totalPlanned: Math.max(1, filteredAttendees.length),
          totalTrained: filteredAttendees.filter(a => a.status === 'CONCLUIDO').length
        }
      };
    }));
  };

  // Sign individual technician training
  const signTechnicianTraining = (dcnId: string, badgeOrId: string) => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Update DCN
    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId || !dcn.training) return dcn;

      const updatedAttendees = (dcn.training.attendeesList || []).map(a => {
        if (a.badge === badgeOrId || a.technicianId === badgeOrId) {
          return {
            ...a,
            status: 'CONCLUIDO' as const,
            signedDate: today
          };
        }
        return a;
      });

      const trainedCount = updatedAttendees.filter(a => a.status === 'CONCLUIDO').length;

      return {
        ...dcn,
        training: {
          ...dcn.training,
          attendeesList: updatedAttendees,
          totalTrained: trainedCount
        }
      };
    }));

    // 2. Also register in technician profile
    const targetDCN = dcns.find(d => d.id === dcnId);
    if (targetDCN) {
      setTechnicians(prev => prev.map(t => {
        if (t.id === badgeOrId || t.badge === badgeOrId) {
          const currentTrained = t.trainedDCNIds || [];
          if (!currentTrained.includes(targetDCN.id)) {
            return {
              ...t,
              trainedDCNIds: [...currentTrained, targetDCN.id]
            };
          }
        }
        return t;
      }));
    }
  };

  // Create DCN
  const createDCN = (newDCNData: Omit<DCN, 'id' | 'auditTrail'>): DCN => {
    const nextId = `DCN-2025-${String(dcns.length + 1).padStart(3, '0')}`;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    
    const initialAudit = {
      id: `aud-${Date.now()}`,
      timestamp,
      user: currentEngineer.name,
      userRole: 'Engenharia de Processos',
      action: 'Cadastro de Nova DCN no Sistema',
      toStatus: newDCNData.status || 'RECEBIDA',
      comment: 'DCN recebida e documentada na esteira de engenharia.'
    };

    const newDCN: DCN = {
      ...newDCNData,
      id: nextId,
      auditTrail: [initialAudit]
    };

    setDcns(prev => [newDCN, ...prev]);
    api.createDCN(newDCNData).catch(() => {});
    return newDCN;
  };

  // Update DCN
  const updateDCN = (id: string, updatedFields: Partial<DCN>, auditComment?: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== id) return dcn;

      const newAuditTrail = [...dcn.auditTrail];
      
      // Auto-detect version/revision or code changes
      if (updatedFields.dcnNumber && updatedFields.dcnNumber !== dcn.dcnNumber) {
        newAuditTrail.push({
          id: `aud-${Date.now()}-rev`,
          timestamp,
          user: currentEngineer.name,
          userRole: 'Engenharia',
          action: 'Mudança de Versão / Revisão',
          comment: auditComment || `Revisão/Identificação atualizada de "${dcn.dcnNumber}" para "${updatedFields.dcnNumber}".`
        });
      } else if (auditComment) {
        newAuditTrail.push({
          id: `aud-${Date.now()}`,
          timestamp,
          user: currentEngineer.name,
          userRole: 'Engenharia',
          action: 'Atualização de Registro',
          comment: auditComment
        });
      }

      return {
        ...dcn,
        ...updatedFields,
        auditTrail: newAuditTrail
      };
    }));

    api.updateDCN(id, updatedFields, auditComment, currentEngineer.name, currentEngineer.role).catch(() => {});
  };

  // Delete DCN
  const deleteDCN = (id: string) => {
    setDcns(prev => prev.filter(d => d.id !== id));
    if (selectedDCN?.id === id) {
      setSelectedDCN(null);
    }
    api.deleteDCN(id).catch(() => {});
  };

  // Advance DCN Workflow
  const advanceDCNStatus = (id: string, targetStatus?: DCNStatus, comment?: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    
    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== id) return dcn;

      let nextStatus: DCNStatus = targetStatus || dcn.status;

      if (!targetStatus) {
        // Natural progression
        switch (dcn.status) {
          case 'RECEBIDA':
            nextStatus = 'EM_AVALIACAO';
            break;
          case 'EM_AVALIACAO':
            nextStatus = dcn.needsMaterial ? 'AGUARDANDO_MATERIAL' : 'PRONTA_IMPLEMENTACAO';
            break;
          case 'AGUARDANDO_MATERIAL':
            nextStatus = 'PRONTA_IMPLEMENTACAO';
            break;
          case 'PRONTA_IMPLEMENTACAO':
            nextStatus = 'IMPLEMENTADA';
            break;
          case 'IMPLEMENTADA':
            nextStatus = 'ENCERRADA';
            break;
          default:
            nextStatus = dcn.status;
        }
      }

      // If completing/closing, shoot confetti
      if (nextStatus === 'ENCERRADA') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      const auditEntry = {
        id: `aud-${Date.now()}`,
        timestamp,
        user: currentEngineer.name,
        userRole: 'Engenharia de Processos',
        action: `Avanço de Etapa: ${dcn.status} ➔ ${nextStatus}`,
        fromStatus: dcn.status,
        toStatus: nextStatus,
        comment: comment || `Etapa validada por ${currentEngineer.name} conforme procedimento de engenharia.`
      };

      const isClosing = nextStatus === 'ENCERRADA';

      return {
        ...dcn,
        status: nextStatus,
        implementationDate: nextStatus === 'IMPLEMENTADA' && !dcn.implementationDate ? timestamp.split(' ')[0] : dcn.implementationDate,
        implementedBy: nextStatus === 'IMPLEMENTADA' && !dcn.implementedBy ? currentEngineer.name : dcn.implementedBy,
        closedAt: isClosing ? timestamp.split(' ')[0] : dcn.closedAt,
        closedBy: isClosing ? currentEngineer.name : dcn.closedBy,
        closureNotes: isClosing && comment ? comment : dcn.closureNotes,
        auditTrail: [...dcn.auditTrail, auditEntry]
      };
    }));
  };

  // Revert DCN Status
  const revertDCNStatus = (id: string, targetStatus: DCNStatus, reason: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== id) return dcn;

      const auditEntry = {
        id: `aud-${Date.now()}`,
        timestamp,
        user: currentEngineer.name,
        userRole: 'Engenharia de Processos',
        action: `Retorno de Etapa: ${dcn.status} ➔ ${targetStatus}`,
        fromStatus: dcn.status,
        toStatus: targetStatus,
        comment: `Motivo da devolução: ${reason}`
      };

      return {
        ...dcn,
        status: targetStatus,
        auditTrail: [...dcn.auditTrail, auditEntry]
      };
    }));
  };

  // Update Material Status
  const updateMaterialStatus = (dcnId: string, materialId: string, newStatus: MaterialItem['status']) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId) return dcn;

      const updatedMaterials = dcn.materials.map(m => {
        if (m.id !== materialId) return m;
        return {
          ...m,
          status: newStatus,
          arrivalDate: (newStatus === 'RECEBIDO_ESTOQUE' || newStatus === 'INSPECIONADO_APROVADO') && !m.arrivalDate 
            ? timestamp.split(' ')[0] 
            : m.arrivalDate
        };
      });

      // Check if all materials are now ready
      const allReady = updatedMaterials.every(
        m => m.status === 'RECEBIDO_ESTOQUE' || m.status === 'INSPECIONADO_APROVADO'
      );

      const auditEntry = {
        id: `aud-${Date.now()}`,
        timestamp,
        user: currentEngineer.name,
        userRole: 'Controle de Materiais',
        action: `Status de Material Atualizado (${newStatus})`,
        comment: allReady ? 'Todos os materiais requeridos foram recebidos/aprovados.' : undefined
      };

      return {
        ...dcn,
        materials: updatedMaterials,
        auditTrail: [...dcn.auditTrail, auditEntry]
      };
    }));
  };

  // Add Material Item
  const addMaterialItem = (dcnId: string, item: Omit<MaterialItem, 'id'>) => {
    const newItem: MaterialItem = {
      ...item,
      id: `mat-${Date.now()}`
    };
    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId) return dcn;
      return {
        ...dcn,
        needsMaterial: true,
        materials: [...dcn.materials, newItem]
      };
    }));
  };

  // Update Training Details
  const updateTrainingDetails = (dcnId: string, trainingUpdates: Partial<TrainingRecord>) => {
    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId) return dcn;
      const current = dcn.training || {
        id: `trn-${Date.now()}`,
        instructor: currentEngineer.name,
        targetAudience: 'Operadores e Inspetores',
        department: dcn.area,
        estimatedHours: 2,
        totalPlanned: 10,
        totalTrained: 0,
        status: 'PENDENTE' as const,
        trainingTopics: ['Instrução de Trabalho', 'Segurança e Procedimentos']
      };
      return {
        ...dcn,
        needsTraining: true,
        training: {
          ...current,
          ...trainingUpdates
        }
      };
    }));
  };

  // Mark Training Completed
  const markTrainingCompleted = (dcnId: string, evidenceDoc?: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const today = timestamp.split(' ')[0];

    const targetDCN = dcns.find(d => d.id === dcnId);
    if (!targetDCN || !targetDCN.training) return;

    // 1. Update Attendees in the DCN
    const updatedAttendees = (targetDCN.training.attendeesList || []).map(a => ({
      ...a,
      status: 'CONCLUIDO' as const,
      signedDate: a.signedDate || today
    }));

    const updatedTraining: TrainingRecord = {
      ...targetDCN.training,
      status: 'CONCLUIDO',
      completionDate: today,
      attendeesList: updatedAttendees,
      totalTrained: Math.max(targetDCN.training.totalPlanned, updatedAttendees.length),
      totalPlanned: Math.max(targetDCN.training.totalPlanned, updatedAttendees.length),
      evidenceDoc: evidenceDoc || targetDCN.training.evidenceDoc || 'Lista_Presenca_Assinada.pdf'
    };

    const auditEntry = {
      id: `aud-${Date.now()}`,
      timestamp,
      user: currentEngineer.name,
      userRole: 'Capacitação & Treinamento',
      action: 'Treinamento de Impactados Concluído com Sucesso',
      comment: `Treinamento realizado para ${updatedTraining.totalTrained} colaboradores com ata de presença atestada.`
    };

    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId) return dcn;
      return {
        ...dcn,
        training: updatedTraining,
        auditTrail: [...dcn.auditTrail, auditEntry]
      };
    }));

    // 2. Synchronize all associated technicians
    setTechnicians(prev => prev.map(t => {
      const isAttendee = updatedAttendees.some(a => a.badge === t.badge || a.technicianId === t.id);
      if (isAttendee) {
        const trained = t.trainedDCNIds || [];
        if (!trained.includes(dcnId)) {
          return {
            ...t,
            trainedDCNIds: [...trained, dcnId]
          };
        }
      }
      return t;
    }));

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (e) {
      // ignore
    }
  };

  // Toggle Checklist Item
  const toggleChecklistItem = (dcnId: string, checklistId: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId) return dcn;
      const updatedChecklist = dcn.implementationChecklist.map(chk => {
        if (chk.id !== checklistId) return chk;
        const newCompleted = !chk.completed;
        return {
          ...chk,
          completed: newCompleted,
          completedAt: newCompleted ? timestamp : undefined
        };
      });

      return {
        ...dcn,
        implementationChecklist: updatedChecklist
      };
    }));
  };

  // Add Checklist Item
  const addChecklistItem = (dcnId: string, title: string, mandatory = true) => {
    const newItem: ImplementationChecklist = {
      id: `chk-${Date.now()}`,
      title,
      responsible: currentEngineer.name,
      completed: false,
      mandatory
    };
    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId) return dcn;
      return {
        ...dcn,
        implementationChecklist: [...dcn.implementationChecklist, newItem]
      };
    }));
  };

  // Upload Attachment File to MinIO & State
  const uploadAttachmentFile = async (
    dcnId: string,
    file: File,
    category: DCNAttachment['category'] = 'DOCUMENTO_COMPLEMENTAR'
  ): Promise<DCNAttachment> => {
    try {
      const savedAttachment = await api.uploadAttachment(dcnId, file, category, currentEngineer.name);
      setDcns(prev => prev.map(dcn => {
        if (dcn.id !== dcnId) return dcn;
        return {
          ...dcn,
          attachments: [savedAttachment, ...(dcn.attachments || [])]
        };
      }));
      return savedAttachment;
    } catch (error) {
      console.warn('[DCNContext] Falha no upload MinIO via API, usando fallback local:', error);
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let type: DCNAttachment['type'] = 'DOC';
      if (file.type.includes('pdf') || ext === 'pdf') type = 'PDF';
      else if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) type = 'IMG';
      else if (file.type.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext)) type = 'VIDEO';
      else if (['xls', 'xlsx', 'csv'].includes(ext)) type = 'SPREADSHEET';

      const fallbackAttachment: DCNAttachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        type,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        category,
        uploadedAt: new Date().toISOString().split('T')[0],
        uploadedBy: currentEngineer.name,
        url: URL.createObjectURL(file)
      };

      setDcns(prev => prev.map(dcn => {
        if (dcn.id !== dcnId) return dcn;
        return {
          ...dcn,
          attachments: [fallbackAttachment, ...(dcn.attachments || [])]
        };
      }));
      return fallbackAttachment;
    }
  };

  // Add Attachment (metadata)
  const addAttachment = (dcnId: string, attachmentData: Omit<DCNAttachment, 'id' | 'uploadedAt' | 'uploadedBy'>) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newAttachment: DCNAttachment = {
      ...attachmentData,
      id: `att-${Date.now()}`,
      uploadedAt: timestamp.split(' ')[0],
      uploadedBy: currentEngineer.name
    };

    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId) return dcn;
      return {
        ...dcn,
        attachments: [newAttachment, ...(dcn.attachments || [])]
      };
    }));
  };

  // Remove Attachment
  const removeAttachment = (dcnId: string, attachmentId: string) => {
    api.deleteAttachment(dcnId, attachmentId, currentEngineer.name).catch(() => {});
    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId) return dcn;
      return {
        ...dcn,
        attachments: (dcn.attachments || []).filter(a => a.id !== attachmentId)
      };
    }));
  };

  return (
    <DCNContext.Provider
      value={{
        dcns,
        selectedDCN,
        setSelectedDCN,
        filters,
        setFilters,
        resetFilters,
        filteredDCNs,
        stats,
        currentEngineer,
        technicians,
        addTechnician,
        updateTechnician,
        deleteTechnician,
        toggleTechnicianStatus,
        assignTechniciansToDCN,
        removeTechnicianFromDCN,
        signTechnicianTraining,
        createDCN,
        updateDCN,
        deleteDCN,
        advanceDCNStatus,
        revertDCNStatus,
        updateMaterialStatus,
        addMaterialItem,
        updateTrainingDetails,
        markTrainingCompleted,
        toggleChecklistItem,
        addChecklistItem,
        addAttachment,
        uploadAttachmentFile,
        removeAttachment,
        resetToDefaultData
      }}
    >
      {children}
    </DCNContext.Provider>
  );
};

export const useDCN = () => {
  const context = useContext(DCNContext);
  if (!context) {
    throw new Error('useDCN must be used within a DCNProvider');
  }
  return context;
};
