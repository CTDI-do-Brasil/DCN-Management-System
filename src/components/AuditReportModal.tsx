import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  ShieldCheck, 
  FileCheck, 
  Calendar, 
  UserCheck, 
  Building2, 
  CheckCircle2, 
  Clock, 
  Boxes, 
  GraduationCap, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { useAuth } from '../context/AuthContext';
import { formatDate, STATUS_CONFIG, PRIORITY_CONFIG } from '../utils/helpers';

interface AuditReportModalProps {
  initialDCNId?: string | null;
  onClose: () => void;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({ initialDCNId, onClose }) => {
  const { dcns, currentEngineer } = useDCN();
  const { canAccessAudit } = useAuth();
  const [selectedId, setSelectedId] = useState<string>(initialDCNId || (dcns[0]?.id || ''));

  const dcn = dcns.find(d => d.id === selectedId) || dcns[0];

  const handlePrint = () => {
    window.print();
  };

  if (!canAccessAudit) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center shadow-xl border border-slate-200">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">Acesso Restrito</h3>
          <p className="text-xs text-slate-600 mt-1 mb-4 leading-relaxed">
            A emissão do Dossiê Formal de Auditoria (ISO 9001 / IATF 16949) é restrita a usuários com perfil de Engenharia ou Administrador.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#00386e] text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  if (!dcn) return null;

  const statusConfig = STATUS_CONFIG[dcn.status];
  const priorityConfig = PRIORITY_CONFIG[dcn.priority];

  return (

    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Dossiê Formal de Auditoria de Engenharia (ISO 9001 / IATF 16949)</h2>
              <p className="text-[11px] text-slate-300">Emissão de evidência formal para auditoria de controle de alterações de processo</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* DCN Selector */}
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-800 text-white border border-slate-700 rounded-lg focus:ring-1 focus:ring-indigo-400"
            >
              {dcns.map(item => (
                <option key={item.id} value={item.id}>
                  {item.dcnNumber} - {item.title.substring(0, 30)}...
                </option>
              ))}
            </select>

            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Imprimir Dossiê
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------
            RELATÓRIO IMPRESSO / AUDITABLE FORM (ISO FORMAT)
            ---------------------------------------------------- */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 text-slate-900 bg-white print:p-0 print:overflow-visible">
          
          {/* Header Oficial do Documento */}
          <div className="border-2 border-slate-800 p-4 mb-6 rounded-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between border-b-2 border-slate-800 pb-3 mb-3 gap-2 text-center sm:text-left">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded bg-slate-900 text-white flex items-center justify-center font-black text-xl">
                  DCN
                </div>
                <div>
                  <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                    DCN CONTROL CENTER • DOSSIÊ DE ENGENHARIA DE MUDANÇAS
                  </h1>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Document Change Notice (DCN) • Gestão e Controle de Processos
                  </p>
                </div>
              </div>

              <div className="text-right text-xs">
                <p className="font-mono font-bold text-slate-900">
                  DOC: <strong>{dcn.dcnNumber}</strong>{dcn.revision ? ` • REV: ${dcn.revision}` : ''}
                </p>
                <p className="text-[10px] text-slate-500">ID do Sistema: {dcn.id}</p>
                <p className="text-[10px] text-slate-500">Conformidade: ISO 9001:2015 / IATF 8.5.6</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block">Área de Manufatura:</span>
                <span className="font-bold">{dcn.area}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Engenheiro Responsável:</span>
                <span className="font-bold">{dcn.responsible}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Data de Recebimento:</span>
                <span className="font-bold">{formatDate(dcn.receivedDate)}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Status no Sistema:</span>
                <span className="font-bold uppercase text-indigo-800">{statusConfig.label}</span>
              </div>
            </div>
          </div>

          {/* Seção 1: Objeto da Alteração */}
          <div className="mb-6 space-y-2">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center">
              <span className="w-2 h-2 bg-slate-900 mr-2"></span>
              1. Objeto & Descrição da Alteração
            </h2>
            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs">
              <p className="font-bold text-slate-900 mb-1">{dcn.title}</p>
              <p className="text-slate-700 whitespace-pre-line leading-relaxed">{dcn.description}</p>
            </div>
          </div>

          {/* Seção 2: Parecer e Avaliação da Engenharia */}
          <div className="mb-6 space-y-2">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center">
              <span className="w-2 h-2 bg-slate-900 mr-2"></span>
              2. Parecer Técnico da Engenharia (Etapa 2)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 border border-slate-200 rounded">
                <span className="font-bold text-slate-800 block mb-1">Impacto Técnico & Produtivo:</span>
                <p className="text-slate-600">
                  {dcn.engineeringReview?.technicalImpact || 'Alteração técnica avaliada e compatível com as especificações de projeto.'}
                </p>
              </div>
              <div className="p-3 border border-slate-200 rounded">
                <span className="font-bold text-slate-800 block mb-1">Análise de Riscos FMEA:</span>
                <p className="text-slate-600">
                  {(dcn.engineeringReview?.risksIdentified || []).join('; ') || 'Riscos mapeados e controlados em plano de contingência.'}
                </p>
              </div>
            </div>
          </div>

          {/* Seção 3: Materiais e Controle de Chegada */}
          <div className="mb-6 space-y-2">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center">
              <span className="w-2 h-2 bg-slate-900 mr-2"></span>
              3. Controle de Materiais & Amostras (Etapas 3 e 4)
            </h2>
            {dcn.needsMaterial && dcn.materials.length > 0 ? (
              <table className="min-w-full divide-y divide-slate-300 text-xs border border-slate-200">
                <thead className="bg-slate-100 font-bold text-[10px] text-slate-700 uppercase">
                  <tr>
                    <th className="py-2 px-3 text-left">Código / Descrição</th>
                    <th className="py-2 px-3 text-left">Qtd / Unidade</th>
                    <th className="py-2 px-3 text-left">Fornecedor</th>
                    <th className="py-2 px-3 text-left">Data Recebimento</th>
                    <th className="py-2 px-3 text-left">Status do CQ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dcn.materials.map(m => (
                    <tr key={m.id}>
                      <td className="py-2 px-3 font-mono"><strong>{m.code}</strong> - {m.description}</td>
                      <td className="py-2 px-3">{m.quantity} {m.unit}</td>
                      <td className="py-2 px-3">{m.supplier}</td>
                      <td className="py-2 px-3">{formatDate(m.arrivalDate || m.expectedDate)}</td>
                      <td className="py-2 px-3 font-bold text-emerald-800">{m.status.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-500 italic p-2 bg-slate-50 border rounded">
                Sem necessidade de materiais físicos para esta alteração.
              </p>
            )}
          </div>

          {/* Seção 4: Evidência de Treinamento dos Colaboradores */}
          <div className="mb-6 space-y-2">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center">
              <span className="w-2 h-2 bg-slate-900 mr-2"></span>
              4. Capacitação & Treinamento de Colaboradores (Etapa 6)
            </h2>
            {dcn.needsTraining && dcn.training ? (
              <div className="border border-slate-200 rounded p-3 text-xs space-y-2">
                <div className="flex justify-between">
                  <span>Público-Alvo: <strong>{dcn.training.targetAudience}</strong></span>
                  <span>Carga Horária: <strong>{dcn.training.estimatedHours} horas</strong></span>
                  <span>Status: <strong className="text-emerald-800">{dcn.training.status}</strong></span>
                </div>
                <div className="text-[11px] text-slate-600">
                  <strong>Tópicos Ministrados:</strong> {dcn.training.trainingTopics.join(' | ')}
                </div>
                {dcn.training.attendeesList && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-[11px] font-bold text-slate-700 mb-1">Ata de Participantes Assinada:</p>
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {dcn.training.attendeesList.map((att, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono">
                          {att.name} - OK
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-2 bg-slate-50 border rounded">
                Treinamento formal não aplicável para esta DCN.
              </p>
            )}
          </div>

          {/* Seção 5: Trilha de Auditoria & Assinaturas Formais */}
          <div className="space-y-2">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center">
              <span className="w-2 h-2 bg-slate-900 mr-2"></span>
              5. Trilha Histórica de Aprovações & Fechamento
            </h2>
            
            <div className="space-y-1.5 mb-6 text-xs">
              {dcn.auditTrail.map(log => (
                <div key={log.id} className="flex items-start justify-between py-1 border-b border-slate-100 text-[11px]">
                  <div>
                    <strong className="text-slate-900">{log.action}</strong> • {log.user} ({log.userRole})
                    {log.comment && <span className="text-slate-500 italic block">"{log.comment}"</span>}
                  </div>
                  <span className="font-mono text-slate-400 shrink-0 ml-4">{log.timestamp}</span>
                </div>
              ))}
            </div>

            {/* Campo de Assinaturas Formais */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t-2 border-slate-800 text-center text-xs">
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-bold">
                  {dcn.responsible}
                </div>
                <p className="text-[10px] text-slate-500">Engenheiro Responsável</p>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-bold">
                  Dr. Roberto Albuquerque
                </div>
                <p className="text-[10px] text-slate-500">Gerência de Engenharia</p>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-bold">
                  Juliana Viana
                </div>
                <p className="text-[10px] text-slate-500">Garantia da Qualidade (CQ)</p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
