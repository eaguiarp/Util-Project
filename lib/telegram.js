const token = process.env.TELEGRAM_BOT_TOKEN;
const canal = '-1003954889277';

async function postarMensagem(mensagem, options = {}) {
  if (options.photo) {
    const url = `https://api.telegram.org/bot${token}/sendPhoto`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: canal,
        photo: options.photo,
        caption: mensagem,
        parse_mode: 'Markdown'
      })
    });
    return response.json();
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: canal, text: mensagem, parse_mode: 'Markdown' })
  });
  return response.json();
}

module.exports = { postarMensagem };