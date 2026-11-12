// Teste manual que deu certo (2026-11-11): login web com CPF de cliente cadastrado
// leva direto ao painel do cliente. Usa a planilha real, só leitura.

const CPF_CLIENTE = '142.021.350-40';

describe('Login do cliente (web)', () => {
  it('cliente cadastrado entra direto no painel do cliente', () => {
    cy.visit('/index.html');

    cy.get('#cpf').type(CPF_CLIENTE.replace(/\D/g, ''));
    cy.get('#cpf').should('have.value', CPF_CLIENTE);
    cy.get('#btnEntrar').click();

    // A consulta à planilha pelo Apps Script pode demorar
    cy.location('pathname', { timeout: 20000 }).should('eq', '/cliente-painel.html');
    cy.contains('h1', 'Painel Cliente').should('be.visible');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('usuario_tipo')).to.eq('Cliente');
      expect(win.localStorage.getItem('usuario_cpf')).to.eq('14202135040');
    });
  });
});
