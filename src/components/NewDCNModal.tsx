import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  PlusCircle, 
  Plus,
  Trash2,
  FileText, 
  Boxes, 
  GraduationCap, 
  Upload, 
  Paperclip, 
  CheckCircle,
  Calendar,
  AlertCircle,
  Image as ImageIcon,
  Video,
  FileCode,
  HardDrive,
  Loader2,
  Edit3
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { DCN, DCNStatus, PriorityLevel, DCNAttachment, MaterialItem } from '../types';

interface FormMaterialItem {
  id: string;
  code: string;
  description: string;
  expectedDate: string;
  quantity: number;
  unit: string;
  supplier: string;
}

interface PendingAttachment {
  id: string;
  file: File;
  name: string;
  sizeFormatted: string;
  type: DCNAttachment['type'];
  category: DCNAttachment['category'];
}

function detectFileTypeAndCategory(file: File): { type: DCNAttachment['type']; category: DCNAttachment['category'] } {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = file.type.toLowerCase();

  let type: DCNAttachment['type'] = 'DOC';
  let category: DCNAttachment['category'] = 'DOCUMENTO_COMPLEMENTAR';

  if (mime.includes('pdf') || ext === 'pdf') {
    type = 'PDF';
    category = 'PDF_OFICIAL';
  } else if (['dwg', 'dxf', 'cad', 'stp', 'step'].includes(ext)) {
    type = 'DOC';
    category = 'DESENHO_TECNICO';
  } else if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'bmp'].includes(ext)) {
    type = 'IMG';
    category = 'FOTO_EVIDENCIA';
  } else if (mime.startsWith('video/') || ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)) {
    type = 'VIDEO';
    category = 'FOTO_EVIDENCIA';
  } else if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('sheet') || mime.includes('excel')) {
    type = 'SPREADSHEET';
    category = 'DOCUMENTO_COMPLEMENTAR';
  }

  return { type, category };
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface NewDCNModalProps {
  onClose: () => void;
  onSuccess: (dcnId: string) => void;
  editingDCN?: DCN;
}

export const NewDCNModal: React.FC<NewDCNModalProps> = ({ onClose, onSuccess, editingDCN }) => {
  const { createDCN, updateDCN, uploadAttachmentFile, currentEngineer } = useDCN();
  const isEditMode = Boolean(editingDCN);

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Required Fields
  const [dcnNumber, setDcnNumber] = useState(editingDCN?.dcnNumber || '');
  const [revision, setRevision] = useState(editingDCN?.revision || '');
  const [productFamily, setProductFamily] = useState(editingDCN?.productFamily || '');
  const [title, setTitle] = useState(editingDCN?.title || '');
  const [description, setDescription] = useState(editingDCN?.description || '');
  const [area, setArea] = useState(editingDCN?.area || 'EVM');
  const [responsible, setResponsible] = useState(editingDCN?.responsible || currentEngineer.name);
  const [receivedDate, setReceivedDate] = useState(editingDCN?.receivedDate || todayStr);
  const [dueDate, setDueDate] = useState(editingDCN?.dueDate || defaultDueDate);
  const [status, setStatus] = useState<DCNStatus>(editingDCN?.status || 'RECEBIDA');
  const [priority, setPriority] = useState<PriorityLevel>(editingDCN?.priority || 'ALTA');

  // Requirements Toggles & Materials List
  const [needsMaterial, setNeedsMaterial] = useState(editingDCN?.needsMaterial || false);
  const [materialsList, setMaterialsList] = useState<FormMaterialItem[]>(() => {
    if (editingDCN?.materials && editingDCN.materials.length > 0) {
      return editingDCN.materials.map(m => ({
        id: m.id,
        code: m.code,
        description: m.description,
        expectedDate: m.expectedDate || '',
        quantity: m.quantity || 1,
        unit: m.unit || 'UN',
        supplier: m.supplier || ''
      }));
    }
    return [
      {
        id: 'mat-1',
        code: '',
        description: '',
        expectedDate: '',
        quantity: 1,
        unit: 'UN',
        supplier: ''
      }
    ];
  });

  const [needsTraining, setNeedsTraining] = useState(editingDCN?.needsTraining || false);
  const [trainingScheduledDate, setTrainingScheduledDate] = useState(editingDCN?.training?.scheduledDate || '');
  const [trainingAudience, setTrainingAudience] = useState(editingDCN?.training?.targetAudience || 'Líderes, Técnicos de Reparo e Inspetores de CQ.');

  useEffect(() => {
    if (editingDCN) {
      setDcnNumber(editingDCN.dcnNumber || '');
      setRevision(editingDCN.revision || '');
      setProductFamily(editingDCN.productFamily || '');
      setTitle(editingDCN.title || '');
      setDescription(editingDCN.description || '');
      setArea(editingDCN.area || 'EVM');
      setResponsible(editingDCN.responsible || currentEngineer.name);
      setReceivedDate(editingDCN.receivedDate || todayStr);
      setDueDate(editingDCN.dueDate || defaultDueDate);
      setStatus(editingDCN.status || 'RECEBIDA');
      setPriority(editingDCN.priority || 'ALTA');
      setNeedsMaterial(editingDCN.needsMaterial || false);
      if (editingDCN.materials && editingDCN.materials.length > 0) {
        setMaterialsList(editingDCN.materials.map(m => ({
          id: m.id,
          code: m.code,
          description: m.description,
          expectedDate: m.expectedDate || '',
          quantity: m.quantity || 1,
          unit: m.unit || 'UN',
          supplier: m.supplier || ''
        })));
      }
      setNeedsTraining(editingDCN.needsTraining || false);
      setTrainingScheduledDate(editingDCN.training?.scheduledDate || '');
      setTrainingAudience(editingDCN.training?.targetAudience || 'Líderes, Técnicos de Reparo e Inspetores de CQ.');
    }
  }, [editingDCN]);

  const handleAddMaterialRow = () => {
    setMaterialsList(prev => [
      ...prev,
      {
        id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        code: '',
        description: '',
        expectedDate: '',
        quantity: 1,
        unit: 'UN',
        supplier: ''
      }
    ]);
  };

  const handleRemoveMaterialRow = (id: string) => {
    setMaterialsList(prev => prev.filter(m => m.id !== id));
  };

  const handleUpdateMaterialRow = (id: string, field: keyof FormMaterialItem, value: any) => {
    setMaterialsList(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleToggleNeedsMaterial = (checked: boolean) => {
    setNeedsMaterial(checked);
    if (checked && materialsList.length === 0) {
      setMaterialsList([
        {
          id: `mat-${Date.now()}`,
          code: '',
          description: '',
          expectedDate: '',
          quantity: 1,
          unit: 'UN',
          supplier: ''
        }
      ]);
    }
  };


  // Attachments State & MinIO Upload Queue
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleAddFiles = (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    const newItems: PendingAttachment[] = filesArray.map(file => {
      const { type, category } = detectFileTypeAndCategory(file);
      return {
        id: `pending-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        sizeFormatted: formatFileSize(file.size),
        type,
        category
      };
    });

    setPendingFiles(prev => [...prev, ...newItems]);
  };

  const handleRemovePendingFile = (id: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpdateFileCategory = (id: string, category: DCNAttachment['category']) => {
    setPendingFiles(prev => prev.map(f => f.id === id ? { ...f, category } : f));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dcnNumber) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (isEditMode && editingDCN) {
        setSubmitProgress('Atualizando DCN no banco de dados...');
        const updatedFields: Partial<DCN> = {
          dcnNumber,
          revision: revision.trim() || undefined,
          productFamily: productFamily.trim() || undefined,
          title,
          description,
          area,
          responsible,
          receivedDate,
          dueDate,
          status,
          priority,
          needsMaterial,
          materials: needsMaterial
            ? materialsList
                .filter(m => m.code.trim().length > 0 || m.description.trim().length > 0)
                .map((m, idx) => {
                  const existing = editingDCN.materials?.find(em => em.id === m.id || em.code === m.code);
                  return {
                    id: existing?.id || m.id || `mat-${Date.now()}-${idx}`,
                    code: m.code.trim() || `ITEM-${idx + 1}`,
                    description: m.description.trim() || 'Item requisitado para alteração de processo',
                    quantity: Number(m.quantity) || 1,
                    unit: m.unit || 'UN',
                    supplier: m.supplier.trim() || '',
                    expectedDate: m.expectedDate || '',
                    arrivalDate: existing?.arrivalDate || null,
                    status: existing?.status || 'PEDIDO_EMITIDO'
                  };
                })
            : [],
          needsTraining,
          training: needsTraining
            ? {
                id: editingDCN.training?.id || `trn-${Date.now()}`,
                instructor: responsible,
                targetAudience: trainingAudience,
                department: area,
                estimatedHours: editingDCN.training?.estimatedHours || 30,
                scheduledDate: trainingScheduledDate || undefined,
                completionDate: editingDCN.training?.completionDate,
                totalPlanned: editingDCN.training?.totalPlanned || 12,
                totalTrained: editingDCN.training?.totalTrained || 0,
                status: trainingScheduledDate
                  ? (editingDCN.training?.completionDate ? 'CONCLUIDO' : 'AGENDADO')
                  : (editingDCN.training?.status || 'PENDENTE'),
                trainingTopics: editingDCN.training?.trainingTopics || [
                  'Instrução de Trabalho revisada',
                  'Parâmetros técnicos e tolerâncias de qualidade'
                ],
                attendeesList: editingDCN.training?.attendeesList || []
              }
            : undefined
        };

        await updateDCN(editingDCN.id, updatedFields, `Edição formal dos dados da DCN ${dcnNumber}.`);

        // Enviar novos anexos adicionados durante a edição
        if (pendingFiles.length > 0) {
          for (let i = 0; i < pendingFiles.length; i++) {
            const item = pendingFiles[i];
            setSubmitProgress(`Enviando "${item.name}" (${i + 1}/${pendingFiles.length}) para o MinIO...`);
            try {
              await uploadAttachmentFile(editingDCN.id, item.file, item.category);
            } catch (uploadErr) {
              console.error(`Erro ao enviar anexo ${item.name} para o MinIO:`, uploadErr);
            }
          }
        }

        onSuccess(editingDCN.id);
        return;
      }

      const materials: MaterialItem[] = needsMaterial
        ? materialsList
            .filter(m => m.code.trim().length > 0 || m.description.trim().length > 0)
            .map((m, idx) => ({
              id: `mat-${Date.now()}-${idx}`,
              code: m.code.trim() || `ITEM-${idx + 1}`,
              description: m.description.trim() || 'Item requisitado para alteração de processo',
              quantity: Number(m.quantity) || 1,
              unit: m.unit || 'UN',
              supplier: m.supplier.trim() || '',
              expectedDate: m.expectedDate || '',
              status: 'PEDIDO_EMITIDO'
            }))
        : [];

      setSubmitProgress('Registrando DCN no banco de dados...');

      const newDCN = await createDCN({
        dcnNumber,
        revision: revision.trim() || undefined,
        productFamily: productFamily.trim() || undefined,
        title,
        description,
        area,
        responsible,
        receivedDate,
        dueDate,
        status,
        priority,
        needsMaterial,
        materials,
        needsTraining,
        training: needsTraining ? {
          id: `trn-${Date.now()}`,
          instructor: responsible,
          targetAudience: trainingAudience,
          department: area,
          estimatedHours: 30,
          scheduledDate: trainingScheduledDate || undefined,
          totalPlanned: 12,
          totalTrained: 0,
          status: trainingScheduledDate ? 'AGENDADO' : 'PENDENTE',
          trainingTopics: [
            'Instrução de Trabalho revisada',
            'Parâmetros técnicos e tolerâncias de qualidade'
          ]
        } : undefined,
        implementationChecklist: [
          { id: `chk-${Date.now()}-1`, title: 'Revisão da Ficha de Instrução de Processo (FIT)', responsible, completed: false, mandatory: true },
          { id: `chk-${Date.now()}-2`, title: 'Inspeção e liberação do 1º Lote Piloto', responsible: 'Qualidade Assegurada', completed: false, mandatory: true }
        ],
        attachments: []
      });

      // Se houver arquivos selecionados, faz upload real de cada um para o MinIO
      if (pendingFiles.length > 0) {
        for (let i = 0; i < pendingFiles.length; i++) {
          const item = pendingFiles[i];
          setSubmitProgress(`Enviando "${item.name}" (${i + 1}/${pendingFiles.length}) para o MinIO...`);
          try {
            await uploadAttachmentFile(newDCN.id, item.file, item.category);
          } catch (uploadErr) {
            console.error(`Erro ao enviar anexo ${item.name} para o MinIO:`, uploadErr);
          }
        }
      }

      onSuccess(newDCN.id);
    } catch (err: any) {
      console.error(isEditMode ? 'Erro ao atualizar DCN:' : 'Erro ao cadastrar DCN:', err);
      setSubmitError(err.message || (isEditMode ? 'Falha ao atualizar a DCN. Tente novamente.' : 'Falha ao cadastrar a DCN. Tente novamente.'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              {isEditMode ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">
                  {isEditMode ? `Editar DCN — ${editingDCN?.dcnNumber || 'DCN'}` : 'Cadastrar Nova DCN'}
                </h2>
                {isEditMode && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    Modo Edição
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {isEditMode ? 'Atualização dos parâmetros cadastrais e escopo de implementação' : 'Entrada formal no fluxo de controle de alterações de engenharia'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          
          {/* Seção 1: Identificação */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-1.5"></span>
              1. Identificação da Alteração
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Número da DCN *</label>
                <input
                  type="text"
                  placeholder="Ex: DCN-XXX"
                  value={dcnNumber}
                  onChange={e => setDcnNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono font-bold text-indigo-700"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Inicial *</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as DCNStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="RECEBIDA">1. Recebida</option>
                  <option value="EM_AVALIACAO">2. Em Avaliação</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <label className="block font-semibold text-slate-700 mb-1">Título da DCN *</label>
                <input
                  type="text"
                  placeholder="Ex: Substituição de Conector e Atualização de Firmware na Linha 3"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                  required
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">Família do(s) Produto(s)</label>
                <input
                  type="text"
                  placeholder="Ex: ZD4 / ZD6, ZT411, TC21..."
                  value={productFamily}
                  onChange={e => setProductFamily(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Revisão</label>
                <input
                  type="text"
                  placeholder="Ex: R0, 01"
                  value={revision}
                  onChange={e => setRevision(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono font-bold text-indigo-700"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Projeto, Responsável & Datas */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 mr-1.5"></span>
              2. Projeto, Engenharia & Prazos (SLA)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PROJETO</label>
                <select
                  value={area}
                  onChange={e => setArea(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
                >
                  <option value="EVM">EVM</option>
                  <option value="AIT">AIT</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Engenheiro Responsável</label>
                <input
                  type="text"
                  value={responsible}
                  onChange={e => setResponsible(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data de Recebimento</label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={e => setReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data Limite (SLA)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-indigo-700"
                  required
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Necessidade de Materiais & Treinamentos */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5"></span>
              3. Verificação de Materiais & Treinamentos
            </h3>

            {/* Switch Necessita Material */}
            <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Boxes className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-800">Necessita de Novos Materiais / Peças?</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={needsMaterial}
                    onChange={e => handleToggleNeedsMaterial(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {needsMaterial && (
                <div className="space-y-3 pt-2.5 border-t border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Itens / Peças Necessárias ({materialsList.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddMaterialRow}
                      className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Adicionar Outro Material
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {materialsList.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-3 bg-white rounded-xl border border-blue-200 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-[11px]">
                          <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            Material #{index + 1}
                          </span>
                          {materialsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMaterialRow(item.id)}
                              className="inline-flex items-center text-rose-600 hover:text-rose-800 text-[11px] font-medium hover:bg-rose-50 px-2 py-0.5 rounded transition-colors cursor-pointer"
                              title="Remover este material"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remover
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                          <div className="sm:col-span-4">
                            <label className="block text-slate-600 font-semibold mb-0.5 text-[11px]">
                              Part Number / Código *
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: FIX-M5X20-INX"
                              value={item.code}
                              onChange={e => handleUpdateMaterialRow(item.id, 'code', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono font-medium focus:border-blue-500 focus:outline-hidden"
                            />
                          </div>

                          <div className="sm:col-span-5">
                            <label className="block text-slate-600 font-semibold mb-0.5 text-[11px]">
                              Descrição do Item
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Parafuso Allen Inox 316 M5"
                              value={item.description}
                              onChange={e => handleUpdateMaterialRow(item.id, 'description', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:border-blue-500 focus:outline-hidden"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="block text-slate-600 font-semibold text-[11px]">
                                Data Estimada (ETA)
                              </label>
                              {item.expectedDate ? (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMaterialRow(item.id, 'expectedDate', '')}
                                  className="text-[10px] text-rose-600 hover:underline font-medium cursor-pointer"
                                  title="Limpar data"
                                >
                                  Limpar
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400">Opcional</span>
                              )}
                            </div>
                            <input
                              type="date"
                              value={item.expectedDate}
                              onChange={e => handleUpdateMaterialRow(item.id, 'expectedDate', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-medium text-blue-700 focus:border-blue-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Switch Necessita Treinamento */}
            <div className="p-3.5 bg-sky-50/40 rounded-xl border border-sky-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="w-4 h-4 text-sky-600" />
                  <span className="font-bold text-slate-800">Necessita de Treinamento de Colaboradores?</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={needsTraining}
                    onChange={e => setNeedsTraining(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              {needsTraining && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-sky-100">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-0.5">Data Agendada (Opcional)</label>
                    <input
                      type="date"
                      value={trainingScheduledDate}
                      onChange={e => setTrainingScheduledDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-0.5">Público-Alvo Impactado</label>
                    <input
                      type="text"
                      placeholder="Ex: Líderes, Técnicos de Reparo e Inspetores de CQ."
                      value={trainingAudience}
                      onChange={e => setTrainingAudience(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Seção 4: Anexos Iniciais (Salvos no MinIO) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
                4. Anexos Iniciais (PDF, Imagens, Desenhos Técnicos)
              </h3>
              <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <HardDrive className="w-3 h-3 mr-1 text-emerald-600" />
                Armazenamento MinIO (S3)
              </span>
            </div>

            {/* Input nativo de arquivos (oculto, acionado por clique na zona ou no botão) */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,image/*,video/*,.doc,.docx,.xls,.xlsx,.csv,.dwg,.dxf,.cad,.txt,.zip"
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  handleAddFiles(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />

            {/* Zona de Seleção / Drag & Drop */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 border-2 border-dashed rounded-xl cursor-pointer text-center transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-1.5">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Clique para selecionar arquivos do seu computador
                  </p>
                  <p className="text-[11px] text-slate-500">
                    ou arraste e solte arquivos aqui
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[10px] text-slate-400">
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">PDF Oficial</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Desenhos CAD / DWG</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Fotos & Vídeos</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Planilhas / Docs</span>
                </div>
              </div>
            </div>

            {/* Anexos já vinculados à DCN (Modo Edição) */}
            {isEditMode && editingDCN?.attachments && editingDCN.attachments.length > 0 && (
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700">
                  Anexos Já Cadastrados ({editingDCN.attachments.length}):
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {editingDCN.attachments.map(att => (
                    <span
                      key={att.id}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-white border border-slate-200 text-slate-700 shadow-2xs"
                      title={att.name}
                    >
                      <Paperclip className="w-3 h-3 mr-1.5 text-indigo-500" />
                      <span className="max-w-[200px] truncate">{att.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de Arquivos Selecionados */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span>Arquivos Selecionados ({pendingFiles.length})</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline inline-flex items-center cursor-pointer"
                  >
                    <Plus className="w-3 h-3 mr-0.5" />
                    Adicionar mais arquivos
                  </button>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {pendingFiles.map(item => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          {item.type === 'PDF' && <FileText className="w-4 h-4 text-rose-600" />}
                          {item.type === 'IMG' && <ImageIcon className="w-4 h-4 text-emerald-600" />}
                          {item.type === 'VIDEO' && <Video className="w-4 h-4 text-purple-600" />}
                          {item.type === 'SPREADSHEET' && <FileCode className="w-4 h-4 text-teal-600" />}
                          {item.type === 'DOC' && <FileText className="w-4 h-4 text-blue-600" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 truncate" title={item.name}>
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{item.sizeFormatted}</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-medium">Será salvo no MinIO</span>
                          </div>
                        </div>
                      </div>

                      {/* Categoria do arquivo e Ação Remover */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <select
                          value={item.category}
                          onChange={e => handleUpdateFileCategory(item.id, e.target.value as DCNAttachment['category'])}
                          className="text-[11px] font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-700 focus:outline-hidden focus:border-indigo-500"
                        >
                          <option value="PDF_OFICIAL">PDF Oficial da DCN</option>
                          <option value="DESENHO_TECNICO">Desenho Técnico / CAD</option>
                          <option value="FOTO_EVIDENCIA">Foto ou Vídeo de Evidência</option>
                          <option value="REGISTRO_TREINAMENTO">Registro de Treinamento</option>
                          <option value="DOCUMENTO_COMPLEMENTAR">Documento Complementar</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemovePendingFile(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Remover arquivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Banner de Erro caso falhe */}
          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500">
              {submitProgress && isSubmitting && (
                <span className="flex items-center text-indigo-600 font-semibold animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  {submitProgress}
                </span>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Processando...
                  </>
                ) : isEditMode ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Salvar Alterações
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Salvar e Iniciar Fluxo da DCN
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
