// Parceiro entra na página de encomendas pelo painel e vê as duas opções de saída.

describe('Encomendas do parceiro (web)', () => {
  beforeEach(() => {
    cy.entrarComoParceiro();
    cy.contains('button', 'Encomendas').click();
  });

  it('botão "Encomendas" abre a página de encomendas e carrega os produtos', () => {
    cy.location('pathname').should('eq', '/www/parceiro-encomendas.html');
    cy.contains('h1', 'Nova Encomenda').should('be.visible');

    cy.get('#textLoading', { timeout: 20000 }).should('have.class', 'oculto');
    cy.get('#listaSelecaoManual .item-selecao').should('have.length.greaterThan', 0);

    // A página não pode ter mandado o parceiro de volta
    cy.location('pathname').should('eq', '/www/parceiro-encomendas.html');
  });

  it('parceiro vê "Venda Cliente" (ativa) e "Meu Pedido (Parceiro)"', () => {
    cy.get('.btn-tipo').should('have.length', 2);
    cy.contains('.btn-tipo', 'Venda Cliente').should('have.class', 'active');
    cy.contains('.btn-tipo', 'Meu Pedido (Parceiro)').should('not.have.class', 'active');
  });
});
