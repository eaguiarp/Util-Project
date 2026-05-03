const express = require('express');
const router = express.Router();

router.post('/calcular-horas', (req, res) => {
  const { inicio, fim, intervalo, valorHora } = req.body;

  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fim.split(':').map(Number);

  let minutosInicio = h1 * 60 + m1;
  let minutosFim = h2 * 60 + m2;

  let totalMinutos = minutosFim - minutosInicio - (intervalo * 60);

  let horas = totalMinutos / 60;
  let valor = horas * valorHora;

  res.json({
    horasTrabalhadas: horas,
    valorTotal: valor
  });
});

module.exports = router;