import React, { useMemo } from 'react';
import { 
  Inbox, 
  SearchCode, 
  Boxes, 
  PlayCircle, 
  CheckCircle2, 
  Archive, 
  AlertTriangle, 
  Clock, 
  GraduationCap, 
  PackageSearch, 
  TrendingUp, 
  ArrowUpRight,
  Filter,
  Layers,
  ChevronRight,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { useDCN } from '../context/DCNContext';
import { STATUS_CONFIG, formatDate, isOverdue } from '../utils/helpers';
import { DCNStatus } from '../types';
import { AppNavTab } from './Sidebar';
import { HeroActionHub } from './HeroActionHub';

interface DashboardProps {
  onSelectDCN: (id: string) => void;
  onNavigateToDCNs: (statusFilter?: string) => void;
  onOpenNewDCN: () => void;
  onOpenAuditReport: () => void;
  onNavigateToTab: (tab: AppNavTab) => void;
  isMetricsOnly?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  onSelectDCN, 
  onNavigateToDCNs, 
  onOpenNewDCN,
  onOpenAuditReport,
  onNavigateToTab,
  isMetricsOnly = false
}) => {
  const { dcns, stats, setFilters, filters } = useDCN();

  // Color mapping matching Smart Scan / CTDI industrial palette
  const STATUS_COLORS: Record<DCNStatus, string> = {
    RECEBIDA: '#64748B',          // Slate
    EM_AVALIACAO: '#F59E0B',      // Amber
    AGUARDANDO_MATERIAL: '#0284C7', // Ocean Blue
    PRONTA_IMPLEMENTACAO: '#00386E', // Navy Blue
    IMPLEMENTADA: '#00A8E8',      // Cyan
    ENCERRADA: '#10B981'          // Emerald
  };

  // 1. Data for DCNs por Mês
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthCounts = months.map((m) => ({
      name: m,
      recebidas: 0,
      implementadas: 0,
      encerradas: 0
    }));

    dcns.forEach(dcn => {
      if (dcn.receivedDate) {
        const monthIndex = new Date(dcn.receivedDate).getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          monthCounts[monthIndex].recebidas += 1;
        }
      }
      if (dcn.implementationDate) {
        const monthIndex = new Date(dcn.implementationDate).getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          monthCounts[monthIndex].implementadas += 1;
        }
      }
      if (dcn.closedAt) {
        const monthIndex = new Date(dcn.closedAt).getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          monthCounts[monthIndex].encerradas += 1;
        }
      }
    });

    return monthCounts;
  }, [dcns]);

  // 2. Data for DCNs por Status (Donut)
  const statusPieData = useMemo(() => {
    return [
      { name: 'Recebidas', value: stats.receivedCount, status: 'RECEBIDA', color: STATUS_COLORS.RECEBIDA },
      { name: 'Em Avaliação', value: stats.inReviewCount, status: 'EM_AVALIACAO', color: STATUS_COLORS.EM_AVALIACAO },
      { name: 'Aguard. Material', value: stats.awaitingMaterialCount, status: 'AGUARDANDO_MATERIAL', color: STATUS_COLORS.AGUARDANDO_MATERIAL },
      { name: 'Aguardando Treinamento', value: stats.readyForImplementationCount, status: 'PRONTA_IMPLEMENTACAO', color: STATUS_COLORS.PRONTA_IMPLEMENTACAO },
      { name: 'Implementadas', value: stats.implementedCount, status: 'IMPLEMENTADA', color: STATUS_COLORS.IMPLEMENTADA },
      { name: 'Encerradas', value: stats.closedCount, status: 'ENCERRADA', color: STATUS_COLORS.ENCERRADA }
    ].filter(item => item.value > 0);
  }, [stats]);

  // 3. Data for Evolução de Implementação (Cumulative Progression)
  const evolutionData = useMemo(() => {
    return [
      { etapa: 'Recebimento', total: dcns.length, concluidas: dcns.length },
      { etapa: 'Avaliação', total: dcns.length, concluidas: dcns.filter(d => d.status !== 'RECEBIDA').length },
      { etapa: 'Materiais', total: dcns.filter(d => d.needsMaterial).length, concluidas: dcns.filter(d => ['PRONTA_IMPLEMENTACAO', 'IMPLEMENTADA', 'ENCERRADA'].includes(d.status)).length },
      { etapa: 'Implementação', total: dcns.length, concluidas: dcns.filter(d => ['IMPLEMENTADA', 'ENCERRADA'].includes(d.status)).length },
      { etapa: 'Treinamento', total: dcns.filter(d => d.needsTraining).length, concluidas: dcns.filter(d => d.training?.status === 'CONCLUIDO').length },
      { etapa: 'Encerramento', total: dcns.length, concluidas: stats.closedCount }
    ];
  }, [dcns, stats]);

  // 4. Data for Treinamentos Realizados vs Pendentes
  const trainingData = useMemo(() => {
    const areaMap: Record<string, { planned: number; completed: number; attendeesPlanned: number; attendeesTrained: number }> = {};
    
    dcns.forEach(dcn => {
      if (dcn.needsTraining && dcn.training) {
        const areaKey = dcn.area.split('/')[0].trim();
        if (!areaMap[areaKey]) {
          areaMap[areaKey] = { planned: 0, completed: 0, attendeesPlanned: 0, attendeesTrained: 0 };
        }
        areaMap[areaKey].planned += 1;
        areaMap[areaKey].attendeesPlanned += dcn.training.totalPlanned || 0;
        if (dcn.training.status === 'CONCLUIDO') {
          areaMap[areaKey].completed += 1;
          areaMap[areaKey].attendeesTrained += dcn.training.totalTrained || dcn.training.totalPlanned;
        }
      }
    });

    return Object.entries(areaMap).map(([area, val]) => ({
      area: area.length > 15 ? area.substring(0, 13) + '...' : area,
      treinados: val.attendeesTrained,
      pendentes: Math.max(0, val.attendeesPlanned - val.attendeesTrained)
    }));
  }, [dcns]);

  // Critical / Overdue DCNs
  const urgentDCNs = useMemo(() => {
    return dcns.filter(d => d.status !== 'ENCERRADA' && (d.priority === 'CRITICA' || isOverdue(d.dueDate, d.status))).slice(0, 4);
  }, [dcns]);

  const handleCardClick = (status: DCNStatus) => {
    onNavigateToDCNs(status);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Central Hero Action Hub (Matching the center scanner card in reference screenshot) */}
      {!isMetricsOnly && (
        <HeroActionHub
          onOpenNewDCN={onOpenNewDCN}
          onOpenAuditReport={onOpenAuditReport}
          onNavigateToDCNs={onNavigateToDCNs}
          onNavigateToTab={onNavigateToTab}
        />
      )}

      {/* ----------------------------------------------------
          MÓDULO 1: OS 6 CARDS PRINCIPAIS DE STATUS (PIPELINE)
          ---------------------------------------------------- */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00386e] mr-2"></span>
            Pipeline de Engenharia por Etapa (6 Status)
          </h2>
          <span className="text-xs text-slate-400">Clique no card para filtrar a lista</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Card 1: DCNs Recebidas */}
          <div 
            onClick={() => handleCardClick('RECEBIDA')}
            className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-[#00386e] hover:bg-white hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="w-1 h-full absolute left-0 top-0 bg-slate-400"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600">1. Recebidas</span>
              <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Inbox className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{stats.receivedCount}</span>
              <span className="text-[10px] text-slate-400">Triagem</span>
            </div>
          </div>

          {/* Card 2: Em Avaliação */}
          <div 
            onClick={() => handleCardClick('EM_AVALIACAO')}
            className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-200 hover:border-amber-400 hover:bg-white hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="w-1 h-full absolute left-0 top-0 bg-amber-500"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-800">2. Em Avaliação</span>
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <SearchCode className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{stats.inReviewCount}</span>
              <span className="text-[10px] text-amber-600 font-medium">Engenharia</span>
            </div>
          </div>

          {/* Card 3: Aguardando Material */}
          <div 
            onClick={() => handleCardClick('AGUARDANDO_MATERIAL')}
            className="bg-blue-50/40 p-3.5 rounded-xl border border-blue-200 hover:border-blue-400 hover:bg-white hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="w-1 h-full absolute left-0 top-0 bg-blue-500"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-800">3. Aguard. Materiais</span>
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Boxes className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{stats.awaitingMaterialCount}</span>
              <span className="text-[10px] text-blue-600 font-medium">Supply Team</span>
            </div>
          </div>

          {/* Card 4: Aguardando Treinamento */}
          <div 
            onClick={() => handleCardClick('PRONTA_IMPLEMENTACAO')}
            className="bg-sky-50/40 p-3.5 rounded-xl border border-sky-200 hover:border-[#00386e] hover:bg-white hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="w-1 h-full absolute left-0 top-0 bg-[#00386e]"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#00386e]">4. Aguard. Treinamento</span>
              <div className="w-6 h-6 rounded-lg bg-sky-100 text-[#00386e] flex items-center justify-center group-hover:scale-110 transition-transform">
                <PlayCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{stats.readyForImplementationCount}</span>
              <span className="text-[10px] text-[#00386e] font-medium">Treinamento Pendente</span>
            </div>
          </div>

          {/* Card 5: Implementadas */}
          <div 
            onClick={() => handleCardClick('IMPLEMENTADA')}
            className="bg-cyan-50/40 p-3.5 rounded-xl border border-cyan-200 hover:border-[#00a8e8] hover:bg-white hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="w-1 h-full absolute left-0 top-0 bg-[#00a8e8]"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-cyan-800">5. Implementadas</span>
              <div className="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{stats.implementedCount}</span>
              <span className="text-[10px] text-cyan-600 font-medium">Em Linha</span>
            </div>
          </div>

          {/* Card 6: Encerradas */}
          <div 
            onClick={() => handleCardClick('ENCERRADA')}
            className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-200 hover:border-emerald-400 hover:bg-white hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="w-1 h-full absolute left-0 top-0 bg-emerald-500"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-800">6. Encerradas</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Archive className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{stats.closedCount}</span>
              <span className="text-[10px] text-emerald-600 font-medium">Auditadas</span>
            </div>
          </div>

        </div>
      </div>

      {/* ----------------------------------------------------
          MÓDULO 1: OS 4 INDICADORES EXECUTIVOS (KPIs)
          ---------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Indicador 1: Total de DCNs do Ano */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total de DCNs Registradas</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalYearCount}</h3>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              Rastreabilidade ISO 9001
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#00386e]">
            <Layers className="w-6 h-6 text-[#00386e]" />
          </div>
        </div>

        {/* Indicador 2: DCNs Atrasadas */}
        <div 
          onClick={() => {
            setFilters(prev => ({ ...prev, overdueOnly: true, status: 'ALL' }));
            onNavigateToDCNs();
          }}
          className={`p-5 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            stats.overdueCount > 0 
              ? 'bg-rose-50/80 border-rose-200 hover:border-rose-300' 
              : 'bg-white border-slate-200/90'
          }`}
        >
          <div>
            <div className="flex items-center space-x-1.5">
              <p className="text-xs font-medium text-slate-600">DCNs Atrasadas (SLA)</p>
              {stats.overdueCount > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-200 text-rose-800">
                  Crítico
                </span>
              )}
            </div>
            <h3 className={`text-2xl font-black mt-1 ${stats.overdueCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {stats.overdueCount}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {stats.overdueCount === 0 ? 'Nenhuma pendência de prazo' : 'Necessitam priorização'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            stats.overdueCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-50 text-slate-400'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Indicador 3: Treinamentos Pendentes */}
        <div 
          onClick={() => onNavigateToTab('trainings')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between cursor-pointer hover:border-cyan-400 transition-all"
        >
          <div>
            <p className="text-xs font-medium text-slate-500">Treinamentos Pendentes</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.pendingTrainingsCount}</h3>
            <p className="text-[11px] text-cyan-700 font-medium mt-1">
              Capacitação
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-[#00a8e8]">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* Indicador 4: Materiais Pendentes */}
        <div 
          onClick={() => onNavigateToTab('materials')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-400 transition-all"
        >
          <div>
            <p className="text-xs font-medium text-slate-500">Materiais Pendentes / CQ</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.pendingMaterialsCount}</h3>
            <p className="text-[11px] text-[#00386e] font-medium mt-1">
              Em cotação ou transporte
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#00386e]">
            <PackageSearch className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* ----------------------------------------------------
          MÓDULO 1: OS 4 GRÁFICOS EXECUTIVOS (POWER BI STYLE)
          ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1: DCNs por Mês */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Volume de DCNs por Mês</h3>
              <p className="text-xs text-slate-500">Entrada vs Implementadas vs Encerradas</p>
            </div>
            <span className="text-[11px] font-semibold text-[#00386e] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Ano Vigente
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#CBD5E1' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#CBD5E1' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#00284f', borderRadius: '10px', border: 'none', color: '#FFF', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="recebidas" name="Recebidas" fill="#00386E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="implementadas" name="Implementadas" fill="#00A8E8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="encerradas" name="Encerradas" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: DCNs por Status (Donut) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Distribuição por Status Atual</h3>
              <p className="text-xs text-slate-500">Proporção relativa no fluxo de engenharia</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              Total: {dcns.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
            <div className="h-64 sm:col-span-7">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#00284f', borderRadius: '10px', border: 'none', color: '#FFF', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="sm:col-span-5 space-y-2 text-xs">
              {statusPieData.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => onNavigateToDCNs(item.status)}
                  className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="text-slate-700 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                    {item.value} ({Math.round((item.value / dcns.length) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico 3: Evolução de Implementação */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Evolução de Implementação</h3>
              <p className="text-xs text-slate-500">Taxa de conclusão por fase do ciclo de vida</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00386E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00386E" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConcluidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00A8E8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00A8E8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="etapa" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#CBD5E1' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#CBD5E1' }} />
                <Tooltip contentStyle={{ backgroundColor: '#00284f', borderRadius: '10px', border: 'none', color: '#FFF', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="total" name="Total no Escopo" stroke="#00386E" fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="concluidas" name="Etapa Concluída" stroke="#00A8E8" fillOpacity={1} fill="url(#colorConcluidas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 4: Treinamentos Realizados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Treinamentos Realizados por Área</h3>
              <p className="text-xs text-slate-500">Colaboradores capacitados vs pendentes</p>
            </div>
            <span className="text-[11px] font-semibold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
              Auditável ISO 9001
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trainingData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis dataKey="area" type="category" tick={{ fontSize: 11, fill: '#64748B' }} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#00284f', borderRadius: '10px', border: 'none', color: '#FFF', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="treinados" name="Colaboradores Capacitados" fill="#00A8E8" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pendentes" name="Pendentes de Treinamento" fill="#CBD5E1" stackId="a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* DCNs com Atenção Requerida / SLA Crítico */}
      {urgentDCNs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                DCNs com Atenção Imediata da Engenharia (Prioridade Alta ou SLA Excedido)
              </h3>
            </div>
            <button
              onClick={() => onNavigateToDCNs('ALL')}
              className="text-xs font-semibold text-[#00386e] hover:text-[#00a8e8] flex items-center"
            >
              Ver fila completa
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {urgentDCNs.map(dcn => {
              const overdue = isOverdue(dcn.dueDate, dcn.status);
              const config = STATUS_CONFIG[dcn.status];
              return (
                <div 
                  key={dcn.id}
                  onClick={() => onSelectDCN(dcn.id)}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-[#00386e] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {dcn.dcnNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}>
                        {config.label}
                      </span>
                      {overdue && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Prazo Vencido ({formatDate(dcn.dueDate)})
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 line-clamp-1">{dcn.title}</p>
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <span>Área: <strong className="text-slate-700">{dcn.area}</strong></span>
                      <span>Resp: <strong className="text-slate-700">{dcn.responsible}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-center">
                    <span className="text-xs text-[#00a8e8] font-bold flex items-center group-hover:underline">
                      Abrir Análise
                      <ArrowUpRight className="w-4 h-4 ml-1" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
