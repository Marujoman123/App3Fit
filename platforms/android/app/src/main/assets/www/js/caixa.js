import CONFIG from './config.js';
import Storage from './storage.js';
import API from './api.js';
import Router from './router.js';
import ErrorHandler from './errorHandler.js';
import { roundValue, escapeHtml } from './utils.js';
import { exigirAcesso } from './acesso.js';

const $ = (id) => document.getElementById(id);

let produtos = [];
let carrinho = [];
let totalGeral = 0;

if (exigirAcesso()) {
  configurarLeitor();
  configurarEventos();
  carregarProdutos();
}

async function carregarProdutos() {
  try {
    const json = await API.getAllProducts();
    if (json.status !== 'success') throw new Error(json.message || 'Resposta inválida');
    produtos = json.produtos;

    montarCabecalho();
    $('loading').classList.add('oculto');
    $('conteudoCaixa').classList.remove('oculto');
    $('barcodeInput').focus();
  } catch (error) {
    ErrorHandler.log('Erro ao sincronizar produtos:', error);
    ErrorHandler.show('Erro ao sincronizar produtos. Verifique sua internet.');
  }
}

function montarCabecalho() {
  if (Storage.getUserType() !== CONFIG.USER_TYPES.PARCEIRO) return;

  const primeiroNome = (Storage.getUserName() || '').split(' ')[0];
  $('header-nome').innerText = `${primeiroNome} (Parceiro)`;
  $('btnRelatorio').classList.remove('oculto');
}

function configurarEventos() {
  $('btnRelatorio').addEventListener('click', () => Router.navigate('relatorio.html'));
  $('btnContinuar').addEventListener('click', continuarParaPagamento);
  $('formBarcode').addEventListener('submit', lerCodigo);

  $('listaProdutos').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-index]');
    if (btn) removerItem(Number(btn.dataset.index));
  });
}

// O leitor de código de barras funciona como um teclado: o campo precisa estar sempre focado,
// sem abrir o teclado virtual do celular.
function configurarLeitor() {
  const input = $('barcodeInput');
  input.setAttribute('inputmode', 'none');

  // readOnly por um instante impede o teclado virtual, mas mantém a entrada do leitor
  input.addEventListener('focus', () => {
    input.readOnly = true;
    setTimeout(() => { input.readOnly = false; }, 50);
  });
  input.addEventListener('mousedown', () => setTimeout(() => input.focus(), 10));

  document.addEventListener('click', () => setTimeout(() => input.focus(), 100));
  document.addEventListener('touchstart', () => input.focus());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Enter') input.focus();
  });

  // Re-foca periodicamente para o leitor não "dormir"
  setInterval(() => {
    if (document.activeElement !== input) input.focus();
  }, 30000);
}

function lerCodigo(e) {
  e.preventDefault();
  const input = $('barcodeInput');
  const codigo = input.value.trim();
  if (!codigo) return;

  // A planilha pode devolver o código como número; compara como texto
  const produto = produtos.find(p => String(p.codigo) === codigo);
  if (produto) adicionarItem(produto);
  else ErrorHandler.show('Produto não cadastrado!');

  input.value = '';
  setTimeout(() => input.focus(), 10);
}

function adicionarItem(produto) {
  const ehParceiro = Storage.getUserType() === CONFIG.USER_TYPES.PARCEIRO;
  const preco = roundValue(ehParceiro ? (produto.precoParceiro || 0) : (produto.precoCliente || 0));
  const existente = carrinho.find(item => String(item.codigo) === String(produto.codigo));

  if (existente) {
    existente.quantidade += 1;
  } else {
    carrinho.push({
      codigo: produto.codigo,
      nome: produto.nome,
      kg: produto.kg || '',
      preco,
      quantidade: 1,
    });
  }
  renderizarCarrinho();
}

function removerItem(index) {
  const item = carrinho[index];
  if (!item) return;
  if (item.quantidade > 1) item.quantidade -= 1;
  else carrinho.splice(index, 1);
  renderizarCarrinho();
}

function renderizarCarrinho() {
  totalGeral = 0;
  $('listaProdutos').innerHTML = carrinho.map((item, index) => {
    const subtotal = roundValue(item.preco * item.quantidade);
    totalGeral = roundValue(totalGeral + subtotal);
    return `
      <div class="linha-carrinho">
        <span class="col-nome">${escapeHtml(item.nome)} - <b>${escapeHtml(item.kg)}</b></span>
        <span class="col-qtd">${item.quantidade}x</span>
        <span class="col-preco">R$ ${subtotal.toFixed(2)}</span>
        <div class="col-acao">
          <button class="btn-remover" data-index="${index}">×</button>
        </div>
      </div>`;
  }).join('');

  $('valorTotal').innerText = totalGeral.toFixed(2);
  $('barcodeInput').focus();
}

function continuarParaPagamento() {
  if (totalGeral <= 0) {
    ErrorHandler.show('O carrinho está vazio!', ErrorHandler.TYPES.WARNING);
    return;
  }
  Storage.setCart(carrinho);
  Storage.setTotalSale(totalGeral.toFixed(2));
  Router.navigate('pagamento.html');
}
