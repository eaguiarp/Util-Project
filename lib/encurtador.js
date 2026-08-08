const pool = require('../db');

function gerarCodigo() {
  return require('crypto').randomBytes(4).toString('base64url').slice(0, 6);
}

async function encurtarUrl(url) {
  if (!url || !url.trim()) {
    throw new Error('URL é obrigatória.');
  }

  const urlLimpa = url.trim();
  let codigo = gerarCodigo();
  let existe = await pool.query('SELECT codigo FROM links_curtos WHERE codigo = $1', [codigo]);

  while (existe.rows.length > 0) {
    codigo = gerarCodigo();
    existe = await pool.query('SELECT codigo FROM links_curtos WHERE codigo = $1', [codigo]);
  }

  await pool.query(
    'INSERT INTO links_curtos (codigo, url_destino) VALUES ($1, $2)',
    [codigo, urlLimpa]
  );

  const host = process.env.APP_HOST || `http://localhost:${process.env.PORT || 3000}`;
  return `${host}/r/${codigo}`;
}

module.exports = { encurtarUrl };