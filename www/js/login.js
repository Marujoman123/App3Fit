import CONFIG from './config.js';
import Storage from './storage.js';
import API from './api.js';
import Router from './router.js';
import ErrorHandler from './errorHandler.js';
import { formatCPF, isValidCPF } from './utils.js';

const $ = (id) => document.getElementById(id);

let rotas = null;

// origem: 'externo' (web, páginas da raiz) ou 'interno' (Cordova, pasta www)
// rotas: destino após login por tipo de usuário e para o cadastro
export default function iniciarLogin({ origem, rotas: destinos }) {
  rotas = destinos;
  Storage.clearAll();
  Storage.setOrigin(origem);

  setupKeyboard();
  setupEventos();
  $('cpf').focus();
}

function setupKeyboard() {
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', () => {
      setTimeout(() => input.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    });
    if (!input.getAttribute('inputmode')) input.setAttribute('inputmode', 'numeric');
  });
}

function setupEventos() {
  $('btnEntrar').addEventListener('click', handleLogin);
  $('btnConfirmarSenha').addEventListener('click', handleAdminPasswordConfirm);
  $('btnCancelarSenha').addEventListener('click', handleModalCancel);

  $('cpf').addEventListener('input', (e) => {
    e.target.value = formatCPF(e.target.value);
  });
  $('cpf').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      $('btnEntrar').click();
    }
  });
  $('inputSenhaAdmin').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      $('btnConfirmarSenha').click();
    }
  });
}

async function handleLogin() {
  const cpfInput = $('cpf');
  if (!isValidCPF(cpfInput.value)) {
    ErrorHandler.show('CPF inválido. Tente novamente.');
    $('mensagem-erro').innerText = 'Digite um CPF válido.';
    cpfInput.focus();
    return;
  }

  const cpfLimpo = cpfInput.value.replace(/\D/g, '');
  Storage.setUserCPF(cpfLimpo);

  if (isAdminCPF(cpfLimpo)) {
    mostrarModalSenha();
    return;
  }

  await validarNaPlanilha(cpfLimpo);
}

function isAdminCPF(cpf) {
  return cpf === CONFIG.ADMIN.CPF_JE || cpf === CONFIG.ADMIN.CPF_HUGO;
}

function nomeAdmin(cpf) {
  return cpf === CONFIG.ADMIN.CPF_JE ? 'JEFERSON MACHADO' : 'HUGO ROSA';
}

function mostrarModalSenha() {
  $('modalSenha').style.display = 'flex';
  $('inputSenhaAdmin').value = '';
  $('inputSenhaAdmin').focus();
}

function handleAdminPasswordConfirm() {
  const senha = $('inputSenhaAdmin');
  if (senha.value === CONFIG.ADMIN.SENHA_ADMIN) {
    Storage.setUserType(CONFIG.USER_TYPES.PROPRIETARIO);
    Storage.setUserName(nomeAdmin(Storage.getUserCPF()));
    Router.navigate(rotas.admin);
  } else {
    ErrorHandler.show('Senha incorreta!');
    senha.value = '';
    senha.focus();
  }
}

function handleModalCancel() {
  $('modalSenha').style.display = 'none';
  $('inputSenhaAdmin').value = '';
  $('cpf').focus();
}

async function validarNaPlanilha(cpf) {
  try {
    mostrarCarregando(true);
    const result = await API.validateCPF(cpf);

    if (result.status === 'exists') {
      Storage.setUserName(result.nome);
      Storage.setUserType(result.tipo);

      if (result.tipo === CONFIG.USER_TYPES.PARCEIRO) {
        Storage.setUserBalance(result.saldo);
        Storage.setUserCoupon(result.cupom);
        Router.navigate(rotas.parceiro);
      } else {
        Router.navigate(rotas.cliente);
      }
    } else {
      Storage.setCPFForRegistration(cpf);
      Router.navigate(rotas.cadastro(cpf));
    }
  } catch (error) {
    ErrorHandler.log('Validation Error:', error);
    ErrorHandler.show('Erro ao consultar servidor. Tente novamente.');
    mostrarCarregando(false);
  }
}

function mostrarCarregando(mostrar) {
  $('loginContainer').style.display = mostrar ? 'none' : 'block';
  $('loadingLogin').style.display = mostrar ? 'block' : 'none';
}
