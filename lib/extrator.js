function calcularDesconto(textoMensagem) {
  // Cenário 1: O canal concorrente já escreveu a porcentagem (ex: "🔥 45% OFF", "-50%")
  const matchPorcentagem = textoMensagem.match(/(\d+)%\s*(off)?/i);
  if (matchPorcentagem) {
    return parseInt(matchPorcentagem[1], 10);
  }

  // Cenário 2: O canal colocou os preços (ex: "De R$ 69,90 por R$ 29,90")
  const matchPrecos = textoMensagem.match(/de\s*r\$\s*([\d,]+)\s*por\s*r\$\s*([\d,]+)/i);
  if (matchPrecos) {
     const precoAntigo = parseFloat(matchPrecos[1].replace(',', '.'));
     const precoNovo = parseFloat(matchPrecos[2].replace(',', '.'));
     
     if (precoAntigo > 0 && precoNovo < precoAntigo) {
        const desconto = ((precoAntigo - precoNovo) / precoAntigo) * 100;
        return Math.round(desconto);
     }
  }

  return 0; // Se não conseguir identificar, devolve 0 para ser descartado
}

// Dentro do loop de escuta do seu Userbot:
const descontoIdentificado = calcularDesconto(mensagemRecebida);

if (descontoIdentificado >= 40) {
    console.log(`✅ Oferta validada com ${descontoIdentificado}% de desconto!`);
    // Aqui você chama a lib/asin.js, gera o link curto e salva a oferta
} else {
    console.log(`🚫 Descartado: Desconto irrelevante (${descontoIdentificado}%)`);
}