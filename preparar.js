require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const fs = require('fs');
const readline = require('readline');

const TAG_AFILIADO = 'zinhalivros-20';
const ARQUIVO_FILA = 'fila.json';
const ARQUIVO_PRONTA = 'fila_pronta.json';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function perguntar(pergunta) {
  return new Promise((resolve) => rl.question(pergunta, resolve));
}

function extrairASIN(entrada) {
  const match = entrada.match(/\/dp\/([A-Z0-9]{10})/i) || entrada.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  if (match) return match[1];
  if (/^[A-Z0-9]{10}$/i.test(entrada.trim())) return entrada.trim();
  return null;
}

function carregar(arquivo) {
  if (fs.existsSync(arquivo)) {
    return JSON.parse(fs.readFileSync(arquivo, 'utf-8'));
  }
  return [];
}

function salvar(arquivo, dados) {
  fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2));
}

async function preparar() {
  let fila = carregar(ARQUIVO_FILA);
  let filaPronta = carregar(ARQUIVO_PRONTA);

  const pendentes = fila.filter(i => i.status === 'pendente');

  if (pendentes.length === 0) {
    console.log('📋 Nenhum item pendente na fila. Rode o descobrir.js pra buscar mais.');
    rl.close();
    return;
  }

  console.log(`\n📋 ${pendentes.length} itens pendentes.\n`);

  for (const item of pendentes) {
    console.log('\n─────────────────────────────');
    console.log(`📚 ${item.titulo}`);
    console.log(`✍️  ${item.autor || '(autor não identificado)'}`);
    console.log(`📝 ${item.sinopse}`);
    console.log('─────────────────────────────\n');

    const acao = await perguntar('Usar este livro? (s / n=pular / p=parar por aqui): ');

    if (acao.toLowerCase().startsWith('p')) {
      break;
    }

    if (!acao.toLowerCase().startsWith('s')) {
      item.status = 'descartado';
      continue;
    }

    const entradaLink = await perguntar('Cole o link do produto na Amazon: ');
    const asin = extrairASIN(entradaLink);

    if (!asin) {
      console.log('❌ ASIN não identificado, pulando este item.');
      continue;
    }

    const ehKU = await perguntar('Disponível no Kindle Unlimited (grátis pra assinante)? (s/n): ');

    const temFisico = await perguntar('Tem preço promocional pra capa física (De/Por)? (s/n): ');
    let precoFisicoDe = '';
    let precoFisicoPor = '';
    if (temFisico.toLowerCase().startsWith('s')) {
      precoFisicoDe = await perguntar('  Preço "De" do físico (opcional): ');
      precoFisicoPor = await perguntar('  Preço "Por" do físico: ');
    }

    const temKindle = await perguntar('Tem preço de Kindle pra mostrar? (s/n): ');
    let precoKindle = '';
    if (temKindle.toLowerCase().startsWith('s')) {
      precoKindle = await perguntar('  Preço do Kindle: ');
    }

    const linkAfiliado = `https://www.amazon.com.br/dp/${asin}?tag=${TAG_AFILIADO}`;

    let mensagem = `📚 *${item.titulo}*\n\n`;
    mensagem += `${item.sinopse}\n\n`;

    const linhasPreco = [];

    if (precoFisicoPor.trim()) {
      let linha = `📕 Capa comum: `;
      if (precoFisicoDe.trim()) {
        linha += `de ~R$ ${precoFisicoDe}~ por `;
      }
      linha += `*R$ ${precoFisicoPor}*`;
      linhasPreco.push(linha);
    }

    if (precoKindle.trim()) {
      linhasPreco.push(`📱 Kindle: *R$ ${precoKindle}*`);
    }

    if (ehKU.toLowerCase().startsWith('s')) {
      linhasPreco.push(`📖 *Grátis para assinantes Kindle Unlimited*`);
    }

    if (linhasPreco.length === 0) {
      console.log('⚠️  Nenhum preço informado — pulando este item.');
      continue;
    }

    mensagem += linhasPreco.join('\n') + '\n';
    mensagem += `\n🔗 ${linkAfiliado}\n\n_Link de afiliado — Zinha Livros participa do Programa de Associados da Amazon_`;

    filaPronta.push({ titulo: item.titulo, mensagem });
    item.status = 'pronto';

    console.log('✅ Adicionado à fila de postagem.');
  }

  salvar(ARQUIVO_FILA, fila);
  salvar(ARQUIVO_PRONTA, filaPronta);

  console.log(`\n📤 Fila pronta pra postar: ${filaPronta.length} itens.`);
  rl.close();
}

preparar();