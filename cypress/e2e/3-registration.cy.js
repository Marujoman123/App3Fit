// ============================================
// REGISTRATION TESTS - cadastro.html
// ============================================

describe('Registration Page - cadastro.html', () => {

  beforeEach(() => {
    // Acessar página de registro via login com CPF não registrado
    cy.fixture('users').then((users) => {
      const cliente = users.cliente;

      cy.visit('/');
      cy.get('#cpf').type(cliente.cpf);
      cy.get('#btnEntrar').click();

      // Deve redirecionar para cadastro
      cy.url({ timeout: 10000 }).should('include', 'cadastro.html');
    });
  });

  // ========== FORM FORMATTING ==========

  describe('Form Input Formatting', () => {
    it('Should pre-fill CPF from URL parameter', () => {
      cy.fixture('users').then((users) => {
        const cliente = users.cliente;

        cy.visit(`/cadastro.html?cpf=${cliente.cpfClean}`);
        cy.get('#cadCpf').should('have.value', cliente.cpf);
      });
    });

    it('Should format phone number as user types', () => {
      cy.get('#cadTelefone')
        .type('11999999999')
        .should('have.value', '(11) 99999-9999');
    });

    it('Should convert name to uppercase', () => {
      cy.get('#cadNome')
        .type('joão silva')
        .blur();

      // HTML tem oninput uppercase
      cy.get('#cadNome').should('have.value', 'JOÃO SILVA');
    });
  });

  // ========== KEYBOARD NAVIGATION ==========

  describe('Keyboard Navigation', () => {
    it('Should navigate CPF -> Name with Enter', () => {
      cy.fixture('users').then((users) => {
        const cliente = users.cliente;

        cy.get('#cadCpf').type(cliente.cpf);
        cy.get('#cadCpf').type('{enter}');

        cy.get('#cadNome').should('have.focus');
      });
    });

    it('Should navigate Name -> Phone with Enter', () => {
      cy.fixture('users').then((users) => {
        const cliente = users.cliente;

        cy.visit(`/cadastro.html?cpf=${cliente.cpfClean}`);
        cy.get('#cadNome').focus();
        cy.get('#cadNome').type('JOÃO SILVA{enter}');

        cy.get('#cadTelefone').should('have.focus');
      });
    });

    it('Should submit form when Enter pressed on phone field', () => {
      cy.fixture('users').then((users) => {
        const cliente = users.cliente;

        cy.visit(`/cadastro.html?cpf=${cliente.cpfClean}`);
        cy.get('#cadNome').focus().type('JOÃO SILVA');
        cy.get('#cadTelefone').focus().type(cliente.phone);
        cy.get('#cadTelefone').type('{enter}');

        // Button deve estar em estado de "Salvando..."
        cy.get('#btnSalvar').should('be.disabled');
      });
    });
  });

  // ========== VALIDATION ==========

  describe('Form Validation', () => {
    it('Should require all fields', () => {
      cy.fixture('users').then((users) => {
        const cliente = users.cliente;

        cy.visit(`/cadastro.html?cpf=${cliente.cpfClean}`);

        // Tentar salvar sem nome
        cy.get('#btnSalvar').click();

        // Deve mostrar erro
        cy.window().then((win) => {
          cy.stub(win, 'alert');
        });
      });
    });

    it('Should not allow registration without phone', () => {
      cy.fixture('users').then((users) => {
        const cliente = users.cliente;

        cy.visit(`/cadastro.html?cpf=${cliente.cpfClean}`);
        cy.get('#cadNome').type('JOÃO SILVA');
        // Não preencher telefone
        cy.get('#btnSalvar').click();

        // Deve permanecer na página
        cy.url().should('include', 'cadastro.html');
      });
    });
  });

  // ========== SUCCESSFUL REGISTRATION ==========

  describe('Successful Registration - CLIENTE', () => {
    it('Should register new client', () => {
      cy.fixture('users').then((users) => {
        const cliente = users.cliente;

        cy.visit(`/cadastro.html?cpf=${cliente.cpfClean}`);
        cy.get('#cadNome').type(cliente.name);
        cy.get('#cadTelefone').type(cliente.phone);

        cy.get('#btnSalvar').click();

        // Deve salvar e redirecionar
        cy.url({ timeout: 10000 }).should('include', 'caixa.html');

        // Verificar se dados foram salvos em localStorage
        cy.window().then((win) => {
          expect(win.localStorage.getItem('usuario_tipo')).to.equal('Cliente');
          expect(win.localStorage.getItem('usuario_nome')).to.equal(cliente.name);
        });
      });
    });

    it('Should disable button while saving', () => {
      cy.fixture('users').then((users) => {
        const cliente = users.cliente;

        cy.visit(`/cadastro.html?cpf=${cliente.cpfClean}`);
        cy.get('#cadNome').type(cliente.name);
        cy.get('#cadTelefone').type(cliente.phone);

        cy.get('#btnSalvar').click();
        cy.get('#btnSalvar').should('be.disabled');
      });
    });
  });

  // ========== BACK BUTTON ==========

  describe('Back Button', () => {
    it('Should redirect to login when clicking back', () => {
      cy.get('button').contains('Voltar').click();
      cy.url().should('include', 'index.html');
    });
  });
});
