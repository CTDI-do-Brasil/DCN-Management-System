import React, { useState, useRef } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Calendar,
  AlertTriangle, 
  FileText, 
  Boxes, 
  GraduationCap, 
  ShieldCheck, 
  ListChecks, 
  Paperclip, 
  History, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Upload, 
  Download, 
  Check, 
  Trash2, 
  FileCode, 
  Image as ImageIcon,
  ExternalLink,
  Printer,
  Sparkles,
  Info,
  Users,
  UserPlus,
  UserCheck,
  Search,
  Video,
  Eye,
  Loader2,
  Edit3,
  Mail
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { useAuth } from '../context/AuthContext';
import { DCN, DCNStatus, MaterialItem, MaterialStatus, DCNAttachment } from '../types';
import { STATUS_CONFIG, PRIORITY_CONFIG, MATERIAL_STATUS_CONFIG, formatDate, isOverdue, getDaysRemaining, isWaitingMaterials } from '../utils/helpers';
import { api } from '../services/api';
import { NewDCNModal } from './NewDCNModal';

interface DCNDetailModalProps {
  dcn: DCN;
  onClose: () => void;
  onOpenAuditReport: (dcnId: string) => void;
}

export const DCNDetailModal: React.FC<DCNDetailModalProps> = ({ dcn, onClose, onOpenAuditReport }) => {
  const { 
    advanceDCNStatus, 
    revertDCNStatus, 
    deleteDCN,
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
    currentEngineer,
    technicians,
    assignTechniciansToDCN,
    removeTechnicianFromDCN,
    signTechnicianTraining
  } = useDCN();

  const { canDeleteDCN, canEditDCN, canAccessAudit, isOperator, isAdmin } = useAuth();


  const [activeTab, setActiveTab] = useState<'geral' | 'materiais' | 'treinamento' | 'implementacao' | 'anexos' | 'auditoria'>('geral');
  const [isEditing, setIsEditing] = useState(false);
  const [newMaterialCode, setNewMaterialCode] = useState('');
  const [newMaterialDesc, setNewMaterialDesc] = useState('');
  const [newMaterialExpectedDate, setNewMaterialExpectedDate] = useState('');
  const [newMaterialQty, setNewMaterialQty] = useState(1);
  const [newMaterialSupplier, setNewMaterialSupplier] = useState('');
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  const [newChecklistText, setNewChecklistText] = useState('');
  const [showAddChecklist, setShowAddChecklist] = useState(false);

  // Upload MinIO States
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileCategory, setFileCategory] = useState<DCNAttachment['category']>('REGISTRO_TREINAMENTO');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<DCNAttachment | null>(null);
  const [showAddAttachment, setShowAddAttachment] = useState(false);

  const [showTechPickerModal, setShowTechPickerModal] = useState(false);
  const [selectedTechIdsToAdd, setSelectedTechIdsToAdd] = useState<string[]>([]);
  const [techSearch, setTechSearch] = useState('');
  const [techDeptFilter, setTechDeptFilter] = useState('ALL');

  const [revertModalOpen, setRevertModalOpen] = useState(false);
  const [revertReason, setRevertReason] = useState('');
  const [revertTarget, setRevertTarget] = useState<DCNStatus>('RECEBIDA');

  const [scheduledDateInput, setScheduledDateInput] = useState(dcn.training?.scheduledDate || '');
  const [dateSaveSuccess, setDateSaveSuccess] = useState(false);

  const handleSaveScheduledDate = (newDate: string) => {
    setScheduledDateInput(newDate);
    updateTrainingDetails(dcn.id, {
      scheduledDate: newDate || undefined,
      status: dcn.training?.status === 'CONCLUIDO' ? 'CONCLUIDO' : (newDate ? 'AGENDADO' : 'PENDENTE')
    });
    setDateSaveSuccess(true);
    setTimeout(() => setDateSaveSuccess(false), 2000);
  };

  const [isSendingClosureEmail, setIsSendingClosureEmail] = useState(false);
  const closureFileInputRef = useRef<HTMLInputElement | null>(null);

  const executeSendWithAttachment = async (base64: string, filename: string) => {
    setIsSendingClosureEmail(true);
    try {
      const result = await api.notifyDCNClosure(
        dcn.id,
        currentEngineer.name,
        dcn,
        {
          base64,
          filename,
          contentType: filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'
        }
      );

      if (result.smtpSent) {
        alert(`✅ E-mail de encerramento enviado com sucesso para os destinatários com o anexo "${filename}"!\n\n${result.detail || ''}`);
      } else {
        alert(`ℹ️ Notificação processada: ${result.detail || result.error || 'Registrado no sistema'}`);
      }
    } catch (err: any) {
      alert(`❌ Erro ao enviar e-mail de encerramento: ${err.message}`);
    } finally {
      setIsSendingClosureEmail(false);
    }
  };

  const handleClosureFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = '';

    setIsSendingClosureEmail(true);
    try {
      // 1. Converter arquivo selecionado para Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 2. Salvar também nos anexos da DCN (com base64 garantido)
      uploadAttachmentFile(dcn.id, file, 'REGISTRO_TREINAMENTO');

      // 3. Disparar e-mail com o anexo
      await executeSendWithAttachment(base64, file.name);
    } catch (err: any) {
      alert(`❌ Erro ao processar anexo: ${err.message}`);
      setIsSendingClosureEmail(false);
    }
  };

  const handleSendClosureEmail = async () => {
    // Localizar anexo de treinamento ou qualquer PDF na DCN
    const trainingAtt = (dcn.attachments || []).find(
      a => a.category === 'REGISTRO_TREINAMENTO'
    ) || (dcn.attachments || []).find(
      a => a.type === 'PDF' || (a.name && a.name.toLowerCase().endsWith('.pdf'))
    ) || (dcn.attachments && dcn.attachments.length > 0 ? dcn.attachments[0] : null);

    let base64 = trainingAtt?.base64;

    // Se já tiver base64 gravado no attachment, envia direto
    if (base64 && base64.length > 50) {
      return executeSendWithAttachment(base64, trainingAtt?.name || 'Registro_Treinamento.pdf');
    }

    // Se tiver URL válida, tentar ler
    if (trainingAtt?.url) {
      try {
        const res = await fetch(trainingAtt.url);
        if (res.ok) {
          const blob = await res.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          if (base64 && base64.length > 50) {
            return executeSendWithAttachment(base64, trainingAtt.name || 'Registro_Treinamento.pdf');
          }
        }
      } catch (e) {
        console.warn('URL indisponível para leitura de anexo:', e);
      }
    }

    // Se não há bytes na memória ou arquivo local (ex: após refresh F5), abre o seletor nativo diretamente
    // SEM chamar alert() antes para não quebrar a permissão de clique do navegador
    closureFileInputRef.current?.click();
  };

  const statusConfig = STATUS_CONFIG[dcn.status];
  const priorityConfig = PRIORITY_CONFIG[dcn.priority];
  const waitingMat = isWaitingMaterials(dcn);
  const overdue = isOverdue(dcn.dueDate, dcn.status, waitingMat);

  // Determina se a etapa de materiais deve ser exibida no fluxo
  const showMaterialStep = Boolean(
    dcn.needsMaterial || 
    (dcn.materials && dcn.materials.length > 0) || 
    dcn.status === 'AGUARDANDO_MATERIAL'
  );

  // Workflow steps list
  const workflowSteps: { status: DCNStatus; label: string; stepNumber: number }[] = [
    { status: 'RECEBIDA', label: '1. Recebimento', stepNumber: 1 },
    { status: 'EM_AVALIACAO', label: '2. Avaliação Técnica', stepNumber: 2 },
    ...(showMaterialStep ? [{ status: 'AGUARDANDO_MATERIAL' as DCNStatus, label: '3. Materiais', stepNumber: 3 }] : []),
    { status: 'PRONTA_IMPLEMENTACAO', label: '4. Aguardando Treinamento', stepNumber: 4 },
    { status: 'IMPLEMENTADA', label: '5. Implementação', stepNumber: 5 },
    { status: 'ENCERRADA', label: '6. Encerramento', stepNumber: 6 }
  ];

  const currentStepNumber = statusConfig.step;

  // Verification checks for workflow transitions
  const allMaterialsReady = !dcn.needsMaterial || (
    dcn.materials.length > 0 &&
    dcn.materials.every(m => m.status === 'RECEBIDO_ESTOQUE')
  );
  const isBlockedByMaterials = dcn.status === 'AGUARDANDO_MATERIAL' && !allMaterialsReady;

  const hasScheduledTraining = Boolean(dcn.training?.scheduledDate && dcn.training.scheduledDate.trim());
  const isBlockedByTrainingSchedule = dcn.status === 'PRONTA_IMPLEMENTACAO' && !hasScheduledTraining;

  const trainingAttendees = dcn.training?.attendeesList || [];
  const hasTrainingAttendees = trainingAttendees.length > 0;
  const isBlockedByTrainingAttendees = dcn.status === 'IMPLEMENTADA' && !hasTrainingAttendees;

  const hasTrainingPdf = (dcn.attachments || []).some(
    att =>
      att.category === 'REGISTRO_TREINAMENTO' &&
      (att.type === 'PDF' || att.name.toLowerCase().endsWith('.pdf'))
  );
  const isBlockedByTrainingPdf = dcn.status === 'IMPLEMENTADA' && !hasTrainingPdf;
  const isBlockedToAdvance =
    isBlockedByMaterials ||
    isBlockedByTrainingSchedule ||
    isBlockedByTrainingAttendees ||
    isBlockedByTrainingPdf;

  const allChecklistCompleted = dcn.implementationChecklist.filter(c => c.mandatory).every(c => c.completed);
  const trainingCompleted = !dcn.needsTraining || dcn.training?.status === 'CONCLUIDO';

  // Handle Material Addition
  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialCode || !newMaterialDesc) return;
    addMaterialItem(dcn.id, {
      code: newMaterialCode,
      description: newMaterialDesc,
      quantity: Number(newMaterialQty) || 1,
      unit: 'UN',
      supplier: newMaterialSupplier || '',
      expectedDate: newMaterialExpectedDate || '',
      status: 'PEDIDO_EMITIDO'
    });
    setNewMaterialCode('');
    setNewMaterialDesc('');
    setNewMaterialExpectedDate('');
    setNewMaterialSupplier('');
    setShowAddMaterial(false);
  };

  // Handle Checklist Addition
  const handleCreateChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText) return;
    addChecklistItem(dcn.id, newChecklistText, true);
    setNewChecklistText('');
    setShowAddChecklist(false);
  };

  // Handle Attachment Upload (MinIO)
  const handleUploadAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      await uploadAttachmentFile(dcn.id, selectedFile, fileCategory);
      setSelectedFile(null);
      setShowAddAttachment(false);
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao enviar anexo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      {/* Input nativo oculto para seleção de PDF de evidência de treinamento para o encerramento */}
      <input
        ref={closureFileInputRef}
        type="file"
        accept="application/pdf,image/*,.doc,.docx"
        onChange={handleClosureFileSelected}
        className="hidden"
      />
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-black tracking-wider bg-indigo-500 text-white px-2.5 py-0.5 rounded shadow-xs">
                {dcn.dcnNumber}
              </span>
              {dcn.revision && (
                <span className="font-mono text-xs font-bold bg-slate-800 text-indigo-300 border border-slate-700 px-2 py-0.5 rounded">
                  Rev. {dcn.revision}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${priorityConfig.badgeBg}`}>
                Prioridade {priorityConfig.label}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
              {dcn.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span>Área: <strong className="text-white">{dcn.area}</strong></span>
              <span>Responsável: <strong className="text-white">{dcn.responsible}</strong></span>
              <span>Recebimento: <strong className="text-white">{formatDate(dcn.receivedDate)}</strong></span>
              <span>Prazo Final: <strong className={`${waitingMat ? 'text-blue-300 font-semibold' : overdue ? 'text-rose-400 font-bold' : 'text-white'}`}>{waitingMat ? 'Aguardando Materiais' : formatDate(dcn.dueDate)}</strong></span>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-start">
            {canAccessAudit && (
              <button
                onClick={() => onOpenAuditReport(dcn.id)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-xs"
                title="Gerar Dossiê de Auditoria"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                Imprimir Dossiê
              </button>
            )}

            {canEditDCN && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-xs cursor-pointer"
                title="Editar DCN"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                Editar DCN
              </button>
            )}

            {dcn.status === 'ENCERRADA' && (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleSendClosureEmail}
                  disabled={isSendingClosureEmail}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  title="Disparar e-mail de encerramento com o anexo de evidência aos destinatários"
                >
                  <Mail className="w-3.5 h-3.5 mr-1.5 text-cyan-300" />
                  {isSendingClosureEmail ? 'Disparando...' : 'Reenviar E-mail com Evidência'}
                </button>
                <button
                  type="button"
                  onClick={() => closureFileInputRef.current?.click()}
                  disabled={isSendingClosureEmail}
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/60 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  title="Escolher arquivo PDF da evidência física no seu computador e reenviar e-mail com o anexo"
                >
                  <Upload className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                  Selecionar PDF & Enviar
                </button>
              </div>
            )}

            {/* Ação Crítica RBAC: Exclusão restrita estritamente a ADMIN */}
            {canDeleteDCN && (
              <button
                onClick={() => {
                  if (window.confirm(`[ADMIN] Deseja realmente excluir permanentemente a DCN ${dcn.dcnNumber}?\nEsta ação apagará todos os materiais, treinamentos e checklists associados.`)) {
                    deleteDCN(dcn.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/80 transition-colors shadow-xs"
                title="Excluir DCN (Exclusivo Administrador)"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-300" />
                Excluir DCN
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------
            VISUAL STEPPER: O FLUXO DE ETAPAS DA DCN
            ---------------------------------------------------- */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3">
          <div className={`grid grid-cols-2 sm:grid-cols-3 ${workflowSteps.length === 5 ? 'md:grid-cols-5' : 'md:grid-cols-6'} gap-2`}>
            {workflowSteps.map((step, idx) => {
              const isPast = step.stepNumber < currentStepNumber;
              const isCurrent = step.stepNumber === currentStepNumber;
              const isFuture = step.stepNumber > currentStepNumber;

              return (
                <div 
                  key={step.status}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    isCurrent 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                      : isPast 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1 text-[11px] font-bold">
                    {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {isCurrent && <span className="w-2 h-2 rounded-full bg-white animate-ping mr-1"></span>}
                    <span>{step.label}</span>
                  </div>
                  <p className={`text-[10px] mt-0.5 ${
                    isCurrent ? 'text-indigo-100' : isPast ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {isPast ? 'Concluída' : isCurrent ? 'Em Andamento' : 'Aguardando'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ----------------------------------------------------
            BARRA DE AÇÃO GUIADA (AVANÇAR / RETORNAR ETAPA)
            ---------------------------------------------------- */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Status Atual:</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.badgeBorder}`}>
              <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor} mr-1.5`}></span>
              {statusConfig.label}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {canEditDCN ? (
              <>
                {dcn.status !== 'RECEBIDA' && (
                  <button
                    onClick={() => setRevertModalOpen(true)}
                    className="px-3 py-1 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Retornar Etapa
                  </button>
                )}

                {dcn.status !== 'ENCERRADA' && (
                  <div className="flex items-center space-x-2">
                    {isBlockedByMaterials && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('materiais')}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                        title="Clique para ir até a aba de Materiais"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600 shrink-0" />
                        Exige todos os materiais "Recebido em Estoque"
                      </button>
                    )}
                    {isBlockedByTrainingSchedule && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('treinamento')}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                        title="Clique para ir até a aba Treinamento e agendar a data"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600 shrink-0" />
                        Exige Data de Treinamento Agendada
                      </button>
                    )}
                    {isBlockedByTrainingAttendees && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('treinamento')}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                        title="Clique para ir até a aba Matriz de Treinamento e assinar a ata"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600 shrink-0" />
                        Exige Colaboradores Assinados na Ata de Treinamento
                      </button>
                    )}
                    {isBlockedByTrainingPdf && (
                      <button
                        type="button"
                        onClick={() => {
                          setFileCategory('REGISTRO_TREINAMENTO');
                          setShowAddAttachment(true);
                          setActiveTab('anexos');
                        }}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                        title="Clique para anexar o PDF com o registro de treinamento"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600 shrink-0" />
                        Exige PDF de Registro de Treinamento anexado
                      </button>
                    )}
                    <button
                      onClick={() => advanceDCNStatus(dcn.id)}
                      disabled={isBlockedToAdvance}
                      title={
                        isBlockedByMaterials
                          ? 'Todos os materiais precisam estar com status "Recebido em Estoque" para avançar de etapa'
                          : isBlockedByTrainingSchedule
                          ? 'É necessário definir a data em que o treinamento está agendado na aba Treinamento antes de avançar para a etapa "5. Implementação"'
                          : isBlockedByTrainingAttendees
                          ? 'É necessário que haja Colaboradores Assinados na Ata de Treinamento em Matriz de Treinamento'
                          : isBlockedByTrainingPdf
                          ? 'É necessário anexar o PDF com o registro de treinamento antes de avançar para o Encerramento'
                          : 'Avançar para Próxima Etapa'
                      }
                      className={`px-4 py-1 text-xs font-bold rounded-md text-white shadow-sm transition-colors flex items-center ${
                        isBlockedToAdvance
                          ? 'bg-slate-400 cursor-not-allowed opacity-70'
                          : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                      }`}
                    >
                      <span>Avançar para Próxima Etapa</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <span className="inline-flex items-center text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                Modo Consulta (Apenas Engenharia / Admin podem avançar status)
              </span>
            )}

            {dcn.status === 'ENCERRADA' && (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                  DCN Concluída & Encerrada
                </span>
                <button
                  type="button"
                  onClick={handleSendClosureEmail}
                  disabled={isSendingClosureEmail}
                  className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm cursor-pointer transition-colors disabled:opacity-50"
                  title="Enviar ou reenviar e-mail formal de encerramento com o anexo de treinamento aos destinatários"
                >
                  <Mail className="w-3.5 h-3.5 mr-1.5" />
                  {isSendingClosureEmail ? 'Disparando...' : 'Reenviar E-mail com Evidência'}
                </button>
                <button
                  type="button"
                  onClick={() => closureFileInputRef.current?.click()}
                  disabled={isSendingClosureEmail}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                  title="Escolher arquivo PDF da evidência física no seu computador e reenviar e-mail com o anexo"
                >
                  <Upload className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  Selecionar PDF & Enviar
                </button>
              </div>
            )}
          </div>
        </div>


        {/* ----------------------------------------------------
            TAB NAVIGATION BAR
            ---------------------------------------------------- */}
        <div className="border-b border-slate-200 px-4 sm:px-6 bg-slate-50/50">
          <nav className="flex space-x-2 sm:space-x-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('geral')}
              className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center ${
                activeTab === 'geral'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              1. Visão Geral & Engenharia
            </button>

            <button
              onClick={() => setActiveTab('materiais')}
              className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center ${
                activeTab === 'materiais'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5 mr-1.5" />
              2. Materiais & Compras ({dcn.materials.length})
            </button>

            <button
              onClick={() => setActiveTab('treinamento')}
              className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center ${
                activeTab === 'treinamento'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
              3. Treinamento
              {dcn.training?.scheduledDate && dcn.training?.status !== 'CONCLUIDO' && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                  Agendado
                </span>
              )}
              {dcn.needsTraining && dcn.training?.status === 'CONCLUIDO' && (
                <span className="ml-1.5 w-2 h-2 rounded-full bg-emerald-500" title="Treinamento Concluído"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('anexos')}
              className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center ${
                activeTab === 'anexos'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5 mr-1.5" />
              4. Anexos ({dcn.attachments.length})
            </button>

            <button
              onClick={() => setActiveTab('auditoria')}
              className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center ${
                activeTab === 'auditoria'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              5. Trilha de Auditoria ({dcn.auditTrail.length})
            </button>
          </nav>
        </div>

        {/* ----------------------------------------------------
            TAB CONTENT AREA
            ---------------------------------------------------- */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: VISÃO GERAL & ENGENHARIA */}
          {activeTab === 'geral' && (
            <div className="space-y-6">
              
              {/* Descrição & Especificação Técnica (exibe apenas se preenchida) */}
              {dcn.description && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Descrição Completa da Mudança
                  </h3>
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                    {dcn.description}
                  </p>
                </div>
              )}

              {/* Grid de Metadados Principais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <p className="text-[11px] text-slate-500 font-medium">Família do(s) Produto(s)</p>
                  <p className="text-sm font-bold text-indigo-700 mt-0.5">{dcn.productFamily || '-'}</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <p className="text-[11px] text-slate-500 font-medium">Projeto</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{dcn.area}</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <p className="text-[11px] text-slate-500 font-medium">Engenheiro Responsável</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{dcn.responsible}</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <p className="text-[11px] text-slate-500 font-medium">Data de Recebimento</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{formatDate(dcn.receivedDate)}</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <p className="text-[11px] text-slate-500 font-medium">Data Limite (SLA)</p>
                  <p className={`text-sm font-bold mt-0.5 ${waitingMat ? 'text-blue-600' : overdue ? 'text-rose-600' : 'text-slate-900'}`}>
                    {waitingMat ? 'Aguardando Materiais' : `${formatDate(dcn.dueDate)} ${overdue ? '(Excedido)' : ''}`}
                  </p>
                </div>
                <div 
                  onClick={() => setActiveTab('treinamento')}
                  className="p-3 bg-white border border-slate-200 hover:border-indigo-400 rounded-lg cursor-pointer transition-colors group"
                  title="Clique para ver ou agendar na aba Treinamento"
                >
                  <p className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                    <span>Treinamento Agendado</span>
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                  </p>
                  <p className={`text-sm font-bold mt-0.5 ${dcn.training?.scheduledDate ? 'text-indigo-700' : 'text-slate-400'}`}>
                    {dcn.training?.scheduledDate ? formatDate(dcn.training.scheduledDate) : 'Não agendado'}
                  </p>
                </div>
              </div>

              {/* Informações de Encerramento (quando aplicável) */}
              {dcn.status === 'ENCERRADA' && (
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>DCN Encerrada em {formatDate(dcn.closedAt)} por {dcn.closedBy}</span>
                    </div>
                    <p className="text-xs text-emerald-800 mt-1">
                      {dcn.closureNotes || 'Documentação arquivada, treinamentos concluídos e lote piloto homologado sem desvios.'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSendClosureEmail}
                      disabled={isSendingClosureEmail}
                      className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer transition-colors disabled:opacity-50"
                      title="Disparar ou reenviar o e-mail formal de conclusão com o anexo de evidência de treinamento"
                    >
                      <Mail className="w-4 h-4 mr-1.5" />
                      {isSendingClosureEmail ? 'Disparando...' : 'Reenviar E-mail com Evidência'}
                    </button>
                    <button
                      type="button"
                      onClick={() => closureFileInputRef.current?.click()}
                      disabled={isSendingClosureEmail}
                      className="inline-flex items-center px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm cursor-pointer transition-colors disabled:opacity-50"
                      title="Escolher arquivo PDF da evidência física no seu computador e reenviar e-mail com o anexo"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Selecionar PDF & Enviar
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: MATERIAIS & COMPRAS */}
          {activeTab === 'materiais' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Controle de Materiais & Fixtures
                  </h3>
                  <p className="text-xs text-slate-500">
                    {dcn.needsMaterial 
                      ? 'Esta DCN necessita de materiais novos ou modificados para liberação da linha.' 
                      : 'Esta DCN NÃO requer materiais físicos (alteração de software/processo).'}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowAddMaterial(!showAddMaterial)}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar Item
                  </button>
                </div>
              </div>

              {/* Formulário de Adicionar Material */}
              {showAddMaterial && (
                <form onSubmit={handleCreateMaterial} className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-200 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-900">Novo Item de Material Requerido</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Código do Item (Part Number)</label>
                      <input
                        type="text"
                        placeholder="Ex: PAR-M4X12-ZN"
                        value={newMaterialCode}
                        onChange={e => setNewMaterialCode(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Descrição</label>
                      <input
                        type="text"
                        placeholder="Ex: Parafuso Philips M4x12mm"
                        value={newMaterialDesc}
                        onChange={e => setNewMaterialDesc(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Data Estimada (ETA) (Opcional)</label>
                      <input
                        type="date"
                        value={newMaterialExpectedDate}
                        onChange={e => setNewMaterialExpectedDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMaterial(false)}
                      className="px-3 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700"
                    >
                      Salvar Material
                    </button>
                  </div>
                </form>
              )}

              {/* Feedback quando todos os materiais estão em estoque */}
              {allMaterialsReady && dcn.materials.length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Todos os materiais disponíveis em estoque!</strong> SLA recalculado para 3 dias úteis pós-recebimento: <strong>{formatDate(dcn.dueDate)}</strong>.
                    </span>
                  </div>
                </div>
              )}

              {/* Tabela de Materiais */}
              {dcn.materials.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  <Boxes className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">Nenhum material físico cadastrado para esta DCN.</p>
                  <p className="text-slate-400 mt-0.5">Se houver necessidade de peças, utilize o botão "Adicionar Item" acima.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Código / Descrição</th>
                        <th className="py-2.5 px-3 text-left">Qtd / Fornecedor</th>
                        <th className="py-2.5 px-3 text-left">Data Prevista / Chegada</th>
                        <th className="py-2.5 px-3 text-left">Status do Material</th>
                        <th className="py-2.5 px-3 text-right">Atualizar Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dcn.materials.map(item => {
                        const matConfig = MATERIAL_STATUS_CONFIG[item.status];
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-3">
                              <p className="font-mono font-bold text-indigo-700">{item.code}</p>
                              <p className="text-slate-700">{item.description}</p>
                              {item.notes && <p className="text-[10px] text-slate-500 mt-0.5 italic">{item.notes}</p>}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <p className="font-bold text-slate-900">{item.quantity} {item.unit}</p>
                              <p className="text-slate-500">{item.supplier}</p>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex flex-col space-y-1">
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-[10px] text-slate-500 font-semibold">ETA:</span>
                                  <input
                                    type="date"
                                    value={item.expectedDate || ''}
                                    onChange={(e) => updateMaterialExpectedDate(dcn.id, item.id, e.target.value)}
                                    className="text-xs border border-slate-300 rounded px-1.5 py-0.5 bg-white text-slate-800 focus:border-indigo-500"
                                    title="Informar ou alterar Data Estimada (ETA)"
                                  />
                                </div>
                                {!item.expectedDate && (
                                  <span className="text-[10px] text-amber-600 font-medium">Sem data definida</span>
                                )}
                                {item.arrivalDate && (
                                  <p className="text-emerald-700 font-semibold text-[11px]">Entregue: {formatDate(item.arrivalDate)}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${matConfig.badgeClass}`}>
                                {matConfig.label}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <select
                                value={item.status}
                                onChange={(e) => updateMaterialStatus(dcn.id, item.id, e.target.value as MaterialStatus)}
                                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                              >
                                <option value="PENDENTE">Pendente</option>
                                <option value="PEDIDO_EMITIDO">Solicitação Emitida</option>
                                <option value="EM_TRANSITO">Em Trânsito</option>
                                <option value="RECEBIDO_ESTOQUE">Recebido Estoque</option>
                                <option value="INSPECIONADO_APROVADO">Inspecionado & Aprovado CQ</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: TREINAMENTO & CAPACITAÇÃO */}
          {activeTab === 'treinamento' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center">
                    <GraduationCap className="w-4 h-4 mr-1.5 text-indigo-600" />
                    Treinamento dos Colaboradores Impactados
                  </h3>
                  <p className="text-xs text-slate-500">
                    Capacitação dos operadores de produção e inspetores conforme requisito ISO 9001:2015 item 8.5.6.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFileCategory('REGISTRO_TREINAMENTO');
                      setShowAddAttachment(true);
                      setActiveTab('anexos');
                    }}
                    className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md border shadow-xs cursor-pointer ${
                      hasTrainingPdf
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                        : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    {hasTrainingPdf ? 'PDF de Treinamento Anexado' : 'Anexar PDF de Treinamento'}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedTechIdsToAdd([]);
                      setShowTechPickerModal(true);
                    }}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                    Vincular Técnicos
                  </button>

                  {dcn.needsTraining && dcn.training?.status !== 'CONCLUIDO' && (
                    <button
                      onClick={() => markTrainingCompleted(dcn.id)}
                      className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-md text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Marcar Treinamento como Concluído
                    </button>
                  )}
                </div>
              </div>

              {/* CARD PRINCIPAL DE AGENDAMENTO DA DATA DE TREINAMENTO */}
              <div className="bg-gradient-to-r from-sky-50 via-indigo-50/50 to-white p-4 rounded-xl border border-sky-200 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-sky-600 text-white shadow-xs">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center">
                          Data de Agendamento do Treinamento
                          {dcn.training?.scheduledDate ? (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                              Agendado para {formatDate(dcn.training.scheduledDate)}
                            </span>
                          ) : (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
                              Não Agendado
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Informe a data em que o treinamento presencial/prático será realizado com os operadores e técnicos.
                        </p>
                        {isBlockedByTrainingSchedule && (
                          <p className="text-[11px] font-semibold text-amber-700 flex items-center mt-1">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600 shrink-0" />
                            Obrigatório definir a data para liberar o avanço para a etapa "5. Implementação".
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <label className="text-xs font-semibold text-slate-700">Data:</label>
                    <input
                      type="date"
                      value={scheduledDateInput || (dcn.training?.scheduledDate || '')}
                      onChange={e => handleSaveScheduledDate(e.target.value)}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-sky-500 shadow-xs"
                    />

                    {(scheduledDateInput || dcn.training?.scheduledDate) && (
                      <button
                        type="button"
                        onClick={() => handleSaveScheduledDate('')}
                        className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-rose-600 bg-white border border-slate-300 hover:border-rose-300 rounded-lg shadow-xs transition-colors"
                        title="Desmarcar / Limpar data agendada"
                      >
                        Limpar Data
                      </button>
                    )}

                    {dateSaveSuccess && (
                      <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md animate-fade-in">
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Salvo!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {dcn.training ? (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Ficha de Registro de Capacitação
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                      dcn.training.status === 'CONCLUIDO'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : dcn.training.scheduledDate
                        ? 'bg-sky-50 text-sky-800 border-sky-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      Status: {
                        dcn.training.status === 'CONCLUIDO' 
                          ? '100% Capacitado & Aprovado' 
                          : dcn.training.scheduledDate 
                          ? `Agendado (${formatDate(dcn.training.scheduledDate)})` 
                          : 'Pendente de Agendamento'
                      }
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                      <p className="text-slate-500 font-medium">Data Agendada</p>
                      <p className="font-bold text-indigo-700 mt-0.5">
                        {dcn.training.scheduledDate ? formatDate(dcn.training.scheduledDate) : 'Não agendada'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                      <p className="text-slate-500 font-medium">Instrutor Responsável</p>
                      <p className="font-bold text-slate-900 mt-0.5">{dcn.training.instructor || dcn.responsible}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                      <p className="text-slate-500 font-medium">Público-Alvo</p>
                      <p className="font-bold text-slate-900 mt-0.5">{dcn.training.targetAudience}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                      <p className="text-slate-500 font-medium">Carga Horária Estimada</p>
                      <p className="font-bold text-slate-900 mt-0.5">{dcn.training.estimatedHours} minutos</p>
                    </div>
                  </div>

                  {/* Tópicos Abordados */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Tópicos do Treinamento:</h4>
                    <ul className="space-y-1.5">
                      {dcn.training.trainingTopics.map((topic, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-center">
                          <Check className="w-3.5 h-3.5 text-indigo-600 mr-2 shrink-0" />
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Lista de Presença / Participantes */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-700">
                        Colaboradores Assinados na Ata de Treinamento ({dcn.training.attendeesList?.length || 0}):
                      </h4>
                      <button
                        onClick={() => {
                          setSelectedTechIdsToAdd([]);
                          setShowTechPickerModal(true);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar Colaborador
                      </button>
                    </div>

                    {dcn.training.attendeesList && dcn.training.attendeesList.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {dcn.training.attendeesList.map((att, i) => {
                          const isSigned = att.status === 'CONCLUIDO' || !!att.signedDate;
                          return (
                            <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-1.5">
                                  <p className="font-bold text-slate-900">{att.name}</p>
                                </div>
                                <p className="text-[10px] text-slate-500">{att.department}</p>
                              </div>

                              <div className="flex items-center space-x-1.5">
                                {isSigned ? (
                                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center">
                                    <Check className="w-3 h-3 mr-1" />
                                    {formatDate(att.signedDate)}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => signTechnicianTraining(dcn.id, att.technicianId || att.badge || att.name)}
                                    className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs"
                                  >
                                    Assinar
                                  </button>
                                )}

                                <button
                                  onClick={() => removeTechnicianFromDCN(dcn.id, att.technicianId || att.badge || att.name)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  title="Remover participante"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-lg">
                        Nenhum técnico associado a esta DCN. Clique em "Vincular Técnicos" acima para selecionar colaboradores cadastrados.
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs space-y-3">
                  <GraduationCap className="w-8 h-8 mx-auto text-indigo-400 mb-1" />
                  <p className="font-semibold text-slate-700 text-sm">Plano de treinamento não iniciado para esta DCN.</p>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Selecione a data no campo de agendamento acima para definir a data prevista ou clique abaixo para iniciar o plano de treinamento.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSaveScheduledDate(new Date().toISOString().split('T')[0])}
                    className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    Iniciar e Agendar Treinamento
                  </button>
                </div>
              )}

              {/* MODAL SELETOR DE TÉCNICOS */}
              {showTechPickerModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4 animate-scale-in">
                    
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            Selecionar Técnicos do Banco de Dados
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Adicionar colaboradores à ata da DCN {dcn.dcnNumber}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setShowTechPickerModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Filtros */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar técnico..."
                          value={techSearch}
                          onChange={e => setTechSearch(e.target.value)}
                          className="w-full pl-8 pr-2 py-1 text-xs border border-slate-300 rounded-md bg-white"
                        />
                      </div>
                      <div>
                        <select
                          value={techDeptFilter}
                          onChange={e => setTechDeptFilter(e.target.value)}
                          className="w-full py-1 px-2 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
                        >
                          <option value="ALL">Todos Departamentos</option>
                          <option value="Produção">Produção</option>
                          <option value="Qualidade CQ">Qualidade CQ</option>

                          <option value="Teste & Reparo">Teste & Reparo</option>
                          <option value="Manutenção & Automação">Manutenção & Automação</option>
                        </select>
                      </div>
                    </div>

                    {/* Lista com Checkboxes */}
                    <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50">
                      {technicians
                        .filter(t => {
                          const alreadyIn = dcn.training?.attendeesList?.some(
                            a => a.technicianId === t.id || a.name === t.name || (t.badge && a.badge === t.badge)
                          );
                          if (alreadyIn) return false;
                          if (techSearch) {
                            const q = techSearch.toLowerCase();
                            if (!t.name.toLowerCase().includes(q) && !(t.department?.toLowerCase().includes(q)) && !t.role.toLowerCase().includes(q)) return false;
                          }
                          if (techDeptFilter !== 'ALL' && t.department !== techDeptFilter) return false;
                          return true;
                        })
                        .map(tech => {
                          const isChecked = selectedTechIdsToAdd.includes(tech.id);
                          return (
                            <div
                              key={tech.id}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedTechIdsToAdd(prev => prev.filter(id => id !== tech.id));
                                } else {
                                  setSelectedTechIdsToAdd(prev => [...prev, tech.id]);
                                }
                              }}
                              className={`p-2 rounded border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                isChecked ? 'bg-indigo-50 border-indigo-300 text-indigo-900' : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                  <span className="font-bold text-slate-900">{tech.name}</span>
                                  {tech.department && <span className="text-[10px] text-slate-500 ml-1.5">({tech.department})</span>}
                                </div>
                              </div>
                              <span className="text-[10px] text-slate-400">{tech.role}</span>
                            </div>
                          );
                        })}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-xs text-slate-500 font-medium">
                        {selectedTechIdsToAdd.length} selecionado(s)
                      </span>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowTechPickerModal(false)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            assignTechniciansToDCN(dcn.id, selectedTechIdsToAdd);
                            setShowTechPickerModal(false);
                            setSelectedTechIdsToAdd([]);
                          }}
                          disabled={selectedTechIdsToAdd.length === 0}
                          className="px-4 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold shadow-xs"
                        >
                          Confirmar Inclusão
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: ANEXOS & DOCUMENTOS (MINIO OBJECT STORAGE) */}
          {activeTab === 'anexos' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-indigo-600" />
                    Anexos e Documentos Técnicos da DCN (MinIO Object Storage)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Armazenamento integrado para PDF oficial, desenhos técnicos, fotos de evidências e vídeos de treinamento ou processos.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {dcn.status === 'ENCERRADA' && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={handleSendClosureEmail}
                        disabled={isSendingClosureEmail}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-md text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer disabled:opacity-50"
                        title="Disparar ou reenviar o e-mail formal de conclusão com o anexo de evidência de treinamento"
                      >
                        <Mail className="w-3.5 h-3.5 mr-1" />
                        {isSendingClosureEmail ? 'Disparando...' : 'Reenviar E-mail com Evidência'}
                      </button>
                      <button
                        type="button"
                        onClick={() => closureFileInputRef.current?.click()}
                        disabled={isSendingClosureEmail}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded-md text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-xs cursor-pointer disabled:opacity-50"
                        title="Escolher arquivo PDF da evidência física no seu computador e reenviar e-mail com o anexo"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Selecionar PDF & Enviar
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (!showAddAttachment && dcn.status === 'IMPLEMENTADA' && !hasTrainingPdf) {
                        setFileCategory('REGISTRO_TREINAMENTO');
                      }
                      setShowAddAttachment(!showAddAttachment);
                    }}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    {showAddAttachment ? 'Fechar Formulário' : 'Novo Arquivo / Upload'}
                  </button>
                </div>
              </div>

              {/* Form Adicionar Anexo (MinIO) */}
              {showAddAttachment && (
                <form onSubmit={handleUploadAttachment} className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-200 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      Anexar Folha de Treinamento (PDF) & Evidências da DCN
                    </h4>
                    <span className="inline-flex items-center text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      Registro de Treinamento para Encerramento
                    </span>
                  </div>

                  {uploadError && (
                    <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Input nativo oculto */}
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    accept="application/pdf,image/*,video/*,.doc,.docx,.xls,.xlsx,.dwg,.txt"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />

                  {/* Zona de Seleção / Drag & Drop (Estilo Cadastrar Nova DCN) */}
                  <div
                    onDragOver={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingAttachment(true);
                    }}
                    onDragLeave={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingAttachment(false);
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingAttachment(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setSelectedFile(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => attachmentInputRef.current?.click()}
                    className={`p-5 border-2 border-dashed rounded-xl cursor-pointer text-center transition-all ${
                      isDraggingAttachment
                        ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
                        : 'border-slate-300 hover:border-indigo-400 bg-white/90 hover:bg-white'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Clique para selecionar a Folha de Treinamento do seu computador
                        </p>
                        <p className="text-[11px] text-slate-500">
                          ou arraste e solte o arquivo PDF da ata de treinamento aqui
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[10px] text-slate-400">
                        <span className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded border border-indigo-200">
                          Folha de Treinamento (PDF)
                        </span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">PDF Oficial</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Fotos & Vídeos</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Planilhas / Docs</span>
                      </div>
                    </div>
                  </div>

                  {/* Card do Arquivo Selecionado (igual ao Cadastrar Nova DCN) */}
                  {selectedFile && (
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-rose-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 truncate" title={selectedFile.name}>
                            {selectedFile.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                            <span>•</span>
                            <span className="text-indigo-700 font-medium">Pronto para anexar</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <select
                          value={fileCategory}
                          onChange={e => setFileCategory(e.target.value as any)}
                          className="text-[11px] font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-700 focus:outline-hidden focus:border-indigo-500"
                        >
                          <option value="REGISTRO_TREINAMENTO">Registro ou Evidência de Treinamento</option>
                          <option value="PDF_OFICIAL">PDF Oficial da DCN</option>
                          <option value="DESENHO_TECNICO">Desenho Técnico / Diagrama</option>
                          <option value="FOTO_EVIDENCIA">Foto ou Vídeo de Evidência</option>
                          <option value="DOCUMENTO_COMPLEMENTAR">Documento Complementar / Planilha</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Remover arquivo selecionado"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => {
                        setShowAddAttachment(false);
                        setSelectedFile(null);
                        setUploadError(null);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading || !selectedFile}
                      className="inline-flex items-center px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          Enviando Arquivo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          Confirmar Upload
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Grid de Anexos */}
              {(!dcn.attachments || dcn.attachments.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Paperclip className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Nenhum anexo enviado para esta DCN ainda.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Faça o upload de PDFs, fotos de evidência ou vídeos de instrução acima.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {dcn.attachments.map(att => (
                    <div 
                      key={att.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between space-y-2"
                    >
                      <div className="flex items-start space-x-2.5 overflow-hidden">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                          {att.type === 'PDF' && <FileText className="w-5 h-5 text-rose-600" />}
                          {att.type === 'IMG' && <ImageIcon className="w-5 h-5 text-emerald-600" />}
                          {att.type === 'VIDEO' && <Video className="w-5 h-5 text-purple-600" />}
                          {att.type === 'SPREADSHEET' && <FileCode className="w-5 h-5 text-teal-600" />}
                          {att.type === 'DOC' && <FileText className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div className="overflow-hidden min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate" title={att.name}>{att.name}</p>
                          <p className="text-[10px] text-slate-400">{att.size} • {formatDate(att.uploadedAt)}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-block text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded truncate">
                              {att.category.replace(/_/g, ' ')}
                            </span>
                            {att.objectKey && (
                              <span className="inline-block text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">
                                MinIO
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-1 pt-2 border-t border-slate-100">
                        {/* Botão de Visualização / Player */}
                        <button
                          onClick={() => setPreviewAttachment(att)}
                          className="p-1.5 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          title="Visualizar / Reproduzir"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão de Download Direto */}
                        <a
                          href={att.url ? `${att.url}?download=true` : api.getAttachmentFileUrl(att.id, true)}
                          download={att.name}
                          className="p-1.5 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 inline-flex items-center"
                          title="Baixar Arquivo"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        {/* Botão de Excluir */}
                        <button
                          onClick={() => {
                            if (confirm(`Deseja remover o anexo "${att.name}"?`)) {
                              removeAttachment(dcn.id, att.id);
                            }
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Remover anexo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 6: TRILHA DE AUDITORIA (AUDIT TRAIL ISO 9001) */}
          {activeTab === 'auditoria' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Registro Imutável de Auditoria (ISO 9001 / IATF 16949)</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Todas as alterações de status, aprovações técnicas e recebimentos de materiais são registradas automaticamente com carimbo temporal.
                </p>
              </div>

              <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {dcn.auditTrail.map((log, idx) => (
                  <div key={log.id} className="relative space-y-1">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white"></span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Responsável: <strong>{log.user}</strong> ({log.userRole})
                    </p>
                    {log.comment && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
                        "{log.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Modal de Confirmação de Retorno de Etapa */}
      {revertModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center">
              <AlertTriangle className="w-4 h-4 text-amber-600 mr-2" />
              Retornar Etapa da DCN
            </h3>
            <p className="text-xs text-slate-500">
              Selecione a etapa anterior para a qual a DCN deve retornar e justifique para fins de auditoria:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Retornar para:</label>
                <select
                  value={revertTarget}
                  onChange={e => setRevertTarget(e.target.value as DCNStatus)}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                >
                  <option value="RECEBIDA">1. Recebida</option>
                  <option value="EM_AVALIACAO">2. Em Avaliação</option>
                  {showMaterialStep && <option value="AGUARDANDO_MATERIAL">3. Aguardando Material</option>}
                  <option value="PRONTA_IMPLEMENTACAO">4. Aguardando Treinamento</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motivo / Justificativa (Obrigatório):</label>
                <textarea
                  rows={3}
                  value={revertReason}
                  onChange={e => setRevertReason(e.target.value)}
                  placeholder="Ex: Amostras reprovadas no teste de laboratório..."
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setRevertModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!revertReason) {
                    alert('Por favor preencha a justificativa do retorno.');
                    return;
                  }
                  revertDCNStatus(dcn.id, revertTarget, revertReason);
                  setRevertModalOpen(false);
                }}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded"
              >
                Confirmar Retorno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pré-visualização do Arquivo (PDF / Imagem / Vídeo do MinIO) */}
      {previewAttachment && (
        <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2 overflow-hidden">
                {previewAttachment.type === 'VIDEO' && <Video className="w-5 h-5 text-purple-400" />}
                {previewAttachment.type === 'IMG' && <ImageIcon className="w-5 h-5 text-emerald-400" />}
                {previewAttachment.type === 'PDF' && <FileText className="w-5 h-5 text-rose-400" />}
                {previewAttachment.type !== 'VIDEO' && previewAttachment.type !== 'IMG' && previewAttachment.type !== 'PDF' && (
                  <Paperclip className="w-5 h-5 text-indigo-400" />
                )}
                <span className="font-bold text-sm truncate">{previewAttachment.name}</span>
                <span className="text-xs text-slate-400">({previewAttachment.size})</span>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={previewAttachment.url ? `${previewAttachment.url}?download=true` : api.getAttachmentFileUrl(previewAttachment.id, true)}
                  download={previewAttachment.name}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar
                </a>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950/5">
              {previewAttachment.type === 'VIDEO' && (
                <video
                  src={previewAttachment.url || api.getAttachmentFileUrl(previewAttachment.id)}
                  controls
                  autoPlay
                  className="w-full max-h-[70vh] rounded-lg shadow-lg bg-black"
                >
                  Seu navegador não suporta a tag de vídeo.
                </video>
              )}

              {previewAttachment.type === 'IMG' && (
                <img
                  src={previewAttachment.url || api.getAttachmentFileUrl(previewAttachment.id)}
                  alt={previewAttachment.name}
                  className="max-h-[70vh] max-w-full rounded-lg shadow object-contain"
                />
              )}

              {previewAttachment.type === 'PDF' && (
                <iframe
                  src={previewAttachment.url || api.getAttachmentFileUrl(previewAttachment.id)}
                  title={previewAttachment.name}
                  className="w-full h-[70vh] rounded-lg border border-slate-200 bg-white"
                />
              )}

              {previewAttachment.type !== 'VIDEO' && previewAttachment.type !== 'IMG' && previewAttachment.type !== 'PDF' && (
                <div className="text-center p-8 bg-white rounded-xl border border-slate-200 shadow-sm max-w-md">
                  <FileCode className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-900">{previewAttachment.name}</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Arquivo de dados/documento ({previewAttachment.type}). Você pode baixá-lo diretamente.
                  </p>
                  <a
                    href={previewAttachment.url ? `${previewAttachment.url}?download=true` : api.getAttachmentFileUrl(previewAttachment.id, true)}
                    download={previewAttachment.name}
                    className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Baixar Arquivo Completo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de DCN */}
      {isEditing && (
        <NewDCNModal
          editingDCN={dcn}
          onClose={() => setIsEditing(false)}
          onSuccess={() => setIsEditing(false)}
        />
      )}

    </div>
  );
};
