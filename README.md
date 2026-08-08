# Zinha Livros — Painel e Bots

Resumo das funções e como rodar

- `server.js`: API e painel web. Rotas principais:
  - `POST /api/postar-rapido` — Extrai ASIN, gera link curto, monta mensagem e posta no Telegram.
  - `POST /api/preparar/:id` — Carrega oferta, extrai ASIN, gera link curto, monta mensagem e marca `pronto`.
  - `POST /api/encurtar` — API de encurtamento (gera código, salva em `links_curtos`).
  - `GET /r/:codigo` — Redireciona e conta cliques.
  - Autenticação via cookie (rota `/api/login`).

- `bot.js`: listener de mensagens do grupo de triagem que processa ofertas, encurta links e posta no canal oficial.
- `migrate.js`: cria tabelas `ofertas` e `links_curtos` no banco.
- `db.js`: exporta `pool` do `pg` configurado via `DATABASE_URL`.
- `lib/asin.js`: lógica para extrair/resolver ASINs e normalizar links afiliados.
- `lib/encurtador.js`: função `encurtarUrl(url)` reutilizável para gerar links curtos na tabela `links_curtos`.
- `lib/googlebooks.js`: busca candidatos no Google Books.
- `lib/telegram.js`: função `postarMensagem(mensagem)` que envia para o canal.
- `descobrir.js`: busca candidatos e grava `fila.json`.
- `preparar.js`: fluxo interativo de curadoria (gera `fila_pronta.json`).
- `agendar.js`: agendador que posta via Telegram nos horários programados.
- Scripts CLI: `postar.js`, `postar_rapido.js`, `post_texto.js`, `preparar.js`.

Como rodar:

1. Ajuste as variáveis de ambiente necessárias para o projeto:
   - `DATABASE_URL`
   - `TELEGRAM_BOT_TOKEN`
   - `PAINEL_SENHA`
   - `GOOGLE_BOOKS_API_KEY`
   - `GRUPO_TRIAGEM_ID` (ID do grupo privado para o bot de triagem)
   - `APP_HOST` (opcional, host base usado na geração de links curtos)

2. Instale dependências:

```bash
npm install
```

3. Rodar migração (cria tabelas):

```bash
node migrate.js
```

4. Iniciar servidor:

```bash
node server.js
```

5. Iniciar o bot de triagem:

```bash
node bot.js
```

6. Testar encurtamento via API:

```bash
curl -X POST http://localhost:3000/api/encurtar -H "Content-Type: application/json" -d '{"url":"https://www.amazon.com.br/dp/B08XYZ1234"}'
```

Notas:
- Os scripts CLI usam `readline` e são interativos.
- O encurtador usa a tabela `links_curtos` (colunas: `codigo`, `url_destino`, `cliques`).
- `TAG_AFILIADO` padrão: `zinhalivros-20`.
- `bot.js` só processa mensagens enviadas pelo `GRUPO_TRIAGEM_ID`.
