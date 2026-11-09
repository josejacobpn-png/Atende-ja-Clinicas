import type { FilaAtendimento } from './supabaseMock';

export const sortFilaAguardando = (filaList: FilaAtendimento[], setor: string): FilaAtendimento[] => {
  const setorNorm = (setor || '').trim().toLowerCase();

  // 1. Pacientes aguardando neste setor
  const aguardando = filaList.filter(f => f.status === 'AGUARDANDO' && (!setorNorm || (f.setor || '').trim().toLowerCase() === setorNorm));

  // Casos de emergência imediata (VERMELHO ou URGENCIA) têm prioridade absoluta de encaixe
  const urgencias = aguardando
    .filter(f => f.tipo_prioridade === 'VERMELHO' || f.tipo_prioridade === 'URGENCIA')
    .sort((a, b) => {
      const peso: Record<string, number> = { VERMELHO: 2, URGENCIA: 1 };
      const pesoA = peso[a.tipo_prioridade] ?? 0;
      const pesoB = peso[b.tipo_prioridade] ?? 0;
      if (pesoA !== pesoB) return pesoB - pesoA;
      return new Date(a.hora_entrada).getTime() - new Date(b.hora_entrada).getTime();
    });

  // Prioridades regulares (idoso, gestante, amarelo, verde prioridade, etc.)
  const prioridades = aguardando
    .filter(f => 
      f.tipo_prioridade !== 'NORMAL' && 
      f.tipo_prioridade !== 'AZUL' && 
      f.tipo_prioridade !== 'VERMELHO' && 
      f.tipo_prioridade !== 'URGENCIA'
    )
    .sort((a, b) => {
      const peso: Record<string, number> = { 
        AMARELO: 4, 
        VERDE_PRIORIDADE: 3, 
        GESTANTE: 2, 
        IDOSO: 1, 
        VERDE: 0.5 
      };
      const pesoA = peso[a.tipo_prioridade] ?? 0;
      const pesoB = peso[b.tipo_prioridade] ?? 0;
      if (pesoA !== pesoB) return pesoB - pesoA;
      return new Date(a.hora_entrada).getTime() - new Date(b.hora_entrada).getTime();
    });

  // 2. Histórico de chamadas recentes para verificar a regra de alternância 2:1
  // Para evitar que a "dívida" se acumule, só contamos os normais chamados
  // APÓS a chegada da prioridade mais antiga que está aguardando na fila.
  let oldestPriorityTime = Date.now();
  for (const p of prioridades) {
    const t = new Date(p.hora_entrada).getTime();
    if (t < oldestPriorityTime) oldestPriorityTime = t;
  }

  const historico = filaList
    .filter(f => f.status !== 'AGUARDANDO' && (!setorNorm || (f.setor || '').trim().toLowerCase() === setorNorm))
    .sort((a, b) => {
      const timeA = new Date(a.hora_chamada || a.hora_inicio || a.hora_finalizacao || a.created_at || a.hora_entrada).getTime();
      const timeB = new Date(b.hora_chamada || b.hora_inicio || b.hora_finalizacao || b.created_at || b.hora_entrada).getTime();
      return timeB - timeA;
    });

  let normaisSeguidos = 0;
  for (const h of historico) {
    if (h.tipo_prioridade === 'NORMAL' || h.tipo_prioridade === 'AZUL') {
      const callTime = new Date(h.hora_chamada || h.hora_inicio || h.hora_finalizacao || h.created_at || h.hora_entrada).getTime();
      if (prioridades.length > 0 && callTime <= oldestPriorityTime) {
        break; // Interrompe a contagem, pois esses normais foram chamados ANTES da prioridade chegar
      }
      normaisSeguidos++;
    } else {
      break;
    }
  }

  // Atendimentos normais
  const normais = aguardando
    .filter(f => f.tipo_prioridade === 'NORMAL' || f.tipo_prioridade === 'AZUL')
    .sort((a, b) => new Date(a.hora_entrada).getTime() - new Date(b.hora_entrada).getTime());

  // 3. Intercalação no padrão 2 Normais para 1 Prioridade
  const sorted: FilaAtendimento[] = [];
  let pIdx = 0;
  let nIdx = 0;
  let currentNormaisSeguidos = normaisSeguidos;

  while (pIdx < prioridades.length || nIdx < normais.length) {
    if (pIdx < prioridades.length && (currentNormaisSeguidos >= 2 || nIdx >= normais.length)) {
      sorted.push(prioridades[pIdx]);
      pIdx++;
      currentNormaisSeguidos = 0;
    } else if (nIdx < normais.length) {
      sorted.push(normais[nIdx]);
      nIdx++;
      currentNormaisSeguidos++;
    } else {
      sorted.push(prioridades[pIdx]);
      pIdx++;
      currentNormaisSeguidos = 0;
    }
  }

  return [...urgencias, ...sorted];
};

export const reorderFilaList = (filaList: FilaAtendimento[]): FilaAtendimento[] => {
  const setores = Array.from(new Set(filaList.map(f => f.setor)));
  const naoAguardando = filaList.filter(f => f.status !== 'AGUARDANDO');
  
  let todosAguardandoSorted: FilaAtendimento[] = [];
  
  // Reordena individualmente cada setor
  for (const setor of setores) {
    const aguardandoSorted = sortFilaAguardando(filaList, setor);
    todosAguardandoSorted = [...todosAguardandoSorted, ...aguardandoSorted];
  }
  
  return [...todosAguardandoSorted, ...naoAguardando];
};
