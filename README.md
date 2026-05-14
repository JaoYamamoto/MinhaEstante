# Minha Estante

Aplicação web para gerenciar sua estante pessoal de livros. Permite buscar títulos via Google Books, adicionar manualmente, e acompanhar o status de leitura.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Backend | Python 3, Flask, SQLAlchemy |
| Banco de dados | SQLite |
| E-mail (OTP) | EmailJS |

---

## Estrutura de diretórios

```
projetos/
├── app/                        # Next.js App Router
│   ├── api/
│   │   └── books-search/
│   │       └── route.ts        # Proxy para Google Books API (retry + cache)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── BookOverlay.tsx          # Modal de detalhes e edição do livro
│   ├── Home.tsx                 # Tela principal — grid da estante
│   ├── Login.tsx                # Tela de login
│   ├── Register.tsx             # Registro com OTP por e-mail
│   ├── SearchModal.tsx          # Modal de busca / adição / estante offline
│   └── Splash.tsx               # Tela de splash inicial
│
├── lib/
│   ├── api.ts                   # Cliente HTTP tipado para o backend Flask
│   ├── googleBooks.ts           # Cliente Google Books (cache, retry, erros)
│   └── otp.ts                   # Geração e validação de OTP via sessionStorage
│
├── backend/
│   ├── app.py                   # Aplicação Flask principal
│   ├── extensions.py            # Instância do SQLAlchemy
│   ├── models.py                # Modelos User e Book
│   ├── requirements.txt
│   ├── routes/
│   │   ├── auth.py              # Endpoints de autenticação
│   │   └── books.py             # Endpoints CRUD de livros
│   └── instance/
│       └── minha_estante.db     # Arquivo do banco SQLite (gerado automaticamente)
│
├── public/
│   ├── logo.jpg
│   └── logo.png
│
├── .env.local                   # Variáveis de ambiente do frontend (ver abaixo)
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## Como rodar localmente

### Pré-requisitos

- Node.js 18+
- Python 3.10+
- Conta no [EmailJS](https://emailjs.com) configurada
- Chave de API do [Google Books](https://developers.google.com/books/docs/v1/using#APIKey) (opcional — funciona sem ela com limite menor)

---

### 1. Frontend (Next.js)

```bash
# Instalar dependências
npm install

# Criar arquivo de variáveis de ambiente
cp .env.local.example .env.local   # ou criar manualmente (ver seção abaixo)

# Iniciar em modo desenvolvimento
npm run dev
```

Acesse em `http://localhost:3000`.

**Variáveis de ambiente — `.env.local`:**

```env
# URL do backend Flask
NEXT_PUBLIC_API_URL=http://localhost:5000

# EmailJS — obtidas no painel emailjs.com
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=sua_public_key
NEXT_PUBLIC_EMAILJS_SERVICE_ID=seu_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=seu_template_id

# Google Books API (opcional)
GOOGLE_BOOKS_API_KEY=sua_api_key
```

---

### 2. Backend (Flask)

```bash
cd backend

# Criar e ativar ambiente virtual
python -m venv .venv
source .venv/bin/activate        # Linux/macOS
.venv\Scripts\activate           # Windows

# Instalar dependências
pip install -r requirements.txt

# Criar arquivo de variáveis de ambiente
cp .env.example .env             # ou criar manualmente (ver abaixo)

# Iniciar o servidor
python app.py
```

O backend sobe em `http://localhost:5000`. O banco SQLite é criado automaticamente em `backend/instance/minha_estante.db` na primeira execução.

**Variáveis de ambiente — `backend/.env`:**

```env
# Chave secreta do Flask (use um valor aleatório longo em produção)
SECRET_KEY=troque_por_uma_chave_secreta_aleatoria

# Caminho do banco (relativo à pasta instance/)
DATABASE_URL=sqlite:///minha_estante.db

# Origem permitida pelo CORS
FRONTEND_ORIGIN=http://localhost:3000
```

---

## Banco de dados

O projeto usa SQLite gerenciado pelo SQLAlchemy. O arquivo de banco fica em `backend/instance/minha_estante.db` e é criado automaticamente por `db.create_all()` na inicialização do Flask.

### Tabela `users`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | Identificador único |
| `email` | VARCHAR(255) UNIQUE | E-mail do usuário |
| `username` | VARCHAR(80) UNIQUE | Nome de exibição |
| `password_hash` | VARCHAR(256) | Hash da senha (werkzeug) |
| `created_at` | DATETIME | Data de criação (UTC) |

Índices: `email`, `username`.

### Tabela `books`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | Identificador único |
| `user_id` | INTEGER FK | Referência ao usuário dono |
| `google_books_id` | VARCHAR(50) | ID da Google Books API (nullable) |
| `title` | VARCHAR(512) | Título do livro |
| `authors` | VARCHAR(512) | Autores em formato CSV |
| `publisher` | VARCHAR(256) | Editora |
| `published_date` | VARCHAR(32) | Data de publicação (ex.: `"1899"`) |
| `description` | TEXT | Sinopse |
| `page_count` | INTEGER | Número de páginas |
| `categories` | VARCHAR(512) | Categorias em formato CSV |
| `language` | VARCHAR(10) | Código de idioma (ex.: `"pt"`, `"en"`) |
| `cover_url` | VARCHAR(1024) | URL da imagem de capa |
| `status` | VARCHAR(20) | Status de leitura (ver abaixo) |
| `added_at` | DATETIME | Data de adição |
| `updated_at` | DATETIME | Data da última atualização |

Índice: `user_id`. Relacionamento: `users.id → books.user_id` (cascade delete).

**Valores válidos para `status`:**

| Valor | Exibição |
|-------|----------|
| `want_to_read` | Quero ler |
| `reading` | Lendo |
| `read` | Lido |

### Acesso direto ao banco (SQLite CLI)

```bash
sqlite3 backend/instance/minha_estante.db

# Exemplos de consultas
SELECT * FROM users;
SELECT title, authors, status FROM books WHERE user_id = 1;
```

---

## API do backend

Todas as respostas seguem o padrão `{ "ok": true, ... }` em sucesso ou `{ "ok": false, "error": "mensagem" }` em erro.

### Autenticação — `/auth`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/auth/check-email?email=` | Verifica se o e-mail já está cadastrado |
| GET | `/auth/check-username?username=` | Verifica se o username já está em uso |
| POST | `/auth/verify-otp` | Cria o usuário após confirmação de OTP |
| POST | `/auth/login` | Autentica com e-mail e senha |

**POST `/auth/verify-otp`**
```json
{ "email": "user@example.com", "username": "joao", "password": "Senha123" }
```

**POST `/auth/login`**
```json
{ "email": "user@example.com", "password": "Senha123" }
```

### Livros — `/books`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/books?user_id=1` | Lista todos os livros do usuário |
| POST | `/books` | Adiciona um livro |
| PUT | `/books/<id>` | Atualiza dados ou status de um livro |
| DELETE | `/books/<id>?user_id=1` | Remove um livro |

---

## Fluxo de busca com conexão fraca

O módulo de busca foi projetado para degradar graciosamente em conexões instáveis:

1. `navigator.onLine` é verificado antes de qualquer requisição — se offline, exibe erro imediatamente.
2. O frontend faz fetch para `/api/books-search` com timeout de 12 segundos.
3. O Route Handler no servidor tenta a Google Books API com timeout de 5 s e até 1 retry (backoff exponencial). Respeita o header `Retry-After` em respostas 429.
4. Resultados são cacheados em memória no cliente por 5 minutos.
5. Após 3 segundos sem resposta, aparece o aviso "Conexão lenta" com atalho para o modo manual.
6. Em caso de falha definitiva, a mensagem de erro indica a causa (`TIMEOUT`, `NETWORK`, `RATE_LIMIT`) e oferece acesso direto à aba **Manual**.
7. A aba **Na estante** permite pesquisar livros já salvos sem nenhuma conexão.
