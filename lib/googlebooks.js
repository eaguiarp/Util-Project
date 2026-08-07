const GOOGLE_KEY = process.env.GOOGLE_BOOKS_API_KEY;
const anoAtual = new Date().getFullYear();

const TERMOS_BUSCA = [
  `lançamentos ${anoAtual}`,
  `lançamentos ${anoAtual - 1}`,
  `mais vendidos ${anoAtual}`,
  'romance contemporâneo brasileiro',
  'ficção nacional recente'
];

function ehPortugues(item) {
  const idioma = item.volumeInfo.language || '';
  return idioma.toLowerCase().startsWith('pt');
}

function ehRecente(item, anosMaximos = 2) {
  const dataPub = item.volumeInfo.publishedDate;
  if (!dataPub) return false;
  const ano = parseInt(dataPub.slice(0, 4), 10);
  return !isNaN(ano) && (anoAtual - ano) <= anosMaximos;
}

async function buscarPorTermo(termo) {
  const params = new URLSearchParams();
  params.set('q', termo);
  params.set('orderBy', 'newest');
  params.set('maxResults', '20');
  params.set('langRestrict', 'pt');
  params.set('key', GOOGLE_KEY);

  const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return data.items || [];
}

async function buscarCandidatos() {
  const candidatos = [];
  for (const termo of TERMOS_BUSCA) {
    const items = await buscarPorTermo(termo);
    for (const item of items) {
      const info = item.volumeInfo;
      if (!info.title || !info.description) continue;
      if (!ehPortugues(item)) continue;
      if (!ehRecente(item)) continue;

      candidatos.push({
        titulo: info.title,
        autor: (info.authors && info.authors[0]) || '',
        sinopse: info.description.replace(/<[^>]*>?/gm, '').slice(0, 280),
        capa: info.imageLinks ? info.imageLinks.thumbnail : null,
        idioma: info.language,
        publicado_em: info.publishedDate
      });
    }
  }
  return candidatos;
}

module.exports = { buscarCandidatos };