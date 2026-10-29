// ============================================
// ADMIN PEDIDOS - admin-pedidos.html
// Lê produtos e cupons da planilha real; não grava nada nela.
// ============================================

describe('Criar Pedido - admin-pedidos.html', () => {

  // ========== CONTROLE DE ACESSO ==========

  describe('Controle de acesso', () => {
    it('Sem login: redireciona para index.html', () => {
      cy.visit('/admin-pedidos.html');
      cy.url().should('include', 'index.html');
    });

    it('CLIENTE: é levado para o próprio painel', () => {
      cy.loginAs('cliente');
      cy.visit('/admin-pedidos.html');
      cy.url().should('include', 'cliente-painel.html');
    });

    it('PARCEIRO: é levado para o próprio painel', () => {
      cy.loginAs('parceiro');
      cy.visit('/admin-pedidos.html');
      cy.url().should('include', 'parceiro-painel.html');
    });
  });

  // ========== ADMINISTRADOR ==========

  describe('ADMINISTRADOR', () => {
    beforeEach(() => {
      cy.loginAs('admin');
      cy.visit('/admin-pedidos.html');
      cy.get('#textLoading', { timeout: 20000 }).should('have.class', 'oculto');
      cy.get('#listaSelecaoManual .item-selecao').should('have.length.greaterThan', 0);
    });

    const adicionarPrimeiroDisponivel = () => {
      cy.get('#listaSelecaoManual .item-selecao:not(.item-esgotado)').first().click();
    };

    it('Carrega a lista de produtos da planilha', () => {
      cy.get('#listaSelecaoManual .item-selecao').its('length').should('be.gt', 0);
    });

    it('Botão "Cliente Comum" começa ativo', () => {
      cy.get('#btnCli').should('have.class', 'active');
    });

    it('Trocar tipo marca o botão selecionado', () => {
      cy.get('#btnPar').click();
      cy.get('#btnPar').should('have.class', 'active');
      cy.get('#btnCli').should('not.have.class', 'active');
    });

    it('Botão de verificar cupom só aparece para Parceiro', () => {
      cy.get('#btnVerResumo').click();
      cy.get('#btnBuscarParceiro').should('not.be.visible');
      cy.get('#btnFecharResumo').click();

      cy.get('#btnPar').click();
      cy.get('#btnVerResumo').click();
      cy.get('#btnBuscarParceiro').should('be.visible');
    });

    it('Retirada preenche e trava o nome com o admin logado', () => {
      cy.get('#btnRet').click();
      cy.get('#nomePedido').should('have.value', 'HUGO ROSA').and('have.attr', 'readonly');
    });

    it('Voltar a Cliente destrava o campo de nome', () => {
      cy.get('#btnRet').click();
      cy.get('#btnCli').click();
      cy.get('#nomePedido').should('have.value', '').and('not.have.attr', 'readonly');
    });

    it('Adicionar produto atualiza contador, total e estoque', () => {
      cy.get('#listaSelecaoManual .item-selecao:not(.item-esgotado)').first().as('produto');
      cy.get('@produto').find('.badge-estoque').invoke('text').then((txt) => {
        const estoqueAntes = parseInt(txt, 10);

        cy.get('@produto').click();

        cy.get('#countItens').should('have.text', '1');
        cy.get('#totalPedido').should('contain', 'Total: R$');
        cy.get('@produto').find('.badge-estoque').should('have.text', String(estoqueAntes - 1));
      });
    });

    it('Remover item devolve o estoque e zera o carrinho', () => {
      adicionarPrimeiroDisponivel();
      cy.get('#btnVerResumo').click();
      cy.get('#resumoPedido .btn-remover').first().click();

      cy.get('#countItens').should('have.text', '0');
      cy.get('#resumoPedido').should('be.empty');
    });

    it('Produto esgotado não pode ser adicionado', () => {
      cy.get('body').then(($body) => {
        const esgotados = $body.find('#listaSelecaoManual .item-esgotado');
        if (esgotados.length === 0) {
          cy.log('Nenhum produto esgotado na planilha agora - teste pulado');
          return;
        }
        cy.wrap(esgotados.first()).click({ force: true });
        cy.get('#countItens').should('have.text', '0');
      });
    });

    it('Limpar pedido zera o carrinho', () => {
      cy.on('window:confirm', () => true);
      adicionarPrimeiroDisponivel();
      cy.get('#btnVerResumo').click();
      cy.get('#btnLimparPedido').click();

      cy.get('#countItens').should('have.text', '0');
      cy.get('#nomePedido').should('have.value', '');
    });

    it('Gerar PDF sem nome destaca o campo e não avança', () => {
      const alertas = [];
      cy.on('window:alert', (txt) => alertas.push(txt));

      adicionarPrimeiroDisponivel();
      cy.get('#btnVerResumo').click();
      cy.get('#btnGerarPDF').click();

      cy.get('#nomePedido').should('have.class', 'input-erro');
      cy.wrap(null).then(() => expect(alertas.join(' ')).to.contain('nome do cliente'));
    });

    it('Realizar venda com carrinho vazio mostra aviso e não avança', () => {
      const alertas = [];
      cy.on('window:alert', (txt) => alertas.push(txt));

      cy.get('#btnVerResumo').click();
      cy.get('#nomePedido').type('CLIENTE CYPRESS');
      cy.get('#btnRealizarVenda').click();

      cy.wrap(null).then(() => expect(alertas.join(' ')).to.contain('vazio'));
      cy.url().should('include', 'admin-pedidos.html');
    });

    it('Realizar venda grava o pedido no localStorage e vai para pagamento', () => {
      adicionarPrimeiroDisponivel();
      cy.get('#btnVerResumo').click();
      cy.get('#nomePedido').type('CLIENTE CYPRESS');
      cy.get('#btnRealizarVenda').click();

      cy.url().should('include', 'pagamento.html');
      cy.window().then((win) => {
        const carrinho = JSON.parse(win.localStorage.getItem('carrinho'));
        expect(carrinho).to.have.length(1);
        expect(carrinho[0].quantidade).to.equal(1);
        expect(win.localStorage.getItem('usuario_nome')).to.equal('CLIENTE CYPRESS');
        expect(win.localStorage.getItem('usuario_tipo')).to.equal('Cliente');
        expect(win.localStorage.getItem('modo_pagamento_manual')).to.equal('true');
        expect(win.localStorage.getItem('travar_cupom')).to.be.null;
        expect(parseFloat(win.localStorage.getItem('total_venda'))).to.be.gt(0);
      });
    });

    it('Retirada grava tipo Retirada e trava cupom', () => {
      cy.get('#btnRet').click();
      adicionarPrimeiroDisponivel();
      cy.get('#btnVerResumo').click();
      cy.get('#btnRealizarVenda').click();

      cy.url().should('include', 'pagamento.html');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('usuario_tipo')).to.equal('Retirada');
        expect(win.localStorage.getItem('travar_cupom')).to.equal('true');
      });
    });

    it('Cupom inválido mostra "Cupom não encontrado"', () => {
      const alertas = [];
      cy.on('window:alert', (txt) => alertas.push(txt));

      cy.get('#btnPar').click();
      cy.get('#btnVerResumo').click();
      cy.get('#nomePedido').type('CUPOM-INEXISTENTE-XYZ');
      cy.get('#btnBuscarParceiro').click();

      cy.wrap(null).should(() => expect(alertas.join(' ')).to.contain('Cupom não encontrado'));
    });

    it('Cupom válido preenche o nome do parceiro', () => {
      cy.fixture('users').then((users) => {
        cy.on('window:alert', () => {});

        cy.get('#btnPar').click();
        cy.get('#btnVerResumo').click();
        cy.get('#nomePedido').type(users.parceiro.coupon);
        cy.get('#btnBuscarParceiro').click();

        cy.get('#nomePedido').should('not.have.value', users.parceiro.coupon);
        cy.get('#nomePedido').invoke('val').should('not.be.empty');
      });
    });

    it('Trocar de tipo mantém os itens no carrinho', () => {
      adicionarPrimeiroDisponivel();
      cy.get('#btnPar').click();
      cy.get('#btnRet').click();
      cy.get('#btnCli').click();

      cy.get('#countItens').should('have.text', '1');
    });
  });
});
