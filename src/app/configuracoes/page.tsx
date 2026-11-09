'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useQueue } from '@/context/QueueContext';
import { db } from '@/lib/db';
import { Usuario, PerfilUsuario } from '@/lib/supabaseMock';
import { 
  Settings, 
  DoorOpen, 
  Volume2, 
  Palette, 
  Plus, 
  Check, 
  Sliders, 
  Sparkles, 
  Play,
  Activity,
  Hospital,
  Users,
  UserCheck,
  Mail,
  MapPin,
  FileText,
  Lock,
  Pencil,
  Trash2,
  X
} from 'lucide-react';

export default function ConfiguracoesPage() {
  const { 
    user,
    consultorios, 
    toggleConsultorioAtivo, 
    cadastrarConsultorio,
    removerConsultorio,
    configVoz, 
    saveConfigVoz,
    logoUrl, 
    setLogoUrl,
    unidades,
    cadastrarUnidade,
    removerUnidade,
    funcoes,
    cadastrarFuncao,
    activeUnidade,
    addToast,
    setores,
    cadastrarSetor,
    removerSetor,
    fila,
    toggleReduzirCamposUnidade,
    toggleAgruparFilaUnidade,
    toggleImprimirTicketUnidade,
    toggleClassificacaoRisco
  } = useQueue();

  const isSuperUser = user?.perfil === 'administrador' || user?.email === 'g2autodev@gmail.com';

  // Settings tab selection
  const [activeTab, setActiveTab] = useState<'salas' | 'voz' | 'marca' | 'unidades' | 'profissionais' | 'funcoes'>('salas');

  // Nova sala Form
  const [novaSalaNome, setNovaSalaNome] = useState('');
  const [novaSalaSetor, setNovaSalaSetor] = useState('');
  const [novoSetorNome, setNovoSetorNome] = useState('');

  // Check if current active unit groups by function
  const agruparPorFuncao = activeUnidade?.agrupar_fila_por_funcao ?? false;

  // Auto-sync select options
  useEffect(() => {
    if (agruparPorFuncao) {
      if (funcoes.length > 0 && !novaSalaSetor) setNovaSalaSetor(funcoes[0].nome);
    } else {
      if (setores.length > 0 && !novaSalaSetor) setNovaSalaSetor(setores[0].nome);
    }
  }, [setores, funcoes, novaSalaSetor, agruparPorFuncao]);

  // Sliders de voz
  const [voiceRate, setVoiceRate] = useState(configVoz.rate);
  const [voicePitch, setVoicePitch] = useState(configVoz.pitch);
  const [voiceVolume, setVoiceVolume] = useState(configVoz.volume);

  // Logo form
  const [inputLogo, setInputLogo] = useState(logoUrl);

  // Nova Unidade Form
  const [novaUnidadeNome, setNovaUnidadeNome] = useState('');
  const [novaUnidadeEndereco, setNovaUnidadeEndereco] = useState('');
  const [novaUnidadeCnes, setNovaUnidadeCnes] = useState('');
  const [novaUnidadeReduzirCampos, setNovaUnidadeReduzirCampos] = useState(false);
  const [novaUnidadeAgruparFuncao, setNovaUnidadeAgruparFuncao] = useState(false);
  const [novaUnidadeImprimirTicket, setNovaUnidadeImprimirTicket] = useState(true);
  const [novaUnidadeClassificacaoRisco, setNovaUnidadeClassificacaoRisco] = useState(false);

  // Nova Função Form
  const [novaFuncaoNome, setNovaFuncaoNome] = useState('');

  // Novo Profissional Form
  const [novoProfNome, setNovoProfNome] = useState('');
  const [novoProfEmail, setNovoProfEmail] = useState('');
  const [novoProfSenha, setNovoProfSenha] = useState('');
  const [novoProfPerfil, setNovoProfPerfil] = useState<PerfilUsuario>('profissional_saude');
  const [novoProfUnidade, setNovoProfUnidade] = useState('');
  const [novoProfFuncao, setNovoProfFuncao] = useState('');

  // Edição de Profissional
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSenha, setEditSenha] = useState('');
  const [editPerfil, setEditPerfil] = useState<PerfilUsuario>('profissional_saude');
  const [editUnidade, setEditUnidade] = useState('');
  const [editFuncao, setEditFuncao] = useState('');

  // Lista de usuários/profissionais carregada do mock
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    Promise.resolve(db.usuarios.select()).then((users) => setUsuarios(users as Usuario[]));
  }, []);

  useEffect(() => {
    if (unidades.length > 0) {
      setNovoProfUnidade(unidades[0].id);
    }
  }, [unidades]);

  useEffect(() => {
    if (funcoes.length > 0) {
      setNovoProfFuncao(funcoes[0].id);
    }
  }, [funcoes]);

  useEffect(() => {
    const restrictedTabs = ['unidades', 'funcoes', 'profissionais'];
    if (!isSuperUser && restrictedTabs.includes(activeTab)) {
      setActiveTab('salas');
    }
  }, [isSuperUser, activeTab]);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaSalaNome.trim()) return;
    if (!novaSalaSetor) {
      addToast('Selecione ou crie um setor primeiro.', 'warning');
      return;
    }
    cadastrarConsultorio(novaSalaNome, novaSalaSetor);
    setNovaSalaNome('');
  };

  const handleRemoveRoom = (roomId: string, roomNome: string) => {
    const isUsed = fila.some(f => f.consultorio === roomNome && f.status !== 'FINALIZADO' && f.status !== 'AUSENTE');
    if (isUsed) {
      addToast(`O consultório "${roomNome}" possui atendimentos ativos na fila e não pode ser removido.`, 'error');
      return;
    }
    if (confirm(`Tem certeza que deseja remover o consultório "${roomNome}"?`)) {
      removerConsultorio(roomId);
      addToast(`Consultório "${roomNome}" removido com sucesso!`, 'success');
    }
  };

  const handleCreateSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoSetorNome.trim()) return;

    // Check if sector already exists (case insensitive)
    const exists = setores.some(s => s.nome.toLowerCase() === novoSetorNome.trim().toLowerCase());
    if (exists) {
      addToast(`O tipo de atendimento "${novoSetorNome.trim()}" já está cadastrado.`, 'error');
      return;
    }

    cadastrarSetor(novoSetorNome.trim());
    setNovoSetorNome('');
  };

  const handleRemoveSector = (setorNome: string, setorId: string) => {
    // Check if in use by rooms
    const isUsedByRoom = consultorios.some(c => c.setor === setorNome);
    // Check if in use by patients in the active queue
    const isUsedByPatient = fila.some(
      f => f.setor === setorNome && f.status !== 'FINALIZADO' && f.status !== 'AUSENTE'
    );

    if (isUsedByRoom) {
      addToast(`Este setor está sendo utilizado por um ou mais consultórios ativos e não pode ser removido.`, 'error');
      return;
    }
    if (isUsedByPatient) {
      addToast(`Este setor possui pacientes ativos na fila de espera e não pode ser removido.`, 'error');
      return;
    }

    // Default seeded sectors warning (but allow deletion if they explicitly want to)
    const seededNames = ['Médico Geral', 'Pediatria', 'Triagem', 'Vacinação'];
    if (seededNames.includes(setorNome)) {
      if (!confirm(`O setor "${setorNome}" é um tipo de atendimento padrão do sistema. Tem certeza que deseja removê-lo?`)) {
        return;
      }
    }

    removerSetor(setorId);
    addToast(`Setor "${setorNome}" removido com sucesso!`, 'success');

    // Reset novaSalaSetor if it was pointing to the deleted one
    if (novaSalaSetor === setorNome) {
      const remaining = setores.filter(s => s.id !== setorId);
      setNovaSalaSetor(remaining.length > 0 ? remaining[0].nome : '');
    }
  };

  const handleSaveVoiceConfig = () => {
    saveConfigVoz({
      rate: voiceRate,
      pitch: voicePitch,
      volume: voiceVolume,
    });
  };

  // Testar a voz Sintetizada com as novas configurações locais antes de salvar
  const handleTestVoice = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const testUtterance = new SpeechSynthesisUtterance("Chamando Paciente de Teste, dirigir-se à Sala de Exemplo.");
      testUtterance.lang = 'pt-BR';
      testUtterance.rate = voiceRate;
      testUtterance.pitch = voicePitch;
      testUtterance.volume = voiceVolume;
      
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'));
      if (ptVoice) {
        testUtterance.voice = ptVoice;
      }
      
      window.speechSynthesis.speak(testUtterance);
      addToast('Disparando chamada falada de teste!', 'info');
    }
  };

  const handleSaveLogo = () => {
    setLogoUrl(inputLogo);
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaUnidadeNome.trim()) return;
    try {
      const newUnit = await cadastrarUnidade(novaUnidadeNome, novaUnidadeEndereco, novaUnidadeCnes, novaUnidadeReduzirCampos, novaUnidadeImprimirTicket, novaUnidadeClassificacaoRisco);
      if (novaUnidadeAgruparFuncao) {
        await toggleAgruparFilaUnidade(newUnit.id, true);
      }
      setNovaUnidadeNome('');
      setNovaUnidadeEndereco('');
      setNovaUnidadeCnes('');
      setNovaUnidadeReduzirCampos(false);
      setNovaUnidadeAgruparFuncao(false);
      setNovaUnidadeImprimirTicket(true);
      setNovaUnidadeClassificacaoRisco(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveUnit = (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja remover a unidade "${nome}"?`)) {
      removerUnidade(id);
    }
  };

  const handleCreateFunction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaFuncaoNome.trim()) return;
    cadastrarFuncao(novaFuncaoNome);
    setNovaFuncaoNome('');
  };


  const handleCreateProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoProfNome.trim() || !novoProfEmail.trim() || !novoProfSenha.trim() || !novoProfUnidade) return;

    // Verificar e-mail duplicado
    const emailExists = usuarios.some(u => u.email.toLowerCase() === novoProfEmail.trim().toLowerCase());
    if (emailExists) {
      addToast(`Já existe um profissional com o e-mail "${novoProfEmail}".`, 'error');
      return;
    }

    try {
      await Promise.resolve(db.usuarios.insert({
        nome: novoProfNome,
        email: novoProfEmail,
        senha: novoProfSenha,
        perfil: novoProfPerfil,
        unidade_id: novoProfUnidade,
        funcao_id: novoProfFuncao ? novoProfFuncao : undefined
      }));
      addToast(`Profissional ${novoProfNome} cadastrado com sucesso!`, 'success');
      setNovoProfNome('');
      setNovoProfEmail('');
      setNovoProfSenha('');
      const users = await Promise.resolve(db.usuarios.select());
      setUsuarios(users as Usuario[]);
    } catch {
      addToast('Erro ao cadastrar profissional.', 'error');
    }
  };


  const handleOpenEdit = (u: Usuario) => {
    setEditingUser(u);
    setEditNome(u.nome);
    setEditEmail(u.email);
    setEditSenha('');
    setEditPerfil(u.perfil);
    setEditUnidade(u.unidade_id || '');
    setEditFuncao(u.funcao_id || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editNome.trim() || !editEmail.trim()) return;

    // Verificar e-mail duplicado (exceto o próprio usuário)
    const emailExists = usuarios.some(
      u => u.email.toLowerCase() === editEmail.trim().toLowerCase() && u.id !== editingUser.id
    );
    if (emailExists) {
      addToast(`Já existe outro profissional com o e-mail "${editEmail}".`, 'error');
      return;
    }

    const updates: Partial<Omit<Usuario, 'id' | 'created_at'>> = {
      nome: editNome.trim(),
      email: editEmail.trim(),
      perfil: editPerfil,
      unidade_id: editUnidade || undefined,
      funcao_id: editFuncao || undefined,
    };
    if (editSenha.trim()) {
      updates.senha = editSenha.trim();
    }

    Promise.resolve(db.usuarios.update(editingUser.id, updates)).then(() => {
      Promise.resolve(db.usuarios.select()).then((users) => setUsuarios(users as Usuario[]));
      addToast(`Profissional "${editNome}" atualizado com sucesso!`, 'success');
      setEditingUser(null);
    }).catch(() => {
      addToast('Erro ao atualizar profissional.', 'error');
    });
  };

  const handleDeleteProfessional = (u: Usuario) => {
    // Proteger o super usuário
    if (u.email === 'g2autodev@gmail.com' || u.email === 'admin@ubs.gov.br') {
      addToast('Não é possível excluir os super usuários principais do sistema.', 'error');
      return;
    }
    // Proteger o próprio usuário logado
    if (user && u.email === user.email) {
      addToast('Você não pode remover seu próprio usuário.', 'error');
      return;
    }
    if (!confirm(`Tem certeza que deseja remover o profissional "${u.nome}"? Esta ação não pode ser desfeita.`)) return;
    Promise.resolve(db.usuarios.delete(u.id)).then(() => {
      Promise.resolve(db.usuarios.select()).then((users) => setUsuarios(users as Usuario[]));
      addToast(`Profissional "${u.nome}" removido com sucesso.`, 'success');
    }).catch(() => {
      addToast('Erro ao remover profissional.', 'error');
    });
  };

  const getProfileLabel = (perfil: PerfilUsuario) => {
    switch (perfil) {
      case 'administrador': return 'Administrador Geral';
      case 'recepcao': return 'Recepção';
      case 'profissional_saude': return 'Profissional de Saúde';
    }
  };

  const getUserFunctionLabel = (u: Usuario) => {
    if (u.funcao_id) {
      const func = funcoes.find(f => f.id === u.funcao_id);
      if (func) return func.nome;
    }
    return getProfileLabel(u.perfil);
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full transition-colors duration-300">
        
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" />
            Configurações do Sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure salas de atendimento, ajuste a voz sintetizada ou gerencie o cadastro de unidades, funções e profissionais da rede.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          
          {/* LEFT TAB MENU */}
          <div className="flex md:flex-col flex-row gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 border-b md:border-b-0 border-border md:border-none">
            <button
              onClick={() => setActiveTab('salas')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors text-left cursor-pointer flex-shrink-0 ${
                activeTab === 'salas' 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <DoorOpen className="h-4.5 w-4.5" />
              Salas e Consultórios
            </button>
            <button
              onClick={() => setActiveTab('voz')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors text-left cursor-pointer flex-shrink-0 ${
                activeTab === 'voz' 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Volume2 className="h-4.5 w-4.5" />
              Voz Sintetizada (TTS)
            </button>
            {isSuperUser && (
              <>
                <button
                  onClick={() => setActiveTab('unidades')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors text-left cursor-pointer flex-shrink-0 ${
                    activeTab === 'unidades' 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Hospital className="h-4.5 w-4.5" />
                  Unidades
                </button>
                <button
                  onClick={() => setActiveTab('funcoes')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors text-left cursor-pointer flex-shrink-0 ${
                    activeTab === 'funcoes' 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <UserCheck className="h-4.5 w-4.5" />
                  Funções e Cargos
                </button>
                <button
                  onClick={() => setActiveTab('profissionais')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors text-left cursor-pointer flex-shrink-0 ${
                    activeTab === 'profissionais' 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Users className="h-4.5 w-4.5" />
                  Cadastro de Profissionais
                </button>
              </>
            )}

          </div>

          {/* RIGHT PANELS */}
          <div className="md:col-span-3 bg-card border border-border rounded-2xl shadow-md p-6 relative overflow-hidden">
            
            {/* Panel 1: Salas e Setores */}
            {activeTab === 'salas' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <DoorOpen className="h-5 w-5 text-primary" />
                    Gerenciamento de Consultórios e Setores - {activeUnidade ? activeUnidade.nome : 'Todas as Unidades'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cadastre novos consultórios vinculados à sua unidade ativa ou marque salas inativas temporariamente.
                  </p>
                </div>

                {/* Lista de Consultórios Cadastrados */}
                <div className="space-y-2 border-b border-border pb-6">
                  <span className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Consultórios Atuais</span>
                  
                  {consultorios.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-xs">
                      Nenhum consultório cadastrado nesta unidade ainda.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {consultorios.map((c) => (
                        <div 
                          key={c.id}
                          className="p-4 bg-muted/40 border border-border/80 rounded-xl flex justify-between items-center"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground">{c.nome}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">{c.setor}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleConsultorioAtivo(c.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                c.ativo
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 hover:bg-rose-200'
                              }`}
                            >
                              {c.ativo ? 'Disponível' : 'Inativa'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveRoom(c.id, c.nome)}
                              className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                              title="Remover consultório"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form de Cadastro */}
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <span className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Cadastrar Novo Consultório</span>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        required
                        placeholder="Ex: Consultório 04, Sala de Curativos, Triagem B"
                        value={novaSalaNome}
                        onChange={(e) => setNovaSalaNome(e.target.value)}
                        className="w-full h-11 bg-muted/50 border border-border rounded-lg text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                      />
                    </div>
                    
                    <div>
                      <select
                        value={novaSalaSetor}
                        onChange={(e) => setNovaSalaSetor(e.target.value)}
                        className="w-full h-11 bg-muted/50 border border-border rounded-lg text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors cursor-pointer"
                        required
                      >
                        <option value="" disabled>Selecione a {agruparPorFuncao ? 'Função' : 'Fila/Setor'}</option>
                        {agruparPorFuncao
                          ? funcoes.map(f => (
                              <option key={f.id} value={f.nome}>{f.nome}</option>
                            ))
                          : setores.map(s => (
                              <option key={s.id} value={s.nome}>{s.nome}</option>
                            ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 h-11 bg-primary text-primary-foreground font-semibold px-5 rounded-lg shadow hover:bg-primary/95 transition-colors cursor-pointer"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    Criar Consultório
                  </button>
                </form>

                {/* Subseção de Cadastro de Tipos de Atendimento (Setores) */}
                <div className="border-t border-border pt-6 mt-8 space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Sliders className="h-4.5 w-4.5 text-primary" />
                      Tipos de Atendimento (Setores / Filas)
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gerencie as especialidades ou fluxos de atendimento disponíveis na unidade.
                    </p>
                  </div>

                  {/* Listagem de Setores Existentes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                    {setores.map((s) => (
                      <div 
                        key={s.id} 
                        className="p-3 bg-muted/30 border border-border/80 rounded-xl flex justify-between items-center text-xs"
                      >
                        <span className="font-bold text-foreground">{s.nome}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSector(s.nome, s.id)}
                          className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="Remover tipo de atendimento"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Formulário para adicionar setor */}
                  <form onSubmit={handleCreateSector} className="space-y-4">
                    <span className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Adicionar Tipo de Atendimento</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Ex: Ginecologia, Odontologia, Serviço Social"
                        value={novoSetorNome}
                        onChange={(e) => setNovoSetorNome(e.target.value)}
                        className="flex-1 h-11 bg-muted/50 border border-border rounded-lg text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                      />
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 h-11 bg-primary text-primary-foreground font-semibold px-5 rounded-lg shadow hover:bg-primary/95 transition-colors cursor-pointer text-xs"
                      >
                        <Plus className="h-4.5 w-4.5" />
                        Adicionar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Panel 2: Sintetizador de Voz */}
            {activeTab === 'voz' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-primary" />
                    Ajuste da Voz Sintetizada de Chamada
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ajuste a velocidade de leitura e o tom da voz nativa (SpeechSynthesis) que chama os pacientes no Painel da TV.
                  </p>
                </div>

                <div className="space-y-6 border-b border-border pb-6">
                  {/* Volume Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Volume da Voz:</span>
                      <span>{Math.round(voiceVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={voiceVolume}
                      onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Rate Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Velocidade de Fala (Velocidade):</span>
                      <span>{voiceRate.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={voiceRate}
                      onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Pitch Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Tom da Voz (Grave/Agudo):</span>
                      <span>{voicePitch.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={voicePitch}
                      onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleTestVoice}
                    className="flex items-center gap-1.5 h-11 border border-border bg-card hover:bg-muted text-foreground font-semibold px-5 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    <Play className="h-4 w-4" />
                    Testar Chamada Falada
                  </button>
                  <button
                    onClick={handleSaveVoiceConfig}
                    className="flex items-center gap-1.5 h-11 bg-primary text-primary-foreground font-semibold px-5 rounded-lg hover:bg-primary/95 transition-colors shadow cursor-pointer"
                  >
                    <Check className="h-4.5 w-4.5" />
                    Salvar Configurações de Voz
                  </button>
                </div>
              </div>
            )}

            {/* Panel 3: Cadastro de Unidades */}
            {activeTab === 'unidades' && isSuperUser && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Hospital className="h-5 w-5 text-primary" />
                    Cadastro de Unidade
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cadastre novas filiais ou gerencie as unidades do município ativas no sistema.
                  </p>
                </div>

                {/* Lista de Unidades */}
                <div className="space-y-2 border-b border-border pb-6">
                  <span className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Unidades Configuradas</span>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {unidades.map((u) => (
                      <div 
                        key={u.id}
                        className="p-4 bg-muted/40 border border-border/80 rounded-xl flex justify-between items-center"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-foreground">{u.nome}</span>
                          {u.endereco && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {u.endereco}
                            </span>
                          )}
                          {u.codigo_cnes && (
                            <span className="text-[10px] text-primary dark:text-primary-light font-bold uppercase">
                              CNES: {u.codigo_cnes}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <label className="flex items-center gap-2 cursor-pointer text-xs">
                            <input 
                              type="checkbox" 
                              checked={u.reduzir_campos_cadastro || false}
                              onChange={(e) => toggleReduzirCamposUnidade(u.id, e.target.checked)}
                              className="w-4 h-4 rounded text-primary focus:ring-primary/50"
                            />
                            <span className="text-muted-foreground select-none">Cadastro Simplificado</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs">
                            <input 
                              type="checkbox" 
                              checked={u.agrupar_fila_por_funcao || false}
                              onChange={(e) => toggleAgruparFilaUnidade(u.id, e.target.checked)}
                              className="w-4 h-4 rounded text-primary focus:ring-primary/50"
                            />
                            <span className="text-muted-foreground select-none">Agrupar por Função</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs">
                            <input 
                              type="checkbox" 
                              checked={u.imprimir_ticket ?? true}
                              onChange={(e) => toggleImprimirTicketUnidade(u.id, e.target.checked)}
                              className="w-4 h-4 rounded text-primary focus:ring-primary/50"
                            />
                            <span className="text-muted-foreground select-none">Imprimir Ticket</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs">
                            <input 
                              type="checkbox" 
                              checked={u.usa_classificacao_risco || false}
                              onChange={(e) => toggleClassificacaoRisco(u.id, e.target.checked)}
                              className="w-4 h-4 rounded text-primary focus:ring-primary/50"
                            />
                            <span className="text-muted-foreground select-none">Classificação de Risco (Manchester)</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2 mt-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleRemoveUnit(u.id, u.nome)}
                            className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                            title="Remover unidade"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Cadastro Unidade */}
                <form onSubmit={handleCreateUnit} className="space-y-4">
                  <span className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Cadastrar Nova Unidade</span>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold mb-1 text-foreground">Nome da UBS / Clínica</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: UBS Vila Nova, Clínica Centro"
                        value={novaUnidadeNome}
                        onChange={(e) => setNovaUnidadeNome(e.target.value)}
                        className="w-full h-11 bg-muted/50 border border-border rounded-lg text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-foreground">Código CNES (Federal)</label>
                      <input
                        type="text"
                        placeholder="Ex: 7654321"
                        value={novaUnidadeCnes}
                        onChange={(e) => setNovaUnidadeCnes(e.target.value)}
                        className="w-full h-11 bg-muted/50 border border-border rounded-lg text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold mb-1 text-foreground">Endereço Completo</label>
                      <input
                        type="text"
                        placeholder="Ex: Rua das Flores, 500 - Bairro Novo"
                        value={novaUnidadeEndereco}
                        onChange={(e) => setNovaUnidadeEndereco(e.target.value)}
                        className="w-full h-11 bg-muted/50 border border-border rounded-lg text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                      />
                    </div>
                    <div className="sm:col-span-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="reduzirCampos"
                          checked={novaUnidadeReduzirCampos}
                          onChange={(e) => setNovaUnidadeReduzirCampos(e.target.checked)}
                          className="w-4 h-4 rounded text-primary border-border focus:ring-primary/50"
                        />
                        <label htmlFor="reduzirCampos" className="text-sm font-medium text-foreground cursor-pointer select-none">
                          Reduzir campos do cadastro (Apenas Nome e CPF)
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="imprimirTicket"
                          checked={novaUnidadeImprimirTicket}
                          onChange={(e) => setNovaUnidadeImprimirTicket(e.target.checked)}
                          className="w-4 h-4 rounded text-primary border-border focus:ring-primary/50"
                        />
                        <label htmlFor="imprimirTicket" className="text-sm font-medium text-foreground cursor-pointer select-none">
                          Imprimir ticket da senha automaticamente na admissão
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="classificacaoRisco"
                          checked={novaUnidadeClassificacaoRisco}
                          onChange={(e) => setNovaUnidadeClassificacaoRisco(e.target.checked)}
                          className="w-4 h-4 rounded text-primary border-border focus:ring-primary/50"
                        />
                        <label htmlFor="classificacaoRisco" className="text-sm font-medium text-foreground cursor-pointer select-none">
                          Utilizar Classificação de Risco (Cores / Protocolo de Manchester)
                        </label>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 h-11 bg-primary text-primary-foreground font-semibold px-5 rounded-lg shadow hover:bg-primary/95 transition-colors cursor-pointer"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    Criar Unidade
                  </button>
                </form>
              </div>
            )}

            {/* Panel: Funções e Cargos Clínicos */}
            {activeTab === 'funcoes' && isSuperUser && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Cadastro de Funções e Cargos Clínicos
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cadastre os cargos específicos (ex: Médico (a), Enfermeiro (a), Dentista, Recepcionista) para classificar os profissionais da rede municipal.
                  </p>
                </div>

                {/* Lista de Funções */}
                <div className="space-y-2 border-b border-border pb-6">
                  <span className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Funções Cadastradas</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {funcoes.map((f) => (
                      <div 
                        key={f.id}
                        className="p-4 bg-muted/40 border border-border/80 rounded-xl flex justify-between items-center"
                      >
                        <span className="text-sm font-bold text-foreground">{f.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Cadastro Função */}
                <form onSubmit={handleCreateFunction} className="space-y-4">
                  <span className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Cadastrar Nova Função</span>
                  
                  <div className="max-w-md">
                    <input
                      type="text"
                      required
                      placeholder="Ex: Fisioterapeuta, Assistente Social, Dentista"
                      value={novaFuncaoNome}
                      onChange={(e) => setNovaFuncaoNome(e.target.value)}
                      className="w-full h-11 bg-muted/50 border border-border rounded-lg text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 h-11 bg-primary text-primary-foreground font-semibold px-5 rounded-lg shadow hover:bg-primary/95 transition-colors cursor-pointer"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    Criar Função
                  </button>
                </form>
              </div>
            )}

            {/* Panel 4: Cadastro de Profissionais */}
            {activeTab === 'profissionais' && isSuperUser && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Gestão e Cadastro de Profissionais
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cadastre médicos, enfermeiros e recepcionistas, vinculando-os às suas respectivas unidades e funções clínicas de atuação.
                  </p>
                </div>

                {/* Lista de Profissionais */}
                <div className="space-y-2 border-b border-border pb-6 overflow-x-auto">
                  <span className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Profissionais Atuais</span>
                  
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-bold uppercase">
                        <th className="py-2 px-2">Nome</th>
                        <th className="py-2 px-2">E-mail</th>
                        <th className="py-2 px-2">Função / Cargo</th>
                        <th className="py-2 px-2">Unidade Vinculada</th>
                        <th className="py-2 px-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium text-foreground">
                      {usuarios.map((u) => {
                        const unit = unidades.find(unit => unit.id === u.unidade_id);
                        const isSelf = user && u.email === user.email;
                        const isSuper = u.email === 'g2autodev@gmail.com' || u.email === 'admin@ubs.gov.br';
                        return (
                          <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-2 font-bold">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-[10px] shrink-0">
                                  {u.nome.charAt(0).toUpperCase()}
                                </div>
                                <span>{u.nome}</span>
                                {isSelf && <span className="ml-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-bold">Você</span>}
                                {isSuper && !isSelf && <span className="ml-1 px-1.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded text-[10px] font-bold">Super</span>}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-muted-foreground">{u.email}</td>
                            <td className="py-3 px-2 font-semibold">
                              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">
                                {getUserFunctionLabel(u)}
                              </span>
                            </td>
                            <td className="py-3 px-2 font-semibold text-emerald-600 dark:text-emerald-400">
                              {unit ? unit.nome : 'Nenhuma / Administrador'}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(u)}
                                  className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-all cursor-pointer"
                                  title="Editar profissional"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProfessional(u)}
                                  disabled={isSuper || isSelf}
                                  className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  title={isSuper ? 'Super usuário não pode ser removido' : isSelf ? 'Você não pode se remover' : 'Remover profissional'}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Form Cadastro Profissional */}
                <form onSubmit={handleCreateProfessional} className="space-y-4">
                  <span className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Adicionar Profissional</span>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-foreground">Nome Completo</label>
                      <div className="relative">
                        <UserCheck className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          required
                          placeholder="Ex: Dra. Marta Sousa"
                          value={novoProfNome}
                          onChange={(e) => setNovoProfNome(e.target.value)}
                          className="pl-10 w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-foreground">E-mail de Login Corporativo</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <input
                          type="email"
                          required
                          placeholder="marta@ubs.gov.br"
                          value={novoProfEmail}
                          onChange={(e) => setNovoProfEmail(e.target.value)}
                          className="pl-10 w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-foreground">Senha de Acesso</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <input
                          type="password"
                          required
                          placeholder="Senha temporária"
                          value={novoProfSenha}
                          onChange={(e) => setNovoProfSenha(e.target.value)}
                          className="pl-10 w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-foreground">Perfil de Acesso do Sistema</label>
                      <select
                        value={novoProfPerfil}
                        onChange={(e) => setNovoProfPerfil(e.target.value as PerfilUsuario)}
                        className="w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground px-3 transition-colors cursor-pointer"
                      >
                        <option value="profissional_saude">Profissional de Saúde</option>
                        <option value="recepcao">Recepção</option>
                        <option value="administrador">Administrador Geral</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-foreground">Função / Cargo Clínico Específico</label>
                      <select
                        value={novoProfFuncao}
                        onChange={(e) => setNovoProfFuncao(e.target.value)}
                        className="w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground px-3 transition-colors cursor-pointer"
                      >
                        <option value="">Nenhum / Administrativo Puro</option>
                        {funcoes.map((f) => (
                          <option key={f.id} value={f.id}>{f.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-foreground">Unidade de Atuação</label>
                      <select
                        value={novoProfUnidade}
                        onChange={(e) => setNovoProfUnidade(e.target.value)}
                        className="w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground px-3 transition-colors cursor-pointer"
                      >
                        {unidades.map((u) => (
                          <option key={u.id} value={u.id}>{u.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 h-11 bg-primary text-primary-foreground font-semibold px-5 rounded-lg shadow hover:bg-primary/95 transition-colors cursor-pointer mt-2"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    Registrar Profissional
                  </button>
                </form>
              </div>
            )}



          </div>
        </div>
      </main>

      {/* MODAL DE EDIÇÃO DE PROFISSIONAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header do Modal */}
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-sm">
                  {editingUser.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Editar Profissional</h3>
                  <p className="text-xs text-muted-foreground">{editingUser.nome}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Nome */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1 text-foreground">Nome Completo</label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      placeholder="Nome completo"
                      className="pl-10 w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">E-mail de Login</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="email@ubs.gov.br"
                      className="pl-10 w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                    />
                  </div>
                </div>

                {/* Nova Senha (opcional) */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">
                    Nova Senha
                    <span className="ml-1 font-normal text-muted-foreground">(deixe em branco para manter)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={editSenha}
                      onChange={(e) => setEditSenha(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
                    />
                  </div>
                </div>

                {/* Perfil */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">Perfil de Acesso</label>
                  <select
                    value={editPerfil}
                    onChange={(e) => setEditPerfil(e.target.value as PerfilUsuario)}
                    className="w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground px-3 transition-colors cursor-pointer"
                  >
                    <option value="profissional_saude">Profissional de Saúde</option>
                    <option value="recepcao">Recepção</option>
                    <option value="administrador">Administrador Geral</option>
                  </select>
                </div>

                {/* Função */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">Função / Cargo Clínico</label>
                  <select
                    value={editFuncao}
                    onChange={(e) => setEditFuncao(e.target.value)}
                    className="w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground px-3 transition-colors cursor-pointer"
                  >
                    <option value="">Nenhum / Administrativo Puro</option>
                    {funcoes.map((f) => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Unidade */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1 text-foreground">Unidade de Atuação</label>
                  <select
                    value={editUnidade}
                    onChange={(e) => setEditUnidade(e.target.value)}
                    className="w-full h-11 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground px-3 transition-colors cursor-pointer"
                  >
                    <option value="">Nenhuma (Administrador Geral)</option>
                    {unidades.map((u) => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 h-11 border border-border bg-card hover:bg-muted text-foreground font-semibold rounded-lg text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 h-11 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 transition-colors shadow cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
