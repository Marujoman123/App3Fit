import CONFIG from './config.js';
import Storage from './storage.js';
import API from './api.js';
import Router from './router.js';
import ErrorHandler from './errorHandler.js';
import { formatCPF, formatPhone } from './utils.js';

// ============================================
// DOM ELEMENTS
// ============================================

let cadCpf, cadNome, cadTelefone, btnSalvar;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  setupKeyboardEnhancements();
  initializeEventListeners();
  loadCPFFromURL();
  cadNome.focus();
});

function initializeElements() {
  cadCpf = document.getElementById('cadCpf');
  btnSalvar = document.getElementById('btnSalvar');
  cadNome = document.getElementById('cadNome');
  cadTelefone = document.getElementById('cadTelefone');
}

function setupKeyboardEnhancements() {
  const inputs = document.querySelectorAll('input:not(#barcodeInput)');
  inputs.forEach(input => {
    if (!input.getAttribute('inputmode')) {
      input.setAttribute('inputmode', input.id === 'cadTelefone' ? 'tel' : 'text');
    }
  });
}

function initializeEventListeners() {
  cadCpf.addEventListener('input', (e) => {
    e.target.value = formatCPF(e.target.value);
  });

  cadCpf.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      cadNome.focus();
    }
  });

  cadNome.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      cadTelefone.focus();
    }
  });

  cadTelefone.addEventListener('input', (e) => {
    e.target.value = formatPhone(e.target.value);
  });

  cadTelefone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      btnSalvar.click();
    }
  });

  btnSalvar.addEventListener('click', handleSaveUser);
}

// ============================================
// LOAD CPF FROM URL OR STORAGE
// ============================================

function loadCPFFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const cpfFromURL = urlParams.get('cpf');
  const cpfFromStorage = Storage.getCPFForRegistration();
  const cpfToLoad = cpfFromURL || cpfFromStorage;

  if (cpfToLoad) {
    cadCpf.value = formatCPF(cpfToLoad);
  }
}

// ============================================
// SAVE USER HANDLER
// ============================================

async function handleSaveUser() {
  const nome = cadNome.value.trim();
  const telefone = cadTelefone.value.trim();
  const cpf = cadCpf.value;
  const cpfLimpo = cpf.replace(/\D/g, '');

  if (!nome || !telefone || !cpf) {
    ErrorHandler.show('Por favor, preencha todos os campos.');
    cadNome.focus();
    return;
  }

  btnSalvar.disabled = true;
  btnSalvar.innerText = 'Salvando...';

  const userData = {
    cpf: cpfLimpo,
    nome: nome,
    telefone: telefone.replace(/\D/g, ''),
    tipo: CONFIG.USER_TYPES.CLIENTE,
    saldo: 0,
  };

  try {
    await API.post(userData);
    ErrorHandler.show('Cadastro realizado com sucesso!', ErrorHandler.TYPES.SUCCESS);

    Storage.setUserCPF(cpfLimpo);
    Storage.setUserName(nome);
    Storage.setUserType(CONFIG.USER_TYPES.CLIENTE);

    Router.navigate('caixa.html');
  } catch (error) {
    ErrorHandler.log('Registration Error:', error);
    ErrorHandler.show('Erro ao conectar com o banco de dados.');
    btnSalvar.disabled = false;
    btnSalvar.innerText = 'Finalizar Cadastro';
  }
}