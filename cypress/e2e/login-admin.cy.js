// Login web de administrador: CPF reconhecido na aba "Admins", senha conferida no Apps Script,
// e o site leva ao painel administrativo. CPF e senha de teste ficam no cypress.env.json.

describe('Login do administrador (web)', () => {
  it('admin com senha correta entra no painel administrativo', () => {
    cy.entrarComoAdmin();

    cy.contains('h1', 'Painel Administrativo').should('be.visible');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('usuario_tipo')).to.eq('Proprietário');
      expect(win.localStorage.getItem('usuario_cpf')).to.eq(Cypress.env('ADMIN_TESTE_CPF'));
    });

    // A página do admin não pode ter redirecionado de volta
    cy.location('pathname').should('eq', '/www/admin.html');
  });
});
