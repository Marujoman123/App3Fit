const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";

// ======================================================
// CONFIGURAÇÃO DE AMBIENTE
// ======================================================
const AMBIENTE = 'DESENV'; // 'PROD' para real, 'DESENV' para testes

const configMP = {
    token: "APP_USR-3577250795393962-011007-1f142324435256c80ac8559f4743683f-3117694591",
    deviceId: "PAX_Q92__Q92-1733541950",
    installments: 1,
    paymentType: "debit_card" // Será alterado pelo modal
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
    carrinho.forEach(item => {
        const p = document.createElement('p');
        p.style.fontSize = "0.9rem"; p.style.margin = "5px 0";
        p.innerHTML = `• ${item.nome} <span style="float:right;">R$ ${gr(parseFloat(item.preco)).toFixed(2)}</span>`;
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
        elSaldoUsado.innerHTML = 'Saldo de ' + saldoUtilizadoTotal + ' aplicado !' 
        document.getElementById('valorSaldoAbatido').innerText = saldoUtilizadoTotal.toFixed(2);
    }
}

// ======================================================
// EVENTOS DE CUPOM E SALDO
// ======================================================

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
            // 2. Só faça o split se o cupom for válido e o parceiro existir
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
        console.error(e);
        alert("Erro ao conectar com o servidor para validar cupom.");
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

// Função disparada pelos botões do Modal
async function selecionarPagamento(tipo) {

    // Mapeamento para a API do Mercado Pago
    const mapaTipos = {
        'CREDITO': 'credit_card',
        'DEBITO': 'debit_card',
        'PIX': 'bank_transfer',
        'VOUCHER': 'voucher'
    };

    configMP.paymentType = mapaTipos[tipo] || 'debit_card';

    // Muda o visual do modal para o Spinner antes de começar
    exibirStatusPagamento("Aguardando pagamento na Máquina...");

    // Inicia o processamento
    await processarVendaFinal();
}

// O botão confirmar agora apenas abre o modal
btnConfirmar.addEventListener('click', abrirModalPagamento);

async function processarVendaFinal() {
    const originalText = btnConfirmar.innerText;
    const idVendaUnico = "V" + Date.now();
    const dataHora = new Date().toLocaleString('pt-BR');
    const cupomTexto = (inputCupom.value.trim() !== "") ? inputCupom.value.toUpperCase() : "NENHUM";

    // Preparação dos itens para gravação
    const jsonVendaFinal = carrinho.map(item => {
        const valorItemOriginal = gr(parseFloat(item.preco));
        const proporcao = valorItemOriginal / totalOriginal;
        const valorComDescontoCupom = gr(valorItemOriginal - (descontoAplicado * proporcao));
        const saldoDesteItem = gr(saldoUtilizadoTotal * proporcao);
        const valorPagoDesteItem = gr(Math.max(0, valorComDescontoCupom - saldoDesteItem));

        let comissao = (descontoAplicado > 0) ? gr(valorItemOriginal * 0.10) : 0;
        if (tipoUsuario === "Parceiro" && saldoDesteItem > 0) comissao = -saldoDesteItem;

        return {
            "ID Venda": idVendaUnico,
            "Data/Hora": dataHora,
            "CPF": cpfUsuario.replace(/\D/g, ""),
            "Nome": nomeUsuario,
            "Tipo": tipoUsuario,
            "Cod": item.codigo,
            "Produto": item.nome,
            "Valor Item": valorItemOriginal,
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

        // --- LÓGICA MODO PRODUÇÃO ---
        if (AMBIENTE === 'PROD' && valorTotalCentavos > 0) {
            const payload = {
                config: { ...configMP, amount: valorTotalCentavos },
                itens: jsonVendaFinal
            };

            const response = await fetch(URL_SCRIPT, { method: 'POST', body: JSON.stringify(payload) });
            const resIntent = await response.json();

            if (resIntent.status === "success" && resIntent.intent_id) {
                let pago = false;
                const tempoLimiteSegundos = 120; // 2 minutos de limite
                const intervaloSegundos = 3;
                let tentativas = 0;
                const maxTentativas = tempoLimiteSegundos / intervaloSegundos;

                while (!pago && tentativas < maxTentativas) {
                    tentativas++;

                    // Atualiza o subtítulo para mostrar o tempo restante (opcional)
                    const segundosRestantes = tempoLimiteSegundos - (tentativas * intervaloSegundos);
                    exibirStatusPagamento(`Aguardando pagamento na Máquina... (${segundosRestantes}s)`);

                    await new Promise(r => setTimeout(r, intervaloSegundos * 1000));

                    try {
                        const check = await fetch(`${URL_SCRIPT}?verificarPagamento=${resIntent.intent_id}&token=${configMP.token}`);
                        const statusMP = await check.json();

                        if (statusMP.state === "FINISHED") {
                            pago = true;
                            podeGravar = true;
                        } else if (statusMP.state === "CANCELED" || statusMP.state === "ERROR") {
                            alert("Pagamento cancelado ou erro na maquininha.");
                            location.reload();
                            return;
                        }
                    } catch (err) {
                        console.error("Erro na checagem:", err);
                        // Continua tentando mesmo se der um erro de rede temporário
                    }
                }

                if (!pago) {
                    alert("Tempo limite excedido. O pagamento não foi detectado.");
                    location.reload();
                    return;
                }
            } else {
                throw new Error(resIntent.message || "Erro ao gerar intenção de pagamento.");
            }

            // --- LÓGICA MODO DESENVOLVIMENTO ---
        } else {
            console.warn("MODO DESENV: Aguardando 5 segundos simulados...");
            await new Promise(r => setTimeout(r, 5000)); // Simulação de 5 segundos
            podeGravar = true;
        }

        // --- GRAVAÇÃO NA PLANILHA ---
        if (podeGravar) {
            exibirStatusPagamento("Pagamento Confirmado! Registrando venda...");
            const resFinal = await fetch(`${URL_SCRIPT}?registrarVendaFinal=${encodeURIComponent(JSON.stringify(jsonVendaFinal))}`);
            const finalData = await resFinal.json();

            if (finalData.status === "success") {
                alert("Venda concluída com sucesso!");
                localStorage.removeItem('carrinho');
                window.location.href = "index.html";
            }
        }

    } catch (e) {
        alert("Erro: " + e.message);
        location.reload(); // Em caso de erro, reseta o estado para o cliente tentar de novo
    }
}


// FUNÇÃO PARA MUDAR O CONTEÚDO DO MODAL
function exibirStatusPagamento(mensagem) {
    const modalContent = document.querySelector('.modal-content');
    modalContent.innerHTML = `
        <div class="spinner"></div>
        <h3>${mensagem}</h3>
        <p>Não feche esta tela até a conclusão.</p>
    `;
}

// Inicialização
atualizarResumoTela();