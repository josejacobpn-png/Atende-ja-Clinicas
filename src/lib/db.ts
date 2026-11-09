// ============================================================================
// PONTE DE DADOS: escolhe entre Supabase real e mock local
// automaticamente com base nas variáveis de ambiente configuradas.
// ============================================================================

import { USE_REAL_SUPABASE } from './supabaseClient';
import { supabaseMock } from './supabaseMock';
import { supabaseDb } from './supabaseDb';

/**
 * `db` é a interface unificada de acesso a dados.
 * - Se NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estiverem no .env
 *   → usa o Supabase real (PostgreSQL cloud)
 * - Caso contrário
 *   → usa o mock local (LocalStorage + BroadcastChannel)
 *
 * No modo real, todos os métodos são async (retornam Promise).
 * No modo mock, os métodos são sync mas o contexto sempre usa await,
 * então funciona nos dois casos.
 */
export const db = USE_REAL_SUPABASE ? supabaseDb : supabaseMock;

export { USE_REAL_SUPABASE };
