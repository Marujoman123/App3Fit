// ============================================
// ROUTER.JS - Navegação Centralizada
// ============================================
// Centraliza toda lógica de navegação
// Sem window.location.href espalhado no código

import CONFIG from './config.js';
import Storage from './storage.js';

export const Router = {
  // Navegar para página
  navigate(page, params = {}) {
    let url = page;

    // Se for referência no CONFIG.PAGES, usar o valor
    if (CONFIG.PAGES[page]) {
      url = CONFIG.PAGES[page];
    }

    // Adicionar parâmetros na query string
    if (Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      url = `${url}?${queryString}`;
    }

    window.location.href = url;
  },

  // Voltar para painel do usuário (baseado no tipo)
  backToPanel() {
    const userType = Storage.getUserType();
    const origin = Storage.getOrigin();
    const isExternal = origin === 'externo';

    if (userType === CONFIG.USER_TYPES.PARCEIRO) {
      const page = isExternal ? '../parceiro-painel.html' : 'parceiro-painel.html';
      this.navigate(page);
    } else if (userType === CONFIG.USER_TYPES.CLIENTE) {
      const page = isExternal ? '../cliente-painel.html' : 'cliente-painel.html';
      this.navigate(page);
    } else {
      // Admin ou outros
      this.navigate('admin.html');
    }
  },

  // Voltar para login
  backToLogin() {
    const origin = Storage.getOrigin();
    const page = origin === 'externo' ? '../index.html' : 'index.html';
    this.navigate(page);
  },

  // Fazer logout e voltar para login
  logout() {
    Storage.clearUserData();
    this.backToLogin();
  },

  // Recarregar página
  reload() {
    window.location.reload();
  },

  // Voltar para página anterior
  back() {
    window.history.back();
  },

  // Navegar para cadastro
  goToRegistration(cpf = '') {
    const params = cpf ? { cpf } : {};
    this.navigate(CONFIG.PAGES.CADASTRO, params);
  },

  // Navegar para admin
  goToAdmin() {
    this.navigate(CONFIG.PAGES.ADMIN);
  },

  // Navegar para painel de cliente
  goToClientPanel() {
    this.navigate(CONFIG.PAGES.CLIENTE_PAINEL);
  },

  // Navegar para painel de parceiro
  goToPartnerPanel() {
    this.navigate(CONFIG.PAGES.PARCEIRO_PAINEL);
  },

  // Obter parâmetro da query string
  getParam(paramName) {
    const params = new URLSearchParams(window.location.search);
    return params.get(paramName);
  },

  // Obter todos os parâmetros
  getAllParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (let [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  },

  // Verificar se está em página específica
  isOnPage(pageName) {
    const currentPage = window.location.pathname.split('/').pop();
    return currentPage === pageName || currentPage === CONFIG.PAGES[pageName];
  },
};

export default Router;
