import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle, 
  ShieldCheck, 
  WifiOff, 
  CheckCircle2, 
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CTDILogo } from './CTDILogo';
import { DCNLogo } from './DCNLogo';

export const LoginModal: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  
  const [loginInput, setLoginInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Se já autenticado, o modal não é renderizado
  if (isAuthenticated) {
    return null;
  }

  // Regex estrito para formato corporativo: NOME.SOBRENOME
  const USER_FORMAT_REGEX = /^[A-Z0-9\-_]+\.[A-Z0-9\-_]+$/;

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Converte automaticamente para maiúsculas conforme requisito
    const uppercaseValue = e.target.value.toUpperCase();
    setLoginInput(uppercaseValue);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSenhaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSenhaInput(e.target.value);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const trimmedLogin = loginInput.trim().toUpperCase();

    // 1. Validação de campo vazio
    if (!trimmedLogin) {
      setErrorMessage('Informe seu usuário corporativo no formato NOME.SOBRENOME.');
      return;
    }

    // 2. Validação por Regex estrito no frontend antes do envio
    if (!USER_FORMAT_REGEX.test(trimmedLogin)) {
      setErrorMessage('Formato de usuário inválido! Use NOME.SOBRENOME (ex: JONATAS.MIRANDA).');
      return;
    }


    // 3. Validação de senha vazia
    if (!senhaInput) {
      setErrorMessage('Informe sua senha corporativa para acessar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await login(trimmedLogin, senhaInput);
      if (response?.isOffline) {
        setSuccessNotice('Acesso autorizado em modo de contingência offline.');
      }
    } catch (err: any) {
      console.error('[Login Error]', err);
      setErrorMessage(err.message || 'Falha ao autenticar no sistema. Verifique suas credenciais.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preenchimento rápido para homologação / demonstração
  const handleQuickFill = (user: string, pass: string) => {
    setLoginInput(user);
    setSenhaInput(pass);
    setErrorMessage(null);
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden transform transition-all my-8">
        
        {/* Cabeçalho Corporativo CTDI / DCN com gradiente azul escuro */}
        <div className="bg-gradient-to-br from-[#002a54] via-[#00386e] to-[#004e8f] p-6 text-white text-center relative overflow-hidden">
          
          {/* Efeito decorativo sutil */}
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Logo CTDI & DCN */}
          <div className="flex flex-col items-center justify-center space-y-3 mb-3 relative z-10">
            <div className="w-full max-w-[210px] py-2 px-3 bg-[#002347]/90 rounded-xl border border-cyan-400/20 shadow-inner flex items-center justify-center">
              <CTDILogo className="h-9 w-auto" />
            </div>

            <div className="flex items-center space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-[11px] font-extrabold tracking-widest text-cyan-200 uppercase font-sans">
                DCN MANAGEMENT SYSTEM
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            </div>
          </div>

          <h2 id="login-modal-title" className="text-xl font-bold tracking-tight text-white">
            Autenticação Corporativa
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Entre com suas credenciais do portal para acessar o sistema
          </p>

        </div>

        {/* Corpo do Formulário */}
        <div className="p-6 sm:p-7 space-y-5 bg-white">
          
          {/* Alerta Visual de Erro */}
          {errorMessage && (
            <div 
              role="alert" 
              className="flex items-start space-x-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-in slide-in-from-top-2 duration-200"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-900">Atenção</p>
                <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Alerta Visual de Sucesso/Offline */}
          {successNotice && (
            <div 
              role="status" 
              className="flex items-start space-x-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs animate-in slide-in-from-top-2 duration-200"
            >
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-950">Modo Contingência</p>
                <p className="mt-0.5 leading-relaxed">{successNotice}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campo Usuário Corporativo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label 
                  htmlFor="user-login-input" 
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Usuário Corporativo
                </label>
                <span className="text-[10px] font-medium text-slate-400">
                  NOME.SOBRENOME
                </span>
              </div>

              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="user-login-input"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="characters"
                  spellCheck="false"
                  value={loginInput}
                  onChange={handleLoginChange}
                  placeholder="Ex: JONATAS.MIRANDA"
                  disabled={isSubmitting}

                  className={`
                    block w-full pl-10 pr-3.5 py-2.5 text-sm font-semibold rounded-xl border bg-slate-50/50 
                    text-slate-900 placeholder-slate-400 uppercase transition-all
                    focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-[#00386e]/20 focus:border-[#00386e]
                    ${errorMessage && !USER_FORMAT_REGEX.test(loginInput.trim()) ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'}
                  `}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Utilize ponto entre nome e sobrenome (letras maiúsculas automáticas).
              </p>
            </div>

            {/* Campo Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label 
                  htmlFor="user-password-input" 
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Senha de Acesso
                </label>
              </div>

              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="user-password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={senhaInput}
                  onChange={handleSenhaChange}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 placeholder-slate-400 transition-all focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-[#00386e]/20 focus:border-[#00386e]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Botão Acessar Sistema */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#00386e] hover:bg-[#002b55] active:scale-[0.99] shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-cyan-300" />
                    <span>Acessar Sistema</span>
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Atalhos Rápidos para Demonstração / Homologação */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Acessos de Teste (RBAC)
              </span>
              <span className="text-[10px] text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded-md font-semibold border border-cyan-200">
                Clique para preencher
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-left">
              <button
                type="button"
                onClick={() => handleQuickFill('JONATAS.MIRANDA', 'admin')}
                className="p-2 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 transition-colors text-left group"
              >
                <div className="text-[9px] font-bold text-rose-800 uppercase flex items-center justify-between">
                  <span>Admin</span>
                  <ChevronRight className="w-3 h-3 text-rose-500 opacity-60 group-hover:opacity-100" />
                </div>
                <div className="text-[11px] font-bold text-slate-900 truncate mt-0.5">JONATAS.M</div>
                <div className="text-[9px] text-slate-500 truncate">Senha: admin</div>
              </button>


              <button
                type="button"
                onClick={() => handleQuickFill('CARLOS.MENDES', '123456')}
                className="p-2 rounded-lg border border-cyan-200 bg-cyan-50/60 hover:bg-cyan-100/80 transition-colors text-left group"
              >
                <div className="text-[9px] font-bold text-[#00386e] uppercase flex items-center justify-between">
                  <span>Engenheiro</span>
                  <ChevronRight className="w-3 h-3 text-cyan-600 opacity-60 group-hover:opacity-100" />
                </div>
                <div className="text-[11px] font-bold text-slate-900 truncate mt-0.5">CARLOS.M</div>
                <div className="text-[9px] text-slate-500 truncate">Senha: 123456</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('OPERADOR.CTDI', '123456')}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left group"
              >
                <div className="text-[9px] font-bold text-slate-700 uppercase flex items-center justify-between">
                  <span>Operador</span>
                  <ChevronRight className="w-3 h-3 text-slate-500 opacity-60 group-hover:opacity-100" />
                </div>
                <div className="text-[11px] font-bold text-slate-900 truncate mt-0.5">OPERADOR.C</div>
                <div className="text-[9px] text-slate-500 truncate">Senha: 123456</div>
              </button>
            </div>

            <div className="flex items-center space-x-1.5 mt-3 text-[10px] text-slate-400 justify-center">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Sessão corporativa persistente com fallback offline integrado</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
