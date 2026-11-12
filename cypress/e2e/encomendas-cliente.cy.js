// Regra pedida em 2026-11-11: o cliente, em Encomendas, só vê "Meu Pedido" (preço de cliente,
// nome dele travado). A opção "Venda Cliente" não aparece para cliente.

describe('Encomendas do cliente (web)', () => {
  beforeEach(() => {
    cy.entrarComoCliente();
    cy.contains('button', 'Encomendas').click();
    cy.location('pathname').should('eq', '/www/parceiro-encomendas.html');
    cy.get('#textLoading', { timeout: 20000 }).should('have.class', 'oculto');
  });

  it('mostra só a opção "Meu Pedido", sem "Venda Cliente"', () => {
    cy.get('.btn-tipo').should('have.length', 1);
    cy.get('.btn-tipo').first().should('have.text', 'Meu Pedido').and('have.class', 'active');
    cy.contains('.btn-tipo', 'Venda Cliente').should('not.exist');
    cy.contains('.btn-tipo', 'Parceiro').should('not.exist');
  });

  it('encomenda sai no nome do cliente logado, que não pode ser alterado', () => {
    cy.get('#btnVerResumo').click();
    cy.get('#nomePedido').should('have.attr', 'readonly');
    cy.window().then((win) => {
      cy.get('#nomePedido').should('have.value', win.localStorage.getItem('usuario_nome'));
    });
  });
});
