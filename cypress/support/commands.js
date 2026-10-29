// ============================================
// CUSTOM COMMANDS
// ============================================

// Login como admin
Cypress.Commands.add('loginAsAdmin', () => {
  cy.fixture('users').then((users) => {
    const admin = users.admin;

    cy.visit('/');
    cy.get('#cpf').type(admin.cpf);
    cy.get('#btnEntrar').click();

    // Esperar modal de senha
    cy.get('#modalSenha', { timeout: 5000 }).should('be.visible');
    cy.get('#inputSenhaAdmin').type(admin.password);
    cy.get('#btnConfirmarSenha').click();

    // Esperar redirecionamento para admin
    cy.url({ timeout: 10000 }).should('include', 'admin.html');
  });
});

// Login como cliente
Cypress.Commands.add('loginAsCliente', () => {
  cy.fixture('users').then((users) => {
    const cliente = users.cliente;

    cy.visit('/');
    cy.get('#cpf').type(cliente.cpf);
    cy.get('#btnEntrar').click();

    // Esperar validação e redirecionamento
    cy.url({ timeout: 10000 }).should('include', 'cliente-painel.html');
  });
});

// Login como parceiro
Cypress.Commands.add('loginAsParceiro', () => {
  cy.fixture('users').then((users) => {
    const parceiro = users.parceiro;

    cy.visit('/');
    cy.get('#cpf').type(parceiro.cpf);
    cy.get('#btnEntrar').click();

    // Esperar validação e redirecionamento
    cy.url({ timeout: 10000 }).should('include', 'parceiro-painel.html');
  });
});

// Grava a sessão direto no localStorage (sem passar pelo login)
// Visita um arquivo estático do mesmo domínio para ter acesso ao storage antes das páginas rodarem
Cypress.Commands.add('loginAs', (tipo) => {
  const sessoes = {
    admin: { usuario_tipo: 'Proprietário', usuario_nome: 'HUGO ROSA', usuario_cpf: '41471613836' },
    cliente: { usuario_tipo: 'Cliente', usuario_nome: 'CLIENTE TESTE', usuario_cpf: '45848884005' },
    parceiro: { usuario_tipo: 'Parceiro', usuario_nome: 'PARCEIRO RATO', usuario_cpf: '99650846026', usuario_saldo: '500.00' },
  };

  cy.visit('/css/style.css');
  cy.window().then((win) => {
    Object.entries(sessoes[tipo]).forEach(([chave, valor]) => win.localStorage.setItem(chave, valor));
  });
});

// Logout
Cypress.Commands.add('logout', () => {
  cy.get('#btnSair').click();
  cy.url().should('include', 'index.html');
  cy.window().then((win) => {
    expect(win.localStorage.getItem('usuario_tipo')).to.be.null;
  });
});

// Verificar se está logado como tipo específico
Cypress.Commands.add('verifyUserType', (userType) => {
  cy.window().then((win) => {
    expect(win.localStorage.getItem('usuario_tipo')).to.equal(userType);
  });
});

// Verificar header profile
Cypress.Commands.add('verifyHeaderProfile', (firstName) => {
  cy.get('#header-nome').should('contain', firstName);
});
