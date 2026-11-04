// ============================================
// CONFIG.JS - Constantes Globais Centralizadas
// ============================================
// Este arquivo centraliza TODAS as constantes da aplicação
// Qualquer mudança de URL, timeout ou chave deve ser feita AQUI

const CONFIG = {
  // API - Google Apps Script
  API: {
    URL: "https://script.google.com/macros/s/AKfycbxoJK7T0b4-EmwtY7Nu00pLkNvBsZmeypryqsf_vCACvBtiK5LO54nFO8iUbfCNYVFg/exec",
    TIMEOUT: 10000, // 10 segundos
  },

  // Ambiente
  ENVIRONMENT: 'PROD', // 'PROD' | 'DEV'

  // Timeouts
  TIMEOUTS: {
    SESSION: 3 * 60 * 1000, // 3 minutos de inatividade
    API_CALL: 10000,        // 10 segundos para requisição
  },

  // Limites e Validações
  VALIDATION: {
    CPF_LENGTH: 11,
    PHONE_LENGTH: 11,
  },

  // Tipos de Usuário
  USER_TYPES: {
    PROPRIETARIO: 'Proprietário',
    CLIENTE: 'Cliente',
    PARCEIRO: 'Parceiro',
  },

  // Páginas (para navegação)
  PAGES: {
    LOGIN: 'index.html',
    ADMIN: 'admin.html',
    CADASTRO: 'cadastro.html',
  },

};

export default CONFIG;
