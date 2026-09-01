import React from 'react';
import { 
  Menu, 
  Search, 
  Download, 
  ShieldCheck, 
  PlusCircle, 
  Bell, 
  FileCheck2,
  Layers,
  Sparkles
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { exportDCNsToCSV } from '../utils/helpers';
import { DCNLogo } from './DCNLogo';

interface TopNavbarProps {
  onToggleMobileMenu: () => void;
  activeTab: string;
  onOpenNewDCN: () => void;
  onOpenAuditReport?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onToggleMobileMenu,
  activeTab,
  onOpenNewDCN
}) => {
  const { filteredDCNs, currentEngineer } = useDCN();

  const tabLabels: Record<string, string> = {
    dashboard: 'Início',
    dcns: 'Gestão de DCNs',
    materials: 'Controle de Materiais',
    trainings: 'Matriz de Treinamentos',
    technicians: 'Cadastro de Técnicos & Qualidade',
    metrics: 'Métricas & Dashboard',
    search: 'Consulta & Exportação'
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs px-4 sm:px-6 lg:px-8 py-3">
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

        {/* Right Side: Quick Action Buttons & Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Quick Export CSV Button */}
          <button
            onClick={() => exportDCNsToCSV(filteredDCNs)}
            className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Exportar CSV"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            <span>CSV</span>
          </button>

          {/* New DCN Button */}
          <button
            onClick={onOpenNewDCN}
            className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-xl text-white bg-[#00386e] hover:bg-[#002b55] shadow-xs transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4 mr-1.5 text-cyan-300" />
            <span>Nova DCN</span>
          </button>

          {/* Engineer Avatar */}
          <div className="flex items-center pl-2 sm:pl-3 border-l border-slate-200 text-left">
            <div className="w-8 h-8 rounded-xl bg-[#00386e] text-white flex items-center justify-center text-xs font-bold ring-2 ring-cyan-400/30 shadow-xs">
              CE
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
