// ============================================
// ROUTER.JS - Navegação Centralizada
// ============================================
// Centraliza toda lógica de navegação
// Sem window.location.href espalhado no código

import CONFIG from './config.js';
import Storage from './storage.js';

const Router = {
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

  // Voltar para o "início" do usuário.
  // Cordova (interno): o app é um caixa autônomo, então o início é sempre o caixa.
  // Web (externo): painéis de cliente/parceiro ficam na raiz do site; admin fica em www.
  backToPanel() {
    if (Storage.getOrigin() !== 'externo') {
      this.navigate('caixa.html');
      return;
    }

    const userType = Storage.getUserType();
    if (userType === CONFIG.USER_TYPES.PARCEIRO) {
      this.navigate('../parceiro-painel.html');
    } else if (userType === CONFIG.USER_TYPES.CLIENTE) {
      this.navigate('../cliente-painel.html');
    } else {
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
