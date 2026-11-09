const url = 'https://cvvaobfxpljoqaelxryd.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dmFvYmZ4cGxqb3FhZWx4cnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzMyNDIsImV4cCI6MjA5NTEwOTI0Mn0.LR9zM0fDu2ybGYfHtuPZHB9gda9wlfJOEHljygUwjZc';

async function test() {
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Prefer': 'count=exact'
  };

  const res = await fetch(`${url}/fila_atendimento?select=id`, { method: 'HEAD', headers });
  console.log('Count:', res.headers.get('content-range'));
}

test().catch(console.error);
