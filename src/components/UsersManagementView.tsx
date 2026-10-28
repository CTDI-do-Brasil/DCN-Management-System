import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  Edit,
  Trash2,
  X,
  Check,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  KeyRound,
  UserCheck,
  Wrench,
  HardHat
} from 'lucide-react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { useAuth, getUserInitials, getRoleBadgeInfo } from '../context/AuthContext';

const USER_FORMAT_REGEX = /^[A-Z0-9\-_]+\.[A-Z0-9\-_]+$/;

export const UsersManagementView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State (Criar / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<{
    nome: string;
    login: string;
    email: string;
    role: UserRole;
    senha: string;
  }>({
    nome: '',
    login: '',
    email: '',
    role: 'ENGINEER',
    senha: ''
  });

  // Modal de Confirmação de Exclusão
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao carregar usuários do sistema.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (search) {
        const q = search.toLowerCase();
        const matchName = u.nome.toLowerCase().includes(q);
        const matchLogin = u.login.toLowerCase().includes(q);
        if (!matchName && !matchLogin) return false;
      }
      if (roleFilter !== 'ALL' && u.role !== roleFilter) {
        return false;
      }
      return true;
    });
  }, [users, search, roleFilter]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter(u => u.role === 'ADMIN').length,
      engineers: users.filter(u => u.role === 'ENGINEER').length,
      operators: users.filter(u => u.role === 'OPERATOR').length
    };
  }, [users]);

  const handleOpenNew = () => {
    setEditingUser(null);
    setFormError(null);
    setShowPassword(false);
    setFormData({
      nome: '',
      login: '',
      email: '',
      role: 'ENGINEER',
      senha: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormError(null);
    setShowPassword(false);
    setFormData({
      nome: user.nome,
      login: user.login,
      email: user.email || `${user.login.toLowerCase()}@ctdi.com`,
      role: user.role,
      senha: '' // Em branco mantém a senha atual
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedNome = formData.nome.trim();
    const trimmedLogin = formData.login.trim().toUpperCase();
    const trimmedSenha = formData.senha;

    if (!trimmedNome) {
      setFormError('Informe o nome completo do usuário.');
      return;
    }

    if (!trimmedLogin || !USER_FORMAT_REGEX.test(trimmedLogin)) {
      setFormError('Formato de login inválido! Utilize NOME.SOBRENOME (ex: JOAO.SILVA).');
      return;
    }

    if (!editingUser && (!trimmedSenha || trimmedSenha.trim().length < 3)) {
      setFormError('Defina uma senha inicial com pelo menos 3 caracteres.');
      return;
    }

    if (editingUser && trimmedSenha && trimmedSenha.trim().length > 0 && trimmedSenha.trim().length < 3) {
      setFormError('A nova senha deve conter pelo menos 3 caracteres.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingUser) {
        const updated = await api.updateUser(editingUser.id, {
          nome: trimmedNome,
          login: trimmedLogin,
          email: formData.email.trim() || `${trimmedLogin.toLowerCase()}@ctdi.com`,
          role: formData.role,
          ...(trimmedSenha.trim().length > 0 ? { senha: trimmedSenha } : {})
        });
        setUsers(prev => prev.map(u => (u.id === editingUser.id ? updated : u)));
        setFeedback({
          type: 'success',
          message: `Usuário "${updated.login}" atualizado com sucesso!`
        });
      } else {
        const created = await api.createUser({
          nome: trimmedNome,
          login: trimmedLogin,
          email: formData.email.trim() || `${trimmedLogin.toLowerCase()}@ctdi.com`,
          role: formData.role,
          senha: trimmedSenha
        });
        setUsers(prev => [...prev, created]);
        setFeedback({
          type: 'success',
          message: `Usuário "${created.login}" cadastrado com sucesso!`
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Falha ao salvar usuário.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await api.deleteUser(deletingUser.id);
      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      setFeedback({
        type: 'success',
        message: `Usuário "${deletingUser.login}" removido do sistema.`
      });
      setDeletingUser(null);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Não foi possível excluir o usuário.'
      });
      setDeletingUser(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const getRolePermissionsDescription = (role: UserRole): string => {
    switch (role) {
      case 'ADMIN':
        return 'Acesso total: DCNs, Materiais, Técnicos, Auditoria, Exclusões e Gestão de Usuários';
      case 'ENGINEER':
        return 'Criar e editar DCNs, Avaliação Técnica, Materiais, Treinamentos e Técnicos';
      case 'OPERATOR':
      default:
        return 'Consulta de DCNs, assinatura de treinamentos e visualização operacional';
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-3 text-rose-600">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Acesso Restrito ao Administrador</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Apenas usuários com perfil <strong>ADMINISTRADOR</strong> têm permissão para gerenciar contas de acesso e senhas do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Gestão de Usuários & Acessos
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {users.length} {users.length === 1 ? 'usuário' : 'usuários'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cadastre novos usuários corporativos, gerencie perfis de permissão (Administrador, Engenharia, Operador).
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={loadUsers}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Recarregar lista do banco de dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>

            <button
              onClick={handleOpenNew}
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#00386e] hover:bg-[#002b55] shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <UserPlus className="w-4 h-4 mr-1.5 text-cyan-300" />
              <span>+ Novo Usuário</span>
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 rounded-lg hover:bg-black/5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de Contas</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.total}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-200/70 text-slate-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/70 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Administradores</p>
              <p className="text-xl font-extrabold text-rose-900 mt-0.5">{stats.admins}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-cyan-50/50 border border-cyan-200/70 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#00386e]">Engenharia</p>
              <p className="text-xl font-extrabold text-[#00386e] mt-0.5">{stats.engineers}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-cyan-100 text-[#00386e] flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Operadores</p>
              <p className="text-xl font-extrabold text-slate-800 mt-0.5">{stats.operators}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-200/70 text-slate-700 flex items-center justify-center">
              <HardHat className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou login (ex: JONATAS.MIRANDA)..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00386e]/20 focus:border-[#00386e]"
            />
          </div>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00386e]/20"
          >
            <option value="ALL">Perfil: Todos ({users.length})</option>
            <option value="ADMIN">Administrador ({stats.admins})</option>
            <option value="ENGINEER">Engenharia ({stats.engineers})</option>
            <option value="OPERATOR">Operador ({stats.operators})</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Usuário / Nome Completo</th>
                <th className="py-3.5 px-4">Login Corporativo</th>
                <th className="py-3.5 px-4">Perfil</th>
                <th className="py-3.5 px-4">Permissões no Sistema</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Carregando usuários cadastrados...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Nenhum usuário encontrado para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const badge = getRoleBadgeInfo(user.role);
                  const initials = getUserInitials(user.nome, user.login);
                  const isCurrentUser = currentUser?.id === user.id || currentUser?.login === user.login;
                  const isOnlyAdmin = user.role === 'ADMIN' && stats.admins <= 1;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-[#00386e] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                              <span>{user.nome}</span>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {user.email || `${user.login.toLowerCase()}@ctdi.com`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-mono text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {user.login}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                        <span className="text-[11px] leading-snug block">
                          {getRolePermissionsDescription(user.role)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#00386e] bg-cyan-50/70 hover:bg-cyan-100/80 border border-cyan-200 transition-colors cursor-pointer"
                            title="Editar nome, perfil ou redefinir senha"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" />
                            <span>Editar / Senha</span>
                          </button>

                          <button
                            onClick={() => setDeletingUser(user)}
                            disabled={isOnlyAdmin}
                            className="inline-flex items-center p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            title={
                              isOnlyAdmin
                                ? 'Não é possível excluir o único Administrador do sistema'
                                : 'Excluir usuário'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Criar / Editar Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-[#002a54] to-[#00386e] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-cyan-300">
                  {editingUser ? <KeyRound className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold">
                    {editingUser ? `Editar Usuário: ${editingUser.login}` : 'Cadastrar Novo Usuário'}
                  </h2>
                  <p className="text-[11px] text-cyan-200">
                    {editingUser
                      ? 'Altere nome, login, perfil de acesso ou redefina a senha'
                      : 'Crie um novo acesso corporativo direto no PostgreSQL'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome Completo do Colaborador *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: João Carlos da Silva"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00386e]/20 focus:border-[#00386e] font-medium text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Login Corporativo (Formato NOME.SOBRENOME) *
                </label>
                <input
                  type="text"
                  value={formData.login}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, login: e.target.value.toUpperCase() }))
                  }
                  placeholder="Ex: JOAO.SILVA"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#00386e]/20 focus:border-[#00386e] text-slate-900"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Deve conter um ponto separando nome e sobrenome (ex: <code className="font-mono text-slate-600">NOME.SOBRENOME</code>).
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  E-mail Corporativo (Destinatário de Notificações DCN)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={formData.login ? `Ex: ${formData.login.toLowerCase()}@ctdi.com` : 'Ex: joao.silva@ctdi.com'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00386e]/20 focus:border-[#00386e] font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Perfil de Acesso (RBAC) *
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00386e]/20 focus:border-[#00386e]"
                >
                  <option value="ADMIN">ADMINISTRADOR (Acesso Total + Gestão de Usuários)</option>
                  <option value="ENGINEER">ENGENHARIA (Criar/Editar DCNs, Materiais, Técnicos e Auditoria)</option>
                  <option value="OPERATOR">OPERADOR (Consulta e Treinamentos)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  {getRolePermissionsDescription(formData.role)}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {editingUser ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha de Acesso *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.senha}
                    onChange={e => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                    placeholder={
                      editingUser
                        ? 'Digite apenas se desejar alterar a senha...'
                        : 'Digite a senha de acesso...'
                    }
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00386e]/20 focus:border-[#00386e] text-slate-900"
                    required={!editingUser}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center px-5 py-2 rounded-xl bg-[#00386e] hover:bg-[#002b55] text-white font-bold shadow-sm transition-all disabled:opacity-60 cursor-pointer"
                >
                  <Check className="w-4 h-4 mr-1.5 text-cyan-300" />
                  <span>{isSaving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Criar Usuário'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmação de Exclusão */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão de Usuário</h3>
                <p className="text-xs text-slate-500">Esta ação removerá o acesso no PostgreSQL.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-5">
              Tem certeza que deseja excluir o usuário{' '}
              <strong className="text-slate-900">{deletingUser.nome}</strong> (
              <code className="font-mono font-bold text-[#00386e]">{deletingUser.login}</code>)?
            </p>

            <div className="flex items-center justify-end space-x-2.5 text-xs">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir Usuário'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
