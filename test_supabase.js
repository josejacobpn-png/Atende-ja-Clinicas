const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wlogthilobgttufyjdkj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsb2d0aGlsb2JndHR1ZnlqZGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjExMzIsImV4cCI6MjEwMDA5NzEzMn0.10UQAnZbCpjuOes1jO-fZfzvemZ4uNhxoaZ6eqYD9t8'
);

async function run() {
  const { data, error } = await supabase
    .from('fila_atendimento')
    .select('*, paciente:pacientes(*)')
    .order('hora_entrada', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Latest 3 queue items:');
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
