// ============================================
// UTILS.JS - Funções Utilitárias
// ============================================
// Funções comuns reutilizáveis em toda a app
// Sem duplicação de código

// -------- FORMATAÇÃO --------

export function formatCPF(cpf) {
  let valor = (cpf || '').replace(/\D/g, '');
  if (valor.length > 11) valor = valor.slice(0, 11);
  valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
  valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
  valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return valor;
}

export function formatPhone(phone) {
  let v = (phone || '').replace(/\D/g, '');
  v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
  v = v.replace(/(\d)(\d{4})$/, '$1-$2');
  return v;
}

export function formatCurrency(value) {
  const num = parseFloat(value) || 0;
  return `R$ ${num.toFixed(2)}`;
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
}

// -------- VALIDAÇÃO --------

export function isValidCPF(cpf) {
  const strCPF = (cpf || '').replace(/\D/g, '');

  // Verificar tamanho
  if (strCPF.length !== 11) return false;

  // Verificar se todos os dígitos são iguais
  if (strCPF.split('').every(char => char === strCPF[0])) return false;

  // Validar primeiro dígito verificador
  let soma = 0;
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(strCPF.substring(i - 1, i)) * (11 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(strCPF.substring(9, 10))) return false;

  // Validar segundo dígito verificador
  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(strCPF.substring(i - 1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(strCPF.substring(10, 11))) return false;

  return true;
}

export function isValidPhone(phone) {
  const cleaned = (phone || '').replace(/\D/g, '');
  return cleaned.length === 11;
}

export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// -------- CÁLCULOS --------

// Arredonda valor com precisão (evita erro de ponto flutuante)
export function roundValue(valor) {
  return Math.round((parseFloat(valor) + Number.EPSILON) * 100) / 100;
}

export function calculateDiscount(original, discounted) {
  return roundValue(original - discounted);
}

export function calculatePercentage(value, percentage) {
  return roundValue((parseFloat(value) * percentage) / 100);
}

// -------- ARRAYS & OBJECTS --------

export function findInArray(array, key, value) {
  return array.find(item => item[key] === value);
}

export function sumArray(array, property) {
  return array.reduce((sum, item) => sum + parseFloat(item[property] || 0), 0);
}

export function groupBy(array, key) {
  return array.reduce((result, item) => {
    (result[item[key]] = result[item[key]] || []).push(item);
    return result;
  }, {});
}

// -------- STRINGS --------

export function escapeHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function capitalize(str) {
  return (str || '').charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncate(str, length = 50) {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

// -------- TIME --------

export function getCurrentTimestamp() {
  return new Date().toISOString();
}

export function getFormattedDateTime(date = new Date()) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// -------- MISC --------

export function generateID() {
  return 'ID_' + Date.now();
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  formatCPF,
  formatPhone,
  formatCurrency,
  formatDate,
  isValidCPF,
  isValidPhone,
  isValidEmail,
  roundValue,
  calculateDiscount,
  calculatePercentage,
  findInArray,
  sumArray,
  groupBy,
  capitalize,
  truncate,
  getCurrentTimestamp,
  getFormattedDateTime,
  generateID,
  sleep,
};
