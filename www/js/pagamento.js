const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";

// ======================================================
// CONFIGURAÇÃO DE AMBIENTE
// ======================================================
const AMBIENTE = 'DESENV'; 

const configMP = {
    token: "APP_USR-3577250795393962-011007-1f142324435256c80ac8559f4743683f-3117694591",
    deviceId: "PAX_Q92__Q92-1733541950",
    installments: 1,
    paymentType: "debit_card" 
};

// RECUPERAÇÃO DE DADOS
const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
const totalOriginal = gr(parseFloat(localStorage.getItem('total_venda')) || 0);
const tipoUsuario = localStorage.getItem('usuario_tipo');
const nomeUsuario = localStorage.getItem('usuario_nome');
const cpfUsuario = localStorage.getItem('usuario_cpf');
const saldoDisponivel = gr(parseFloat(localStorage.getItem('usuario_saldo')) || 0);

let saldoUtilizadoTotal = 0;
let descontoAplicado = 0;

const btnValidar = document.getElementById('btnValidarCupom');
const inputCupom = document.getElementById('inputCupom');
const inputSaldo = document.getElementById('inputUsarSaldo');
const btnConfirmar = document.getElementById('btnConfirmarPagamento');

function gr(valor) {
    return Math.round((parseFloat(valor) + Number.EPSILON) * 100) / 100;
}

// ======================================================
// LÓGICA DE INTERFACE E RENDERIZAÇÃO
// ======================================================

if (tipoUsuario === "Parceiro") {
    document.getElementById('containerSaldo').style.display = 'block';
    document.getElementById('txtSaldoDisponivel').innerText = saldoDisponivel.toFixed(2);
    document.getElementById('containerCupom').style.display = 'none';
}

const containerLista = document.getElementById('listaItensPagamento');
if (carrinho.length === 0) {
    containerLista.innerHTML = "<p>Carrinho vazio</p>";
} else {
    // ATUALIZADO: Mostra quantidade x preço no resumo
    carrinho.forEach(item => {
        const p = document.createElement('p');
        const qtd = item.quantidade || 1;
        const subtotal = gr(parseFloat(item.preco) * qtd);
        
        p.style.fontSize = "0.9rem"; p.style.margin = "5px 0";
        p.innerHTML = `• ${qtd}x ${item.nome} <span style="float:right;">R$ ${subtotal.toFixed(2)}</span>`;
        containerLista.appendChild(p);
    });
}

function atualizarResumoTela() {
    const totalComDesconto = gr(totalOriginal - descontoAplicado);
    const totalFinal = gr(Math.max(0, totalComDesconto - saldoUtilizadoTotal));

    document.getElementById('totalOriginal').innerText = totalOriginal.toFixed(2);
    document.getElementById('totalFinal').innerText = totalFinal.toFixed(2);

    const elDesconto = document.getElementById('valorDesconto');
    if (elDesconto) {
        elDesconto.innerHTML = "Desconto: <b>R$" + descontoAplicado.toFixed(2) + "</b>";
    }

    const elSaldoUsado = document.getElementById('txtSaldoUsado');
    if (elSaldoUsado) {
        elSaldoUsado.style.display = saldoUtilizadoTotal > 0 ? 'block' : 'none';
        elSaldoUsado.innerHTML = 'Saldo de R$ ' + saldoUtilizadoTotal.toFixed(2) + ' aplicado!';
    }
}

// (Eventos de Cupom e Saldo permanecem iguais...)
btnValidar.addEventListener('click', async () => {
    const cupom = inputCupom.value.trim().toUpperCase();
    const textoCupom = document.getElementById("txtCumpom");
    const valorDesconto = document.getElementById("valorDesconto");
    if (!cupom) {
        descontoAplicado = 0;
        atualizarResumoTela();
        return;
    }
    btnValidar.innerText = "...";
    try {
        const response = await fetch(`${URL_SCRIPT}?validarCupom=${cupom}`);
        const data = await response.json();
        if (data.status === "success") {
            const nomeParceiro = data.parceiro ? data.parceiro.split(" ")[0] : "Parceiro";
            descontoAplicado = gr(totalOriginal * 0.10);
            valorDesconto.style.display = 'block';
            textoCupom.style.display = 'block';
            textoCupom.style.color = 'Green';
            textoCupom.innerHTML = "Cupom de " + nomeParceiro + " aplicado: 10% de desconto!";
            atualizarResumoTela();
        } else {
            descontoAplicado = 0;
            valorDesconto.style.display = 'none';
            textoCupom.style.display = 'block';
            textoCupom.style.color = 'red';
            textoCupom.innerHTML = "Cupom inválido ou expirado.";
            atualizarResumoTela();
        }
    } catch (e) {
        alert("Erro ao conectar com o servidor.");
    } finally {
        btnValidar.innerText = "Validar";
    }
});

document.getElementById('btnAplicarSaldo').addEventListener('click', () => {
    saldoUtilizadoTotal = gr(parseFloat(inputSaldo.value) || 0);
    atualizarResumoTela();
});

// ======================================================
// FLUXO DE PAGAMENTO E MODAL
// ======================================================

function abrirModalPagamento() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    document.getElementById('modalPagamento').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modalPagamento').style.display = 'none';
}

async function selecionarPagamento(tipo) {
    const mapaTipos = {
        'CREDITO': 'credit_card',
        'DEBITO': 'debit_card',
        'PIX': 'bank_transfer',
        'VOUCHER': 'voucher'
    };
    configMP.paymentType = mapaTipos[tipo] || 'debit_card';
    exibirStatusPagamento("Aguardando pagamento na Máquina...");
    await processarVendaFinal();
}

btnConfirmar.addEventListener('click', abrirModalPagamento);

async function processarVendaFinal() {
    const idVendaUnico = "V" + Date.now();
    const dataHora = new Date().toLocaleString('pt-BR');
    const cupomTexto = (inputCupom.value.trim() !== "") ? inputCupom.value.toUpperCase() : "NENHUM";

    // ATUALIZADO: Preparação dos itens com Quantidade e Valor Total por linha
    const jsonVendaFinal = carrinho.map(item => {
        const qtd = item.quantidade || 1;
        const valorUnitario = gr(parseFloat(item.preco));
        const valorLinhaOriginal = gr(valorUnitario * qtd);
        
        // Proporção baseada no valor total da linha sobre o total da venda
        const proporcao = valorLinhaOriginal / totalOriginal;
        const valorComDescontoCupom = gr(valorLinhaOriginal - (descontoAplicado * proporcao));
        const saldoDesteItem = gr(saldoUtilizadoTotal * proporcao);
        const valorPagoDesteItem = gr(Math.max(0, valorComDescontoCupom - saldoDesteItem));

        let comissao = (descontoAplicado > 0) ? gr(valorLinhaOriginal * 0.10) : 0;
        if (tipoUsuario === "Parceiro" && saldoDesteItem > 0) comissao = -saldoDesteItem;

        return {
            "ID Venda": idVendaUnico,
            "Data/Hora": dataHora,
            "CPF": cpfUsuario.replace(/\D/g, ""),
            "Nome": nomeUsuario,
            "Tipo": tipoUsuario,
            "Cod": item.codigo,
            "Produto": item.nome,
            "Quantidade": qtd,
            "Valor Unit": valorUnitario,
            "Valor Total Item": valorLinhaOriginal,
            "cupom": cupomTexto,
            "ValoremSaldo": saldoDesteItem,
            "ValorPAgo": valorPagoDesteItem,
            "Valor parceiro": comissao,
            "Valor liquido": gr(Math.max(0, valorPagoDesteItem - (comissao > 0 ? comissao : 0))),
            "Tipo Pagamento": configMP.paymentType
        };
    });

    const valorTotalPago = jsonVendaFinal.reduce((acc, i) => acc + i["ValorPAgo"], 0);
    const valorTotalCentavos = Math.round(valorTotalPago * 100);

    try {
        let podeGravar = false;

        if (AMBIENTE === 'PROD' && valorTotalCentavos > 0) {
            const payload = {
                config: { ...configMP, amount: valorTotalCentavos },
                itens: jsonVendaFinal
            };

            const response = await fetch(URL_SCRIPT, { method: 'POST', body: JSON.stringify(payload) });
            const resIntent = await response.json();

            if (resIntent.status === "success" && resIntent.intent_id) {
                let pago = false;
                let tentativas = 0;
                const maxTentativas = 40; // 40 * 3s = 120s

                while (!pago && tentativas < maxTentativas) {
                    tentativas++;
                    await new Promise(r => setTimeout(r, 3000));

                    const check = await fetch(`${URL_SCRIPT}?verificarPagamento=${resIntent.intent_id}&token=${configMP.token}`);
                    const statusMP = await check.json();

                    if (statusMP.state === "FINISHED") {
                        pago = true;
                        podeGravar = true;
                    } else if (statusMP.state === "CANCELED" || statusMP.state === "ERROR") {
                        alert("Pagamento cancelado ou erro.");
                        location.reload();
                        return;
                    }
                }
            }
        } else {
            // MODO DESENV: Simula espera e libera gravação
            await new Promise(r => setTimeout(r, 5000));
            podeGravar = true;
        }

        if (podeGravar) {
            exibirStatusPagamento("Registrando venda na planilha...");
            const resFinal = await fetch(`${URL_SCRIPT}?registrarVendaFinal=${encodeURIComponent(JSON.stringify(jsonVendaFinal))}`);
            const finalData = await resFinal.json();

            if (finalData.status === "success") {
                alert("Sucesso! Venda registrada.");
                localStorage.removeItem('carrinho');
                window.location.href = "index.html";
            }
        }
    } catch (e) {
        alert("Erro: " + e.message);
        location.reload();
    }
}

function exibirStatusPagamento(mensagem) {
    const modalContent = document.querySelector('.modal-content');
    modalContent.innerHTML = `
        <div class="spinner"></div>
        <h3>${mensagem}</h3>
        <p>Não feche esta tela.</p>
    `;
}

atualizarResumoTela();