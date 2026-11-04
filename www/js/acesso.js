import Storage from './storage.js';
import Router from './router.js';

// Sem login → tela de login. Tipo fora de `donos` → início do próprio usuário.
// `donos` nulo = qualquer usuário logado.
export function exigirAcesso(donos = null) {
  const tipo = Storage.getUserType();
  if (!tipo) {
    Router.backToLogin();
    return false;
  }
  if (donos && !donos.includes(tipo)) {
    Router.backToPanel();
    return false;
  }
  return true;
}
