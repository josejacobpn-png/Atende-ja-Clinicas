import fs from 'fs';
import path from 'path';

import os from 'os';
const DB_FILE_PATH = path.resolve(os.tmpdir(), 'atendeja-database.json');

// Default Seed Data
const UNIDADES_SEED = [
  { id: 'unidade_1', nome: 'UBS Centro', endereco: 'Av. da Saúde, 100 - Centro', codigo_cnes: '1234567', created_at: new Date().toISOString() },
  { id: 'unidade_2', nome: 'UBS Vila Nova', endereco: 'Rua das Flores, 500 - Vila Nova', codigo_cnes: '7654321', created_at: new Date().toISOString() },
];

const FUNCOES_SEED = [
  { id: 'funcao_1', nome: 'Médico (a)', created_at: new Date().toISOString() },
  { id: 'funcao_2', nome: 'Enfermeiro (a)', created_at: new Date().toISOString() },
  { id: 'funcao_3', nome: 'Dentista', created_at: new Date().toISOString() },
  { id: 'funcao_4', nome: 'Recepcionista', created_at: new Date().toISOString() },
];

const SETORES_SEED = [
  { id: 's1', nome: 'Médico Geral', created_at: new Date().toISOString() },
  { id: 's2', nome: 'Pediatria', created_at: new Date().toISOString() },
  { id: 's3', nome: 'Triagem', created_at: new Date().toISOString() },
  { id: 's4', nome: 'Vacinação', created_at: new Date().toISOString() },
];

const USUARIOS_SEED = [
  { id: 'u0', nome: 'Super Usuário', email: 'g2autodev@gmail.com', senha: 'Jj@96314725', perfil: 'administrador', unidade_id: 'unidade_1', created_at: new Date().toISOString() },
  { id: 'u1', nome: 'Administrador Geral', email: 'admin@ubs.gov.br', senha: 'Jj@96314725', perfil: 'administrador', unidade_id: 'unidade_1', created_at: new Date().toISOString() },
  { id: 'u2', nome: 'Maria Clara (Recepção)', email: 'recepcao@ubs.gov.br', senha: 'Jj@96314725', perfil: 'recepcao', unidade_id: 'unidade_1', funcao_id: 'funcao_4', created_at: new Date().toISOString() },
  { id: 'u3', nome: 'Dr. Roberto Silva (Geral)', email: 'roberto@ubs.gov.br', senha: 'Jj@96314725', perfil: 'profissional_saude', unidade_id: 'unidade_1', funcao_id: 'funcao_1', created_at: new Date().toISOString() },
  { id: 'u4', nome: 'Dra. Ana Paula (Pediatra)', email: 'ana@ubs.gov.br', senha: 'Jj@96314725', perfil: 'profissional_saude', unidade_id: 'unidade_2', funcao_id: 'funcao_1', created_at: new Date().toISOString() },
];

const CONSULTORIOS_SEED = [
  { id: 'c1', nome: 'Consultório 01', setor: 'Médico Geral', ativo: true, unidade_id: 'unidade_1', created_at: new Date().toISOString() },
  { id: 'c2', nome: 'Consultório 02', setor: 'Médico Geral', ativo: true, unidade_id: 'unidade_1', created_at: new Date().toISOString() },
  { id: 'c3', nome: 'Consultório 03', setor: 'Pediatria', ativo: true, unidade_id: 'unidade_2', created_at: new Date().toISOString() },
  { id: 'c4', nome: 'Sala de Triagem', setor: 'Triagem', ativo: true, unidade_id: 'unidade_1', created_at: new Date().toISOString() },
  { id: 'c5', nome: 'Sala de Vacinação', setor: 'Vacinação', ativo: true, unidade_id: 'unidade_1', created_at: new Date().toISOString() },
];

const PACIENTES_SEED = [
  {
    id: 'p1',
    nome: 'Maria da Silva Araujo',
    cpf: '123.456.789-00',
    cns: '123456789012345',
    telefone: '(11) 98765-4321',
    data_nascimento: '1988-06-15',
    sexo: 'Feminino',
    gestante: true,
    prioridade: 'GESTANTE',
    observacoes: 'Gestação de 28 semanas. Consulta de pré-natal.',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'p2',
    nome: 'José dos Santos Souza',
    cpf: '234.567.890-11',
    cns: '234567890123456',
    telefone: '(11) 97654-3210',
    data_nascimento: '1952-11-20',
    sexo: 'Masculino',
    gestante: false,
    prioridade: 'IDOSO',
    observacoes: 'Acompanhamento de hipertensão.',
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
  {
    id: 'p3',
    nome: 'Lucas Oliveira Santos',
    cpf: '345.678.901-22',
    cns: '345678901234567',
    telefone: '(11) 96543-2109',
    data_nascimento: '1995-04-10',
    sexo: 'Masculino',
    gestante: false,
    prioridade: 'NORMAL',
    observacoes: 'Sintomas gripais.',
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'p4',
    nome: 'Juliana Ferreira Lima',
    cpf: '456.789.012-33',
    cns: '456789012345678',
    telefone: '(11) 95432-1098',
    data_nascimento: '1992-09-30',
    sexo: 'Feminino',
    gestante: false,
    prioridade: 'NORMAL',
    observacoes: 'Dor de cabeça constante.',
    created_at: new Date(Date.now() - 1800000).toISOString(),
  }
];

const FILA_SEED = [
  {
    id: 'f1',
    unidade_id: 'unidade_1',
    paciente_id: 'p1',
    status: 'FINALIZADO',
    setor: 'Médico Geral',
    consultorio: 'Consultório 01',
    hora_entrada: new Date(Date.now() - 3600000 * 2).toISOString(),
    hora_chamada: new Date(Date.now() - 3600000 * 1.8).toISOString(),
    hora_inicio: new Date(Date.now() - 3600000 * 1.75).toISOString(),
    hora_finalizacao: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    tipo_prioridade: 'GESTANTE',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'f2',
    unidade_id: 'unidade_1',
    paciente_id: 'p2',
    status: 'FINALIZADO',
    setor: 'Médico Geral',
    consultorio: 'Consultório 02',
    hora_entrada: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    hora_chamada: new Date(Date.now() - 3600000 * 1.2).toISOString(),
    hora_inicio: new Date(Date.now() - 3600000 * 1.15).toISOString(),
    hora_finalizacao: new Date(Date.now() - 3600000 * 1.0).toISOString(),
    tipo_prioridade: 'IDOSO',
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
  {
    id: 'f3',
    unidade_id: 'unidade_1',
    paciente_id: 'p3',
    status: 'AGUARDANDO',
    setor: 'Médico Geral',
    hora_entrada: new Date(Date.now() - 3600000 * 1).toISOString(),
    tipo_prioridade: 'NORMAL',
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'f4',
    unidade_id: 'unidade_1',
    paciente_id: 'p4',
    status: 'AGUARDANDO',
    setor: 'Médico Geral',
    hora_entrada: new Date(Date.now() - 1800000).toISOString(),
    tipo_prioridade: 'NORMAL',
    created_at: new Date(Date.now() - 1800000).toISOString(),
  }
];

const INITIAL_DB = {
  ubs_unidades: UNIDADES_SEED,
  ubs_funcoes: FUNCOES_SEED,
  ubs_setores: SETORES_SEED,
  ubs_usuarios: USUARIOS_SEED,
  ubs_consultorios: CONSULTORIOS_SEED,
  ubs_pacientes: PACIENTES_SEED,
  ubs_fila: FILA_SEED,
  ubs_config_voz: { rate: 1.0, pitch: 1.0, volume: 1.0 },
  ubs_logo_url: '/logo-pref.png'
};

export async function readServerDb(): Promise<Record<string, any>> {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      await writeAllServerDb(INITIAL_DB);
      return INITIAL_DB;
    }
    const data = await fs.promises.readFile(DB_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading server database file, returning default seed:', error);
    return INITIAL_DB;
  }
}

export async function writeServerDb(key: string, value: any): Promise<void> {
  try {
    const db = await readServerDb();
    // Parse value if it is received as a JSON string
    let parsedValue = value;
    if (typeof value === 'string') {
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        // Keep as string if it is not valid JSON
      }
    }
    db[key] = parsedValue;
    await writeAllServerDb(db);
  } catch (error) {
    console.error(`Error writing key ${key} to server database:`, error);
  }
}

async function writeAllServerDb(data: Record<string, any>): Promise<void> {
  try {
    await fs.promises.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing all data to server database:', error);
  }
}
