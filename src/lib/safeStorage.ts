// ============================================================================
// SAFE STORAGE WRAPPER (COM PERSISTÊNCIA E SINCRONIZAÇÃO EM REDE)
// ============================================================================

const memoryStorage: Record<string, string> = {};
let isLocalStorageWorking = false;

if (typeof window !== 'undefined') {
  try {
    if (window.localStorage) {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      if (window.localStorage.getItem(testKey) === testKey) {
        window.localStorage.removeItem(testKey);
        isLocalStorageWorking = true;
      }
    }
  } catch (e) {
    isLocalStorageWorking = false;
  }
}

const SYNC_KEYS = [
  'ubs_unidades',
  'ubs_funcoes',
  'ubs_usuarios',
  'ubs_consultorios',
  'ubs_pacientes',
  'ubs_fila',
  'ubs_config_voz',
  'ubs_setores',
  'ubs_logo_url'
];

let isSyncingFromServer = false;
let lastAudioCallKey = '';

// Configurar escuta em tempo real do backend para manter o localStorage sincronizado
if (typeof window !== 'undefined') {
  const startSync = () => {
    const updateLocal = (key: string, value: string) => {
      isSyncingFromServer = true;
      try {
        if (isLocalStorageWorking) {
          window.localStorage.setItem(key, value);
        } else {
          memoryStorage[key] = value;
        }
        // Disparar evento de storage localmente para forçar a re-renderização do React Context
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }));
        // Disparar evento customizado legível pelo QueueContext para re-render garantido
        window.dispatchEvent(new CustomEvent('safeStorageUpdate', { detail: { key, value } }));
      } catch (err) {
        console.error('Erro ao atualizar storage local:', err);
      } finally {
        isSyncingFromServer = false;
      }
    };

    // Disparar evento de AUDIO_CALL via CustomEvent quando um novo status CHAMANDO chegar
    const dispatchAudioCallFromFila = (filaStr: string) => {
      try {
        const fila: any[] = JSON.parse(filaStr);
        const chamando = fila.find((f: any) => f.status === 'CHAMANDO');
        if (chamando) {
          // Deduplicação: não re-disparar se for o mesmo paciente + horário de chamada
          const callKey = chamando.id + '_' + (chamando.hora_chamada || '');
          if (lastAudioCallKey === callKey) return;
          lastAudioCallKey = callKey;
          window.dispatchEvent(new CustomEvent('remoteAudioCall', {
            detail: {
              filaId: chamando.id,
              paciente_id: chamando.paciente_id,
              consultorio: chamando.consultorio || '',
              unidade_id: chamando.unidade_id,
              hora_chamada: chamando.hora_chamada,
            }
          }));
        }
      } catch (e) {
        // Ignorar erros de parse
      }
    };

    // Usar EventSource (SSE) para sincronização em tempo real (baixa latência)
    if (window.EventSource) {
      const source = new EventSource('/api/sync/events');
      source.onmessage = (event) => {
        try {
          const { key, value } = JSON.parse(event.data);
          if (SYNC_KEYS.includes(key)) {
            const strValue = typeof value === 'string' ? value : JSON.stringify(value);
            if (safeStorage.getItem(key) !== strValue) {
              updateLocal(key, strValue);
              // Se a fila mudou, verificar se há chamada ativa para disparar áudio remoto
              if (key === 'ubs_fila') {
                dispatchAudioCallFromFila(strValue);
              }
            }
          }
        } catch (e) {
          console.error('Erro ao decodificar evento de sincronização:', e);
        }
      };
      
      source.onerror = () => {
        // SSE falhou ou desconectou, o navegador tentará reconectar automaticamente
      };
    } else {
      // Fallback para Smart TVs ou navegadores antigos: polling de 2s
      setInterval(() => {
        fetch('/api/sync')
          .then(res => res.json())
          .then(data => {
            Object.entries(data).forEach(([key, value]) => {
              if (SYNC_KEYS.includes(key)) {
                const strValue = typeof value === 'string' ? value : JSON.stringify(value);
                if (safeStorage.getItem(key) !== strValue) {
                  updateLocal(key, strValue);
                  if (key === 'ubs_fila') {
                    dispatchAudioCallFromFila(strValue);
                  }
                }
              }
            });
          })
          .catch(err => console.error('Falha no polling de sincronização:', err));
      }, 2000);
    }

    // Carregar o estado inicial do banco de dados na inicialização
    fetch('/api/sync')
      .then(res => res.json())
      .then(data => {
        Object.entries(data).forEach(([key, value]) => {
          if (SYNC_KEYS.includes(key)) {
            const strValue = typeof value === 'string' ? value : JSON.stringify(value);
            if (safeStorage.getItem(key) !== strValue) {
              if (isLocalStorageWorking) {
                window.localStorage.setItem(key, strValue);
              } else {
                memoryStorage[key] = strValue;
              }
            }
          }
        });
        // Disparar atualização inicial na fila
        window.dispatchEvent(new StorageEvent('storage', { key: 'ubs_fila' }));
        window.dispatchEvent(new CustomEvent('safeStorageUpdate', { detail: { key: 'ubs_fila' } }));
      })
      .catch(err => console.error('Erro ao buscar estado inicial do banco:', err));
  };

  // Executar após o carregamento inicial da página (Apenas se NÃO estiver usando o Supabase real)
  const useRealSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!useRealSupabase) {
    setTimeout(startSync, 100);
  } else {
    console.log('[SafeStorage] Usando Supabase real, sincronização mock (polling) desativada para economizar recursos do Vercel.');
  }
}

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (isLocalStorageWorking) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('localStorage.getItem falhou, usando memória:', e);
      isLocalStorageWorking = false;
    }
    return memoryStorage[key] !== undefined ? memoryStorage[key] : null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (isLocalStorageWorking) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('localStorage.setItem falhou, usando memória:', e);
      isLocalStorageWorking = false;
    }
    memoryStorage[key] = value;

    // Enviar alteração de chave de banco de dados para o servidor (Apenas se NÃO estiver usando o Supabase real)
    const useRealSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    if (!useRealSupabase && !isSyncingFromServer && SYNC_KEYS.includes(key)) {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      }).catch(err => console.error('Erro ao enviar alteração para o servidor:', err));
    }
  },
  removeItem: (key: string): void => {
    try {
      if (isLocalStorageWorking) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('localStorage.removeItem falhou, usando memória:', e);
      isLocalStorageWorking = false;
    }
    delete memoryStorage[key];
  },
  clear: (): void => {
    try {
      if (isLocalStorageWorking) {
        window.localStorage.clear();
      }
    } catch (e) {
      console.warn('localStorage.clear falhou, limpando memória:', e);
      isLocalStorageWorking = false;
    }
    for (const key in memoryStorage) {
      if (Object.prototype.hasOwnProperty.call(memoryStorage, key)) {
        delete memoryStorage[key];
      }
    }
  }
};
