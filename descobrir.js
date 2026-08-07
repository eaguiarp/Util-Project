require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const fs = require('fs');

const GOOGLE_KEY = process.env.GOOGLE_BOOKS_API_KEY;
const ARQUIVO_FILA = 'fila.json';

const anoAtual = new Date().getFullYear();

// Termos ancorados em atualidade, evitando puxar clássicos por padrão
const TERMOS_BUSCA = [
  `lançamentos ${anoAtual}`,
  `lançamentos ${anoAtual - 1}`,
  `mais vendidos ${anoAtual}`,
  'romance contemporâneo brasileiro',
  'ficção nacional recente'
];

async function buscarNovidades(termo) {
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

function ehPortugues(item) {
  const idioma = item.volumeInfo.language || '';
  return idioma.toLowerCase().startsWith('pt');
}

// Só aceita livros publicados nos últimos X anos (padrão: 2)
function ehRecente(item, anosMaximos = 2) {
  const dataPub = item.volumeInfo.publishedDate;
  if (!dataPub) return false;
  const ano = parseInt(dataPub.slice(0, 4), 10);
  return !isNaN(ano) && (anoAtual - ano) <= anosMaximos;
}

async function descobrir() {
  let filaAtual = [];
  if (fs.existsSync(ARQUIVO_FILA)) {
    filaAtual = JSON.parse(fs.readFileSync(ARQUIVO_FILA, 'utf-8'));
  }

  const titulosJaNaFila = new Set(filaAtual.map(i => i.titulo.toLowerCase()));
  let novosAdicionados = 0;
  let descartadosPorIdioma = 0;
  let descartadosPorData = 0;

  for (const termo of TERMOS_BUSCA) {
    console.log(`\n🔎 Buscando: ${termo}`);
    const items = await buscarNovidades(termo);

    for (const item of items) {
      const info = item.volumeInfo;
      if (!info.title || !info.description) continue;

      if (!ehPortugues(item)) {
        descartadosPorIdioma++;
        continue;
      }

      if (!ehRecente(item)) {
        descartadosPorData++;
        continue;
      }

      const tituloLower = info.title.toLowerCase();
      if (titulosJaNaFila.has(tituloLower)) continue;

      filaAtual.push({
        titulo: info.title,
        autor: (info.authors && info.authors[0]) || '',
        sinopse: info.description.replace(/<[^>]*>?/gm, '').slice(0, 280),
        capa: info.imageLinks ? info.imageLinks.thumbnail : null,
        idioma: info.language,
        publicadoEm: info.publishedDate,
        status: 'pendente'
      });
      titulosJaNaFila.add(tituloLower);
      novosAdicionados++;
    }
  }

  fs.writeFileSync(ARQUIVO_FILA, JSON.stringify(filaAtual, null, 2));
  console.log(`\n✅ ${novosAdicionados} novos candidatos recentes em português adicionados.`);
  console.log(`🚫 ${descartadosPorIdioma} descartados por idioma.`);
  console.log(`🚫 ${descartadosPorData} descartados por serem antigos (mais de 2 anos).`);
  console.log(`📋 Total pendente: ${filaAtual.filter(i => i.status === 'pendente').length}`);
}

descobrir();