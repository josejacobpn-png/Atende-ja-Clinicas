'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueue } from '@/context/QueueContext';

import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Activity, 
  UserCheck,
  RefreshCw,
  Stethoscope,
  LayoutDashboard,
  ArrowLeft,
  Settings,
  ShieldAlert,
  Keyboard,
  Sun,
  Moon,
  X
} from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reset = searchParams.get('reset');
  const { login, user, logoUrl, darkMode, toggleDarkMode } = useQueue();
  const [step, setStep] = useState<'select_profile' | 'login'>('select_profile');
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<'recepcao' | 'profissional_saude' | 'administrador' | 'superuser'>('recepcao');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  useEffect(() => {
    if (reset === 'true') {
      setStep('select_profile');
      router.replace('/');
    }
  }, [reset, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await login(email, password)) {
      redirectUser();
    }
  };

  const handleQuickLogin = async (emailStr: string) => {
    setEmail(emailStr);
    setPassword('Jj@96314725'); // Senha do super usuário ou qualquer senha simulada
    if (await login(emailStr, 'Jj@96314725')) {
      setTimeout(() => {
        redirectUser();
      }, 500);
    }
  };

  const redirectUser = () => {
    const activeUser = JSON.parse(localStorage.getItem('ubs_active_user') || '{}');
    if (activeUser.perfil === 'administrador') {
      router.push('/dashboard');
    } else if (activeUser.perfil === 'recepcao') {
      router.push('/fila');
    } else if (activeUser.perfil === 'profissional_saude') {
      router.push('/consultorio');
    } else {
      router.push('/');
    }
  };

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverySuccess(true);
    setTimeout(() => {
      setRecoverySuccess(false);
      setRecoveryMode(false);
    }, 4000);
  };

  const handleSelectProfile = (profile: 'recepcao' | 'profissional_saude' | 'administrador' | 'superuser') => {
    setSelectedProfile(profile);
    setStep('login');
    setRecoveryMode(false);
    setEmail('');
    setPassword('');
  };

  const getProfileDisplayName = (profile?: string) => {
    const prof = profile || selectedProfile;
    switch (prof) {
      case 'recepcao': return 'Módulo Recepção';
      case 'profissional_saude': return 'Médico / Profissional';
      case 'administrador': return 'Administrador Geral';
      case 'superuser': return 'Super Usuário';
      default: return 'Acesso Geral';
    }
  };

  const getProfileColorClass = () => {
    switch (selectedProfile) {
      case 'recepcao': return 'text-primary bg-primary/10';
      case 'profissional_saude': return 'text-emerald-500 bg-emerald-500/10';
      case 'administrador': return 'text-amber-500 bg-amber-500/10';
      case 'superuser': return 'text-purple-500 bg-purple-500/10';
    }
  };

  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center overflow-y-auto bg-[url('/bg-medical.jpg')] bg-cover bg-center bg-no-repeat py-8 px-4 sm:px-6 lg:px-8 relative">
        {/* Dark overlay for contrast over the blue medical background */}
        <div className="absolute inset-0 bg-blue-950/60 pointer-events-none z-0"></div>
        
        {/* Floating Top Right Buttons */}
        <div className="absolute top-5 right-5 z-20 flex gap-3">
          {/* Keyboard Shortcuts */}
          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm border border-white/20 transition-all shadow cursor-pointer"
            title="Atalhos Rápidos"
          >
            <Keyboard className="h-5 w-5" />
          </button>

          {/* Dark Mode */}
          <button
            onClick={toggleDarkMode}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm border border-white/20 transition-all shadow cursor-pointer"
          >
            {darkMode ? <Sun className="h-5 w-5 text-amber-300" /> : <Moon className="h-5 w-5 text-white" />}
          </button>
        </div>

        {/* Logo / Header */}
        <div className="relative z-10 text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-lg mb-4">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
            AtendeJá
          </h1>
          <p className="text-sm text-blue-100/80 font-medium mt-1">Sistema de Gerenciamento de Fila Digital</p>
        </div>

        {step === 'select_profile' ? (
          /* PASSO 1: SELEÇÃO DE PERFIL */
          <div className="max-w-4xl w-full relative z-10">
            
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white/90 tracking-tight">
                Selecione seu perfil de acesso
              </h2>
              <p className="text-sm text-blue-100/70 max-w-lg mx-auto mt-2 leading-relaxed">
                Escolha o módulo correspondente ao seu cargo para acessar o sistema.
              </p>
            </div>

            {/* Grid de Perfis */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Card 1: Recepção */}
              <button
                onClick={() => handleSelectProfile('recepcao')}
                className="flex flex-col items-center justify-center p-7 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 hover:border-white/40 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer text-center group"
              >
                <div className="h-16 w-16 rounded-2xl bg-sky-400/20 border border-sky-400/40 text-sky-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                  <UserCheck className="h-8 w-8" />
                </div>
                <span className="font-extrabold text-xl tracking-tight text-white mb-2">
                  Recepção
                </span>
                <span className="text-xs text-blue-100/70 font-medium leading-relaxed max-w-[200px]">
                  Admissão e cadastro de novos pacientes, prioridades e controle da Fila Digital.
                </span>
              </button>

              {/* Card 2: Profissional de Saúde */}
              <button
                onClick={() => handleSelectProfile('profissional_saude')}
                className="flex flex-col items-center justify-center p-7 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 hover:border-white/40 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer text-center group"
              >
                <div className="h-16 w-16 rounded-2xl bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                  <Stethoscope className="h-8 w-8" />
                </div>
                <span className="font-extrabold text-xl tracking-tight text-white mb-2">
                  Profissional
                </span>
                <span className="text-xs text-blue-100/70 font-medium leading-relaxed max-w-[200px]">
                  Painel para médicos e enfermeiras. Consultório, chamadas e atendimento inteligente.
                </span>
              </button>

              {/* Card 3: Administrador Geral */}
              <button
                onClick={() => handleSelectProfile('administrador')}
                className="flex flex-col items-center justify-center p-7 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 hover:border-white/40 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer text-center group"
              >
                <div className="h-16 w-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                  <LayoutDashboard className="h-8 w-8" />
                </div>
                <span className="font-extrabold text-xl tracking-tight text-white mb-2">
                  Administração
                </span>
                <span className="text-xs text-blue-100/70 font-medium leading-relaxed max-w-[200px]">
                  Dashboards, tempos de espera, produtividade e relatórios analíticos consolidados.
                </span>
              </button>
            </div>

          </div>
        ) : (
          /* PASSO 2: FORMULÁRIO DE LOGIN ESPECÍFICO DO PERFIL */
          <div className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl relative z-10 overflow-hidden">
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-36 w-36 rounded-full bg-sky-400/20 blur-2xl pointer-events-none"></div>
            
            <div className="text-center relative">
              {/* Botão de Voltar */}
              <button
                onClick={() => setStep('select_profile')}
                className="absolute left-0 top-1 p-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title="Voltar para seleção de perfil"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className={`mx-auto h-12 w-12 flex items-center justify-center rounded-xl shadow ${getProfileColorClass()}`}>
                <Activity className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-2xl font-extrabold text-white">
                {recoveryMode ? 'Recuperar Senha' : 'Acesso ao Painel'}
              </h2>
              <p className="mt-2 text-sm text-blue-100/70 font-semibold flex items-center justify-center gap-1">
                {recoveryMode 
                  ? 'Digite seu e-mail cadastrado' 
                  : `Módulo: `}
                {!recoveryMode && (
                  <span className="text-sky-300 uppercase font-bold text-xs tracking-wider">{getProfileDisplayName()}</span>
                )}
              </p>
            </div>

            {recoveryMode ? (
              /* Formulário de Recuperação */
              <form className="mt-8 space-y-6" onSubmit={handleRecovery}>
                {recoverySuccess ? (
                  <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm font-semibold text-center">
                    E-mail de recuperação enviado! Verifique sua caixa de entrada.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="recovery-email" className="block text-sm font-semibold mb-2 text-white/80">E-mail Cadastrado</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 h-4 w-4 text-white/50" />
                        <input
                          id="recovery-email"
                          type="email"
                          required
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          placeholder="nome@ubs.gov.br"
                          className="pl-10 w-full h-11 bg-white/10 border border-white/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50 text-white placeholder-white/40 transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center h-11 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl transition-colors shadow-lg"
                    >
                      Enviar Link de Redefinição
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecoveryMode(false)}
                      className="w-full text-center text-xs text-white/50 hover:text-white font-semibold py-2 cursor-pointer transition-colors"
                    >
                      Voltar para o Login
                    </button>
                  </div>
                )}
              </form>
            ) : (
              /* Formulário de Login */
              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold mb-2 text-white/80">E-mail Corporativo</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-white/50" />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nome@ubs.gov.br"
                        className="pl-10 w-full h-11 bg-white/10 border border-white/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50 text-white placeholder-white/40 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="password" className="block text-sm font-semibold text-white/80">Senha</label>
                      <button
                        type="button"
                        onClick={() => setRecoveryMode(true)}
                        className="text-xs text-sky-300 hover:text-sky-200 hover:underline font-semibold cursor-pointer transition-colors"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 h-4 w-4 text-white/50" />
                      <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 w-full h-11 bg-white/10 border border-white/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50 text-white placeholder-white/40 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 h-11 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl transition-colors shadow-lg group cursor-pointer"
                >
                  Acessar Módulo
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>

              </form>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="relative z-10 mt-8 text-center">
          <p className="text-xs text-blue-100/40 font-medium">© 2026 AtendeJá · Sistema de Saúde Digital</p>
        </div>
      </main>

      {/* MODAL DE ATALHOS DE TECLADO */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/70 backdrop-blur-sm p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-sky-300" />
                Atalhos de Teclado Rápidos
              </h3>
              <button 
                onClick={() => setShortcutsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-blue-100/60 mb-4">
              Use estes atalhos para navegar no sistema de forma rápida (utilize as teclas numéricas ou letras conforme abaixo):
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-sm font-medium text-white/80">Ir para Início / Landing</span>
                <kbd className="px-2 py-1 bg-white/10 border border-white/20 text-white/70 text-xs rounded shadow">Alt + H</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-sm font-medium text-white/80">Alternar Modo Escuro</span>
                <kbd className="px-2 py-1 bg-white/10 border border-white/20 text-white/70 text-xs rounded shadow">Alt + D</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-sm font-medium text-white/80">Abrir Tela de Login</span>
                <kbd className="px-2 py-1 bg-white/10 border border-white/20 text-white/70 text-xs rounded shadow">Alt + L</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-sm font-medium text-white/80">Atalhos rápidos do Médico (Consultório)</span>
                <span className="text-xs text-blue-100/40">Disponível no painel do profissional</span>
              </div>
            </div>

            <button
              onClick={() => setShortcutsModalOpen(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold transition-colors text-sm cursor-pointer shadow-lg"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
