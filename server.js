require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const cron = require('node-cron');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const { postarMensagem } = require('./lib/telegram');
const { extrairASIN } = require('./lib/asin');

const TAG_AFILIADO = 'zinhalivros-20';
const SENHA = process.env.PAINEL_SENHA;

// Token simples derivado da senha, usado no cookie (evita guardar a senha crua no cookie)
const TOKEN_VALIDO = crypto.createHash('sha256').update(SENHA || '').digest('hex');

const app = express();
app.use(express.json());
app.use(cookieParser());

// Middleware de autenticação — protege tudo, exceto login e arquivos estáticos do login
function exigirLogin(req, res, next) {
  if (req.cookies.painel_auth === TOKEN_VALIDO) {
    return next();
  }
  if (req.path === '/login.html' || req.path === '/api/login') {
    return next();
  }
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ ok: false, erro: 'Não autenticado.' });
  }
  return res.redirect('/login.html');
}

app.use(exigirLogin);
app.use(express.static(path.join(__dirname, 'public')));

// Rota de login
app.post('/api/login', (req, res) => {
  const { senha } = req.body;
  if (senha === SENHA) {
    res.cookie('painel_auth', TOKEN_VALIDO, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
      sameSite: 'lax'
    });
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, erro: 'Senha incorreta.' });
});

// Rota: Postagem Rápida (livro com preço/promoção)
app.post('/api/postar-rapido', async (req, res) => {
  try {
    const { link, titulo, ehKU, precoFisicoDe, precoFisicoPor, precoKindle, percentualPromo, codigoCupom } = req.body;

    const asin = extrairASIN(link);
    if (!asin) {
      return res.status(400).json({ ok: false, erro: 'ASIN não identificado no link.' });
    }

    const linkAfiliado = `https://www.amazon.com.br/dp/${asin}?tag=${TAG_AFILIADO}`;

    let mensagem = `📚 *${titulo}*\n\n`;
    const linhasPreco = [];

    if (precoFisicoPor) {
  let linha = `📕 Capa comum: *R$ ${precoFisicoPor}*`;
  if (precoFisicoDe) linha += ` (de ~R$ ${precoFisicoDe}~)`;
  linhasPreco.push(linha);
}
    if (precoKindle) {
      linhasPreco.push(`📱 Kindle: *R$ ${precoKindle}*`);
    }
    if (ehKU) {
      linhasPreco.push(`📖 *Grátis para assinantes Kindle Unlimited*`);
    }
    if (percentualPromo) {
      let linhaCupom = `🎉 Promoção Amazon: *${percentualPromo}% OFF*`;
      linhaCupom += codigoCupom
        ? ` — código: \`${codigoCupom}\``
        : ` (desconto aplicado automaticamente na finalização da compra)`;
      linhasPreco.push(linhaCupom);
    }

    if (linhasPreco.length === 0) {
      return res.status(400).json({ ok: false, erro: 'Nenhum preço informado.' });
    }

    mensagem += linhasPreco.join('\n') + '\n';
    mensagem += `\n🔗 ${linkAfiliado}\n\n_Link de afiliado — Zinha Livros participa do Programa de Associados da Amazon_`;

    const resultado = await postarMensagem(mensagem);
    res.json(resultado.ok ? { ok: true, mensagem } : { ok: false, erro: resultado.description });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// Rota: Post de Texto (avisos avulsos)
app.post('/api/post-texto', async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto || !texto.trim()) {
      return res.status(400).json({ ok: false, erro: 'Texto vazio.' });
    }
    const resultado = await postarMensagem(texto);
    res.json(resultado.ok ? { ok: true } : { ok: false, erro: resultado.description });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

const pool = require('./db');
const { buscarCandidatos } = require('./lib/googlebooks');

// Roda a descoberta e salva candidatos novos no banco (evita duplicar por título)
app.post('/api/descobrir', async (req, res) => {
  try {
    const candidatos = await buscarCandidatos();
    let novos = 0;

    for (const c of candidatos) {
      const existe = await pool.query(
        'SELECT id FROM ofertas WHERE LOWER(titulo) = LOWER($1)',
        [c.titulo]
      );
      if (existe.rows.length > 0) continue;

      await pool.query(
        `INSERT INTO ofertas (titulo, autor, sinopse, capa, idioma, publicado_em, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pendente')`,
        [c.titulo, c.autor, c.sinopse, c.capa, c.idioma, c.publicado_em]
      );
      novos++;
    }

    res.json({ ok: true, novos, totalEncontrados: candidatos.length });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// Lista itens pendentes de curadoria

// Adiciona um livro manualmente à fila de curadoria (sem depender da busca automática)
app.post('/api/adicionar-manual', async (req, res) => {
  try {
    const { titulo, autor, sinopse } = req.body;

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ ok: false, erro: 'Título é obrigatório.' });
    }

    await pool.query(
      `INSERT INTO ofertas (titulo, autor, sinopse, status)
       VALUES ($1, $2, $3, 'pendente')`,
      [titulo.trim(), (autor || '').trim(), (sinopse || '').trim()]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

app.get('/api/pendentes', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, titulo, autor, sinopse, publicado_em
       FROM ofertas WHERE status = 'pendente'
       ORDER BY criado_em DESC`
    );
    res.json({ ok: true, itens: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// Descarta um item pendente
app.post('/api/descartar/:id', async (req, res) => {
  try {
    await pool.query(`UPDATE ofertas SET status = 'descartado' WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// Finaliza a curadoria de um item: monta a mensagem e marca como 'pronto'
app.post('/api/preparar/:id', async (req, res) => {
  try {
    const { link, ehKU, precoFisicoDe, precoFisicoPor, precoKindle, percentualPromo, codigoCupom } = req.body;
    const id = req.params.id;

    const item = await pool.query('SELECT * FROM ofertas WHERE id = $1', [id]);
    if (item.rows.length === 0) {
      return res.status(404).json({ ok: false, erro: 'Item não encontrado.' });
    }
    const oferta = item.rows[0];

    const asin = extrairASIN(link);
    if (!asin) {
      return res.status(400).json({ ok: false, erro: 'ASIN não identificado no link.' });
    }

    const linkAfiliado = `https://www.amazon.com.br/dp/${asin}?tag=${TAG_AFILIADO}`;

    let mensagem = `📚 *${oferta.titulo}*\n\n`;
    mensagem += `${oferta.sinopse}\n\n`;

    const linhasPreco = [];
    if (precoFisicoPor) {
  let linha = `📕 Capa comum: *R$ ${precoFisicoPor}*`;
  if (precoFisicoDe) linha += ` (de ~R$ ${precoFisicoDe}~)`;
  linhasPreco.push(linha);
}
    if (precoKindle) {
      linhasPreco.push(`📱 Kindle: *R$ ${precoKindle}*`);
    }
    if (ehKU) {
      linhasPreco.push(`📖 *Grátis para assinantes Kindle Unlimited*`);
    }
    if (percentualPromo) {
      let linhaCupom = `🎉 Promoção Amazon: *${percentualPromo}% OFF*`;
      linhaCupom += codigoCupom
        ? ` — código: \`${codigoCupom}\``
        : ` (desconto aplicado automaticamente na finalização da compra)`;
      linhasPreco.push(linhaCupom);
    }

    if (linhasPreco.length === 0) {
      return res.status(400).json({ ok: false, erro: 'Nenhum preço informado.' });
    }

    mensagem += linhasPreco.join('\n') + '\n';
    mensagem += `\n🔗 ${linkAfiliado}\n\n_Link de afiliado — Zinha Livros participa do Programa de Associados da Amazon_`;

    await pool.query(
      `UPDATE ofertas SET asin = $1, link_afiliado = $2, mensagem = $3, status = 'pronto' WHERE id = $4`,
      [asin, linkAfiliado, mensagem, id]
    );

    res.json({ ok: true, mensagem });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// Pega o próximo item 'pronto' no banco e posta no canal
async function postarProximoDaFila() {
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  try {
    const result = await pool.query(
      `SELECT * FROM ofertas WHERE status = 'pronto' ORDER BY criado_em ASC LIMIT 1`
    );

    if (result.rows.length === 0) {
      console.log(`[${agora}] Fila vazia, nada pra postar.`);
      return;
    }

    const item = result.rows[0];
    const resultado = await postarMensagem(item.mensagem);

    if (resultado.ok) {
      await pool.query(
        `UPDATE ofertas SET status = 'postado', postado_em = NOW() WHERE id = $1`,
        [item.id]
      );
      console.log(`[${agora}] ✅ Postado: ${item.titulo}`);
    } else {
      console.error(`[${agora}] ❌ Erro ao postar: ${resultado.description}`);
    }
  } catch (err) {
    console.error(`[${agora}] ❌ Erro no agendamento:`, err.message);
  }
}

// Horários fixos: 6h, 10h, 13h, 19h (horário de Brasília)
cron.schedule('0 6 * * *', postarProximoDaFila, { timezone: 'America/Sao_Paulo' });
cron.schedule('0 10 * * *', postarProximoDaFila, { timezone: 'America/Sao_Paulo' });
cron.schedule('0 13 * * *', postarProximoDaFila, { timezone: 'America/Sao_Paulo' });
cron.schedule('0 19 * * *', postarProximoDaFila, { timezone: 'America/Sao_Paulo' });

console.log('⏰ Agendamento ativo: postagens às 6h, 10h, 13h e 19h (horário de Brasília).');

app.post('/api/testar-agendamento', async (req, res) => {
  await postarProximoDaFila();
  res.json({ ok: true, mensagem: 'Verifique o console e o canal.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Painel Zinha Livros rodando em http://localhost:${PORT}`);
});