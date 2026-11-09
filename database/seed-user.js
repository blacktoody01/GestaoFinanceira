// Execute após npm install para garantir que a senha do usuário padrão está correta
// Uso: node database/seed-user.js

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'Gestor_Financeira',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
});

async function seed() {
  try {
    const hash = await bcrypt.hash('123456', 10);

    // Verifica se o usuário já existe
    const check = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', ['brunoteste']);

    if (check.rows.length > 0) {
      await pool.query('UPDATE usuarios SET senha = $1 WHERE usuario = $2', [hash, 'brunoteste']);
      console.log('✅ Senha do usuário brunoteste atualizada com sucesso!');
    } else {
      await pool.query(
        'INSERT INTO usuarios (nome, usuario, senha) VALUES ($1, $2, $3)',
        ['Bruno', 'brunoteste', hash]
      );
      console.log('✅ Usuário brunoteste criado com sucesso!');
    }

    console.log('   Login: brunoteste');
    console.log('   Senha: 123456');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
