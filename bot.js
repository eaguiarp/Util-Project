require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { resolverLink, formatarLinkAfiliado } = require('./lib/asin');
const { postarMensagem } = require('./lib/telegram');
const { encurtarUrl } = require('./lib/encurtador');

const token = process.env.TELEGRAM_BOT_TOKEN;
const GRUPO_TRIAGEM_ID = process.env.GRUPO_TRIAGEM_ID;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN não configurado.');
  process.exit(1);
}

if (!GRUPO_TRIAGEM_ID) {
  console.error('GRUPO_TRIAGEM_ID não configurado.');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.on('message', async (msg) => {
  const chatId = msg.chat.id.toString();

  // 👉 MODO FOFOQUEIRO ATIVADO:
  console.log('\n--- 📩 NOVA MENSAGEM ---');
  console.log('Chat ID recebido:', chatId);
  console.log('Texto da mensagem:', msg.text || msg.caption);

  if (chatId !== GRUPO_TRIAGEM_ID) {
    console.log(`❌ IGNORADO: O ID do grupo (${chatId}) não bate com o do seu .env (${GRUPO_TRIAGEM_ID}).`);
    return;
  }

  const texto = msg.text || msg.caption;
  if (!texto) {
    return bot.sendMessage(chatId, '⚠️ Não encontrei nenhum texto na mensagem.');
  }

  // Vamos procurar por QUALQUER URL dentro do texto da mensagem encaminhada
  const regexQualquerUrl = /(https?:\/\/[^\s]+)/g;
  const urlsEncontradas = texto.match(regexQualquerUrl);

  if (!urlsEncontradas || urlsEncontradas.length === 0) {
    return bot.sendMessage(chatId, '⚠️ Não encontrei nenhum link na mensagem.');
  }

  let asinEncontrado = null;
  let linkFinalParaPostar = null;

  // Testa cada link encontrado na mensagem para ver qual é o da Amazon
  for (const urlCandidata of urlsEncontradas) {
    const resultado = await resolverLink(urlCandidata);
    if (resultado.asin) {
      asinEncontrado = resultado.asin;
      linkFinalParaPostar = resultado.linkParaExibir;
      break;
    }
  }

  if (!asinEncontrado) {
    return bot.sendMessage(chatId, '⚠️ Nenhum link válido da Amazon foi identificado.');
  }

 try {
    const linkFinal = formatarLinkAfiliado(linkFinalParaPostar);
    
    // Substitui todos os links antigos encontrados pelo link limpo oficial da Amazon
    let textoZinha = texto;
    for (const urlCandidata of urlsEncontradas) {
      textoZinha = textoZinha.replace(urlCandidata, linkFinal);
    }

    const photoId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : null;
    await postarMensagem(textoZinha, photoId ? { photo: photoId } : {});
    await bot.sendMessage(chatId, `✅ Oferta convertida e postada com sucesso! (ASIN: ${asinEncontrado})`);
  } catch (erro) {
    console.error(erro);
    await bot.sendMessage(chatId, `❌ Erro ao converter oferta: ${erro.message}`);
  }
});