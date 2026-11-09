const fs = require('fs');

const files = [
  'src/app/consultorio/page.tsx', 
  'src/app/dashboard/page.tsx', 
  'src/app/fila/page.tsx', 
  'src/app/tv/page.tsx',
  'src/painel-tv/main.js'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let text = fs.readFileSync(f, 'utf8');
    
    // Replace in TSX
    text = text.replace(/>\s*\{item\.tipo_prioridade\}\s*<\/span>/g, '>{item.tipo_prioridade === "IDOSO" ? "PRIORIDADE" : item.tipo_prioridade}</span>');
    text = text.replace(/>\s*\{atendimentoAtivo\.tipo_prioridade\}\s*<\/span>/g, '>{atendimentoAtivo.tipo_prioridade === "IDOSO" ? "PRIORIDADE" : atendimentoAtivo.tipo_prioridade}</span>');
    
    // Replace in JS
    text = text.replace(/var prioridadeLabel = chamada\.tipo_prioridade;/g, 'var prioridadeLabel = chamada.tipo_prioridade === "IDOSO" ? "PRIORIDADE" : chamada.tipo_prioridade;');
    text = text.replace(/<span class="history-priority">\' \+ item\.tipo_prioridade \+ \'<\/span>/g, '<span class="history-priority">\' + (item.tipo_prioridade === "IDOSO" ? "PRIORIDADE" : item.tipo_prioridade) + \'</span>');
    
    fs.writeFileSync(f, text);
    console.log('Fixed', f);
  }
});
