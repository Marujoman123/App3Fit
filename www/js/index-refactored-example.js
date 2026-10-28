// ============================================
// INDEX-REFACTORED-EXAMPLE.JS
// ============================================
// Exemplo de como refatorar index.js usando os novos módulos
// Copie este padrão para refatorar outros arquivos

import CONFIG from './config.js';
import Storage from './storage.js';
import { API } from './api.js';
import { Router } from './router.js';
import { ErrorHandler } from './errorHandler.js';
import { formatCPF, isValidCPF } from './utils.js';

// ============================================
// ELEMENTOS DO DOM
// ============================================

let btnEntrar, cpfInput, mensagemErro, modal, inputSenha, btnConfirmar, btnCancelar;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  initializeEventListeners();
  setupKeyboardBehavior();
  Storage.setOrigin('interno');
  cpfInput.focus();
});

function initializeElements() {
  btnEntrar = document.getElementById('btnEntrar');
  cpfInput = document.getElementById('cpf');
  mensagemErro = document.getElementById('mensagem-erro');
  modal = document.getElementById('modalSenha');
  inputSenha = document.getElementById('inputSenhaAdmin');
  btnConfirmar = document.getElementById('btnConfirmarSenha');
  btnCancelar = document.getElementById('btnCancelarSenha');
}

function initializeEventListeners() {
  // Botão entrar
  btnEntrar.addEventListener('click', handleLogin);

  // Botão confirmar senha admin
  btnConfirmar.addEventListener('click', handleAdminPasswordConfirm);

  // Botão cancelar
  btnCancelar.addEventListener('click', handleModalCancel);

  // Focus em inputs (para mobile)
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', () => {
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });
  });
}

function setupKeyboardBehavior() {
  // CPF input: formatar enquanto digita
  cpfInput.addEventListener('input', (e) => {
    e.target.value = formatCPF(e.target.value);
  });

  // Enter no CPF = clica botão
  cpfInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      btnEntrar.click();
    }
  });

  // Enter na senha = confirma
  inputSenha.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      btnConfirmar.click();
    }
  });
}

// ============================================
// HANDLERS
// ============================================

async function handleLogin() {
  // 1. Validar CPF
  const cpfInput = document.getElementById('cpf');
  if (!isValidCPF(cpfInput.value)) {
    ErrorHandler.show('CPF inválido. Tente novamente.');
    mensagemErro.innerText = 'Digite um CPF válido.';
    cpfInput.focus();
    return;
  }

  const cpfLimpo = cpfInput.value.replace(/\D/g, '');
  Storage.setUserCPF(cpfLimpo);

  // 2. Verificar se é admin
  if (isAdminCPF(cpfLimpo)) {
    showAdminPasswordModal();
    return;
  }

  // 3. Validar no Google Sheets
  await validateUserInGoogleSheets(cpfLimpo);
}

function isAdminCPF(cpf) {
  return cpf === CONFIG.ADMIN.CPF_JE || cpf === CONFIG.ADMIN.CPF_HUGO;
}

function getAdminName(cpf) {
  return cpf === CONFIG.ADMIN.CPF_JE ? 'JEFERSON MACHADO' : 'HUGO ROSA';
}

function showAdminPasswordModal() {
  modal.style.display = 'flex';
  inputSenha.value = '';
  inputSenha.focus();
}

function handleAdminPasswordConfirm() {
  if (inputSenha.value === CONFIG.ADMIN.SENHA_ADMIN) {
    const cpfLimpo = Storage.getUserCPF();
    const nome = getAdminName(cpfLimpo);

    Storage.setUserType(CONFIG.USER_TYPES.PROPRIETARIO);
    Storage.setUserName(nome);

    Router.goToAdmin();
  } else {
    ErrorHandler.show('Senha incorreta!');
    inputSenha.value = '';
    inputSenha.focus();
  }
}

function handleModalCancel() {
  modal.style.display = 'none';
  inputSenha.value = '';
  cpfInput.focus();
}

// ============================================
// VALIDAÇÃO NO GOOGLE SHEETS
// ============================================

async function validateUserInGoogleSheets(cpf) {
  try {
    // Mostrar loading
    showLoading(true);

    // Chamar API
    const result = await API.validateCPF(cpf);

    // Processar resultado
    if (result.status === 'exists') {
      Storage.setUserName(result.nome);
      Storage.setUserType(result.tipo);

      if (result.tipo === CONFIG.USER_TYPES.PARCEIRO) {
        Storage.setUserBalance(result.saldo);
        Storage.setUserCoupon(result.cupom);
        Router.goToPartnerPanel();
      } else {
        Router.goToClientPanel();
      }
    } else {
      // Usuário não existe - ir para cadastro
      Storage.setCPFForRegistration(cpf);
      Router.goToRegistration(cpf);
    }
  } catch (error) {
    ErrorHandler.log('Validation Error:', error);
    ErrorHandler.show('Erro ao consultar servidor. Tente novamente.');
    showLoading(false);
  }
}

function showLoading(show) {
  const loginContainer = document.getElementById('loginContainer');
  const loadingLogin = document.getElementById('loadingLogin');

  if (show) {
    loginContainer.style.display = 'none';
    loadingLogin.style.display = 'block';
  } else {
    loginContainer.style.display = 'block';
    loadingLogin.style.display = 'none';
  }
}

// ============================================
// INATIVIDADE (Timeout)
// ============================================

let inactivityTimer;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);

  // Não fazer timeout na página de login
  if (!Router.isOnPage('index.html')) {
    inactivityTimer = setTimeout(handleInactivity, CONFIG.TIMEOUTS.SESSION);
  }
}

function handleInactivity() {
  ErrorHandler.show('Sessão expirada por inatividade.');
  Storage.clearUserData();
  Router.backToLogin();
}

// Resetar timer em qualquer atividade do usuário
const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
activityEvents.forEach(event => {
  document.addEventListener(event, resetInactivityTimer, true);
});

// Iniciar timer ao carregar
document.addEventListener('DOMContentLoaded', resetInactivityTimer);
