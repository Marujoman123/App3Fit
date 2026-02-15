const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";
const btnFiltrar = document.getElementById("btnFiltrar");
const btnVoltar = document.getElementById("btnVoltar");
let cacheVendasGeral = [];


/**
 * 1. INICIALIZAÇÃO
 */
document.addEventListener('DOMContentLoaded', () => {
    const hoje = new Date();

    // Calcula a data de 30 dias atrás
    const trintadias = new Date();
    trintadias.setDate(hoje.getDate() - 30);

    document.getElementById('dataInicio').value = trintadias.toISOString().split('T')[0];
    document.getElementById('dataFim').value = hoje.toISOString().split('T')[0];

    sincronizarDadosVendas();
});

btnFiltrar.addEventListener('click', () => {
    sincronizarDadosVendas();
});

/**
 * 2. BUSCA DE DADOS (FETCH)
 */
async function sincronizarDadosVendas() {
    const tbody = document.getElementById('corpoRelatorio');

    tbody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 20px; font-weight: bold; color: #666;">
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
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Erro: ${data.message}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Erro de conexão ao carregar dados.</td></tr>`;
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
        // ÍNDICES DA PLANILHA VENDAS (Baseado no seu appendRow do Apps Script):
        // 0: ID | 1: Data | 2: CPF | 3: Nome | 4: Tipo | 5: Cod | 6: Produto | 7: Qtd 
        // 8: V. Unit | 9: V. Total | 10: Cupom | 11: V. Saldo | 12: V. Pago 
        // 13: V. Parceiro (Comissão) | 14: V. Liquido | 15: Tipo Pagto

        const dataVenda = new Date(linha[1]);
        const cpfVenda = linha[2].toString().replace(/\D/g, ""); 
        const cupomVenda = linha[10].toString().trim().toUpperCase(); // ÍNDICE CORRIGIDO PARA 10
        const tipoPagto = linha[15] ? linha[15].toString() : "";

        const pertenceAoPeriodo = dataVenda >= dInicio && dataVenda <= dFim;
        
        // Regra: Mostra se o cupom bate OU se o CPF é do logado OU se foi uma retirada feita pelo logado
        const eDoParceiro = (cupomVenda === cupomLogado) || 
                            (cpfVenda === cpfLogado) || 
                            (tipoPagto === "RETIRADA_ESTOQUE" && cpfVenda === cpfLogado);

        return pertenceAoPeriodo && eDoParceiro;
    });

    const relatorioFinal = vendasFiltradas.map(v => {
        const cpfVenda = v[2].toString().replace(/\D/g, "");
        const valorComissao = parseFloat(v[13]) || 0; // ÍNDICE CORRIGIDO PARA 13 (V. Parceiro)

        return {
            data: v[1],
            cliente: v[3],
            produto: v[6],
            quantidade: parseInt(v[7]) || 0, // ÍNDICE 7: Quantidade
            valorItem: parseFloat(v[9]) || 0, // Valor Total do Item (Índice 9)
            valorComissao: valorComissao,
            pagoSaldo: parseFloat(v[11]) || 0, // V. Saldo (Índice 11)
            pagoDinheiro: parseFloat(v[12]) || 0, // V. Pago (Índice 12)
            isCompraPropria: (cpfVenda === cpfLogado),
            tipoPagto: v[15]
        };
    });

    // Soma as comissões do período
    const somaComissao = relatorioFinal.reduce((sum, item) => sum + item.valorComissao, 0);

    // Vendas positivas para o card de contagem
    const apenasVendas = relatorioFinal.filter(item => item.valorComissao > 0);

   // Filtramos apenas vendas reais (comissão > 0) ou retiradas para somar o volume
    const totalMarmitasPeriodo = relatorioFinal.reduce((sum, item) => sum + item.quantidade, 0);

    exibirNaTela(relatorioFinal, somaComissao, totalMarmitasPeriodo);
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
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">Sem movimentações no período.</td></tr>`;
    } else {
        itens.forEach(v => {
            const tr = document.createElement('tr');
            
            let etiquetaExtra = "";
            if (v.tipoPagto === "RETIRADA_ESTOQUE") {
                etiquetaExtra = `<span style="font-size:10px; background:#6c757d; color:white; padding:2px 5px; border-radius:4px;">RETIRADA</span>`;
            } else if (v.isCompraPropria) {
                etiquetaExtra = `<span style="font-size:10px; background:#fff3cd; color:#856404; padding:2px 5px; border-radius:4px; border:1px solid #ffeeba;">COMPRA PRÓPRIA</span>`;
            }

            const corComissao = v.valorComissao < 0 ? "color: red;" : (v.valorComissao > 0 ? "color: green;" : "color: #666;");
            
            tr.innerHTML = `
                <td>${new Date(v.data).toLocaleDateString('pt-BR')}</td>
                <td>${v.cliente} <br>${etiquetaExtra}</td>
                <td>${v.produto} </td>
                <td style="text-align:center;">${v.quantidade}x</td>
                <td>R$ ${v.valorItem.toFixed(2)}</td>
                <td style="font-size:11px; color:#666;">
                    S: R$ ${v.pagoSaldo.toFixed(2)}<br>
                    P: R$ ${v.pagoDinheiro.toFixed(2)}
                </td>
                <td style="${corComissao} font-weight: bold;">R$ ${v.valorComissao.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Mata o zero negativo na comissão do período
    let valorPeriodoLimpo = (parseFloat(comissaoFiltrada) + 0);
    if (valorPeriodoLimpo < 0 && valorPeriodoLimpo > -0.01) valorPeriodoLimpo = 0;
    
   if (elComissaoPeriodo) elComissaoPeriodo.innerText = `R$ ${Math.max(0, comissaoFiltrada).toFixed(2)}`;
    if (elTotalVendas) elTotalVendas.innerText = qtdVendas;

    // Saldo Geral vindo do LocalStorage
    const saldoNoLogin = localStorage.getItem('usuario_saldo') || "0";
    if (elSaldoGeral) elSaldoGeral.innerText = `R$ ${parseFloat(saldoNoLogin).toFixed(2)}`;
}