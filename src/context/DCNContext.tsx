import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { DCN, DCNStatus, FilterOptions, MaterialItem, PriorityLevel, TrainingRecord, DCNAttachment, ImplementationChecklist, Technician, TrainingAttendee } from '../types';
import { INITIAL_DCNS, LEGACY_DEMO_DCN_IDS, LEGACY_DEMO_DCN_NUMBERS } from '../data/initialDCNs';
import { INITIAL_TECHNICIANS, LEGACY_DEMO_TECH_IDS, LEGACY_DEMO_TECH_BADGES } from '../data/initialTechnicians';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { addBusinessDays, formatDate, isOverdue, isWaitingMaterials } from '../utils/helpers';

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
  createDCN: (newDCN: Omit<DCN, 'id' | 'auditTrail'>) => Promise<DCN>;
  updateDCN: (id: string, updatedFields: Partial<DCN>, auditComment?: string) => Promise<void>;
  deleteDCN: (id: string) => void;
  advanceDCNStatus: (id: string, targetStatus?: DCNStatus, comment?: string) => void;
  revertDCNStatus: (id: string, targetStatus: DCNStatus, reason: string) => void;
  
  // Material actions
  updateMaterialStatus: (dcnId: string, materialId: string, newStatus: MaterialItem['status']) => void;
  updateMaterialExpectedDate: (dcnId: string, materialId: string, expectedDate: string) => void;
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

const STORAGE_KEY = 'dcn_control_center_data_v2';
const TECHNICIANS_STORAGE_KEY = 'dcn_technicians_data_v2';
const LEGACY_STORAGE_KEY = 'dcn_control_center_data_v1';
const LEGACY_TECHNICIANS_STORAGE_KEY = 'dcn_technicians_data_v1';

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
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (d: DCN) =>
              !LEGACY_DEMO_DCN_IDS.includes(d.id) &&
              !LEGACY_DEMO_DCN_NUMBERS.includes(d.dcnNumber)
          );
        }
      }
    } catch (e) {
      console.error('Failed to parse saved DCNs from localStorage', e);
    }
    return INITIAL_DCNS;
  });

  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    try {
      localStorage.removeItem(LEGACY_TECHNICIANS_STORAGE_KEY);
      const savedTechs = localStorage.getItem(TECHNICIANS_STORAGE_KEY);
      if (savedTechs) {
        const parsed = JSON.parse(savedTechs);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(
              (t: Technician) =>
                !LEGACY_DEMO_TECH_IDS.includes(t.id) &&
                !LEGACY_DEMO_TECH_BADGES.includes(t.badge || '')
            )
            .map((t: Technician) => ({
              ...t,
              department: t.department === 'Montagem SMT' ? 'Produção' : t.department
            }));
        }
      }
    } catch (e) {
      console.error('Failed to parse saved technicians from localStorage', e);
    }
    return INITIAL_TECHNICIANS;
  });


  const [selectedDCN, setSelectedDCN] = useState<DCN | null>(null);
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);

  const { currentUser } = useAuth();

  const currentEngineer = useMemo(() => ({
    name: currentUser?.nome || 'Jonatas Miranda',
    role: currentUser?.role === 'ADMIN' 
      ? 'Administrador do Sistema' 
      : (currentUser?.role === 'ENGINEER' ? 'Engenharia de Processos & Qualidade' : 'Operador de Produção'),
    email: currentUser ? `${currentUser.login.toLowerCase()}@ctdi.com` : 'jonatas.miranda@ctdi.com'
  }), [currentUser]);


  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dcns));
    } catch (err) {
      console.warn('[DCNContext] Limite de quota do localStorage atingido ao salvar DCNs:', err);
    }
    if (selectedDCN) {
      const updatedSelected = dcns.find(d => d.id === selectedDCN.id);
      if (updatedSelected) {
        setSelectedDCN(updatedSelected);
      } else {
        setSelectedDCN(null);
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
          if (Array.isArray(remoteDCNs)) {
            const cleanDCNs = remoteDCNs.filter(
              d => !LEGACY_DEMO_DCN_IDS.includes(d.id) && !LEGACY_DEMO_DCN_NUMBERS.includes(d.dcnNumber)
            );
            if (cleanDCNs.length > 0) {
              setDcns(cleanDCNs);
            } else {
              // Se o servidor retornou 0 DCNs (ex: banco novo ou recém reiniciado), preserva DCNs locais legítimas
              // e sincroniza com o backend para evitar perda de dados
              setDcns(currentLocalDcns => {
                const validLocal = currentLocalDcns.filter(
                  d => !LEGACY_DEMO_DCN_NUMBERS.includes(d.dcnNumber)
                );
                if (validLocal.length > 0) {
                  validLocal.forEach(d => {
                    api.createDCN(d as any).catch(err => console.warn('[DCNContext] Sincronização offline-to-server falhou:', err));
                  });
                  return validLocal;
                }
                return [];
              });
            }
          }
          if (Array.isArray(remoteTechs)) {
            const cleanTechs = remoteTechs.filter(
              t => !LEGACY_DEMO_TECH_IDS.includes(t.id) && !LEGACY_DEMO_TECH_BADGES.includes(t.badge || '')
            );
            if (cleanTechs.length > 0) {
              setTechnicians(cleanTechs);
            } else {
              setTechnicians(currentLocalTechs => {
                const validLocal = currentLocalTechs.filter(
                  t => !LEGACY_DEMO_TECH_IDS.includes(t.id) && !LEGACY_DEMO_TECH_BADGES.includes(t.badge || '')
                );
                if (validLocal.length > 0) {
                  validLocal.forEach(t => {
                    api.createTechnician(t as any).catch(() => {});
                  });
                  return validLocal;
                }
                return [];
              });
            }
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
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TECHNICIANS_STORAGE_KEY);
    setSelectedDCN(null);
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
        if (!isOverdue(dcn.dueDate, dcn.status, isWaitingMaterials(dcn))) return false;
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
      if (isOverdue(dcn.dueDate, dcn.status, isWaitingMaterials(dcn))) {
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

    let updatedNewAttendees: TrainingAttendee[] = [];
    let updatedTotalPlanned = 0;

    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId) return dcn;

      const currentAttendees: TrainingAttendee[] = dcn.training?.attendeesList || [];
      const newAttendees: TrainingAttendee[] = [...currentAttendees];

      selectedTechs.forEach(tech => {
        const alreadyIn = newAttendees.some(
          a => a.technicianId === tech.id || a.name === tech.name || (tech.badge && a.badge === tech.badge)
        );
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
        targetAudience: 'Líderes, Técnicos de Reparo e Inspetores de CQ.',
        department: dcn.area,
        estimatedHours: 30,
        totalPlanned: newAttendees.length,
        totalTrained: newAttendees.filter(a => a.status === 'CONCLUIDO').length,
        status: 'PENDENTE' as const,
        trainingTopics: ['Procedimento Operacional Padronizado', 'Critérios de Inspeção da DCN']
      };

      updatedNewAttendees = newAttendees;
      updatedTotalPlanned = Math.max(currentTraining.totalPlanned, newAttendees.length);

      return {
        ...dcn,
        needsTraining: true,
        training: {
          ...currentTraining,
          attendeesList: newAttendees,
          totalPlanned: updatedTotalPlanned,
          totalTrained: newAttendees.filter(a => a.status === 'CONCLUIDO').length
        }
      };
    }));

    if (updatedNewAttendees.length > 0) {
      api.updateTraining(dcnId, {
        attendeesList: updatedNewAttendees,
        totalPlanned: updatedTotalPlanned,
        totalTrained: updatedNewAttendees.filter(a => a.status === 'CONCLUIDO').length
      }).catch(err => console.warn('[DCNContext] Falha ao persistir técnicos no PostgreSQL:', err));
    }
  };

  // Remove technician from DCN training list
  const removeTechnicianFromDCN = (dcnId: string, badgeOrId: string) => {
    let updatedFilteredAttendees: TrainingAttendee[] = [];

    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId || !dcn.training) return dcn;

      const filteredAttendees = (dcn.training.attendeesList || []).filter(
        a => a.badge !== badgeOrId && a.technicianId !== badgeOrId && a.name !== badgeOrId
      );

      updatedFilteredAttendees = filteredAttendees;

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

    api.updateTraining(dcnId, {
      attendeesList: updatedFilteredAttendees,
      totalPlanned: Math.max(1, updatedFilteredAttendees.length),
      totalTrained: updatedFilteredAttendees.filter(a => a.status === 'CONCLUIDO').length
    }).catch(err => console.warn('[DCNContext] Falha ao persistir remoção de técnico no PostgreSQL:', err));
  };

  // Sign individual technician training
  const signTechnicianTraining = (dcnId: string, badgeOrId: string) => {
    const today = new Date().toISOString().split('T')[0];
    let syncedAttendees: TrainingAttendee[] = [];
    let syncedStatus: 'PENDENTE' | 'AGENDADO' | 'CONCLUIDO' = 'PENDENTE';
    let syncedCompletionDate: string | undefined = undefined;
    let syncedTrainedCount = 0;

    // 1. Update DCN
    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId || !dcn.training) return dcn;

      const updatedAttendees = (dcn.training.attendeesList || []).map(a => {
        if (a.badge === badgeOrId || a.technicianId === badgeOrId || a.name === badgeOrId) {
          return {
            ...a,
            status: 'CONCLUIDO' as const,
            signedDate: today
          };
        }
        return a;
      });

      const trainedCount = updatedAttendees.filter(a => a.status === 'CONCLUIDO').length;
      const allSigned =
        updatedAttendees.length > 0 &&
        updatedAttendees.every(a => a.status === 'CONCLUIDO' || !!a.signedDate);

      syncedAttendees = updatedAttendees;
      syncedStatus = allSigned ? 'CONCLUIDO' : dcn.training.status;
      syncedCompletionDate = allSigned ? (dcn.training.completionDate || today) : dcn.training.completionDate;
      syncedTrainedCount = trainedCount;

      return {
        ...dcn,
        training: {
          ...dcn.training,
          status: syncedStatus,
          completionDate: syncedCompletionDate,
          attendeesList: updatedAttendees,
          totalTrained: trainedCount
        }
      };
    }));

    api.updateTraining(dcnId, {
      status: syncedStatus,
      completionDate: syncedCompletionDate,
      attendeesList: syncedAttendees,
      totalTrained: syncedTrainedCount
    }).catch(err => console.warn('[DCNContext] Falha ao persistir assinatura no PostgreSQL:', err));

    // 2. Also register in technician profile
    const targetDCN = dcns.find(d => d.id === dcnId);
    if (targetDCN) {
      setTechnicians(prev => prev.map(t => {
        if (t.id === badgeOrId || (t.badge && t.badge === badgeOrId) || t.name === badgeOrId) {
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
  const createDCN = async (newDCNData: Omit<DCN, 'id' | 'auditTrail'>): Promise<DCN> => {
    const nextId = `dcn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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

    let newDCN: DCN = {
      ...newDCNData,
      id: nextId,
      auditTrail: [initialAudit]
    };

    try {
      const serverDCN = await api.createDCN({ ...newDCNData, id: nextId } as any);
      if (serverDCN && serverDCN.id) {
        newDCN = {
          ...serverDCN,
          materials: serverDCN.materials || newDCN.materials,
          training: serverDCN.training || newDCN.training,
          implementationChecklist: serverDCN.implementationChecklist || newDCN.implementationChecklist,
          attachments: serverDCN.attachments || newDCN.attachments,
          auditTrail: serverDCN.auditTrail && serverDCN.auditTrail.length > 0 ? serverDCN.auditTrail : newDCN.auditTrail
        };
      }
    } catch (err) {
      console.warn('[DCNContext] Backend createDCN fallback to local:', err);
    }

    setDcns(prev => [newDCN, ...prev]);
    return newDCN;
  };

  // Update DCN
  const updateDCN = async (id: string, updatedFields: Partial<DCN>, auditComment?: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    let updatedMergedDCN: DCN | null = null;
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
      } else {
        newAuditTrail.push({
          id: `aud-${Date.now()}`,
          timestamp,
          user: currentEngineer.name,
          userRole: 'Engenharia',
          action: 'Edição de DCN',
          comment: auditComment || 'Dados cadastrais da DCN atualizados via formulário.'
        });
      }

      const merged: DCN = {
        ...dcn,
        ...updatedFields,
        auditTrail: newAuditTrail
      };
      updatedMergedDCN = merged;
      return merged;
    }));

    if (updatedMergedDCN) {
      setSelectedDCN(prev => (prev?.id === id ? updatedMergedDCN : prev));
    }

    try {
      await api.updateDCN(id, updatedFields, auditComment || 'Dados cadastrais da DCN atualizados via formulário.', currentEngineer.name, currentEngineer.role);
    } catch (err) {
      console.warn('[DCNContext] Falha ao persistir updateDCN no servidor:', err);
    }
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
    const targetDcn = dcns.find(d => d.id === id);
    if (!targetDcn) return;

    // Regra Etapa 3 (Materiais): Só permite avançar se todos os materiais estiverem com status RECEBIDO_ESTOQUE
    if (targetDcn.status === 'AGUARDANDO_MATERIAL' && targetDcn.needsMaterial) {
      const allReceivedInStock =
        targetDcn.materials.length > 0 &&
        targetDcn.materials.every(m => m.status === 'RECEBIDO_ESTOQUE');

      if (!allReceivedInStock) {
        window.alert(
          'Não é possível avançar da etapa de Materiais:\nTodos os materiais cadastrados precisam estar com o status "Recebido em Estoque".'
        );
        return;
      }
    }

    // Regra Etapa 5 (Implementação -> Encerramento):
    // 1) É necessário que haja técnicos inseridos na Ata de Treinamento em Matriz de Treinamento
    // 2) É necessário que o PDF com o registro de treinamento esteja anexado
    if (targetDcn.status === 'IMPLEMENTADA' && (!targetStatus || targetStatus === 'ENCERRADA')) {
      const attendees = targetDcn.training?.attendeesList || [];
      const hasTrainingAttendees = attendees.length > 0;

      if (!hasTrainingAttendees) {
        window.alert(
          'Não é possível avançar para o Encerramento:\nÉ necessário inserir os técnicos que participaram na Ata de Treinamento em Matriz de Treinamento.'
        );
        return;
      }

      const hasTrainingPdf = (targetDcn.attachments || []).some(
        att =>
          att.category === 'REGISTRO_TREINAMENTO' &&
          (att.type === 'PDF' || att.name.toLowerCase().endsWith('.pdf'))
      );

      if (!hasTrainingPdf) {
        window.alert(
          'Não é possível avançar para o Encerramento:\nÉ obrigatório anexar o PDF com o Registro de Treinamento.'
        );
        return;
      }
    }

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    let appliedUpdates: Partial<DCN> | null = null;
    let appliedComment = comment;
    
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
            nextStatus = (dcn.needsMaterial || (dcn.materials && dcn.materials.length > 0)) ? 'AGUARDANDO_MATERIAL' : 'PRONTA_IMPLEMENTACAO';
            break;
          case 'AGUARDANDO_MATERIAL':
            nextStatus = 'PRONTA_IMPLEMENTACAO';
            break;
          case 'PRONTA_IMPLEMENTACAO':
            // Se o treinamento não estiver agendado, não permitir avançar para IMPLEMENTADA
            if (!dcn.training?.scheduledDate || !dcn.training.scheduledDate.trim()) {
              return dcn;
            }
            nextStatus = 'IMPLEMENTADA';
            break;
          case 'IMPLEMENTADA':
            nextStatus = 'ENCERRADA';
            break;
          default:
            nextStatus = dcn.status;
        }
      } else if (targetStatus === 'IMPLEMENTADA' && dcn.status === 'PRONTA_IMPLEMENTACAO') {
        if (!dcn.training?.scheduledDate || !dcn.training.scheduledDate.trim()) {
          return dcn;
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

      const actualComment = comment || `Etapa validada por ${currentEngineer.name} conforme procedimento de engenharia.`;
      appliedComment = actualComment;

      const auditEntry = {
        id: `aud-${Date.now()}`,
        timestamp,
        user: currentEngineer.name,
        userRole: 'Engenharia de Processos',
        action: `Avanço de Etapa: ${dcn.status} ➔ ${nextStatus}`,
        fromStatus: dcn.status,
        toStatus: nextStatus,
        comment: actualComment
      };

      const isClosing = nextStatus === 'ENCERRADA';

      appliedUpdates = {
        status: nextStatus,
        implementationDate: nextStatus === 'IMPLEMENTADA' && !dcn.implementationDate ? timestamp.split(' ')[0] : dcn.implementationDate,
        implementedBy: nextStatus === 'IMPLEMENTADA' && !dcn.implementedBy ? currentEngineer.name : dcn.implementedBy,
        closedAt: isClosing ? timestamp.split(' ')[0] : dcn.closedAt,
        closedBy: isClosing ? currentEngineer.name : dcn.closedBy,
        closureNotes: isClosing && comment ? comment : dcn.closureNotes
      };

      return {
        ...dcn,
        ...appliedUpdates,
        auditTrail: [...dcn.auditTrail, auditEntry]
      };
    }));

    if (appliedUpdates) {
      api.updateDCN(
        id,
        appliedUpdates,
        appliedComment,
        currentEngineer.name,
        'Engenharia de Processos'
      ).catch(err => {
        console.warn('[DCNContext] Falha ao persistir avanço no PostgreSQL:', err);
      });

      // Se a etapa avançou para ENCERRADA, acionar explicitamente a notificação de encerramento
      if ((appliedUpdates as any).status === 'ENCERRADA') {
        const targetDcnObj = dcns.find(d => d.id === id);
        if (targetDcnObj) {
          const closedDcn = { ...targetDcnObj, ...appliedUpdates };
          const trainingAtt = (closedDcn.attachments || []).find(
            a => a.category === 'REGISTRO_TREINAMENTO'
          ) || (closedDcn.attachments || []).find(
            a => a.type === 'PDF' || (a.name && a.name.toLowerCase().endsWith('.pdf'))
          ) || (closedDcn.attachments && closedDcn.attachments.length > 0 ? closedDcn.attachments[0] : null);
          const attPayload = trainingAtt?.base64
            ? {
                base64: trainingAtt.base64,
                filename: trainingAtt.name,
                contentType: trainingAtt.type === 'PDF' ? 'application/pdf' : undefined
              }
            : undefined;

          api.notifyDCNClosure(
            id,
            currentEngineer.name,
            closedDcn,
            attPayload
          ).then(result => {
            const filename = attPayload?.filename || trainingAtt?.name || 'Registro de Treinamento';
            if (result.smtpSent) {
              window.alert(`✅ DCN Concluída & Encerrada com sucesso!\n\nE-mail de encerramento enviado para os destinatários com o anexo "${filename}"!\n\n${result.detail || ''}`);
            } else if (result.success) {
              window.alert(`ℹ️ DCN Concluída & Encerrada!\n\nNotificação de encerramento: ${result.detail || result.error || 'Registrado no sistema'}`);
            }
          }).catch(err => {
            console.warn('[DCNContext] Falha ao enviar e-mail de encerramento:', err);
            window.alert(`⚠️ DCN Encerrada, porém ocorreu uma falha no envio do e-mail: ${err.message}`);
          });
        }
      }
    }
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

    api.updateDCN(
      id,
      { status: targetStatus },
      `Retorno de Etapa: ${targetStatus}. Motivo: ${reason}`,
      currentEngineer.name,
      'Engenharia de Processos'
    ).catch(err => {
      console.warn('[DCNContext] Falha ao persistir retorno de etapa no PostgreSQL:', err);
    });
  };

  // Update Material Status
  const updateMaterialStatus = (dcnId: string, materialId: string, newStatus: MaterialItem['status']) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const today = timestamp.split(' ')[0];
    let newDueDateForDcn: string | null = null;

    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId) return dcn;

      const updatedMaterials = dcn.materials.map(m => {
        if (m.id !== materialId) return m;
        return {
          ...m,
          status: newStatus,
          arrivalDate: (newStatus === 'RECEBIDO_ESTOQUE' || newStatus === 'INSPECIONADO_APROVADO') && !m.arrivalDate 
            ? today 
            : m.arrivalDate
        };
      });

      // Check if all materials are now ready
      const allReady = updatedMaterials.length > 0 && updatedMaterials.every(
        m => m.status === 'RECEBIDO_ESTOQUE' || m.status === 'INSPECIONADO_APROVADO'
      );

      // Se a DCN está no status AGUARDANDO_MATERIAL e agora todos os materiais chegaram:
      // O SLA passa para 3 dias úteis após o recebimento
      const shouldRecalculateSLA = dcn.status === 'AGUARDANDO_MATERIAL' && allReady;
      let calculatedDueDate = dcn.dueDate;
      if (shouldRecalculateSLA) {
        calculatedDueDate = addBusinessDays(today, 3);
        newDueDateForDcn = calculatedDueDate;
      }

      const auditEntries = [
        {
          id: `aud-${Date.now()}-mat`,
          timestamp,
          user: currentEngineer.name,
          userRole: 'Controle de Materiais',
          action: `Status de Material Atualizado (${newStatus})`,
          comment: allReady ? 'Todos os materiais requeridos foram recebidos/aprovados em estoque.' : undefined
        }
      ];

      if (shouldRecalculateSLA) {
        auditEntries.push({
          id: `aud-${Date.now()}-sla`,
          timestamp,
          user: currentEngineer.name,
          userRole: 'Engenharia de Processos',
          action: 'SLA Atualizado: 3 Dias Úteis pós-materiais',
          comment: `Todos os materiais foram recebidos em estoque em ${formatDate(today)}. O prazo limite (SLA) foi recalculado para 3 dias úteis: ${formatDate(calculatedDueDate)}.`
        });
      }

      return {
        ...dcn,
        dueDate: calculatedDueDate,
        materials: updatedMaterials,
        auditTrail: [...dcn.auditTrail, ...auditEntries]
      };
    }));

    api.updateMaterial(dcnId, materialId, { 
      status: newStatus,
      arrivalDate: (newStatus === 'RECEBIDO_ESTOQUE' || newStatus === 'INSPECIONADO_APROVADO') ? today : undefined
    }).catch(() => {});

    if (newDueDateForDcn) {
      api.updateDCN(
        dcnId,
        { dueDate: newDueDateForDcn },
        `SLA recalculado automaticamente para 3 dias úteis após o recebimento dos materiais (${formatDate(newDueDateForDcn)}).`
      ).catch(() => {});
    }
  };

  // Update Material Expected Date (ETA)
  const updateMaterialExpectedDate = (dcnId: string, materialId: string, expectedDate: string) => {
    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId) return dcn;
      return {
        ...dcn,
        materials: dcn.materials.map(m => m.id === materialId ? { ...m, expectedDate } : m)
      };
    }));
    api.updateMaterial(dcnId, materialId, { expectedDate }).catch(() => {});
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

    api.addMaterial(dcnId, item).then(saved => {
      if (saved && saved.id) {
        setDcns(prev => prev.map(dcn => {
          if (dcn.id !== dcnId) return dcn;
          return {
            ...dcn,
            materials: dcn.materials.map(m => m.id === newItem.id ? saved : m)
          };
        }));
      }
    }).catch(err => {
      console.warn('[DCNContext] Falha ao persistir material no PostgreSQL:', err);
    });
  };

  // Update Training Details
  const updateTrainingDetails = (dcnId: string, trainingUpdates: Partial<TrainingRecord>) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    let auditAction = 'Plano de treinamento atualizado';
    let auditComment = 'Atualização nos dados de capacitação';

    if (trainingUpdates.scheduledDate) {
      auditAction = 'Treinamento Agendado';
      auditComment = `Treinamento agendado para ${trainingUpdates.scheduledDate}`;
    }

    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId) return dcn;
      const current = dcn.training || {
        id: `trn-${Date.now()}`,
        instructor: currentEngineer.name,
        targetAudience: 'Líderes, Técnicos de Reparo e Inspetores de CQ.',
        department: dcn.area,
        estimatedHours: 30,
        totalPlanned: 10,
        totalTrained: 0,
        status: 'PENDENTE' as const,
        trainingTopics: ['Instrução de Trabalho revisada', 'Parâmetros técnicos e tolerâncias de qualidade'],
        attendeesList: []
      };

      const updatedStatus = trainingUpdates.status || (
        current.status === 'CONCLUIDO' 
          ? 'CONCLUIDO' 
          : (trainingUpdates.scheduledDate ? 'AGENDADO' : current.status)
      );

      const updatedTraining: TrainingRecord = {
        ...current,
        ...trainingUpdates,
        status: updatedStatus
      };

      const newAuditTrail = [
        ...dcn.auditTrail,
        {
          id: `aud-${Date.now()}-train`,
          timestamp,
          user: currentEngineer.name,
          userRole: currentEngineer.role,
          action: auditAction,
          comment: auditComment
        }
      ];

      return {
        ...dcn,
        needsTraining: true,
        training: updatedTraining,
        auditTrail: newAuditTrail
      };
    }));

    api.updateTraining(dcnId, trainingUpdates).catch(() => {});
  };

  // Mark Training Completed
  const markTrainingCompleted = (dcnId: string, evidenceDoc?: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const today = timestamp.split(' ')[0];

    const targetDCN = dcns.find(d => d.id === dcnId);
    if (!targetDCN || !targetDCN.training) return;

    if (!targetDCN.training.attendeesList || targetDCN.training.attendeesList.length === 0) {
      window.alert(
        'Adicione pelo menos um colaborador à Ata de Treinamento antes de concluir o treinamento.'
      );
      return;
    }

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

    api.updateTraining(dcnId, {
      status: 'CONCLUIDO',
      completionDate: today,
      evidenceDoc: updatedTraining.evidenceDoc,
      attendeesList: updatedAttendees,
      totalTrained: updatedTraining.totalTrained,
      totalPlanned: updatedTraining.totalPlanned
    }).catch(err => {
      console.warn('[DCNContext] Falha ao persistir conclusão de treinamento no PostgreSQL:', err);
    });

    // 2. Synchronize all associated technicians
    setTechnicians(prev => prev.map(t => {
      const isAttendee = updatedAttendees.some(
        a => a.technicianId === t.id || a.name === t.name || (t.badge && a.badge === t.badge)
      );
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
    let targetNewCompleted = false;

    setDcns(prev => prev.map(dcn => {
      if (dcn.id !== dcnId) return dcn;
      const updatedChecklist = dcn.implementationChecklist.map(chk => {
        if (chk.id !== checklistId) return chk;
        const newCompleted = !chk.completed;
        targetNewCompleted = newCompleted;
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

    api.updateChecklistItem(dcnId, checklistId, {
      completed: targetNewCompleted,
      completedAt: targetNewCompleted ? timestamp : undefined
    }).catch(err => {
      console.warn('[DCNContext] Falha ao persistir toggle de checklist no PostgreSQL:', err);
    });
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

    api.addChecklistItem(dcnId, title, mandatory, currentEngineer.name).then(saved => {
      if (saved && saved.id) {
        setDcns(prev => prev.map(dcn => {
          if (dcn.id !== dcnId) return dcn;
          return {
            ...dcn,
            implementationChecklist: dcn.implementationChecklist.map(c => c.id === newItem.id ? saved : c)
          };
        }));
      }
    }).catch(err => {
      console.warn('[DCNContext] Falha ao persistir item de checklist no PostgreSQL:', err);
    });
  };

  // Upload Attachment File to MinIO & State
  const uploadAttachmentFile = async (
    dcnId: string,
    file: File,
    category: DCNAttachment['category'] = 'DOCUMENTO_COMPLEMENTAR'
  ): Promise<DCNAttachment> => {
    // Converter arquivo para base64 para garantir suporte offline e anexo em e-mail
    let fileBase64: string | undefined = undefined;
    try {
      fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch {}

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let type: DCNAttachment['type'] = 'DOC';
    if (file.type.includes('pdf') || ext === 'pdf') type = 'PDF';
    else if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) type = 'IMG';
    else if (file.type.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext)) type = 'VIDEO';
    else if (['xls', 'xlsx', 'csv'].includes(ext)) type = 'SPREADSHEET';

    try {
      const savedAttachment = await api.uploadAttachment(dcnId, file, category, currentEngineer.name);
      const enrichedAttachment: DCNAttachment = {
        ...savedAttachment,
        base64: fileBase64
      };
      setDcns(prev => prev.map(dcn => {
        if (dcn.id !== dcnId) return dcn;
        return {
          ...dcn,
          attachments: [enrichedAttachment, ...(dcn.attachments || []).filter(a => a.id !== enrichedAttachment.id)]
        };
      }));
      return enrichedAttachment;
    } catch (error) {
      console.warn('[DCNContext] Falha no upload MinIO via API, usando fallback local:', error);

      const fallbackAttachment: DCNAttachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        type,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        category,
        uploadedAt: new Date().toISOString().split('T')[0],
        uploadedBy: currentEngineer.name,
        url: URL.createObjectURL(file),
        base64: fileBase64
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
        updateMaterialExpectedDate,
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
