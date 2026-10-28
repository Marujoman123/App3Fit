// ============================================
// ERRORHANDLER.JS - Tratamento de Erros
// ============================================
// Centraliza tratamento de erros com padrão consistente

export const ErrorHandler = {
  // Tipos de erro
  TYPES: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    SUCCESS: 'success',
  },

  // Log para console (desenvolvimento)
  log(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();

    if (data) {
      console.error(`[${timestamp}] ${message}`, data);
    } else {
      console.error(`[${timestamp}] ${message}`);
    }

    // Em produção, enviar para servidor de logging se necessário
    // this.sendToServer(message, data);
  },

  // Mostrar erro amigável ao usuário
  show(message, type = this.TYPES.ERROR) {
    // Usar alert por enquanto (depois substituir por modal amigável)
    if (type === this.TYPES.ERROR) {
      alert(`❌ Erro: ${message}`);
    } else if (type === this.TYPES.WARNING) {
      alert(`⚠️ Aviso: ${message}`);
    } else if (type === this.TYPES.SUCCESS) {
      alert(`✅ Sucesso: ${message}`);
    } else {
      alert(`ℹ️ ${message}`);
    }
  },

  // Toast/notificação rápida (implementar com CSS depois)
  toast(message, duration = 3000) {
    // Criar elemento toast dinamicamente
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 9999;
      animation: slideIn 0.3s ease-in-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, duration);
  },

  // Validar resposta da API
  validateResponse(response, expectedStatus = 'success') {
    if (!response) {
      throw new Error('Resposta vazia da API');
    }

    if (response.status !== expectedStatus) {
      throw new Error(response.message || 'Erro na resposta da API');
    }

    return response;
  },

  // Wrapper para try-catch em async
  async safe(asyncFn) {
    try {
      return await asyncFn();
    } catch (error) {
      this.log('Safe Execution Error:', error);
      throw error;
    }
  },
};

export default ErrorHandler;
