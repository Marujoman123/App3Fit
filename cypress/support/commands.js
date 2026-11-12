// Cadastrados na planilha real (usados nos testes manuais)
export const CPF_CLIENTE = '142.021.350-40';
export const CPF_PARCEIRO = '364.045.920-29';

// Faz o login web pela tela real e espera chegar ao painel do cliente
Cypress.Commands.add('entrarComoCliente', () => {
  cy.visit('/index.html');
  cy.get('#cpf').type(CPF_CLIENTE.replace(/\D/g, ''));
  cy.get('#btnEntrar').click();
  // A consulta à planilha pelo Apps Script pode demorar
  cy.location('pathname', { timeout: 20000 }).should('eq', '/cliente-painel.html');
});

// Admin de teste: CPF e senha vêm do cypress.env.json (local, fora do git)
Cypress.Commands.add('entrarComoAdmin', () => {
  const cpf = Cypress.env('ADMIN_TESTE_CPF');
  const senha = Cypress.env('ADMIN_TESTE_SENHA');
  if (!cpf || !senha) {
    throw new Error('Crie o cypress.env.json com ADMIN_TESTE_CPF e ADMIN_TESTE_SENHA.');
  }

  cy.visit('/index.html');
  cy.get('#cpf').type(cpf);
  cy.get('#btnEntrar').click();

  // O Apps Script responde "admin" e o site pede a senha
  cy.get('#modalSenha', { timeout: 20000 }).should('be.visible');
  cy.get('#inputSenhaAdmin').type(senha, { log: false });
  cy.get('#btnConfirmarSenha').click();

  cy.location('pathname', { timeout: 20000 }).should('eq', '/www/admin.html');
});

// Faz o login web pela tela real e espera chegar ao painel do parceiro
Cypress.Commands.add('entrarComoParceiro', () => {
  cy.visit('/index.html');
  cy.get('#cpf').type(CPF_PARCEIRO.replace(/\D/g, ''));
  cy.get('#btnEntrar').click();
  cy.location('pathname', { timeout: 20000 }).should('eq', '/parceiro-painel.html');
});
