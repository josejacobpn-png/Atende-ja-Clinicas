// ============================================================================
// CONEXÃO OFICIAL COM O SUPABASE (BANCO DE DADOS REAL NO POSTGRESQL CLOUD)
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente oficial do Supabase (com fallback para permitir o build rodar mesmo sem as variáveis)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder',
  {
    global: {
      fetch: (url, options) => {
        return fetch(url, { ...options, cache: 'no-store' });
      }
    }
  }
);

/**
 * Flag global para decidir se usaremos o Supabase real ou o simulador local.
 * Se as variáveis de ambiente estiverem configuradas, o sistema pode usar o banco real.
 * Por padrão, se não configuradas, ele roda no modo de simulação (mock) com sincronização multi-abas instantânea!
 */
export const USE_REAL_SUPABASE = Boolean(supabaseUrl && supabaseAnonKey);

if (USE_REAL_SUPABASE) {
  console.log('🔌 [UBS System] Conectado ao banco de dados Supabase real.');
} else {
  console.log('💻 [UBS System] Executando em modo de Simulação Local (LocalStorage & BroadcastChannel Realtime).');
}
