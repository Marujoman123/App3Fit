import CONFIG from './config.js';
import Storage from './storage.js';
import Router from './router.js';
import ErrorHandler from './errorHandler.js';

// Usado por pagamento.js (script comum)
window.voltarAoInicio = () => Router.backToLogin();

// ============================================
// HEADER PROFILE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  setupHeaderProfile();
  setupInactivityMonitoring();
  setupEventListeners();
});

function setupHeaderProfile() {
  const nome = Storage.getUserName();

  if (!nome) {
    Router.backToLogin();
    return;
  }

  const elNome = document.getElementById('header-nome');
  const elSaldo = document.getElementById('header-saldo');
  const tipo = Storage.getUserType();
  const saldo = Storage.getUserBalance();

  if (elNome) {
    const primeiroNome = nome.split(' ')[0];
    elNome.innerText = primeiroNome;
  }

  if (tipo === CONFIG.USER_TYPES.PARCEIRO && elSaldo) {
    elSaldo.innerText = `Saldo: R$ ${saldo.toFixed(2)}`;
    elSaldo.classList.add('visible');
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  const btnSair = document.getElementById('btnSair');
  const btnFecharModal = document.getElementById('btnFecharModal');

  if (btnSair) {
    btnSair.addEventListener('click', () => Router.logout());
  }

  if (btnFecharModal) {
    btnFecharModal.addEventListener('click', () => {
      if (confirm('Tem certeza que deseja cancelar e voltar para o início?')) {
        Router.backToLogin();
      }
    });
  }
}

// ============================================
// INACTIVITY MONITORING (Session Timeout)
// ============================================

let inactivityTimer;
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

function setupInactivityMonitoring() {
  ACTIVITY_EVENTS.forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true);
  });

  resetInactivityTimer();
}

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);

  if (!isOnLoginPage()) {
    inactivityTimer = setTimeout(handleSessionTimeout, CONFIG.TIMEOUTS.SESSION);
  }
}

function isOnLoginPage() {
  return window.location.pathname.includes('index.html');
}

function handleSessionTimeout() {
  ErrorHandler.show('Sessão expirada por inatividade. Faça login novamente.');
  Router.logout();
}
