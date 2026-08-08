const { spawn } = require('child_process');

function runScript(scriptName) {
  const p = spawn('node', [scriptName], { stdio: 'inherit', shell: true });
  p.on('close', (code) => {
    if (code !== 0) {
      console.log(`Processo ${scriptName} encerrou com código ${code}`);
    }
  });
}

// Inicia o servidor web e o bot do Telegram em paralelo nativamente
runScript('server.js');
runScript('bot.js');