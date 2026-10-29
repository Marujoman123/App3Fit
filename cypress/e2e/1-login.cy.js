// ============================================
// LOGIN TESTS - Página index.html
// ============================================

describe('Login Page - index.html', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  // ========== TESTES GERAIS ==========

  describe('CPF Input Formatting', () => {
    it('Should format CPF with mask as user types', () => {
      cy.get('#cpf')
        .type('41471613836')
        .should('have.value', '414.716.138-36');
    });

    it('Should accept max 11 digits', () => {
      cy.get('#cpf')
        .type('414716138361111')
        .should('have.value', '414.716.138-36');
    });

    it('Should remove non-numeric characters', () => {
      cy.get('#cpf')
        .type('414-716.138/36')
        .should('have.value', '414.716.138-36');
    });
  });

  describe('Enter Key Navigation', () => {
    it('Should submit form when Enter is pressed', () => {
      cy.fixture('users').then((users) => {
        const admin = users.admin;

        cy.get('#cpf').type(admin.cpf);
        cy.get('#cpf').type('{enter}');

        // Deve mostrar modal de senha ou erro de validação
        cy.get('#modalSenha, #mensagem-erro').should('exist');
      });
    });
  });

  describe('CPF Validation', () => {
    it('Should show error for invalid CPF', () => {
      cy.get('#cpf').type('000.000.000-00');
      cy.get('#btnEntrar').click();

      cy.get('#mensagem-erro').should('contain', 'CPF válido');
    });

    it('Should show error for incomplete CPF', () => {
      cy.get('#cpf').type('414.716.138');
      cy.get('#btnEntrar').click();

      cy.get('#mensagem-erro').should('be.visible');
    });
  });

  // ========== ADMIN LOGIN ==========

  describe('Admin Login - ADMINISTRADOR', () => {
    it('Should show password modal for admin CPF', () => {
      cy.fixture('users').then((users) => {
        const admin = users.admin;

        cy.get('#cpf').type(admin.cpf);
        cy.get('#btnEntrar').click();

        cy.get('#modalSenha').should('be.visible');
        cy.get('h3').should('contain', 'Senha Administrativa');
      });
    });

    it('Should redirect to admin.html with correct password', () => {
      cy.fixture('users').then((users) => {
        const admin = users.admin;

        cy.get('#cpf').type(admin.cpf);
        cy.get('#btnEntrar').click();

        cy.get('#inputSenhaAdmin').type(admin.password);
        cy.get('#btnConfirmarSenha').click();

        cy.url().should('include', 'admin.html');
        cy.verifyUserType('Proprietário');
      });
    });

    it('Should show error for wrong password', () => {
      cy.fixture('users').then((users) => {
        const admin = users.admin;

        cy.get('#cpf').type(admin.cpf);
        cy.get('#btnEntrar').click();

        cy.get('#inputSenhaAdmin').type('0000');
        cy.get('#btnConfirmarSenha').click();

        // Deve permanecer no modal
        cy.get('#modalSenha').should('be.visible');
      });
    });

    it('Should clear password field after wrong attempt', () => {
      cy.fixture('users').then((users) => {
        const admin = users.admin;

        cy.get('#cpf').type(admin.cpf);
        cy.get('#btnEntrar').click();

        cy.get('#inputSenhaAdmin').type('0000');
        cy.get('#btnConfirmarSenha').click();

        cy.get('#inputSenhaAdmin').should('have.value', '');
      });
    });

    it('Should close modal when clicking cancel', () => {
      cy.fixture('users').then((users) => {
        const admin = users.admin;

        cy.get('#cpf').type(admin.cpf);
        cy.get('#btnEntrar').click();

        cy.get('#modalSenha').should('be.visible');
        cy.get('#btnCancelarSenha').click();

        cy.get('#modalSenha').should('not.be.visible');
        cy.get('#cpf').should('have.focus');
      });
    });
  });

  // ========== CLIENTE LOGIN ==========

  describe('Client Login - CLIENTE', () => {
    it('Should redirect to cliente-painel.html', () => {
      cy.loginAsCliente();
      cy.url().should('include', 'cliente-painel.html');
      cy.verifyUserType('Cliente');
    });

    it('Should store user data in localStorage', () => {
      cy.fixture('users').then((users) => {
        const cliente = users.cliente;

        cy.loginAsCliente();

        cy.window().then((win) => {
          expect(win.localStorage.getItem('usuario_tipo')).to.equal('Cliente');
          expect(win.localStorage.getItem('usuario_cpf')).to.equal(cliente.cpfClean);
        });
      });
    });
  });

  // ========== PARCEIRO LOGIN ==========

  describe('Partner Login - PARCEIRO', () => {
    it('Should redirect to parceiro-painel.html', () => {
      cy.loginAsParceiro();
      cy.url().should('include', 'parceiro-painel.html');
      cy.verifyUserType('Parceiro');
    });

    it('Should store partner balance in localStorage', () => {
      cy.fixture('users').then((users) => {
        const parceiro = users.parceiro;

        cy.loginAsParceiro();

        cy.window().then((win) => {
          expect(win.localStorage.getItem('usuario_tipo')).to.equal('Parceiro');
          expect(win.localStorage.getItem('usuario_saldo')).to.exist;
        });
      });
    });
  });

  // ========== CAMPO OBRIGATÓRIO ==========

  describe('Required Fields', () => {
    it('Should clear localStorage on page load', () => {
      // Simular dados prévios
      cy.window().then((win) => {
        win.localStorage.setItem('usuario_cpf', '12345678901');
      });

      cy.reload();

      cy.window().then((win) => {
        expect(win.localStorage.getItem('usuario_cpf')).to.be.null;
      });
    });

    it('Should focus on CPF input on load', () => {
      cy.get('#cpf').should('have.focus');
    });
  });
});
