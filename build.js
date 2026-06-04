import fs from 'fs';

if (!fs.existsSync('dist/index.html')) {
  throw new Error('A pasta dist não foi encontrada. Envie a pasta dist junto com o projeto.');
}

console.log('Build pronto: usando arquivos estáticos da pasta dist.');
