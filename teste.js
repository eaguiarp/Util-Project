require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const canal = '@zinhalivros';

async function enviarMensagem() {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: canal,
      text: '📚 Teste de conexão — Zinha Livros no ar!'
    })
  });

  const data = await response.json();

  if (data.ok) {
    console.log('✅ Mensagem enviada com sucesso! Confere lá no canal.');
  } else {
    console.error('❌ Erro ao enviar mensagem:', data.description);
  }
}

enviarMensagem();