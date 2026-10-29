// ============================================
// E2E SUPPORT
// ============================================

import './commands'

// Limpar localStorage antes de cada teste
beforeEach(() => {
  cy.window().then((win) => {
    win.localStorage.clear();
  });
});
