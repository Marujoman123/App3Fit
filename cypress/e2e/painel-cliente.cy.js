// Teste manual que deu certo: no painel do cliente, "Criar Pedido" abre clientes-pedidos.html.

describe('Painel do cliente (web)', () => {
  beforeEach(() => {
    cy.entrarComoCliente();
  });

  it('botão "Criar Pedido" leva para a página de pedidos do cliente', () => {
    cy.contains('button', 'Criar Pedido').click();

    cy.location('pathname').should('eq', '/www/clientes-pedidos.html');
    cy.contains('h1', 'Novo Pedido').should('be.visible');

    // A página só fica aberta para Cliente; outro tipo seria redirecionado
    cy.get('#textLoading', { timeout: 20000 }).should('have.class', 'oculto');
    cy.location('pathname').should('eq', '/www/clientes-pedidos.html');
  });
});
