// ============================================
// ENCOMENDAS - parceiro-encomendas.html
// Qualquer usuário logado pode abrir. Sem limite de estoque.
// Lê produtos da planilha real; não grava nada nela.
// ============================================

const esperarProdutos = () => {
  cy.get('#textLoading', { timeout: 20000 }).should('have.class', 'oculto');
  cy.get('#listaSelecaoManual .item-selecao').should('have.length.greaterThan', 0);
};

describe('Encomendas - parceiro-encomendas.html', () => {

  describe('Acesso', () => {
    it('Sem login: redireciona para index.html', () => {
      cy.visit('/parceiro-encomendas.html');
      cy.url().should('include', 'index.html');
    });

    ['cliente', 'parceiro', 'admin'].forEach((tipo) => {
      it(`${tipo.toUpperCase()} logado consegue abrir a página`, () => {
        cy.loginAs(tipo);
        cy.visit('/parceiro-encomendas.html');
        cy.url().should('include', 'parceiro-encomendas.html');
        esperarProdutos();
      });
    });
  });

  describe('Comportamento da encomenda', () => {
    beforeEach(() => {
      cy.loginAs('parceiro');
      cy.visit('/parceiro-encomendas.html');
      esperarProdutos();
    });

    it('"Venda Cliente" começa ativo e deixa digitar o nome', () => {
      cy.get('.btn-tipo.active').should('contain', 'Venda Cliente');
      cy.get('#btnVerResumo').click();
      cy.get('#nomePedido').should('have.value', '').and('not.have.attr', 'readonly');
    });

    it('"Meu Pedido (Parceiro)" trava o nome com o parceiro logado', () => {
      cy.get('.btn-tipo').contains('Meu Pedido (Parceiro)').click();
      cy.get('#btnVerResumo').click();
      cy.get('#nomePedido').should('have.value', 'PARCEIRO RATO').and('have.attr', 'readonly');
    });

    it('Adicionar aumenta a contagem sem limite de estoque', () => {
      cy.get('#listaSelecaoManual .item-selecao').first().as('produto');
      cy.get('@produto').find('.badge-estoque').invoke('text').then((txt) => {
        const antes = parseInt(txt, 10);
        cy.get('@produto').click();
        cy.get('@produto').click();
        cy.get('@produto').find('.badge-estoque').should('have.text', String(antes + 2));
        cy.get('#countItens').should('have.text', '2');
      });
    });

    it('Produto com contagem acima de zero fica com a bolinha verde', () => {
      cy.get('#listaSelecaoManual .item-selecao').first().click();
      cy.get('#listaSelecaoManual .item-selecao').first().find('.badge-estoque')
        .should('have.class', 'badge-ativo');
    });

    it('Remover item diminui a contagem', () => {
      cy.get('#listaSelecaoManual .item-selecao').first().click();
      cy.get('#btnVerResumo').click();
      cy.get('#resumoPedido .btn-remover').first().click();
      cy.get('#countItens').should('have.text', '0');
    });

    it('Limpar zera a encomenda', () => {
      cy.on('window:confirm', () => true);
      cy.get('#listaSelecaoManual .item-selecao').first().click();
      cy.get('#btnVerResumo').click();
      cy.get('#btnLimparPedido').click();
      cy.get('#countItens').should('have.text', '0');
      cy.get('#listaSelecaoManual .badge-estoque').each(($b) => {
        expect($b.text().trim()).to.equal('0');
      });
    });

    it('Não existe botão de verificar saldo de parceiro', () => {
      cy.get('#btnBuscarParceiro').should('not.exist');
    });
  });
});
