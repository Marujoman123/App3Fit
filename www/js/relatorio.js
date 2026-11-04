import CONFIG from './config.js';
import Storage from './storage.js';
import API from './api.js';
import Router from './router.js';
import { escapeHtml } from './utils.js';
import { exigirAcesso } from './acesso.js';

const $ = (id) => document.getElementById(id);

// Colunas da aba de vendas (ordem do appendRow do Apps Script)
const COL = {
  DATA: 1, CPF: 2, NOME: 3, PRODUTO: 6, QTD: 7, VALOR_TOTAL: 9,
  CUPOM: 10, VALOR_SALDO: 11, VALOR_PAGO: 12, COMISSAO: 13, TIPO_PAGTO: 15,
};

let cacheVendas = [];

if (exigirAcesso([CONFIG.USER_TYPES.PARCEIRO])) {
  preencherPeriodoPadrao();
  $('btnFiltrar').addEventListener('click', sincronizarVendas);
  $('btnVoltar').addEventListener('click', () => Router.backToPanel());
  sincronizarVendas();
}

function preencherPeriodoPadrao() {
  const hoje = new Date();
  const trintaDias = new Date();
  trintaDias.setDate(hoje.getDate() - 30);
  $('dataInicio').value = trintaDias.toISOString().split('T')[0];
  $('dataFim').value = hoje.toISOString().split('T')[0];
}

function mensagemTabela(texto, classe = '') {
  $('corpoRelatorio').innerHTML = `<tr><td colspan="7" class="msg-tabela ${classe}">${escapeHtml(texto)}</td></tr>`;
}

async function sincronizarVendas() {
  mensagemTabela('Iniciando sincronização com a planilha...', 'msg-carregando');

  try {
    const data = await API.getAllSales();
    if (data.status !== 'success') {
      mensagemTabela(`Erro: ${data.message}`, 'msg-erro');
      return;
    }

    cacheVendas = data.vendas;
    if (cacheVendas.length > 0 && cacheVendas[0][0] === 'ID Venda') cacheVendas.shift();
    filtrarEExibir();
  } catch (error) {
    mensagemTabela('Erro de conexão ao carregar dados.', 'msg-erro');
  }
}

function filtrarEExibir() {
  const cupomLogado = (Storage.getUserCoupon() || '').toUpperCase().trim();
  const cpfLogado = (Storage.getUserCPF() || '').replace(/\D/g, '');
  if (!cupomLogado && !cpfLogado) return;

  const dInicio = new Date($('dataInicio').value + 'T00:00:00');
  const dFim = new Date($('dataFim').value + 'T23:59:59');

  // Aparece se o cupom é do parceiro ou se a compra/retirada foi feita no CPF dele
  const itens = cacheVendas
    .filter(linha => {
      const dataVenda = new Date(linha[COL.DATA]);
      const cpfVenda = linha[COL.CPF].toString().replace(/\D/g, '');
      const cupomVenda = linha[COL.CUPOM].toString().trim().toUpperCase();
      const noPeriodo = dataVenda >= dInicio && dataVenda <= dFim;
      return noPeriodo && (cupomVenda === cupomLogado || cpfVenda === cpfLogado);
    })
    .map(v => ({
      data: v[COL.DATA],
      cliente: v[COL.NOME],
      produto: v[COL.PRODUTO],
      quantidade: parseInt(v[COL.QTD]) || 0,
      valorItem: parseFloat(v[COL.VALOR_TOTAL]) || 0,
      valorComissao: parseFloat(v[COL.COMISSAO]) || 0,
      pagoSaldo: parseFloat(v[COL.VALOR_SALDO]) || 0,
      pagoDinheiro: parseFloat(v[COL.VALOR_PAGO]) || 0,
      isCompraPropria: v[COL.CPF].toString().replace(/\D/g, '') === cpfLogado,
      tipoPagto: v[COL.TIPO_PAGTO],
    }));

  const somaComissao = itens.reduce((sum, item) => sum + item.valorComissao, 0);
  const totalMarmitas = itens.reduce((sum, item) => sum + item.quantidade, 0);
  exibirNaTela(itens, somaComissao, totalMarmitas);
}

function etiqueta(v) {
  if (v.tipoPagto === 'RETIRADA_ESTOQUE') return '<br><span class="etiqueta etiqueta-retirada">RETIRADA</span>';
  if (v.isCompraPropria) return '<br><span class="etiqueta etiqueta-propria">COMPRA PRÓPRIA</span>';
  return '';
}

function classeComissao(valor) {
  if (valor < 0) return 'comissao-negativa';
  if (valor > 0) return 'comissao-positiva';
  return 'comissao-zero';
}

function exibirNaTela(itens, comissaoPeriodo, qtdVendas) {
  if (itens.length === 0) {
    mensagemTabela('Sem movimentações no período.');
  } else {
    // data-label alimenta o layout de tabela no celular (relatorio.css)
    $('corpoRelatorio').innerHTML = itens.map(v => `
      <tr>
        <td data-label="Data">${new Date(v.data).toLocaleDateString('pt-BR')}</td>
        <td data-label="Cliente"><b>${escapeHtml(v.cliente)}</b> ${etiqueta(v)}</td>
        <td data-label="Produto">${escapeHtml(v.produto)}</td>
        <td data-label="Qtd" class="col-centro">${v.quantidade}x</td>
        <td data-label="Valor Total">R$ ${v.valorItem.toFixed(2)}</td>
        <td data-label="Pagamento" class="col-pagamento">
          S: R$ ${v.pagoSaldo.toFixed(2)} | P: R$ ${v.pagoDinheiro.toFixed(2)}
        </td>
        <td data-label="Comissão" class="${classeComissao(v.valorComissao)}">R$ ${v.valorComissao.toFixed(2)}</td>
      </tr>`).join('');
  }

  $('comissaoPeriodo').innerText = `R$ ${Math.max(0, comissaoPeriodo).toFixed(2)}`;
  $('totalVendas').innerText = qtdVendas;
  $('saldoValor').innerText = `R$ ${Storage.getUserBalance().toFixed(2)}`;
}
