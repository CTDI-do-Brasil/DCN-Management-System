import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  Filter, 
  Printer, 
  ShieldCheck, 
  FileText, 
  Eye, 
  CheckCircle2, 
  Clock, 
  Boxes, 
  GraduationCap 
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { exportDCNsToCSV, STATUS_CONFIG, PRIORITY_CONFIG, formatDate } from '../utils/helpers';

interface SearchExportViewProps {
  onSelectDCN: (id: string) => void;
  onOpenAuditReport: (id: string) => void;
}

export const SearchExportView: React.FC<SearchExportViewProps> = ({ onSelectDCN, onOpenAuditReport }) => {
  const { dcns, filteredDCNs, filters, setFilters, resetFilters } = useDCN();
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('csv');

  const handleExport = () => {
    if (selectedFormat === 'csv') {
      exportDCNsToCSV(filteredDCNs);
    } else {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredDCNs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `DCN_Report_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center">
            <Search className="w-5 h-5 mr-2 text-[#00386e]" />
            Consulta Avançada & Exportação de Relatórios de DCN
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pesquisa unificada em metadados, materiais, histórico de auditoria e exportação para planilhas e auditorias
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedFormat}
            onChange={e => setSelectedFormat(e.target.value as any)}
            className="text-xs py-2 px-3 border border-slate-300 rounded-xl bg-white text-slate-700"
          >
            <option value="csv">Formato: CSV / Excel</option>
            <option value="json">Formato: JSON Completo</option>
          </select>

          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl text-white bg-[#00386e] hover:bg-[#002b55] shadow-sm transition-all"
          >
            <Download className="w-4 h-4 mr-1.5 text-cyan-300" />
            Exportar Registros ({filteredDCNs.length})
          </button>
        </div>
      </div>

      {/* Query Search Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Digite palavras-chave: código da DCN, título, responsável, matéria-prima, impacto técnico..."
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-[#00a8e8] focus:border-[#00a8e8]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filtrar por Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl bg-white"
            >
              <option value="ALL">Todos os Status</option>
              <option value="RECEBIDA">1. Recebida</option>
              <option value="EM_AVALIACAO">2. Em Avaliação</option>
              <option value="AGUARDANDO_MATERIAL">3. Aguardando Material</option>
              <option value="PRONTA_IMPLEMENTACAO">4. Aguardando Treinamento</option>
              <option value="IMPLEMENTADA">5. Implementada</option>
              <option value="ENCERRADA">6. Encerrada</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filtrar por Prioridade</label>
            <select
              value={filters.priority}
              onChange={e => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl bg-white"
            >
              <option value="ALL">Todas as Prioridades</option>
              <option value="CRITICA">Crítica / Urgente</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Média</option>
              <option value="BAIXA">Baixa</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="font-bold text-slate-800">Resultados da Consulta ({filteredDCNs.length})</span>
          <span>Ordenado por data de recebimento</span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredDCNs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Nenhuma DCN encontrada com os parâmetros fornecidos.
            </div>
          ) : (
            filteredDCNs.map(dcn => {
              const statusConfig = STATUS_CONFIG[dcn.status];
              const priorityConfig = PRIORITY_CONFIG[dcn.priority];

              return (
                <div key={dcn.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-[#00386e] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {dcn.dcnNumber}
                      </span>
                      {dcn.revision && (
                        <span className="font-mono font-bold text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          Rev. {dcn.revision}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.badgeBorder}`}>
                        {statusConfig.label}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${priorityConfig.badgeBg}`}>
                        {priorityConfig.label}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{dcn.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{dcn.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span>Área: <strong>{dcn.area}</strong></span>
                      <span>Responsável: <strong>{dcn.responsible}</strong></span>
                      <span>Recebido: <strong>{formatDate(dcn.receivedDate)}</strong></span>
                      <span>SLA: <strong>{formatDate(dcn.dueDate)}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => onOpenAuditReport(dcn.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center transition-colors"
                      title="Gerar Dossiê ISO 9001"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#00386e]" />
                      Dossiê ISO
                    </button>

                    <button
                      onClick={() => onSelectDCN(dcn.id)}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#00a8e8] hover:bg-[#0096d6] text-white shadow-xs flex items-center transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Visualizar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
