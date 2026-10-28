// ============================================
// STORAGE.JS - Abstração do localStorage
// ============================================
// Centraliza TODOS os acessos ao localStorage
// Sem "strings mágicas" espalhadas no código

export const Storage = {
  // -------- USUÁRIO --------
  setUserType(tipo) {
    localStorage.setItem('usuario_tipo', tipo);
  },

  getUserType() {
    return localStorage.getItem('usuario_tipo');
  },

  setUserName(nome) {
    localStorage.setItem('usuario_nome', nome);
  },

  getUserName() {
    return localStorage.getItem('usuario_nome');
  },

  setUserCPF(cpf) {
    localStorage.setItem('usuario_cpf', cpf);
  },

  getUserCPF() {
    return localStorage.getItem('usuario_cpf');
  },

  setUserBalance(saldo) {
    localStorage.setItem('usuario_saldo', saldo);
  },

  getUserBalance() {
    return parseFloat(localStorage.getItem('usuario_saldo')) || 0;
  },

  setUserCoupon(cupom) {
    localStorage.setItem('usuario_cupom', cupom);
  },

  getUserCoupon() {
    return localStorage.getItem('usuario_cupom');
  },

  // -------- ORIGEM DE ACESSO --------
  setOrigin(origem) {
    localStorage.setItem('origem_acesso', origem);
  },

  getOrigin() {
    return localStorage.getItem('origem_acesso') || 'interno';
  },

  // -------- CARRINHO --------
  setCart(items) {
    localStorage.setItem('carrinho', JSON.stringify(items));
  },

  getCart() {
    return JSON.parse(localStorage.getItem('carrinho')) || [];
  },

  clearCart() {
    localStorage.removeItem('carrinho');
  },

  // -------- CADASTRO --------
  setCPFForRegistration(cpf) {
    localStorage.setItem('cpfParaCadastro', cpf);
  },

  getCPFForRegistration() {
    return localStorage.getItem('cpfParaCadastro');
  },

  // -------- PAGAMENTO --------
  setTotalSale(total) {
    localStorage.setItem('total_venda', total);
  },

  getTotalSale() {
    return parseFloat(localStorage.getItem('total_venda')) || 0;
  },

  setPaymentMethod(metodo) {
    localStorage.setItem('modo_pagamento_manual', metodo);
  },

  getPaymentMethod() {
    return localStorage.getItem('modo_pagamento_manual');
  },

  removePaymentMethod() {
    localStorage.removeItem('modo_pagamento_manual');
  },

  lockCoupon() {
    localStorage.setItem('travar_cupom', 'true');
  },

  isCouponLocked() {
    return localStorage.getItem('travar_cupom') === 'true';
  },

  unlockCoupon() {
    localStorage.removeItem('travar_cupom');
  },

  // -------- SESSION STORAGE (Para ID de venda) --------
  setSaleID(id) {
    sessionStorage.setItem('idVendaAtual', id);
  },

  getSaleID() {
    return sessionStorage.getItem('idVendaAtual');
  },

  // -------- LIMPEZA --------
  clearUserData() {
    // Limpa dados sensíveis do usuário (mantém alguns)
    localStorage.removeItem('usuario_cpf');
    localStorage.removeItem('usuario_tipo');
    localStorage.removeItem('usuario_nome');
    localStorage.removeItem('usuario_saldo');
    localStorage.removeItem('usuario_cupom');
    localStorage.removeItem('carrinho');
    localStorage.removeItem('total_venda');
    localStorage.removeItem('modo_pagamento_manual');
    localStorage.removeItem('travar_cupom');
    localStorage.removeItem('cpfParaCadastro');
  },

  clearAll() {
    localStorage.clear();
  },

  // -------- DEBUG --------
  getAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    return data;
  },
};

export default Storage;
