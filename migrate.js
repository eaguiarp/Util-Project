const pool = require('./db');
console.log('DATABASE_URL definida?', !!process.env.DATABASE_URL);

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
  console.log('✅ Tabela "ofertas" criada (ou já existia).');
  await pool.end();
}

migrar().catch((err) => {
  console.error('❌ Erro ao migrar (completo):', err);
  process.exit(1);
});