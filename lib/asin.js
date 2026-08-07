function extrairASIN(entrada) {
  const match = entrada.match(/\/dp\/([A-Z0-9]{10})/i) || entrada.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  if (match) return match[1];
  if (/^[A-Z0-9]{10}$/i.test(entrada.trim())) return entrada.trim();
  return null;
}

module.exports = { extrairASIN };