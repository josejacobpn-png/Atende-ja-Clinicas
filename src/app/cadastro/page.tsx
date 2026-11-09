'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useQueue } from '@/context/QueueContext';
import { Paciente, TipoPrioridade } from '@/lib/supabaseMock';
import { db } from '@/lib/db';
import { printTicket58mm } from '@/lib/printUtils';
import { 
  UserPlus, 
  User, 
  FileText, 
  Phone, 
  Calendar, 
  Baby, 
  Hospital, 
  AlignLeft,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function CadastroPage() {
  const router = useRouter();
  const { pacientes, cadastrarPaciente, user, setores, funcoes, activeUnidade } = useQueue();
  const reduzirCampos = activeUnidade?.reduzir_campos_cadastro ?? false;
  const agruparPorFuncao = activeUnidade?.agrupar_fila_por_funcao ?? false;

  // Form State
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [cns, setCns] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNasc, setDataNasc] = useState('');
  const [sexo, setSexo] = useState('Feminino');
  const [gestante, setGestante] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [setor, setSetor] = useState('');
  const [prioridadeManual, setPrioridadeManual] = useState(false);
  const [classificacaoRisco, setClassificacaoRisco] = useState<TipoPrioridade | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-sync select options
  useEffect(() => {
    if (agruparPorFuncao) {
      if (funcoes.length > 0 && !setor) setSetor(funcoes[0].nome);
    } else {
      if (setores.length > 0 && !setor) setSetor(setores[0].nome);
    }
  }, [setores, funcoes, setor, agruparPorFuncao]);

  const [searchResults, setSearchResults] = useState<Paciente[]>([]);
  const [isImported, setIsImported] = useState(false);

  const handleSelectPaciente = (paciente: Paciente) => {
    setNome(paciente.nome || '');
    setCpf(paciente.cpf || '');
    setCns(paciente.cns || '');
    setTelefone(paciente.telefone || '');
    setDataNasc(paciente.data_nascimento || '');
    setSexo(paciente.sexo || 'Feminino');
    setGestante(paciente.gestante || false);
    
    setIsImported(true);
    setSearchResults([]);
  };

  const handleClearImport = () => {
    setNome('');
    setCpf('');
    setCns('');
    setTelefone('');
    setDataNasc('');
    setSexo('Feminino');
    setGestante(false);
    setPrioridadeManual(false);
    
    setIsImported(false);
    setSearchResults([]);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(e.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      const val = cpf.trim();
      if (val.length < 3) {
        setSearchResults([]);
        return;
      }
      
      try {
        const cleanVal = val.replace(/\D/g, '');
        // Local search: partial match
        let foundList = pacientes.filter(p => p.cpf && (p.cpf.includes(val) || (cleanVal.length >= 3 && p.cpf.replace(/\D/g, '').includes(cleanVal))));
        
        // If nothing local and we have a db search
        if (foundList.length === 0 && 'findByCpf' in db.pacientes) {
          // findByCpf returns a single exact match, we can at least show that
          const exact = await (db.pacientes as any).findByCpf(val);
          if (exact) foundList = [exact];
        }
        setSearchResults(foundList.slice(0, 5));
      } catch (err) {
        console.error("Erro ao buscar CPF:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [cpf, pacientes]);

  const handleCpfKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const val = cpf.trim();
      let found = searchResults.length > 0 ? searchResults[0] : null;
      
      if (!found && val.length > 0) {
        const cleanVal = val.replace(/\D/g, '');
        found = pacientes.find(p => p.cpf && (p.cpf === val || p.cpf.replace(/\D/g, '') === cleanVal)) || null;
        if (!found && 'findByCpf' in db.pacientes) {
          try { found = await (db.pacientes as any).findByCpf(val); } catch (err) {}
        }
      }

      if (found) {
        handleSelectPaciente(found);
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);

    // Aplicar máscara (00) 00000-0000
    if (val.length > 6) {
      val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
    } else if (val.length > 2) {
      val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
    }
    setTelefone(val);
  };

  const handleCnsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 15);
    setCns(val);
  };

  // Calcular idade rápida baseada em data de nascimento
  const getCalculatedAge = () => {
    if (!dataNasc) return null;
    const birthDate = new Date(dataNasc);
    const ageDiff = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const age = getCalculatedAge();

  const getPriorityPreview = () => {
    if (activeUnidade?.usa_classificacao_risco && classificacaoRisco) {
      return classificacaoRisco;
    }

    let prioridade: 'NORMAL' | 'IDOSO' | 'GESTANTE' = 'NORMAL';
    if (reduzirCampos) {
      if (prioridadeManual) {
        prioridade = 'IDOSO'; // Using IDOSO as generic priority since the database only supports NORMAL, IDOSO, GESTANTE
      }
    } else {
      if (gestante) prioridade = 'GESTANTE';
      else if (age !== null && age >= 60) prioridade = 'IDOSO';
    }
    return prioridade;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!cpf.trim()) {
      alert('O campo CPF é obrigatório.');
      return;
    }
    if (!reduzirCampos && cns.length < 15 && cns.length > 0) {
      alert('O Cartão Nacional de Saúde (CNS) deve conter 15 dígitos.');
      return;
    }

    try {
      const finalCns = cns || `000000${Math.floor(100000000 + Math.random() * 900000000)}`.slice(0, 15);
      const finalDataNasc = dataNasc || '1990-01-01';

      // Executar cadastro e adição automática na fila
      await cadastrarPaciente({
        nome,
        cpf,
        cns: finalCns,
        telefone,
        data_nascimento: finalDataNasc,
        sexo,
        gestante,
        observacoes,
        setor,
        prioridade_manual: prioridadeManual,
        classificacao_risco: activeUnidade?.usa_classificacao_risco && classificacaoRisco ? classificacaoRisco : undefined,
      });

      // Dispara a impressão na bobina de 58mm
      const imprimirTicket = activeUnidade?.imprimir_ticket ?? true;
      if (imprimirTicket) {
        const isPriority = reduzirCampos ? prioridadeManual : getPriorityPreview() !== 'NORMAL';
        printTicket58mm(nome, isPriority, setor);
      }

      // Resetar formulário e redirecionar
      router.push('/fila');
    } catch (error) {
      console.error('Erro ao admitir paciente:', error);
      alert('Erro ao admitir paciente: ' + (error instanceof Error ? error.message : 'Verifique os dados ou a conexão.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full transition-colors duration-300">
        
        {/* Form Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <UserPlus className="h-7 w-7 text-primary" />
            Admitir Paciente no Sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre as informações básicas para posicionar o paciente na fila de atendimento do setor em tempo real.
          </p>
        </div>

        {/* Cadastro Card */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-lg relative overflow-hidden">
          {/* Subtle decoration */}
          <div className="absolute top-0 right-0 -mt-6 -mr-6 h-20 w-20 rounded-full bg-primary/5 blur-lg"></div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {isImported && (
              <div className="mb-6 flex items-center justify-between bg-primary/10 border border-primary/20 px-3 py-2 rounded-lg text-xs font-bold text-primary">
                <span className="flex items-center gap-1.5 animate-pulse">
                  ✨ Dados do paciente importados com sucesso! (Cadastro existente)
                </span>
                <button
                  type="button"
                  onClick={handleClearImport}
                  className="underline hover:text-primary/80 transition-colors cursor-pointer font-extrabold"
                >
                  Limpar Dados / Novo Cadastro
                </button>
              </div>
            )}
            
            {/* Secção 1: Identificação */}
            <div className="border-b border-border pb-4 mb-4">
              <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5 mb-4">
                <User className="h-3.5 w-3.5" />
                1. Informações de Identificação
              </span>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                
                {/* CPF */}
                <div className="sm:col-span-2">
                  <label htmlFor="cpf" className="block text-sm font-semibold mb-2">CPF do Paciente</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <input
                      id="cpf"
                      type="text"
                      required
                      value={cpf}
                      onChange={handleCpfChange}
                      onKeyDown={handleCpfKeyDown}
                      placeholder="Digite o CPF para buscar ou cadastrar..."
                      className="pl-10 w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                    />
                    {searchResults.length > 0 && !isImported && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-lg shadow-xl z-20 overflow-hidden divide-y divide-border">
                        <div className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          Pacientes encontrados (Clique ou Enter):
                        </div>
                        {searchResults.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPaciente(p)}
                            className="w-full px-4 py-3 text-left hover:bg-muted/80 flex flex-col gap-0.5 transition-colors cursor-pointer animate-fade-in"
                          >
                            <span className="font-bold text-sm text-foreground">{p.nome}</span>
                            <span className="text-xs text-muted-foreground">
                              CPF: {p.cpf} | CNS: {p.cns} | Nasc: {p.data_nascimento ? new Date(p.data_nascimento).toLocaleDateString('pt-BR') : '--'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Nome */}
                <div className="sm:col-span-2">
                  <label htmlFor="nome" className="block text-sm font-semibold mb-2">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <input
                      id="nome"
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Maria da Silva Souza"
                      className="pl-10 w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                    />
                  </div>
                </div>

                {/* CNS */}
                {!reduzirCampos && (
                  <div>
                    <label htmlFor="cns" className="block text-sm font-semibold mb-2">Cartão SUS (CNS)</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <input
                        id="cns"
                        type="text"
                        value={cns}
                        onChange={handleCnsChange}
                        placeholder="15 dígitos numéricos"
                        className="pl-10 w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Data Nascimento */}
                {!reduzirCampos && (
                  <div>
                    <label htmlFor="datanasc" className="block text-sm font-semibold mb-2">Data de Nascimento</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <input
                        id="datanasc"
                        type="date"
                        value={dataNasc}
                        onChange={(e) => setDataNasc(e.target.value)}
                        className="pl-10 pr-4 w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Telefone */}
                {!reduzirCampos && (
                  <div>
                    <label htmlFor="telefone" className="block text-sm font-semibold mb-2">Telefone de Contato</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <input
                        id="telefone"
                        type="text"
                        value={telefone}
                        onChange={handlePhoneChange}
                        placeholder="(00) 00000-0000"
                        className="pl-10 w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Sexo */}
                {!reduzirCampos && (
                  <div>
                    <label htmlFor="sexo" className="block text-sm font-semibold mb-2">Sexo Biológico</label>
                    <select
                      id="sexo"
                      value={sexo}
                      onChange={(e) => setSexo(e.target.value)}
                      className="w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground px-3 transition-colors"
                    >
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                )}

                {/* Gestante Checkbox */}
                {!reduzirCampos && sexo !== 'Masculino' && (
                  <div className="flex items-center gap-3 h-11 mt-8 pl-1">
                    <input
                      id="gestante"
                      type="checkbox"
                      checked={gestante}
                      onChange={(e) => setGestante(e.target.checked)}
                      className="h-5 w-5 text-primary border-border rounded focus:ring-primary/50 cursor-pointer"
                    />
                    <label htmlFor="gestante" className="text-sm font-bold flex items-center gap-1.5 cursor-pointer text-foreground select-none">
                      <Baby className="h-4 w-4 text-pink-500" />
                      Paciente Gestante
                    </label>
                  </div>
                )}

                {/* Prioridade Manual Checkbox (Simplified Mode) */}
                {!activeUnidade?.usa_classificacao_risco && reduzirCampos && (
                  <div className="flex items-center gap-3 h-11 mt-8 pl-1">
                    <input
                      id="prioridadeManual"
                      type="checkbox"
                      checked={prioridadeManual}
                      onChange={(e) => setPrioridadeManual(e.target.checked)}
                      className="h-5 w-5 text-primary border-border rounded focus:ring-primary/50 cursor-pointer"
                    />
                    <label htmlFor="prioridadeManual" className="text-sm font-bold flex items-center gap-1.5 cursor-pointer text-foreground select-none">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Atendimento Prioritário
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Secção de Classificação de Risco (Manchester) */}
            {activeUnidade?.usa_classificacao_risco && (
              <div className="mt-8">
                <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5 mb-4">
                  <Hospital className="h-3.5 w-3.5" />
                  Classificação de Risco
                </span>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { val: 'VERMELHO', label: 'Emergência', color: 'bg-red-600', text: 'text-white' },
                    { val: 'AMARELO', label: 'Urgente', color: 'bg-yellow-500', text: 'text-white' },
                    { val: 'VERDE_PRIORIDADE', label: 'Prioridade', color: 'bg-emerald-600', text: 'text-white' },
                    { val: 'VERDE', label: 'Pouco Urgente', color: 'bg-emerald-400', text: 'text-white' },
                    { val: 'AZUL', label: 'Não Urgente', color: 'bg-blue-500', text: 'text-white' }
                  ].map((risk) => (
                    <button
                      key={risk.val}
                      type="button"
                      onClick={() => setClassificacaoRisco(risk.val as TipoPrioridade)}
                      className={`
                        p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2
                        ${classificacaoRisco === risk.val ? `border-${risk.color.replace('bg-', '')} ring-4 ring-${risk.color.replace('bg-', '')}/30 scale-105 shadow-md` : 'border-border/50 hover:border-muted-foreground/30'}
                      `}
                    >
                      <div className={`w-8 h-8 rounded-full ${risk.color} shadow-sm`} />
                      <span className="text-xs font-bold text-center leading-tight text-foreground">{risk.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Secção 2: Atendimento */}
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5 mb-4">
                <Hospital className="h-3.5 w-3.5" />
                2. Destino do Atendimento
              </span>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Setor */}
                <div>
                  <label htmlFor="setor" className="block text-sm font-semibold mb-2">{agruparPorFuncao ? 'Função do Atendimento' : 'Setor/Fila de Atendimento'}</label>
                  <select
                    id="setor"
                    value={setor}
                    onChange={(e) => setSetor(e.target.value)}
                    className="w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground px-3 transition-colors cursor-pointer"
                    required
                  >
                    <option value="" disabled>Selecione {agruparPorFuncao ? 'a Função' : 'a Fila/Setor'}</option>
                    {agruparPorFuncao
                      ? funcoes.map(f => (
                          <option key={f.id} value={f.nome}>{f.nome}</option>
                        ))
                      : setores.map(s => (
                          <option key={s.id} value={s.nome}>{s.nome}</option>
                        ))}
                  </select>
                </div>

                {/* Observações */}
                <div className="sm:col-span-2">
                  <label htmlFor="obs" className="block text-sm font-semibold mb-2">Observações / Sintomas / Alertas</label>
                  <div className="relative">
                    <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <textarea
                      id="obs"
                      rows={3}
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Ex: Alérgico a penicilina, febre alta desde ontem, etc."
                      className="pl-10 pr-4 py-2.5 w-full bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Priority Preview Banner */}
            {activeUnidade?.usa_classificacao_risco ? (
              classificacaoRisco ? (
                <div className="p-4 rounded-xl border bg-primary-light/5 border-primary/20 flex justify-between items-center text-sm font-bold text-foreground mt-6">
                  <span className="flex items-center gap-1.5 text-xs text-primary uppercase">
                    <Sparkles className="h-4 w-4 animate-spin text-primary" />
                    Classificação Selecionada:
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs text-white uppercase font-bold
                    ${classificacaoRisco === 'VERMELHO' ? 'bg-red-600' :
                      classificacaoRisco === 'AMARELO' ? 'bg-yellow-500' :
                      classificacaoRisco === 'VERDE_PRIORIDADE' ? 'bg-emerald-600' :
                      classificacaoRisco === 'VERDE' ? 'bg-emerald-400' :
                      'bg-blue-500'}
                  `}>
                    {classificacaoRisco.replace('_', ' ')}
                  </span>
                </div>
              ) : null
            ) : (!reduzirCampos && dataNasc) || (reduzirCampos && prioridadeManual) ? (
              <div className="p-4 rounded-xl border bg-primary-light/5 border-primary/20 flex justify-between items-center text-sm font-bold text-foreground mt-6">
                <span className="flex items-center gap-1.5 text-xs text-primary uppercase">
                  <Sparkles className="h-4 w-4 animate-spin text-primary" />
                  Triagem de Prioridade:
                </span>
                <span className={`px-3 py-1 rounded-full text-xs text-white ${
                  reduzirCampos ? (prioridadeManual ? 'bg-priority-idoso' : 'bg-priority-normal') :
                  getPriorityPreview().includes('IDOSO') ? 'bg-priority-idoso' :
                  getPriorityPreview().includes('GESTANTE') ? 'bg-priority-gestante' :
                  'bg-priority-normal'
                }`}>
                  {reduzirCampos ? (prioridadeManual ? 'ATENDIMENTO PRIORITÁRIO' : 'NORMAL') : getPriorityPreview()}
                </span>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t border-border justify-end">
              <button
                type="button"
                onClick={() => router.push('/fila')}
                className="px-5 h-11 border border-border rounded-lg text-sm font-semibold hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 h-11 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 transition-colors shadow flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Admitindo...' : 'Admitir na Fila'}
                {!isSubmitting && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
