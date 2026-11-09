-- ============================================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS - SAÚDE DIGITAL (POSTGRESQL / SUPABASE)
-- ============================================================================

-- Habilitar a extensão UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS E TIPOS CUSTOMIZADOS
-- Usamos blocos DO para evitar erro caso os tipos já existam (idempotente)
DO $$ BEGIN
  CREATE TYPE status_fila AS ENUM ('AGUARDANDO', 'CHAMANDO', 'EM_ATENDIMENTO', 'FINALIZADO', 'AUSENTE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE perfil_usuario AS ENUM ('administrador', 'recepcao', 'profissional_saude');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tipo_prioridade AS ENUM ('NORMAL', 'IDOSO', 'GESTANTE', 'URGENCIA', 'VERMELHO', 'AMARELO', 'VERDE_PRIORIDADE', 'VERDE', 'AZUL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Migração idempotente para adicionar novos valores ao ENUM caso ele já exista
DO $$ BEGIN ALTER TYPE tipo_prioridade ADD VALUE 'VERMELHO'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE tipo_prioridade ADD VALUE 'AMARELO'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE tipo_prioridade ADD VALUE 'VERDE_PRIORIDADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE tipo_prioridade ADD VALUE 'VERDE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE tipo_prioridade ADD VALUE 'AZUL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TABELA DE UNIDADES DE SAÚDE
CREATE TABLE IF NOT EXISTS unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    endereco VARCHAR(255),
    codigo_cnes VARCHAR(20), -- CNES do estabelecimento de saúde
    reduzir_campos_cadastro BOOLEAN NOT NULL DEFAULT FALSE,
    agrupar_fila_por_funcao BOOLEAN NOT NULL DEFAULT FALSE,
    imprimir_ticket BOOLEAN NOT NULL DEFAULT TRUE,
    usa_classificacao_risco BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migrações idempotentes para unidades
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS reduzir_campos_cadastro BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS agrupar_fila_por_funcao BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS imprimir_ticket BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS usa_classificacao_risco BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. TABELA DE FUNÇÕES / CARGOS CLINICOS
CREATE TABLE IF NOT EXISTS funcoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) UNIQUE NOT NULL, -- Ex: "Médico (a)", "Enfermeiro (a)", "Dentista"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.1 TABELA DE SETORES
CREATE TABLE IF NOT EXISTS setores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) UNIQUE NOT NULL, -- Ex: "Médico Geral", "Pediatria", "Triagem"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE USUÁRIOS / PROFISSIONAIS
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_id UUID REFERENCES unidades(id) ON DELETE SET NULL, -- Unidade em que o profissional atua
    funcao_id UUID REFERENCES funcoes(id) ON DELETE SET NULL,     -- Cargo / Função do profissional
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL, -- Em produção real, será gerenciada pelo Supabase Auth
    perfil perfil_usuario NOT NULL DEFAULT 'recepcao',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migrações idempotentes: adicionar colunas caso a tabela já existisse sem elas
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES unidades(id) ON DELETE SET NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS funcao_id UUID REFERENCES funcoes(id) ON DELETE SET NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha VARCHAR(255);

-- 5. TABELA DE CONSULTÓRIOS
CREATE TABLE IF NOT EXISTS consultorios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE, -- Unidade à qual pertence
    nome VARCHAR(100) NOT NULL, -- Ex: "Consultório 01", "Triagem", "Sala de Vacina"
    setor VARCHAR(100) NOT NULL, -- Ex: "Médico Geral", "Pediatria", "Ginecologia"
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migrações idempotentes para consultorios
ALTER TABLE consultorios ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES unidades(id) ON DELETE CASCADE;
ALTER TABLE consultorios ADD COLUMN IF NOT EXISTS setor VARCHAR(100);
ALTER TABLE consultorios ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

-- 6. TABELA DE PACIENTES
CREATE TABLE IF NOT EXISTS pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(255) NOT NULL,
    cns VARCHAR(15) UNIQUE NOT NULL,
    telefone VARCHAR(15),
    data_nascimento DATE NOT NULL,
    sexo VARCHAR(20) NOT NULL, -- Ex: "Masculino", "Feminino", "Outro"
    gestante BOOLEAN NOT NULL DEFAULT FALSE,
    prioridade tipo_prioridade NOT NULL DEFAULT 'NORMAL',
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migrações idempotentes para pacientes
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS gestante BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 7. TABELA DE FILA DE ATENDIMENTO
CREATE TABLE IF NOT EXISTS fila_atendimento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE, -- Unidade da fila
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    status status_fila NOT NULL DEFAULT 'AGUARDANDO',
    setor VARCHAR(100) NOT NULL, -- Setor do atendimento
    consultorio VARCHAR(100),    -- Nome/Número do consultório que realizou/realiza a chamada
    hora_entrada TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    hora_chamada TIMESTAMP WITH TIME ZONE,
    hora_inicio TIMESTAMP WITH TIME ZONE,
    hora_finalizacao TIMESTAMP WITH TIME ZONE,
    tipo_prioridade tipo_prioridade NOT NULL DEFAULT 'NORMAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migrações idempotentes para fila_atendimento
ALTER TABLE fila_atendimento ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES unidades(id) ON DELETE CASCADE;
ALTER TABLE fila_atendimento ADD COLUMN IF NOT EXISTS setor VARCHAR(100);
ALTER TABLE fila_atendimento ADD COLUMN IF NOT EXISTS consultorio VARCHAR(100);
ALTER TABLE fila_atendimento ADD COLUMN IF NOT EXISTS hora_chamada TIMESTAMP WITH TIME ZONE;
ALTER TABLE fila_atendimento ADD COLUMN IF NOT EXISTS hora_inicio TIMESTAMP WITH TIME ZONE;
ALTER TABLE fila_atendimento ADD COLUMN IF NOT EXISTS hora_finalizacao TIMESTAMP WITH TIME ZONE;
ALTER TABLE fila_atendimento ADD COLUMN IF NOT EXISTS tipo_prioridade tipo_prioridade NOT NULL DEFAULT 'NORMAL';

-- 8. DADOS INICIAIS (SEED) PARA UNIDADES, FUNÇÕES, USUÁRIOS E CONSULTÓRIOS

-- Inserir unidades
INSERT INTO unidades (id, nome, endereco, codigo_cnes) VALUES
('b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68c1', 'UBS Centro', 'Av. da Saúde, 100 - Centro', '1234567'),
('b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68c2', 'UBS Vila Nova', 'Rua das Flores, 500 - Vila Nova', '7654321')
ON CONFLICT (id) DO NOTHING;

-- Inserir funções / cargos
INSERT INTO funcoes (id, nome) VALUES
('b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68d1', 'Médico (a)'),
('b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68d2', 'Enfermeiro (a)'),
('b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68d3', 'Dentista'),
('b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68d4', 'Recepcionista')
ON CONFLICT (id) DO NOTHING;

-- Inserir usuários atrelados às unidades e funções
INSERT INTO usuarios (nome, email, senha, perfil, unidade_id, funcao_id) VALUES
('Super Usuário', 'g2autodev@gmail.com', 'Jj@96314725', 'administrador', 'b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68c1', NULL),
('Administrador Geral', 'admin@ubs.gov.br', 'admin123', 'administrador', 'b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68c1', NULL),
('Maria Clara (Recepção)', 'recepcao@ubs.gov.br', 'recepcao123', 'recepcao', 'b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68c1', 'b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68d4'),
('Dr. Roberto Silva (Geral)', 'roberto@ubs.gov.br', 'medico123', 'profissional_saude', 'b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68c1', 'b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68d1'),
('Dra. Ana Paula (Pediatra)', 'ana@ubs.gov.br', 'medico123', 'profissional_saude', 'b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68c2', 'b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68d1')
ON CONFLICT (email) DO NOTHING;

-- Inserir consultórios atrelados às unidades
INSERT INTO consultorios (nome, setor, ativo, unidade_id) VALUES
('Consultório 01', 'Médico Geral', TRUE, 'b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68c1'),
('Consultório 02', 'Médico Geral', TRUE, 'b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68c1'),
('Consultório 03 (Pediatria)', 'Pediatria', TRUE, 'b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68c2'),
('Sala de Triagem', 'Triagem', TRUE, 'b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68c1'),
('Sala de Vacinação', 'Vacinação', TRUE, 'b3c8f8b9-4f8e-4a6f-bd3d-cf81297e68c1')
ON CONFLICT DO NOTHING;

-- Inserir setores
INSERT INTO setores (nome) VALUES
('Médico Geral'),
('Pediatria'),
('Triagem'),
('Vacinação')
ON CONFLICT (nome) DO NOTHING;

-- 9. CONFIGURAÇÕES DE REGRAS DE SEGURANÇA (RLS) E PUBLICAÇÕES EM TEMPO REAL
-- Habilitar tempo real nas tabelas (idempotente via DO blocks)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE unidades;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE funcoes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE fila_atendimento;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pacientes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE consultorios;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE setores;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
