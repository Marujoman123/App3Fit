import CONFIG from './config.js';
import iniciarPedidoManual from './pedido-manual.js';

iniciarPedidoManual({ donos: [CONFIG.USER_TYPES.PARCEIRO] });
