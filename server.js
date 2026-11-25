// ============================================================================
// SIGEC PMTO - Servidor Backend REST API
// Polícia Militar do Estado do Tocantins
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

// Criar tabela se não existir (SEM NENHUM DADO FICTÍCIO)
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
app.get('/api/status', async (req, res) => {
  try {
    let total = 0;
    if (isSupabaseActive && supabase) {
      try {
        const { count, error } = await supabase.from('contratos').select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          total = count;
        }
      } catch (e) {
        console.warn('Erro ao consultar contagem no Supabase:', e.message);
      }
    } else {
      const countRow = localDb.prepare('SELECT COUNT(*) AS total FROM contratos').get();
      total = countRow ? countRow.total : 0;
    }

    res.json({
      status: 'online',
      provider: isSupabaseActive ? 'supabase' : 'sqlite',
      providerName: isSupabaseActive ? 'Supabase Nuvem (PostgreSQL)' : 'SQLite Local (Embutido)',
      totalContratos: total,
      supabaseConfigured: isSupabaseActive,
      dbFile: isSupabaseActive ? 'Supabase Cloud PostgreSQL' : DB_FILE
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

  try {
    const { data, error } = await supabase.from('contratos').select('id').limit(1);
    if (error) {
      return res.json({
        success: true,
        warning: 'Conectado ao Supabase, mas a tabela "contratos" ainda não foi criada. Execute o arquivo sql/schema.sql no SQL Editor do Supabase!',
        provider: 'supabase'
      });
    }

    const envContent = `SUPABASE_URL=${cleanUrl}\nSUPABASE_ANON_KEY=${cleanKey}\nPORT=${PORT}\n`;
    try {
      fs.writeFileSync(path.join(__dirname, '.env'), envContent);
    } catch (e) {}

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
    if (isSupabaseActive && supabase) {
      const { data, error } = await supabase.from('contratos').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[Supabase Error]:', error.message);
        return res.status(500).json({ error: 'Erro ao consultar Supabase: ' + error.message });
      }
      const normalized = (data || []).map(c => ({
        id: c.id,
        fornecedor: c.fornecedor,
        cnpj: c.cnpj,
        objeto: c.objeto,
        processo: c.processo,
        contrato: c.contrato,
        aditivoAtual: c.aditivo_atual || c.aditivoAtual || 'Contrato Inicial',
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

    // Se Supabase não estiver configurado, usa SQLite Local (banco limpo)
    const rows = localDb.prepare('SELECT * FROM contratos ORDER BY rowid DESC').all();
    res.json(rows || []);
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
      if (!error && data) {
        return res.json({
          id: data.id,
          fornecedor: data.fornecedor,
          cnpj: data.cnpj,
          objeto: data.objeto,
          processo: data.processo,
          contrato: data.contrato,
          aditivoAtual: data.aditivo_atual || data.aditivoAtual,
          qtdAditivos: data.qtd_aditivos ?? data.qtdAditivos ?? 0,
          inicioVigencia: data.inicio_vigencia || data.inicioVigencia,
          fimVigencia: data.fim_vigencia || data.fimVigencia,
          valorMensal: data.valor_mensal || data.valorMensal || '0,00',
          valorTotal: data.valor_total || data.valorTotal || '0,00',
          valorInicial: data.valor_inicial || data.valorInicial || '0,00',
          valorAditivos: data.valor_aditivos || data.valorAditivos || '0,00',
          limiteLegal: data.limite_legal || data.limiteLegal || '0.25',
          fiscal: data.fiscal,
          marcoReajuste: data.marco_reajuste || data.marcoReajuste,
          prazoPreclusao: data.prazo_preclusao || data.prazoPreclusao,
          observacoes: data.observacoes,
          attachmentName: data.attachment_name || data.attachmentName,
          attachmentData: data.attachment_data || data.attachmentData
        });
      }
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

    const id = c.id || ('pmto-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
    const now = new Date().toISOString();

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
    insertStmt.run(record);

    // Se Supabase estiver ativo, salva também no PostgreSQL
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
        console.error('[Supabase Insert Warn]:', sbErr.message);
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
        console.error('[Supabase Update Warn]:', sbErr.message);
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
        console.error('[Supabase Delete Warn]:', sbErr.message);
      }
    }

    res.json({ success: true, id });
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
    console.log(`  ● Banco de dados ativo: ${isSupabaseActive ? 'Supabase Cloud' : 'SQLite Local (Livre de dados fictícios)'}`);
    console.log(`  ● Arquivo SQLite local: ${DB_FILE}`);
    console.log(`================================================================`);
  });
}
