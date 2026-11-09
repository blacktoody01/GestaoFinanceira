-- =============================================
-- SoluFinance - Banco de Dados Gestor_Financeira
-- =============================================

CREATE DATABASE "Gestor_Financeira";

\c "Gestor_Financeira"

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100),
  senha VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Contas Bancárias
CREATE TABLE IF NOT EXISTS contas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(30) NOT NULL DEFAULT 'checking',
  saldo_inicial DECIMAL(15,2) DEFAULT 0,
  usuario_id INTEGER REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'expense',
  cor VARCHAR(7) DEFAULT '#2a78d6',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Transações
CREATE TABLE IF NOT EXISTS transacoes (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  data DATE NOT NULL,
  descricao VARCHAR(255),
  categoria_id INTEGER REFERENCES categorias(id),
  conta_id INTEGER REFERENCES contas(id),
  status VARCHAR(20) DEFAULT 'paid',
  observacoes TEXT,
  usuario_id INTEGER REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir categorias padrão
INSERT INTO categorias (nome, tipo, cor) VALUES
  ('Alimentação', 'expense', '#eb6834'),
  ('Transporte', 'expense', '#2a78d6'),
  ('Moradia', 'expense', '#6250d6'),
  ('Saúde', 'expense', '#e34948'),
  ('Educação', 'expense', '#1baf7a'),
  ('Lazer', 'expense', '#e87ba4'),
  ('Vendas', 'income', '#008300'),
  ('Serviços', 'income', '#eda100'),
  ('Salário', 'income', '#1baf7a'),
  ('Outros', 'both', '#8a8884');

-- Inserir contas padrão
INSERT INTO contas (nome, tipo, saldo_inicial) VALUES
  ('Caixa', 'cash', 0),
  ('Banco', 'checking', 0);

-- Inserir usuário padrão (senha: 123456 com bcrypt)
-- IMPORTANTE: Execute este comando Node.js na VPS para gerar o hash correto:
-- node -e "require('bcryptjs').hash('123456',10).then(h=>console.log(h))"
-- e substitua o hash abaixo pelo resultado
INSERT INTO usuarios (nome, usuario, senha) VALUES
  ('Bruno', 'brunoteste', '$2a$10$rOzBBhV5xAVqFVbVyL8BZuKZ9N8XNqKzH1yv5yv5yv5yv5yv5yv5y');

-- Alternativa: após npm install, rode o script seed:
-- node -e "const b=require('bcryptjs');b.hash('123456',10).then(h=>{const{Pool}=require('pg');const p=new Pool();p.query('UPDATE usuarios SET senha=$1 WHERE usuario=$2',[h,'brunoteste']).then(()=>{console.log('Senha atualizada!');p.end()})})"
