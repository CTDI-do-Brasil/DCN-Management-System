import React, { useState } from 'react';
import { Info, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';

export const GuidanceBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all mb-6">
      
      {/* Accordion Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 bg-white flex items-center justify-between hover:bg-slate-50/70 transition-colors text-left"
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center text-[#00386e]">
            <Info className="w-3.5 h-3.5 text-[#00386e]" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-[#00386e]">
            Diretrizes & Recomendações para Gestão de DCNs (ISO 9001 / IATF 16949)
          </span>
        </div>

        <div className="text-slate-400 p-1 rounded-md hover:bg-slate-100">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="px-6 py-4 pt-1 border-t border-slate-100 bg-white text-xs text-slate-700 space-y-2.5 animate-fade-in">
          <ol className="space-y-2 text-slate-700 leading-relaxed list-none">
            <li className="flex items-start space-x-2">
              <span className="font-bold text-[#00386e] shrink-0">1.</span>
              <span><strong>Registro Formal & Código Único:</strong> Cadastre cada alteração com o código rastreável e anexe o PDF oficial do cliente ou da Engenharia.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="font-bold text-[#00386e] shrink-0">2.</span>
              <span><strong>Análise Técnica e FMEA:</strong> Avalie impactos em processos, gabaritos, tolerâncias mecânicas e homologação de novos componentes.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="font-bold text-[#00386e] shrink-0">3.</span>
              <span><strong>Inspeção de Materiais (CQ):</strong> Verifique recebimento físico e aprovação dimensional antes de liberar a DCN para o chão de fábrica.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="font-bold text-[#00386e] shrink-0">4.</span>
              <span><strong>Capacitação dos Colaboradores:</strong> Conclua e registre a lista de presença com ata de treinamento para garantir conformidade em auditorias.</span>
            </li>
          </ol>
        </div>
      )}

    </div>
  );
};
