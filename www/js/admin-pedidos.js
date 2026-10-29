import CONFIG from './config.js';
import Storage from './storage.js';
import API from './api.js';
import Router from './router.js';
import ErrorHandler from './errorHandler.js';
import { roundValue, escapeHtml } from './utils.js';

const TIPO = { CLIENTE: 'Cliente', PARCEIRO: 'Parceiro', RETIRADA: 'Retirada' };
const CPF_VENDA_MANUAL = '000.000.000-00';
const TEXTO_BTN_CUPOM = '🔍 Verificar Saldo do Parceiro';

let produtosEstoque = [];
let carrinhoManual = [];
let tipoPreco = TIPO.CLIENTE;
let dadosParceiroLocal = null;

const $ = (id) => document.getElementById(id);

if (verificarAcesso()) {
  document.addEventListener('DOMContentLoaded', () => {
    configurarEventos();
    carregarProdutos();
  });
}

function verificarAcesso() {
  const tipo = Storage.getUserType();
  if (!tipo) {
    Router.backToLogin();
    return false;
  }
  if (tipo !== CONFIG.USER_TYPES.PROPRIETARIO) {
    Router.backToPanel();
    return false;
  }
  return true;
}

function configurarEventos() {
  $('btnVoltar').addEventListener('click', () => Router.backToPanel());
  document.querySelectorAll('.btn-tipo').forEach(btn => {
    btn.addEventListener('click', () => setTipo(btn.dataset.tipo));
  });
  $('btnVerResumo').addEventListener('click', () => $('modalResumo').classList.add('aberto'));
  $('btnFecharResumo').addEventListener('click', () => $('modalResumo').classList.remove('aberto'));
  $('btnBuscarParceiro').addEventListener('click', buscarParceiro);
  $('btnLimparPedido').addEventListener('click', limparPedidoCompleto);
  $('btnGerarPDF').addEventListener('click', gerarPDFPedido);
  $('btnRealizarVenda').addEventListener('click', realizarVendaManual);

  $('listaSelecaoManual').addEventListener('click', (e) => {
    const item = e.target.closest('[data-codigo]');
    if (item) adicionarManual(item.dataset.codigo);
  });
  $('resumoPedido').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-index]');
    if (btn) removerItemManual(Number(btn.dataset.index));
  });
}

async function carregarProdutos() {
  try {
    const json = await API.getAllProducts();
    if (json.status !== 'success') throw new Error(json.message || 'Resposta inválida');
    produtosEstoque = json.produtos;
    $('textLoading').classList.add('oculto');
    renderizarSelecao();
  } catch (error) {
    ErrorHandler.log('Erro ao carregar produtos:', error);
    $('textLoading').innerText = 'Erro ao carregar produtos. Recarregue a página.';
  }
}

function precoPorTipo(produto, tipo) {
  if (tipo === TIPO.RETIRADA) return roundValue(produto.precoCusto);
  if (tipo === TIPO.PARCEIRO) return roundValue(produto.precoParceiro);
  return roundValue(produto.precoCliente);
}

function setTipo(tipo) {
  tipoPreco = tipo;

  document.querySelectorAll('.btn-tipo').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tipo === tipo);
  });

  const nomeInput = $('nomePedido');
  const travado = tipo === TIPO.RETIRADA;
  nomeInput.value = travado ? (Storage.getUserName() || 'Administrador') : '';
  nomeInput.readOnly = travado;
  nomeInput.classList.toggle('input-travado', travado);

  const ehParceiro = tipo === TIPO.PARCEIRO;
  $('btnBuscarParceiro').classList.toggle('oculto', !ehParceiro);
  nomeInput.placeholder = ehParceiro
    ? 'Digite o CUPOM do parceiro para identificar'
    : 'Nome do Cliente (Obrigatório)';
  if (!ehParceiro) dadosParceiroLocal = null;

  carrinhoManual = carrinhoManual.map(item => {
    const original = produtosEstoque.find(p => p.codigo === item.codigo);
    return original ? { ...item, precoEfetivo: precoPorTipo(original, tipo) } : item;
  });
  renderizarCarrinho();
}

function renderizarSelecao() {
  $('listaSelecaoManual').innerHTML = produtosEstoque
    .filter(p => String(p.linha).toUpperCase() !== 'TESTE')
    .map(p => {
      const esgotado = p.quantidade <= 0;
      return `
        <div class="item-selecao ${esgotado ? 'item-esgotado' : ''}" data-codigo="${escapeHtml(p.codigo)}">
          <div>
            <small class="linha-produto">${escapeHtml(p.linha)}</small>
            <strong>${escapeHtml(p.nome)}</strong> - <small>${escapeHtml(p.kg)}</small>
          </div>
          <span class="badge-estoque ${esgotado ? 'sem-estoque' : ''}">${escapeHtml(p.quantidade)}</span>
        </div>`;
    }).join('');
}

function adicionarManual(codigo) {
  const p = produtosEstoque.find(x => String(x.codigo) === codigo);
  if (!p || p.quantidade <= 0) return;

  p.quantidade--;
  const preco = precoPorTipo(p, tipoPreco);
  const existente = carrinhoManual.find(x => x.codigo === p.codigo);

  if (existente) {
    existente.quantidade++;
    existente.precoEfetivo = preco;
  } else {
    carrinhoManual.push({
      codigo: p.codigo,
      nome: p.nome,
      kg: p.kg,
      linha: p.linha,
      quantidade: 1,
      precoEfetivo: preco,
    });
  }
  renderizarSelecao();
  renderizarCarrinho();
}

function calcularTotal() {
  return carrinhoManual.reduce(
    (acc, item) => roundValue(acc + roundValue(item.precoEfetivo * item.quantidade)), 0);
}

function renderizarCarrinho() {
  $('resumoPedido').innerHTML = carrinhoManual.map((item, idx) => {
    const sub = roundValue(item.precoEfetivo * item.quantidade);
    return `
      <div class="linha-resumo">
        <span><b>${item.quantidade}x</b> ${escapeHtml(item.nome)}</span>
        <span>R$ ${sub.toFixed(2)}</span>
        <button class="btn-remover" data-index="${idx}">×</button>
      </div>`;
  }).join('');

  const totalItens = carrinhoManual.reduce((acc, item) => acc + item.quantidade, 0);
  $('totalPedido').innerText = `Total: R$ ${calcularTotal().toFixed(2)}`;
  $('countItens').innerText = totalItens;
}

function removerItemManual(index) {
  const item = carrinhoManual[index];
  if (!item) return;

  const original = produtosEstoque.find(p => p.codigo === item.codigo);
  if (original) original.quantidade++;

  if (item.quantidade > 1) item.quantidade--;
  else carrinhoManual.splice(index, 1);

  renderizarSelecao();
  renderizarCarrinho();
}

function limparPedidoCompleto() {
  if (!confirm('Deseja remover todos os itens do pedido?')) return;

  carrinhoManual.forEach(item => {
    const original = produtosEstoque.find(p => p.codigo === item.codigo);
    if (original) original.quantidade += item.quantidade;
  });
  carrinhoManual = [];
  $('nomePedido').value = '';
  renderizarSelecao();
  renderizarCarrinho();
}

function validarPedido(acao) {
  const nomeInput = $('nomePedido');
  const nome = nomeInput.value.trim();

  if (!nome) {
    ErrorHandler.show(`Por favor, digite o nome do cliente antes de ${acao}.`, ErrorHandler.TYPES.WARNING);
    nomeInput.classList.add('input-erro');
    nomeInput.focus();
    return null;
  }
  nomeInput.classList.remove('input-erro');

  if (carrinhoManual.length === 0) {
    ErrorHandler.show('O pedido está vazio. Adicione pelo menos um produto.', ErrorHandler.TYPES.WARNING);
    return null;
  }
  return nome;
}

function gerarPDFPedido() {
  const nomeCliente = validarPedido('gerar o PDF');
  if (!nomeCliente) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const adminResponsavel = Storage.getUserName() || 'Administrador';
  const totalMarmitas = carrinhoManual.reduce((acc, item) => acc + item.quantidade, 0);
  const dataHoje = new Date().toLocaleString('pt-BR');

  doc.setFontSize(18);
  doc.text('PEDIDO DE COMPRA - 3FIT', 14, 20);

  doc.setFontSize(11);
  doc.text(`Nome: ${nomeCliente}`, 14, 30);
  const labelTipo = tipoPreco === TIPO.RETIRADA ? 'RETIRADA DE ESTOQUE (CUSTO)' : `PREÇO: ${tipoPreco}`;
  doc.text(labelTipo, 14, 37);

  const body = carrinhoManual.map(i => [
    i.codigo,
    i.linha,
    `${i.nome} (${i.kg})`,
    i.quantidade,
    `R$ ${i.precoEfetivo.toFixed(2)}`,
    `R$ ${roundValue(i.precoEfetivo * i.quantidade).toFixed(2)}`,
  ]);

  doc.autoTable({
    startY: 45,
    head: [['Cod', 'Linha', 'Produto', 'Qtd', 'Unitário', 'Subtotal']],
    body,
    theme: 'striped',
    headStyles: { fillColor: [255, 144, 69] },
    footStyles: { fillColor: [255, 144, 69], textColor: [255, 255, 255], fontSize: 11, fontStyle: 'bold' },
    foot: [[
      { content: `TOTAL DE MARMITAS: ${totalMarmitas}`, colSpan: 4 },
      'Total',
      `R$ ${calcularTotal().toFixed(2)}`,
    ]],
  });

  const finalY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Pedido gerado por: ${adminResponsavel}`, 14, finalY);
  doc.text(`Data de emissão: ${dataHoje}`, 14, finalY + 7);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const nomeArquivo = `Pedido_${nomeCliente.replace(/\s+/g, '_')}.pdf`;

  try {
    if (isMobile || !window.open(doc.output('bloburl'), '_blank')) {
      doc.save(nomeArquivo);
    }
  } catch (e) {
    // Navegadores embutidos (Instagram/Facebook) podem bloquear: força o download
    doc.save(nomeArquivo);
  }
}

function realizarVendaManual() {
  const nomeCliente = validarPedido('realizar a venda');
  if (!nomeCliente) return;

  if (tipoPreco === TIPO.PARCEIRO && !dadosParceiroLocal) {
    if (!confirm('Você não verificou o saldo do parceiro. Continuar assim mesmo?')) return;
  }

  Storage.setCart(carrinhoManual.map(item => ({
    codigo: item.codigo,
    nome: item.nome,
    kg: item.kg || '',
    preco: item.precoEfetivo,
    quantidade: item.quantidade,
  })));
  Storage.setTotalSale(calcularTotal().toFixed(2));

  // A página de pagamento lê o "cliente" da venda nestas chaves
  Storage.setUserName(dadosParceiroLocal ? dadosParceiroLocal.nome : nomeCliente);
  Storage.setUserType(tipoPreco);
  Storage.setUserCPF(dadosParceiroLocal ? dadosParceiroLocal.cpf : CPF_VENDA_MANUAL);
  Storage.setUserBalance(dadosParceiroLocal ? dadosParceiroLocal.saldo : '0');
  Storage.setPaymentMethod('true');

  if (tipoPreco === TIPO.RETIRADA) Storage.lockCoupon();
  else Storage.unlockCoupon();

  Router.navigate('pagamento.html');
}

async function buscarParceiro() {
  const cupom = $('nomePedido').value.trim().toUpperCase();
  if (!cupom) {
    ErrorHandler.show('Digite o Cupom!', ErrorHandler.TYPES.WARNING);
    return;
  }

  const btn = $('btnBuscarParceiro');
  btn.innerText = 'Buscando...';

  try {
    const data = await API.validateCoupon(cupom);
    if (data.status === 'success') {
      dadosParceiroLocal = { nome: data.nome, cpf: data.cpf, saldo: data.saldo, tipo: TIPO.PARCEIRO };
      ErrorHandler.show(`Parceiro: ${data.nome}\nSaldo disponível: R$ ${parseFloat(data.saldo).toFixed(2)}`, ErrorHandler.TYPES.INFO);
      $('nomePedido').value = data.nome;
    } else {
      dadosParceiroLocal = null;
      ErrorHandler.show('Cupom não encontrado.');
    }
  } catch (e) {
    ErrorHandler.show('Erro na conexão.');
  } finally {
    btn.innerText = TEXTO_BTN_CUPOM;
  }
}
