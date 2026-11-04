import CONFIG from './config.js';
import API from './api.js';
import Router from './router.js';
import ErrorHandler from './errorHandler.js';
import { escapeHtml } from './utils.js';
import { exigirAcesso } from './acesso.js';

const $ = (id) => document.getElementById(id);

if (exigirAcesso([CONFIG.USER_TYPES.PARCEIRO, CONFIG.USER_TYPES.PROPRIETARIO])) {
  $('btnVoltar').addEventListener('click', () => Router.backToPanel());
  $('btnPDF').addEventListener('click', gerarPDF);
  carregarEstoque();
}

function classeQuantidade(qtd) {
  if (qtd <= 2) return 'qtd-critica';
  if (qtd <= 4) return 'qtd-baixa';
  return '';
}

async function carregarEstoque() {
  try {
    const json = await API.getAllProducts();
    if (json.status !== 'success') throw new Error(json.message || 'Resposta inválida');

    $('corpoTabela').innerHTML = json.produtos
      .filter(p => String(p.linha).toUpperCase() !== 'TESTE')
      .map(p => `
        <tr>
          <td>${escapeHtml(p.linha)}</td>
          <td>${escapeHtml(p.nome)}</td>
          <td class="${classeQuantidade(p.quantidade)}">${escapeHtml(p.quantidade)}</td>
        </tr>`)
      .join('');

    $('loadingEstoque').classList.add('oculto');
    $('tabelaEstoque').classList.remove('oculto');
    $('btnPDF').classList.remove('oculto');
  } catch (error) {
    ErrorHandler.log('Erro ao carregar estoque:', error);
    $('loadingEstoque').innerText = 'Erro na conexão.';
  }
}

function gerarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Relatório de Estoque - 3Fit', 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 28);

  doc.autoTable({
    html: '#tabelaEstoque',
    startY: 35,
    theme: 'grid',
    headStyles: { fillColor: [255, 144, 69] },
  });

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const nomeArquivo = `estoque_3fit_${Date.now()}.pdf`;

  if (isMobile || !window.open(doc.output('bloburl'), '_blank')) {
    doc.save(nomeArquivo);
  }
}
