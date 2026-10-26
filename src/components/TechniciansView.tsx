import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Award, 
  GraduationCap, 
  Edit, 
  Trash2, 
  Eye, 
  Plus, 
  X, 
  Check, 
  Download, 
  ShieldCheck, 
  Briefcase, 
  Factory, 
  Phone, 
  Mail, 
  UserCheck, 
  AlertCircle,
  Link2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useDCN } from '../context/DCNContext';
import { useAuth } from '../context/AuthContext';
import { Technician, DCN } from '../types';
import { formatDate } from '../utils/helpers';

interface TechniciansViewProps {
  onSelectDCN?: (dcnId: string) => void;
}

export const TechniciansView: React.FC<TechniciansViewProps> = ({ onSelectDCN }) => {
  const { 
    technicians, 
    dcns, 
    addTechnician, 
    updateTechnician, 
    deleteTechnician, 
    toggleTechnicianStatus,
    assignTechniciansToDCN
  } = useDCN();

  const { canManageTechnicians, canDeleteTechnicians, isOperator } = useAuth();


  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [viewingTech, setViewingTech] = useState<Technician | null>(null);
  const [assignModalTech, setAssignModalTech] = useState<Technician | null>(null);
  const [selectedDCNsToAssign, setSelectedDCNsToAssign] = useState<string[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    active: true,
    notes: ''
  });


  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Filtered Technicians
  const filteredTechnicians = useMemo(() => {
    return technicians.filter(tech => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const matchName = tech.name.toLowerCase().includes(q);
        const matchRole = tech.role.toLowerCase().includes(q);
        const matchEmail = tech.email?.toLowerCase().includes(q);
        const matchSkills = tech.skills?.some(s => s.toLowerCase().includes(q));
        if (!matchName && !matchRole && !matchEmail && !matchSkills) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ACTIVE' && !tech.active) return false;
        if (statusFilter === 'INACTIVE' && tech.active) return false;
      }

      return true;
    });
  }, [technicians, search, statusFilter]);

  // Statistics
  const totalCount = technicians.length;
  const activeCount = technicians.filter(t => t.active).length;
  const totalCompletedTrainings = technicians.reduce((acc, t) => acc + (t.trainedDCNIds?.length || 0), 0);
  const pendingDCNsWithTraining = dcns.filter(d => d.needsTraining && d.training && d.training.status !== 'CONCLUIDO');

  // Open Edit Modal
  const handleOpenEdit = (tech: Technician) => {
    setEditingTech(tech);
    setFormData({
      name: tech.name,
      role: tech.role,
      email: tech.email || '',
      active: tech.active,
      notes: tech.notes || ''
    });
    setFormErrors({});
    setIsNewModalOpen(true);
  };

  // Open New Modal
  const handleOpenNew = () => {
    setEditingTech(null);
    setFormData({
      name: '',
      role: '',
      email: '',
      active: true,
      notes: ''
    });
    setFormErrors({});
    setIsNewModalOpen(true);
  };

  // Submit New or Edit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!formData.name.trim()) errors.name = 'Nome completo é obrigatório';
    if (!formData.role.trim()) errors.role = 'Cargo/Função é obrigatório';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingTech) {
      updateTechnician(editingTech.id, {
        name: formData.name.trim(),
        role: formData.role.trim(),
        email: formData.email.trim() || undefined,
        active: formData.active,
        skills: editingTech.skills || [],
        notes: formData.notes.trim() || undefined
      });
    } else {
      addTechnician({
        name: formData.name.trim(),
        role: formData.role.trim(),
        email: formData.email.trim() || undefined,
        active: formData.active,
        skills: [],
        notes: formData.notes.trim() || undefined
      });
    }


    setIsNewModalOpen(false);
    setEditingTech(null);
  };

  // Handle Quick Assign to DCNs
  const handleOpenAssignModal = (tech: Technician) => {
    setAssignModalTech(tech);
    setSelectedDCNsToAssign([]);
  };

  const handleConfirmAssign = () => {
    if (!assignModalTech || selectedDCNsToAssign.length === 0) return;

    selectedDCNsToAssign.forEach(dcnId => {
      assignTechniciansToDCN(dcnId, [assignModalTech.id]);
    });

    setAssignModalTech(null);
    setSelectedDCNsToAssign([]);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Nome', 'Cargo', 'Status', 'DCNs Treinadas', 'Email'];
    const rows = filteredTechnicians.map(t => [
      `"${t.name}"`,
      `"${t.role}"`,
      t.active ? 'Ativo' : 'Inativo',
      t.trainedDCNIds.length,
      t.email || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tecnicos_capacitacao_dcn_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" id="technicians-management-view">
      
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Cadastro de Técnicos & Operadores de Manufatura
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Base centralizada de colaboradores fabris para associação em atas de treinamento das DCNs (ISO 9001:2015 item 7.2 / 8.5.6)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-start lg:self-center">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-3 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors shadow-xs"
            title="Exportar base de técnicos em CSV"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Exportar CSV
          </button>

          {canManageTechnicians ? (
            <button
              onClick={handleOpenNew}
              id="btn-novo-tecnico"
              className="inline-flex items-center px-3.5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Cadastrar Novo Técnico
            </button>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
              Modo Leitura (Apenas Engenharia / Admin podem cadastrar)
            </span>
          )}
        </div>
      </div>


      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Técnicos Registrados</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Colaboradores no banco de dados</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Ativos na Produção</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{activeCount}</p>
          <p className="text-[11px] text-emerald-600/90 mt-1 font-medium">{totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0}% aptos para escalas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">DCNs Concluídas</span>
            <Award className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-sky-700">{totalCompletedTrainings}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Certificações registradas em atas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">DCNs Aguardando Treinamento</span>
            <GraduationCap className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700">{pendingDCNsWithTraining.length}</p>
          <p className="text-[11px] text-amber-700/80 mt-1 font-medium">Prontas para vinculação de turma</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, cargo ou e-mail..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-3 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-medium"
            >
              <option value="ALL">Status: Todos</option>
              <option value="ACTIVE">Apenas Ativos</option>
              <option value="INACTIVE">Apenas Inativos</option>
            </select>
          </div>

        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>Mostrando <strong>{filteredTechnicians.length}</strong> de <strong>{totalCount}</strong> técnicos cadastrados</span>
          
          {(search || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Technicians List Table */}
      {filteredTechnicians.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
          <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-700">Nenhum técnico encontrado com os filtros aplicados.</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Tente redefinir a busca ou clique no botão acima para realizar um novo cadastro de técnico.
          </p>
          <button
            onClick={handleOpenNew}
            className="mt-4 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
          >
            Cadastrar Novo Técnico
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-600 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-left">Colaborador</th>
                  <th className="py-3 px-4 text-left">Cargo / Especialidade</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">DCNs Treinadas</th>
                  <th className="py-3 px-4 text-right">Ações</th>

                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredTechnicians.map(tech => {
                  const trainedCount = tech.trainedDCNIds?.length || 0;

                  return (
                    <tr key={tech.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {tech.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 text-xs">{tech.name}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                              {tech.email && (
                                <span className="flex items-center">
                                  <Mail className="w-3 h-3 mr-1 text-slate-400" />
                                  {tech.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{tech.role}</p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div>
                          <button
                            onClick={() => toggleTechnicianStatus(tech.id)}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                              tech.active 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' 
                                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                            }`}
                            title="Clique para alternar status ativo/inativo"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${tech.active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {tech.active ? 'Ativo na Linha' : 'Inativo / Afastado'}
                          </button>
                        </div>
                      </td>

                      {/* DCNs Trained */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${
                            trainedCount > 0 
                              ? 'bg-sky-50 text-sky-800 border-sky-200' 
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            <Award className="w-3.5 h-3.5 mr-1" />
                            {trainedCount} {trainedCount === 1 ? 'DCN' : 'DCNs'}
                          </span>

                          <button
                            onClick={() => setViewingTech(tech)}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline font-semibold"
                          >
                            Ver Histórico
                          </button>
                        </div>
                      </td>

                      {/* Actions */}

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setViewingTech(tech)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                            title="Visualizar Ficha Completa"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canManageTechnicians && (
                            <>
                              <button
                                onClick={() => handleOpenAssignModal(tech)}
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-colors"
                                title="Associar a Treinamento de DCN"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenEdit(tech)}
                                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                                title="Editar Dados do Técnico"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {canDeleteTechnicians && (
                            <button
                              onClick={() => {
                                if (window.confirm(`[ADMIN] Deseja realmente remover o técnico ${tech.name}?`)) {
                                  deleteTechnician(tech.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                              title="Excluir Técnico (Exclusivo Administrador)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CADASTRO / EDIÇÃO DE TÉCNICO
          ======================================================== */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-indigo-600 text-white">
                  {editingTech ? <Edit className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingTech ? 'Editar Ficha do Técnico' : 'Cadastrar Novo Técnico / Operador'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Registro individual para inclusão nas atas de treinamento de DCN
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs">
              
              {/* Nome Completo */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome Completo do Colaborador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo de Souza"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white ${formErrors.name ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300'}`}
                />
                {formErrors.name && <p className="text-[10px] text-rose-600 mt-0.5">{formErrors.name}</p>}
              </div>

              {/* Cargo / Especialidade */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cargo / Especialidade *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Técnico Eletrônico Pleno"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white ${formErrors.role ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300'}`}
                />
                {formErrors.role && <p className="text-[10px] text-rose-600 mt-0.5">{formErrors.role}</p>}
              </div>

              {/* E-mail Corporativo */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  E-mail Corporativo
                </label>
                <input
                  type="email"
                  placeholder="nome.sobrenome@empresa.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              {/* Observações */}
              <div>

                <label className="block font-semibold text-slate-700 mb-1">
                  Observações & Histórico Interno
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Treinado em NR-10 e NR-12. Responsável pelo posto 4."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                ></textarea>
              </div>

              {/* Status Ativo */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="tech-active-check"
                  checked={formData.active}
                  onChange={e => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <label htmlFor="tech-active-check" className="font-semibold text-slate-800 cursor-pointer">
                  Técnico Ativo (Apto a ser escalado e receber treinamentos de DCN)
                </label>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs"
                >
                  {editingTech ? 'Salvar Alterações' : 'Cadastrar Técnico'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ASSOCIAR TÉCNICO A UMA DCN
          ======================================================== */}
      {assignModalTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Vincular a Treinamento de DCN
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Colaborador: <strong>{assignModalTech.name}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setAssignModalTech(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Selecione quais DCNs com treinamento pendente você deseja associar este colaborador na lista de presença:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
              {pendingDCNsWithTraining.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Não há DCNs com treinamento pendente no momento.
                </div>
              ) : (
                pendingDCNsWithTraining.map(dcn => {
                  const isSelected = selectedDCNsToAssign.includes(dcn.id);
                  const alreadyAttendee = dcn.training?.attendeesList?.some(
                    a => a.technicianId === assignModalTech.id || a.name === assignModalTech.name || (assignModalTech.badge && a.badge === assignModalTech.badge)
                  );

                  return (
                    <div
                      key={dcn.id}
                      onClick={() => {
                        if (alreadyAttendee) return;
                        if (isSelected) {
                          setSelectedDCNsToAssign(prev => prev.filter(id => id !== dcn.id));
                        } else {
                          setSelectedDCNsToAssign(prev => [...prev, dcn.id]);
                        }
                      }}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        alreadyAttendee
                          ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-indigo-700">{dcn.dcnNumber}</span>
                          <span className="text-[10px] text-slate-500">Área: {dcn.area}</span>
                        </div>
                        <p className="font-medium text-slate-800 text-[11px] line-clamp-1">{dcn.title}</p>
                      </div>

                      <div>
                        {alreadyAttendee ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Já Inscrito
                          </span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-medium">
                {selectedDCNsToAssign.length} DCN(s) selecionada(s)
              </span>

              <div className="flex space-x-2">
                <button
                  onClick={() => setAssignModalTech(null)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmAssign}
                  disabled={selectedDCNsToAssign.length === 0}
                  className="px-4 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold shadow-xs"
                >
                  Confirmar Vínculo
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: HISTÓRICO DE QUALIFICAÇÃO DO TÉCNICO
          ======================================================== */}
      {viewingTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-scale-in">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg">
                  {viewingTech.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900">{viewingTech.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {viewingTech.role}
                  </p>
                </div>
              </div>

              <button onClick={() => setViewingTech(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ficha Rápida */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 text-[10px] block">Status Funcional:</span>
                <span className={`font-bold ${viewingTech.active ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {viewingTech.active ? 'Ativo na Fábrica' : 'Inativo'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Data de Cadastro:</span>
                <span className="font-semibold text-slate-800">{formatDate(viewingTech.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">E-mail:</span>
                <span className="font-medium text-slate-700 truncate block">{viewingTech.email || 'Não informado'}</span>
              </div>
            </div>

            {/* DCNs Treinadas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                  <Award className="w-4 h-4 mr-1.5 text-indigo-600" />
                  DCNs Concluídas e Certificadas ({viewingTech.trainedDCNIds?.length || 0})
                </h4>
              </div>

              {viewingTech.trainedDCNIds && viewingTech.trainedDCNIds.length > 0 ? (
                <div className="space-y-2">
                  {viewingTech.trainedDCNIds.map(dcnId => {
                    const foundDCN = dcns.find(d => d.id === dcnId || d.dcnNumber === dcnId);
                    return (
                      <div 
                        key={dcnId}
                        className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              {foundDCN ? foundDCN.dcnNumber : dcnId}
                            </span>
                            <span className="text-slate-700 font-semibold">{foundDCN?.title || 'DCN de Engenharia'}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Instrutor: {foundDCN?.training?.instructor || 'Engenharia'} • Conclusão: {foundDCN?.training?.completionDate ? formatDate(foundDCN.training.completionDate) : 'Homologado'}
                          </p>
                        </div>

                        {foundDCN && onSelectDCN && (
                          <button
                            onClick={() => {
                              setViewingTech(null);
                              onSelectDCN(foundDCN.id);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 flex items-center"
                          >
                            Abrir DCN
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs">
                  Nenhum treinamento de DCN concluído até o momento para este técnico.
                </div>
              )}
            </div>

            {/* Competências */}
            {viewingTech.skills && viewingTech.skills.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-1.5">Matriz de Competências & Habilidades:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {viewingTech.skills.map((skill, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            {viewingTech.notes && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 block mb-0.5">Observação da Supervisão:</span>
                <p className="text-amber-800">{viewingTech.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setViewingTech(null)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
              >
                Fechar Ficha
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
