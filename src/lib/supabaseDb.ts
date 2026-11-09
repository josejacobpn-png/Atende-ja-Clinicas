// ============================================================================
// IMPLEMENTAÇÃO REAL DO SUPABASE (POSTGRESQL CLOUD)
// Mesma interface do supabaseMock — troca transparente via db.ts
// ============================================================================

import { supabase } from './supabaseClient';
import { sortFilaAguardando } from './queueUtils';
import type {
  Unidade,
  Funcao,
  Setor,
  Usuario,
  Consultorio,
  Paciente,
  FilaAtendimento,
  TipoPrioridade,
} from './supabaseMock';

// Re-exporta os tipos para uso externo
export type { Unidade, Funcao, Setor, Usuario, Consultorio, Paciente, FilaAtendimento, TipoPrioridade };

// Helpers de log de erro
const logErr = (ctx: string, err: unknown) =>
  console.error(`[supabaseDb] ${ctx}:`, err);

export const supabaseDb = {
  // ─── 1. UNIDADES ────────────────────────────────────────────────────────────
  unidades: {
    select: async (): Promise<Unidade[]> => {
      const { data, error } = await supabase.from('unidades').select('*').order('nome');
      if (error) { logErr('unidades.select', error); return []; }
      return (data ?? []) as Unidade[];
    },
    insert: async (unidade: Omit<Unidade, 'id' | 'created_at'>): Promise<Unidade> => {
      const { data, error } = await supabase.from('unidades').insert(unidade).select().single();
      if (error) { logErr('unidades.insert', error); throw error; }
      return data as Unidade;
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from('unidades').delete().eq('id', id);
      if (error) logErr('unidades.delete', error);
    },
    update: async (id: string, updates: Partial<Unidade>): Promise<Unidade> => {
      const { data, error } = await supabase.from('unidades').update(updates).eq('id', id).select().single();
      if (error) { logErr('unidades.update', error); throw error; }
      return data as Unidade;
    },
  },

  // ─── 2. FUNÇÕES ─────────────────────────────────────────────────────────────
  funcoes: {
    select: async (): Promise<Funcao[]> => {
      const { data, error } = await supabase.from('funcoes').select('*').order('nome');
      if (error) { logErr('funcoes.select', error); return []; }
      return (data ?? []) as Funcao[];
    },
    insert: async (funcao: Omit<Funcao, 'id' | 'created_at'>): Promise<Funcao> => {
      const { data, error } = await supabase.from('funcoes').insert(funcao).select().single();
      if (error) { logErr('funcoes.insert', error); throw error; }
      return data as Funcao;
    },
  },

  // ─── 3. SETORES ─────────────────────────────────────────────────────────────
  setores: {
    select: async (): Promise<Setor[]> => {
      const { data, error } = await supabase.from('setores').select('*').order('nome');
      if (error) { logErr('setores.select', error); return []; }
      return (data ?? []) as Setor[];
    },
    insert: async (setor: Omit<Setor, 'id' | 'created_at'>): Promise<Setor> => {
      const { data, error } = await supabase.from('setores').insert(setor).select().single();
      if (error) { logErr('setores.insert', error); throw error; }
      return data as Setor;
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from('setores').delete().eq('id', id);
      if (error) logErr('setores.delete', error);
    },
  },

  // ─── 4. USUÁRIOS ────────────────────────────────────────────────────────────
  usuarios: {
    select: async (): Promise<Usuario[]> => {
      const { data, error } = await supabase.from('usuarios').select('*').order('nome');
      if (error) { logErr('usuarios.select', error); return []; }
      return (data ?? []) as Usuario[];
    },
    insert: async (user: Omit<Usuario, 'id' | 'created_at'>): Promise<Usuario> => {
      const { data, error } = await supabase.from('usuarios').insert(user).select().single();
      if (error) { logErr('usuarios.insert', error); throw error; }
      return data as Usuario;
    },
    update: async (id: string, updates: Partial<Omit<Usuario, 'id' | 'created_at'>>): Promise<Usuario> => {
      const { data, error } = await supabase.from('usuarios').update(updates).eq('id', id).select().single();
      if (error) { logErr('usuarios.update', error); throw error; }
      return data as Usuario;
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from('usuarios').delete().eq('id', id);
      if (error) logErr('usuarios.delete', error);
    },
  },

  // ─── 5. CONSULTÓRIOS ────────────────────────────────────────────────────────
  consultorios: {
    select: async (): Promise<Consultorio[]> => {
      const { data, error } = await supabase.from('consultorios').select('*').order('nome');
      if (error) { logErr('consultorios.select', error); return []; }
      return (data ?? []) as Consultorio[];
    },
    insert: async (room: Omit<Consultorio, 'id' | 'created_at'>): Promise<Consultorio> => {
      const { data, error } = await supabase.from('consultorios').insert(room).select().single();
      if (error) { logErr('consultorios.insert', error); throw error; }
      return data as Consultorio;
    },
    update: async (id: string, updates: Partial<Consultorio>): Promise<Consultorio> => {
      const { data, error } = await supabase.from('consultorios').update(updates).eq('id', id).select().single();
      if (error) { logErr('consultorios.update', error); throw error; }
      return data as Consultorio;
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from('consultorios').delete().eq('id', id);
      if (error) logErr('consultorios.delete', error);
    },
  },

  // ─── 6. PACIENTES ───────────────────────────────────────────────────────────
  pacientes: {
    select: async (): Promise<Paciente[]> => {
      const { data, error } = await supabase.from('pacientes').select('*').order('created_at');
      if (error) { logErr('pacientes.select', error); return []; }
      return (data ?? []) as Paciente[];
    },
    findByCpf: async (cpf: string): Promise<Paciente | null> => {
      const cleanVal = cpf.replace(/\D/g, '');
      if (cleanVal.length === 0) {
        const { data } = await supabase.from('pacientes').select('*').eq('cpf', cpf).maybeSingle();
        return data as Paciente | null;
      }
      
      const pattern = '%' + cleanVal.split('').join('%') + '%';
      const { data, error } = await supabase.from('pacientes').select('*').ilike('cpf', pattern);
      
      if (error) { logErr('pacientes.findByCpf', error); return null; }
      
      const exactMatch = (data ?? []).find(p => p.cpf && p.cpf.replace(/\D/g, '') === cleanVal);
      return exactMatch || null;
    },
    insert: async (paciente: Omit<Paciente, 'id' | 'created_at'>): Promise<Paciente> => {
      const payload = { ...paciente, created_at: new Date().toISOString() };
      const { data, error } = await supabase.from('pacientes').insert(payload).select().single();
      if (error) { logErr('pacientes.insert', error); throw error; }
      return data as Paciente;
    },
  },

  // ─── 7. FILA DE ATENDIMENTO ─────────────────────────────────────────────────
  fila: {
    select: async (): Promise<FilaAtendimento[]> => {
      const { data, error } = await supabase
        .from('fila_atendimento')
        .select('*, paciente:pacientes(*)')
        .order('hora_entrada', { ascending: false }) // MUST be false so newest patients aren't cut off by the 1000 row API limit
        .limit(1000); 
      if (error) { logErr('fila.select', error); return []; }
      return (data ?? []).map((row: any) => ({
        ...row,
        paciente: Array.isArray(row.paciente) ? row.paciente[0] : (row.paciente ?? undefined),
      })) as FilaAtendimento[];
    },

    insert: async (
      item: Omit<FilaAtendimento, 'id' | 'created_at' | 'hora_entrada' | 'status'>
    ): Promise<FilaAtendimento> => {
      const payload = { 
        ...item, 
        status: 'AGUARDANDO', 
        hora_entrada: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      const { data, error } = await supabase
        .from('fila_atendimento')
        .insert(payload)
        .select('*, paciente:pacientes(*)')
        .single();
      if (error) { logErr('fila.insert', error); throw error; }
      
      const parsedData = { ...data };
      if (parsedData && Array.isArray(parsedData.paciente)) {
        parsedData.paciente = parsedData.paciente[0];
      }
      return parsedData as FilaAtendimento;
    },

    update: async (id: string, updates: Partial<FilaAtendimento>): Promise<FilaAtendimento> => {
      // Registrar timestamps automáticos de acordo com o status
      const extra: Partial<FilaAtendimento> = {};
      if (updates.status === 'CHAMANDO') {
        extra.hora_chamada = new Date().toISOString();
      } else if (updates.status === 'EM_ATENDIMENTO') {
        extra.hora_inicio = new Date().toISOString();
      } else if (updates.status === 'FINALIZADO') {
        extra.hora_finalizacao = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('fila_atendimento')
        .update({ ...updates, ...extra })
        .eq('id', id)
        .select('*, paciente:pacientes(*)')
        .single();
      if (error) { logErr('fila.update', error); throw error; }
      return data as FilaAtendimento;
    },

    getNextPatientToCall: async (setor: string, unidadeId: string): Promise<FilaAtendimento | null> => {
      let query = supabase
        .from('fila_atendimento')
        .select('*, paciente:pacientes(*)');

      if (unidadeId) {
        query = query.eq('unidade_id', unidadeId);
      }

      const { data, error } = await query;
      if (error) { logErr('fila.getNextPatientToCall', error); return null; }
      
      const filaList = (data ?? []).map((row: any) => ({
        ...row,
        paciente: Array.isArray(row.paciente) ? row.paciente[0] : (row.paciente ?? undefined),
      })) as FilaAtendimento[];

      if (filaList.length === 0) return null;

      const sortedAguardando = sortFilaAguardando(filaList, setor);
      return sortedAguardando.length > 0 ? sortedAguardando[0] : null;
    },
  },

  // ─── 8. CONFIG DE VOZ (preferência local, não vai ao banco) ─────────────────
  configVoz: {
    get: () => {
      if (typeof window === 'undefined') return { rate: 1.0, pitch: 1.0, volume: 1.0 };
      try {
        const raw = window.localStorage.getItem('ubs_config_voz');
        return raw ? JSON.parse(raw) : { rate: 1.0, pitch: 1.0, volume: 1.0 };
      } catch {
        return { rate: 1.0, pitch: 1.0, volume: 1.0 };
      }
    },
    save: (config: { rate: number; pitch: number; volume: number }) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('ubs_config_voz', JSON.stringify(config));
      }
    },
  },

  // ─── 9. REALTIME (Supabase Channels) ────────────────────────────────────────
  subscribe: (callback: (payload: { type: string; [key: string]: any }) => void) => {
    const channel = supabase
      .channel('ubs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_atendimento' }, async (payload) => {
        // Obter o paciente se houver newRow
        const newRow = payload.new as any;
        if (newRow && newRow.paciente_id) {
          try {
            const { data } = await supabase
              .from('pacientes')
              .select('*')
              .eq('id', newRow.paciente_id)
              .single();
            if (data) {
              newRow.paciente = data;
              payload.new = newRow;
            }
          } catch (e) {}
        }

        // Notifica atualização geral
        callback({ type: 'DB_UPDATE', table: 'fila_atendimento', payload });

        // Dispara AUDIO_CALL quando status muda para CHAMANDO
        if (newRow?.status === 'CHAMANDO') {
          // Buscar nome do paciente diretamente para não depender do estado local
          let pacienteNome = 'Paciente';
          try {
            const { data } = await supabase
              .from('pacientes')
              .select('nome')
              .eq('id', newRow.paciente_id)
              .single();
            if (data?.nome) pacienteNome = data.nome;
          } catch {}

          callback({
            type: 'AUDIO_CALL',
            pacienteNome,
            paciente_id: newRow.paciente_id,
            consultorio: newRow.consultorio || '',
            unidade_id: newRow.unidade_id,
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, (payload) => {
        callback({ type: 'DB_UPDATE', table: 'pacientes', payload });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultorios' }, (payload) => {
        callback({ type: 'DB_UPDATE', table: 'consultorios', payload });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unidades' }, (payload) => {
        callback({ type: 'DB_UPDATE', table: 'unidades', payload });
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('🔌 [Supabase Realtime] Inscrito com sucesso no canal ubs-realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Supabase Realtime] Erro no canal:', err);
        } else if (status === 'TIMED_OUT') {
          console.warn('⏱ [Supabase Realtime] Timeout na inscrição do canal');
        }
      });

    // Retorna função de cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
