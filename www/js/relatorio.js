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

// Evento de Clique
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

    // EXIBE MENSAGEM DE CARREGAMENTO NO LUGAR DA TABELA
    tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 20px; font-weight: bold; color: #666;">
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
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Erro: ${data.message}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Erro de conexão ao carregar dados.</td></tr>`;
    }
}

/**
 * 3. FILTRO E PROCESSAMENTO (LOCAL)
 * Agora filtra por CUPOM ou por CPF do parceiro logado
 */
function filtrarEProcessarRelatorio() {
    const cupomLogado = localStorage.getItem('usuario_cupom') || "";
    const cpfLogado = localStorage.getItem('usuario_cpf') || ""; // Certifique-se de salvar o CPF no login
    const dataInicioStr = document.getElementById('dataInicio').value;
    const dataFimStr = document.getElementById('dataFim').value;

    if (!cupomLogado && !cpfLogado) return;

    const dInicio = new Date(dataInicioStr + "T00:00:00");
    const dFim = new Date(dataFimStr + "T23:59:59");

    // Limpa o CPF para comparação (apenas números)
    const cpfLimpo = cpfLogado.replace(/\D/g, "");

    const vendasFiltradas = cacheVendasGeral.filter(linha => {
        const dataVenda = new Date(linha[1]);
        const cpfVenda = linha[2].toString().replace(/\D/g, ""); // Coluna C: CPF
        const cupomVenda = linha[8].toString().trim().toUpperCase(); // Coluna I: Cupom

        const pertenceAoPeriodo = dataVenda >= dInicio && dataVenda <= dFim;

        // NOVA LÓGICA: Se o cupom bate OU se o CPF do comprador é o dele
        const eDoParceiro = (cupomVenda === cupomLogado.toUpperCase().trim()) || (cpfVenda === cpfLimpo);

        return pertenceAoPeriodo && eDoParceiro;
    });

    // Mapeamento para exibição
    const relatorioFinal = vendasFiltradas.map(v => {
        const comissao = parseFloat(v[11]) || 0;
        const cpfVenda = v[2].toString().replace(/\D/g, "");

        return {
            data: v[1],
            cliente: v[3],
            produto: v[6],
            valorItem: parseFloat(v[7]),
            valorComissao: comissao,
            // Identifica se é uma compra própria para sinalizar na tabela
            isCompraPropria: (cpfVenda === cpfLimpo)
        };
    });

    const saldoTotal = relatorioFinal.reduce((sum, item) => sum + item.valorComissao, 0);

    // Vendas positivas (ignorando retiradas e compras próprias negativas no card de contagem)
    const apenasVendas = relatorioFinal.filter(item => item.valorComissao > 0);
    const quantidadeVendas = apenasVendas.length;

    exibirNaTela(relatorioFinal, saldoTotal, quantidadeVendas);
}

/**
 * 4. RENDERIZAÇÃO NA TABELA (Com sinalização de Compra Própria)
 */
function exibirNaTela(itens, comissaoFiltrada, qtdVendas) {
    const tbody = document.getElementById('corpoRelatorio');
    const elSaldoGeral = document.getElementById('saldoValor'); // Do LocalStorage ou Global
    const elComissaoPeriodo = document.getElementById('comissaoPeriodo');
    const elTotalVendas = document.getElementById('totalVendas');

    tbody.innerHTML = "";

    // 1. Preenche a tabela
    if (itens.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Sem movimentações.</td></tr>`;
    } else {
        itens.forEach(v => {
            const tr = document.createElement('tr');
            const cor = v.valorComissao < 0 ? "color: red;" : "color: green;";
            tr.innerHTML = `
                <td>${new Date(v.data).toLocaleDateString('pt-BR')}</td>
                <td>${v.cliente}</td>
                <td>${v.produto}</td>
                <td>R$ ${v.valorItem.toFixed(2)}</td>
                <td style="${cor} font-weight: bold;">R$ ${v.valorComissao.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 2. Trata o valor da comissão do período (Mata o zero negativo)
    let valorPeriodoLimpo = (parseFloat(comissaoFiltrada) + 0);
    if (valorPeriodoLimpo < 0 && valorPeriodoLimpo > -0.01) valorPeriodoLimpo = 0;
    
    // 3. Atualiza os Cards
    if (elComissaoPeriodo) elComissaoPeriodo.innerText = `R$ ${valorPeriodoLimpo.toFixed(2)}`;
    if (elTotalVendas) elTotalVendas.innerText = qtdVendas;

    // 4. Saldo Geral (O saldo total que ele tem na conta, pegando do login atualizado)
    const saldoNoLogin = localStorage.getItem('usuario_saldo');
    if (elSaldoGeral) {
        const saldoGeralLimpo = (parseFloat(saldoNoLogin) + 0).toFixed(2);
        elSaldoGeral.innerText = `R$ ${saldoGeralLimpo}`;
    }
}

//     if (saldoTxt) {
//     let valorFinal = parseFloat(saldo);

//     // 1. Arredonda para 2 casas decimais para eliminar resíduos infinitesimais
//     // Ex: -0.0000000001 vira -0.00
//     let valorArredondado = Number(valorFinal.toFixed(2));

//     // 2. Se o valor arredondado for ZERO (ou seja, 0 ou -0), 
//     // usamos Math.abs para garantir que o sinal suma
//     if (valorArredondado === 0) {
//         valorArredondado = Math.abs(valorArredondado);
//     }

//     saldoTxt.innerText = `R$ ${valorArredondado.toFixed(2)}`;
// }

//     if (totalVendasTxt) {
//         totalVendasTxt.innerText = qtdVendas;
//     }
// }