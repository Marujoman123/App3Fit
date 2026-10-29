import CONFIG from './config.js';
import Storage from './storage.js';

// Caminhos relativos à raiz (os painéis ficam na raiz do site)
const LOGIN = 'index.html';
const PAINEL_POR_TIPO = {
  [CONFIG.USER_TYPES.CLIENTE]: 'cliente-painel.html',
  [CONFIG.USER_TYPES.PARCEIRO]: 'parceiro-painel.html',
  [CONFIG.USER_TYPES.PROPRIETARIO]: 'www/admin.html',
};

export default function iniciarPainel({ donos }) {
  const tipo = Storage.getUserType();

  if (!tipo) {
    window.location.href = LOGIN;
    return;
  }
  if (!donos.includes(tipo)) {
    window.location.href = PAINEL_POR_TIPO[tipo] || LOGIN;
    return;
  }

  document.querySelectorAll('[data-destino]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = btn.dataset.destino;
    });
  });

  document.getElementById('btnSair').addEventListener('click', () => {
    Storage.clearUserData();
    window.location.href = LOGIN;
  });
}
