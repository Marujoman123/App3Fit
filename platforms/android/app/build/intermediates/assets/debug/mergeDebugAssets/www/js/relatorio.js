const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";
const btnFiltrar = document.getElementById("btnFiltrar");
const btnVoltar = document.getElementById("btnVoltar");
let cacheVendasGeral = [];

/**
 * 1. INICIALIZAÇÃO
 */
document.addEventListener('DOMContentLoaded', () => {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');

    document.getElementById('dataInicio').value = `${ano}-${mes}-01`;
    document.getElementById('dataFim').value = agora.toISOString().split('T')[0];

    sincronizarDadosVendas();
});

btnFiltrar.addEventListener('click', () => {
    sincronizarDadosVendas();
});

btnVoltar.addEventListener('click', () => {
    window.location.href = "caixa.html";
});

/**
 * 2. BUSCA DE DADOS (FETCH)
 */
async function sincronizarDadosVendas() {
    const tbody = document.getElementById('corpoRelatorio');

    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 20px; font-weight: bold; color: #666;">
                Iniciando sincronização com a planilha...
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`${URL_SCRIPT}?buscarTodasVendas=true`);
        const data = await response.json();

        if (data.status === "success") {
            cacheVendasGeral = data.vendas;

            if (cacheVendasGeral.length > 0 && cacheVendasGeral[0][0] === "ID Venda") {
                cacheVendasGeral.shift();
            }

            filtrarEProcessarRelatorio();
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Erro: ${data.message}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Erro de conexão ao carregar dados.</td></tr>`;
    }
}

/**
 * 3. FILTRO E PROCESSAMENTO (LOCAL)
 */
function filtrarEProcessarRelatorio() {
    const cupomLogado = (localStorage.getItem('usuario_cupom') || "").toUpperCase().trim();
    const cpfLogado = (localStorage.getItem('usuario_cpf') || "").replace(/\D/g, "");
    const dataInicioStr = document.getElementById('dataInicio').value;
    const dataFimStr = document.getElementById('dataFim').value;

    if (!cupomLogado && !cpfLogado) return;

    const dInicio = new Date(dataInicioStr + "T00:00:00");
    const dFim = new Date(dataFimStr + "T23:59:59");

    const vendasFiltradas = cacheVendasGeral.filter(linha => {
        const dataVenda = new Date(linha[1]);
        const cpfVenda = linha[2].toString().replace(/\D/g, ""); 
        const cupomVenda = linha[8].toString().trim().toUpperCase();

        const pertenceAoPeriodo = dataVenda >= dInicio && dataVenda <= dFim;
        const eDoParceiro = (cupomVenda === cupomLogado) || (cpfVenda === cpfLogado);

        return pertenceAoPeriodo && eDoParceiro;
    });

    const relatorioFinal = vendasFiltradas.map(v => {
        const comissao = parseFloat(v[11]) || 0;
        const cpfVenda = v[2].toString().replace(/\D/g, "");

        return {
            data: v[1],
            cliente: v[3],
            produto: v[6],
            valorItem: parseFloat(v[7]),
            valorComissao: comissao,
            pagoSaldo: parseFloat(v[9]) || 0,
            pagoDinheiro: parseFloat(v[10]) || 0,
            isCompraPropria: (cpfVenda === cpfLogado)
        };
    });

    // Soma as comissões do período
    const somaComissao = relatorioFinal.reduce((sum, item) => sum + item.valorComissao, 0);

    // Vendas positivas para o card de contagem
    const apenasVendas = relatorioFinal.filter(item => item.valorComissao > 0);
    const quantidadeVendas = apenasVendas.length;

    exibirNaTela(relatorioFinal, somaComissao, quantidadeVendas);
}

/**
 * 4. RENDERIZAÇÃO NA TABELA
 */
function exibirNaTela(itens, comissaoFiltrada, qtdVendas) {
    const tbody = document.getElementById('corpoRelatorio');
    const elSaldoGeral = document.getElementById('saldoValor');
    const elComissaoPeriodo = document.getElementById('comissaoPeriodo');
    const elTotalVendas = document.getElementById('totalVendas');

    tbody.innerHTML = "";

    if (itens.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Sem movimentações.</td></tr>`;
    } else {
        itens.forEach(v => {
            const tr = document.createElement('tr');
            
            // Etiqueta de Tipo de Pagamento
            let etiquetaPagto = "";
            if (v.pagoSaldo > 0 && v.pagoDinheiro > 0) {
                etiquetaPagto = v.isCompraPropria ? `<span style="font-size:10px; background:#e0e0e0; padding:2px 5px; border-radius:4px; margin-right:5px;">Misto</span>`: "";
            } else if (v.pagoSaldo > 0) {
                etiquetaPagto = v.isCompraPropria ? `<span style="font-size:10px; background:#d1ecf1; color:#0c5460; padding:2px 5px; border-radius:4px; margin-right:5px;">Saldo</span>`: "";
            } else {
                etiquetaPagto = v.isCompraPropria ? `<span style="font-size:10px; background:#d4edda; color:#155724; padding:2px 5px; border-radius:4px; margin-right:5px;">Dinheiro/Cartão</span>`: "";
            }

            // Etiqueta de Compra Própria
            let etiquetaCompraPropria = v.isCompraPropria ? `<span style="font-size:10px; background:#fff3cd; color:#856404; padding:2px 5px; border-radius:4px; border:1px solid #ffeeba;">COMPRA PRÓPRIA</span>` : "";
            const corComissao = v.valorComissao < 0 ? "color: red;" : "color: green;";
            
            tr.innerHTML = `
                <td>${new Date(v.data).toLocaleDateString('pt-BR')}</td>
                <td>${v.cliente} <br>${etiquetaCompraPropria}</td>
                <td>${v.produto} </td>
                <td>R$ ${v.valorItem.toFixed(2)}</td>
                <td style="font-size:11px; color:#666;">
                    S: R$ ${v.pagoSaldo.toFixed(2)}<br>
                    D: R$ ${v.pagoDinheiro.toFixed(2)}<br>
                    ${etiquetaPagto}
                </td>
                <td style="${corComissao} font-weight: bold;">R$ ${v.valorComissao.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Mata o zero negativo na comissão do período
    let valorPeriodoLimpo = (parseFloat(comissaoFiltrada) + 0);
    if (valorPeriodoLimpo < 0 && valorPeriodoLimpo > -0.01) valorPeriodoLimpo = 0;
    
    if (elComissaoPeriodo) elComissaoPeriodo.innerText = `R$ ${valorPeriodoLimpo.toFixed(2)}`;
    if (elTotalVendas) elTotalVendas.innerText = qtdVendas;

    // Saldo Geral vindo do LocalStorage
    const saldoNoLogin = localStorage.getItem('usuario_saldo');
    if (elSaldoGeral) {
        const saldoGeralLimpo = (parseFloat(saldoNoLogin) + 0).toFixed(2);
        elSaldoGeral.innerText = `R$ ${saldoGeralLimpo}`;
    }
}