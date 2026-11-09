'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import { useQueue } from '@/context/QueueContext';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  UserX,
  Stethoscope
} from 'lucide-react';

export default function RelatoriosPage() {
  const { fila, consultorios } = useQueue();

  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [nomeFilter, setNomeFilter] = useState('');
  const [cpfFilter, setCpfFilter] = useState('');

  // Filtrar apenas pacientes com base na data, nome e cpf
  const filaFiltrada = fila.filter(f => {
    const dataFila = new Date(f.hora_entrada).toISOString().split('T')[0];
    const matchData = dateFilter ? dataFila === dateFilter : true;
    
    const nomePaciente = f.paciente?.nome?.toLowerCase() || '';
    const matchNome = nomeFilter ? nomePaciente.includes(nomeFilter.toLowerCase()) : true;

    const cpfPaciente = f.paciente?.cpf?.replace(/\D/g, '') || '';
    const cleanCpfFilter = cpfFilter.replace(/\D/g, '');
    const matchCpf = cleanCpfFilter ? cpfPaciente.includes(cleanCpfFilter) : true;

    return matchData && matchNome && matchCpf;
  });

  // 1. Métricas de Atendimento do Relatório
  const totalFila = filaFiltrada.length;
  const finalizados = filaFiltrada.filter(f => f.status === 'FINALIZADO');
  const totalAtendidos = finalizados.length;
  
  const totalAguardando = filaFiltrada.filter(f => f.status === 'AGUARDANDO').length;
  const totalAusentes = filaFiltrada.filter(f => f.status === 'AUSENTE').length;

  // Filtrar idosos e gestantes
  const totalIdosos = filaFiltrada.filter(f => f.tipo_prioridade === 'IDOSO').length;
  const totalGestantes = filaFiltrada.filter(f => f.tipo_prioridade === 'GESTANTE').length;

  // 2. Tempo Médio de Espera Geral
  const calculateWaitTimeAvg = () => {
    const comChamada = filaFiltrada.filter(f => (f.status === 'FINALIZADO' || f.status === 'EM_ATENDIMENTO') && f.hora_chamada);
    if (comChamada.length === 0) return 0;
    
    const soma = comChamada.reduce((acc, curr) => {
      const entrada = new Date(curr.hora_entrada).getTime();
      const chamada = new Date(curr.hora_chamada!).getTime();
      return acc + Math.max(0, (chamada - entrada) / 60000);
    }, 0);
    return Math.round(soma / comChamada.length);
  };
  
  const waitTimeAvg = calculateWaitTimeAvg();

  // 3. Produtividade por Profissional (Mapeado por Consultório de Atendimento)
  const getProductivity = () => {
    const stats: Record<string, { total: number; tempoAtendimentoMedio: number }> = {};

    filaFiltrada.filter(f => f.consultorio).forEach(item => {
      const doc = item.consultorio!;
      if (!stats[doc]) {
        stats[doc] = { total: 0, tempoAtendimentoMedio: 0 };
      }
      stats[doc].total += 1;

      // Calcular tempo de atendimento se finalizado
      if (item.hora_inicio && item.hora_finalizacao) {
        const inicio = new Date(item.hora_inicio).getTime();
        const fim = new Date(item.hora_finalizacao).getTime();
        const tempoMinutos = Math.max(1, Math.floor((fim - inicio) / 60000));
        stats[doc].tempoAtendimentoMedio = stats[doc].tempoAtendimentoMedio === 0 
          ? tempoMinutos 
          : Math.round((stats[doc].tempoAtendimentoMedio + tempoMinutos) / 2);
      }
    });

    return Object.entries(stats).map(([nome, val]) => ({
      consultorio: nome,
      atendimentos: val.total,
      duracaoMedia: val.tempoAtendimentoMedio || 10, // Default 10 minutos se em andamento
    }));
  };

  const listProductivity = getProductivity();

  // 4. Exportação para Excel (Formato CSV)
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Paciente;Prioridade;Setor;Consultorio;Status;Hora Entrada;Hora Chamada;Hora Finalizado\n';

    fila.forEach(f => {
      const row = [
        f.paciente?.nome || 'Sem Nome',
        f.tipo_prioridade,
        f.setor,
        f.consultorio || '—',
        f.status,
        f.hora_entrada ? new Date(f.hora_entrada).toLocaleTimeString() : '—',
        f.hora_chamada ? new Date(f.hora_chamada).toLocaleTimeString() : '—',
        f.hora_finalizacao ? new Date(f.hora_finalizacao).toLocaleTimeString() : '—',
      ].join(';');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_atendimentos_ubs_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 5. Impressão de Relatório Oficial (PDF)
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-colors duration-300 print:p-0">
        
        {/* Style block dedicated to printing reports in high-end design */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            header, nav, button, select, input, .print-hide {
              display: none !important;
            }
            main {
              background: white !important;
              color: black !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
            }
            .print-show {
              display: block !important;
            }
            .print-border {
              border: 1px solid #000 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
          }
        `}} />

        {/* Page Header (Print Hide) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 print-hide">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              Relatórios e Estatísticas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Exporte planilhas analíticas ou emita relatórios oficiais de atendimentos e produtividade médica.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {/* Export buttons */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 h-10 border border-border bg-card font-semibold px-4 rounded-lg shadow-sm hover:bg-muted text-sm transition-colors text-foreground cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Exportar Excel / CSV
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-2 h-10 bg-primary text-primary-foreground font-semibold px-4 rounded-lg shadow hover:bg-primary/95 text-sm transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Imprimir Relatório (PDF)
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm mb-8 print-hide grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-foreground">Data do Atendimento</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input 
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 h-10 w-full bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-foreground">Nome do Paciente</label>
            <input 
              type="text"
              placeholder="Pesquisar por nome..."
              value={nomeFilter}
              onChange={(e) => setNomeFilter(e.target.value)}
              className="px-3 h-10 w-full bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-foreground">CPF do Paciente</label>
            <input 
              type="text"
              placeholder="Pesquisar por CPF..."
              value={cpfFilter}
              onChange={(e) => setCpfFilter(e.target.value)}
              className="px-3 h-10 w-full bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
          </div>
        </div>

        {/* Print-Only Official Report Header */}
        <div className="hidden print-show mb-8 border-b-2 border-black pb-4 text-center">
          <h1 className="text-2xl font-black uppercase text-black">Prefeitura Municipal de Saúde</h1>
          <h2 className="text-lg font-bold text-black mt-1">Relatório Consolidado de Atendimento - Atende Já</h2>
          <div className="flex justify-between items-center text-xs font-semibold text-black mt-4 px-2">
            <span>Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</span>
            <span>Filtro de Referência: {new Date(dateFilter).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* KPI Report Cards Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-8 print:grid-cols-3">
          
          <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex flex-col justify-between print:border-slate-800">
            <span className="text-[10px] font-bold text-muted-foreground uppercase print:text-black">Espera Média</span>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-2xl font-black print:text-black">{waitTimeAvg} min</span>
              <Clock className="h-5 w-5 text-primary print:text-black print-hide" />
            </div>
          </div>

          <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex flex-col justify-between print:border-slate-800">
            <span className="text-[10px] font-bold text-muted-foreground uppercase print:text-black">Finalizados</span>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-2xl font-black text-emerald-500 print:text-black">{totalAtendidos}</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-500 print:text-black print-hide" />
            </div>
          </div>

          <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex flex-col justify-between print:border-slate-800">
            <span className="text-[10px] font-bold text-muted-foreground uppercase print:text-black">Aguardando Fila</span>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-2xl font-black print:text-black">{totalAguardando}</span>
              <Users className="h-5 w-5 text-sky-500 print:text-black print-hide" />
            </div>
          </div>

          <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex flex-col justify-between print:border-slate-800">
            <span className="text-[10px] font-bold text-muted-foreground uppercase print:text-black">Ausentes</span>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-2xl font-black text-rose-500 print:text-black">{totalAusentes}</span>
              <UserX className="h-5 w-5 text-rose-500 print:text-black print-hide" />
            </div>
          </div>

          <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex flex-col justify-between print:border-slate-800">
            <span className="text-[10px] font-bold text-muted-foreground uppercase print:text-black">Atendidos Idosos</span>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-2xl font-black text-amber-500 print:text-black">{totalIdosos}</span>
              <AlertTriangle className="h-5 w-5 text-amber-500 print:text-black print-hide" />
            </div>
          </div>

          <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex flex-col justify-between print:border-slate-800">
            <span className="text-[10px] font-bold text-muted-foreground uppercase print:text-black">Gestantes</span>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-2xl font-black text-pink-500 print:text-black">{totalGestantes}</span>
              <Users className="h-5 w-5 text-pink-500 print:text-black print-hide" />
            </div>
          </div>
        </div>

        {/* Analytical Sections */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-8">
          
          {/* Section A: Productivity List */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 print:border-black">
            <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2 print:text-black">
              <Stethoscope className="h-5 w-5 text-primary print-hide" />
              Produtividade Médica por Consultório
            </h3>

            {listProductivity.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                Sem registros de produtividade para as salas de atendimento de hoje.
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground font-bold uppercase print:text-black print:border-black">
                      <th className="py-2.5 px-3">Sala / Consultório</th>
                      <th className="py-2.5 px-3 text-center">Atendimentos</th>
                      <th className="py-2.5 px-3 text-right">Média Consulta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm print:divide-slate-800">
                    {listProductivity.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/10">
                        <td className="py-3 px-3 font-bold print:text-black">{item.consultorio}</td>
                        <td className="py-3 px-3 text-center font-semibold print:text-black">{item.atendimentos}</td>
                        <td className="py-3 px-3 text-right font-medium text-muted-foreground print:text-black">
                          {item.duracaoMedia} min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section B: Attendance Ratios by Priority Type */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 print:border-black">
            <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2 print:text-black">
              <Users className="h-5 w-5 text-secondary print-hide" />
              Resumo Volumétrico por Fila
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <span className="text-muted-foreground print:text-black">Fila Geral (Normal)</span>
                  <span className="print:text-black">
                    {filaFiltrada.filter(f => f.tipo_prioridade === 'NORMAL').length} pacientes
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden print-hide">
                  <div 
                    style={{ width: `${Math.min(100, (filaFiltrada.filter(f => f.tipo_prioridade === 'NORMAL').length / totalFila) * 100)}%` }} 
                    className="h-full bg-primary"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <span className="text-muted-foreground print:text-black">Fila Prioritária por Idade (Idoso 60+)</span>
                  <span className="print:text-black">
                    {filaFiltrada.filter(f => f.tipo_prioridade === 'IDOSO').length} pacientes
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden print-hide">
                  <div 
                    style={{ width: `${Math.min(100, (filaFiltrada.filter(f => f.tipo_prioridade === 'IDOSO').length / totalFila) * 100)}%` }} 
                    className="h-full bg-priority-idoso"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <span className="text-muted-foreground print:text-black">Fila Prioritária Gestante</span>
                  <span className="print:text-black">
                    {filaFiltrada.filter(f => f.tipo_prioridade === 'GESTANTE').length} pacientes
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden print-hide">
                  <div 
                    style={{ width: `${Math.min(100, (filaFiltrada.filter(f => f.tipo_prioridade === 'GESTANTE').length / totalFila) * 100)}%` }} 
                    className="h-full bg-priority-gestante"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section C: Filtered Data Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 mb-8 print-show">
          <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2 print:text-black">
            <FileText className="h-5 w-5 text-primary print-hide" />
            Relação de Pacientes
          </h3>

          {filaFiltrada.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              Nenhum paciente encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground font-bold uppercase print:text-black print:border-black">
                    <th className="py-2.5 px-3">Paciente</th>
                    <th className="py-2.5 px-3">CPF</th>
                    <th className="py-2.5 px-3">Setor</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Prioridade</th>
                    <th className="py-2.5 px-3">Entrada</th>
                    <th className="py-2.5 px-3">Finalizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm print:divide-slate-800">
                  {filaFiltrada.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/10">
                      <td className="py-3 px-3 font-bold print:text-black">{item.paciente?.nome || 'Sem Nome'}</td>
                      <td className="py-3 px-3 text-muted-foreground print:text-black">{item.paciente?.cpf}</td>
                      <td className="py-3 px-3 print:text-black">{item.setor}</td>
                      <td className="py-3 px-3 print:text-black">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'FINALIZADO' ? 'bg-emerald-100 text-emerald-700' :
                          item.status === 'AGUARDANDO' ? 'bg-sky-100 text-sky-700' :
                          item.status === 'AUSENTE' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        } print:bg-transparent print:p-0 print:text-black`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 print:text-black">{item.tipo_prioridade}</td>
                      <td className="py-3 px-3 print:text-black">
                        {item.hora_entrada ? new Date(item.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="py-3 px-3 print:text-black">
                        {item.hora_finalizacao ? new Date(item.hora_finalizacao).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Print-Only Official Footer */}
        <div className="hidden print-show text-center border-t-2 border-black pt-6 mt-12 text-xs font-bold text-black uppercase">
          <p>Atende Já - Prefeitura Municipal de Saúde</p>
          <p className="mt-1 font-medium">Relatório emitido pelo profissional autenticado via painel de administração corporativo.</p>
        </div>

      </main>
    </>
  );
}
