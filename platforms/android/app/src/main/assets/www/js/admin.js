import CONFIG from './config.js';
import Router from './router.js';
import { exigirAcesso } from './acesso.js';

if (exigirAcesso([CONFIG.USER_TYPES.PROPRIETARIO])) {
  document.querySelectorAll('[data-destino]').forEach(btn => {
    btn.addEventListener('click', () => Router.navigate(btn.dataset.destino));
  });
  document.getElementById('btnSair').addEventListener('click', () => Router.logout());
}
