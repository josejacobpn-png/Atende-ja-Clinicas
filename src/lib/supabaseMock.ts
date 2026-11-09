// ============================================================================
// SIMULADOR DO SUPABASE COM REAL-TIME LOCAL (VIA BROADCASTCHANNEL & LOCALSTORAGE)
// ============================================================================

import { safeStorage } from './safeStorage';
import { sortFilaAguardando } from './queueUtils';
const localStorage = safeStorage;

export type PerfilUsuario = 'administrador' | 'recepcao' | 'profissional_saude';
export type StatusFila = 'AGUARDANDO' | 'CHAMANDO' | 'EM_ATENDIMENTO' | 'FINALIZADO' | 'AUSENTE';
export type TipoPrioridade = 'NORMAL' | 'IDOSO' | 'GESTANTE' | 'URGENCIA' | 'VERMELHO' | 'AMARELO' | 'VERDE_PRIORIDADE' | 'VERDE' | 'AZUL';

export interface Unidade {
  id: string;
  nome: string;
  endereco?: string;
  codigo_cnes?: string;
  reduzir_campos_cadastro?: boolean;
  agrupar_fila_por_funcao?: boolean;
  imprimir_ticket?: boolean;
  usa_classificacao_risco?: boolean;
  created_at: string;
}

export interface Funcao {
  id: string;
  nome: string;
  created_at: string;
}

export interface Usuario {
  id: string;
  unidade_id?: string; // ID da unidade vinculada
  funcao_id?: string;  // ID da função/cargo vinculado
  nome: string;
  email: string;
  senha?: string;      // Senha de acesso do profissional
  perfil: PerfilUsuario;
  created_at: string;
}

export interface Consultorio {
  id: string;
  unidade_id: string; // ID da unidade à qual pertence
  nome: string;
  setor: string;
  ativo: boolean;
  created_at: string;
}

export interface Setor {
  id: string;
  nome: string;
  created_at: string;
}

export interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  cns: string;
  telefone: string;
  data_nascimento: string;
  sexo: string;
  gestante: boolean;
  prioridade: TipoPrioridade;
  observacoes: string;
  created_at: string;
}

export interface FilaAtendimento {
  id: string;
  unidade_id: string; // ID da unidade da fila
  paciente_id: string;
  status: StatusFila;
  setor: string;
  consultorio?: string;
  hora_entrada: string;
  hora_chamada?: string;
  hora_inicio?: string;
  hora_finalizacao?: string;
  tipo_prioridade: TipoPrioridade;
  created_at: string;
  // Campos populados/relacionados para facilidade de uso:
  paciente?: Paciente;
}

// ----------------------------------------------------------------------------
// SEED INICIAL (DADOS PADRÃO DE EXEMPLO)
// ----------------------------------------------------------------------------

const UNIDADES_SEED: Unidade[] = [
  { id: 'unidade_1', nome: 'UBS Centro', endereco: 'Av. da Saúde, 100 - Centro', codigo_cnes: '1234567', created_at: new Date().toISOString() },
  { id: 'unidade_2', nome: 'UBS Vila Nova', endereco: 'Rua das Flores, 500 - Vila Nova', codigo_cnes: '7654321', created_at: new Date().toISOString() },
];

const FUNCOES_SEED: Funcao[] = [
  { id: 'funcao_1', nome: 'Médico (a)', created_at: new Date().toISOString() },
  { id: 'funcao_2', nome: 'Enfermeiro (a)', created_at: new Date().toISOString() },
  { id: 'funcao_3', nome: 'Dentista', created_at: new Date().toISOString() },
  { id: 'funcao_4', nome: 'Recepcionista', created_at: new Date().toISOString() },
];

const SETORES_SEED: Setor[] = [
  { id: 's1', nome: 'Médico Geral', created_at: new Date().toISOString() },
  { id: 's2', nome: 'Pediatria', created_at: new Date().toISOString() },
  { id: 's3', nome: 'Triagem', created_at: new Date().toISOString() },
  { id: 's4', nome: 'Vacinação', created_at: new Date().toISOString() },
];

const USUARIOS_SEED: Usuario[] = [
  { id: 'u0', nome: 'Super Usuário', email: 'g2autodev@gmail.com', senha: 'Jj@96314725', perfil: 'administrador', unidade_id: 'unidade_1', created_at: new Date().toISOString() },
];

const CONSULTORIOS_SEED: Consultorio[] = [
  { id: 'c1', nome: 'Consultório 01', setor: 'Médico Geral', ativo: true, unidade_id: 'unidade_1', created_at: new Date().toISOString() },
  { id: 'c2', nome: 'Consultório 02', setor: 'Médico Geral', ativo: true, unidade_id: 'unidade_1', created_at: new Date().toISOString() },
  { id: 'c3', nome: 'Consultório 03', setor: 'Pediatria', ativo: true, unidade_id: 'unidade_2', created_at: new Date().toISOString() },
  { id: 'c4', nome: 'Sala de Triagem', setor: 'Triagem', ativo: true, unidade_id: 'unidade_1', created_at: new Date().toISOString() },
  { id: 'c5', nome: 'Sala de Vacinação', setor: 'Vacinação', ativo: true, unidade_id: 'unidade_1', created_at: new Date().toISOString() },
];

const PACIENTES_SEED: Paciente[] = [];

const FILA_SEED: FilaAtendimento[] = [];

// ----------------------------------------------------------------------------
// CLIENTE DO BANCO MOCKADO
// ----------------------------------------------------------------------------

// Fallback BroadcastChannel para navegadores de Smart TVs antigas
// @ts-ignore
function SimpleBroadcastChannel(this: any, name: string) {
  this.name = name;
  this.listeners = [];
  var self = this;
  this.storageListener = function(e: StorageEvent) {
    if (e.key === "bc_" + self.name && e.newValue) {
      try {
        var data = JSON.parse(e.newValue);
        self.listeners.forEach(function(l: any) {
          try {
            l({ data: data, type: 'message' });
          } catch (err) {
            console.error('Erro ao chamar listener:', err);
          }
        });
      } catch (err) {
        // ignora erros de parse
      }
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', this.storageListener);
  }
}

// @ts-ignore
SimpleBroadcastChannel.prototype.postMessage = function(this: any, data: any) {
  if (typeof window !== 'undefined') {
    var key = "bc_" + this.name;
    localStorage.setItem(key, JSON.stringify(Object.assign({}, data, { _ts: Date.now() + Math.random() })));
    this.listeners.forEach(function(l: any) {
      try {
        l({ data: data, type: 'message' });
      } catch (err) {
        console.error('Erro ao chamar listener localmente:', err);
      }
    });
  }
};

// @ts-ignore
SimpleBroadcastChannel.prototype.addEventListener = function(this: any, type: string, listener: any) {
  if (type === 'message') {
    this.listeners.push(listener);
  }
};

// @ts-ignore
SimpleBroadcastChannel.prototype.removeEventListener = function(this: any, type: string, listener: any) {
  if (type === 'message') {
    this.listeners = this.listeners.filter(function(l: any) { return l !== listener; });
  }
};

// @ts-ignore
SimpleBroadcastChannel.prototype.close = function(this: any) {
  if (typeof window !== 'undefined') {
    window.removeEventListener('storage', this.storageListener);
  }
};

if (typeof window !== 'undefined' && !window.BroadcastChannel) {
  (window as any).BroadcastChannel = SimpleBroadcastChannel;
}

let globalChannel: BroadcastChannel | null = null;

const getChannel = () => {
  if (typeof window !== 'undefined') {
    if (!globalChannel) {
      try {
        globalChannel = new BroadcastChannel('ubs-realtime');
      } catch (e) {
        console.warn('Erro ao instanciar BroadcastChannel, usando fallback mock local:', e);
        globalChannel = {
          name: 'ubs-realtime',
          postMessage: function(data: any) {
            // Noop fallback
          },
          addEventListener: function(type: string, listener: any) {},
          removeEventListener: function(type: string, listener: any) {},
          close: function() {}
        } as any;
      }
    }
    return globalChannel;
  }
  return null;
};

export const initMockDatabase = () => {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem('ubs_unidades')) {
    localStorage.setItem('ubs_unidades', JSON.stringify(UNIDADES_SEED));
  }
  if (!localStorage.getItem('ubs_funcoes')) {
    localStorage.setItem('ubs_funcoes', JSON.stringify(FUNCOES_SEED));
  }
  if (!localStorage.getItem('ubs_usuarios')) {
    localStorage.setItem('ubs_usuarios', JSON.stringify(USUARIOS_SEED));
  } else {
    // Garantir que o super usuário sempre exista
    const currentUsers = JSON.parse(localStorage.getItem('ubs_usuarios') || '[]');
    const hasSuperUser = currentUsers.some((u: any) => u.email === 'g2autodev@gmail.com');
    if (!hasSuperUser && USUARIOS_SEED.length > 0) {
      currentUsers.unshift(USUARIOS_SEED[0]);
      localStorage.setItem('ubs_usuarios', JSON.stringify(currentUsers));
    }
  }
  if (!localStorage.getItem('ubs_consultorios')) {
    localStorage.setItem('ubs_consultorios', JSON.stringify(CONSULTORIOS_SEED));
  }
  if (!localStorage.getItem('ubs_pacientes')) {
    localStorage.setItem('ubs_pacientes', JSON.stringify(PACIENTES_SEED));
  }
  if (!localStorage.getItem('ubs_fila')) {
    localStorage.setItem('ubs_fila', JSON.stringify(FILA_SEED));
  }
  if (!localStorage.getItem('ubs_config_voz')) {
    localStorage.setItem('ubs_config_voz', JSON.stringify({ rate: 1.0, pitch: 1.0, volume: 1.0 }));
  }
  if (!localStorage.getItem('ubs_setores')) {
    localStorage.setItem('ubs_setores', JSON.stringify(SETORES_SEED));
  }
};

export const getLocalStorageData = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    initMockDatabase();
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error('Erro ao ler do storage local para chave ' + key + ':', e);
    return defaultValue;
  }
};

export const saveLocalStorageData = <T>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
  const channel = getChannel();
  if (channel) {
    channel.postMessage({ type: 'DB_UPDATE', table: key });
  }
};

export const supabaseMock = {
  // 1. UNIDADES
  unidades: {
    select: (): Unidade[] => getLocalStorageData<Unidade[]>('ubs_unidades', []),
    insert: (unidade: Omit<Unidade, 'id' | 'created_at'>): Unidade => {
      const list = getLocalStorageData<Unidade[]>('ubs_unidades', []);
      const newUnidade: Unidade = {
        ...unidade,
        id: 'un_' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
      };
      list.push(newUnidade);
      saveLocalStorageData('ubs_unidades', list);
      return newUnidade;
    },
    delete: (id: string) => {
      const list = getLocalStorageData<Unidade[]>('ubs_unidades', []);
      const updatedList = list.filter(u => u.id !== id);
      saveLocalStorageData('ubs_unidades', updatedList);
    },
    update: (id: string, updates: Partial<Unidade>): Unidade => {
      const list = getLocalStorageData<Unidade[]>('ubs_unidades', []);
      const updatedList = list.map(u => u.id === id ? { ...u, ...updates } : u);
      saveLocalStorageData('ubs_unidades', updatedList);
      return updatedList.find(u => u.id === id)!;
    }
  },

  // 2. FUNCOES
  funcoes: {
    select: (): Funcao[] => getLocalStorageData<Funcao[]>('ubs_funcoes', []),
    insert: (funcao: Omit<Funcao, 'id' | 'created_at'>): Funcao => {
      const list = getLocalStorageData<Funcao[]>('ubs_funcoes', []);
      const newFuncao: Funcao = {
        ...funcao,
        id: 'fn_' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
      };
      list.push(newFuncao);
      saveLocalStorageData('ubs_funcoes', list);
      return newFuncao;
    }
  },

  // SETORES
  setores: {
    select: (): Setor[] => getLocalStorageData<Setor[]>('ubs_setores', []),
    insert: (setor: Omit<Setor, 'id' | 'created_at'>): Setor => {
      const list = getLocalStorageData<Setor[]>('ubs_setores', []);
      const newSetor: Setor = {
        ...setor,
        id: 's_' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
      };
      list.push(newSetor);
      saveLocalStorageData('ubs_setores', list);
      return newSetor;
    },
    delete: (id: string) => {
      const list = getLocalStorageData<Setor[]>('ubs_setores', []);
      const updatedList = list.filter(s => s.id !== id);
      saveLocalStorageData('ubs_setores', updatedList);
    }
  },

  // 3. USUARIOS
  usuarios: {
    select: (): Usuario[] => getLocalStorageData<Usuario[]>('ubs_usuarios', []),
    insert: (user: Omit<Usuario, 'id' | 'created_at'>): Usuario => {
      const users = getLocalStorageData<Usuario[]>('ubs_usuarios', []);
      const newUser: Usuario = {
        ...user,
        id: 'u_' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
      };
      users.push(newUser);
      saveLocalStorageData('ubs_usuarios', users);
      return newUser;
    },
    update: (id: string, updates: Partial<Omit<Usuario, 'id' | 'created_at'>>): Usuario => {
      const users = getLocalStorageData<Usuario[]>('ubs_usuarios', []);
      const updatedUsers = users.map(u => u.id === id ? { ...u, ...updates } : u);
      saveLocalStorageData('ubs_usuarios', updatedUsers);
      return updatedUsers.find(u => u.id === id)!;
    },
    delete: (id: string): void => {
      const users = getLocalStorageData<Usuario[]>('ubs_usuarios', []);
      const updated = users.filter(u => u.id !== id);
      saveLocalStorageData('ubs_usuarios', updated);
    },
  },

  // 4. CONSULTORIOS
  consultorios: {
    select: (): Consultorio[] => getLocalStorageData<Consultorio[]>('ubs_consultorios', []),
    insert: (room: Omit<Consultorio, 'id' | 'created_at'>): Consultorio => {
      const rooms = getLocalStorageData<Consultorio[]>('ubs_consultorios', []);
      const newRoom: Consultorio = {
        ...room,
        id: 'c_' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
      };
      rooms.push(newRoom);
      saveLocalStorageData('ubs_consultorios', rooms);
      return newRoom;
    },
    update: (id: string, updates: Partial<Consultorio>): Consultorio => {
      const rooms = getLocalStorageData<Consultorio[]>('ubs_consultorios', []);
      const updatedRooms = rooms.map(r => r.id === id ? { ...r, ...updates } : r);
      saveLocalStorageData('ubs_consultorios', updatedRooms);
      return updatedRooms.find(r => r.id === id)!;
    },
    delete: (id: string): void => {
      const rooms = getLocalStorageData<Consultorio[]>('ubs_consultorios', []);
      const updatedRooms = rooms.filter(r => r.id !== id);
      saveLocalStorageData('ubs_consultorios', updatedRooms);
    },
  },

  // 5. PACIENTES
  pacientes: {
    select: (): Paciente[] => getLocalStorageData<Paciente[]>('ubs_pacientes', []),
    findByCpf: (cpf: string): Paciente | null => {
      const pacientes = getLocalStorageData<Paciente[]>('ubs_pacientes', []);
      return pacientes.find(p => p.cpf === cpf) || null;
    },
    insert: (paciente: Omit<Paciente, 'id' | 'created_at'>): Paciente => {
      const pacientes = getLocalStorageData<Paciente[]>('ubs_pacientes', []);
      const newPaciente: Paciente = {
        ...paciente,
        id: 'p_' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
      };
      pacientes.push(newPaciente);
      saveLocalStorageData('ubs_pacientes', pacientes);
      return newPaciente;
    },
  },

  // 6. FILA DE ATENDIMENTO
  fila: {
    select: (): FilaAtendimento[] => {
      const fila = getLocalStorageData<FilaAtendimento[]>('ubs_fila', []);
      const pacientes = getLocalStorageData<Paciente[]>('ubs_pacientes', []);
      return fila.map(f => ({
        ...f,
        paciente: pacientes.find(p => p.id === f.paciente_id),
      })).sort((a, b) => new Date(a.hora_entrada).getTime() - new Date(b.hora_entrada).getTime());
    },

    insert: (item: Omit<FilaAtendimento, 'id' | 'created_at' | 'hora_entrada' | 'status'>): FilaAtendimento => {
      const fila = getLocalStorageData<FilaAtendimento[]>('ubs_fila', []);
      const newItem: FilaAtendimento = {
        ...item,
        id: 'f_' + Math.random().toString(36).substr(2, 9),
        status: 'AGUARDANDO',
        hora_entrada: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      fila.push(newItem);
      saveLocalStorageData('ubs_fila', fila);

      const pacientes = getLocalStorageData<Paciente[]>('ubs_pacientes', []);
      newItem.paciente = pacientes.find(p => p.id === newItem.paciente_id);

      return newItem;
    },

    update: (id: string, updates: Partial<FilaAtendimento>): FilaAtendimento => {
      const fila = getLocalStorageData<FilaAtendimento[]>('ubs_fila', []);
      let updatedItem: FilaAtendimento | undefined;
      const updatedFila = fila.map(f => {
        if (f.id === id) {
          const item = { ...f, ...updates };
          if (updates.status === 'CHAMANDO') {
            item.hora_chamada = new Date().toISOString();
          } else if (updates.status === 'EM_ATENDIMENTO' && !f.hora_inicio) {
            item.hora_inicio = new Date().toISOString();
          } else if (updates.status === 'FINALIZADO' && !f.hora_finalizacao) {
            item.hora_finalizacao = new Date().toISOString();
          }
          updatedItem = item;
          return item;
        }
        return f;
      });
      saveLocalStorageData('ubs_fila', updatedFila);

      const pacientes = getLocalStorageData<Paciente[]>('ubs_pacientes', []);
      if (updatedItem) {
        (updatedItem as FilaAtendimento).paciente = pacientes.find(p => p.id === (updatedItem as FilaAtendimento).paciente_id);
      }

      const channel = getChannel();
      if (channel && updates.status) {
        const item = updatedFila.find(f => f.id === id)!;
        const pacientes = getLocalStorageData<Paciente[]>('ubs_pacientes', []);
        const paciente = pacientes.find(p => p.id === item.paciente_id);

        // Notificar painel TV de QUALQUER mudança de status da fila
        channel.postMessage({
          type: 'STATUS_CHANGE',
          filaId: item.id,
          status: item.status,
          pacienteNome: paciente ? paciente.nome : 'Paciente',
          consultorio: item.consultorio || '',
          unidade_id: item.unidade_id,
        });

        // Mensagem específica de áudio apenas para CHAMANDO
        if (updates.status === 'CHAMANDO') {
          channel.postMessage({
            type: 'AUDIO_CALL',
            pacienteNome: paciente ? paciente.nome : 'Paciente',
            consultorio: item.consultorio || 'Consultório',
            unidade_id: item.unidade_id,
          });
        }
      }

      return updatedFila.find(f => f.id === id)!;
    },

    getNextPatientToCall: (setor: string, unidadeId: string): FilaAtendimento | null => {
      const fila = getLocalStorageData<FilaAtendimento[]>('ubs_fila', []);
      const pacientes = getLocalStorageData<Paciente[]>('ubs_pacientes', []);

      const fullQueue = fila
        .filter(f => f.unidade_id === unidadeId && f.setor === setor)
        .map(f => ({
          ...f,
          paciente: pacientes.find(p => p.id === f.paciente_id),
        }));

      const sortedAguardando = sortFilaAguardando(fullQueue, setor);
      return sortedAguardando.length > 0 ? sortedAguardando[0] : null;
    }
  },

  // 7. CONFIGURAÇÕES DE VOZ
  configVoz: {
    get: () => getLocalStorageData('ubs_config_voz', { rate: 1.0, pitch: 1.0, volume: 1.0 }),
    save: (config: { rate: number; pitch: number; volume: number }) => {
      if (typeof window === 'undefined') return;
      localStorage.setItem('ubs_config_voz', JSON.stringify(config));
      const channel = getChannel();
      if (channel) {
        channel.postMessage({ type: 'CONFIG_UPDATE', config });
      }
    }
  },

  // 8. REALTIME CHANNEL SUBSCRIPTION SIMULATION
  subscribe: (callback: (payload: { type: string; table: string; [key: string]: any }) => void) => {
    const channel = getChannel();
    if (!channel) return () => {};

    const listener = (event: MessageEvent) => {
      callback(event.data);
    };

    channel.addEventListener('message', listener);
    return () => {
      channel.removeEventListener('message', listener);
    };
  }
};
