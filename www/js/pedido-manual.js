import CONFIG from './config.js';
import Storage from './storage.js';
import API from './api.js';
import Router from './router.js';
import ErrorHandler from './errorHandler.js';
import { roundValue, escapeHtml } from './utils.js';

const $ = (id) => document.getElementById(id);

let produtosEstoque = [];
let carrinho = [];
let tipoPreco = null;
let opcoes = null;

// fonte 'estoque': limita pelo estoque e devolve ao remover (pedido de compra).
// fonte 'encomenda': sem estoque, a quantidade é só uma contagem (planilha inteira, quantidade 0).
export default function iniciarPedidoManual({ donos = null, fonte = 'estoque', titulo = 'PEDIDO DE COMPRA', prefixo = 'Pedido' }) {
  opcoes = { fonte, titulo, prefixo };
  if (!verificarAcesso(donos)) return;

  configurarEventos();
  selecionarModo(document.querySelector('.btn-tipo.active'));
  carregarProdutos();
}

function verificarAcesso(donos) {
  const tipo = Storage.getUserType();
  if (!tipo) {
    Router.backToLogin();
    return false;
  }
  if (donos && !donos.includes(tipo)) {
    Router.backToPanel();
    return false;
  }
  return true;
}

function configurarEventos() {
  $('btnVoltar').addEventListener('click', () => Router.backToPanel());
  document.querySelectorAll('.btn-tipo').forEach(btn => {
    btn.addEventListener('click', () => selecionarModo(btn));
  });
  $('btnVerResumo').addEventListener('click', () => $('modalResumo').classList.add('aberto'));
  $('btnFecharResumo').addEventListener('click', () => $('modalResumo').classList.remove('aberto'));
  $('btnLimparPedido').addEventListener('click', limparPedido);
  $('btnGerarPDF').addEventListener('click', gerarPDF);

  $('listaSelecaoManual').addEventListener('click', (e) => {
    const item = e.target.closest('[data-codigo]');
    if (item) adicionarItem(item.dataset.codigo);
  });
  $('resumoPedido').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-index]');
    if (btn) removerItem(Number(btn.dataset.index));
  });
}

async function carregarProdutos() {
  try {
    const json = opcoes.fonte === 'encomenda'
      ? await API.getAllProductsNoFilter()
      : await API.getAllProducts();
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
  if (tipo !== CONFIG.USER_TYPES.PARCEIRO) return roundValue(produto.precoCliente);
  const ehAdmin = Storage.getUserType() === CONFIG.USER_TYPES.PROPRIETARIO;
  return roundValue(ehAdmin ? produto.precoCusto : produto.precoParceiro);
}

// Botões trazem data-tipo (preço usado) e data-nome: "usuario" trava o nome com o logado, "livre" deixa digitar
function selecionarModo(btn) {
  tipoPreco = btn.dataset.tipo;

  document.querySelectorAll('.btn-tipo').forEach(b => b.classList.toggle('active', b === btn));

  const nomeInput = $('nomePedido');
  const travado = btn.dataset.nome === 'usuario';
  nomeInput.value = travado ? (Storage.getUserName() || '') : '';
  nomeInput.readOnly = travado;
  nomeInput.classList.toggle('input-travado', travado);
  nomeInput.placeholder = travado ? '' : 'Nome do seu cliente final';

  carrinho = carrinho.map(item => {
    const original = produtosEstoque.find(p => p.codigo === item.codigo);
    return original ? { ...item, precoEfetivo: precoPorTipo(original, tipoPreco) } : item;
  });
  renderizarCarrinho();
}

function renderizarSelecao() {
  const estoque = opcoes.fonte === 'estoque';
  $('listaSelecaoManual').innerHTML = produtosEstoque
    .filter(p => String(p.linha).toUpperCase() !== 'TESTE')
    .map(p => {
      const esgotado = estoque && p.quantidade <= 0;
      const badge = estoque ? '' : (p.quantidade > 0 ? 'badge-ativo' : '');
      return `
        <div class="item-selecao ${esgotado ? 'item-esgotado' : ''}" data-codigo="${escapeHtml(p.codigo)}">
          <div>
            <small class="linha-produto">${escapeHtml(p.linha)}</small>
            <strong>${escapeHtml(p.nome)}</strong> - <small>${escapeHtml(p.kg)}</small>
          </div>
          <span class="badge-estoque ${badge}">${escapeHtml(p.quantidade)}</span>
        </div>`;
    }).join('');
}

function adicionarItem(codigo) {
  const p = produtosEstoque.find(x => String(x.codigo) === codigo);
  if (!p) return;
  if (opcoes.fonte === 'estoque') {
    if (p.quantidade <= 0) return;
    p.quantidade--;
  } else {
    p.quantidade++;
  }

  const preco = precoPorTipo(p, tipoPreco);
  const existente = carrinho.find(x => x.codigo === p.codigo);

  if (existente) {
    existente.quantidade++;
    existente.precoEfetivo = preco;
  } else {
    carrinho.push({ codigo: p.codigo, nome: p.nome, kg: p.kg, linha: p.linha, quantidade: 1, precoEfetivo: preco });
  }
  renderizarSelecao();
  renderizarCarrinho();
}

function calcularTotal() {
  return carrinho.reduce((acc, item) => roundValue(acc + roundValue(item.precoEfetivo * item.quantidade)), 0);
}

function renderizarCarrinho() {
  $('resumoPedido').innerHTML = carrinho.map((item, idx) => {
    const sub = roundValue(item.precoEfetivo * item.quantidade);
    return `
      <div class="linha-resumo">
        <span><b>${item.quantidade}x</b> ${escapeHtml(item.nome)}</span>
        <span>R$ ${sub.toFixed(2)}</span>
        <button class="btn-remover" data-index="${idx}">×</button>
      </div>`;
  }).join('');

  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  $('totalPedido').innerText = `Total: R$ ${calcularTotal().toFixed(2)}`;
  $('countItens').innerText = totalItens;
}

function removerItem(index) {
  const item = carrinho[index];
  if (!item) return;

  const original = produtosEstoque.find(p => p.codigo === item.codigo);
  if (original) {
    if (opcoes.fonte === 'estoque') original.quantidade++;
    else if (original.quantidade > 0) original.quantidade--;
  }

  if (item.quantidade > 1) item.quantidade--;
  else carrinho.splice(index, 1);

  renderizarSelecao();
  renderizarCarrinho();
}

function limparPedido() {
  if (!confirm('Limpar carrinho?')) return;

  if (opcoes.fonte === 'estoque') {
    carrinho.forEach(item => {
      const original = produtosEstoque.find(p => p.codigo === item.codigo);
      if (original) original.quantidade += item.quantidade;
    });
  } else {
    produtosEstoque.forEach(p => p.quantidade = 0);
  }
  carrinho = [];
  renderizarSelecao();
  renderizarCarrinho();
}

function gerarPDF() {
  const nomeInput = $('nomePedido');
  const nomeCliente = nomeInput.value.trim();

  if (!nomeCliente) {
    ErrorHandler.show('Por favor, digite o nome do cliente antes de gerar o PDF.', ErrorHandler.TYPES.WARNING);
    nomeInput.classList.add('input-erro');
    nomeInput.focus();
    return;
  }
  nomeInput.classList.remove('input-erro');

  if (carrinho.length === 0) {
    ErrorHandler.show('O pedido está vazio. Adicione pelo menos um produto.', ErrorHandler.TYPES.WARNING);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const responsavel = Storage.getUserName() || 'Administrador';
  const totalMarmitas = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const dataHoje = new Date().toLocaleString('pt-BR');

  doc.setFontSize(18);
  doc.text(`${opcoes.titulo} - 3FIT`, 14, 20);

  doc.setFontSize(11);
  doc.text(`Nome: ${nomeCliente}`, 14, 30);
  doc.text(`PREÇO: ${tipoPreco}`, 14, 37);

  const body = carrinho.map(i => [
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
  doc.text(`${opcoes.prefixo} gerado por: ${responsavel}`, 14, finalY);
  doc.text(`Data de emissão: ${dataHoje}`, 14, finalY + 7);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const nomeArquivo = `${opcoes.prefixo}_${nomeCliente.replace(/\s+/g, '_')}.pdf`;

  try {
    if (isMobile || !window.open(doc.output('bloburl'), '_blank')) {
      doc.save(nomeArquivo);
    }
  } catch (e) {
    doc.save(nomeArquivo);
  }
}
