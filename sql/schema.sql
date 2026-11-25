-- ============================================================================
-- SIGEC PMTO - Schema do Banco de Dados (Supabase / PostgreSQL)
-- Sistema de Gestão de Contratos e Vigências - Polícia Militar do Tocantins
-- ============================================================================

-- Tabela principal: contratos
CREATE TABLE IF NOT EXISTS contratos (
    id              TEXT PRIMARY KEY DEFAULT ('pmto-' || extract(epoch from now())::bigint || '-' || floor(random() * 1000)::int),
    fornecedor      TEXT NOT NULL,
    cnpj            TEXT,
    objeto          TEXT,
    processo        TEXT,
    contrato        TEXT,
    aditivo_atual   TEXT DEFAULT 'Contrato Inicial',
    qtd_aditivos    INTEGER DEFAULT 0,
    inicio_vigencia TEXT,
    fim_vigencia    TEXT,
    valor_mensal    TEXT DEFAULT '0,00',
    valor_total     TEXT DEFAULT '0,00',
    valor_inicial   TEXT DEFAULT '0,00',
    valor_aditivos  TEXT DEFAULT '0,00',
    limite_legal    TEXT DEFAULT '0.25',
    fiscal          TEXT,
    marco_reajuste  TEXT,
    prazo_preclusao TEXT,
    observacoes     TEXT,
    attachment_name TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para buscas e ordenações frequentes
CREATE INDEX IF NOT EXISTS idx_contratos_fornecedor ON contratos(fornecedor);
CREATE INDEX IF NOT EXISTS idx_contratos_contrato ON contratos(contrato);
CREATE INDEX IF NOT EXISTS idx_contratos_fim_vigencia ON contratos(fim_vigencia);

-- Habilita RLS (Row Level Security) - permite acesso público para leitura/escrita
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;

-- Política de acesso público (para uso sem autenticação)
CREATE POLICY "Acesso público total aos contratos" ON contratos
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_contratos_updated_at ON contratos;
CREATE TRIGGER update_contratos_updated_at
    BEFORE UPDATE ON contratos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

