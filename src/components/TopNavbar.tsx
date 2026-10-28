import React, { useState, useMemo } from 'react';
import { 
  Menu, 
  Search, 
  Download, 
  ShieldCheck, 
  PlusCircle, 
  Bell, 
  FileCheck2,
  Layers,
  Sparkles,
  LogOut,
  WifiOff,
  AlertTriangle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { useAuth } from '../context/AuthContext';
import { exportDCNsToCSV, getDaysRemaining, isOverdue, formatDate } from '../utils/helpers';
import { DCNLogo } from './DCNLogo';
import { AppNavTab } from './Sidebar';

interface TopNavbarProps {
  onToggleMobileMenu: () => void;
  activeTab: string;
  onOpenNewDCN: () => void;
  onOpenAuditReport?: () => void;
  onNavigateToTab?: (tab: AppNavTab) => void;
  onSelectDCN?: (dcnId: string) => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onToggleMobileMenu,
  activeTab,
  onOpenNewDCN,
  onNavigateToTab,
  onSelectDCN
}) => {
  const { dcns, filteredDCNs } = useDCN();
  const { currentUser, logout, canCreateDCN, roleBadge, userInitials, isOfflineMode } = useAuth();
  const [bellOpen, setBellOpen] = useState(false);

  const alertSummary = useMemo(() => {
    const active = dcns.filter(d => d.status !== 'ENCERRADA');
    const overdueList = active.filter(d => isOverdue(d.dueDate, d.status));
    const approachingList = active.filter(d => {
      const days = getDaysRemaining(d.dueDate);
      return days >= 0 && days <= 5;
    });
    return {
      overdueList,
      approachingList,
      pendingCount: active.length,
      totalAlerts: overdueList.length + approachingList.length
    };
  }, [dcns]);

  const tabLabels: Record<string, string> = {
    dashboard: 'Início',
    dcns: 'Gestão de DCNs',
    materials: 'Controle de Materiais',
    trainings: 'Matriz de Treinamentos',
    technicians: 'Cadastro de Técnicos & Qualidade',
    users: 'Gestão de Usuários & Acessos',
    notifications: 'Notificações & Alertas',
    metrics: 'Métricas & Dashboard',
    search: 'Consulta & Exportação'
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs px-4 sm:px-6 lg:px-8 py-2.5">
      <div className="flex items-center justify-between">
        
        {/* Left Side: Mobile Menu Button & Breadcrumb */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Abrir Menu Lateral"
          >
            <Menu className="w-5 h-5 text-[#00386e]" />
          </button>

          {/* Mobile Logo View */}
          <div className="lg:hidden">
            <DCNLogo size="sm" variant="icon-only" />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
              GESTÃO DE DCNs • CTDI
            </span>
            <span className="text-xs text-slate-300 hidden sm:inline">/</span>
            <span className="text-sm font-bold text-[#00386e] font-sans">
              {tabLabels[activeTab] || 'Visão Geral'}
            </span>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons & Authenticated User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Notification Bell Icon & Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setBellOpen(!bellOpen)}
              className="relative p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Central de Alertas e Notificações Recorrentes"
            >
              <Bell className="w-4 h-4 text-[#00386e]" />
              {alertSummary.totalAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                  {alertSummary.totalAlerts}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-xs">
                <div className="p-3.5 bg-[#00386e] text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-cyan-300" />
                    <span className="font-bold">Alertas de SLA & DCNs</span>
                  </div>
                  <span className="text-[10px] font-semibold bg-white/15 px-2 py-0.5 rounded-full">
                    {alertSummary.pendingCount} pendente(s)
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {alertSummary.overdueList.map(dcn => (
                    <div
                      key={`ov-${dcn.id}`}
                      onClick={() => {
                        setBellOpen(false);
                        onSelectDCN?.(dcn.id);
                      }}
                      className="p-3 hover:bg-rose-50/50 cursor-pointer flex items-start space-x-2.5"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-rose-700">{dcn.dcnNumber}</span>
                          <span className="text-[10px] font-bold text-rose-600">SLA Vencido</span>
                        </div>
                        <p className="font-semibold text-slate-900 truncate">{dcn.title}</p>
                        <p className="text-[10px] text-slate-500">
                          Resp: {dcn.responsible} • Venceu em {formatDate(dcn.dueDate)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {alertSummary.approachingList.map(dcn => {
                    const days = getDaysRemaining(dcn.dueDate);
                    return (
                      <div
                        key={`ap-${dcn.id}`}
                        onClick={() => {
                          setBellOpen(false);
                          onSelectDCN?.(dcn.id);
                        }}
                        className="p-3 hover:bg-amber-50/50 cursor-pointer flex items-start space-x-2.5"
                      >
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-amber-800">{dcn.dcnNumber}</span>
                            <span className="text-[10px] font-bold text-amber-700">
                              Vence em {days} dia(s)
                            </span>
                          </div>
                          <p className="font-semibold text-slate-900 truncate">{dcn.title}</p>
                          <p className="text-[10px] text-slate-500">
                            Resp: {dcn.responsible} • SLA: {formatDate(dcn.dueDate)}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {alertSummary.totalAlerts === 0 && (
                    <div className="p-6 text-center text-slate-400">
                      Nenhuma DCN vencida ou próxima do vencimento (≤ 5 dias).
                    </div>
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setBellOpen(false);
                      onNavigateToTab?.('notifications');
                    }}
                    className="w-full py-1.5 px-3 rounded-xl text-xs font-bold text-[#00386e] hover:bg-indigo-50 flex items-center justify-center cursor-pointer"
                  >
                    <span>Gerenciar Notificações Recorrentes</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Export CSV Button */}
          <button
            onClick={() => exportDCNsToCSV(filteredDCNs)}
            className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Exportar CSV"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            <span>CSV</span>
          </button>

          {/* New DCN Button (RBAC: Admin and Engineer only) */}
          {canCreateDCN && (
            <button
              onClick={onOpenNewDCN}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-xl text-white bg-[#00386e] hover:bg-[#002b55] shadow-xs transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 mr-1.5 text-cyan-300" />
              <span>Nova DCN</span>
            </button>
          )}

          {/* User Information & Logout (Style OLP_WEB) */}
          {currentUser && (
            <div className="flex items-center pl-2 sm:pl-3 border-l border-slate-200 space-x-2.5">
              
              {/* User Avatar Circle */}
              <div 
                className="w-8 h-8 rounded-xl bg-[#00386e] text-white flex items-center justify-center text-xs font-bold ring-2 ring-cyan-400/40 shadow-xs shrink-0 select-none"
                title={`${currentUser.nome} (${currentUser.login})`}
              >
                {userInitials}
              </div>

              {/* Login & Role Badge Details */}
              <div className="hidden md:flex flex-col text-left leading-tight">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-800 tracking-tight font-mono">
                    {currentUser.login}
                  </span>
                  {isOfflineMode && (
                    <span title="Operando em contingência offline" className="inline-flex items-center text-amber-600">
                      <WifiOff className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="mt-0.5">
                  <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border tracking-wider ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                    {roleBadge.label}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                title="Sair do sistema (Logout)"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>

            </div>
          )}

        </div>

      </div>
    </header>
  );
};

