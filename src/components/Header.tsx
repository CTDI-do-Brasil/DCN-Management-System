import React from 'react';
import { 
  FileCheck2, 
  PlusCircle, 
  LayoutDashboard, 
  ListFilter, 
  Boxes, 
  GraduationCap, 
  Download, 
  RotateCcw,
  ShieldCheck,
  Search,
  Bell,
  Sparkles
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { exportDCNsToCSV } from '../utils/helpers';

interface HeaderProps {
  activeTab: 'dashboard' | 'dcns' | 'materials' | 'trainings';
  setActiveTab: (tab: 'dashboard' | 'dcns' | 'materials' | 'trainings') => void;
  onOpenNewDCN: () => void;
  onOpenAuditReport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewDCN,
  onOpenAuditReport
}) => {
  const { dcns, filteredDCNs, stats, currentEngineer, resetToDefaultData } = useDCN();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm ring-2 ring-indigo-500/20">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">
                  DCN Control Center
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Engenharia & Qualidade
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Document Change Notice Management • Ciclo Completo & Auditoria
              </p>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Quick Export Button */}
            <button
              onClick={() => exportDCNsToCSV(filteredDCNs)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
              title="Exportar dados filtrados para CSV / Excel"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span className="hidden md:inline">Exportar CSV</span>
            </button>

            {/* Audit Report Button */}
            <button
              onClick={onOpenAuditReport}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
              title="Gerar Dossiê de Auditoria ISO 9001 / IATF"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              <span className="hidden sm:inline">Dossiê de Auditoria</span>
            </button>

            {/* New DCN Button */}
            <button
              onClick={onOpenNewDCN}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Nova DCN
            </button>

            {/* Engineer Profile Chip */}
            <div className="hidden lg:flex items-center pl-3 border-l border-slate-200 text-left">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold ring-2 ring-slate-200">
                CE
              </div>
              <div className="ml-2 text-xs">
                <p className="font-semibold text-slate-900 leading-tight">{currentEngineer.name.split(' ')[0]} {currentEngineer.name.split(' ')[1]}</p>
                <p className="text-slate-500 text-[10px]">Eng. de Processos</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="bg-slate-50 border-t border-slate-200/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="flex space-x-1 sm:space-x-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-md'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
              Módulo 1: Dashboard Executivo
            </button>

            <button
              onClick={() => setActiveTab('dcns')}
              className={`flex items-center px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'dcns'
                  ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-md'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 mr-1.5" />
              Módulo 2: Gestão de DCNs
              <span className="ml-2 px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px]">
                {dcns.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('materials')}
              className={`hidden sm:flex items-center px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'materials'
                  ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-md'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Boxes className="w-3.5 h-3.5 mr-1.5" />
              Controle de Materiais
              {stats.pendingMaterialsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[10px] font-bold">
                  {stats.pendingMaterialsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('trainings')}
              className={`hidden sm:flex items-center px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'trainings'
                  ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs rounded-t-md'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
              Matriz de Treinamentos
              {stats.pendingTrainingsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-sky-100 text-sky-800 border border-sky-300 rounded-full text-[10px] font-bold">
                  {stats.pendingTrainingsCount}
                </span>
              )}
            </button>
          </nav>

          {/* Reset Demo Data Button */}
          <div className="flex items-center space-x-2 py-1.5">
            <button
              onClick={resetToDefaultData}
              className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center hover:underline transition-colors"
              title="Restaurar dados iniciais de demonstração"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset Demo
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
