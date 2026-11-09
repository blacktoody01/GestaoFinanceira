require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'Gestor_Financeira',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'solufinance_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// Auth middleware
function auth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: 'Não autorizado' });
}

// ═══ AUTH ROUTES ═══

app.post('/api/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE usuario = $1 AND ativo = true',
      [usuario]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(senha, user.senha);
    if (!valid) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos' });
    }
    req.session.userId = user.id;
    req.session.userName = user.nome;
    req.session.userLogin = user.usuario;
    res.json({ ok: true, nome: user.nome });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => {
  res.json({ id: req.session.userId, nome: req.session.userName, usuario: req.session.userLogin });
});

// ═══ USERS ROUTES ═══

app.get('/api/usuarios', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, usuario, email, ativo, criado_em FROM usuarios ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/usuarios', auth, async (req, res) => {
  try {
    const { nome, usuario, email, senha } = req.body;
    const hash = await bcrypt.hash(senha, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (nome, usuario, email, senha) VALUES ($1, $2, $3, $4) RETURNING id, nome, usuario, email, ativo',
      [nome, usuario, email || null, hash]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Usuário já existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/usuarios/:id', auth, async (req, res) => {
  try {
    const { nome, email, senha, ativo } = req.body;
    if (senha) {
      const hash = await bcrypt.hash(senha, 10);
      await pool.query(
        'UPDATE usuarios SET nome=$1, email=$2, senha=$3, ativo=$4, atualizado_em=NOW() WHERE id=$5',
        [nome, email || null, hash, ativo !== false, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE usuarios SET nome=$1, email=$2, ativo=$3, atualizado_em=NOW() WHERE id=$4',
        [nome, email || null, ativo !== false, req.params.id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══ CATEGORIES ROUTES ═══

app.get('/api/categorias', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categorias', auth, async (req, res) => {
  try {
    const { nome, tipo, cor } = req.body;
    const result = await pool.query(
      'INSERT INTO categorias (nome, tipo, cor) VALUES ($1, $2, $3) RETURNING *',
      [nome, tipo || 'expense', cor || '#2a78d6']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categorias/:id', auth, async (req, res) => {
  try {
    const { nome, tipo, cor } = req.body;
    await pool.query(
      'UPDATE categorias SET nome=$1, tipo=$2, cor=$3 WHERE id=$4',
      [nome, tipo, cor, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categorias/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM categorias WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══ ACCOUNTS ROUTES ═══

app.get('/api/contas', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contas ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contas', auth, async (req, res) => {
  try {
    const { nome, tipo, saldo_inicial } = req.body;
    const result = await pool.query(
      'INSERT INTO contas (nome, tipo, saldo_inicial, usuario_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, tipo || 'checking', saldo_inicial || 0, req.session.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/contas/:id', auth, async (req, res) => {
  try {
    const { nome, tipo, saldo_inicial } = req.body;
    await pool.query(
      'UPDATE contas SET nome=$1, tipo=$2, saldo_inicial=$3 WHERE id=$4',
      [nome, tipo, saldo_inicial || 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/contas/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM contas WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══ TRANSACTIONS ROUTES ═══

app.get('/api/transacoes', auth, async (req, res) => {
  try {
    const { mes, ano, tipo } = req.query;
    let sql = `SELECT t.*, c.nome as categoria_nome, c.cor as categoria_cor, co.nome as conta_nome
               FROM transacoes t
               LEFT JOIN categorias c ON t.categoria_id = c.id
               LEFT JOIN contas co ON t.conta_id = co.id
               WHERE 1=1`;
    const params = [];
    if (mes && ano) {
      params.push(parseInt(mes) + 1, parseInt(ano));
      sql += ` AND EXTRACT(MONTH FROM t.data) = $${params.length - 1} AND EXTRACT(YEAR FROM t.data) = $${params.length}`;
    }
    if (tipo) {
      params.push(tipo);
      sql += ` AND t.tipo = $${params.length}`;
    }
    sql += ' ORDER BY t.data DESC, t.id DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transacoes', auth, async (req, res) => {
  try {
    const { tipo, valor, data, descricao, categoria_id, conta_id, status, observacoes } = req.body;
    const result = await pool.query(
      `INSERT INTO transacoes (tipo, valor, data, descricao, categoria_id, conta_id, status, observacoes, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tipo, valor, data, descricao, categoria_id || null, conta_id || null, status || 'paid', observacoes, req.session.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/transacoes/:id', auth, async (req, res) => {
  try {
    const { tipo, valor, data, descricao, categoria_id, conta_id, status, observacoes } = req.body;
    await pool.query(
      `UPDATE transacoes SET tipo=$1, valor=$2, data=$3, descricao=$4, categoria_id=$5,
       conta_id=$6, status=$7, observacoes=$8, atualizado_em=NOW() WHERE id=$9`,
      [tipo, valor, data, descricao, categoria_id || null, conta_id || null, status, observacoes, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transacoes/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM transacoes WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard summary
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const m = parseInt(mes) + 1;
    const y = parseInt(ano);

    const income = await pool.query(
      `SELECT COALESCE(SUM(valor),0) as total FROM transacoes WHERE tipo='income' AND EXTRACT(MONTH FROM data)=$1 AND EXTRACT(YEAR FROM data)=$2`,
      [m, y]
    );
    const expense = await pool.query(
      `SELECT COALESCE(SUM(valor),0) as total FROM transacoes WHERE tipo='expense' AND EXTRACT(MONTH FROM data)=$1 AND EXTRACT(YEAR FROM data)=$2`,
      [m, y]
    );
    const pending = await pool.query(
      `SELECT COALESCE(SUM(valor),0) as total FROM transacoes WHERE tipo='expense' AND status='pending' AND EXTRACT(MONTH FROM data)=$1 AND EXTRACT(YEAR FROM data)=$2`,
      [m, y]
    );

    // Last 6 months flow
    const flow = await pool.query(`
      SELECT EXTRACT(MONTH FROM data) as mes, EXTRACT(YEAR FROM data) as ano, tipo,
             COALESCE(SUM(valor),0) as total
      FROM transacoes
      WHERE data >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY EXTRACT(MONTH FROM data), EXTRACT(YEAR FROM data), tipo
      ORDER BY ano, mes
    `);

    // Expenses by category this month
    const catExpenses = await pool.query(`
      SELECT c.nome, c.cor, COALESCE(SUM(t.valor),0) as total
      FROM transacoes t
      JOIN categorias c ON t.categoria_id = c.id
      WHERE t.tipo='expense' AND EXTRACT(MONTH FROM t.data)=$1 AND EXTRACT(YEAR FROM t.data)=$2
      GROUP BY c.nome, c.cor
      ORDER BY total DESC
      LIMIT 6
    `, [m, y]);

    res.json({
      income: parseFloat(income.rows[0].total),
      expense: parseFloat(expense.rows[0].total),
      pending: parseFloat(pending.rows[0].total),
      flow: flow.rows,
      catExpenses: catExpenses.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══ CSV EXPORT ═══
app.get('/api/export/csv', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.data, t.tipo, t.descricao, c.nome as categoria, co.nome as conta,
             t.valor, t.status, t.observacoes
      FROM transacoes t
      LEFT JOIN categorias c ON t.categoria_id = c.id
      LEFT JOIN contas co ON t.conta_id = co.id
      ORDER BY t.data
    `);
    let csv = 'Data,Tipo,Descrição,Categoria,Conta,Valor,Status,Observações\n';
    for (const r of result.rows) {
      const tipo = r.tipo === 'income' ? 'Receita' : r.tipo === 'expense' ? 'Despesa' : 'Transferência';
      const status = r.status === 'pending' ? 'Pendente' : 'Pago';
      csv += `${r.data ? new Date(r.data).toISOString().slice(0,10) : ''},${tipo},"${(r.descricao||'').replace(/"/g,'""')}","${r.categoria||''}","${r.conta||''}",${r.valor},${status},"${(r.observacoes||'').replace(/"/g,'""')}"\n`;
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=solufinance_export.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback
app.get('/app', auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/app');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
  console.log(`SoluFinance rodando na porta ${PORT}`);
});
