import React, { useState } from 'react';
import { 
  GraduationCap, 
  Search, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Calendar, 
  Eye, 
  Award,
  Users,
  UserPlus,
  Plus,
  X,
  Check,
  Trash2,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { formatDate } from '../utils/helpers';
import { DCN, Technician } from '../types';

interface TrainingMatrixProps {
  onSelectDCN: (id: string) => void;
  onNavigateToTechnicians?: () => void;
}

export const TrainingMatrix: React.FC<TrainingMatrixProps> = ({ onSelectDCN, onNavigateToTechnicians }) => {
  const { 
    dcns, 
    technicians, 
    markTrainingCompleted, 
    assignTechniciansToDCN, 
    removeTechnicianFromDCN, 
    signTechnicianTraining 
  } = useDCN();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal for managing attendees of a specific DCN
  const [activeDCNForAttendees, setActiveDCNForAttendees] = useState<DCN | null>(null);
  const [selectedTechIdsToAdd, setSelectedTechIdsToAdd] = useState<string[]>([]);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Extract all DCNs that require training
  const trainingDCNs = dcns.filter(d => d.needsTraining && d.training);

  const filteredTrainings = trainingDCNs.filter(dcn => {
    const trn = dcn.training!;
    if (search) {
      const q = search.toLowerCase();
      if (!dcn.dcnNumber.toLowerCase().includes(q) &&
          !dcn.title.toLowerCase().includes(q) &&
          !trn.instructor.toLowerCase().includes(q) &&
          !trn.targetAudience.toLowerCase().includes(q) &&
          !dcn.area.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (statusFilter !== 'ALL' && trn.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const completedCount = trainingDCNs.filter(d => d.training?.status === 'CONCLUIDO').length;
  const pendingCount = trainingDCNs.filter(d => d.training?.status !== 'CONCLUIDO').length;

  const totalColaboradores = trainingDCNs.reduce((acc, d) => acc + (d.training?.totalPlanned || 0), 0);
  const totalTreinados = trainingDCNs.reduce((acc, d) => acc + (d.training?.status === 'CONCLUIDO' ? d.training.totalPlanned : (d.training?.totalTrained || 0)), 0);

  // Active DCN being managed in modal
  const currentModalDCN = activeDCNForAttendees 
    ? dcns.find(d => d.id === activeDCNForAttendees.id) || activeDCNForAttendees
    : null;

  // Available technicians not yet added to this DCN
  const availableTechnicians = currentModalDCN ? technicians.filter(tech => {
    const isAlreadyIn = currentModalDCN.training?.attendeesList?.some(
      a => a.badge === tech.badge || a.technicianId === tech.id
    );
    if (isAlreadyIn) return false;

    if (attendeeSearch) {
      const q = attendeeSearch.toLowerCase();
      const matchName = tech.name.toLowerCase().includes(q);
      const matchBadge = tech.badge.toLowerCase().includes(q);
      const matchDept = tech.department.toLowerCase().includes(q);
      if (!matchName && !matchBadge && !matchDept) return false;
    }

    if (departmentFilter !== 'ALL' && tech.department !== departmentFilter) {
      return false;
    }

    return true;
  }) : [];

  const handleAddSelectedTechnicians = () => {
    if (!currentModalDCN || selectedTechIdsToAdd.length === 0) return;
    assignTechniciansToDCN(currentModalDCN.id, selectedTechIdsToAdd);
    setSelectedTechIdsToAdd([]);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" id="training-matrix-view">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center">
            <GraduationCap className="w-5 h-5 mr-2 text-indigo-600" />
            Matriz de Treinamentos & Capacitação de Impactados (Etapa 6)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Qualificação formal de líderes, operadores e técnicos com evidências e registros de treinamento assinados
          </p>
        </div>

        {/* Summary & Technicians shortcut */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToTechnicians && (
            <button
              onClick={onNavigateToTechnicians}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center"
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              Banco de Técnicos ({technicians.length})
            </button>
          )}

          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Concluídos: {completedCount}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
            Pendentes: {pendingCount}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            Colaboradores: {totalTreinados}/{totalColaboradores} ({totalColaboradores > 0 ? Math.round((totalTreinados / totalColaboradores) * 100) : 0}%)
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por DCN, instrutor, público-alvo, área..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full py-1.5 px-3 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
          >
            <option value="ALL">Status do Treinamento: Todos</option>
            <option value="PENDENTE">Pendente</option>
            <option value="AGENDADO">Agendado</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="CONCLUIDO">Concluído & Atestado</option>
          </select>
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTrainings.map(dcn => {
          const trn = dcn.training!;
          const isDone = trn.status === 'CONCLUIDO';
          const attendeesCount = trn.attendeesList?.length || 0;

          return (
            <div 
              key={dcn.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {dcn.dcnNumber}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isDone 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}>
                    {isDone ? 'Concluído & Assinado' : 'Pendente de Execução'}
                  </span>
                </div>

                <button
                  onClick={() => onSelectDCN(dcn.id)}
                  className="text-xs font-semibold text-indigo-600 hover:underline flex items-center"
                >
                  Ver DCN
                  <Eye className="w-3 h-3 ml-1" />
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{dcn.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Área: {dcn.area}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg">
                <div>
                  <span className="text-slate-400 text-[10px] block">Instrutor / Responsável:</span>
                  <span className="font-semibold text-slate-800">{trn.instructor || dcn.responsible}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Carga Horária:</span>
                  <span className="font-semibold text-slate-800">{trn.estimatedHours} horas</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[10px] block">Público-Alvo Impactado:</span>
                  <span className="font-semibold text-slate-800">{trn.targetAudience}</span>
                </div>
              </div>

              {/* Progress Bar & Attendees Button */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 font-medium">Técnicos & Operadores na Turma</span>
                  <span className="font-bold text-slate-900">
                    {isDone ? trn.totalPlanned : trn.totalTrained}/{trn.totalPlanned} ({isDone ? 100 : Math.round((trn.totalTrained / Math.max(1, trn.totalPlanned)) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full rounded-full transition-all ${isDone ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                    style={{ width: `${isDone ? 100 : (trn.totalTrained / Math.max(1, trn.totalPlanned)) * 100}%` }}
                  ></div>
                </div>

                <button
                  onClick={() => setActiveDCNForAttendees(dcn)}
                  className="w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center justify-center"
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Gerenciar Lista de Técnicos ({attendeesCount} vinculados)
                </button>
              </div>

              {/* Action Button */}
              {!isDone && (
                <button
                  onClick={() => markTrainingCompleted(dcn.id)}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors flex items-center justify-center"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Registrar Ata & Concluir Treinamento
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================================
          MODAL: GERENCIAR TÉCNICOS ASSOCIADOS À DCN
          ======================================================== */}
      {currentModalDCN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5 animate-scale-in">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {currentModalDCN.dcnNumber}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Lista de Presença & Técnicos Associados
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {currentModalDCN.title}
                </p>
              </div>

              <button 
                onClick={() => setActiveDCNForAttendees(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Attendees List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                  <UserCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Colaboradores Escalados ({currentModalDCN.training?.attendeesList?.length || 0})
                </h4>
                
                {currentModalDCN.training?.status !== 'CONCLUIDO' && (
                  <button
                    onClick={() => markTrainingCompleted(currentModalDCN.id)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Concluir Treinamento de Todos
                  </button>
                )}
              </div>

              {(!currentModalDCN.training?.attendeesList || currentModalDCN.training.attendeesList.length === 0) ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs">
                  Nenhum técnico associado ainda. Escolha colaboradores abaixo para adicionar à ata desta DCN.
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {currentModalDCN.training.attendeesList.map((att, idx) => {
                    const isSigned = att.status === 'CONCLUIDO' || !!att.signedDate;

                    return (
                      <div 
                        key={idx}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white shadow-2xs flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-[10px]">
                            {att.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900">{att.name}</span>
                              <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                {att.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">{att.department}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {isSigned ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center">
                              <Check className="w-3 h-3 mr-1" />
                              Assinado ({formatDate(att.signedDate)})
                            </span>
                          ) : (
                            <button
                              onClick={() => signTechnicianTraining(currentModalDCN.id, att.badge)}
                              className="px-2 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                              title="Registrar assinatura individual"
                            >
                              Atestar Presença
                            </button>
                          )}

                          {currentModalDCN.training?.status !== 'CONCLUIDO' && (
                            <button
                              onClick={() => removeTechnicianFromDCN(currentModalDCN.id, att.badge)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Remover da ata"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add More Technicians from DB */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                  <UserPlus className="w-4 h-4 mr-1.5 text-indigo-600" />
                  Adicionar Técnicos do Banco de Dados
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">
                  {selectedTechIdsToAdd.length} selecionado(s)
                </span>
              </div>

              {/* Mini filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome ou matrícula..."
                    value={attendeeSearch}
                    onChange={e => setAttendeeSearch(e.target.value)}
                    className="w-full pl-8 pr-2 py-1 text-xs border border-slate-300 rounded-md bg-white"
                  />
                </div>

                <div>
                  <select
                    value={departmentFilter}
                    onChange={e => setDepartmentFilter(e.target.value)}
                    className="w-full py-1 px-2 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
                  >
                    <option value="ALL">Todos os Departamentos</option>
                    <option value="Montagem SMT">Montagem SMT</option>
                    <option value="Qualidade CQ">Qualidade CQ</option>
                    <option value="Teste & Reparo">Teste & Reparo</option>
                    <option value="Manutenção & Automação">Manutenção & Automação</option>
                  </select>
                </div>
              </div>

              {/* Checkboxes list */}
              <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50">
                {availableTechnicians.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    Nenhum técnico disponível para adição com estes filtros.
                  </div>
                ) : (
                  availableTechnicians.map(tech => {
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
                          isChecked 
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
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
                            <span className="font-bold text-slate-800">{tech.name}</span>
                            <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded ml-1.5 border border-indigo-100">
                              {tech.badge}
                            </span>
                            <span className="text-[10px] text-slate-500 ml-2">({tech.department} • {tech.shift})</span>
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-400">{tech.role}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTechIdsToAdd(availableTechnicians.map(t => t.id))}
                  className="px-2.5 py-1 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 font-semibold"
                >
                  Selecionar Todos Visíveis
                </button>

                <button
                  type="button"
                  onClick={handleAddSelectedTechnicians}
                  disabled={selectedTechIdsToAdd.length === 0}
                  className="px-3.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded shadow-xs"
                >
                  Adicionar {selectedTechIdsToAdd.length > 0 ? `(${selectedTechIdsToAdd.length})` : ''} à Lista
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setActiveDCNForAttendees(null)}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
              >
                Concluir & Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
