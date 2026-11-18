import CONFIG from './config.js';
import Storage from './storage.js';
import API from './api.js';
import Router from './router.js';
import ErrorHandler from './errorHandler.js';
import { roundValue, escapeHtml } from './utils.js';
import { exigirAcesso } from './acesso.js';

const $ = (id) => document.getElementById(id);

// O ID da venda é gerado uma vez por aba: se a rede oscilar, repetir não cria cobrança duplicada
let idVendaGlobal = Storage.getSaleID();
if (!idVendaGlobal) {
  idVendaGlobal = 'V' + Date.now();
  Storage.setSaleID(idVendaGlobal);
}

let pagamentoEmAndamento = false;

const tipoUsuario = Storage.getUserType();
const nomeUsuario = Storage.getUserName();
const cpfUsuario = Storage.getUserCPF() || '';
const carrinho = Storage.getCart();
const totalOriginal = roundValue(Storage.getTotalSale());
const saldoDisponivel = roundValue(Storage.getUserBalance());

let saldoUtilizadoTotal = 0;
let descontoAplicado = 0;

if (exigirAcesso()) {
  renderizarItens();
  configurarInterfaceUsuario();
  atualizarResumoTela();
  configurarEventos();
}

// ======================================================
// INTERFACE
// ======================================================

function configurarInterfaceUsuario() {
  if (tipoUsuario === CONFIG.USER_TYPES.PARCEIRO) {
    $('containerSaldo').classList.remove('oculto');
    $('txtSaldoDisponivel').innerText = saldoDisponivel.toFixed(2);
    $('containerCupom').classList.add('oculto');

    // Sugere usar o saldo automaticamente
    const valorSugerido = Math.min(totalOriginal, saldoDisponivel);
    $('inputUsarSaldo').value = valorSugerido.toFixed(2);
    saldoUtilizadoTotal = roundValue(valorSugerido);
  }

  if (Storage.isCouponLocked()) {
    $('containerCupom').classList.add('oculto');
  }
}

function renderizarItens() {
  const container = $('listaItensPagamento');
  if (carrinho.length === 0) {
    container.innerHTML = '<p>Carrinho vazio</p>';
    return;
  }
  container.insertAdjacentHTML('beforeend', carrinho.map(item => {
    const subtotal = roundValue(roundValue(item.preco) * (item.quantidade || 1));
    return `<p class="item-pagamento">• ${item.quantidade}x ${escapeHtml(item.nome)} <span>R$ ${subtotal.toFixed(2)}</span></p>`;
  }).join(''));
}

function atualizarResumoTela() {
  const totalComDesconto = roundValue(totalOriginal - descontoAplicado);
  const totalFinal = roundValue(Math.max(0, totalComDesconto - saldoUtilizadoTotal));

  $('totalOriginal').innerText = totalOriginal.toFixed(2);
  $('totalFinal').innerText = totalFinal.toFixed(2);

  const elDesc = $('valorDesconto');
  elDesc.innerHTML = `Desconto: <b>R$ ${descontoAplicado.toFixed(2)}</b>`;
  elDesc.classList.toggle('oculto', descontoAplicado <= 0);

  const elSaldo = $('txtSaldoUsado');
  elSaldo.innerHTML = `Saldo de R$ ${saldoUtilizadoTotal.toFixed(2)} aplicado!`;
  elSaldo.classList.toggle('oculto', saldoUtilizadoTotal <= 0);
}

function configurarEventos() {
  $('btnValidarCupom').addEventListener('click', validarCupom);
  $('inputUsarSaldo').addEventListener('input', aplicarSaldo);
  $('btnConfirmarPagamento').addEventListener('click', dispararPagamentoNaMaquina);
}

// ======================================================
// CUPOM E SALDO
// ======================================================

async function validarCupom() {
  const btn = $('btnValidarCupom');
  const cupom = $('inputCupom').value.trim().toUpperCase();
  if (!cupom) {
    descontoAplicado = 0;
    atualizarResumoTela();
    return;
  }

  btn.innerText = '...';
  try {
    const data = await API.validateCoupon(cupom);
    if (data.status === 'success') {
      descontoAplicado = roundValue(totalOriginal * 0.10);
      $('txtCumpom').innerHTML = 'Cupom aplicado!';
      $('txtCumpom').classList.add('cupom-ok');
    } else {
      descontoAplicado = 0;
      ErrorHandler.show('Cupom inválido.');
    }
    atualizarResumoTela();
  } catch (e) {
    ErrorHandler.show('Erro ao validar cupom.');
  }
  btn.innerText = 'Validar';
}

// O campo funciona como máscara de centavos: os dígitos digitados viram o valor / 100
function aplicarSaldo(e) {
  let val = parseFloat(e.target.value.replace(/\D/g, '') / 100) || 0;
  const limite = Math.min(saldoDisponivel, totalOriginal);
  if (val > limite) val = limite;
  e.target.value = val.toFixed(2);
  saldoUtilizadoTotal = roundValue(val);
  atualizarResumoTela();
}

// ======================================================
// FLUXO DE PAGAMENTO
// ======================================================

async function dispararPagamentoNaMaquina() {
  if (pagamentoEmAndamento) return;
  if (carrinho.length === 0) {
    ErrorHandler.show('Carrinho vazio!');
    return;
  }

  const btn = $('btnConfirmarPagamento');
  pagamentoEmAndamento = true;
  btn.disabled = true;
  btn.innerText = 'Processando...';

  $('modalPagamento').classList.remove('oculto');
  exibirStatusPagamento("Aguardando ação na Maquininha... <br><br> <b class='aviso-maquininha'>Faça o Pagamento na Maquininha, Caso o valor não apareceça aperte o botão verde</b>");

  await processarVendaFinal();

  // Só chega aqui sem redirecionar quando houve erro: libera o botão
  pagamentoEmAndamento = false;
  btn.disabled = false;
  btn.innerText = 'Confirmar e Finalizar';
}

function montarLinhasVenda() {
  const dataHora = new Date().toLocaleString('pt-BR');
  const cupomTexto = $('inputCupom').value.trim().toUpperCase() || 'NENHUM';

  return carrinho.map(item => {
    const qtd = item.quantidade || 1;
    const vUnit = roundValue(parseFloat(item.preco));
    const vTotalLinha = roundValue(vUnit * qtd);
    // Desconto e saldo são rateados entre os itens proporcionalmente ao valor de cada um
    const prop = totalOriginal > 0 ? (vTotalLinha / totalOriginal) : (1 / carrinho.length);

    const descItem = roundValue(descontoAplicado * prop);
    const saldoItem = roundValue(saldoUtilizadoTotal * prop);
    const pagoItem = roundValue(Math.max(0, roundValue(roundValue(vTotalLinha - descItem) - saldoItem)));

    let comissao = (descontoAplicado > 0) ? roundValue(vTotalLinha * 0.10) : 0;
    if (tipoUsuario === CONFIG.USER_TYPES.PARCEIRO && saldoItem > 0) comissao = roundValue(-saldoItem);

    return {
      "ID Venda": idVendaGlobal,
      "Data/Hora": dataHora,
      "CPF": cpfUsuario.replace(/\D/g, ''),
      "Nome": nomeUsuario,
      "Tipo": tipoUsuario,
      "Cod": item.codigo,
      "Produto": item.nome,
      "Quantidade": qtd,
      "Valor Unit": vUnit,
      "Valor Total Item": vTotalLinha,
      "cupom": cupomTexto,
      "ValoremSaldo": saldoItem,
      "ValorPAgo": pagoItem,
      "Valor parceiro": comissao,
      "Valor liquido": roundValue(Math.max(0, roundValue(pagoItem - (comissao > 0 ? comissao : 0)))),
      "Tipo Pagamento": "PROCESSANDO",
    };
  });
}

async function cobrarNaMaquininha(valorTotalCentavos, jsonVendaFinal) {
  const resIntent = await API.startPayment(valorTotalCentavos, jsonVendaFinal);

  if (resIntent.status !== 'success' || !resIntent.intent_id) {
    throw new Error('Erro ao iniciar máquina: ' + (resIntent.message || 'Verifique conexão'));
  }

  // Consulta a cada 3s por até 3 minutos
  for (let tentativas = 0; tentativas < 60; tentativas++) {
    await new Promise(r => setTimeout(r, 3000));

    let statusMP;
    try {
      statusMP = await API.verifyPayment(resIntent.intent_id);
    } catch (err) {
      console.warn('Erro de conexão, tentando novamente...');
      continue;
    }

    console.log('🔍 Retorno da Maquininha:', statusMP);
    if (statusMP.status === 'approved') return statusMP.raw_status;
    if (statusMP.status === 'canceled') throw new Error('Pagamento cancelado na máquina.');
  }
  throw new Error('Tempo esgotado na máquina.');
}

async function processarVendaFinal() {
  const jsonVendaFinal = montarLinhasVenda();
  const valorTotalPago = roundValue(jsonVendaFinal.reduce((acc, i) => acc + i["ValorPAgo"], 0));
  const valorTotalCentavos = Math.round(valorTotalPago * 100);
  const pagamentoManual = Storage.getPaymentMethod() === 'true';

  try {
    let tipoPagamento;

    if (pagamentoManual || valorTotalCentavos === 0) {
      tipoPagamento = 'SALDO_OU_CUPOM';
      if (Storage.isCouponLocked()) tipoPagamento = 'RETIRADA_ESTOQUE';
      else if (pagamentoManual) tipoPagamento = 'MANUAL_DIN_PIX';
    } else if (CONFIG.ENVIRONMENT === 'PROD') {
      tipoPagamento = await cobrarNaMaquininha(valorTotalCentavos, jsonVendaFinal);
    } else {
      await new Promise(r => setTimeout(r, 1500));
      tipoPagamento = 'MODO_TESTE';
    }

    jsonVendaFinal.forEach(item => { item["Tipo Pagamento"] = tipoPagamento; });

    exibirStatusPagamento('Pagamento aprovado! Gravando dados...');
    const finalData = await API.registerSale(jsonVendaFinal);
    if (finalData.status !== 'success') {
      throw new Error('Erro ao gravar planilha: ' + finalData.message);
    }

    mostrarSucesso(gerarReciboPDF(jsonVendaFinal));
  } catch (e) {
    ErrorHandler.show(e.message);
    $('modalPagamento').classList.add('oculto');
    pagamentoEmAndamento = false;

    // Em erro de rede ou timeout o ID é mantido: confirmar de novo reaproveita a cobrança da maquininha.
    // Só um cancelamento gera ID novo.
    if (e.message.includes('cancelado')) {
      idVendaGlobal = 'V' + Date.now();
      Storage.setSaleID(idVendaGlobal);
    }
  }
}

function exibirStatusPagamento(mensagem) {
  document.querySelector('#modalPagamento .modal-content').innerHTML = `
    <div class="spinner"></div>
    <h3>${mensagem}</h3>
    <p>Não feche esta tela.</p>
  `;
}

function mostrarSucesso(urlRecibo) {
  document.querySelector('#modalPagamento .modal-content').innerHTML = `
    <h2 class="titulo-sucesso">✅ Venda Realizada!</h2>
    <p class="texto-sucesso">Venda registrada com sucesso na planilha.</p>
    <button id="btnVerRecibo" class="btn-recibo">📄 Imprimir / Ver Recibo</button>
    <button id="btnNovaVenda" class="btn-nova-venda">🛒 Finalizar e Voltar</button>
  `;

  // Aberto por clique do usuário, então o navegador não bloqueia a nova aba
  $('btnVerRecibo').addEventListener('click', () => window.open(urlRecibo, '_blank'));
  $('btnNovaVenda').addEventListener('click', () => {
    Storage.clearSale();
    Router.backToLogin();
  });
}

// ======================================================
// RECIBO EM PDF
// ======================================================

function gerarReciboPDF(dadosVenda) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    console.warn('Biblioteca jsPDF não encontrada. Não foi possível gerar o recibo.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const info = dadosVenda[0];
  const cliente = info["Nome"] || 'Consumidor Final';
  const cpf = info["CPF"] ? info["CPF"].replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'N/A';

  let y = 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE VENDA - 3FIT', 105, y, { align: 'center' });
  y += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Pedido: ${info["ID Venda"]}`, 10, y);
  doc.text(`Data: ${info["Data/Hora"]}`, 120, y);
  y += 8;

  doc.text(`Cliente: ${cliente}`, 10, y);
  doc.text(`CPF: ${cpf}`, 120, y);
  y += 10;

  doc.setLineWidth(0.5);
  doc.line(10, y, 200, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Qtd', 10, y);
  doc.text('Produto', 25, y);
  doc.text('V. Unit', 145, y);
  doc.text('Total', 175, y);
  y += 8;

  doc.setFont('helvetica', 'normal');

  let subtotalProdutos = 0;
  dadosVenda.forEach(item => {
    const vUnit = parseFloat(item["Valor Unit"]);
    const vTotalLinha = parseFloat(item["Valor Total Item"]);
    subtotalProdutos += vTotalLinha;

    doc.text(`${item["Quantidade"]}x`, 10, y);
    // Quebra nomes longos para não invadir a coluna de preço
    const nomeFormatado = doc.splitTextToSize(item["Produto"], 110);
    doc.text(nomeFormatado, 25, y);
    doc.text(`R$ ${vUnit.toFixed(2)}`, 145, y);
    doc.text(`R$ ${vTotalLinha.toFixed(2)}`, 175, y);
    y += (nomeFormatado.length * 7);
  });

  y += 5;
  doc.line(10, y, 200, y);
  y += 10;

  const valorPagoFinal = dadosVenda.reduce((acc, curr) => acc + curr["ValorPAgo"], 0);

  doc.setFont('helvetica', 'bold');
  doc.text(`Subtotal: R$ ${subtotalProdutos.toFixed(2)}`, 140, y);
  y += 7;

  if (descontoAplicado > 0) {
    doc.text(`Desconto: R$ -${descontoAplicado.toFixed(2)}`, 140, y);
    y += 7;
  }
  if (saldoUtilizadoTotal > 0) {
    doc.text(`Saldo Usado: R$ -${saldoUtilizadoTotal.toFixed(2)}`, 140, y);
    y += 7;
  }

  doc.text(`Total Pago: R$ ${valorPagoFinal.toFixed(2)}`, 140, y);
  y += 15;

  doc.setFont('helvetica', 'normal');
  doc.text(`Forma de Pagamento: ${info["Tipo Pagamento"]}`, 10, y);
  y += 10;
  doc.setFontSize(10);
  doc.text('Obrigado pela preferência!', 105, y, { align: 'center' });

  return URL.createObjectURL(doc.output('blob'));
}
