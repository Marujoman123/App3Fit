import CONFIG from './config.js';
import Storage from './storage.js';
import iniciarPedidoManual from './pedido-manual.js';

// Cliente só encomenda para si mesmo, com preço de cliente (sem "Venda Cliente" nem preço de parceiro)
if (Storage.getUserType() === CONFIG.USER_TYPES.CLIENTE) {
  document.querySelector('.tipo-cliente').innerHTML =
    '<button class="btn-tipo active" data-tipo="Cliente" data-nome="usuario">Meu Pedido</button>';
}

iniciarPedidoManual({ fonte: 'encomenda', titulo: 'ENCOMENDA', prefixo: 'Encomenda' });
