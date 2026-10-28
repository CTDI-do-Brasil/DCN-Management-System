import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  LayoutList, 
  Kanban, 
  Plus, 
  ArrowUpDown, 
  Boxes, 
  GraduationCap, 
  Clock, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  ChevronRight, 
  Calendar, 
  Eye, 
  RotateCcw,
  Sparkles,
  ArrowRight,
  UserCheck,
  Paperclip,
  Check
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { DCN, DCNStatus } from '../types';
import { STATUS_CONFIG, PRIORITY_CONFIG, formatDate, isOverdue, getDaysRemaining } from '../utils/helpers';

interface DCNManagementProps {
  onSelectDCN: (id: string) => void;
  onOpenNewDCN: () => void;
}

export const DCNManagement: React.FC<DCNManagementProps> = ({ onSelectDCN, onOpenNewDCN }) => {
  const { 
    dcns, 
    filteredDCNs, 
    filters, 
    setFilters, 
    resetFilters, 
    advanceDCNStatus 
  } = useDCN();

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [sortField, setSortField] = useState<keyof DCN>('receivedDate');
  const [sortAsc, setSortAsc] = useState(false);

  // Unique lists for dropdown filters
  const uniqueAreas = useMemo(() => Array.from(new Set(dcns.map(d => d.area))), [dcns]);
  const uniqueResponsibles = useMemo(() => Array.from(new Set(dcns.map(d => d.responsible))), [dcns]);

  // Sorted items
  const sortedDCNs = useMemo(() => {
    return [...filteredDCNs].sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredDCNs, sortField, sortAsc]);

  const handleSort = (field: keyof DCN) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const kanbanColumns: { status: DCNStatus; title: string; step: number }[] = [
    { status: 'RECEBIDA', title: '1. Recebidas', step: 1 },
    { status: 'EM_AVALIACAO', title: '2. Em Avaliação', step: 2 },
    { status: 'AGUARDANDO_MATERIAL', title: '3. Aguardando Material', step: 3 },
    { status: 'PRONTA_IMPLEMENTACAO', title: '4. Prontas p/ Impl.', step: 4 },
    { status: 'IMPLEMENTADA', title: '5. Implementadas', step: 5 },
    { status: 'ENCERRADA', title: '6. Encerradas', step: 6 }
  ];

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      
      {/* Header & Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center">
              Gestão de DCNs (Document Change Notice)
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {filteredDCNs.length} de {dcns.length} registros
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Controle do ciclo de vida, esteira de aprovação da Engenharia, materiais e treinamentos
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Switcher: List vs Kanban */}
            <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white text-indigo-700 shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5 mr-1.5" />
                Tabela
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'kanban' 
                    ? 'bg-white text-indigo-700 shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Kanban className="w-3.5 h-3.5 mr-1.5" />
                Kanban de Fluxo
              </button>
            </div>

            {/* New DCN CTA */}
            <button
              onClick={onOpenNewDCN}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Nova DCN
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
          
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por DCN, título, responsável, área..."
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700"
            >
              <option value="ALL">Status: Todos</option>
              <option value="RECEBIDA">1. Recebida</option>
              <option value="EM_AVALIACAO">2. Em Avaliação</option>
              <option value="AGUARDANDO_MATERIAL">3. Aguardando Material</option>
              <option value="PRONTA_IMPLEMENTACAO">4. Pronta p/ Impl.</option>
              <option value="IMPLEMENTADA">5. Implementada</option>
              <option value="ENCERRADA">6. Encerrada</option>
            </select>
          </div>

          {/* Area Filter */}
          <div>
            <select
              value={filters.area}
              onChange={e => setFilters(prev => ({ ...prev, area: e.target.value }))}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 truncate"
            >
              <option value="ALL">Projeto: Todos</option>
              {uniqueAreas.map((area, i) => (
                <option key={i} value={area}>{area}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={filters.priority}
              onChange={e => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700"
            >
              <option value="ALL">Prioridade: Todas</option>
              <option value="CRITICA">Crítica / Urgente</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Média</option>
              <option value="BAIXA">Baixa</option>
            </select>
          </div>

          {/* Overdue Quick Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, overdueOnly: !prev.overdueOnly }))}
              className={`w-full py-1.5 px-2 text-xs font-semibold rounded-md border transition-colors flex items-center justify-center ${
                filters.overdueOnly
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5 mr-1" />
              Apenas Atrasadas
            </button>

            {(filters.search || filters.status !== 'ALL' || filters.area !== 'ALL' || filters.priority !== 'ALL' || filters.overdueOnly) && (
              <button
                onClick={resetFilters}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md border border-slate-200 hover:bg-slate-100"
                title="Limpar filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ----------------------------------------------------
          VISUALIZAÇÃO 1: TABELA COMPLETA DE DCNs (DATAGRID)
          ---------------------------------------------------- */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50/80 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('dcnNumber')}>
                    <div className="flex items-center space-x-1">
                      <span>ID / DCN Nº</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('title')}>
                    <div className="flex items-center space-x-1">
                      <span>Título & Descrição</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Projeto</th>
                  <th className="py-3 px-3">Responsável</th>
                  <th className="py-3 px-3 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('dueDate')}>
                    <div className="flex items-center space-x-1">
                      <span>Data Limite</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Requisitos</th>
                  <th className="py-3 px-3 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('status')}>
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedDCNs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-700">Nenhuma DCN encontrada com os filtros atuais.</p>
                      <button
                        onClick={resetFilters}
                        className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Limpar todos os filtros
                      </button>
                    </td>
                  </tr>
                ) : (
                  sortedDCNs.map((dcn) => {
                    const statusConfig = STATUS_CONFIG[dcn.status];
                    const priorityConfig = PRIORITY_CONFIG[dcn.priority];
                    const overdue = isOverdue(dcn.dueDate, dcn.status);
                    const daysLeft = getDaysRemaining(dcn.dueDate);

                    return (
                      <tr 
                        key={dcn.id} 
                        onClick={() => onSelectDCN(dcn.id)}
                        className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                      >
                        {/* ID / DCN Number */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-bold text-slate-900 text-xs group-hover:text-indigo-600">
                                {dcn.dcnNumber}
                              </span>
                              {dcn.revision && (
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Rev. {dcn.revision}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {dcn.id} • Rec: {formatDate(dcn.receivedDate)}
                            </span>
                          </div>
                        </td>

                        {/* Title & Description */}
                        <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                          <div className="flex items-center space-x-1.5 mb-0.5">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${priorityConfig.badgeBg}`}>
                              {priorityConfig.label}
                            </span>
                            {dcn.attachments.length > 0 && (
                              <span className="inline-flex items-center text-[10px] text-slate-400">
                                <Paperclip className="w-2.5 h-2.5 mr-0.5" />
                                {dcn.attachments.length}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-900 line-clamp-1 group-hover:text-indigo-600">
                            {dcn.title}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {dcn.description}
                          </p>
                        </td>

                        {/* Area */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                          {dcn.area}
                        </td>

                        {/* Responsible */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                              {dcn.responsible.charAt(0)}
                            </div>
                            <span className="text-slate-800 text-xs">{dcn.responsible}</span>
                          </div>
                        </td>

                        {/* Due Date & SLA */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`font-semibold ${overdue ? 'text-rose-600' : 'text-slate-700'}`}>
                              {formatDate(dcn.dueDate)}
                            </span>
                            {dcn.status !== 'ENCERRADA' && (
                              <span className={`text-[10px] ${
                                overdue 
                                  ? 'text-rose-600 font-bold' 
                                  : daysLeft <= 3 
                                  ? 'text-amber-600 font-medium' 
                                  : 'text-slate-400'
                              }`}>
                                {overdue ? `Atrasado ${Math.abs(daysLeft)} dias` : `${daysLeft} dias restantes`}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Needs Material & Needs Training Badges */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            {/* Material */}
                            {dcn.needsMaterial ? (
                              <span 
                                title={
                                  dcn.materials.every(m => m.status === 'RECEBIDO_ESTOQUE' || m.status === 'INSPECIONADO_APROVADO')
                                    ? 'Material: Recebido & Aprovado'
                                    : 'Material: Pendente / Em Trânsito'
                                }
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                  dcn.materials.every(m => m.status === 'RECEBIDO_ESTOQUE' || m.status === 'INSPECIONADO_APROVADO')
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                <Boxes className="w-3 h-3 mr-1" />
                                Material
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400" title="Não requer novo material">-</span>
                            )}

                            {/* Training */}
                            {dcn.needsTraining ? (
                              <span 
                                title={
                                  dcn.training?.status === 'CONCLUIDO'
                                    ? 'Treinamento: 100% Concluído'
                                    : 'Treinamento: Pendente / Agendado'
                                }
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                  dcn.training?.status === 'CONCLUIDO'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-sky-50 text-sky-700 border-sky-200'
                                }`}
                              >
                                <GraduationCap className="w-3 h-3 mr-1" />
                                Treinamento
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400" title="Não requer treinamento">-</span>
                            )}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.badgeBorder}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor} mr-1.5`}></span>
                            {statusConfig.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectDCN(dcn.id);
                            }}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          VISUALIZAÇÃO 2: KANBAN DE FLUXO DAS 6 ETAPAS
          ---------------------------------------------------- */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {kanbanColumns.map((col) => {
            const colDCNs = sortedDCNs.filter(d => d.status === col.status);
            const config = STATUS_CONFIG[col.status];

            return (
              <div 
                key={col.status}
                className="bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="p-3 border-b border-slate-200/80 bg-white rounded-t-xl flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>
                    <h3 className="text-xs font-bold text-slate-800 line-clamp-1">{col.title}</h3>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
                    {colDCNs.length}
                  </span>
                </div>

                {/* Cards in Column */}
                <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {colDCNs.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                      Nenhuma DCN nesta etapa
                    </div>
                  ) : (
                    colDCNs.map((dcn) => {
                      const priorityConfig = PRIORITY_CONFIG[dcn.priority];
                      const overdue = isOverdue(dcn.dueDate, dcn.status);

                      return (
                        <div
                          key={dcn.id}
                          onClick={() => onSelectDCN(dcn.id)}
                          className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer space-y-2 group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <span className="font-mono font-bold text-[11px] text-indigo-700">
                                {dcn.dcnNumber}
                              </span>
                              {dcn.revision && (
                                <span className="font-mono text-[9px] font-bold px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Rev. {dcn.revision}
                                </span>
                              )}
                            </div>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${priorityConfig.badgeBg}`}>
                              {priorityConfig.label}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-indigo-600">
                            {dcn.title}
                          </h4>

                          <div className="text-[11px] text-slate-500">
                            <p className="line-clamp-1">Projeto: {dcn.area}</p>
                            <p className="line-clamp-1">Resp: {dcn.responsible}</p>
                          </div>

                          {/* Badges & Icons */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                            <div className="flex items-center space-x-1">
                              {dcn.needsMaterial && (
                                <span className="p-0.5 rounded bg-blue-50 text-blue-700" title="Requer Material">
                                  <Boxes className="w-3 h-3" />
                                </span>
                              )}
                              {dcn.needsTraining && (
                                <span className="p-0.5 rounded bg-sky-50 text-sky-700" title="Requer Treinamento">
                                  <GraduationCap className="w-3 h-3" />
                                </span>
                              )}
                              {dcn.attachments.length > 0 && (
                                <span className="text-slate-400 flex items-center">
                                  <Paperclip className="w-2.5 h-2.5" />
                                  {dcn.attachments.length}
                                </span>
                              )}
                            </div>

                            <span className={`font-medium ${overdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                              {formatDate(dcn.dueDate)}
                            </span>
                          </div>

                          {/* Quick Workflow Action Button */}
                          {dcn.status !== 'ENCERRADA' && (() => {
                            const blockedByMaterials =
                              dcn.status === 'AGUARDANDO_MATERIAL' &&
                              dcn.needsMaterial &&
                              (dcn.materials.length === 0 || !dcn.materials.every(m => m.status === 'RECEBIDO_ESTOQUE'));

                            const trainingAttendees = dcn.training?.attendeesList || [];
                            const hasTrainingAttendees = trainingAttendees.length > 0;
                            const blockedByTrainingAttendees =
                              dcn.status === 'IMPLEMENTADA' && !hasTrainingAttendees;

                            const hasTrainingPdf = (dcn.attachments || []).some(
                              att =>
                                att.category === 'REGISTRO_TREINAMENTO' &&
                                (att.type === 'PDF' || att.name.toLowerCase().endsWith('.pdf'))
                            );
                            const blockedByTrainingPdf = dcn.status === 'IMPLEMENTADA' && !hasTrainingPdf;
                            const isBlocked =
                              blockedByMaterials || blockedByTrainingAttendees || blockedByTrainingPdf;

                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  advanceDCNStatus(dcn.id);
                                }}
                                disabled={isBlocked}
                                title={
                                  blockedByMaterials
                                    ? 'Todos os materiais precisam estar com status "Recebido em Estoque" para avançar'
                                    : blockedByTrainingAttendees
                                    ? 'É necessário que haja Colaboradores Assinados na Ata de Treinamento em Matriz de Treinamento'
                                    : blockedByTrainingPdf
                                    ? 'É obrigatório anexar o PDF com o registro de treinamento para avançar para o Encerramento'
                                    : 'Avançar Etapa'
                                }
                                className={`w-full mt-1 py-1 px-2 text-[10px] font-semibold rounded border transition-colors flex items-center justify-center ${
                                  isBlocked
                                    ? 'text-amber-700 bg-amber-50 border-amber-200 cursor-not-allowed opacity-80'
                                    : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
                                }`}
                              >
                                <span>
                                  {blockedByMaterials
                                    ? 'Aguardando Receb. Estoque'
                                    : blockedByTrainingAttendees
                                    ? 'Aguardando Ata Assinada'
                                    : blockedByTrainingPdf
                                    ? 'Aguardando PDF Treinamento'
                                    : 'Avançar Etapa'}
                                </span>
                                {!isBlocked && <ArrowRight className="w-3 h-3 ml-1" />}
                              </button>
                            );
                          })()}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
