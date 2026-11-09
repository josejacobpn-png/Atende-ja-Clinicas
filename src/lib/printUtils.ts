export function printTicket58mm(nome: string, isPrioridade: boolean, setor: string) {
  const prioridadeText = isPrioridade ? 'SIM' : 'NÃO';
  const dataHora = new Date().toLocaleString('pt-BR');

  // Verifica se é dispositivo móvel Android para usar impressão direta via RawBT
  const isAndroid = /android/i.test(navigator.userAgent || navigator.vendor || (window as any).opera);
  
  if (isAndroid) {
    // Monta o ticket em texto puro formatado para o RawBT e impressoras 58mm
    const ticketText = 
`        ATENDE JA        
--------------------------------
      SENHA DE ATENDIMENTO      

PACIENTE:
${nome.toUpperCase()}

PRIORIDADE:
${isPrioridade ? '*** SIM ***' : 'NAO'}

SETOR/DESTINO:
${setor.toUpperCase()}

Data/Hora: ${dataHora}
--------------------------------

.
`;

    // Utiliza Intent do Android para enviar os dados diretamente ao aplicativo RawBT (silenciosamente)
    const intentUrl = `intent:${encodeURIComponent(ticketText)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;S.browser_fallback_url=https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter;end;`;
    window.location.href = intentUrl;
    return;
  }

  // Fallback: Cria um iframe invisível para processar a impressão padrão no PC/iOS
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  // O tamanho 58mm equivale a aproximadamente 220px de largura imprimível
  const html = `
    <html>
      <head>
        <title>Imprimir Senha</title>
        <style>
          @page {
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 58mm; /* Tamanho exato da bobina térmica */
            margin: 0;
            padding: 5px;
            text-align: center;
            color: #000;
            background: #fff;
          }
          h1 {
            font-size: 18px;
            margin: 10px 0 5px 0;
            font-weight: bold;
          }
          h2 {
            font-size: 14px;
            margin: 5px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
          }
          .info {
            text-align: center;
            margin-top: 15px;
            font-size: 14px;
            font-weight: bold;
            padding: 0 10px;
          }
          .value {
            font-weight: normal;
            font-size: 16px;
            margin-bottom: 12px;
            display: block;
            word-wrap: break-word;
          }
          .highlight {
            font-size: 18px;
            font-weight: bold;
          }
          .footer {
            margin-top: 20px;
            font-size: 10px;
            border-top: 1px dashed #000;
            padding-top: 5px;
            margin-bottom: 30px; /* Margem no fim para cortar bobina corretamente */
          }
        </style>
      </head>
      <body>
        <h1>ATENDE JÁ</h1>
        <h2>Senha de Atendimento</h2>
        
        <div class="info">
          PACIENTE:<br/>
          <span class="value">${nome.toUpperCase()}</span>
          
          PRIORIDADE:<br/>
          <span class="value highlight">${prioridadeText}</span>
          
          SETOR/DESTINO:<br/>
          <span class="value">${setor.toUpperCase()}</span>
        </div>

        <div class="footer">
          Data/Hora: ${dataHora}
        </div>
      </body>
    </html>
  `;

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    
    // Pequeno atraso para o browser carregar o HTML antes de chamar o print
    setTimeout(() => {
      iframe.contentWindow?.print();
      
      // Remove o iframe da DOM após um tempo seguro (o diálogo bloqueia a execução em alguns browsers)
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 5000);
    }, 250);
  }
}
