# Zinha Livros — Painel e Bots

Projeto para gerir publicações de livros no Telegram, com painel web, curadoria por busca automática e postagem rápida.

## Visão geral

O painel web em `public/index.html` permite:

- postar rapidamente um livro com link da Amazon, título, autor, tipo, destaque e preços;
- enviar mensagens livres em texto;
- buscar novos candidatos via Google Books;
- revisar itens pendentes de curadoria;
- adicionar livros manualmente à fila;
- gerar links encurtados para afiliados.

A API em `server.js` centraliza o fluxo e autentica o painel por cookie.

## Estrutura principal

- `server.js`: API do painel e rotas web.
- `public/index.html`: dashboard com abas de Postagem Rápida, Texto, Curadoria, Lista e Encurtador.
- `bot.js`: bot do grupo de triagem para processar ofertas e enviar para o canal.
- `db.js`: conexão com PostgreSQL via `DATABASE_URL`.
- `migrate.js`: cria as tabelas necessárias.
- `lib/asin.js`: extração e normalização de ASINs e links da Amazon.
- `lib/encurtador.js`: lógica reutilizável para gerar links curtos.
- `lib/googlebooks.js`: busca de livros candidatos no Google Books.
- `lib/telegram.js`: envio de mensagens para o canal Telegram.
- `descobrir.js`: busca candidatos e grava a fila de descoberta.
- `preparar.js`: curadoria manual de itens prontos para postagem.
- `agendar.js`: postagem agendada via cron.
- Scripts CLI: `postar.js`, `postar_rapido.js`, `post_texto.js`, `preparar.js`.

## Painel: Postagem Rápida

Campos disponíveis:

- link do produto na Amazon;
- título do livro;
- autor (opcional);
- tipo do livro (opcional, vira hashtag pesquisável no canal);
- detalhe de destaque (opcional);
- Kindle Unlimited;
- preço físico "de";
- preço físico "por";
- preço Kindle;
- porcentagem de promoção Amazon;
- código do cupom.

O payload enviado para `POST /api/postar-rapido` segue este formato:

```json
{
  "link": "https://www.amazon.com.br/dp/...",
  "titulo": "Nome do livro",
  "autor": "Nome do autor",
  "tipoLivro": "Romance",
  "detalheDestaque": "Edição de luxo com capa almofadada",
  "ehKU": false,
  "precoFisicoDe": "59,90",
  "precoFisicoPor": "39,90",
  "precoKindle": "19,90",
  "percentualPromo": "20",
  "codigoCupom": ""
}
```

## Curadoria

Na aba Curadoria, o sistema busca candidatos com Google Books e permite:

- avaliar livros pendentes;
- preencher ou editar autor;
- definir tipo de livro para virar hashtag no canal;
- adicionar destaque da oferta;
- preencher link da Amazon e valores;
- confirmar envio para a fila de postagem.

A estrutura do formulário inclui campos como:

- autor (editável se necessário);
- tipo de livro;
- detalhe destaque;
- vínculo da Amazon;
- preços físico e Kindle;
- promoção e cupom.

## Rotas principais

- `POST /api/login` — autenticação do painel.
- `POST /api/postar-rapido` — monta mensagem e publica no Telegram.
- `POST /api/post-texto` — publica texto livre no canal.
- `POST /api/encurtar` — gera link curto para uma URL.
- `POST /api/descobrir` — busca candidatos no Google Books.
- `GET /api/pendentes` — lista itens na fila de curadoria.
- `POST /api/preparar/:id` — prepara um item para divulgação.
- `POST /api/testar-agendamento` — dispara um teste de agendamento.
- `GET /r/:codigo` — redireciona para a URL original e conta cliques.

## Variáveis de ambiente

Configure estas variáveis antes de rodar o projeto:

```bash
DATABASE_URL=
TELEGRAM_BOT_TOKEN=
PAINEL_SENHA=
GOOGLE_BOOKS_API_KEY=
GRUPO_TRIAGEM_ID=
APP_HOST=
```

- `DATABASE_URL`: conexão com PostgreSQL.
- `TELEGRAM_BOT_TOKEN`: token do bot que envia mensagens para o canal.
- `PAINEL_SENHA`: senha da área administrativa do painel.
- `GOOGLE_BOOKS_API_KEY`: chave da API do Google Books.
- `GRUPO_TRIAGEM_ID`: ID do grupo de triagem do bot.
- `APP_HOST`: host base usado para links curtos e redirecionamento.

## Como rodar

1. Instale dependências:

```bash
npm install
```

2. Crie as tabelas do banco:

```bash
node migrate.js
```

3. Inicie o servidor do painel:

```bash
node server.js
```

4. Inicie o bot de triagem:

```bash
node bot.js
```

5. Acesse o painel no navegador:

```text
http://localhost:3000
```

6. Faça login com a senha configurada em `PAINEL_SENHA`.

## Teste rápido de encurtador

```bash
curl -X POST http://localhost:3000/api/encurtar \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.amazon.com.br/dp/B08XYZ1234"}'
```

## Observações

- O encurtador usa a tabela `links_curtos` com campos como `codigo`, `url_destino` e `cliques`.
- A sintaxe de marketing do Telegram aceita Markdown como `*negrito*` e `_itálico_`.
- O `bot.js` só processa mensagens do grupo definido em `GRUPO_TRIAGEM_ID`.
- O painel usa autenticação por cookie e bloqueia acesso à API sem login válido.
