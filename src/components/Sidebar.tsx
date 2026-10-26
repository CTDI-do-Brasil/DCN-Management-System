import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Boxes, 
  GraduationCap, 
  BarChart3, 
  Search, 
  ShieldCheck, 
  PlusCircle, 
  Download, 
  RotateCcw,
  User,
  X,
  Layers,
  ChevronRight,
  Sparkles,
  Users,
  LogOut,
  Lock
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { useAuth } from '../context/AuthContext';
import { exportDCNsToCSV } from '../utils/helpers';
import { DCNLogo } from './DCNLogo';
import { CTDILogo } from './CTDILogo';

export type AppNavTab = 'dashboard' | 'dcns' | 'materials' | 'trainings' | 'technicians' | 'users' | 'metrics' | 'search';

interface SidebarProps {
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  onOpenNewDCN: () => void;
  onOpenAuditReport: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewDCN,
  onOpenAuditReport,
  isOpenMobile,
  onCloseMobile
}) => {
  const { dcns, filteredDCNs, stats, resetToDefaultData, technicians } = useDCN();
  const { currentUser, logout, canCreateDCN, roleBadge, userInitials, isAdmin } = useAuth();


  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Início',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'dcns' as const,
      label: 'Gestão de DCNs',
      icon: FileText,
      badge: dcns.length
    },
    {
      id: 'materials' as const,
      label: 'Controle de Materiais',
      icon: Boxes,
      badge: stats.pendingMaterialsCount > 0 ? stats.pendingMaterialsCount : null,
      badgeColor: 'bg-amber-400 text-slate-900 font-bold'
    },
    {
      id: 'trainings' as const,
      label: 'Matriz de Treinamentos',
      icon: GraduationCap,
      badge: stats.pendingTrainingsCount > 0 ? stats.pendingTrainingsCount : null,
      badgeColor: 'bg-cyan-400 text-slate-900 font-bold'
    },
    {
      id: 'technicians' as const,
      label: 'Cadastro de Técnicos',
      icon: Users,
      badge: technicians.length,
      badgeColor: 'bg-indigo-400 text-slate-900 font-bold'
    },
    ...(isAdmin
      ? [
          {
            id: 'users' as const,
            label: 'Gestão de Usuários',
            icon: ShieldCheck,
            badge: 'ADMIN',
            badgeColor: 'bg-rose-400 text-slate-950 font-extrabold'
          }
        ]
      : []),
    {
      id: 'metrics' as const,
      label: 'Métricas & Dashboard',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'search' as const,
      label: 'Consulta & Exportação',
      icon: Search,
      badge: null
    }
  ];

  const handleNavClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#00386e] text-white flex flex-col transition-transform duration-300 ease-in-out border-r border-[#002b55] shadow-xl
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Top Branding Section (Matching reference with Cyan Badge + CTDI Diamonds) */}
        <div className="p-5 pb-4 border-b border-[#004e8f]/60">
          
          {/* Close button for mobile */}
          <div className="flex lg:hidden justify-end mb-2">
            <button 
              onClick={onCloseMobile}
              className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-[#004e8f]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Logo Header (Official DCN Engineering Control branding) */}
          <div className="mb-4">
            <DCNLogo size="md" variant="full" textColor="white" />
          </div>

          {/* CTDI Official 3D Metallic Diamond Logo inside preserved dark blue container */}
          <div className="flex items-center justify-center py-2 px-1.5 rounded-lg bg-[#002a54] border border-[#004e8f]/80 shadow-inner">
            <CTDILogo className="h-11 w-full max-w-[255px]" />
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          
          <div>
            <div className="px-3 mb-2">
              <span className="text-[10px] font-extrabold tracking-widest text-cyan-300 uppercase">
                MENU
              </span>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left group
                      ${isActive 
                        ? 'bg-[#005a9c] text-white shadow-md border-l-4 border-[#00a8e8] pl-2.5 ring-1 ring-cyan-400/30' 
                        : 'text-slate-200 hover:bg-[#004e8f]/60 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-[#00a8e8]' : 'text-slate-300 group-hover:text-cyan-200'
                      }`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== null && (
                      <span className={`
                        px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0
                        ${item.badgeColor || (isActive ? 'bg-cyan-400 text-slate-900' : 'bg-[#002c59] text-cyan-200')}
                      `}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Primary Actions in Sidebar (RBAC: Admin e Engenharia) */}
          {canCreateDCN && (
            <div className="pt-2 border-t border-[#004e8f]/50 space-y-2">
              <div className="px-3 mb-1">
                <span className="text-[10px] font-extrabold tracking-widest text-cyan-300 uppercase">
                  AÇÕES RÁPIDAS
                </span>
              </div>

              <button
                onClick={() => {
                  onOpenNewDCN();
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 bg-[#00a8e8] hover:bg-[#0095d1] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nova DCN</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer / User Profile in Sidebar (Estilo Corporativo CTDI) */}
        <div className="p-3 bg-[#00284f] border-t border-[#004077] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#005a9c] flex items-center justify-center text-white text-xs font-bold ring-1 ring-cyan-400/40 shrink-0">
                {userInitials}
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-white leading-tight truncate max-w-[110px]" title={currentUser?.nome || 'Usuário'}>
                  {currentUser?.nome || 'Usuário'}
                </p>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
                  <p className="text-[10px] text-cyan-200 font-medium truncate max-w-[100px]">
                    {roleBadge.label}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {/* Botão de Logout */}
              <button
                onClick={logout}
                title="Sair do sistema (Logout)"
                className="p-1.5 text-slate-300 hover:text-rose-400 hover:bg-[#003d73] rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>

              {/* Botão de restaurar dados de teste */}
              <button
                onClick={resetToDefaultData}
                title="Restaurar dados de demonstração"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-[#003d73] rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </aside>
    </>
  );
};
