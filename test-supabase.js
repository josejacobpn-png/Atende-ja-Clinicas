require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  console.log('Testing Unidades...');
  const { data: unidades, error: uErr } = await supabase.from('unidades').select('*');
  console.log('Unidades:', unidades?.length, uErr);

  const activeUnidade = unidades?.[0];
  if (!activeUnidade) {
    console.log('No unit found');
    return;
  }

  console.log('Testing Paciente insert...');
  const { data: pacData, error: pacErr } = await supabase.from('pacientes').insert({
    nome: 'Teste Automatizado',
    cpf: '123.456.789-00',
    cns: '000000123456789',
    telefone: '(11) 90000-0000',
    data_nascimento: '1990-01-01',
    sexo: 'Feminino',
    gestante: false,
    prioridade: 'NORMAL',
    observacoes: 'Teste'
  }).select().single();
  console.log('Paciente Insert:', pacData?.id, pacErr);

  if (pacErr && pacErr.code !== '23505') {
    return; // Stop if unexpected error
  }

  let pacienteId = pacData?.id;
  if (!pacienteId) {
    const { data: exist } = await supabase.from('pacientes').select('id').eq('cpf', '123.456.789-00').single();
    pacienteId = exist?.id;
  }

  console.log('Testing Fila insert...');
  const { data: filaData, error: filaErr } = await supabase.from('fila_atendimento').insert({
    unidade_id: activeUnidade.id,
    paciente_id: pacienteId,
    status: 'AGUARDANDO',
    setor: 'Triagem',
    tipo_prioridade: 'NORMAL'
  }).select().single();
  console.log('Fila Insert:', filaData?.id, filaErr);
}

test();
