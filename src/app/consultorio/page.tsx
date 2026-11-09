'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useQueue } from '@/context/QueueContext';
import { 
  Stethoscope, 
  DoorOpen, 
  Volume2, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Users,
  Clock,
  Sparkles,
  Keyboard,
  Info
} from 'lucide-react';

export default function ConsultorioPage() {
  const { 
    fila, 
    consultorios, 
    activeRoom, 
    setActiveRoom, 
    chamarProximo, 
    chamarManualmente, 
    iniciarAtendimento, 
    finalizarAtendimento, 
    marcarAusente,
    addToast,
    isGlobalCallActive
  } = useQueue();

  const [selectedSetor, setSelectedSetor] = useState('Médico Geral');
  const [setupMode, setSetupMode] = useState(!activeRoom);

  // Filtrar fila do consultório (normalizando o setor e garantindo que todos os aguardando apareçam)
  const setorNorm = (selectedSetor || '').trim().toLowerCase();
  const filaAguardando = fila.filter(f => 
    f.status === 'AGUARDANDO' && 
    (!setorNorm || (f.setor || '').trim().toLowerCase() === setorNorm)
  );
  
  // Localizar se há algum atendimento ATIVO (CHAMANDO ou EM_ATENDIMENTO) sendo conduzido por este consultório
  const atendimentoAtivo = fila.find(f => 
    f.consultorio === activeRoom?.nome && 
    (f.status === 'CHAMANDO' || f.status === 'EM_ATENDIMENTO')
  );

  // Escuta de Teclas de Atalho de Produtividade para Médicos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se estiver focando um input ou se não tiver sala ativa
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (!activeRoom) return;

      const key = e.key.toLowerCase();
      
      // Atalho: 'c' -> Chamar Próximo (se não houver atendimento ativo)
      if (key === 'c' && !atendimentoAtivo && !isGlobalCallActive) {
        e.preventDefault();
        handleChamarProximo();
      }
      // Atalho: 'r' -> Repetir Chamada
      else if (key === 'r' && atendimentoAtivo && atendimentoAtivo.status === 'CHAMANDO' && !isGlobalCallActive) {
        e.preventDefault();
        handleRepetirChamada();
      }
      // Atalho: 'i' -> Iniciar Atendimento
      else if (key === 'i' && atendimentoAtivo && atendimentoAtivo.status === 'CHAMANDO') {
        e.preventDefault();
        iniciarAtendimento(atendimentoAtivo.id);
      }
      // Atalho: 'f' -> Finalizar Atendimento
      else if (key === 'f' && atendimentoAtivo && atendimentoAtivo.status === 'EM_ATENDIMENTO') {
        e.preventDefault();
        finalizarAtendimento(atendimentoAtivo.id);
      }
      // Atalho: 'a' -> Marcar Ausente
      else if (key === 'a' && atendimentoAtivo && atendimentoAtivo.status === 'CHAMANDO') {
        e.preventDefault();
        marcarAusente(atendimentoAtivo.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleChamarProximo = async () => {
    const chamado = await chamarProximo(selectedSetor);
    if (chamado) {
      // Alerta de sucesso disparado no context
    }
  };

  const handleRepetirChamada = async () => {
    if (atendimentoAtivo) {
      await chamarManualmente(atendimentoAtivo.id, activeRoom!.nome);
    }
  };

  const handleEntrarSala = (salaId: string) => {
    const sala = consultorios.find(c => c.id === salaId);
    if (sala) {
      setActiveRoom(sala);
      setSelectedSetor(sala.setor); // Sincroniza o setor de atendimento com o setor da sala
      setSetupMode(false);
    }
  };

  const handleSairSala = () => {
    setActiveRoom(null);
    setSetupMode(true);
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full transition-colors duration-300">
        
        {setupMode ? (
          /* MODO DE CONFIGURAÇÃO INICIAL (SELECIONAR SALA) */
          <div className="max-w-md mx-auto bg-card border border-border rounded-2xl shadow-xl p-8 slide-in-bottom mt-10">
            <div className="text-center mb-6">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <DoorOpen className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-foreground">Abertura de Consultório</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Antes de iniciar as chamadas de pacientes, identifique sua sala e setor de trabalho.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Selecione seu Consultório / Sala</label>
                <div className="grid grid-cols-1 gap-2">
                  {consultorios.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleEntrarSala(c.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border text-left font-bold transition-all ${
                        c.ativo 
                          ? 'border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5 cursor-pointer text-foreground' 
                          : 'border-border/50 bg-muted/10 opacity-50 cursor-not-allowed text-muted-foreground'
                      }`}
                      disabled={!c.ativo}
                    >
                      <div className="flex flex-col">
                        <span>{c.nome}</span>
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">{c.setor}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">Ativa</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* PAINEL DO MÉDICO OPERACIONAL */
          <div className="space-y-6">
            
            {/* Consultório Meta Header */}
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/15 text-primary rounded-lg flex items-center justify-center">
                  <Stethoscope className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="font-extrabold text-lg text-foreground">{activeRoom?.nome}</h2>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">{selectedSetor}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-muted-foreground font-bold block uppercase">Profissional Conectado</span>
                  <span className="text-xs font-bold">Corpo Clínico UBS</span>
                </div>
                <button
                  onClick={handleSairSala}
                  className="px-4 py-2 border border-border hover:bg-red-500/10 hover:text-red-500 text-xs font-bold rounded-lg transition-colors"
                >
                  Sair do Consultório
                </button>
              </div>
            </div>

            {/* Principal Actions Area */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              
              {/* Col 1 & 2: Chamada e Status do Atendimento Ativo */}
              <div className="md:col-span-2 space-y-6">
                
                <div className="bg-card border border-border p-6 rounded-2xl shadow-md min-h-[300px] flex flex-col justify-between relative overflow-hidden">
                  {/* Glowing pulses */}
                  {atendimentoAtivo && (
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent animate-pulse"></div>
                  )}

                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6 flex justify-between items-center">
                      <span>Status do Atendimento</span>
                      {atendimentoAtivo && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold text-white animate-pulse ${
                          atendimentoAtivo.status === 'CHAMANDO' ? 'bg-accent' : 'bg-secondary'
                        }`}>
                          {atendimentoAtivo.status === 'CHAMANDO' ? 'Paciente Chamado' : 'Consulta Iniciada'}
                        </span>
                      )}
                    </h3>

                    {atendimentoAtivo ? (
                      /* PACIENTE ATIVO SENDO ATENDIDO */
                      <div className="space-y-4">
                        <div>
                          <span className="text-xs text-muted-foreground font-bold uppercase">Paciente Selecionado</span>
                          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mt-1">
                            {atendimentoAtivo.paciente?.nome}
                          </h2>
                          <div className="flex gap-2 mt-2">
                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                              atendimentoAtivo.tipo_prioridade === 'GESTANTE' ? 'bg-pink-100 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400' :
                              atendimentoAtivo.tipo_prioridade === 'IDOSO' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' :
                              'bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400'
                            }`}>{atendimentoAtivo.tipo_prioridade === "IDOSO" ? "PRIORIDADE" : atendimentoAtivo.tipo_prioridade}</span>
                            <span className="text-xs text-muted-foreground py-0.5 font-semibold">
                              CPF: {atendimentoAtivo.paciente?.cpf} | CNS: {atendimentoAtivo.paciente?.cns}
                            </span>
                          </div>
                        </div>

                        {atendimentoAtivo.paciente?.observacoes && (
                          <div className="p-3 bg-muted/50 rounded-lg border border-border text-xs leading-relaxed text-muted-foreground">
                            <strong>Observações da Recepção:</strong> {atendimentoAtivo.paciente.observacoes}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* NENHUM PACIENTE SENDO ATENDIDO ATUALMENTE */
                      <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground/50">
                          <Users className="h-7 w-7" />
                        </div>
                        <h4 className="font-extrabold text-lg text-foreground">Consultório Disponível</h4>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Pronto para receber novos atendimentos. Clique em <strong>Chamar Próximo Paciente</strong> para rodar a seleção inteligente da fila.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Operações do Consultório */}
                  <div className="pt-6 border-t border-border mt-6 flex flex-wrap gap-3">
                    {atendimentoAtivo ? (
                      /* BOTÕES QUANDO HÁ CHAMADA ATIVA */
                      <>
                        {atendimentoAtivo.status === 'CHAMANDO' && (
                          <>
                            <button
                              onClick={handleRepetirChamada}
                              disabled={isGlobalCallActive}
                              className="px-6 py-2 bg-secondary text-secondary-foreground font-bold rounded-lg hover:bg-secondary/90 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Volume2 className="h-4 w-4" />
                              {isGlobalCallActive ? 'Aguarde...' : 'Re-chamar Nome (R)'}
                            </button>
                            <button
                              onClick={() => iniciarAtendimento(atendimentoAtivo.id)}
                              disabled={isGlobalCallActive}
                              className="px-5 h-12 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 transition-colors flex items-center gap-2 shadow disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Play className="h-5 w-5" />
                              Iniciar Consulta (I)
                            </button>
                            <button
                              onClick={() => marcarAusente(atendimentoAtivo.id)}
                              className="px-5 h-12 bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white font-bold rounded-lg transition-colors ml-auto"
                            >
                              Marcar Ausente (A)
                            </button>
                          </>
                        )}

                        {atendimentoAtivo.status === 'EM_ATENDIMENTO' && (
                          <button
                            onClick={() => finalizarAtendimento(atendimentoAtivo.id)}
                            className="px-6 h-12 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow w-full justify-center"
                          >
                            <CheckCircle2 className="h-5 w-5" />
                            Finalizar e Concluir Atendimento (F)
                          </button>
                        )}
                      </>
                    ) : (
                      /* BOTÃO DE CHAMAR PRÓXIMO SE OCIOSO */
                      <button
                        onClick={handleChamarProximo}
                        disabled={filaAguardando.length === 0 || isGlobalCallActive}
                        className="w-full h-14 bg-primary text-white font-bold text-base rounded-xl hover:bg-primary/95 transition-colors shadow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <Sparkles className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        {isGlobalCallActive ? 'Painel Ocupado...' : 'Chamar Próximo Paciente (C)'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Keyboard shortcuts panel for quick clinical flow */}
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-xs text-muted-foreground flex items-start gap-2">
                  <Keyboard className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground">Atalhos Médicos Rápidos (Fluxo Ultra-rápido):</strong>
                    <div className="flex flex-wrap gap-2 mt-2 font-bold">
                      <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">[C] Chamar</kbd>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">[R] Re-chamar</kbd>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">[I] Iniciar</kbd>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">[F] Concluir</kbd>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">[A] Ausente</kbd>
                    </div>
                  </div>
                </div>

              </div>

              {/* Col 3: Lista Lateral de Pacientes Aguardando neste Setor */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-md flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span>Fila Geral do Setor</span>
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[10px] font-bold">
                      {filaAguardando.length} aguardando
                    </span>
                  </h3>

                  {filaAguardando.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground leading-normal">
                      Não há pacientes aguardando atendimento no setor de <strong>{selectedSetor}</strong> neste momento.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {filaAguardando.map((item, idx) => (
                        <div 
                          key={item.id}
                          className="p-3 bg-muted/40 border border-border/60 hover:border-primary/20 rounded-lg flex items-center justify-between text-xs group"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground truncate max-w-[130px]">
                              {idx + 1}. {item.paciente?.nome}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-semibold mt-0.5">
                              Entrada: {new Date(item.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.tipo_prioridade !== 'NORMAL' && item.tipo_prioridade !== 'AZUL' && !atendimentoAtivo && (
                              <button
                                onClick={() => chamarManualmente(item.id, activeRoom!.nome)}
                                disabled={isGlobalCallActive}
                                className="hidden group-hover:flex items-center gap-1 px-2 py-1 bg-primary text-white rounded text-[9px] font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
                                title="Chamar Paciente Prioritário Manualmente"
                              >
                                <Volume2 className="h-3 w-3" />
                                Chamar
                              </button>
                            )}
                            <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] ${
                              item.tipo_prioridade === 'GESTANTE' ? 'bg-pink-100 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400' :
                              item.tipo_prioridade === 'IDOSO' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' :
                              'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                            }`}>{item.tipo_prioridade === "IDOSO" ? "PRIORIDADE" : item.tipo_prioridade}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info Card on call logic */}
                <div className="mt-6 p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/60 flex gap-2 text-[10px] leading-relaxed text-sky-800 dark:text-sky-300 font-semibold">
                  <Info className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                  <span>
                    O sistema prioriza automaticamente: 2 Pacientes Normais a cada 1 Prioritário, ordenando Gestante &gt; Idoso &gt; Normal. A chamada manual continua disponível caso precise alterar a ordem.
                  </span>
                </div>

              </div>

            </div>

          </div>
        )}
      </main>
    </>
  );
}
