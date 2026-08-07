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
    if (!resposta.trim()) console.log('⚠️  Esse campo é obrigatório, tenta de novo.');
  }
  return resposta.trim();
}

function extrairASIN(entrada) {
  const match = entrada.match(/\/dp\/([A-Z0-9]{10})/i) || entrada.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  if (match) return match[1];
  if (/^[A-Z0-9]{10}$/i.test(entrada.trim())) return entrada.trim();
  return null;
}

//buscar sinopse na Google Books
// Limpa o título tirando subtítulos e caracteres especiais para a busca não quebrar
// Remove acentos, subtítulos e pontuações para não quebrar a URL nem a busca
function limparTexto(texto) {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[:\-\(]/g, ' ')        // Substitui ':' , '-' ou '(' por espaço
    .replace(/[^\w\s]/gi, '')        // Remove caracteres especiais
    .replace(/\s+/g, ' ')            // Remove espaços duplos
    .trim();
}

async function buscarSinopse(titulo, autor, asin) {
  const tituloLimpo = limparTexto(titulo);
  const autorLimpo = limparTexto(autor);

  const construirUrl = (q, lang) => {
    const params = new URLSearchParams();
    params.set('q', q); // URLSearchParams cuida do encoding nativamente!
    params.set('maxResults', '5');
    params.set('orderBy', 'relevance');
    params.set('key', process.env.GOOGLE_BOOKS_API_KEY);
    if (lang) params.set('langRestrict', lang);
    return `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;
  };

  const tentativas = [];

  // 1. Busca direta por ISBN (ASIN de livro físico de 10 dígitos)
  if (asin && /^\d{9}[\dX]$/i.test(asin)) {
    tentativas.push(construirUrl(`isbn:${asin}`));
  }

  // 2. Busca por Título Limpo + Autor
  if (autorLimpo) {
    tentativas.push(construirUrl(`${tituloLimpo} ${autorLimpo}`, 'pt'));
  }

  // 3. Palavra principal do título + Autor
  const primeiraPalavraRelevante = tituloLimpo.split(' ').find(p => p.length > 3);
  if (primeiraPalavraRelevante && autorLimpo) {
    tentativas.push(construirUrl(`${primeiraPalavraRelevante} ${autorLimpo}`, 'pt'));
  }

  // 4. Apenas Título Limpo
  tentativas.push(construirUrl(tituloLimpo, 'pt'));

  console.log('\n[DEBUG] Tentativas geradas:', tentativas);

  for (const url of tentativas) {
    console.log('\n[DEBUG] Testando URL:', url);
    try {
      const response = await fetch(url);
      console.log('[DEBUG] Status HTTP:', response.status);

      if (!response.ok) {
        console.log('[DEBUG] Resposta não OK, pulando.');
        continue;
      }

      const data = await response.json();
      console.log('[DEBUG] totalItems:', data.totalItems);

      if (data.items && data.items.length > 0) {
        const comDescricao = data.items.find(item => item.volumeInfo && item.volumeInfo.description);
        console.log('[DEBUG] Algum item tem descrição?', !!comDescricao);
        
        if (comDescricao) {
          let desc = comDescricao.volumeInfo.description;
          
          // Limpa tags HTML
          desc = desc.replace(/<[^>]*>?/gm, '');
          desc = desc.replace(/\s+/g, ' ').trim();
          
          if (desc.length > 280) {
            desc = desc.slice(0, 280).trim() + '...';
          }
          return desc;
        }
      }
    } catch (err) {
      console.log('[DEBUG] ERRO na tentativa:', err.message);
    }
  }
  return null;
}


async function postarOferta() {
  const entradaLink = await perguntarObrigatorio('Cole o link do produto (ou o ASIN): ');
  const asin = extrairASIN(entradaLink);

  if (!asin) {
    console.log('❌ Não consegui identificar o ASIN. Confere o link/código e tenta de novo.');
    rl.close();
    return;
  }

  const titulo = await perguntarObrigatorio('Título do livro: ');
  const autor = await perguntar('Autor (opcional, ajuda a achar a sinopse certa): ');
  const ehKindle = await perguntar('É oferta de Kindle/e-book? (s/n): ');

  let ehKU = 'n';
  let precoDe = '';
  let precoPor = '';

  if (ehKindle.toLowerCase().startsWith('s')) {
    ehKU = await perguntar('É gratuito para assinantes do Kindle Unlimited? (s/n): ');
  }

  if (ehKU.toLowerCase().startsWith('s')) {
    precoPor = await perguntar('Preço normal, pra quem não assina KU (opcional): ');
  } else {
    precoDe = await perguntar('Preço "De" (ex: 59,90) — deixe vazio se não tiver: ');
    precoPor = await perguntarObrigatorio('Preço "Por" (ex: 29,90): ');
  }

  console.log('\n🔎 Buscando sinopse na Google Books...');
  let sinopse = await buscarSinopse(titulo, autor, asin);

  if (sinopse) {
    console.log(`\nSinopse encontrada:\n"${sinopse}"\n`);
    const usarSinopse = await perguntar('Usar essa sinopse? (s/n, "n" pra escrever a sua): ');
    if (!usarSinopse.toLowerCase().startsWith('s')) {
      sinopse = await perguntar('Escreva sua sinopse curta (ou deixe vazio pra não incluir): ');
    }
  } else {
    console.log('Nenhuma sinopse encontrada automaticamente.');
    sinopse = await perguntar('Escreva sua sinopse curta (opcional, deixe vazio pra não incluir): ');
  }

  const linkAfiliado = `https://www.amazon.com.br/dp/${asin}?tag=${TAG_AFILIADO}`;

  let mensagem = `📚 *${titulo}*\n\n`;

  if (sinopse && sinopse.trim()) {
    mensagem += `${sinopse.trim()}\n\n`;
  }

  if (ehKU.toLowerCase().startsWith('s')) {
    mensagem += `📖 *Grátis para assinantes Kindle Unlimited*`;
    if (precoPor.trim()) {
      mensagem += `\n(ou R$ ${precoPor} pra quem não assina)`;
    }
  } else {
    if (precoDe.trim()) {
      mensagem += `De: ~R$ ${precoDe}~\n`;
    }
    mensagem += `🔥 Por: *R$ ${precoPor}*`;
    if (ehKindle.toLowerCase().startsWith('s')) {
      mensagem += ` (Kindle)`;
    }
  }

  mensagem += `\n\n🔗 ${linkAfiliado}\n\n_Link de afiliado — Zinha Livros participa do Programa de Associados da Amazon_`;

  console.log('\n--- Pré-visualização ---\n');
  console.log(mensagem);
  console.log('\n------------------------\n');

  const confirmar = await perguntar('Postar no canal? (s/n): ');

  if (confirmar.toLowerCase().startsWith('s')) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: canal,
        text: mensagem,
        parse_mode: 'Markdown'
      })
    });
    const data = await response.json();
    if (data.ok) {
      console.log('✅ Postado com sucesso no canal!');
    } else {
      console.error('❌ Erro ao postar:', data.description);
    }
  } else {
    console.log('Cancelado.');
  }

  rl.close();
}

postarOferta();