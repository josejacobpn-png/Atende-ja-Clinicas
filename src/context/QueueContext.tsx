'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/db';
import type { Paciente, FilaAtendimento, Consultorio, Usuario, Unidade, Funcao, TipoPrioridade, Setor } from '@/lib/supabaseMock';
import { safeStorage } from '@/lib/safeStorage';
import { reorderFilaList, sortFilaAguardando } from '@/lib/queueUtils';
const localStorage = safeStorage;

// Interfaces adicionais
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error' | 'warning';
}

interface CallNotification {
  pacienteNome: string;
  consultorio: string;
  timestamp: number;
  unidade_id?: string;
}

interface QueueContextType {
  user: Usuario | null;
  pacientes: Paciente[];
  fila: FilaAtendimento[];
  consultorios: Consultorio[];
  unidades: Unidade[];
  activeUnidade: Unidade | null;
  funcoes: Funcao[];
  configVoz: { rate: number; pitch: number; volume: number };
  activeRoom: Consultorio | null;
  darkMode: boolean;
  toasts: Toast[];
  currentCall: CallNotification | null;
  logoUrl: string;
  campaigns: string[];
  isGlobalCallActive: boolean;

  // Ações
  login: (email: string, password?: string, perfil?: string) => Promise<boolean>;
  logout: () => void;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  toggleDarkMode: () => void;
  setActiveRoom: (room: Consultorio | null) => void;
  setActiveUnidade: (unidade: Unidade | null) => void;
  saveConfigVoz: (config: { rate: number; pitch: number; volume: number }) => void;
  setLogoUrl: (url: string) => void;

  // Gestão de Pacientes & Fila & Unidades & Funções
  cadastrarPaciente: (data: {
    nome: string;
    cpf: string;
    cns: string;
    telefone: string;
    data_nascimento: string;
    sexo: string;
    gestante: boolean;
    observacoes: string;
    setor: string;
    prioridade_manual?: boolean;
    classificacao_risco?: TipoPrioridade;
  }) => Promise<FilaAtendimento>;

  chamarProximo: (setor: string) => Promise<FilaAtendimento | null>;
  chamarManualmente: (filaId: string, consultorioNome: string) => Promise<void>;
  iniciarAtendimento: (filaId: string) => Promise<void>;
  finalizarAtendimento: (filaId: string) => Promise<void>;
  marcarAusente: (filaId: string) => Promise<void>;
  retornarParaFila: (filaId: string) => Promise<void>;
  encaixeEmergencial: (filaId: string) => Promise<void>;
  removerDaFila: (filaId: string) => Promise<void>;
  toggleConsultorioAtivo: (id: string) => Promise<void>;
  cadastrarConsultorio: (nome: string, setor: string) => Promise<void>;
  removerConsultorio: (id: string) => Promise<void>;
  cadastrarUnidade: (nome: string, endereco?: string, cnes?: string, reduzir_campos_cadastro?: boolean, imprimir_ticket?: boolean, usa_classificacao_risco?: boolean) => Promise<Unidade>;
  removerUnidade: (id: string) => Promise<void>;
  toggleReduzirCamposUnidade: (id: string, value: boolean) => Promise<void>;
  toggleAgruparFilaUnidade: (id: string, value: boolean) => Promise<void>;
  toggleImprimirTicketUnidade: (id: string, value: boolean) => Promise<void>;
  toggleClassificacaoRisco: (id: string, value: boolean) => Promise<void>;
  cadastrarFuncao: (nome: string) => Promise<Funcao>;
  setores: Setor[];
  cadastrarSetor: (nome: string) => Promise<Setor>;
  removerSetor: (id: string) => Promise<void>;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [pacientes, setPacientesState] = useState<Paciente[]>([]);
  const pacientesRef = useRef<Paciente[]>([]);

  const setPacientes = useCallback((action: React.SetStateAction<Paciente[]>) => {
    setPacientesState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      pacientesRef.current = next;
      return next;
    });
  }, []);

  const [fila, setFila] = useState<FilaAtendimento[]>([]);
  const [consultorios, setConsultorios] = useState<Consultorio[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [activeUnidade, setActiveUnidadeState] = useState<Unidade | null>(null);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [configVoz, setConfigVoz] = useState({ rate: 1.0, pitch: 1.0, volume: 1.0 });
  const [activeRoom, setActiveRoom] = useState<Consultorio | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentCall, setCurrentCall] = useState<CallNotification | null>(null);
  const [isGlobalCallActive, setIsGlobalCallActive] = useState(false);
  const [logoUrl, setLogoUrlState] = useState('/logo-pref.png');

  const campaigns = [
    'Vacinação contra a Gripe: Proteja sua família, procure a sala de vacinas.',
    'Outubro Rosa: Prevenir é um ato de amor-próprio. Faça sua mamografia.',
    'Novembro Azul: Homem também se cuida! Previna-se contra o câncer de próstata.',
    'Combate à Dengue: Evite acúmulo de água limpa. A prevenção começa em casa.',
    'Amamentação: Nutrição e amor. A UBS apoia o aleitamento materno exclusivo.',
  ];

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ─── Carregamento de dados ───────────────────────────────────────────────────

  const reloadData = useCallback(async (currentUnidade: Unidade | null) => {
    const [allPacientes, allFila, allRooms] = await Promise.all([
      db.pacientes.select() as Promise<Paciente[]>,
      db.fila.select() as Promise<FilaAtendimento[]>,
      db.consultorios.select() as Promise<Consultorio[]>,
    ]);

    setPacientes(allPacientes);

    const isTvPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/tv');
    let targetUnit = currentUnidade;

    if (isTvPage) {
      const tvUnitId = localStorage.getItem('ubs_tv_unidade_id');
      const allUnits = await (db.unidades.select() as Promise<Unidade[]>);
      targetUnit = allUnits.find((u) => u.id === tvUnitId) || null;
    }

    if (targetUnit?.id) {
      setFila(reorderFilaList(allFila.filter((f) => f.unidade_id === targetUnit!.id)));
      setConsultorios(allRooms.filter((r) => r.unidade_id === targetUnit!.id));
    } else {
      setFila(reorderFilaList(allFila));
      setConsultorios(allRooms);
    }

    setConfigVoz(db.configVoz.get());
  }, []);

  const reloadGlobals = useCallback(async () => {
    const [allUnidades, allFuncoes, allSetores] = await Promise.all([
      db.unidades.select() as Promise<Unidade[]>,
      db.funcoes.select() as Promise<Funcao[]>,
      db.setores.select() as Promise<Setor[]>,
    ]);
    setUnidades(allUnidades);
    setFuncoes(allFuncoes);
    setSetores(allSetores);
  }, []);

  // ─── Inicialização ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const getCurrentUnit = async (): Promise<Unidade | null> => {
      const isTvPage = window.location.pathname.startsWith('/tv');
      if (isTvPage) {
        const tvUnitId = localStorage.getItem('ubs_tv_unidade_id');
        const allUnits = await (db.unidades.select() as Promise<Unidade[]>);
        return allUnits.find((u) => u.id === tvUnitId) || null;
      } else {
        const latestUnidade = localStorage.getItem('ubs_active_unidade');
        try {
          return latestUnidade ? JSON.parse(latestUnidade) : null;
        } catch {
          return null;
        }
      }
    };

    // Assina atualizações em tempo real
    const unsubscribe = db.subscribe(async (payload) => {
      const currentUnit = await getCurrentUnit();
      if (payload.type === 'DB_UPDATE') {
        const { table, payload: dbPayload } = payload;
        if (!dbPayload) return;
        
        const { eventType, new: newRow, old: oldRow } = dbPayload;

        if (table === 'fila_atendimento') {
          if (eventType === 'INSERT') {
            setFila((prev) => {
              // Evitar duplicação entre atualização otimista (manual) e Realtime
              if (prev.some(f => f.id === newRow.id)) return prev;

              const row = { ...newRow } as FilaAtendimento;
              // Anexar paciente sincronamente usando o ref
              const pac = pacientesRef.current.find((p) => p.id === row.paciente_id);
              if (pac) row.paciente = pac;

              return reorderFilaList([...prev, row]);
            });
          } else if (eventType === 'UPDATE') {
            setFila((prev) =>
              reorderFilaList(
                prev.map((item) => {
                  if (item.id === newRow.id) {
                    const updated = { ...item, ...newRow };
                    if (item.paciente && !newRow.paciente) {
                      updated.paciente = item.paciente;
                    } else if (!updated.paciente) {
                      // Se não tinha antes e ainda não tem, tenta buscar no ref
                      const pac = pacientesRef.current.find((p) => p.id === updated.paciente_id);
                      if (pac) updated.paciente = pac;
                    }
                    return updated;
                  }
                  return item;
                })
              )
            );
          } else if (eventType === 'DELETE') {
            setFila((prev) => prev.filter((item) => item.id !== oldRow.id));
          }
        } else if (table === 'pacientes') {
          if (eventType === 'INSERT') {
            setPacientes((prev) => {
              if (prev.some(p => p.id === newRow.id)) return prev;
              return [...prev, newRow as Paciente];
            });
          } else if (eventType === 'UPDATE') {
            setPacientes((prev) => prev.map((item) => (item.id === newRow.id ? { ...item, ...newRow } : item)));
            // Atualizar referências de paciente na fila se houver
            setFila((prevFila) =>
              prevFila.map((f) =>
                f.paciente_id === newRow.id ? { ...f, paciente: { ...f.paciente, ...newRow } as Paciente } : f
              )
            );
          } else if (eventType === 'DELETE') {
            setPacientes((prev) => prev.filter((item) => item.id !== oldRow.id));
          }
        } else if (table === 'consultorios') {
          if (eventType === 'INSERT') setConsultorios((prev) => [...prev, newRow as Consultorio]);
          else if (eventType === 'UPDATE') setConsultorios((prev) => prev.map((item) => (item.id === newRow.id ? { ...item, ...newRow } : item)));
          else if (eventType === 'DELETE') setConsultorios((prev) => prev.filter((item) => item.id !== oldRow.id));
        } else if (table === 'unidades') {
          if (eventType === 'INSERT') setUnidades((prev) => [...prev, newRow as Unidade]);
          else if (eventType === 'UPDATE') setUnidades((prev) => prev.map((item) => (item.id === newRow.id ? { ...item, ...newRow } : item)));
          else if (eventType === 'DELETE') setUnidades((prev) => prev.filter((item) => item.id !== oldRow.id));
        }
      } else if (payload.type === 'AUDIO_CALL') {
        setIsGlobalCallActive(true);
        setTimeout(() => setIsGlobalCallActive(false), 8000);
        let pacienteNome = payload.pacienteNome;
        
        if (!pacienteNome && payload.paciente_id) {
          setPacientes((pacs) => {
            const pac = pacs.find((p) => p.id === payload.paciente_id);
            if (pac) pacienteNome = pac.nome;
            return pacs;
          });
        }

        setCurrentCall({
          pacienteNome: pacienteNome ?? 'Paciente',
          consultorio: payload.consultorio,
          timestamp: Date.now(),
          unidade_id: payload.unidade_id,
        });
      } else if (payload.type === 'CONFIG_UPDATE') {
        setConfigVoz(payload.config);
      }
    });


    // Sincronização remota via SSE (safeStorage)
    const handleRemoteStorageUpdate = async (e: Event) => {
      const currentUnit = await getCurrentUnit();
      await reloadData(currentUnit);
      await reloadGlobals();
      setConfigVoz(db.configVoz.get());
    };
    window.addEventListener('safeStorageUpdate', handleRemoteStorageUpdate);

    // AUDIO_CALL remoto (safeStorage / SSE)
    const handleRemoteAudioCall = async (e: Event) => {
      setIsGlobalCallActive(true);
      setTimeout(() => setIsGlobalCallActive(false), 8000);
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const allPacientes = await (db.pacientes.select() as Promise<Paciente[]>);
      const pac = allPacientes.find((p) => p.id === detail.paciente_id);
      setCurrentCall({
        pacienteNome: pac?.nome ?? 'Paciente',
        consultorio: detail.consultorio || '',
        timestamp: Date.now(),
        unidade_id: detail.unidade_id,
      });
      const currentUnit = await getCurrentUnit();
      await reloadData(currentUnit);
    };
    window.addEventListener('remoteAudioCall', handleRemoteAudioCall);

    // Restaurar sessão salva
    const savedUser = localStorage.getItem('ubs_active_user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch {}
    }

    const savedRoom = localStorage.getItem('ubs_active_room');
    if (savedRoom) {
      try { setActiveRoom(JSON.parse(savedRoom)); } catch {}
    }

    const savedLogo = localStorage.getItem('ubs_logo_url');
    if (savedLogo) setLogoUrlState(savedLogo);

    const isDark =
      localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    // Carregamento inicial assíncrono
    (async () => {
      await reloadGlobals();
      const isTvPage = window.location.pathname.startsWith('/tv');
      let currentUnit: Unidade | null = null;

        if (isTvPage) {
          const tvUnitId = localStorage.getItem('ubs_tv_unidade_id');
          const allUnits = await (db.unidades.select() as Promise<Unidade[]>);
          currentUnit = allUnits.find((u) => u.id === tvUnitId) || null;
          if (currentUnit) setActiveUnidadeState(currentUnit);
        } else {
          const allUnits = await (db.unidades.select() as Promise<Unidade[]>);
          const savedUnidade = localStorage.getItem('ubs_active_unidade');
          if (savedUnidade) {
            try {
              const parsed: Unidade = JSON.parse(savedUnidade);
              const validUnit = allUnits.find((u) => u.id === parsed.id);
              if (validUnit) {
                currentUnit = validUnit;
              } else {
                console.warn('[QueueContext] Unidade salva tem ID inválido. Usando primeira unidade.');
                currentUnit = allUnits[0] ?? null;
              }
            } catch {}
          }
          
          if (!currentUnit) {
            // Auto select based on user or first unit
            const savedUserStr = localStorage.getItem('ubs_active_user');
            let u: Usuario | null = null;
            if (savedUserStr) {
              try { u = JSON.parse(savedUserStr); } catch {}
            }
            currentUnit = allUnits.find((un) => un.id === u?.unidade_id) || allUnits[0] || null;
          }

          if (currentUnit) {
            setActiveUnidadeState(currentUnit);
            localStorage.setItem('ubs_active_unidade', JSON.stringify(currentUnit));
          } else {
            localStorage.removeItem('ubs_active_unidade');
          }
        }

      await reloadData(currentUnit);
    })();

    return () => {
      unsubscribe();
      window.removeEventListener('safeStorageUpdate', handleRemoteStorageUpdate);
      window.removeEventListener('remoteAudioCall', handleRemoteAudioCall);
    };
  }, [reloadData, reloadGlobals]);

  // ─── Autenticação ────────────────────────────────────────────────────────────

  const login = async (email: string, password?: string, perfil?: string): Promise<boolean> => {
    const users = await (db.usuarios.select() as Promise<Usuario[]>);
    let found = users.find((u) => u.email === email);

    if (!found && perfil) {
      found = users.find((u) => u.perfil === perfil);
    }

    if (found) {
      if (password && found.senha && found.senha !== password) {
        addToast('Senha incorreta.', 'error');
        return false;
      }
      setUser(found);
      localStorage.setItem('ubs_active_user', JSON.stringify(found));

      const allUnits = await (db.unidades.select() as Promise<Unidade[]>);
      const userUnit = allUnits.find((u) => u.id === found!.unidade_id);
      const targetUnit = userUnit ?? allUnits[0] ?? null;
      if (targetUnit) {
        setActiveUnidadeState(targetUnit);
        localStorage.setItem('ubs_active_unidade', JSON.stringify(targetUnit));
        await reloadData(targetUnit);
      }

      addToast(`Bem-vindo, ${found.nome}!`, 'success');
      return true;
    }

    addToast('E-mail ou credenciais inválidas.', 'error');
    return false;
  };

  const logout = () => {
    setUser(null);
    setActiveRoom(null);
    setActiveUnidadeState(null);
    localStorage.removeItem('ubs_active_user');
    localStorage.removeItem('ubs_active_room');
    localStorage.removeItem('ubs_active_unidade');
    addToast('Sessão encerrada com sucesso.', 'info');
  };

  // ─── UI ─────────────────────────────────────────────────────────────────────

  const toggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      addToast('Modo Escuro ativado.', 'info');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      addToast('Modo Claro ativado.', 'info');
    }
  };

  const setLogoUrl = (url: string) => {
    setLogoUrlState(url);
    localStorage.setItem('ubs_logo_url', url);
    addToast('Logo da prefeitura atualizada!', 'success');
  };

  const handleSetActiveRoom = (room: Consultorio | null) => {
    setActiveRoom(room);
    if (room) {
      localStorage.setItem('ubs_active_room', JSON.stringify(room));
      addToast(`Consultório definido para: ${room.nome}`, 'success');
    } else {
      localStorage.removeItem('ubs_active_room');
    }
  };

  const handleSetActiveUnidade = async (unidade: Unidade | null) => {
    setActiveUnidadeState(unidade);
    if (unidade) {
      localStorage.setItem('ubs_active_unidade', JSON.stringify(unidade));
      addToast(`Unidade ativa alterada para: ${unidade.nome}`, 'info');
      await reloadData(unidade);
      setActiveRoom(null);
      localStorage.removeItem('ubs_active_room');
    } else {
      localStorage.removeItem('ubs_active_unidade');
      await reloadData(null);
    }
  };

  const saveConfigVoz = (config: { rate: number; pitch: number; volume: number }) => {
    setConfigVoz(config);
    db.configVoz.save(config);
    addToast('Configurações de voz sintetizada salvas!', 'success');
  };

  // ─── Pacientes & Fila ───────────────────────────────────────────────────────

  const cadastrarPaciente = async (data: {
    nome: string;
    cpf: string;
    cns: string;
    telefone: string;
    data_nascimento: string;
    sexo: string;
    gestante: boolean;
    observacoes: string;
    setor: string;
    prioridade_manual?: boolean;
    classificacao_risco?: TipoPrioridade;
  }): Promise<FilaAtendimento> => {
    if (!activeUnidade) {
      addToast('Nenhuma unidade ativa selecionada.', 'warning');
      throw new Error('Nenhuma unidade ativa.');
    }

    const birthDate = new Date(data.data_nascimento);
    const ageDiff = Date.now() - birthDate.getTime();
    const idade = Math.abs(new Date(ageDiff).getUTCFullYear() - 1970);

    let prioridade: TipoPrioridade = 'NORMAL';
    if (data.classificacao_risco) prioridade = data.classificacao_risco;
    else if (data.prioridade_manual) prioridade = 'IDOSO'; // Uses IDOSO as generic priority
    else if (idade >= 60) prioridade = 'IDOSO';
    else if (data.gestante) prioridade = 'GESTANTE';

    let pacienteObj: Paciente | null = await (db.pacientes as any).findByCpf(data.cpf);

    if (!pacienteObj) {
      pacienteObj = await (db.pacientes.insert({
        nome: data.nome,
        cpf: data.cpf,
        cns: data.cns,
        telefone: data.telefone,
        data_nascimento: data.data_nascimento,
        sexo: data.sexo,
        gestante: data.gestante,
        prioridade,
        observacoes: data.observacoes,
      }) as Promise<Paciente>);
    }

    const novoItemFila = await (db.fila.insert({
      unidade_id: activeUnidade.id,
      paciente_id: pacienteObj.id,
      setor: data.setor,
      tipo_prioridade: prioridade,
    }) as Promise<FilaAtendimento>);

    addToast(`Paciente ${pacienteObj.nome} adicionado(a) na fila!`, 'success');
    
    // Atualiza o estado localmente para evitar problemas de cache do Next.js no reloadData
    setFila((prev) => {
      if (prev.some(f => f.id === novoItemFila.id)) {
        return prev.map(f => f.id === novoItemFila.id ? novoItemFila : f);
      }
      return reorderFilaList([...prev, novoItemFila]);
    });

    return novoItemFila;
  };

  const chamarProximo = async (setor: string): Promise<FilaAtendimento | null> => {
    if (!activeRoom) {
      addToast('Selecione seu consultório/sala antes de chamar o próximo.', 'warning');
      return null;
    }

    const targetSetor = (setor || activeRoom.setor || '').trim();
    const setorNorm = targetSetor.toLowerCase();

    // 1. Busca prioritariamente na fila ativa em memória que o usuário vê na tela
    const filaDoSetor = fila.filter(f => (f.setor || '').trim().toLowerCase() === setorNorm);
    const sortedDaFila = sortFilaAguardando(filaDoSetor.length > 0 ? filaDoSetor : fila, targetSetor);
    let proximo: FilaAtendimento | null = sortedDaFila.length > 0 ? sortedDaFila[0] : null;

    // 2. Se não encontrou na memória e há unidade ativa, busca no banco
    if (!proximo && activeUnidade) {
      proximo = await (db.fila.getNextPatientToCall(targetSetor, activeUnidade.id) as Promise<FilaAtendimento | null>);
    }

    if (!proximo) {
      addToast(`Não há pacientes aguardando atendimento no setor ${targetSetor || 'selecionado'}.`, 'info');
      return null;
    }

    const updated = await (db.fila.update(proximo.id, {
      status: 'CHAMANDO',
      consultorio: activeRoom.nome,
    }) as Promise<FilaAtendimento>);

    // Atualiza estado local imediatamente para refletir na tela
    setFila(prev => prev.map(f => f.id === proximo!.id ? { 
      ...f, 
      status: 'CHAMANDO', 
      consultorio: activeRoom.nome, 
      hora_chamada: new Date().toISOString() 
    } : f));

    const nomePaciente = proximo.paciente?.nome || (Array.isArray(proximo.paciente) ? (proximo.paciente as any)[0]?.nome : 'Paciente');
    addToast(`Chamando paciente: ${nomePaciente}`, 'success');
    return updated;
  };

  const chamarManualmente = async (filaId: string, consultorioNome: string): Promise<void> => {
    await db.fila.update(filaId, { status: 'CHAMANDO', consultorio: consultorioNome });
    setFila(prev => prev.map(f => f.id === filaId ? { 
      ...f, 
      status: 'CHAMANDO', 
      consultorio: consultorioNome, 
      hora_chamada: new Date().toISOString() 
    } : f));
    addToast('Rechamada enviada para o Painel da TV.', 'info');
  };

  const iniciarAtendimento = async (filaId: string): Promise<void> => {
    await db.fila.update(filaId, { status: 'EM_ATENDIMENTO' });
    addToast('Atendimento iniciado.', 'success');
  };

  const finalizarAtendimento = async (filaId: string): Promise<void> => {
    await db.fila.update(filaId, { status: 'FINALIZADO' });
    addToast('Atendimento finalizado.', 'success');
  };

  const marcarAusente = async (filaId: string): Promise<void> => {
    await db.fila.update(filaId, { status: 'AUSENTE' });
    addToast('Paciente marcado como ausente.', 'warning');
  };

  const retornarParaFila = async (filaId: string): Promise<void> => {
    await db.fila.update(filaId, { status: 'AGUARDANDO' });
    addToast('Paciente retornado para a fila.', 'info');
  };

  const encaixeEmergencial = async (filaId: string): Promise<void> => {
    await db.fila.update(filaId, { tipo_prioridade: 'URGENCIA' });
    addToast('Paciente reordenado com prioridade máxima de encaixe!', 'success');
  };

  const removerDaFila = async (filaId: string): Promise<void> => {
    // Para manter compatibilidade com o mock (que não tem delete na fila),
    // fazemos update de status para FINALIZADO como forma de remoção lógica.
    // No modo real, filtramos na UI apenas status ativos.
    const allFila = await (db.fila.select() as Promise<FilaAtendimento[]>);
    const item = allFila.find((f) => f.id === filaId);
    if (item) {
      await db.fila.update(filaId, { status: 'FINALIZADO' });
    }
    addToast('Paciente removido da fila.', 'warning');
  };

  // ─── Consultórios ────────────────────────────────────────────────────────────

  const toggleConsultorioAtivo = async (id: string): Promise<void> => {
    try {
      const rooms = await (db.consultorios.select() as Promise<Consultorio[]>);
      const target = rooms.find((r) => r.id === id);
      if (target) {
        await db.consultorios.update(id, { ativo: !target.ativo });
        addToast(`Status de ${target.nome} atualizado!`, 'success');
        await reloadData(activeUnidade);
      }
    } catch (err: any) {
      console.error('[toggleConsultorioAtivo]', err);
      addToast(`Erro ao atualizar consultório: ${err?.message ?? 'verifique o console'}`, 'error');
    }
  };

  const cadastrarConsultorio = async (nome: string, setor: string): Promise<void> => {
    if (!activeUnidade?.id) {
      addToast('Selecione uma unidade ativa primeiro.', 'warning');
      return;
    }
    try {
      await db.consultorios.insert({ unidade_id: activeUnidade.id, nome, setor, ativo: true });
      addToast(`Consultório ${nome} cadastrado com sucesso!`, 'success');
      await reloadData(activeUnidade);
    } catch (err: any) {
      console.error('[cadastrarConsultorio]', err);
      addToast(`Erro ao cadastrar consultório: ${err?.message ?? 'verifique o console (F12)'}`, 'error');
    }
  };

  const removerConsultorio = async (id: string): Promise<void> => {
    try {
      await db.consultorios.delete(id);
      if (activeRoom?.id === id) {
        setActiveRoom(null);
        localStorage.removeItem('ubs_active_room');
      }
      await reloadData(activeUnidade);
    } catch (err: any) {
      console.error('[removerConsultorio]', err);
      addToast(`Erro ao remover consultório: ${err?.message ?? 'verifique o console'}`, 'error');
    }
  };

  // ─── Unidades ────────────────────────────────────────────────────────────────

  const cadastrarUnidade = async (nome: string, endereco?: string, cnes?: string, reduzir_campos_cadastro?: boolean, imprimir_ticket?: boolean, usa_classificacao_risco?: boolean): Promise<Unidade> => {
    try {
      const newUnit = await (db.unidades.insert({ nome, endereco, codigo_cnes: cnes, reduzir_campos_cadastro, imprimir_ticket: imprimir_ticket ?? true, usa_classificacao_risco: usa_classificacao_risco ?? false }) as Promise<Unidade>);
      await reloadGlobals();
      addToast(`Unidade ${nome} cadastrada com sucesso!`, 'success');
      return newUnit;
    } catch (err: any) {
      console.error('[cadastrarUnidade]', err);
      addToast(`Erro ao cadastrar unidade: ${err?.message ?? 'verifique o console'}`, 'error');
      throw err;
    }
  };

  const removerUnidade = async (id: string): Promise<void> => {
    try {
      await db.unidades.delete(id);
      await reloadGlobals();
      
      if (activeUnidade?.id === id) {
        const allUnits = await (db.unidades.select() as Promise<Unidade[]>);
        const nextUnit = allUnits.length > 0 ? allUnits[0] : null;
        setActiveUnidadeState(nextUnit);
        if (nextUnit) {
          localStorage.setItem('ubs_active_unidade', JSON.stringify(nextUnit));
        } else {
          localStorage.removeItem('ubs_active_unidade');
        }
        await reloadData(nextUnit);
        setActiveRoom(null);
        localStorage.removeItem('ubs_active_room');
      }

      addToast('Unidade removida com sucesso.', 'success');
    } catch (err: any) {
      console.error('[removerUnidade]', err);
      addToast(`Erro ao remover unidade: ${err?.message ?? 'verifique o console'}`, 'error');
    }
  };

  const toggleReduzirCamposUnidade = async (id: string, value: boolean): Promise<void> => {
    try {
      if ('update' in db.unidades) {
        await (db.unidades as any).update(id, { reduzir_campos_cadastro: value });
      }
      await reloadGlobals();
      if (activeUnidade?.id === id) {
        setActiveUnidadeState(prev => prev ? { ...prev, reduzir_campos_cadastro: value } : null);
        localStorage.setItem('ubs_active_unidade', JSON.stringify({ ...activeUnidade, reduzir_campos_cadastro: value }));
      }
      addToast('Configuração da unidade atualizada!', 'success');
    } catch (err: any) {
      console.error('[toggleReduzirCamposUnidade]', err);
      addToast(`Erro ao atualizar unidade: ${err?.message ?? 'verifique o console'}`, 'error');
    }
  };

  const toggleAgruparFilaUnidade = async (id: string, value: boolean): Promise<void> => {
    try {
      if ('update' in db.unidades) {
        await (db.unidades as any).update(id, { agrupar_fila_por_funcao: value });
      }
      await reloadGlobals();
      if (activeUnidade?.id === id) {
        setActiveUnidadeState(prev => prev ? { ...prev, agrupar_fila_por_funcao: value } : null);
        localStorage.setItem('ubs_active_unidade', JSON.stringify({ ...activeUnidade, agrupar_fila_por_funcao: value }));
      }
      addToast('Configuração de agrupamento da unidade atualizada!', 'success');
    } catch (err: any) {
      console.error('[toggleAgruparFilaUnidade]', err);
      addToast(`Erro ao atualizar unidade: ${err?.message ?? 'verifique o console'}`, 'error');
    }
  };

  const toggleImprimirTicketUnidade = async (id: string, value: boolean): Promise<void> => {
    try {
      if ('update' in db.unidades) {
        await (db.unidades as any).update(id, { imprimir_ticket: value });
      }
      await reloadGlobals();
      if (activeUnidade?.id === id) {
        setActiveUnidadeState(prev => prev ? { ...prev, imprimir_ticket: value } : null);
        localStorage.setItem('ubs_active_unidade', JSON.stringify({ ...activeUnidade, imprimir_ticket: value }));
      }
      addToast('Configuração de impressão da unidade atualizada!', 'success');
    } catch (err: any) {
      console.error('[toggleImprimirTicketUnidade]', err);
      addToast(`Erro ao atualizar unidade: ${err?.message ?? 'verifique o console'}`, 'error');
    }
  };

  const toggleClassificacaoRisco = async (id: string, value: boolean): Promise<void> => {
    try {
      if ('update' in db.unidades) {
        await (db.unidades as any).update(id, { usa_classificacao_risco: value });
      }
      await reloadGlobals();
      if (activeUnidade?.id === id) {
        setActiveUnidadeState(prev => prev ? { ...prev, usa_classificacao_risco: value } : null);
        localStorage.setItem('ubs_active_unidade', JSON.stringify({ ...activeUnidade, usa_classificacao_risco: value }));
      }
      addToast('Configuração de classificação de risco atualizada!', 'success');
    } catch (err: any) {
      console.error('[toggleClassificacaoRisco]', err);
      addToast(`Erro ao atualizar unidade: ${err?.message ?? 'verifique o console'}`, 'error');
    }
  };

  // ─── Funções ─────────────────────────────────────────────────────────────────

  const cadastrarFuncao = async (nome: string): Promise<Funcao> => {
    const newFunc = await (db.funcoes.insert({ nome }) as Promise<Funcao>);
    await reloadGlobals();
    addToast(`Função ${nome} cadastrada com sucesso!`, 'success');
    return newFunc;
  };

  // ─── Setores ─────────────────────────────────────────────────────────────────

  const cadastrarSetor = async (nome: string): Promise<Setor> => {
    const newSetor = await (db.setores.insert({ nome }) as Promise<Setor>);
    await reloadGlobals();
    return newSetor;
  };

  const removerSetor = async (id: string): Promise<void> => {
    await db.setores.delete(id);
    await reloadGlobals();
  };

  // ─── Provider ────────────────────────────────────────────────────────────────

  return (
    <QueueContext.Provider
      value={{
        user,
        pacientes,
        fila,
        consultorios,
        unidades,
        activeUnidade,
        funcoes,
        configVoz,
        activeRoom,
        darkMode,
        toasts,
        currentCall,
        logoUrl,
        campaigns,
        isGlobalCallActive,
        login,
        logout,
        addToast,
        removeToast,
        toggleDarkMode,
        setActiveRoom: handleSetActiveRoom,
        setActiveUnidade: handleSetActiveUnidade,
        saveConfigVoz,
        setLogoUrl,
        cadastrarPaciente,
        chamarProximo,
        chamarManualmente,
        iniciarAtendimento,
        finalizarAtendimento,
        marcarAusente,
        retornarParaFila,
        encaixeEmergencial,
        removerDaFila,
        toggleConsultorioAtivo,
        cadastrarConsultorio,
        removerConsultorio,
        cadastrarUnidade,
        removerUnidade,
        toggleReduzirCamposUnidade,
        toggleAgruparFilaUnidade,
        toggleImprimirTicketUnidade,
        toggleClassificacaoRisco,
        cadastrarFuncao,
        setores,
        cadastrarSetor,
        removerSetor,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (context === undefined) {
    throw new Error('useQueue deve ser usado dentro de um QueueProvider');
  }
  return context;
};
