import CONFIG from './config.js';
import Storage from './storage.js';
import API from './api.js';
import Router from './router.js';
import ErrorHandler from './errorHandler.js';
import { formatCPF, isValidCPF } from './utils.js';

// ============================================
// DOM ELEMENTS
// ============================================

let btnEntrar, cpfInput, mensagemErro, modal, inputSenha, btnConfirmar, btnCancelar, loginContainer, loadingLogin;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  Storage.clearAll();
  Storage.setOrigin('interno');

  initializeElements();
  setupKeyboardEnhancements();
  initializeEventListeners();
  cpfInput.focus();
});

function initializeElements() {
  btnEntrar = document.getElementById('btnEntrar');
  cpfInput = document.getElementById('cpf');
  mensagemErro = document.getElementById('mensagem-erro');
  loginContainer = document.getElementById('loginContainer');
  loadingLogin = document.getElementById('loadingLogin');
  modal = document.getElementById('modalSenha');
  inputSenha = document.getElementById('inputSenhaAdmin');
  btnConfirmar = document.getElementById('btnConfirmarSenha');
  btnCancelar = document.getElementById('btnCancelarSenha');
}

function setupKeyboardEnhancements() {
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', () => {
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });
  });

  const inputs = document.querySelectorAll('input:not(#barcodeInput)');
  inputs.forEach(input => {
    if (!input.getAttribute('inputmode')) {
      input.setAttribute('inputmode', 'numeric');
    }
  });
}

function initializeEventListeners() {
  btnEntrar.addEventListener('click', handleLogin);
  btnConfirmar.addEventListener('click', handleAdminPasswordConfirm);
  btnCancelar.addEventListener('click', handleModalCancel);

  cpfInput.addEventListener('input', (e) => {
    e.target.value = formatCPF(e.target.value);
  });

  cpfInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      btnEntrar.click();
    }
  });

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
  if (!isValidCPF(cpfInput.value)) {
    ErrorHandler.show('CPF inválido. Tente novamente.');
    mensagemErro.innerText = 'Digite um CPF válido.';
    cpfInput.focus();
    return;
  }

  const cpfLimpo = cpfInput.value.replace(/\D/g, '');
  Storage.setUserCPF(cpfLimpo);

  if (isAdminCPF(cpfLimpo)) {
    showAdminPasswordModal();
    return;
  }

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
// API VALIDATION
// ============================================

async function validateUserInGoogleSheets(cpf) {
  try {
    showLoading(true);

    const result = await API.validateCPF(cpf);

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
  loginContainer.style.display = show ? 'none' : 'block';
  loadingLogin.style.display = show ? 'block' : 'none';
}