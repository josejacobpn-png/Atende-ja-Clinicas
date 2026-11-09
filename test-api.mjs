const url = 'https://cvvaobfxpljoqaelxryd.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dmFvYmZ4cGxqb3FhZWx4cnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzMyNDIsImV4cCI6MjA5NTEwOTI0Mn0.LR9zM0fDu2ybGYfHtuPZHB9gda9wlfJOEHljygUwjZc';

async function test() {
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // 1. Get Units
  let res = await fetch(`${url}/unidades?select=*`, { headers });
  let unidades = await res.json();
  console.log('Unidades:', unidades);

  if (!unidades.length) {
    console.log('No units found, cannot test insert.');
    return;
  }
  const activeUnidade = unidades[0];

  // 2. Insert Paciente
  console.log('Inserting Paciente...');
  res = await fetch(`${url}/pacientes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      nome: 'Teste Autodev',
      cpf: '999.888.777-66',
      cns: '999999999999999',
      telefone: '(11) 90000-0000',
      data_nascimento: '1990-01-01',
      sexo: 'Feminino',
      gestante: false,
      prioridade: 'NORMAL',
      observacoes: 'Teste'
    })
  });
  let pacResult = await res.json();
  console.log('Paciente Result:', pacResult);

  let pacienteId = null;
  if (res.status >= 400 && pacResult.code === '23505') {
    console.log('Paciente already exists. Fetching...');
    let res2 = await fetch(`${url}/pacientes?cpf=eq.999.888.777-66&select=id`, { headers });
    let pacs = await res2.json();
    pacienteId = pacs[0].id;
  } else if (res.status < 400) {
    pacienteId = pacResult[0].id;
  } else {
    console.log('Failed to insert paciente.');
    return;
  }

  // 3. Insert Fila
  console.log('Inserting Fila com paciente:', pacienteId, 'unidade:', activeUnidade.id);
  res = await fetch(`${url}/fila_atendimento`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      unidade_id: activeUnidade.id,
      paciente_id: pacienteId,
      status: 'AGUARDANDO',
      setor: 'Médico Geral',
      tipo_prioridade: 'NORMAL'
    })
  });
  let filaResult = await res.json();
  console.log('Fila Result:', filaResult, 'Status:', res.status);
}

test().catch(console.error);
