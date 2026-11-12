// Teste manual que deu certo: login web com CPF de parceiro cadastrado
// leva direto ao painel do parceiro da raiz. Usa a planilha real, só leitura.

import { CPF_PARCEIRO } from '../support/commands';

describe('Login do parceiro (web)', () => {
  it('parceiro cadastrado entra direto no painel do parceiro', () => {
    cy.visit('/index.html');

    cy.get('#cpf').type(CPF_PARCEIRO.replace(/\D/g, ''));
    cy.get('#cpf').should('have.value', CPF_PARCEIRO);
    cy.get('#btnEntrar').click();

    // A consulta à planilha pelo Apps Script pode demorar
    cy.location('pathname', { timeout: 20000 }).should('eq', '/parceiro-painel.html');
    cy.contains('h1', 'Painel Parceiro').should('be.visible');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('usuario_tipo')).to.eq('Parceiro');
      expect(win.localStorage.getItem('usuario_cpf')).to.eq(CPF_PARCEIRO.replace(/\D/g, ''));
    });
  });
});
