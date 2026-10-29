// ============================================
// API.JS - Wrapper para Google Apps Script
// ============================================
// Centraliza TODAS as chamadas ao Google Apps Script
// Sem URLs hardcoded em outros arquivos

import CONFIG from './config.js';
import ErrorHandler from './errorHandler.js';

const API = {
  // Helper: Fazer requisição genérica ao Google Apps Script
  async request(params = {}) {
    try {
      const url = new URL(CONFIG.API.URL);

      // Adiciona parâmetros à query string
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });

      const response = await fetch(url.toString(), {
        timeout: CONFIG.API.TIMEOUT,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      ErrorHandler.log('API Request Error:', error);
      throw error;
    }
  },

  // Helper: POST request ao Google Apps Script
  async post(data) {
    try {
      const response = await fetch(CONFIG.API.URL, {
        method: 'POST',
        body: JSON.stringify(data),
        timeout: CONFIG.API.TIMEOUT,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      ErrorHandler.log('API POST Error:', error);
      throw error;
    }
  },

  // -------- AUTENTICAÇÃO --------
  async validateCPF(cpf) {
    return this.request({ cpf });
  },

  // -------- PRODUTOS --------
  async getAllProducts() {
    return this.request({ todosProdutos: true });
  },

  async getAllProductsNoFilter() {
    return this.request({ todosProdutosSemFiltro: true });
  },

  // -------- CUPONS --------
  async validateCoupon(cupom) {
    return this.request({ validarCupom: cupom });
  },

  // -------- PAGAMENTO --------
  async verifyPayment(intentId, token) {
    return this.request({
      verificarPagamento: intentId,
      token: token
    });
  },

  async recordPayment(paymentData) {
    return this.post({
      tipo: 'recordarPagamento',
      ...paymentData
    });
  },

  // -------- REGISTROS --------
  async savePendingPayment(paymentData) {
    return this.post({
      tipo: 'salvarPagamentoPendente',
      ...paymentData
    });
  },

  // -------- PARCEIROS --------
  async searchPartnerByCoupon(cupom) {
    return this.request({ buscarParceiroId: cupom });
  },

  // -------- PEDIDOS --------
  async savePDF(pdfData) {
    return this.post({
      tipo: 'salvarPDF',
      ...pdfData
    });
  },
};

export default API;
