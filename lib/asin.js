const TAG_AFILIADO = 'zinhalivros-20';

function extrairDireto(texto) {
  const match =
    texto.match(/\/dp\/([A-Z0-9]{10})/i) ||
    texto.match(/\/gp\/product\/([A-Z0-9]{10})/i) ||
    texto.match(/\/gp\/aw\/d\/([A-Z0-9]{10})/i);
  if (match) return match[1];
  if (/^[A-Z0-9]{10}$/i.test(texto.trim())) return texto.trim();
  return null;
}

function ehLinkCurtoAmazon(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes('amzn.to') || host.includes('a.co') || host.includes('link.amazon');
  } catch {
    return false;
  }
}

function formatarLinkAfiliado(urlOriginal) {
  try {
    const url = new URL(urlOriginal);

    // Exemplo para a Amazon: garante que a tag correta seja inserida
    if (url.hostname.includes('amazon.com') || url.hostname.includes('amzn.to')) {
      // Se veio de um amzn.to expandido, ele já será amazon.com.br/...
      url.searchParams.set('tag', TAG_AFILIADO);
      return url.toString();
    }

    // Caso queira tratar outras lojas ou retornar o link limpo original
    return url.toString();
  } catch (e) {
    return urlOriginal; // Retorna o original se houver erro no parse
  }
}

// Retorna { asin, linkParaExibir }
async function resolverLink(entrada) {
  const entradaLimpa = entrada.trim();
  const asinDireto = extrairDireto(entradaLimpa);

  // Link completo (/dp/ASIN) — reconstrói sempre com nossa tag, ignorando o que veio
  if (asinDireto) {
    return {
      asin: asinDireto,
      linkParaExibir: formatarLinkAfiliado(`https://www.amazon.com.br/dp/${asinDireto}`)
    };
  }

  // Não achou padrão direto — tenta resolver como link curto
  try {
    const resposta = await fetch(entradaLimpa, { method: 'GET', redirect: 'follow' });
    const urlFinal = resposta.url;
    const asinResolvido = extrairDireto(urlFinal);

    if (!asinResolvido) {
      return { asin: null, linkParaExibir: null };
    }

    // Se for link curto OFICIAL da Amazon e já apontar pra nossa tag, mantém como está
    if (ehLinkCurtoAmazon(entradaLimpa) && urlFinal.includes(`tag=${TAG_AFILIADO}`)) {
      return { asin: asinResolvido, linkParaExibir: entradaLimpa };
    }

    // Caso contrário (sem tag, ou tag errada), reconstrói com segurança
    return {
      asin: asinResolvido,
      linkParaExibir: formatarLinkAfiliado(`https://www.amazon.com.br/dp/${asinResolvido}`)
    };
  } catch (err) {
    return { asin: null, linkParaExibir: null };
  }
}

function extrairASIN(texto) {
  return extrairDireto(texto);
}

module.exports = { resolverLink, extrairASIN, expandirLinkAmazon, formatarLinkAfiliado };

async function expandirLinkAmazon(urlCurta) {
  try {
    // Faz um ping rápido para seguir o redirecionamento
    const response = await fetch(urlCurta, { method: 'HEAD', redirect: 'follow' });
    return response.url; // Retorna a URL longa final, que contém o /dp/ASIN
  } catch (error) {
    console.error('Erro ao expandir link:', error);
    return urlCurta;
  }
}