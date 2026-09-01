import React, { useState } from 'react';
import { 
  X, 
  PlusCircle, 
  FileText, 
  Boxes, 
  GraduationCap, 
  Upload, 
  Paperclip, 
  CheckCircle,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { DCNStatus, PriorityLevel, DCNAttachment, MaterialItem } from '../types';

interface NewDCNModalProps {
  onClose: () => void;
  onSuccess: (dcnId: string) => void;
}

export const NewDCNModal: React.FC<NewDCNModalProps> = ({ onClose, onSuccess }) => {
  const { createDCN, currentEngineer } = useDCN();

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Required Fields
  const [dcnNumber, setDcnNumber] = useState(`DCN-BR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}-R0`);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('EVM');
  const [responsible, setResponsible] = useState(currentEngineer.name);
  const [receivedDate, setReceivedDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [status, setStatus] = useState<DCNStatus>('RECEBIDA');
  const [priority, setPriority] = useState<PriorityLevel>('ALTA');

  // Requirements Toggles
  const [needsMaterial, setNeedsMaterial] = useState(false);
  const [materialCode, setMaterialCode] = useState('');
  const [materialDesc, setMaterialDesc] = useState('');
  const [materialQty, setMaterialQty] = useState(500);
  const [materialSupplier, setMaterialSupplier] = useState('');

  const [needsTraining, setNeedsTraining] = useState(false);
  const [trainingAudience, setTrainingAudience] = useState('Operadores de Linha e Inspetores CQ');
  const [trainingHours, setTrainingHours] = useState(2);

  // Attachments
  const [attachments, setAttachments] = useState<DCNAttachment[]>([
    {
      id: 'att-init-1',
      name: 'DCN_Documento_Oficial_Aprovado.pdf',
      type: 'PDF',
      size: '2.4 MB',
      category: 'PDF_OFICIAL',
      uploadedAt: todayStr,
      uploadedBy: currentEngineer.name
    }
  ]);

  const [simulatedFileName, setSimulatedFileName] = useState('');

  const handleAddSimulatedAttachment = () => {
    if (!simulatedFileName) return;
    const isImg = simulatedFileName.endsWith('.png') || simulatedFileName.endsWith('.jpg');
    const isDoc = simulatedFileName.endsWith('.docx') || simulatedFileName.endsWith('.doc');
    const type = isImg ? 'IMG' : isDoc ? 'DOC' : 'PDF';

    setAttachments(prev => [
      ...prev,
      {
        id: `att-${Date.now()}`,
        name: simulatedFileName,
        type: type,
        size: '1.8 MB',
        category: 'DOCUMENTO_COMPLEMENTAR',
        uploadedAt: todayStr,
        uploadedBy: currentEngineer.name
      }
    ]);
    setSimulatedFileName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dcnNumber || !description) return;

    const materials: MaterialItem[] = needsMaterial && materialCode ? [
      {
        id: `mat-${Date.now()}`,
        code: materialCode,
        description: materialDesc || 'Item requisitado para alteração de processo',
        quantity: Number(materialQty) || 1,
        unit: 'UN',
        supplier: materialSupplier || 'Fornecedor Homologado',
        expectedDate: dueDate,
        status: 'PEDIDO_EMITIDO'
      }
    ] : [];

    const newDCN = createDCN({
      dcnNumber,
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
        estimatedHours: Number(trainingHours) || 2,
        totalPlanned: 12,
        totalTrained: 0,
        status: 'PENDENTE',
        trainingTopics: [
          'Instrução de Trabalho revisada',
          'Parâmetros técnicos e tolerâncias de qualidade'
        ]
      } : undefined,
      implementationChecklist: [
        { id: `chk-${Date.now()}-1`, title: 'Revisão da Ficha de Instrução de Processo (FIT)', responsible, completed: false, mandatory: true },
        { id: `chk-${Date.now()}-2`, title: 'Inspeção e liberação do 1º Lote Piloto', responsible: 'Qualidade Assegurada', completed: false, mandatory: true }
      ],
      attachments
    });

    onSuccess(newDCN.id);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Cadastrar Nova DCN</h2>
              <p className="text-xs text-slate-300">Entrada formal no fluxo de controle de alterações de engenharia</p>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Número da DCN *</label>
                <input
                  type="text"
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prioridade *</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as PriorityLevel)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                  <option value="CRITICA">Crítica / Urgente</option>
                </select>
              </div>
            </div>

            <div>
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

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Descrição Detalhada & Justificativa Técnica *</label>
              <textarea
                rows={3}
                placeholder="Descreva o motivo da alteração, impacto esperado no produto/processo e referências normativas..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                required
              />
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
                    onChange={e => setNeedsMaterial(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {needsMaterial && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-blue-100">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-0.5">Part Number / Código</label>
                    <input
                      type="text"
                      placeholder="Ex: FIX-M5X20-INX"
                      value={materialCode}
                      onChange={e => setMaterialCode(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-0.5">Descrição do Item</label>
                    <input
                      type="text"
                      placeholder="Ex: Parafuso Inox 316"
                      value={materialDesc}
                      onChange={e => setMaterialDesc(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-0.5">Fornecedor / Fabricante</label>
                    <input
                      type="text"
                      placeholder="Ex: Ciser / Wurth"
                      value={materialSupplier}
                      onChange={e => setMaterialSupplier(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
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
                    <label className="block text-slate-600 font-semibold mb-0.5">Público-Alvo Impactado</label>
                    <input
                      type="text"
                      placeholder="Ex: Operadores de Linha, Soldadores, CQ"
                      value={trainingAudience}
                      onChange={e => setTrainingAudience(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-0.5">Carga Horária Estimada (Horas)</label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={trainingHours}
                      onChange={e => setTrainingHours(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Seção 4: Anexos Iniciais */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
              4. Anexos Iniciais (PDF, Imagens, Desenhos)
            </h3>

            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Ex: Desenho_Tecnico_Rev3.pdf ou Foto_Evidencia.jpg"
                value={simulatedFileName}
                onChange={e => setSimulatedFileName(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
              <button
                type="button"
                onClick={handleAddSimulatedAttachment}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-lg font-semibold flex items-center"
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Anexar
              </button>
            </div>

            <div className="space-y-1.5">
              {attachments.map((att, i) => (
                <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-medium text-slate-800">{att.name}</span>
                    <span className="text-[10px] text-slate-400">({att.size})</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {att.category.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Salvar e Iniciar Fluxo da DCN
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
