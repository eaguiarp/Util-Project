const pool = require('./db');

async function migrar() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS links_curtos (
      codigo TEXT PRIMARY KEY,
      url_destino TEXT NOT NULL,
      cliques INTEGER DEFAULT 0,
      criado_em TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ Tabela "links_curtos" criada (ou já existia).');
  await pool.end();
}

migrar().catch((err) => {
  console.error('❌ Erro ao migrar:', err.message);
  process.exit(1);
});