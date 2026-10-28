import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Search, 
  Filter, 
  ArrowRight, 
  CheckCircle2, 
  Truck, 
  Clock, 
  PackageCheck,
  Eye,
  Layers
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { MATERIAL_STATUS_CONFIG, formatDate } from '../utils/helpers';
import { MaterialStatus } from '../types';

interface MaterialsOverviewProps {
  onSelectDCN: (id: string) => void;
}

export const MaterialsOverview: React.FC<MaterialsOverviewProps> = ({ onSelectDCN }) => {
  const { dcns, updateMaterialStatus, updateMaterialExpectedDate } = useDCN();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Extract all materials with their parent DCN info
  const allMaterialRows = useMemo(() => {
    return dcns.flatMap(dcn => 
      dcn.materials.map(mat => ({
        ...mat,
        dcnId: dcn.id,
        dcnNumber: dcn.dcnNumber,
        dcnTitle: dcn.title,
        dcnArea: dcn.area,
        dcnStatus: dcn.status,
        dcnResponsible: dcn.responsible
      }))
    );
  }, [dcns]);

  const filteredMaterials = useMemo(() => {
    return allMaterialRows.filter(m => {
      if (search) {
        const q = search.toLowerCase();
        if (!m.code.toLowerCase().includes(q) && 
            !m.description.toLowerCase().includes(q) && 
            !m.supplier.toLowerCase().includes(q) &&
            !m.dcnNumber.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (statusFilter !== 'ALL' && m.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [allMaterialRows, search, statusFilter]);

  // Group filtered materials by DCN so DCN is the first column with all related parts under it
  const groupedMaterialsByDCN = useMemo(() => {
    const groups: {
      dcnId: string;
      dcnNumber: string;
      dcnTitle: string;
      dcnArea: string;
      dcnStatus: string;
      materials: typeof allMaterialRows;
    }[] = [];

    filteredMaterials.forEach(mat => {
      let existingGroup = groups.find(g => g.dcnId === mat.dcnId);
      if (!existingGroup) {
        existingGroup = {
          dcnId: mat.dcnId,
          dcnNumber: mat.dcnNumber,
          dcnTitle: mat.dcnTitle,
          dcnArea: mat.dcnArea,
          dcnStatus: mat.dcnStatus,
          materials: []
        };
        groups.push(existingGroup);
      }
      existingGroup.materials.push(mat);
    });

    return groups;
  }, [filteredMaterials]);

  const pendingCount = allMaterialRows.filter(m => m.status === 'PENDENTE' || m.status === 'PEDIDO_EMITIDO').length;
  const inTransitCount = allMaterialRows.filter(m => m.status === 'EM_TRANSITO').length;
  const receivedCount = allMaterialRows.filter(m => m.status === 'RECEBIDO_ESTOQUE' || m.status === 'INSPECIONADO_APROVADO').length;

  return (
    <div className="space-y-6 pb-12 animate-fade-in" id="materials-overview-screen">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center">
            <Boxes className="w-5 h-5 mr-2 text-indigo-600" />
            Controle de Materiais & Fixtures
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestão da cadeia de suprimentos, requisições de compras e inspeção de entrada de materiais vinculados a DCNs
          </p>
        </div>

        {/* Summary Chips */}
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Pendentes/Pedidos: {pendingCount}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            Em Trânsito: {inTransitCount}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Recebidos/Aprovados: {receivedCount}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por DCN, Part Number, descrição, fornecedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full py-1.5 px-3 text-xs border border-slate-300 rounded-md bg-white text-slate-700 font-medium"
          >
            <option value="ALL">Status do Material: Todos</option>
            <option value="PENDENTE">Pendente</option>
            <option value="PEDIDO_EMITIDO">Solicitação Emitida</option>
            <option value="EM_TRANSITO">Em Trânsito</option>
            <option value="RECEBIDO_ESTOQUE">Recebido no Almoxarifado</option>
            <option value="INSPECIONADO_APROVADO">Inspecionado & Aprovado CQ</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs" id="materials-grouped-table">
            <thead className="bg-slate-50 font-bold text-slate-700 uppercase text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-left w-56 border-r border-slate-200 bg-slate-100/70">DCN</th>
                <th className="py-3 px-4 text-left">PART NUMBER</th>
                <th className="py-3 px-3 text-left">QUANTIDADE</th>
                <th className="py-3 px-3 text-left">Previsão / Entrega</th>
                <th className="py-3 px-3 text-left">Status do Suprimento</th>
                <th className="py-3 px-4 text-right">Ação Rápida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {groupedMaterialsByDCN.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 text-xs">
                    Nenhum material encontrado com os critérios selecionados.
                  </td>
                </tr>
              ) : (
                groupedMaterialsByDCN.map(group => {
                  return group.materials.map((item, idx) => {
                    const config = MATERIAL_STATUS_CONFIG[item.status];
                    const isFirstInGroup = idx === 0;

                    return (
                      <tr 
                        key={`${group.dcnId}-${item.id}`} 
                        className={`hover:bg-indigo-50/30 transition-colors ${idx > 0 ? 'border-t border-slate-100' : ''}`}
                      >
                        {/* 1. DCN Column as First Column, spanning all items in the group */}
                        {isFirstInGroup && (
                          <td 
                            rowSpan={group.materials.length} 
                            className="py-3.5 px-4 align-top bg-slate-50/70 border-r border-slate-200"
                          >
                            <div className="sticky top-2">
                              <button
                                onClick={() => onSelectDCN(group.dcnId)}
                                className="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline flex items-center text-xs group"
                                title="Visualizar detalhes da DCN"
                              >
                                {group.dcnNumber}
                                <Eye className="w-3.5 h-3.5 ml-1.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                              </button>
                              <p className="text-[11px] font-medium text-slate-700 line-clamp-2 mt-1 leading-snug">
                                {group.dcnTitle}
                              </p>
                              <div className="mt-2 flex items-center space-x-1.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-200/80 text-slate-700 border border-slate-300/60">
                                  {group.dcnArea}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  ({group.materials.length} {group.materials.length === 1 ? 'item' : 'itens'})
                                </span>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* 2. PART NUMBER Column */}
                        <td className="py-3 px-4">
                          <p className="font-mono font-bold text-slate-900 text-xs tracking-wide">
                            {item.code}
                          </p>
                          <p className="text-slate-600 text-[11px] mt-0.5">{item.description}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Fornecedor: <span className="text-slate-600 font-medium">{item.supplier}</span>
                          </p>
                          {item.notes && (
                            <p className="text-[10px] text-amber-700 italic mt-0.5">{item.notes}</p>
                          )}
                        </td>

                        {/* 3. QUANTIDADE Column */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <p className="font-bold text-slate-900 text-xs">
                            {item.quantity} <span className="text-[11px] font-normal text-slate-500">{item.unit}</span>
                          </p>
                        </td>

                        {/* 4. Previsão / Entrega Column */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] text-slate-500 font-semibold">ETA:</span>
                              <input
                                type="date"
                                value={item.expectedDate || ''}
                                onChange={(e) => updateMaterialExpectedDate(group.dcnId, item.id, e.target.value)}
                                className="text-xs border border-slate-300 rounded px-1.5 py-0.5 bg-white text-slate-800 focus:border-indigo-500"
                                title="Informar ou alterar Data Estimada (ETA)"
                              />
                            </div>
                            {!item.expectedDate && (
                              <span className="text-[10px] text-amber-600 font-medium">Aguardando data (ETA)</span>
                            )}
                            {item.arrivalDate && (
                              <p className="text-emerald-700 font-semibold text-[11px]">
                                Entregue: {formatDate(item.arrivalDate)}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* 5. Status do Suprimento Column */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${config.badgeClass}`}>
                            {config.label}
                          </span>
                        </td>

                        {/* 6. Ação Rápida Column */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <select
                            value={item.status}
                            onChange={e => updateMaterialStatus(group.dcnId, item.id, e.target.value as MaterialStatus)}
                            className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                          >
                            <option value="PENDENTE">Pendente</option>
                            <option value="PEDIDO_EMITIDO">Solicitação Emitida</option>
                            <option value="EM_TRANSITO">Em Trânsito</option>
                            <option value="RECEBIDO_ESTOQUE">Recebido Estoque</option>
                            <option value="INSPECIONADO_APROVADO">Inspecionado CQ</option>
                          </select>
                        </td>
                      </tr>
                    );
                  });
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
