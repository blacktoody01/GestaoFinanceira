#!/bin/sh
set -e

echo "⏳ Aguardando PostgreSQL..."
until PGPASSWORD="$DB_PASS" pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" 2>/dev/null; do
  sleep 1
done

echo "✅ PostgreSQL disponível. Inicializando tabelas..."
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -f /app/database/init-tables.sql 2>/dev/null || true

# Criar usuário padrão se não existir
node -e "
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS
});
(async () => {
  const { rows } = await pool.query('SELECT 1 FROM usuarios LIMIT 1');
  if (rows.length === 0) {
    const hash = await bcrypt.hash('123456', 10);
    await pool.query('INSERT INTO usuarios (nome, usuario, senha) VALUES (\$1, \$2, \$3)', ['Bruno', 'brunoteste', hash]);
    console.log('👤 Usuário padrão criado: brunoteste / 123456');
  }
  await pool.end();
})().catch(e => { console.error(e); process.exit(0); });
"

echo "🚀 Iniciando SoluFinance..."
exec node server.js
