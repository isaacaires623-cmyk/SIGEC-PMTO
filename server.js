// ============================================================================
// SIGEC PMTO - Servidor Web & API com Banco de Dados Gratuito
// Suporta: SQLite Local Integrado (Zero Config) + Supabase (PostgreSQL Nuvem Grátis)
// ============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir frontend estático
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------------------------------
// 1. BANCO DE DADOS LOCAL SQLITE NATIVO (Pronto para uso imediato sem custos)
// ----------------------------------------------------------------------------
const DB_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const DB_FILE = process.env.VERCEL ? path.join('/tmp', 'sigec_pmto.db') : path.join(DB_DIR, 'sigec_pmto.db');
const localDb = new DatabaseSync(DB_FILE);

// Criar tabela se não existir
localDb.exec(`
  CREATE TABLE IF NOT EXISTS contratos (
    id TEXT PRIMARY KEY,
    fornecedor TEXT NOT NULL,
    cnpj TEXT,
    objeto TEXT,
    processo TEXT,
    contrato TEXT,
    aditivoAtual TEXT DEFAULT 'Contrato Inicial',
    qtdAditivos INTEGER DEFAULT 0,
    inicioVigencia TEXT,
    fimVigencia TEXT,
    valorMensal TEXT DEFAULT '0,00',
    valorTotal TEXT DEFAULT '0,00',
    valorInicial TEXT DEFAULT '0,00',
    valorAditivos TEXT DEFAULT '0,00',
    limiteLegal TEXT DEFAULT '0.25',
    fiscal TEXT,
    marcoReajuste TEXT,
    prazoPreclusao TEXT,
    observacoes TEXT,
    attachmentName TEXT,
    attachmentData TEXT,
    createdAt TEXT,
    updatedAt TEXT
  );
`);

// Dados padrão de exemplo da PMTO
const SAMPLE_CONTRACTS = [
  {
    id: 'pmto-sample-01',
    fornecedor: 'TOCANTINS LOCADORA DE FROTAS E VEÍCULOS LTDA',
    cnpj: '18.452.964/0001-32',
    objeto: 'Prestação de serviços contínuos de locação de 60 viaturas policiais caracterizadas e descaracterizadas, tipo SUV e pick-up 4x4, com manutenção preventiva e corretiva integral.',
    processo: '2026.02847.00124/PMTO',
    contrato: '018/2025',
    aditivoAtual: '1º Termo Aditivo',
    qtdAditivos: 1,
    inicioVigencia: '02/01/2025',
    fimVigencia: '18/12/2026',
    valorMensal: '145.000,00',
    valorTotal: '1.740.000,00',
    valorInicial: '1.740.000,00',
    valorAditivos: '0,00',
    limiteLegal: '0.25',
    fiscal: 'Cap PM Marcos Vinícius Matos - Matr. 384.219-1',
    marcoReajuste: '15/12/2024',
    prazoPreclusao: '09/12/2026',
    observacoes: 'Minuta de prorrogação em análise na Assessoria Jurídica da PMTO.',
    attachmentName: 'Contrato_018_2025_Locacao_Viaturas.pdf',
    attachmentData: null
  },
  {
    id: 'pmto-sample-02',
    fornecedor: 'CONFECÇÕES E FARDAMENTOS MILITARES DO BRASIL S/A',
    cnpj: '04.128.552/0001-90',
    objeto: 'Aquisição de conjuntos de uniformes operacionais camuflados e fardamento de passeio para o efetivo da Polícia Militar do Estado do Tocantins.',
    processo: '2025.01994.00892/PMTO',
    contrato: '034/2025',
    aditivoAtual: 'Contrato Inicial',
    qtdAditivos: 0,
    inicioVigencia: '10/04/2025',
    fimVigencia: '15/01/2027',
    valorMensal: '0,00',
    valorTotal: '890.000,00',
    valorInicial: '890.000,00',
    valorAditivos: '0,00',
    limiteLegal: '0.25',
    fiscal: 'Maj PM Roberto Carlos Dias - Matr. 210.455-8',
    marcoReajuste: '10/04/2025',
    prazoPreclusao: '08/01/2027',
    observacoes: 'Recebimento definitivo do 2º lote pendente de conferência da comissão técnica.',
    attachmentName: 'CT_034_2025_Fardamento_PMTO.pdf',
    attachmentData: null
  },
  {
    id: 'pmto-sample-03',
    fornecedor: 'DEFESA TÁTICA & MANUTENÇÃO BÉLICA ESPECIALIZADA LTDA',
    cnpj: '09.341.221/0001-44',
    objeto: 'Serviços de reforma, modernização, calibração e manutenção corretiva de equipamento e armamento policial institucional (pistolas, fuzis e espingardas).',
    processo: '2025.04412.00031/PMTO',
    contrato: '007/2025',
    aditivoAtual: '2º Termo Aditivo',
    qtdAditivos: 2,
    inicioVigencia: '15/02/2025',
    fimVigencia: '06/12/2026',
    valorMensal: '28.500,00',
    valorTotal: '450.000,00',
    valorInicial: '320.000,00',
    valorAditivos: '130.000,00',
    limiteLegal: '0.50',
    fiscal: '1º Ten PM Alexandre Ribeiro - Matr. 402.115-3',
    marcoReajuste: '15/02/2025',
    prazoPreclusao: '29/11/2026',
    observacoes: 'Limite legal de 50% aplicável por se tratar de manutenção e reforma de equipamento bélico.',
    attachmentName: 'Contrato_007_2025_Manutencao_Belica.pdf',
    attachmentData: null
  },
  {
    id: 'pmto-sample-04',
    fornecedor: 'ENGECONS CONSTRUÇÕES E ENGENHARIA LTDA',
    cnpj: '24.908.112/0001-77',
    objeto: 'Execução de obras de reforma geral, reforço estrutural e adequação predial do complexo do 1º Batalhão da PMTO em Palmas.',
    processo: '2025.00841.00223/PMTO',
    contrato: '052/2025',
    aditivoAtual: '1º Termo Aditivo',
    qtdAditivos: 1,
    inicioVigencia: '01/06/2025',
    fimVigencia: '23/05/2027',
    valorMensal: '0,00',
    valorTotal: '1.420.000,00',
    valorInicial: '1.200.000,00',
    valorAditivos: '220.000,00',
    limiteLegal: '0.50',
    fiscal: 'Cap PM Engenheiro Danielle Souza - Matr. 501.992-0',
    marcoReajuste: '01/06/2025',
    prazoPreclusao: '03/05/2027',
    observacoes: 'Medição da 4ª etapa atestada. Saldo de aditivo confortável.',
    attachmentName: 'CT_052_Reforma_1BPM_Palmas.pdf',
    attachmentData: null
  },
  {
    id: 'pmto-sample-05',
    fornecedor: 'TELECOM TOCANTINS CONECTIVIDADE E FIBRA S/A',
    cnpj: '03.882.109/0001-18',
    objeto: 'Prestação de serviços de comunicação multimídia, links dedicados de internet em fibra óptica e rede corporativa IP para 42 destacamentos da PMTO.',
    processo: '2024.01189.00441/PMTO',
    contrato: '011/2024',
    aditivoAtual: '3º Termo Aditivo',
    qtdAditivos: 3,
    inicioVigencia: '10/11/2024',
    fimVigencia: '16/11/2026',
    valorMensal: '42.000,00',
    valorTotal: '504.000,00',
    valorInicial: '504.000,00',
    valorAditivos: '0,00',
    limiteLegal: '0.25',
    fiscal: 'Subten PM Gilberto Arruda - Matr. 189.702-4',
    marcoReajuste: '10/11/2024',
    prazoPreclusao: '16/11/2026',
    observacoes: 'URGENTE: Contrato com termo final expirado. Verificar se houve assinatura prévia do 4º TA.',
    attachmentName: 'CT_011_2024_Link_Internet.pdf',
    attachmentData: null
  },
  {
    id: 'pmto-sample-06',
    fornecedor: 'PETRO DISTRIBUIDORA E DERIVADOS DO TOCANTINS LTDA',
    cnpj: '01.774.320/0001-05',
    objeto: 'Fornecimento contínuo e abastecimento descentralizado de combustíveis (gasolina comum e óleo diesel S-10) por meio de cartão magnético inteligente.',
    processo: '2025.03310.00078/PMTO',
    contrato: '025/2025',
    aditivoAtual: 'Contrato Inicial',
    qtdAditivos: 0,
    inicioVigencia: '18/03/2025',
    fimVigencia: '06/02/2027',
    valorMensal: '210.000,00',
    valorTotal: '2.520.000,00',
    valorInicial: '2.520.000,00',
    valorAditivos: '0,00',
    limiteLegal: '0.25',
    fiscal: '',
    marcoReajuste: '18/03/2025',
    prazoPreclusao: '23/01/2027',
    observacoes: 'Aguardando publicação em diário oficial da portaria de designação do novo fiscal.',
    attachmentName: 'CT_025_Combustiveis_PMTO.pdf',
    attachmentData: null
  }
];

function seedLocalDbIfEmpty() {
  const countStmt = localDb.prepare('SELECT COUNT(*) AS total FROM contratos');
  const result = countStmt.get();
  if (result.total === 0) {
    const insertStmt = localDb.prepare(`
      INSERT INTO contratos (
        id, fornecedor, cnpj, objeto, processo, contrato, aditivoAtual, qtdAditivos,
        inicioVigencia, fimVigencia, valorMensal, valorTotal, valorInicial, valorAditivos,
        limiteLegal, fiscal, marcoReajuste, prazoPreclusao, observacoes, attachmentName,
        attachmentData, createdAt, updatedAt
      ) VALUES (
        @id, @fornecedor, @cnpj, @objeto, @processo, @contrato, @aditivoAtual, @qtdAditivos,
        @inicioVigencia, @fimVigencia, @valorMensal, @valorTotal, @valorInicial, @valorAditivos,
        @limiteLegal, @fiscal, @marcoReajuste, @prazoPreclusao, @observacoes, @attachmentName,
        @attachmentData, @createdAt, @updatedAt
      )
    `);

    const now = new Date().toISOString();
    for (const c of SAMPLE_CONTRACTS) {
      insertStmt.run({
        id: c.id,
        fornecedor: c.fornecedor,
        cnpj: c.cnpj || null,
        objeto: c.objeto || null,
        processo: c.processo || null,
        contrato: c.contrato || null,
        aditivoAtual: c.aditivoAtual || 'Contrato Inicial',
        qtdAditivos: c.qtdAditivos || 0,
        inicioVigencia: c.inicioVigencia || null,
        fimVigencia: c.fimVigencia || null,
        valorMensal: c.valorMensal || '0,00',
        valorTotal: c.valorTotal || '0,00',
        valorInicial: c.valorInicial || '0,00',
        valorAditivos: c.valorAditivos || '0,00',
        limiteLegal: c.limiteLegal || '0.25',
        fiscal: c.fiscal || null,
        marcoReajuste: c.marcoReajuste || null,
        prazoPreclusao: c.prazoPreclusao || null,
        observacoes: c.observacoes || null,
        attachmentName: c.attachmentName || null,
        attachmentData: c.attachmentData || null,
        createdAt: now,
        updatedAt: now
      });
    }
    console.log('[Banco SQLite] 6 contratos de exemplo da PMTO inseridos.');
  }
}
seedLocalDbIfEmpty();

// ----------------------------------------------------------------------------
// 2. CONEXÃO OPCIONAL COM SUPABASE (POSTGRESQL GRATUITO NA NUVEM)
// ----------------------------------------------------------------------------
let supabase = null;
let isSupabaseActive = false;

function sanitizeSupabaseUrl(url) {
  if (!url) return '';
  let clean = url.trim();
  clean = clean.replace(/\/rest\/v1\/?$/, '');
  clean = clean.replace(/\/+$/, '');
  return clean;
}

function initSupabase(rawUrl, key) {
  const url = sanitizeSupabaseUrl(rawUrl);
  if (url && key && url.includes('supabase.co') && !url.includes('SEU-PROJETO')) {
    try {
      supabase = createClient(url, key.trim());
      isSupabaseActive = true;
      console.log(`[Supabase] Conectado à nuvem: ${url}`);
      return true;
    } catch (err) {
      console.error('[Supabase] Erro ao inicializar:', err.message);
      supabase = null;
      isSupabaseActive = false;
      return false;
    }
  }
  supabase = null;
  isSupabaseActive = false;
  return false;
}

// Inicializa a partir das variáveis de ambiente
initSupabase(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ----------------------------------------------------------------------------
// 3. ROTAS DA API REST
// ----------------------------------------------------------------------------

// Status do Banco de Dados
app.get('/api/status', (req, res) => {
  try {
    const countRow = localDb.prepare('SELECT COUNT(*) AS total FROM contratos').get();
    res.json({
      status: 'online',
      provider: isSupabaseActive ? 'supabase' : 'sqlite',
      providerName: isSupabaseActive ? 'Supabase Cloud (PostgreSQL Grátis)' : 'SQLite Local (Embutido Grátis)',
      totalContratos: countRow.total,
      supabaseConfigured: isSupabaseActive,
      dbFile: DB_FILE
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Configurar / Conectar Supabase dinamicamente
app.post('/api/config-supabase', async (req, res) => {
  const { url, key } = req.body;
  if (!url || !key) {
    return res.status(400).json({ error: 'URL e Anon Key são obrigatórias.' });
  }

  const cleanUrl = sanitizeSupabaseUrl(url);
  const cleanKey = (key || '').trim();
  const ok = initSupabase(cleanUrl, cleanKey);
  if (!ok) {
    return res.status(400).json({ error: 'Credenciais do Supabase inválidas.' });
  }

  // Tenta testar a conexão com o Supabase
  try {
    const { data, error } = await supabase.from('contratos').select('id').limit(1);
    if (error) {
      // Se a tabela ainda não existir no Supabase, avisa o usuário para rodar o schema
      return res.json({
        success: true,
        warning: 'Conectado ao Supabase, mas a tabela "contratos" ainda não foi criada. Execute o arquivo sql/schema.sql no SQL Editor do Supabase!',
        provider: 'supabase'
      });
    }

    // Salvar no .env para persistir
    const envContent = `SUPABASE_URL=${cleanUrl}\nSUPABASE_ANON_KEY=${cleanKey}\nPORT=${PORT}\n`;
    fs.writeFileSync(path.join(__dirname, '.env'), envContent);

    res.json({
      success: true,
      message: 'Conexão com o Supabase estabelecida com sucesso!',
      provider: 'supabase'
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao testar Supabase: ' + err.message });
  }
});

// Listar todos os contratos
app.get('/api/contratos', async (req, res) => {
  try {
    // Se Supabase estiver ativo, tenta buscar dele
    if (isSupabaseActive && supabase) {
      try {
        const { data, error } = await supabase.from('contratos').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          // Normaliza formato
          const normalized = data.map(c => ({
            id: c.id,
            fornecedor: c.fornecedor,
            cnpj: c.cnpj,
            objeto: c.objeto,
            processo: c.processo,
            contrato: c.contrato,
            aditivoAtual: c.aditivo_atual || c.aditivoAtual,
            qtdAditivos: c.qtd_aditivos ?? c.qtdAditivos ?? 0,
            inicioVigencia: c.inicio_vigencia || c.inicioVigencia,
            fimVigencia: c.fim_vigencia || c.fimVigencia,
            valorMensal: c.valor_mensal || c.valorMensal || '0,00',
            valorTotal: c.valor_total || c.valorTotal || '0,00',
            valorInicial: c.valor_inicial || c.valorInicial || '0,00',
            valorAditivos: c.valor_aditivos || c.valorAditivos || '0,00',
            limiteLegal: c.limite_legal || c.limiteLegal || '0.25',
            fiscal: c.fiscal,
            marcoReajuste: c.marco_reajuste || c.marcoReajuste,
            prazoPreclusao: c.prazo_preclusao || c.prazoPreclusao,
            observacoes: c.observacoes,
            attachmentName: c.attachment_name || c.attachmentName,
            attachmentData: c.attachment_data || c.attachmentData
          }));
          return res.json(normalized);
        }
      } catch (sbErr) {
        console.warn('[Supabase Fallback] Falha na consulta, usando SQLite local:', sbErr.message);
      }
    }

    // SQLite Local
    const rows = localDb.prepare('SELECT * FROM contratos ORDER BY rowid DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar um contrato por ID
app.get('/api/contratos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (isSupabaseActive && supabase) {
      const { data, error } = await supabase.from('contratos').select('*').eq('id', id).single();
      if (!error && data) return res.json(data);
    }

    const row = localDb.prepare('SELECT * FROM contratos WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Contrato não encontrado' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar novo contrato
app.post('/api/contratos', async (req, res) => {
  try {
    const c = req.body;
    if (!c.fornecedor || !c.fimVigencia) {
      return res.status(400).json({ error: 'Fornecedor e Fim de Vigência são obrigatórios.' });
    }

    const id = c.id || ('pmto-' + Date.now());
    const now = new Date().toISOString();

    // Salvar no SQLite local
    const insertStmt = localDb.prepare(`
      INSERT INTO contratos (
        id, fornecedor, cnpj, objeto, processo, contrato, aditivoAtual, qtdAditivos,
        inicioVigencia, fimVigencia, valorMensal, valorTotal, valorInicial, valorAditivos,
        limiteLegal, fiscal, marcoReajuste, prazoPreclusao, observacoes, attachmentName,
        attachmentData, createdAt, updatedAt
      ) VALUES (
        @id, @fornecedor, @cnpj, @objeto, @processo, @contrato, @aditivoAtual, @qtdAditivos,
        @inicioVigencia, @fimVigencia, @valorMensal, @valorTotal, @valorInicial, @valorAditivos,
        @limiteLegal, @fiscal, @marcoReajuste, @prazoPreclusao, @observacoes, @attachmentName,
        @attachmentData, @createdAt, @updatedAt
      )
    `);

    const record = {
      id,
      fornecedor: c.fornecedor,
      cnpj: c.cnpj || null,
      objeto: c.objeto || null,
      processo: c.processo || null,
      contrato: c.contrato || null,
      aditivoAtual: c.aditivoAtual || 'Contrato Inicial',
      qtdAditivos: parseInt(c.qtdAditivos || '0', 10),
      inicioVigencia: c.inicioVigencia || null,
      fimVigencia: c.fimVigencia,
      valorMensal: c.valorMensal || '0,00',
      valorTotal: c.valorTotal || '0,00',
      valorInicial: c.valorInicial || '0,00',
      valorAditivos: c.valorAditivos || '0,00',
      limiteLegal: c.limiteLegal || '0.25',
      fiscal: c.fiscal || null,
      marcoReajuste: c.marcoReajuste || null,
      prazoPreclusao: c.prazoPreclusao || null,
      observacoes: c.observacoes || null,
      attachmentName: c.attachmentName || null,
      attachmentData: c.attachmentData || null,
      createdAt: now,
      updatedAt: now
    };

    insertStmt.run(record);

    // Se Supabase estiver ativo, salva lá também em sincronia
    if (isSupabaseActive && supabase) {
      try {
        await supabase.from('contratos').insert([{
          id: record.id,
          fornecedor: record.fornecedor,
          cnpj: record.cnpj,
          objeto: record.objeto,
          processo: record.processo,
          contrato: record.contrato,
          aditivo_atual: record.aditivoAtual,
          qtd_aditivos: record.qtdAditivos,
          inicio_vigencia: record.inicioVigencia,
          fim_vigencia: record.fimVigencia,
          valor_mensal: record.valorMensal,
          valor_total: record.valorTotal,
          valor_inicial: record.valorInicial,
          valor_aditivos: record.valorAditivos,
          limite_legal: record.limiteLegal,
          fiscal: record.fiscal,
          marco_reajuste: record.marcoReajuste,
          prazo_preclusao: record.prazoPreclusao,
          observacoes: record.observacoes,
          attachment_name: record.attachmentName
        }]);
      } catch (sbErr) {
        console.warn('[Supabase Sync Warn] Não foi possível replicar no Supabase:', sbErr.message);
      }
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar contrato existente
app.put('/api/contratos/:id', async (req, res) => {
  const { id } = req.params;
  const c = req.body;
  const now = new Date().toISOString();

  try {
    const updateStmt = localDb.prepare(`
      UPDATE contratos SET
        fornecedor = @fornecedor,
        cnpj = @cnpj,
        objeto = @objeto,
        processo = @processo,
        contrato = @contrato,
        aditivoAtual = @aditivoAtual,
        qtdAditivos = @qtdAditivos,
        inicioVigencia = @inicioVigencia,
        fimVigencia = @fimVigencia,
        valorMensal = @valorMensal,
        valorTotal = @valorTotal,
        valorInicial = @valorInicial,
        valorAditivos = @valorAditivos,
        limiteLegal = @limiteLegal,
        fiscal = @fiscal,
        marcoReajuste = @marcoReajuste,
        prazoPreclusao = @prazoPreclusao,
        observacoes = @observacoes,
        attachmentName = @attachmentName,
        attachmentData = COALESCE(@attachmentData, attachmentData),
        updatedAt = @updatedAt
      WHERE id = @id
    `);

    updateStmt.run({
      id,
      fornecedor: c.fornecedor,
      cnpj: c.cnpj || null,
      objeto: c.objeto || null,
      processo: c.processo || null,
      contrato: c.contrato || null,
      aditivoAtual: c.aditivoAtual || 'Contrato Inicial',
      qtdAditivos: parseInt(c.qtdAditivos || '0', 10),
      inicioVigencia: c.inicioVigencia || null,
      fimVigencia: c.fimVigencia,
      valorMensal: c.valorMensal || '0,00',
      valorTotal: c.valorTotal || '0,00',
      valorInicial: c.valorInicial || '0,00',
      valorAditivos: c.valorAditivos || '0,00',
      limiteLegal: c.limiteLegal || '0.25',
      fiscal: c.fiscal || null,
      marcoReajuste: c.marcoReajuste || null,
      prazoPreclusao: c.prazoPreclusao || null,
      observacoes: c.observacoes || null,
      attachmentName: c.attachmentName || null,
      attachmentData: c.attachmentData || null,
      updatedAt: now
    });

    if (isSupabaseActive && supabase) {
      try {
        await supabase.from('contratos').update({
          fornecedor: c.fornecedor,
          cnpj: c.cnpj,
          objeto: c.objeto,
          processo: c.processo,
          contrato: c.contrato,
          aditivo_atual: c.aditivoAtual,
          qtd_aditivos: parseInt(c.qtdAditivos || '0', 10),
          inicio_vigencia: c.inicioVigencia,
          fim_vigencia: c.fimVigencia,
          valor_mensal: c.valorMensal,
          valor_total: c.valorTotal,
          valor_inicial: c.valorInicial,
          valor_aditivos: c.valorAditivos,
          limite_legal: c.limiteLegal,
          fiscal: c.fiscal,
          marco_reajuste: c.marcoReajuste,
          prazo_preclusao: c.prazoPreclusao,
          observacoes: c.observacoes,
          attachment_name: c.attachmentName,
          updated_at: now
        }).eq('id', id);
      } catch (sbErr) {
        console.warn('[Supabase Sync Warn]:', sbErr.message);
      }
    }

    const updated = localDb.prepare('SELECT * FROM contratos WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excluir contrato
app.delete('/api/contratos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    localDb.prepare('DELETE FROM contratos WHERE id = ?').run(id);

    if (isSupabaseActive && supabase) {
      try {
        await supabase.from('contratos').delete().eq('id', id);
      } catch (sbErr) {
        console.warn('[Supabase Sync Warn]:', sbErr.message);
      }
    }

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restaurar dados padrão de exemplo
app.post('/api/reset-sample', (req, res) => {
  try {
    localDb.exec('DELETE FROM contratos');
    seedLocalDbIfEmpty();
    const rows = localDb.prepare('SELECT * FROM contratos ORDER BY rowid DESC').all();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Exportar para Vercel Serverless
module.exports = app;

// Iniciar servidor localmente
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`  SIGEC PMTO - Sistema de Gestão de Contratos e Vigências       `);
    console.log(`  Polícia Militar do Estado do Tocantins                        `);
    console.log(`================================================================`);
    console.log(`  ● Servidor rodando em: http://localhost:${PORT}`);
    console.log(`  ● Banco de dados ativo: ${isSupabaseActive ? 'Supabase Cloud' : 'SQLite Local Nativo (Gratuito)'}`);
    console.log(`  ● Arquivo SQLite local: ${DB_FILE}`);
    console.log(`================================================================`);
  });
}
