// ============================================
// PEDIDOS CLIENTE E PARCEIRO
// clientes-pedidos.html (dono: CLIENTE)
// parceiro-pedidos.html (dono: PARCEIRO)
// Lê produtos da planilha real; não grava nada nela.
// ============================================

const esperarProdutos = () => {
  cy.get('#textLoading', { timeout: 20000 }).should('have.class', 'oculto');
  cy.get('#listaSelecaoManual .item-selecao').should('have.length.greaterThan', 0);
};

const adicionarPrimeiroDisponivel = () => {
  cy.get('#listaSelecaoManual .item-selecao:not(.item-esgotado)').first().click();
};

describe('Pedido do Cliente - clientes-pedidos.html', () => {

  describe('Controle de acesso', () => {
    it('Sem login: redireciona para index.html', () => {
      cy.visit('/clientes-pedidos.html');
      cy.url().should('include', 'index.html');
    });

    it('PARCEIRO: é levado para o próprio painel', () => {
      cy.loginAs('parceiro');
      cy.visit('/clientes-pedidos.html');
      cy.url().should('include', 'parceiro-painel.html');
    });

    it('ADMIN: é levado para o admin', () => {
      cy.loginAs('admin');
      cy.visit('/clientes-pedidos.html');
      cy.url().should('include', 'admin.html');
    });
  });

  describe('CLIENTE', () => {
    beforeEach(() => {
      cy.loginAs('cliente');
      cy.visit('/clientes-pedidos.html');
      esperarProdutos();
    });

    it('Nome vem travado com o cliente logado', () => {
      cy.get('#btnVerResumo').click();
      cy.get('#nomePedido').should('have.value', 'CLIENTE TESTE').and('have.attr', 'readonly');
    });

    it('Adicionar e remover produto atualiza o carrinho', () => {
      adicionarPrimeiroDisponivel();
      cy.get('#countItens').should('have.text', '1');

      cy.get('#btnVerResumo').click();
      cy.get('#resumoPedido .btn-remover').first().click();
      cy.get('#countItens').should('have.text', '0');
    });

    it('Limpar pedido zera o carrinho', () => {
      cy.on('window:confirm', () => true);
      adicionarPrimeiroDisponivel();
      cy.get('#btnVerResumo').click();
      cy.get('#btnLimparPedido').click();
      cy.get('#countItens').should('have.text', '0');
    });

    it('Gerar PDF sem itens não avança e avisa', () => {
      const alertas = [];
      cy.on('window:alert', (txt) => alertas.push(txt));

      cy.get('#btnVerResumo').click();
      cy.get('#btnGerarPDF').click();

      cy.wrap(null).should(() => expect(alertas.join(' ')).to.contain('vazio'));
    });

    it('Não existe botão de verificar saldo de parceiro', () => {
      cy.get('#btnBuscarParceiro').should('not.exist');
    });
  });
});

describe('Pedido do Parceiro - parceiro-pedidos.html', () => {

  describe('Controle de acesso', () => {
    it('Sem login: redireciona para index.html', () => {
      cy.visit('/parceiro-pedidos.html');
      cy.url().should('include', 'index.html');
    });

    it('CLIENTE: é levado para o próprio painel', () => {
      cy.loginAs('cliente');
      cy.visit('/parceiro-pedidos.html');
      cy.url().should('include', 'cliente-painel.html');
    });

    it('ADMIN: é levado para o admin', () => {
      cy.loginAs('admin');
      cy.visit('/parceiro-pedidos.html');
      cy.url().should('include', 'admin.html');
    });
  });

  describe('PARCEIRO', () => {
    beforeEach(() => {
      cy.loginAs('parceiro');
      cy.visit('/parceiro-pedidos.html');
      esperarProdutos();
    });

    it('"Venda Cliente" começa ativo e deixa digitar o nome', () => {
      cy.get('.btn-tipo.active').should('contain', 'Venda Cliente');
      cy.get('#btnVerResumo').click();
      cy.get('#nomePedido').should('have.value', '').and('not.have.attr', 'readonly');
    });

    it('"Meu Pedido (Parceiro)" trava o nome com o parceiro logado', () => {
      cy.get('.btn-tipo').contains('Meu Pedido (Parceiro)').click();
      cy.get('.btn-tipo').contains('Meu Pedido (Parceiro)').should('have.class', 'active');
      cy.get('#btnVerResumo').click();
      cy.get('#nomePedido').should('have.value', 'PARCEIRO RATO').and('have.attr', 'readonly');
    });

    it('Trocar o tipo mantém os itens no carrinho', () => {
      adicionarPrimeiroDisponivel();
      cy.get('.btn-tipo').contains('Meu Pedido (Parceiro)').click();
      cy.get('#countItens').should('have.text', '1');
    });

    it('Não existe botão de verificar saldo de parceiro', () => {
      cy.get('#btnBuscarParceiro').should('not.exist');
    });
  });
});
