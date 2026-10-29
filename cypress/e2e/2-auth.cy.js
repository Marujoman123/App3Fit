// ============================================
// AUTH & HEADER TESTS
// ============================================

describe('Authentication & Header', () => {

  // ========== ADMIN HEADER ==========

  describe('Admin Header Profile - ADMINISTRADOR', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
    });

    it('Should display admin name in header', () => {
      cy.verifyHeaderProfile('HUGO');
    });

    it('Should NOT show balance for admin', () => {
      cy.get('#header-saldo').should('not.be.visible');
    });

    it('Should have logout button', () => {
      cy.get('#btnSair').should('exist').and('be.visible');
    });

    it('Should logout when clicking exit button', () => {
      cy.get('#btnSair').click();
      cy.url().should('include', 'index.html');
    });
  });

  // ========== CLIENTE HEADER ==========

  describe('Client Header Profile - CLIENTE', () => {
    beforeEach(() => {
      cy.loginAsCliente();
    });

    it('Should display client name in header', () => {
      cy.verifyHeaderProfile('CLIENTE');
    });

    it('Should NOT show balance for client', () => {
      cy.get('#header-saldo').should('not.be.visible');
    });
  });

  // ========== PARCEIRO HEADER ==========

  describe('Partner Header Profile - PARCEIRO', () => {
    beforeEach(() => {
      cy.loginAsParceiro();
    });

    it('Should display partner name in header', () => {
      cy.verifyHeaderProfile('PARCEIRO');
    });

    it('Should show balance for partner', () => {
      cy.get('#header-saldo').should('be.visible');
      cy.get('#header-saldo').should('contain', 'Saldo: R$');
    });
  });

  // ========== SESSION TIMEOUT ==========

  describe('Inactivity Timeout', () => {
    it('Admin should be logged out after 3 minutes of inactivity', () => {
      cy.loginAsAdmin();

      // Avançar tempo em 3 minutos + 1 segundo
      cy.clock();
      cy.tick(180001);

      // Deve voltar para login
      cy.url().should('include', 'index.html');
    });

    it('Should reset timeout on user activity', () => {
      cy.loginAsAdmin();
      cy.clock();

      // Avançar 2 minutos (menos que timeout)
      cy.tick(120000);

      // Simular atividade (movimento do mouse)
      cy.get('body').trigger('mousemove');

      // Avançar mais 2 minutos (total 4, mas timeout foi resetado)
      cy.tick(120000);

      // Ainda deve estar logado
      cy.url().should('include', 'admin.html');
    });
  });

  // ========== PAGE PROTECTION ==========

  describe('Page Protection - Redirect to login if not authenticated', () => {
    it('Should redirect to login if accessing admin without auth', () => {
      cy.visit('/admin.html');
      cy.url().should('include', 'index.html');
    });

    it('Should redirect to login if accessing cliente-painel without auth', () => {
      cy.visit('/cliente-painel.html');
      cy.url().should('include', 'index.html');
    });

    it('Should redirect to login if accessing parceiro-painel without auth', () => {
      cy.visit('/parceiro-painel.html');
      cy.url().should('include', 'index.html');
    });
  });

  // ========== LOGOUT ==========

  describe('Logout Functionality', () => {
    it('Should clear localStorage on logout', () => {
      cy.loginAsAdmin();
      cy.logout();

      cy.window().then((win) => {
        expect(win.localStorage.getItem('usuario_tipo')).to.be.null;
        expect(win.localStorage.getItem('usuario_nome')).to.be.null;
      });
    });

    it('Should redirect to login on logout', () => {
      cy.loginAsAdmin();
      cy.logout();

      cy.url().should('include', 'index.html');
    });
  });
});
