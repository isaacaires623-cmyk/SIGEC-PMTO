# SIGEC PMTO - Sistema de Gestão de Contratos e Vigências
### Polícia Militar do Estado do Tocantins (PMTO)
*Em total conformidade com a Nova Lei de Licitações (Lei nº 14.133/2021) e Jurisprudência do TCU (Súmula 222)*

---

## 🚀 Como Iniciar o Sistema (Pronto para Uso)

### Opção 1: Execução com 1 Clique (Recomendado no Windows)
Dê um duplo clique no arquivo:
📁 `iniciar_sistema.bat`

Ele irá iniciar o servidor e abrir automaticamente o navegador no endereço:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### Opção 2: Pelo Terminal / Linha de Comando
Abra o prompt de comando (CMD ou PowerShell) nesta pasta e execute:
```bash
npm start
# ou
node server.js
```

---

## 🗄️ Como Funciona o Banco de Dados Gratuito

O sistema conta com **duas camadas gratuitas de banco de dados**:

### 1. SQLite Local Nativo (Já Ativo e Funcionando 100% Automático)
- **Custo:** R$ 0,00 (Totalmente Gratuito)
- **Configuração:** Zero configuração. Não precisa criar conta, não precisa de internet e não precisa instalar nenhum SGBD externo (como PostgreSQL ou MySQL).
- **Onde ficam os dados:** Em um arquivo seguro na pasta `data/sigec_pmto.db`.
- **Backup:** Basta copiar o arquivo `data/sigec_pmto.db` ou usar o botão **"Exportar Backup JSON"** no cabeçalho do sistema.

### 2. Supabase Cloud (Opcional - Para Compartilhar na Nuvem com a Equipe)
Se você desejar que vários computadores ou seções da PMTO acessem os mesmos dados simultaneamente pela internet de forma gratuita:
1. Crie uma conta gratuita em [https://supabase.com](https://supabase.com).
2. Crie um novo projeto (ex: `sigec-pmto`).
3. Vá no **SQL Editor** do Supabase e cole o conteúdo do arquivo `sql/schema.sql` deste projeto.
4. No SIGEC PMTO, clique no badge **"Banco: SQLite Local"** no topo da tela (ou abra o modal de Banco de Dados) e insira sua **URL** e **Chave Anon** do Supabase.
5. Pronto! O sistema migra e sincroniza automaticamente com o PostgreSQL na nuvem do Supabase.

---

## 📋 Funcionalidades Principais

- **Painel Gerencial (Dashboard):**
  - Total de contratos ativos e valor global em carteira.
  - Indicadores visuais de vigência (< 30d crítico, 31-60d alerta, 61-90d atenção, > 90d regular).
  - Controle rigoroso de limite legal de aditivos (25% compras/serviços e 50% reformas de edifícios).
  - Alerta de preclusão lógica de reajuste de preços (**Súmula 222 do TCU**).
- **Gráficos Interativos SVG:**
  - Distribuição de alertas por faixa de criticidade (Donut interativo).
  - Impacto financeiro por faixa de vencimento.
  - Termômetro de consumo de aditivos contratuais.
  - Top 5 maiores contratos da corporação.
- **Gestão Contratual (CRUD Completo):**
  - Cadastro, edição, visualização e exclusão com persistência instantânea no banco.
  - Leitor Inteligente (OCR/Parsing) de PDFs, DOCXs e imagens de termos contratuais por arrastar e soltar.
  - Upload e download de termos aditivos e documentos contratuais anexos.
- **Relatórios e Auditoria:**
  - Emissão de Relatório Oficial de Conformidade da PMTO formatado para impressão / PDF institucional.
  - Exportação de dados para planilha Excel (.CSV) e Backup JSON integral.

---

## 📂 Estrutura de Arquivos

```
sigec-pmto-db/
├── data/
│   └── sigec_pmto.db          # Arquivo do banco de dados SQLite local
├── public/
│   └── index.html             # Interface institucional completa da PMTO
├── sql/
│   └── schema.sql             # Script SQL para o Supabase (PostgreSQL)
├── .env.example               # Exemplo de configuração de variáveis de ambiente
├── iniciar_sistema.bat        # Inicializador automático para Windows
├── package.json               # Dependências do projeto Node.js
├── README.md                  # Este documento
└── server.js                  # Servidor backend REST API com SQLite e Supabase
```

---
*Polícia Militar do Estado do Tocantins - Diretoria de Apoio Logístico / Seção de Contratos*
