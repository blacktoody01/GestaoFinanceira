# SoluFinance - Sistema de Gestão Financeira

Sistema completo de gestão financeira desenvolvido para a plataforma SoluAux.

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Instalação na VPS

### 1. Clone o repositório
```bash
cd /var/www
git clone https://github.com/blacktoody01/GestaoFinanceira.git
cd GestaoFinanceira
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o banco de dados
```bash
# Crie o banco no PostgreSQL
sudo -u postgres psql -f database/init.sql
```

### 4. Configure o .env
```bash
cp .env.example .env
nano .env
# Preencha DB_PASS com a senha do seu PostgreSQL
```

### 5. Gere a senha do usuário padrão
```bash
node database/seed-user.js
```

### 6. Inicie a aplicação
```bash
npm start
```

### Configuração com PM2 (recomendado)
```bash
pm2 start server.js --name solufinance
pm2 save
```

### Configuração Nginx (proxy reverso)
```nginx
server {
    listen 80;
    server_name gestaofinanceira.soluaux.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Acesso Padrão

- **Usuário:** brunoteste
- **Senha:** 123456

## Funcionalidades

- Dashboard com resumo financeiro
- Gerenciamento de transações (receitas e despesas)
- Categorias personalizáveis
- Contas bancárias
- Gerenciamento de usuários
- Exportação CSV
- Interface responsiva (mobile-friendly)

## Tecnologias

- **Backend:** Node.js + Express
- **Banco de Dados:** PostgreSQL
- **Autenticação:** bcryptjs + express-session
- **Frontend:** HTML/CSS/JS puro (sem framework)

---

© SoluAux - Todos os direitos reservados
