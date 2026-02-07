const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";

// ======================================================
// CONFIGURAÇÃO DE AMBIENTE
// ======================================================
const AMBIENTE = 'PROD'; // Troque para 'PROD' quando for usar a maquininha real e 'DESENV' para o desenvolvimento

const configMP = {
    token: "APP_USR-3577250795393962-011007-1f142324435256c80ac8559f4743683f-3117694591",
    deviceId: "PAX_Q92__Q92-1733541950",
    installments: 1,
    paymentType: "debit_card"
};

// Função de Arredondamento Financeiro (Crucial)
function gr(valor) {
    return Math.round((parseFloat(valor) + Number.EPSILON) * 100) / 100;
}



const tipoUsuario = localStorage.getItem('usuario_tipo');
const nomeUsuario = localStorage.getItem('usuario_nome');
const cpfUsuario = localStorage.getItem('usuario_cpf');


// RECUPERAÇÃO DE DADOS COM TRAVA DE CENTAVOS
const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
const totalOriginal = gr(parseFloat(localStorage.getItem('total_venda')) || 0);
const saldoDisponivel = gr(parseFloat(localStorage.getItem('usuario_saldo')) || 0);

let saldoUtilizadoTotal = 0;
let descontoAplicado = 0;

const btnValidar = document.getElementById('btnValidarCupom');
const inputCupom = document.getElementById('inputCupom');
const inputSaldo = document.getElementById('inputUsarSaldo');
const btnConfirmar = document.getElementById('btnConfirmarPagamento');

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
        const qtd = item.quantidade || 1;
        // CORREÇÃO: Arredondando subtotal do item
        const subtotal = gr(gr(item.preco) * qtd);

        p.style.fontSize = "0.9rem"; p.style.margin = "5px 0";
        p.innerHTML = `• ${qtd}x ${item.nome} <span style="float:right;">R$ ${subtotal.toFixed(2)}</span>`;
        containerLista.appendChild(p);
    });
}


// Se for retirada, esconde a seção de cupom na interface
if (localStorage.getItem('travar_cupom') === 'true') {
    const containerCupom = document.getElementById('containerCupom');
    if (containerCupom) {
        containerCupom.style.display = 'none';
        // console.log("Interface de cupom desabilitada para Retirada.");
    }
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
            // CORREÇÃO: Arredondando o desconto de 10%
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
    // CORREÇÃO: Arredondando saldo manual
    saldoUtilizadoTotal = gr(parseFloat(inputSaldo.value) || 0);
    if (saldoUtilizadoTotal > saldoDisponivel) saldoUtilizadoTotal = saldoDisponivel;
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

async function dispararPagamentoNaMaquina() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");

    // Mostra o status imediatamente
    exibirStatusPagamento("Aguardando ação na Maquininha...");

    // Chamamos o processamento final
    await processarVendaFinal();
}

btnConfirmar.addEventListener('click', abrirModalPagamento);

async function processarVendaFinal() {
    const idVendaUnico = "V" + Date.now();
    const dataHora = new Date().toLocaleString('pt-BR');
    const cupomTexto = (inputCupom.value.trim() !== "") ? inputCupom.value.toUpperCase() : "NENHUM";

    // 1. Mapeamento inicial dos itens
    const jsonVendaFinal = carrinho.map(item => {
        const qtd = item.quantidade || 1;
        const valorUnitario = gr(parseFloat(item.preco));
        const valorLinhaOriginal = gr(valorUnitario * qtd);
        const proporcao = valorLinhaOriginal / totalOriginal;

        const descDesteItem = gr(descontoAplicado * proporcao);
        const valorComDescontoCupom = gr(valorLinhaOriginal - descDesteItem);
        const saldoDesteItem = gr(saldoUtilizadoTotal * proporcao);
        const valorPagoDesteItem = gr(Math.max(0, gr(valorComDescontoCupom - saldoDesteItem)));

        let comissao = (descontoAplicado > 0) ? gr(valorLinhaOriginal * 0.10) : 0;
        if (tipoUsuario === "Parceiro" && saldoDesteItem > 0) {
            comissao = gr(-saldoDesteItem);
        }

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
            "Valor liquido": gr(Math.max(0, gr(valorPagoDesteItem - (comissao > 0 ? comissao : 0)))),
            "Tipo Pagamento": "PROCESSANDO"
        };
    });

    const modoManual = localStorage.getItem('modo_pagamento_manual') === 'true';
    const isRetirada = localStorage.getItem('travar_cupom') === 'true'; // Identifica se veio do botão Retirada
    const valorTotalPago = gr(jsonVendaFinal.reduce((acc, i) => acc + i["ValorPAgo"], 0));
    const valorTotalCentavos = Math.round(valorTotalPago * 100);

    try {
        let podeGravar = false;

        // --- ROTA A: LANÇAMENTO MANUAL OU SALDO TOTAL (Bypassa a Maquininha) ---
        if (modoManual || valorTotalCentavos === 0) {
            
            // Lógica de nomes para o banco de dados
            let labelTipo;
            if (isRetirada) {
                labelTipo = "RETIRADA_ESTOQUE";
            } else if (modoManual) {
                labelTipo = "MANUAL_DIN_PIX";
            } else {
                labelTipo = "SALDO_OU_CUPOM";
            }

            jsonVendaFinal.forEach(item => {
                item["Tipo Pagamento"] = labelTipo;
            });
            
            podeGravar = true;
            localStorage.removeItem('modo_pagamento_manual');
            localStorage.removeItem('travar_cupom'); 
        } 
        
        // --- ROTA B: AMBIENTE DE PRODUÇÃO (Usa Maquininha Real) ---
        else if (AMBIENTE === 'PROD') {
            const payload = {
                config: {
                    token: configMP.token,
                    deviceId: configMP.deviceId,
                    amount: valorTotalCentavos
                },
                itens: jsonVendaFinal
            };

            const response = await fetch(URL_SCRIPT, { method: 'POST', body: JSON.stringify(payload) });
            const resIntent = await response.json();

            if (resIntent.status === "success" && resIntent.intent_id) {
                exibirStatusPagamento("Enviado para a Maquininha... <br><br> <b style='color:green'>Se a tela não acender, aperte o botão 'VERDE' na máquina!</b>");
                
                let pago = false;
                let tentativas = 0;
                const maxTentativas = 40;

                while (!pago && tentativas < maxTentativas) {
                    tentativas++;
                    await new Promise(r => setTimeout(r, 3000));

                    const check = await fetch(`${URL_SCRIPT}?verificarPagamento=${resIntent.intent_id}&token=${configMP.token}`);
                    const statusMP = await check.json();

                    if (statusMP.status === "approved") {
                        pago = true;
                        podeGravar = true;
                        const tipoReal = statusMP.raw_status || "CARTAO_MAQUININHA";
                        jsonVendaFinal.forEach(item => { item["Tipo Pagamento"] = tipoReal; });
                        console.log("Pagamento aprovado!");
                    } else if (statusMP.status === "canceled") {
                        alert("Pagamento cancelado ou erro na maquininha.");
                        location.reload();
                        return;
                    }
                }
            } else {
                throw new Error("Erro ao criar intenção de pagamento.");
            }
        } 
        
        // --- ROTA C: AMBIENTE DE DESENVOLVIMENTO (Simulação) ---
        else {
            console.log("Simulando aprovação (Modo DESENV)...");
            await new Promise(r => setTimeout(r, 2000));
            jsonVendaFinal.forEach(item => {
                item["Tipo Pagamento"] = "MODO_TESTE";
            });
            podeGravar = true;
        }

        // --- FINALIZAÇÃO: GRAVAÇÃO NA PLANILHA ---
        if (podeGravar) {
            exibirStatusPagamento("Registrando venda na planilha...");

            const resFinal = await fetch(URL_SCRIPT, {
                method: 'POST',
                body: JSON.stringify({
                    acao: "registrarVendaFinal",
                    dados: jsonVendaFinal
                })
            });

            const finalData = await resFinal.json();

            if (finalData.status === "success") {
                alert("Sucesso! Venda registrada.");
                localStorage.removeItem('carrinho');
                window.location.href = "index.html";
            } else {
                throw new Error(finalData.message || "Erro ao registrar na planilha.");
            }
        }

    } catch (e) {
        alert("Erro no processo: " + e.message);
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