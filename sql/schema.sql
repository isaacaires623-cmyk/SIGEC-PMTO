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

-- Dados de exemplo para primeira carga
INSERT INTO contratos (id, fornecedor, cnpj, objeto, processo, contrato, aditivo_atual, qtd_aditivos, inicio_vigencia, fim_vigencia, valor_mensal, valor_total, valor_inicial, valor_aditivos, limite_legal, fiscal, marco_reajuste, prazo_preclusao, observacoes) VALUES
('pmto-sample-01', 'TOCANTINS LOCADORA DE FROTAS E VEÍCULOS LTDA', '18.452.964/0001-32', 'Prestação de serviços contínuos de locação de 60 viaturas policiais caracterizadas e descaracterizadas, tipo SUV e pick-up 4x4, com manutenção preventiva e corretiva integral.', '2026.02847.00124/PMTO', '018/2025', '1º Termo Aditivo', 1, '02/01/2025', '18/12/2026', '145.000,00', '1.740.000,00', '1.740.000,00', '0,00', '0.25', 'Cap PM Marcos Vinícius Matos - Matr. 384.219-1', '15/12/2024', '09/12/2026', 'Minuta de prorrogação em análise na Assessoria Jurídica da PMTO.'),

('pmto-sample-02', 'CONFECÇÕES E FARDAMENTOS MILITARES DO BRASIL S/A', '04.128.552/0001-90', 'Aquisição de conjuntos de uniformes operacionais camuflados e fardamento de passeio para o efetivo da Polícia Militar do Estado do Tocantins.', '2025.01994.00892/PMTO', '034/2025', 'Contrato Inicial', 0, '10/04/2025', '15/01/2027', '0,00', '890.000,00', '890.000,00', '0,00', '0.25', 'Maj PM Roberto Carlos Dias - Matr. 210.455-8', '10/04/2025', '08/01/2027', 'Recebimento definitivo do 2º lote pendente de conferência da comissão técnica.'),

('pmto-sample-03', 'DEFESA TÁTICA & MANUTENÇÃO BÉLICA ESPECIALIZADA LTDA', '09.341.221/0001-44', 'Serviços de reforma, modernização, calibração e manutenção corretiva de equipamento e armamento policial institucional (pistolas, fuzis e espingardas).', '2025.04412.00031/PMTO', '007/2025', '2º Termo Aditivo', 2, '15/02/2025', '06/12/2026', '28.500,00', '450.000,00', '320.000,00', '130.000,00', '0.50', '1º Ten PM Alexandre Ribeiro - Matr. 402.115-3', '15/02/2025', '29/11/2026', 'Limite legal de 50% aplicável por se tratar de manutenção e reforma de equipamento bélico.'),

('pmto-sample-04', 'ENGECONS CONSTRUÇÕES E ENGENHARIA LTDA', '24.908.112/0001-77', 'Execução de obras de reforma geral, reforço estrutural e adequação predial do complexo do 1º Batalhão da PMTO em Palmas.', '2025.00841.00223/PMTO', '052/2025', '1º Termo Aditivo', 1, '01/06/2025', '23/05/2027', '0,00', '1.420.000,00', '1.200.000,00', '220.000,00', '0.50', 'Cap PM Engenheiro Danielle Souza - Matr. 501.992-0', '01/06/2025', '03/05/2027', 'Medição da 4ª etapa atestada. Saldo de aditivo confortável.'),

('pmto-sample-05', 'TELECOM TOCANTINS CONECTIVIDADE E FIBRA S/A', '03.882.109/0001-18', 'Prestação de serviços de comunicação multimídia, links dedicados de internet em fibra óptica e rede corporativa IP para 42 destacamentos da PMTO.', '2024.01189.00441/PMTO', '011/2024', '3º Termo Aditivo', 3, '10/11/2024', '16/11/2026', '42.000,00', '504.000,00', '504.000,00', '0,00', '0.25', 'Subten PM Gilberto Arruda - Matr. 189.702-4', '10/11/2024', '16/11/2026', 'URGENTE: Contrato com termo final expirado. Verificar se houve assinatura prévia do 4º TA.'),

('pmto-sample-06', 'PETRO DISTRIBUIDORA E DERIVADOS DO TOCANTINS LTDA', '01.774.320/0001-05', 'Fornecimento contínuo e abastecimento descentralizado de combustíveis (gasolina comum e óleo diesel S-10) por meio de cartão magnético inteligente.', '2025.03310.00078/PMTO', '025/2025', 'Contrato Inicial', 0, '18/03/2025', '06/02/2027', '210.000,00', '2.520.000,00', '2.520.000,00', '0,00', '0.25', '', '18/03/2025', '23/01/2027', 'Aguardando publicação em diário oficial da portaria de designação do novo fiscal.')
ON CONFLICT (id) DO NOTHING;
