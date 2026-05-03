const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Importante para o Railway!

app.use(cors());
app.use(express.json());

// 1. Rota da API (seus cálculos no backend)
const horasRoute = require('./routes/calculadoraHoras');
app.use('/api', horasRoute);

// 2. Servir os arquivos estáticos da pasta frontend
// Isso faz com que / aponte para frontend/index.html
// E /calculadora-horas aponte para frontend/calculadora-horas/index.html
app.use(express.static(path.join(__dirname, '../frontend')));

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

