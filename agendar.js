require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const fs = require('fs');
const cron = require('node-cron');

const token = process.env.TELEGRAM_BOT_TOKEN;
const canal = '-1003954889277';
const ARQUIVO_PRONTA = 'fila_pronta.json';
const ARQUIVO_POSTADOS = 'postados.json';

function carregar(arquivo) {
  if (fs.existsSync(arquivo)) {
    return JSON.parse(fs.readFileSync(arquivo, 'utf-8'));
  }
  return [];
}

function salvar(arquivo, dados) {
  fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2));
}

async function postarProximoDaFila() {
  let filaPronta = carregar(ARQUIVO_PRONTA);
  let postados = carregar(ARQUIVO_POSTADOS);

  if (filaPronta.length === 0) {
    console.log(`[${new Date().toLocaleString('pt-BR')}] Fila vazia, nada pra postar.`);
    return;
  }

  const proximo = filaPronta.shift(); // pega o primeiro e remove da fila

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: canal,
      text: proximo.mensagem,
      parse_mode: 'Markdown'
    })
  });

  const data = await response.json();

  if (data.ok) {
    console.log(`[${new Date().toLocaleString('pt-BR')}] ✅ Postado: ${proximo.titulo}`);
    postados.push({ ...proximo, postadoEm: new Date().toISOString() });
    salvar(ARQUIVO_POSTADOS, postados);
    salvar(ARQUIVO_PRONTA, filaPronta);
  } else {
    console.error(`[${new Date().toLocaleString('pt-BR')}] ❌ Erro ao postar: ${data.description}`);
    // Devolve o item pro início da fila pra tentar de novo depois
    filaPronta.unshift(proximo);
    salvar(ARQUIVO_PRONTA, filaPronta);
  }
}

// Horários de postagem: 9h e 19h, todo dia
cron.schedule('0 9 * * *', postarProximoDaFila, { timezone: 'America/Sao_Paulo' });
cron.schedule('0 19 * * *', postarProximoDaFila, { timezone: 'America/Sao_Paulo' });

console.log('🤖 Agendador rodando. Postagens programadas para 9h e 19h (horário de Brasília).');
console.log('Deixe este terminal aberto para o agendamento funcionar.');
postarProximoDaFila();
