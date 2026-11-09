'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQueue } from '@/context/QueueContext';

import { safeStorage } from '@/lib/safeStorage';
const localStorage = safeStorage;

export default function TvPage() {
  const { fila, currentCall, configVoz, campaigns, logoUrl, unidades } = useQueue();
  
  const [selectedUnidadeId, setSelectedUnidadeId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const unitParam = params.get('unidade') || params.get('unidade_id');
        if (unitParam) {
          localStorage.setItem('ubs_tv_unidade_id', unitParam);
          return unitParam;
        }
        const savedTvUnit = localStorage.getItem('ubs_tv_unidade_id');
        if (savedTvUnit) return savedTvUnit;
      } catch (e) {}
    }
    return null;
  });
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [voiceActive, setVoiceActive] = useState(true);
  const [campaignIndex, setCampaignIndex] = useState(0);

  // Estado de orientação do monitor
  const [isPortrait, setIsPortrait] = useState(false);

  // Armazenar ID da chamada para evitar chamadas duplicadas
  const lastSpokenCallRef = useRef<string>('');

  // Detecção de retrato/paisagem
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const winWidth = window.innerWidth || 1920;
      const winHeight = window.innerHeight || 1080;
      setIsPortrait(winHeight > winWidth);
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 2. Relógio em tempo real
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2.1 Capturar erros em tempo de execução para depuração na TV
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleError = (e: ErrorEvent) => {
      setRuntimeError('Erro de Execução: ' + e.message + ' em ' + e.filename + ':' + e.lineno);
    };
    const handleRejection = (e: PromiseRejectionEvent) => {
      setRuntimeError('Rejeição de Promise: ' + String(e.reason));
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // 3. Rotação de campanhas institucional
  useEffect(() => {
    const interval = setInterval(() => {
      setCampaignIndex((prev) => (prev + 1) % campaigns.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [campaigns.length]);

  // 4. Mascaramento LGPD do Nome do Paciente
  const maskPatientName = (nome?: string) => {
    if (!nome) return 'Paciente';
    const parts = nome.split(' ').filter(p => p.length > 0);
    if (parts.length <= 2) return nome;
    
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    
    const middleInitials = parts.slice(1, -1)
      .filter(p => {
        const lower = p.toLowerCase();
        return lower !== 'de' && lower !== 'da' && lower !== 'do' && lower !== 'dos' && lower !== 'e';
      })
      .map(p => `${p.charAt(0).toUpperCase()}.`)
      .join(' ');
       
    return middleInitials 
      ? `${firstName} ${middleInitials} ${lastName}` 
      : `${firstName} ${lastName}`;
  };

  // 5. Oscilador de Áudio Nativo (Chime/Gongo da Clínica)
  const playChimeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      
      // Oscilador 1: Tom Alto
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // Nota D5
      gain1.gain.setValueAtTime(configVoz.volume * 0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      // Oscilador 2: Tom Baixo
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440.00, now + 0.15); // Nota A4
      gain2.gain.setValueAtTime(configVoz.volume * 0.15, now + 0.15);
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
  };

  // 6. Síntese de Voz (Motor Nativo + Fallback Robusto em Nuvem para Smart TVs)
  const speakPatientCall = (nome: string, sala: string) => {
    if (!voiceActive) return;

    try {
      const texto = `Paciente ${nome}. Dirigir-se ao ${sala}.`;

      // 6.1. Motor de Nuvem Proxy (À prova de falhas para Smart TVs)
      const playCloudTTS = () => {
        try {
          console.log('[TTS] Iniciando motor de voz via Proxy Interno...');
          // Usa a nossa própria API para burlar bloqueios externos na TV
          const url = `/api/tts?text=${encodeURIComponent(texto)}`;
          const audio = new Audio(url);
          
          audio.volume = Number(configVoz?.volume) || 1.0;
          audio.play().catch(err => console.error('[TTS] Erro ao tocar áudio da API:', err));
        } catch (err) {
          console.error('[TTS] Erro no Proxy TTS:', err);
        }
      };

      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const playNative = () => {
          const utterance = new SpeechSynthesisUtterance(texto);
          utterance.lang = 'pt-BR';
          utterance.rate = Number(configVoz?.rate) || 1.0;
          utterance.pitch = Number(configVoz?.pitch) || 1.0;
          utterance.volume = Number(configVoz?.volume) || 1.0;
          
          const voices = window.speechSynthesis.getVoices();
          const ptVoice = voices.find(v => 
            v.lang.toLowerCase().includes('pt-br') || 
            v.lang.toLowerCase() === 'pt'
          );
          
          if (ptVoice) {
            utterance.voice = ptVoice;
            window.speechSynthesis.speak(utterance);
          } else {
            console.warn('[TTS] Nenhuma voz PT-BR nativa encontrada no dispositivo. Redirecionando para a Nuvem.');
            playCloudTTS();
          }
        };

        const voices = window.speechSynthesis.getVoices();
        
        if (voices.length === 0) {
          console.log('[TTS] Nenhuma voz detectada ainda. Aguardando...');
          let voiceFired = false;
          
          window.speechSynthesis.onvoiceschanged = () => {
            if (voiceFired) return;
            voiceFired = true;
            playNative();
          };
          
          // Se em 1.5s não carregar vozes (Típico de Smart TVs que não tem TTS), joga pra nuvem!
          setTimeout(() => {
            if (!voiceFired) {
              voiceFired = true;
              console.log('[TTS] Timeout aguardando vozes. Dispositivo não possui motor de TTS (Smart TV). Acionando Nuvem.');
              playCloudTTS();
            }
          }, 1500);
        } else {
          playNative();
        }
      } else {
        // Navegador completamente sem suporte à API de voz
        playCloudTTS();
      }
    } catch (err) {
      console.warn('Erro ao reproduzir voz:', err);
    }
  };

  // 7. Efeito para disparar alerta sonoro e voz da chamada
  useEffect(() => {
    if (!currentCall || !selectedUnidadeId) return;

    // IGNORAR CHAMADA SE FOR DE OUTRA UNIDADE!
    if (currentCall.unidade_id && currentCall.unidade_id !== selectedUnidadeId) return;

    const callKey = `${currentCall.pacienteNome}_${currentCall.consultorio}_${currentCall.timestamp}`;
    if (lastSpokenCallRef.current === callKey) return;
    lastSpokenCallRef.current = callKey;

    playChimeSound();

    const timer = setTimeout(() => {
      speakPatientCall(currentCall.pacienteNome, currentCall.consultorio);
    }, 850);

    return () => clearTimeout(timer);
  }, [currentCall, selectedUnidadeId]);

  // 8. Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  };

  // Carregar dados da unidade ativa da TV
  const activeTvUnit = unidades.find(u => u.id === selectedUnidadeId);

  // ----------------------------------------------------------------------------
  // TELA DE ERRO DE EXECUÇÃO (SE HOUVER CRASH NO CLIENT)
  // ----------------------------------------------------------------------------
  if (runtimeError) {
    return (
      <div 
        style={{
          padding: '24px',
          backgroundColor: '#450a0a',
          color: '#f87171',
          fontFamily: 'monospace',
          minHeight: '100vh',
          boxSizing: 'border-box'
        }}
      >
        <h1 style={{ margin: '0 0 12px 0', fontSize: '24px' }}>⚠️ Falha Crítica de Execução (Smart TV)</h1>
        <p style={{ margin: '0 0 24px 0', fontSize: '16px', lineHeight: '1.5', wordBreak: 'break-all' }}>{runtimeError}</p>
        <button 
          onClick={() => {
            try {
              localStorage.clear();
            } catch (e) {}
            window.location.reload();
          }}
          style={{
            padding: '12px 24px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          Limpar Cache e Recarregar
        </button>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // TELA DE SELEÇÃO DE UNIDADE (SE NENHUMA SELECIONADA AINDA)
  // ----------------------------------------------------------------------------
  if (!selectedUnidadeId) {
    const listUnidades = unidades && unidades.length > 0 ? unidades : [
      { id: 'unidade_1', nome: 'UBS Centro', endereco: 'Av. da Saúde, 100 - Centro', created_at: new Date().toISOString() },
      { id: 'unidade_2', nome: 'UBS Vila Nova', endereco: 'Rua das Flores, 500 - Vila Nova', created_at: new Date().toISOString() }
    ];

    return (
      <div 
        style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a', // Slate 900
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', zIndex: 10 }}>
          {/* Logo container */}
          <div 
            style={{
              height: '80px',
              width: '180px',
              margin: '0 auto 32px auto',
              backgroundColor: '#ffffff',
              padding: '8px',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          >
            <img src={logoUrl} alt="Logo" style={{ height: '100%', width: '100%', objectFit: 'contain' }} />
          </div>
          
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 12px 0', color: '#ffffff', letterSpacing: '-0.025em' }}>
              Painel da TV - Seleção de Unidade
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '15px', margin: '0', lineHeight: '1.6' }}>
              Selecione qual unidade deseja exibir neste monitor de sala de espera para carregar as chamadas dedicadas em tempo real.
            </p>
          </div>
          
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              paddingTop: '16px'
            }}
          >
            {listUnidades.map(u => (
              <button
                key={u.id}
                onClick={() => {
                  setSelectedUnidadeId(u.id);
                  localStorage.setItem('ubs_tv_unidade_id', u.id);
                }}
                style={{
                  width: '100%',
                  padding: '20px',
                  backgroundColor: '#1e293b', // Slate 800
                  border: '2px solid #334155', // Slate 700
                  borderRadius: '16px',
                  textAlign: 'left',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>📍 {u.nome}</span>
                </div>
                {u.endereco && (
                  <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'normal', lineHeight: '1.4' }}>
                    {u.endereco}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Filtrar histórico especificamente da unidade da TV
  const todayDateString = new Date().toLocaleDateString();

  const historicoChamadas = fila
    .filter(f => {
      if (f.status === 'AGUARDANDO' || !f.consultorio || f.unidade_id !== selectedUnidadeId) return false;
      const isToday = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString() === todayDateString : false;
      return isToday(f.hora_chamada) || isToday(f.hora_entrada) || f.status === 'CHAMANDO' || f.status === 'EM_ATENDIMENTO';
    })
    .sort((a, b) => new Date(b.hora_chamada || b.hora_entrada).getTime() - new Date(a.hora_chamada || a.hora_entrada).getTime());
  
  // Chamada ativa em destaque (CHAMANDO ou EM_ATENDIMENTO)
  const chamadaPrincipal = historicoChamadas.find(f => f.status === 'CHAMANDO' || f.status === 'EM_ATENDIMENTO') || null;
  const ultimaChamada = chamadaPrincipal;

  const maxRecentCalls = isPortrait ? 4 : 6;
  
  // As chamadas anteriores no histórico lateral não incluem a chamada ativa principal
  const chamadasAnteriores = chamadaPrincipal
    ? historicoChamadas.filter(f => f.id !== chamadaPrincipal.id).slice(0, maxRecentCalls)
    : historicoChamadas.slice(0, maxRecentCalls);

  const mainCallBg = '#09090b';
  const mainCallBorder = '2px solid #27272a';
  const cardBg = '#18181b';
  const cardBorder = '1px solid #27272a';
  const headerBg = '#18181b';
  const headerBorderBottom = '1px solid #27272a';
  
  return (
    <div 
      style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: '#000000',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <header 
        style={{
          height: '10vh',
          backgroundColor: headerBg,
          borderBottom: headerBorderBottom,
          padding: '0 3vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {logoUrl && (
            <div 
              style={{
                height: '5vh',
                width: '12vw',
                backgroundColor: '#ffffff',
                padding: '0.5vh',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box'
              }}
            >
              <img src={logoUrl} alt="Logo" style={{ height: '100%', width: '100%', objectFit: 'contain' }} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span 
              style={{
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '-0.025em',
                fontSize: isPortrait ? '2vw' : '2.8vh',
                color: '#ffffff'
              }}
            >
              {activeTvUnit ? `Atende Já - ${activeTvUnit.nome}` : 'Atende Já'}
            </span>
            <span 
              style={{
                fontWeight: 'bold',
                color: '#f59e0b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                lineHeight: '1',
                marginTop: '0.5vh',
                fontSize: isPortrait ? '1.3vw' : '1.6vh'
              }}
            >
              Painel de Chamadas - Modo TV
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5vw' }}>
          <button 
            onClick={toggleFullscreen}
            style={{
              padding: '1vh 1.5vw',
              backgroundColor: '#27272a',
              color: '#d4d4d8',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              fontSize: isPortrait ? '1.3vw' : '1.6vh'
            }}
          >
            {fullscreen ? '🗗 Tela Normal' : '🗖 Tela Cheia'}
          </button>
          
          <button 
            onClick={() => {
              setSelectedUnidadeId(null);
              localStorage.removeItem('ubs_tv_unidade_id');
            }}
            style={{
              padding: '1vh 1.5vw',
              backgroundColor: '#27272a',
              color: '#d4d4d8',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              fontSize: isPortrait ? '1.3vw' : '1.6vh'
            }}
          >
            Trocar Unidade
          </button>

          <button 
            onClick={() => speakPatientCall('Teste do Sistema', 'Consultório 1')}
            style={{
              padding: '1vh 1.5vw',
              backgroundColor: '#0284c7', // sky-600
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: isPortrait ? '1.3vw' : '1.6vh'
            }}
          >
            🎤 TESTAR VOZ
          </button>

          <button 
            onClick={() => setVoiceActive(!voiceActive)}
            style={{
              padding: '1vh 1.5vw',
              backgroundColor: voiceActive ? '#27272a' : '#450a0a',
              color: voiceActive ? '#4ade80' : '#f87171',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: isPortrait ? '1.3vw' : '1.6vh'
            }}
          >
            {voiceActive ? '🔊 Voz Ativa' : '🔇 Mudo'}
          </button>

          <div 
            style={{
              fontFamily: 'monospace',
              fontWeight: 'bold',
              color: '#d4d4d8',
              paddingLeft: '1.5vw',
              borderLeft: '1px solid #27272a',
              fontSize: isPortrait ? '2.5vw' : '3.2vh'
            }}
          >
            {currentTime.split(' ')[0] || '--:--:--'}
          </div>
        </div>
      </header>

      <div 
        style={{
          height: '84vh',
          display: 'flex',
          flexDirection: isPortrait ? 'column' : 'row',
          padding: '2vh',
          gap: '2vw',
          overflow: 'hidden',
          flexShrink: 0,
          boxSizing: 'border-box'
        }}
      >
        <div 
          style={{
            backgroundColor: mainCallBg,
            border: mainCallBorder,
            borderRadius: '2vh',
            padding: '4vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            overflow: 'hidden',
            height: isPortrait ? '48vh' : '100%',
            width: isPortrait ? '100%' : 'auto',
            flex: isPortrait ? 'none' : '1 1 0%',
            boxSizing: 'border-box'
          }}
        >
          {ultimaChamada ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2.5vh' }}>
              <div>
                <span 
                  style={{
                    display: 'inline-block',
                    padding: '0.5vh 2vw',
                    backgroundColor: '#f59e0b',
                    color: '#000000',
                    borderRadius: '9999px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: '2vh'
                  }}
                >
                  {ultimaChamada.status === 'CHAMANDO' ? '📢 CHAMANDO...' : 'ATENDIMENTO EM ANDAMENTO'}
                </span>
              </div>
              
              <h1 
                style={{
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-0.025em',
                  textTransform: 'uppercase',
                  wordBreak: 'break-word',
                  lineHeight: '1',
                  width: '100%',
                  margin: '0',
                  fontSize: isPortrait ? '8vw' : '9.5vh'
                }}
              >
                {maskPatientName(ultimaChamada.paciente?.nome)}
              </h1>
              
              <div 
                style={{
                  color: '#a1a1aa',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontSize: '2.5vh'
                }}
              >
                {ultimaChamada.tipo_prioridade} {ultimaChamada.tipo_prioridade !== 'NORMAL' ? '⭐' : ''}
              </div>

              <div 
                style={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  padding: '2vh 4vw',
                  borderRadius: '1.5vh',
                  display: 'inline-block',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <span 
                  style={{
                    color: '#f59e0b',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    display: 'block',
                    marginBottom: '0.5vh',
                    fontSize: '1.8vh'
                  }}
                >
                  Dirigir-se ao:
                </span>
                <h2 
                  style={{
                    fontWeight: 900,
                    color: '#4ade80',
                    textTransform: 'uppercase',
                    letterSpacing: '-0.025em',
                    margin: '0',
                    fontSize: isPortrait ? '6vw' : '7.2vh'
                  }}
                >
                  {ultimaChamada.consultorio}
                </h2>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2vh' }}>
              <h2 
                style={{
                  fontWeight: 'bold',
                  color: '#ffffff',
                  margin: '0',
                  fontSize: '3.5vh'
                }}
              >
                Sala de Espera - {activeTvUnit?.nome}
              </h2>
              <p 
                style={{
                  color: '#a1a1aa',
                  maxWidth: '400px',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  margin: '0 auto',
                  fontSize: '2.2vh',
                  lineHeight: '1.5'
                }}
              >
                Aguarde a chamada no painel. Seu nome aparecerá aqui e será anunciado por áudio.
              </p>
            </div>
          )}
        </div>

        <div 
          style={{
            backgroundColor: mainCallBg,
            border: '1px solid #27272a',
            borderRadius: '2vh',
            padding: '2.5vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            height: isPortrait ? '32vh' : '100%',
            width: isPortrait ? '100%' : '25vw',
            boxSizing: 'border-box'
          }}
        >
          <h3 
            style={{
              fontWeight: 900,
              color: '#a1a1aa',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              borderBottom: '1px solid #27272a',
              paddingBottom: '1vh',
              marginBottom: '1.5vh',
              flexShrink: 0,
              margin: '0 0 1.5vh 0',
              fontSize: '2.2vh'
            }}
          >
            Últimas Chamadas
          </h3>

          {chamadasAnteriores.length === 0 ? (
            <div 
              style={{
                textAlign: 'center',
                padding: '4vh 0',
                color: '#71717a',
                fontWeight: 'bold',
                flex: '1 1 0%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2vh'
              }}
            >
              Sem chamadas anteriores.
            </div>
          ) : (
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5vh',
                flex: '1 1 0%',
                overflowY: 'auto'
              }}
            >
              {chamadasAnteriores.map((item) => (
                <div 
                  key={item.id}
                  style={{
                    padding: '1.5vh',
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '1.5vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5vh', overflow: 'hidden' }}>
                    <span 
                      style={{
                        fontWeight: 'extrabold',
                        color: '#ffffff',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                        fontSize: '2.2vh',
                        maxWidth: isPortrait ? '50vw' : '12vw'
                      }}
                    >
                      {maskPatientName(item.paciente?.nome)}
                    </span>
                    <span 
                      style={{
                        fontWeight: 'bold',
                        color: '#71717a',
                        textTransform: 'uppercase',
                        display: 'block',
                        fontSize: '1.6vh'
                      }}
                    >{item.tipo_prioridade === "IDOSO" ? "PRIORIDADE" : item.tipo_prioridade}</span>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'end', flexShrink: 0 }}>
                    <span 
                      style={{
                        fontWeight: 900,
                        color: '#4ade80',
                        textTransform: 'uppercase',
                        display: 'block',
                        fontSize: '2.2vh'
                      }}
                    >
                      {item.consultorio}
                    </span>
                    <span 
                      style={{
                        color: '#71717a',
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                        display: 'block',
                        marginTop: '0.2vh',
                        fontSize: '1.6vh'
                      }}
                    >
                      {new Date(item.hora_chamada || item.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div 
            style={{
              borderTop: '1px solid #27272a',
              paddingTop: '1.5vh',
              marginTop: '1.5vh',
              textAlign: 'center',
              color: '#71717a',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              flexShrink: 0,
              fontSize: '1.6vh'
            }}
          >
            Agradecemos a colaboração.
          </div>
        </div>
      </div>

      {campaigns.length > 0 && (
        <div 
          style={{
            height: '6vh',
            backgroundColor: '#18181b',
            borderTop: '1px solid #27272a',
            padding: '0 2vw',
            display: 'flex',
            alignItems: 'center',
            gap: '1vw',
            flexShrink: 0,
            boxSizing: 'border-box'
          }}
        >
          <span 
            style={{
              fontWeight: 900,
              backgroundColor: '#f59e0b',
              color: '#000000',
              padding: '0.5vh 1vw',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              flexShrink: 0,
              fontSize: '1.6vh'
            }}
          >
            Informa
          </span>
          <div style={{ flex: '1 1 0%', overflow: 'hidden', height: '24px', position: 'relative' }}>
            <p 
              style={{
                fontWeight: 'semibold',
                color: '#e4e4e7',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                margin: '0',
                lineHeight: '24px',
                fontSize: '2vh'
              }}
            >
              📢 {campaigns[campaignIndex]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
