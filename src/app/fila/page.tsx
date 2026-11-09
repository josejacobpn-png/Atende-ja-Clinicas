'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useQueue } from '@/context/QueueContext';
import { 
  ListOrdered, 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  Volume2, 
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export default function FilaPage() {
  const router = useRouter();
  const { 
    fila, 
    marcarAusente, 
    encaixeEmergencial, 
    removerDaFila, 
    chamarManualmente,
    retornarParaFila,
    addToast,
    setores,
    isGlobalCallActive,
    activeUnidade
  } = useQueue();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSetor, setSelectedSetor] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Obter YYYY-MM-DD local independentemente de fuso/locale para o dia atual
  const now = new Date();
  const todayYMD = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  // Filtragem
  const filaFiltrada = fila.filter((item) => {
    // Apenas mostrar a fila do dia atual (imune a locale)
    const itemDate = new Date(item.hora_entrada);
    const itemYMD = `${itemDate.getFullYear()}-${itemDate.getMonth()}-${itemDate.getDate()}`;
    
    if (itemYMD !== todayYMD) {
      return false;
    }
    const matchesSearch = 
      (item.paciente?.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (item.paciente?.cpf || '').includes(searchTerm) ||
      (item.paciente?.cns || '').includes(searchTerm);

    const matchesSetor = selectedSetor === 'Todos' || item.setor === selectedSetor;
    const matchesStatus = selectedStatus === 'Todos' || item.status === selectedStatus;

    return matchesSearch && matchesSetor && matchesStatus;
  });

  // Paginação
  const totalPages = Math.ceil(filaFiltrada.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFila = filaFiltrada.slice(startIndex, startIndex + itemsPerPage);

  const getPriorityBadgeStyle = (prioridade: string) => {
    switch (prioridade) {
      case 'URGENCIA':
      case 'VERMELHO':
        return 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 animate-pulse font-bold';
      case 'AMARELO':
        return 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900 font-bold';
      case 'GESTANTE':
      case 'IDOSO':
        return 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 font-bold';
      case 'VERDE_PRIORIDADE':
        return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 font-bold';
      case 'VERDE':
        return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-900';
      case 'AZUL':
        return 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'AGUARDANDO':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
      case 'CHAMANDO':
        return 'bg-accent-light dark:bg-accent-light/10 text-accent-foreground dark:text-accent border border-accent/30 animate-pulse';
      case 'EM_ATENDIMENTO':
        return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400';
      case 'FINALIZADO':
        return 'bg-slate-200 dark:bg-slate-700 text-slate-500';
      case 'AUSENTE':
        return 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full transition-colors duration-300">
        

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <ListOrdered className="h-7 w-7 text-primary" />
            Controle de Fila Digital
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe a posição dos pacientes, ordene prioridades ou realize encaixes de emergência na sala de espera.
          </p>
        </div>

        {/* Filters and Search Section */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-4 mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar paciente por nome, CPF ou CNS..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
            />
          </div>

          {/* Setor Filter */}
          <div className="flex items-center gap-2 bg-muted/30 border border-border px-3 h-11 rounded-lg">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedSetor}
              onChange={(e) => {
                setSelectedSetor(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-sm font-semibold focus:outline-none border-none cursor-pointer pr-4 text-foreground dark:text-foreground"
            >
              <option value="Todos">Todos os Setores</option>
              {setores.map(s => (
                <option key={s.id} value={s.nome}>{s.nome}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-muted/30 border border-border px-3 h-11 rounded-lg">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-sm font-semibold focus:outline-none border-none cursor-pointer pr-4"
            >
              <option value="Todos">Todos os Status</option>
              <option value="AGUARDANDO">Aguardando</option>
              <option value="CHAMANDO">Chamando</option>
              <option value="EM_ATENDIMENTO">Em Atendimento</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="AUSENTE">Ausentes</option>
            </select>
          </div>
        </div>

        {/* Fila Table Grid */}
        <div className="bg-card border border-border rounded-xl shadow-md overflow-hidden mb-6">
          {paginatedFila.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center justify-center gap-2">
              <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
              <span>Nenhum paciente localizado na fila digital.</span>
            </div>
          ) : (
            <>
              {/* Visualização para Desktop/Tablet */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground font-bold uppercase">
                      <th className="py-4 px-4 text-center w-16">Posição</th>
                      <th className="py-4 px-4">Paciente</th>
                      <th className="py-4 px-4">CPF / CNS</th>
                      <th className="py-4 px-4">Setor</th>
                      <th className="py-4 px-4">Prioridade</th>
                      <th className="py-4 px-4">Entrada</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-4 text-right sticky right-0 bg-muted/40 z-10 border-l border-border/50">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {paginatedFila.map((item, index) => {
                      const globalIndex = startIndex + index + 1;
                      return (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors group">
                          <td className="py-4 px-4 text-center font-extrabold text-muted-foreground text-base">
                            {item.status === 'AGUARDANDO' ? `#${globalIndex}` : '—'}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground leading-none">{item.paciente?.nome}</span>
                              {item.paciente?.observacoes && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1.5 truncate max-w-xs" title={item.paciente.observacoes}>
                                  Obs: {item.paciente.observacoes}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-xs text-muted-foreground font-medium">
                            <div className="flex flex-col gap-0.5">
                              <span>CPF: {item.paciente?.cpf}</span>
                              <span>CNS: {item.paciente?.cns}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-muted-foreground font-semibold">
                            {item.setor}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold ${getPriorityBadgeStyle(item.tipo_prioridade)}`}>
                              {item.tipo_prioridade === 'URGENCIA' ? 'URGÊNCIA' : (item.tipo_prioridade !== 'NORMAL' ? 'PRIORIDADE' : 'NORMAL')}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs text-muted-foreground font-semibold flex items-center gap-1 mt-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/75" />
                            {new Date(item.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${getStatusBadgeStyle(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right sticky right-0 bg-card group-hover:bg-muted/5 z-10 border-l border-border/50 transition-colors">
                            <div className="flex items-center justify-end gap-2">

                              {item.status === 'AGUARDANDO' && item.tipo_prioridade !== 'GESTANTE' && (
                                <button
                                  onClick={() => encaixeEmergencial(item.id)}
                                  className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 hover:bg-amber-500 hover:text-white transition-colors cursor-pointer"
                                  title="Colocar no topo das prioridades (Encaixe)"
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </button>
                              )}
                              {item.status === 'CHAMANDO' && (
                                <button
                                  onClick={() => marcarAusente(item.id)}
                                  className="px-2 py-1 text-xs font-bold rounded bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                                >
                                  Ausente
                                </button>
                              )}
                              {item.status === 'AUSENTE' && (
                                <button
                                  onClick={() => retornarParaFila(item.id)}
                                  className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-500 hover:text-white transition-colors cursor-pointer"
                                  title="Recolocar na Fila"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </button>
                              )}
                              {item.status !== 'EM_ATENDIMENTO' && item.status !== 'FINALIZADO' && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Remover ${item.paciente?.nome} da fila?`)) {
                                      removerDaFila(item.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Remover paciente da fila"
                                >
                                  <Trash2 className="h-4 w-4" />
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

              {/* Visualização Responsiva em Cartões (Mobile) */}
              <div className="block md:hidden divide-y divide-border">
                {paginatedFila.map((item, index) => {
                  const globalIndex = startIndex + index + 1;
                  return (
                    <div key={item.id} className="p-4 flex flex-col gap-3 hover:bg-muted/10 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-500 text-sm">
                            {item.status === 'AGUARDANDO' ? `#${globalIndex}` : '—'}
                          </span>
                          <span className="font-bold text-foreground text-base leading-snug">
                            {item.paciente?.nome}
                          </span>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadgeStyle(item.status)}`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center text-xs">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityBadgeStyle(item.tipo_prioridade)}`}>{item.tipo_prioridade === "IDOSO" ? "PRIORIDADE" : item.tipo_prioridade}</span>
                        <span className="text-muted-foreground font-semibold flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-muted-foreground font-bold border-l border-border pl-2">
                          {item.setor}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50 space-y-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 font-semibold">
                          <span>CPF: {item.paciente?.cpf}</span>
                          <span>CNS: {item.paciente?.cns}</span>
                        </div>
                        {item.paciente?.observacoes && (
                          <p className="mt-1 text-amber-600 dark:text-amber-400 text-[11px] leading-relaxed">
                            <strong>Obs:</strong> {item.paciente.observacoes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">

                        {item.status === 'AGUARDANDO' && item.tipo_prioridade !== 'GESTANTE' && (
                          <button
                            onClick={() => encaixeEmergencial(item.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-500 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Encaixe
                          </button>
                        )}
                        {item.status === 'CHAMANDO' && (
                          <button
                            onClick={() => marcarAusente(item.id)}
                            className="px-3 py-1.5 text-xs font-bold rounded bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                          >
                            Ausente
                          </button>
                        )}
                        {item.status === 'AUSENTE' && (
                          <button
                            onClick={() => retornarParaFila(item.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-500 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Recolocar
                          </button>
                        )}
                        {item.status !== 'EM_ATENDIMENTO' && item.status !== 'FINALIZADO' && (
                          <button
                            onClick={() => {
                              if (confirm(`Remover ${item.paciente?.nome} da fila?`)) {
                                removerDaFila(item.id);
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center bg-card border border-border p-4 rounded-xl shadow-sm">
            <span className="text-xs text-muted-foreground font-semibold">
              Mostrando de {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filaFiltrada.length)} de {filaFiltrada.length} pacientes
            </span>

            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 border border-border rounded-lg bg-card text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 border border-border rounded-lg bg-card text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

      </main>
    </>
  );
}
