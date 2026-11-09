'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useQueue } from '@/context/QueueContext';
import { 
  Users, 
  Stethoscope, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  DoorOpen, 
  TrendingUp, 
  BarChart3,
  Calendar,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

export default function DashboardPage() {
  const { fila, consultorios, user, setores } = useQueue();
  const [selectedSetor, setSelectedSetor] = useState('Todos');

  const todayDateString = new Date().toLocaleDateString();

  // Filtragem da fila para métricas
  const filaFiltrada = fila.filter(f => {
    const isToday = new Date(f.hora_entrada).toLocaleDateString() === todayDateString;
    const matchesSetor = selectedSetor === 'Todos' || f.setor === selectedSetor;
    return isToday && matchesSetor;
  });

  // 1. Pacientes Aguardando
  const aguardando = filaFiltrada.filter(f => f.status === 'AGUARDANDO');
  const aguardandoCount = aguardando.length;

  // 2. Pacientes em Atendimento
  const emAtendimentoCount = filaFiltrada.filter(f => f.status === 'EM_ATENDIMENTO').length;

  // 3. Total Atendido no Dia (Finalizado)
  const finalizados = filaFiltrada.filter(f => f.status === 'FINALIZADO');
  const totalAtendido = finalizados.length;

  // 4. Prioritários Aguardando (Gestantes e Idosos)
  const prioritariosAguardando = aguardando.filter(f => f.tipo_prioridade === 'GESTANTE' || f.tipo_prioridade === 'IDOSO').length;

  // 5. Consultórios ativos
  const consultoriosAtivos = consultorios.filter(c => c.ativo).length;

  // 6. Tempo Médio de Espera (em minutos)
  // Calculado a partir da diferença de hora_inicio ou hora_chamada e hora_entrada
  const calculateAverageWaitTime = () => {
    const atendidosComEspera = filaFiltrada.filter(f => 
      (f.status === 'FINALIZADO' || f.status === 'EM_ATENDIMENTO') && f.hora_chamada
    );

    if (atendidosComEspera.length === 0) return 12; // Espera default de 12 minutos se sem dados

    const totalMinutos = atendidosComEspera.reduce((acc, curr) => {
      const entrada = new Date(curr.hora_entrada).getTime();
      const chamada = new Date(curr.hora_chamada!).getTime();
      const esperaMinutos = Math.max(0, Math.floor((chamada - entrada) / 60000));
      return acc + esperaMinutos;
    }, 0);

    return Math.round(totalMinutos / atendidosComEspera.length);
  };

  const tempoMedioEspera = calculateAverageWaitTime();

  // Dados para Gráficos Mocks em SVG Estilizados
  // A. Atendimentos por Hora (08h às 18h)
  const atendimentosPorHora = [
    { hora: '08h', qtd: 4 },
    { hora: '09h', qtd: 8 },
    { hora: '10h', qtd: 15 },
    { hora: '11h', qtd: 11 },
    { hora: '12h', qtd: 3 },
    { hora: '13h', qtd: 6 },
    { hora: '14h', qtd: 12 },
    { hora: '15h', qtd: 14 },
    { hora: '16h', qtd: 9 },
    { hora: '17h', qtd: 5 },
  ];

  // B. Distribuição por Prioridade
  const countGestantes = filaFiltrada.filter(f => f.tipo_prioridade === 'GESTANTE').length;
  const countIdosos = filaFiltrada.filter(f => f.tipo_prioridade === 'IDOSO').length;
  const countNormais = filaFiltrada.filter(f => f.tipo_prioridade === 'NORMAL').length;
  const totalFila = countGestantes + countIdosos + countNormais || 1;

  const pctGestante = Math.round((countGestantes / totalFila) * 100);
  const pctIdoso = Math.round((countIdosos / totalFila) * 100);
  const pctNormal = Math.round((countNormais / totalFila) * 100);

  return (
    <>
      <Header />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-colors duration-300">
        
        {/* Aviso de Perfil */}
        {user?.perfil !== 'administrador' && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-bold">Modo de Visualização Demonstrativa</h4>
              <p className="text-xs mt-1">
                Você está visualizando o Dashboard de Administrador. Para testar restrições reais de login corporativo, altere o perfil no botão de atalhos rápidos da tela de login.
              </p>
            </div>
          </div>
        )}

        {/* Dashboard Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <TrendingUp className="h-7 w-7 text-primary animate-pulse" />
              Painel Administrativo
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitore indicadores de produtividade, tempos de espera e distribuição de chamadas em tempo real.
            </p>
          </div>

          {/* Sector Selector */}
          <div className="flex items-center gap-2 bg-card border border-border p-1.5 rounded-lg shadow-sm w-fit self-start">
            <span className="text-xs font-semibold px-2 text-muted-foreground uppercase">Setor:</span>
            <select
              value={selectedSetor}
              onChange={(e) => setSelectedSetor(e.target.value)}
              className="bg-transparent text-sm font-bold text-foreground focus:outline-none border-none pr-6 cursor-pointer dark:text-foreground"
            >
              <option value="Todos">Todos os Setores</option>
              {setores.map(s => (
                <option key={s.id} value={s.nome}>{s.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-8">
          
          {/* Card 1: Aguardando */}
          <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Aguardando</span>
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold">{aguardandoCount}</span>
              <span className="block text-[10px] text-muted-foreground mt-1">Pacientes na fila ativa</span>
            </div>
          </div>

          {/* Card 2: Em Atendimento */}
          <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Em Serviço</span>
              <Stethoscope className="h-5 w-5 text-secondary" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-secondary">{emAtendimentoCount}</span>
              <span className="block text-[10px] text-muted-foreground mt-1">Consultas em andamento</span>
            </div>
          </div>

          {/* Card 3: Tempo de Espera */}
          <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Tempo Médio</span>
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold">{tempoMedioEspera} min</span>
              <span className="block text-[10px] text-muted-foreground mt-1">Tempo de espera atual</span>
            </div>
          </div>

          {/* Card 4: Total Atendido */}
          <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Atendidos</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-emerald-500">{totalAtendido}</span>
              <span className="block text-[10px] text-muted-foreground mt-1">Finalizados hoje</span>
            </div>
          </div>

          {/* Card 5: Prioridades */}
          <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Prioritários</span>
              <AlertCircle className="h-5 w-5 text-pink-500" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-pink-500">{prioritariosAguardando}</span>
              <span className="block text-[10px] text-muted-foreground mt-1 font-medium">Idoso/Gestante fila</span>
            </div>
          </div>

          {/* Card 6: Salas Ativas */}
          <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Salas</span>
              <DoorOpen className="h-5 w-5 text-slate-500" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold">{consultoriosAtivos}</span>
              <span className="block text-[10px] text-muted-foreground mt-1">Salas/Consultórios ativos</span>
            </div>
          </div>
        </div>

        {/* Charts and Visual Analytics */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
          
          {/* Chart A: Atendimentos por Hora (SVG Bar Chart) */}
          <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl shadow-sm">
            <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Volume de Atendimentos por Hora do Dia
            </h3>
            
            <div className="relative h-64 w-full flex items-end justify-between gap-1 pt-6 px-2">
              {/* Grid Lines */}
              <div className="absolute inset-x-0 top-6 border-t border-border/50 text-[10px] text-muted-foreground/60 pt-1">15 pacientes</div>
              <div className="absolute inset-x-0 top-24 border-t border-border/50 text-[10px] text-muted-foreground/60 pt-1">10 pacientes</div>
              <div className="absolute inset-x-0 bottom-14 border-t border-border/50 text-[10px] text-muted-foreground/60 pt-1">5 pacientes</div>
              
              {/* Bars */}
              {atendimentosPorHora.map((item, idx) => {
                const heightPercentage = Math.min(100, (item.qtd / 15) * 100);
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 group z-10">
                    <div className="relative w-full flex items-end justify-center h-44">
                      {/* Tooltip */}
                      <span className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded shadow">
                        {item.qtd}
                      </span>
                      {/* Bar fill */}
                      <div 
                        style={{ height: `${heightPercentage}%` }}
                        className="w-4/5 max-w-[28px] rounded-t bg-primary group-hover:bg-primary/80 transition-all cursor-pointer shadow-sm"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground mt-2">{item.hora}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart B: Prioridade Distribution (SVG Donut Chart representation) */}
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col justify-between">
            <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-secondary" />
              Proporção de Prioridades
            </h3>

            {/* Circular Pie Indicator */}
            <div className="flex items-center justify-center py-4">
              <div className="relative h-36 w-36 flex items-center justify-center">
                {/* SVG circular track representation */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Gray Circle */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border)" strokeWidth="3" />
                  {/* Normal priorities (blue segment) */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--priority-normal)" strokeWidth="3.2" 
                    strokeDasharray={`${pctNormal || 60} ${100 - (pctNormal || 60)}`} strokeDashoffset="0" />
                  {/* Idoso priority (amber segment) */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--priority-idoso)" strokeWidth="3.2" 
                    strokeDasharray={`${pctIdoso || 25} ${100 - (pctIdoso || 25)}`} strokeDashoffset={`-${pctNormal || 60}`} />
                  {/* Gestante priority (pink segment) */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--priority-gestante)" strokeWidth="3.2" 
                    strokeDasharray={`${pctGestante || 15} ${100 - (pctGestante || 15)}`} strokeDashoffset={`-${(pctNormal || 60) + (pctIdoso || 25)}`} />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-lg font-extrabold text-foreground">{totalFila}</span>
                  <span className="text-[9px] text-muted-foreground uppercase font-bold">Total Fila</span>
                </div>
              </div>
            </div>

            {/* Legends */}
            <div className="space-y-2 mt-4 text-xs font-semibold">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-priority-normal"></span>
                  <span className="text-muted-foreground">Normal</span>
                </div>
                <span>{countNormais} ({pctNormal}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-priority-idoso"></span>
                  <span className="text-muted-foreground">Idoso (60+)</span>
                </div>
                <span>{countIdosos} ({pctIdoso}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-priority-gestante"></span>
                  <span className="text-muted-foreground">Gestante</span>
                </div>
                <span>{countGestantes} ({pctGestante}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recente Atendimentos Log */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Log Recente de Atendimento
            </h3>
            <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-bold">Tempo Real</span>
          </div>

          {filaFiltrada.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Não há atendimentos registrados na fila para este setor hoje.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground font-bold uppercase">
                    <th className="py-3 px-4">Paciente</th>
                    <th className="py-3 px-4">Prioridade</th>
                    <th className="py-3 px-4">Setor</th>
                    <th className="py-3 px-4">Consultório</th>
                    <th className="py-3 px-4">Horário Entrada</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {filaFiltrada.slice(-5).reverse().map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold">{item.paciente?.nome || 'Desconhecido'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                          item.tipo_prioridade === 'GESTANTE' ? 'bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400' :
                          item.tipo_prioridade === 'IDOSO' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' :
                          'bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'
                        }`}>{item.tipo_prioridade === "IDOSO" ? "PRIORIDADE" : item.tipo_prioridade}</span>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground font-medium">{item.setor}</td>
                      <td className="py-3.5 px-4 font-semibold">{item.consultorio || '—'}</td>
                      <td className="py-3.5 px-4 text-muted-foreground text-xs">
                        {new Date(item.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                          item.status === 'FINALIZADO' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' :
                          item.status === 'EM_ATENDIMENTO' ? 'bg-primary/20 text-primary dark:text-primary-light' :
                          item.status === 'CHAMANDO' ? 'bg-accent-light text-accent-foreground' :
                          item.status === 'AUSENTE' ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' :
                          'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
