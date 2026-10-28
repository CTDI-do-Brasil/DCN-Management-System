import React from 'react';
import { 
  PlusCircle, 
  FileCheck, 
  ShieldCheck, 
  Layers, 
  Search, 
  Boxes, 
  GraduationCap,
  Sparkles,
  Barcode,
  ArrowRight
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { DCNLogo } from './DCNLogo';

interface HeroActionHubProps {
  onOpenNewDCN: () => void;
  onOpenAuditReport: () => void;
  onNavigateToDCNs: (statusFilter?: string) => void;
  onNavigateToTab: (tab: 'dashboard' | 'dcns' | 'materials' | 'trainings' | 'metrics' | 'search') => void;
}

export const HeroActionHub: React.FC<HeroActionHubProps> = ({
  onOpenNewDCN,
  onOpenAuditReport,
  onNavigateToDCNs,
  onNavigateToTab
}) => {
  const { stats, dcns } = useDCN();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-10 mb-6 text-center">
      
      {/* Centered DCN Icon Badge */}
      <div className="w-20 h-20 rounded-2xl bg-[#00386e] text-white flex items-center justify-center mx-auto mb-4 ring-8 ring-[#e8f4fd] shadow-md">
        <DCNLogo size="lg" variant="icon-only" />
      </div>

      {/* Main Title & Subtitle */}
      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
        Controle de DCN
      </h2>
      
      <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto mb-8 leading-relaxed">
        Gerencie e rastreie o ciclo completo de Document Change Notice: parecer técnico da engenharia, suprimento de materiais e capacitação de operadores.
      </p>

      {/* Action Buttons (Strictly styled like the reference image) */}
      <div className="max-w-md mx-auto space-y-3">
        
        {/* Button 1: Deep Navy Blue */}
        <button
          onClick={onOpenNewDCN}
          className="w-full py-3.5 px-6 rounded-xl bg-[#00386e] hover:bg-[#002850] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2.5 active:scale-[0.99] cursor-pointer"
        >
          <PlusCircle className="w-5 h-5 text-cyan-300" />
          <span>Cadastrar Nova DCN</span>
        </button>

        {/* Button 2: Vibrant Cyan Accent */}
        <button
          onClick={() => onNavigateToTab('dcns')}
          className="w-full py-3.5 px-6 rounded-xl bg-[#00a8e8] hover:bg-[#0096d6] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2.5 active:scale-[0.99] cursor-pointer"
        >
          <Layers className="w-5 h-5 text-white" />
          <span>Acessar Fila & Kanban de Alterações ({dcns.length})</span>
        </button>

      </div>

      {/* Quick KPI stats pill below */}
      <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div 
          onClick={() => onNavigateToDCNs('RECEBIDA')}
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <span className="text-[11px] text-slate-500 block font-medium">Em Triagem</span>
          <span className="text-base font-extrabold text-[#00386e]">{stats.receivedCount}</span>
        </div>
        <div 
          onClick={() => onNavigateToDCNs('AGUARDANDO_MATERIAL')}
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <span className="text-[11px] text-slate-500 block font-medium">Aguardando Materiais</span>
          <span className="text-base font-extrabold text-blue-600">{stats.awaitingMaterialCount}</span>
        </div>
        <div 
          onClick={() => onNavigateToTab('trainings')}
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <span className="text-[11px] text-slate-500 block font-medium">Treinamentos</span>
          <span className="text-base font-extrabold text-cyan-600">{stats.pendingTrainingsCount} pendentes</span>
        </div>
        <div 
          onClick={() => onNavigateToDCNs('ENCERRADA')}
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <span className="text-[11px] text-slate-500 block font-medium">Auditadas / Encerradas</span>
          <span className="text-base font-extrabold text-emerald-600">{stats.closedCount}</span>
        </div>
      </div>

    </div>
  );
};
