require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const readline = require('readline');

const token = process.env.TELEGRAM_BOT_TOKEN;
const canal = '-1003954889277';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function perguntar(pergunta) {
  return new Promise((resolve) => rl.question(pergunta, resolve));
}

async function postarTexto() {
  console.log('📝 Postagem de texto avulso (avisos, anúncios, etc.)\n');
  console.log('Digite sua mensagem. Pra terminar, digite uma linha só com "FIM" e aperte Enter.\n');

  let linhas = [];
  while (true) {
    const linha = await perguntar('');
    if (linha.trim().toUpperCase() === 'FIM') break;
    linhas.push(linha);
  }

  const mensagem = linhas.join('\n');

  if (!mensagem.trim()) {
    console.log('⚠️  Mensagem vazia, nada foi postado.');
    rl.close();
    return;
  }

  console.log('\n--- Prévia ---\n' + mensagem + '\n--------------\n');
  const confirmar = await perguntar('Postar no canal? (s/n): ');

  if (confirmar.toLowerCase().startsWith('s')) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: canal, text: mensagem, parse_mode: 'Markdown' })
    });
    const data = await response.json();
    if (data.ok) {
      console.log('✅ Postado com sucesso!');
    } else {
      console.error('❌ Erro:', data.description);
    }
  } else {
    console.log('Cancelado.');
  }

  rl.close();
}

postarTexto();
