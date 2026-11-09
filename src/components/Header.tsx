'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueue } from '@/context/QueueContext';
import { 
  Activity, 
  Sun, 
  Moon, 
  LogOut, 
  User, 
  LayoutDashboard, 
  UserPlus, 
  ListOrdered, 
  Stethoscope, 
  Tv, 
  FileBarChart, 
  Settings, 
  Menu, 
  X,
  Keyboard
} from 'lucide-react';

export default function Header() {
  const { 
    user, 
    logout, 
    darkMode, 
    toggleDarkMode, 
    activeRoom, 
    logoUrl, 
    unidades, 
    activeUnidade, 
    setActiveUnidade,
    funcoes
  } = useQueue();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Não renderizar cabeçalho se estiver no painel fullscreen da TV
  if (pathname === '/tv') return null;

  const getProfileLabel = (perfil?: string) => {
    switch (perfil) {
      case 'administrador': return 'Administrador Geral';
      case 'recepcao': return 'Recepção';
      case 'profissional_saude': return 'Profissional de Saúde';
      default: return 'Visitante';
    }
  };

  const getUserFunctionLabel = (u: any) => {
    if (u && u.funcao_id) {
      const func = funcoes.find(f => f.id === u.funcao_id);
      if (func) return func.nome;
    }
    return getProfileLabel(u?.perfil);
  };

  const navLinks = [
    { href: '/?reset=true', label: 'Início', icon: Activity },
  ];

  if (user) {
    if (user.perfil === 'administrador') {
      navLinks.push(
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
        { href: '/configuracoes', label: 'Configurações', icon: Settings }
      );
    } else if (user.perfil === 'recepcao') {
      navLinks.push(
        { href: '/cadastro', label: 'Cadastrar Paciente', icon: UserPlus },
        { href: '/fila', label: 'Fila Digital', icon: ListOrdered }
      );
    } else if (user.perfil === 'profissional_saude') {
      navLinks.push(
        { href: '/consultorio', label: 'Consultório', icon: Stethoscope }
      );
    }
  }

  // Todos os usuários autenticados têm acesso ao Painel da TV
  if (user) {
    navLinks.push({ href: '/tv', label: 'Painel TV', icon: Tv });
  }

  const handleLogout = () => {
    logout();
    router.push('/');
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Branding */}
          <div className="flex items-center gap-3 flex-1 justify-start">
            <Link href="/?reset=true" className="flex items-center gap-3 hover:opacity-95 transition-opacity">
              <img src="/logo-pref.png" alt="Atende Já Logo" className="h-8 sm:h-9 w-auto object-contain select-none" />
              {user && (
                <div className="flex flex-col border-l border-border pl-3">
                  {user.perfil === 'administrador' && unidades.length > 1 ? (
                    <select
                      value={activeUnidade?.id || ''}
                      onChange={(e) => {
                        const selected = unidades.find(u => u.id === e.target.value);
                        if (selected) setActiveUnidade(selected);
                      }}
                      className="text-[10px] font-bold text-primary dark:text-primary-light uppercase bg-transparent border-none p-0 cursor-pointer focus:ring-0 focus:outline-none max-w-[150px] truncate mt-0.5"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      {unidades.map(u => (
                        <option key={u.id} value={u.id} className="bg-card text-foreground">
                          {u.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">
                      {activeUnidade ? activeUnidade.nome : 'Gestão de Filas'}
                    </span>
                  )}
                </div>
              )}
            </Link>
          </div>

          {/* Desktop Centered Navigation / Page Title */}
          <div className="flex items-center justify-center flex-1 text-center">
            {user ? (
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2 px-3 h-10 rounded-lg text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-primary/10 text-primary dark:bg-primary-light/10 dark:text-primary' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            ) : (
              <span className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-sans tracking-wide">
                Início
              </span>
            )}
          </div>

          {/* User Controls and Profile */}
          <div className="flex items-center justify-end gap-3 flex-1">
            <div className="hidden md:flex items-center gap-3">
              {/* Atalhos do Teclado */}
              <button
                onClick={() => setShortcutsModalOpen(true)}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-950 hover:bg-slate-900 text-white dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
                title="Atalhos Rápidos"
              >
                <Keyboard className="h-5 w-5" />
              </button>

              {/* Dark Mode */}
              <button
                onClick={toggleDarkMode}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-950 hover:bg-slate-900 text-white dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
              >
                {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-200" />}
              </button>

              {user && (
                <div className="flex items-center gap-3 border-l border-border pl-3">
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-semibold text-foreground leading-none">{user.nome}</span>
                    <span className="text-[10px] text-muted-foreground leading-none mt-1">
                      {getUserFunctionLabel(user)}
                    </span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Sair do Sistema"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            >
              {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-500" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 flex flex-col gap-2 slide-in-top">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}

          {user && (
            <div className="border-t border-border mt-3 pt-3 flex flex-col gap-3">
              <div className="flex items-center gap-3 px-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground leading-none">{user.nome}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {getUserFunctionLabel(user)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-base font-semibold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Sair do Sistema
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE ATALHOS DE TECLADO */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 slide-in-bottom">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" />
                Atalhos de Teclado Rápidos
              </h3>
              <button 
                onClick={() => setShortcutsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Use estes atalhos para navegar no sistema de forma rápida (utilize as teclas numéricas ou letras conforme abaixo):
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm font-medium">Ir para Início / Landing</span>
                <kbd className="px-2 py-1 bg-muted border border-border text-xs rounded shadow">Alt + H</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm font-medium">Alternar Modo Escuro</span>
                <kbd className="px-2 py-1 bg-muted border border-border text-xs rounded shadow">Alt + D</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm font-medium">Abrir Tela de Login</span>
                <kbd className="px-2 py-1 bg-muted border border-border text-xs rounded shadow">Alt + L</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm font-medium">Atalhos rápidos do Médico (Consultório)</span>
                <span className="text-xs text-muted-foreground">Disponível no painel do profissional</span>
              </div>
            </div>

            <button
              onClick={() => setShortcutsModalOpen(false)}
              className="mt-6 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-colors text-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
