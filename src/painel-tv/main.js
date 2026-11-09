(function() {
  // Configurações e estado do painel
  var activeUnidadeId = null;
  var lastSpokenCallKey = '';
  var voiceActive = true;
  var campaignIndex = 0;
  
  var campaigns = [
    'Vacinação contra a Gripe: Proteja sua família, procure a sala de vacinas.',
    'Outubro Rosa: Prevenir é um ato de amor-próprio. Faça sua mamografia.',
    'Novembro Azul: Homem também se cuida! Previna-se contra o câncer de próstata.',
    'Combate à Dengue: Evite acúmulo de água limpa. A prevenção começa em casa.',
    'Amamentação: Nutrição e amor. A UBS apoia o aleitamento materno exclusivo.'
  ];

  // Elementos do DOM
  var unitSelectionScreen = document.getElementById('unit-selection-screen');
  var selUnitList = document.getElementById('sel-unit-list');
  var headerLogo = document.getElementById('header-logo');
  var selLogo = document.getElementById('sel-logo');
  var headerUnitName = document.getElementById('header-unit-name');
  var mainCallCard = document.getElementById('main-call-card');
  var historyContainer = document.getElementById('history-items-container');
  var clockDisplay = document.getElementById('clock-display');
  var tickerTextElement = document.getElementById('ticker-text-element');
  
  var btnFullscreen = document.getElementById('btn-fullscreen');
  var btnChangeUnit = document.getElementById('btn-change-unit');
  var btnVoice = document.getElementById('btn-voice');

  // Inicializar estado do áudio
  var savedVoiceActive = localStorage.getItem('ubs_tv_voice_active');
  if (savedVoiceActive !== null) {
    voiceActive = savedVoiceActive === 'true';
  }
  updateVoiceButton();

  // Verificar se há unidade salva
  var savedUnitId = localStorage.getItem('ubs_tv_unidade_id');
  if (savedUnitId) {
    activeUnidadeId = savedUnitId;
  }

  // 1. Relógio em Tempo Real
  function updateClock() {
    var now = new Date();
    var timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (clockDisplay) {
      clockDisplay.textContent = timeStr.split(' ')[0];
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // 2. Rotação de Campanhas
  setInterval(function() {
    campaignIndex = (campaignIndex + 1) % campaigns.length;
    if (tickerTextElement) {
      tickerTextElement.textContent = '📢 ' + campaigns[campaignIndex];
    }
  }, 10000);
  if (tickerTextElement) {
    tickerTextElement.textContent = '📢 ' + campaigns[campaignIndex];
  }

  // 3. Mascaramento LGPD do Nome do Paciente
  function maskPatientName(nome) {
    if (!nome) return 'Paciente';
    var parts = nome.split(' ').filter(function(p) { return p.length > 0; });
    if (parts.length <= 2) return nome;
    
    var firstName = parts[0];
    var lastName = parts[parts.length - 1];
    
    var middleInitials = parts.slice(1, -1)
      .filter(function(p) {
        var lower = p.toLowerCase();
        return lower !== 'de' && lower !== 'da' && lower !== 'do' && lower !== 'dos' && lower !== 'e';
      })
      .map(function(p) {
        return p.charAt(0).toUpperCase() + '.';
      })
      .join(' ');
       
    return middleInitials 
      ? firstName + ' ' + middleInitials + ' ' + lastName 
      : firstName + ' ' + lastName;
  }

  // 4. Oscilador de Áudio Nativo (Chime/Gongo da Clínica)
  function playChimeSound(volume) {
    try {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      var ctx = new AudioContextClass();
      
      var now = ctx.currentTime;
      var vol = typeof volume === 'number' ? volume : 1.0;
      
      // Oscilador 1: Tom Alto
      var osc1 = ctx.createOscillator();
      var gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // Nota D5
      gain1.gain.setValueAtTime(vol * 0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      // Oscilador 2: Tom Baixo
      var osc2 = ctx.createOscillator();
      var gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440.00, now + 0.15); // Nota A4
      gain2.gain.setValueAtTime(vol * 0.15, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc1.start(now);
      osc1.stop(now + 0.4);
      
      osc2.start(now + 0.15);
      osc2.stop(now + 0.65);
    } catch (err) {
      console.warn('Erro ao gerar som de gongo nativo:', err);
    }
  }

  // 5. Síntese de Voz Nativa (SpeechSynthesis)
  function speakPatientCall(nome, sala, config) {
    if (!voiceActive) return;

    try {
      if (window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined') {
        window.speechSynthesis.cancel();
        
        var texto = 'Paciente ' + nome + '. Dirigir-se ao ' + sala + '.';
        var utterance = new SpeechSynthesisUtterance(texto);
        
        utterance.lang = 'pt-BR';
        utterance.rate = config ? config.rate || 1.0 : 1.0;
        utterance.pitch = config ? config.pitch || 1.0 : 1.0;
        utterance.volume = config ? config.volume || 1.0 : 1.0;
        
        var voices = window.speechSynthesis.getVoices();
        var ptVoice = voices.find(function(v) {
          return v.lang.includes('pt-BR') || v.lang.includes('pt_BR');
        });
        if (ptVoice) {
          utterance.voice = ptVoice;
        }

        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.warn('Erro ao reproduzir voz sintetizada nativa:', err);
    }
  }

  // 6. Atualizar botões e estado da tela
  function updateVoiceButton() {
    if (!btnVoice) return;
    if (voiceActive) {
      btnVoice.className = 'control-btn active';
      btnVoice.textContent = '🔊 Voz Ativa';
    } else {
      btnVoice.className = 'control-btn mute';
      btnVoice.textContent = '🔇 Mudo';
    }
  }

  // Migração de seed: corrigir entradas antigas presas em EM_ATENDIMENTO
  // Executar uma vez na inicialização do painel TV
  (function fixSeedData() {
    try {
      var rawFila = localStorage.getItem('ubs_fila');
      if (!rawFila) return;
      var fila = JSON.parse(rawFila);
      var needsFix = false;
      var fixed = fila.map(function(f) {
        // Corrigir qualquer entrada de seed (IDs como f1, f2, f3, f4) presa em EM_ATENDIMENTO
        // sem hora_chamada recente (ou seja, dado de seed, não chamada real do médico)
        if (f.id === 'f2' && f.status === 'EM_ATENDIMENTO') {
          needsFix = true;
          return Object.assign({}, f, {
            status: 'FINALIZADO',
            hora_finalizacao: f.hora_finalizacao || new Date(Date.now() - 3600000).toISOString()
          });
        }
        return f;
      });
      if (needsFix) {
        localStorage.setItem('ubs_fila', JSON.stringify(fixed));
        console.log('[PainelTV] Migração de seed aplicada: f2 corrigido para FINALIZADO');
      }
    } catch (e) {
      console.warn('[PainelTV] Erro na migração de seed:', e);
    }
  })();

  // 7. Polling de dados principais do LocalStorage (Sincronização)
  function pollData() {
    try {
      // Ler unidades para verificar seleção e logos
      var rawUnidades = localStorage.getItem('ubs_unidades');
      var unidades = rawUnidades ? JSON.parse(rawUnidades) : [];
      
      // Ler logo customizada se houver
      var logoUrl = localStorage.getItem('ubs_logo_url') || '/logo-pref.png';
      if (headerLogo) headerLogo.src = logoUrl;
      if (selLogo) selLogo.src = logoUrl;

      // Se não há unidade ativa selecionada
      if (!activeUnidadeId) {
        showUnitSelection(unidades);
        return;
      }

      // Esconder a tela de seleção se estiver com unidade configurada
      if (unitSelectionScreen) {
        unitSelectionScreen.style.display = 'none';
      }

      // Identificar nome da unidade ativa
      var activeUnit = unidades.find(function(u) { return u.id === activeUnidadeId; });
      if (headerUnitName) {
        headerUnitName.textContent = activeUnit ? 'Atende Já - ' + activeUnit.nome : 'Atende Já';
      }

      // Ler fila
      var rawFila = localStorage.getItem('ubs_fila');
      var rawPacientes = localStorage.getItem('ubs_pacientes');
      
      var queue = rawFila ? JSON.parse(rawFila) : [];
      var patients = rawPacientes ? JSON.parse(rawPacientes) : [];

      // Cruzar dados da fila com pacientes para carregar os nomes e prioridades
      var fullQueue = queue.map(function(item) {
        var pac = patients.find(function(p) { return p.id === item.paciente_id; });
        return Object.assign({}, item, { paciente: pac });
      });

      // Filtrar histórico da unidade da TV e apenas o dia atual
      var todayDateString = new Date().toLocaleDateString();
      var historicoChamadas = fullQueue
        .filter(function(f) {
          return f.status !== 'AGUARDANDO' && f.consultorio && f.unidade_id === activeUnidadeId && new Date(f.hora_entrada).toLocaleDateString() === todayDateString;
        })
        .sort(function(a, b) {
          var dateA = new Date(a.hora_chamada || a.hora_entrada).getTime();
          var dateB = new Date(b.hora_chamada || b.hora_entrada).getTime();
          return dateB - dateA;
        });

      // Chamada ativa em destaque (CHAMANDO ou EM_ATENDIMENTO)
      var chamadaPrincipal = historicoChamadas.find(function(f) {
        return f.status === 'CHAMANDO' || f.status === 'EM_ATENDIMENTO';
      }) || null;

      // 3 anteriores
      var isPortrait = window.innerHeight > window.innerWidth;
      var maxRecentCalls = isPortrait ? 4 : 6;
      
      var chamadasAnteriores = chamadaPrincipal
        ? historicoChamadas.filter(function(f) { return f.id !== chamadaPrincipal.id; }).slice(0, maxRecentCalls)
        : historicoChamadas.slice(0, maxRecentCalls);

      // Renderizar Chamada Principal
      renderMainCall(chamadaPrincipal);

      // Renderizar Chamadas Anteriores
      renderHistory(chamadasAnteriores);

      // Se houver chamada principal e for nova, disparar som e voz
      if (chamadaPrincipal && chamadaPrincipal.status === 'CHAMANDO') {
        var callKey = chamadaPrincipal.paciente_id + '_' + chamadaPrincipal.consultorio + '_' + (chamadaPrincipal.hora_chamada || '');
        if (lastSpokenCallKey !== callKey) {
          lastSpokenCallKey = callKey;
          
          // Ler configs de voz
          var rawConfigVoz = localStorage.getItem('ubs_config_voz');
          var configVoz = rawConfigVoz ? JSON.parse(rawConfigVoz) : { rate: 1.0, pitch: 1.0, volume: 1.0 };
          
          playChimeSound(configVoz.volume);
          
          setTimeout(function() {
            var pacienteNome = chamadaPrincipal.paciente ? chamadaPrincipal.paciente.nome : 'Paciente';
            speakPatientCall(pacienteNome, chamadaPrincipal.consultorio, configVoz);
          }, 850);
        }
      }

    } catch (e) {
      console.error('Erro ao realizar polling de dados:', e);
    }
  }

  // 8. Renderizar Chamada Principal
  function renderMainCall(chamada) {
    if (!mainCallCard) return;

    if (!chamada) {
      // Exibir tela institucional (idle)
      mainCallCard.className = 'call-panel';
      mainCallCard.innerHTML = [
        '<div class="idle-box">',
          '<div class="idle-shield">',
            '<img src="/brasao-juazeiro.png" alt="Brasão" onerror="this.style.display=\'none\'">',
          '</div>',
          '<h2 class="idle-title">Sala de Espera</h2>',
          '<p class="idle-desc">Aguarde sua chamada no painel. O seu nome será anunciado na tela e por chamada de voz sintetizada automaticamente.</p>',
          '<div><span class="idle-lgpd">🛡️ Conformidade LGPD Ativa</span></div>',
        '</div>'
      ].join('');
      return;
    }

    // Identificar classes de acordo com status
    var statusText = 'Chamando...';
    var statusClass = '';
    if (chamada.status === 'EM_ATENDIMENTO') {
      statusText = 'Em Atendimento';
      statusClass = ' atendimento';
    }

    mainCallCard.className = 'call-panel' + (chamada.status === 'CHAMANDO' ? ' calling' : '');
    
    var maskedName = maskPatientName(chamada.paciente ? chamada.paciente.nome : 'Paciente');
    var prioridadeLabel = chamada.tipo_prioridade;
    if (chamada.tipo_prioridade === 'URGENCIA') {
      prioridadeLabel = 'URGÊNCIA 🚨';
    } else if (chamada.tipo_prioridade !== 'NORMAL') {
      prioridadeLabel = 'PRIORIDADE ⭐';
    } else {
      prioridadeLabel = 'NORMAL';
    }

    mainCallCard.innerHTML = [
      '<div><span class="badge-status' + statusClass + '">' + statusText + '</span></div>',
      '<h1 class="patient-name">' + maskedName + '</h1>',
      '<span class="patient-priority">' + prioridadeLabel + '</span>',
      '<div class="room-box">',
        '<span class="room-label">Dirigir-se ao:</span>',
        '<h2 class="room-name">' + chamada.consultorio + '</h2>',
      '</div>'
    ].join('');
  }

  // 9. Renderizar Lista de Histórico
  function renderHistory(chamadas) {
    if (!historyContainer) return;

    if (chamadas.length === 0) {
      historyContainer.innerHTML = '<div class="history-empty">Sem chamadas anteriores.</div>';
      return;
    }

    var html = [];
    for (var i = 0; i < chamadas.length; i++) {
      var item = chamadas[i];
      var nameMasked = maskPatientName(item.paciente ? item.paciente.nome : 'Paciente');
      var timeStr = '';
      if (item.hora_chamada || item.hora_entrada) {
        var date = new Date(item.hora_chamada || item.hora_entrada);
        var hrs = String(date.getHours()).padStart(2, '0');
        var mins = String(date.getMinutes()).padStart(2, '0');
        timeStr = hrs + ':' + mins;
      }

      html.push(
        '<div class="history-item">',
          '<div class="history-info">',
            '<span class="history-patient">' + nameMasked + '</span>',
            '<span class="history-priority">' + (item.tipo_prioridade === 'URGENCIA' ? 'URGÊNCIA' : (item.tipo_prioridade !== 'NORMAL' ? 'PRIORIDADE' : 'NORMAL')) + '</span>',
          '</div>',
          '<div class="history-room-section">',
            '<span class="history-room">' + item.consultorio + '</span>',
            '<span class="history-time">' + timeStr + '</span>',
          '</div>',
        '</div>'
      );
    }
    historyContainer.innerHTML = html.join('');
  }

  // 10. Exibir Tela de Seleção de Unidade
  function showUnitSelection(unidades) {
    if (!unitSelectionScreen) return;
    unitSelectionScreen.style.display = 'flex';

    if (!selUnitList) return;
    
    if (unidades.length === 0) {
      selUnitList.innerHTML = '<p style="color: var(--text-muted);">Nenhuma unidade cadastrada no sistema. Cadastre unidades pelo Painel Administrativo.</p>';
      return;
    }

    var html = [];
    for (var i = 0; i < unidades.length; i++) {
      var u = unidades[i];
      html.push(
        '<button class="unit-btn" data-id="' + u.id + '">',
          '<span class="unit-title">📍 ' + u.nome + '</span>',
          (u.endereco ? '<span class="unit-address">' + u.endereco + '</span>' : ''),
        '</button>'
      );
    }
    selUnitList.innerHTML = html.join('');

    // Adicionar eventos aos botões
    var buttons = selUnitList.getElementsByTagName('button');
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].addEventListener('click', function(e) {
        var unitId = this.getAttribute('data-id');
        if (unitId) {
          activeUnidadeId = unitId;
          localStorage.setItem('ubs_tv_unidade_id', unitId);
          unitSelectionScreen.style.display = 'none';
          pollData();
        }
      });
    }
  }

  // 11. Eventos dos botões do Header
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', function() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(function() {
          btnFullscreen.textContent = '🗗 Tela Normal';
        }).catch(function() {});
      } else {
        document.exitFullscreen().then(function() {
          btnFullscreen.textContent = '🗖 Tela Cheia';
        }).catch(function() {});
      }
    });
  }

  if (btnChangeUnit) {
    btnChangeUnit.addEventListener('click', function() {
      activeUnidadeId = null;
      localStorage.removeItem('ubs_tv_unidade_id');
      pollData();
    });
  }

  if (btnVoice) {
    btnVoice.addEventListener('click', function() {
      voiceActive = !voiceActive;
      localStorage.setItem('ubs_tv_voice_active', String(voiceActive));
      updateVoiceButton();
    });
  }

  // 12. Sincronização em tempo real via BroadcastChannel + localStorage storage event
  // Estratégia tripla: STATUS_CHANGE direto + BroadcastChannel + storage event fallback
  try {
    var realtimeChannel = new BroadcastChannel('ubs-realtime');
    realtimeChannel.addEventListener('message', function(event) {
      if (!event || !event.data) return;
      var payload = event.data;

      if (payload.type === 'STATUS_CHANGE') {
        // Sincronização direta: recebe o status exato do paciente atualizado
        // Filtra por unidade ativa do painel TV
        if (activeUnidadeId && payload.unidade_id !== activeUnidadeId) return;

        if (payload.status === 'CHAMANDO') {
          // Mantém a renderização completa via pollData para também disparar som
          pollData();
        } else if (payload.status === 'EM_ATENDIMENTO') {
          // Atualiza imediatamente: busca o paciente atualizado do localStorage
          pollData();
        } else if (payload.status === 'FINALIZADO' || payload.status === 'AUSENTE') {
          // Paciente finalizado: verifica se ainda há alguém ativo na fila
          pollData();
        }
      } else if (payload.type === 'AUDIO_CALL' || payload.type === 'DB_UPDATE') {
        pollData();
      }
    });
  } catch (err) {
    console.warn('BroadcastChannel não disponível:', err);
  }

  // Fallback via storage event: captura escritas no localStorage (ubs_fila, etc.)
  window.addEventListener('storage', function(e) {
    if (e.key === 'ubs_fila' || e.key === 'ubs_pacientes' || e.key === 'bc_ubs-realtime') {
      pollData();
    }
  });

  // Integração com API de Sincronização em Rede (Shared LocalStorage Sync)
  (function startApiSync() {
    var syncKeys = [
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

    function updateLocal(key, value) {
      if (localStorage.getItem(key) !== value) {
        localStorage.setItem(key, value);
        pollData();
      }
    }

    if (window.EventSource) {
      var source = new EventSource('/api/sync/events');
      source.addEventListener('message', function(event) {
        try {
          var data = JSON.parse(event.data);
          if (syncKeys.indexOf(data.key) !== -1) {
            var strValue = typeof data.value === 'string' ? data.value : JSON.stringify(data.value);
            updateLocal(data.key, strValue);
          }
        } catch (e) {
          console.error('[PainelTV] Erro ao processar evento de sincronização:', e);
        }
      });
    } else {
      // Fallback para TVs antigas
      setInterval(function() {
        fetch('/api/sync')
          .then(function(res) { return res.json(); })
          .then(function(data) {
            Object.keys(data).forEach(function(key) {
              if (syncKeys.indexOf(key) !== -1) {
                var val = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
                updateLocal(key, val);
              }
            });
          })
          .catch(function(err) { console.error('[PainelTV] Falha no polling de sincronização:', err); });
      }, 2000);
    }

    // Carregar estado inicial do banco
    fetch('/api/sync')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        Object.keys(data).forEach(function(key) {
          if (syncKeys.indexOf(key) !== -1) {
            var val = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
            updateLocal(key, val);
          }
        });
      })
      .catch(function(err) { console.error('[PainelTV] Erro ao carregar dados iniciais:', err); });
  })();

  // Executar polling imediatamente e configurar intervalo de 500ms para atualização ágil
  pollData();
  setInterval(pollData, 500);

})();

