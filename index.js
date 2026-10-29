import iniciarLogin from './www/js/login.js';

// Web: depois do login vai para os painéis da raiz; telas internas ficam em www/
iniciarLogin({
  origem: 'externo',
  rotas: {
    admin: 'www/admin.html',
    cliente: 'cliente-painel.html',
    parceiro: 'parceiro-painel.html',
    cadastro: (cpf) => `www/cadastro.html?cpf=${cpf}`,
  },
});
