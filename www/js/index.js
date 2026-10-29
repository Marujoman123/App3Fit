import iniciarLogin from './login.js';

// Cordova: depois do login (ou cadastro) vai direto para o caixa
iniciarLogin({
  origem: 'interno',
  rotas: {
    admin: 'caixa.html',
    cliente: 'caixa.html',
    parceiro: 'caixa.html',
    cadastro: (cpf) => `cadastro.html?cpf=${cpf}`,
  },
});
