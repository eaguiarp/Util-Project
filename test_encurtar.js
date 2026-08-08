require('dotenv').config();
const crypto = require('crypto');
const pool = require('./db');

function gerarCodigo() {
  return crypto.randomBytes(4).toString('base64url').slice(0, 6);
}

(async () => {
  try {
    const urlDestino = 'https://www.amazon.com.br/dp/B08XYZ1234?tag=zinhalivros-20';
    let codigo = gerarCodigo();
    let existe = await pool.query('SELECT codigo FROM links_curtos WHERE codigo = $1', [codigo]);
    while (existe.rows.length > 0) {
      codigo = gerarCodigo();
      existe = await pool.query('SELECT codigo FROM links_curtos WHERE codigo = $1', [codigo]);
    }
    await pool.query('INSERT INTO links_curtos (codigo, url_destino) VALUES ($1, $2)', [codigo, urlDestino]);
    console.log('Inserido link curto:', `${process.env.TEST_HOST || 'http://localhost:3000'}/r/${codigo}`);
  } catch (err) {
    console.error('Erro no teste de encurtamento:', err.message);
  } finally {
    await pool.end();
  }
})();
