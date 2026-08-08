const pool = require('./db');

async function migrar() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ofertas (
      id SERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      autor TEXT,
      sinopse TEXT,
      capa TEXT,
      idioma TEXT,
      publicado_em TEXT,
      asin TEXT,
      link_afiliado TEXT,
      mensagem TEXT,
      status TEXT NOT NULL DEFAULT 'pendente',
      criado_em TIMESTAMP DEFAULT NOW(),
      postado_em TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS links_curtos (
      codigo TEXT PRIMARY KEY,
      url_destino TEXT NOT NULL,
      cliques INTEGER DEFAULT 0,
      criado_em TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('✅ Tabelas criadas (ou já existiam).');
  await pool.end();
}

migrar().catch((err) => {
  console.error('❌ Erro ao migrar:', err.message);
  process.exit(1);
});