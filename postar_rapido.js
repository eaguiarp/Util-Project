require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const readline = require('readline');

const token = process.env.TELEGRAM_BOT_TOKEN;
const canal = '-1003954889277';
const TAG_AFILIADO = 'zinhalivros-20';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function perguntar(pergunta) {
  return new Promise((resolve) => rl.question(pergunta, resolve));
}

async function perguntarObrigatorio(pergunta) {
  let resposta = '';
  while (!resposta.trim()) {
    resposta = await perguntar(pergunta);
    if (!resposta.trim()) console.log('⚠️  Campo obrigatório.');
  }
  return resposta.trim();
}

function extrairASIN(entrada) {
  const match = entrada.match(/\/dp\/([A-Z0-9]{10})/i) || entrada.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  if (match) return match[1];
  if (/^[A-Z0-9]{10}$/i.test(entrada.trim())) return entrada.trim();
  return null;
}

async function postar(mensagem) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: canal, text: mensagem, parse_mode: 'Markdown' })
  });
  return response.json();
}

async function postarRapido() {
  console.log('⚡ MODO EXPRESSO — sem sinopse, foco em velocidade.\n');
  console.log('(Digite "sair" a qualquer momento no campo de link pra encerrar)\n');

  while (true) {
    const entradaLink = await perguntar('Link do produto (ou "sair"): ');
    if (entradaLink.trim().toLowerCase() === 'sair') break;

    const asin = extrairASIN(entradaLink);
    if (!asin) {
      console.log('❌ ASIN não identificado, tenta de novo.\n');
      continue;
    }

    const titulo = await perguntarObrigatorio('Título: ');

    const ehKU = await perguntar('Grátis no Kindle Unlimited? (s/n): ');
    const precoFisicoDe = await perguntar('Físico "De" (opcional): ');
    const precoFisicoPor = await perguntar('Físico "Por" (opcional): ');
    const precoKindle = await perguntar('Preço Kindle (opcional): ');

    const linkAfiliado = `https://www.amazon.com.br/dp/${asin}?tag=${TAG_AFILIADO}`;

    let mensagem = `📚 *${titulo}*\n\n`;
    const linhasPreco = [];

    if (precoFisicoPor.trim()) {
      let linha = `📕 Capa comum: `;
      if (precoFisicoDe.trim()) linha += `de ~R$ ${precoFisicoDe}~ por `;
      linha += `*R$ ${precoFisicoPor}*`;
      linhasPreco.push(linha);
    }
    if (precoKindle.trim()) {
      linhasPreco.push(`📱 Kindle: *R$ ${precoKindle}*`);
    }
    if (ehKU.toLowerCase().startsWith('s')) {
      linhasPreco.push(`📖 *Grátis para assinantes Kindle Unlimited*`);
    }

    const temCupom = await perguntar('Tem promoção/desconto automático da Amazon pra esse livro? (s/n): ');
    let codigoCupom = '';
    let percentualCupom = '';
    if (temCupom.toLowerCase().startsWith('s')) {
      codigoCupom = await perguntar('  Código do cupom, SE houver (deixe vazio se for automático): ');
      percentualCupom = await perguntar('  Percentual do desconto (ex: 20): ');
    }

    if (percentualCupom.trim()) {
      let linhaCupom = `🎉 Promoção Amazon: *${percentualCupom}% OFF*`;
      if (codigoCupom.trim()) {
        linhaCupom += ` — código: \`${codigoCupom}\``;
      } else {
        linhaCupom += ` (desconto aplicado automaticamente na finalização da compra)`;
      }
      linhasPreco.push(linhaCupom);
    }

    if (linhasPreco.length === 0) {
      console.log('⚠️  Nenhum preço informado, pulando.\n');
      continue;
    }

    mensagem += linhasPreco.join('\n') + '\n';
    mensagem += `\n🔗 ${linkAfiliado}\n\n_Link de afiliado — Zinha Livros participa do Programa de Associados da Amazon_`;

    console.log('\n--- Prévia ---\n' + mensagem + '\n--------------\n');
    const confirmar = await perguntar('Postar? (s/n): ');

    if (confirmar.toLowerCase().startsWith('s')) {
      const data = await postar(mensagem);
      if (data.ok) {
        console.log('✅ Postado!\n');
      } else {
        console.error('❌ Erro:', data.description, '\n');
      }
    } else {
      console.log('Pulado.\n');
    }
  }

  console.log('👋 Modo expresso encerrado.');
  rl.close();
}

postarRapido();