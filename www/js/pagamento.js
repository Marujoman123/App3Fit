// ======================================================
// CONFIGURAÇÕES GERAIS E AMBIENTE
// ======================================================
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";
const AMBIENTE = 'PROD'; // 'PROD' para maquininha real | 'DESENV' para testes

const configMP = {
    token: "APP_USR-3577250795393962-011007-1f142324435256c80ac8559f4743683f-3117694591",
    deviceId: "PAX_Q92__Q92-1733541950"
};

// Variáveis de Controle Global (Idempotência e Trava de Clique)
// Gerar o ID uma única vez evita cobranças duplicadas se a rede oscilar
// Tenta pegar um ID que já existe nesta aba do navegador, se não existir, cria um novo
let idVendaGlobal = sessionStorage.getItem('idVendaAtual');
if (!idVendaGlobal) {
    idVendaGlobal = "V" + Date.now();
    sessionStorage.setItem('idVendaAtual', idVendaGlobal);
}

let pagamentoEmAndamento = false;

// Dados do Usuário e Carrinho
const tipoUsuario = localStorage.getItem('usuario_tipo');
const nomeUsuario = localStorage.getItem('usuario_nome');
const cpfUsuario = localStorage.getItem('usuario_cpf');
const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
const totalOriginal = gr(parseFloat(localStorage.getItem('total_venda')) || 0);
const saldoDisponivel = gr(parseFloat(localStorage.getItem('usuario_saldo')) || 0);

let saldoUtilizadoTotal = 0;
let descontoAplicado = 0;

// Elementos da Interface
const btnValidar = document.getElementById('btnValidarCupom');
const inputCupom = document.getElementById('inputCupom');
const inputSaldo = document.getElementById('inputUsarSaldo');
const btnConfirmar = document.getElementById('btnConfirmarPagamento');

// ======================================================
// INICIALIZAÇÃO E RENDERIZAÇÃO
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
    renderizarItens();
    configurarInterfaceUsuario();
    atualizarResumoTela();
});

function configurarInterfaceUsuario() {
    if (tipoUsuario === "Parceiro") {
        document.getElementById('containerSaldo').style.display = 'block';
        document.getElementById('txtSaldoDisponivel').innerText = saldoDisponivel.toFixed(2);
        document.getElementById('containerCupom').style.display = 'none';

        // Sugere o uso de saldo automaticamente
        let valorSugerido = Math.min(totalOriginal, saldoDisponivel);
        if (inputSaldo) {
            inputSaldo.value = valorSugerido.toFixed(2);
            saldoUtilizadoTotal = gr(valorSugerido);
        }
    }

    if (localStorage.getItem('travar_cupom') === 'true') {
        const container = document.getElementById('containerCupom');
        if (container) container.style.display = 'none';
    }
}

function renderizarItens() {
    const container = document.getElementById('listaItensPagamento');
    if (carrinho.length === 0) {
        container.innerHTML = "<p>Carrinho vazio</p>";
        return;
    }
    carrinho.forEach(item => {
        const p = document.createElement('p');
        const subtotal = gr(gr(item.preco) * (item.quantidade || 1));
        p.style.fontSize = "0.9rem";
        p.innerHTML = `• ${item.quantidade}x ${item.nome} <span style="float:right;">R$ ${subtotal.toFixed(2)}</span>`;
        container.appendChild(p);
    });
}

function atualizarResumoTela() {
    const totalComDesconto = gr(totalOriginal - descontoAplicado);
    const totalFinal = gr(Math.max(0, totalComDesconto - saldoUtilizadoTotal));

    document.getElementById('totalOriginal').innerText = totalOriginal.toFixed(2);
    document.getElementById('totalFinal').innerText = totalFinal.toFixed(2);

    const elDesc = document.getElementById('valorDesconto');
    if (elDesc) elDesc.innerHTML = `Desconto: <b>R$ ${descontoAplicado.toFixed(2)}</b>`;

    const elSaldo = document.getElementById('txtSaldoUsado');
    if (elSaldo) {
        elSaldo.style.display = saldoUtilizadoTotal > 0 ? 'block' : 'none';
        elSaldo.innerHTML = `Saldo de R$ ${saldoUtilizadoTotal.toFixed(2)} aplicado!`;
    }
}

// ======================================================
// LOGICA DE CUPOM E SALDO
// ======================================================

btnValidar.onclick = async () => {
    const cupom = inputCupom.value.trim().toUpperCase();
    if (!cupom) { descontoAplicado = 0; atualizarResumoTela(); return; }

    btnValidar.innerText = "...";
    try {
        const res = await fetch(`${URL_SCRIPT}?validarCupom=${cupom}`);
        const data = await res.json();
        if (data.status === "success") {
            descontoAplicado = gr(totalOriginal * 0.10);
            document.getElementById("txtCumpom").innerHTML = "Cupom aplicado!";
            document.getElementById("txtCumpom").style.color = "green";
        } else {
            descontoAplicado = 0;
            alert("Cupom inválido.");
        }
        atualizarResumoTela();
    } catch (e) { alert("Erro ao validar cupom."); }
    btnValidar.innerText = "Validar";
};

if (inputSaldo) {
    inputSaldo.oninput = (e) => {
        let val = parseFloat(e.target.value.replace(/\D/g, "") / 100) || 0;
        let limite = Math.min(saldoDisponivel, totalOriginal);
        if (val > limite) val = limite;
        e.target.value = val.toFixed(2);
        saldoUtilizadoTotal = gr(val);
        atualizarResumoTela();
    };
}

// ======================================================
// FLUXO DE PAGAMENTO (O CORAÇÃO DO SISTEMA)
// ======================================================

// Disparo principal
btnConfirmar.onclick = () => {
    dispararPagamentoNaMaquina();
};

async function dispararPagamentoNaMaquina() {
    if (pagamentoEmAndamento) return;
    if (carrinho.length === 0) return alert("Carrinho vazio!");

    pagamentoEmAndamento = true;
    btnConfirmar.disabled = true;
    btnConfirmar.innerText = "Processando...";

    // Mostra o modal de status
    const modal = document.getElementById('modalPagamento');
    if (modal) modal.style.display = 'flex';

    exibirStatusPagamento("Aguardando ação na Maquininha... <br><br> <b style='color:green'>Faça o Pagamento na Maquininha, Caso o valor não apareceça aperte o botão verde</b>");

    await processarVendaFinal();

    // Libera o botão caso não tenha redirecionado (erro)
    pagamentoEmAndamento = false;
    btnConfirmar.disabled = false;
    btnConfirmar.innerText = "Confirmar e Finalizar";
}

async function processarVendaFinal() {
    const idVendaUnico = idVendaGlobal; // Usa o ID fixo da sessão
    const dataHora = new Date().toLocaleString('pt-BR');
    const cupomTexto = inputCupom.value.trim().toUpperCase() || "NENHUM";

    // 1. Mapeamento para Planilha
    const jsonVendaFinal = carrinho.map(item => {
        const qtd = item.quantidade || 1;
        const vUnit = gr(parseFloat(item.preco));
        const vTotalLinha = gr(vUnit * qtd);
        const prop = totalOriginal > 0 ? (vTotalLinha / totalOriginal) : (1 / carrinho.length);

        const descItem = gr(descontoAplicado * prop);
        const saldoItem = gr(saldoUtilizadoTotal * prop);
        const pagoItem = gr(Math.max(0, gr(gr(vTotalLinha - descItem) - saldoItem)));

        let comissao = (descontoAplicado > 0) ? gr(vTotalLinha * 0.10) : 0;
        if (tipoUsuario === "Parceiro" && saldoItem > 0) comissao = gr(-saldoItem);

        return {
            "ID Venda": idVendaUnico,
            "Data/Hora": dataHora,
            "CPF": cpfUsuario.replace(/\D/g, ""),
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
            "Valor liquido": gr(Math.max(0, gr(pagoItem - (comissao > 0 ? comissao : 0)))),
            "Tipo Pagamento": "PROCESSANDO"
        };
    });

    const valorTotalPago = gr(jsonVendaFinal.reduce((acc, i) => acc + i["ValorPAgo"], 0));
    const valorTotalCentavos = Math.round(valorTotalPago * 100);

    try {
        let podeGravar = false;

        // --- ROTA: MANUAL OU SALDO TOTAL ---
        if (localStorage.getItem('modo_pagamento_manual') === 'true' || valorTotalCentavos === 0) {
            let label = "SALDO_OU_CUPOM";
            if (localStorage.getItem('travar_cupom') === 'true') label = "RETIRADA_ESTOQUE";
            else if (localStorage.getItem('modo_pagamento_manual') === 'true') label = "MANUAL_DIN_PIX";

            jsonVendaFinal.forEach(item => { item["Tipo Pagamento"] = label; });
            podeGravar = true;
        }
        // --- ROTA: MAQUININHA REAL ---
        else if (AMBIENTE === 'PROD') {
            const payload = {
                config: { token: configMP.token, deviceId: configMP.deviceId, amount: valorTotalCentavos },
                itens: jsonVendaFinal
            };

            const response = await fetch(URL_SCRIPT, { method: 'POST', body: JSON.stringify(payload) });
            const resIntent = await response.json();

            if (resIntent.status === "success" && resIntent.intent_id) {
                let pago = false;
                let tentativas = 0;

                while (!pago && tentativas < 60) { // Polling de 3 minutos
                    tentativas++;
                    await new Promise(r => setTimeout(r, 3000));

                    try {
                        const check = await fetch(`${URL_SCRIPT}?verificarPagamento=${resIntent.intent_id}&token=${configMP.token}`);
                        const statusMP = await check.json();

                        console.log("🔍 Retorno da Maquininha:", statusMP);

                        if (statusMP.status === "approved") {
                            pago = true;
                            podeGravar = true;
                            jsonVendaFinal.forEach(item => { item["Tipo Pagamento"] = statusMP.raw_status; });
                            break;
                        } else if (statusMP.status === "canceled") {
                            // Usamos um código secreto para identificar o cancelamento
                            throw new Error("CANCELADO");
                        }
                    } catch (err) {
                        // SE O ERRO FOR "CANCELADO", JOGAMOS ELE PARA FORA DO LOOP!
                        if (err.message === "CANCELADO") {
                            throw new Error("Pagamento cancelado na máquina.");
                        }
                        // Se for erro de internet normal, ele apenas loga e tenta de novo
                        console.warn("Erro de conexão, tentando novamente...");
                    }
                }
                if (!pago) throw new Error("Tempo esgotado na máquina.");voltarAoInicio();
            } else {
                throw new Error("Erro ao iniciar máquina: " + (resIntent.message || "Verifique conexão"));
            }
        }
        // --- ROTA: MODO TESTE ---
        else {
            await new Promise(r => setTimeout(r, 1500));
            jsonVendaFinal.forEach(item => { item["Tipo Pagamento"] = "MODO_TESTE"; });
            podeGravar = true;
        }

        // --- GRAVAÇÃO NA PLANILHA ---
        if (podeGravar) {
            exibirStatusPagamento("Pagamento aprovado! Gravando dados...");
            const resFinal = await fetch(URL_SCRIPT, {
                method: 'POST',
                body: JSON.stringify({ acao: "registrarVendaFinal", dados: jsonVendaFinal })
            });
            const finalData = await resFinal.json();

            if (finalData.status === "success") {
                alert("✅ Venda concluída!");
                localStorage.removeItem('carrinho');
                localStorage.removeItem('total_venda');
                localStorage.removeItem('modo_pagamento_manual');
                localStorage.removeItem('travar_cupom');
                window.location.href = "index.html";
                sessionStorage.removeItem('idVendaAtual');
            } else {
                throw new Error("Erro ao gravar planilha: " + finalData.message);
            }
        }

    } catch (e) {
        alert("⚠️ " + e.message);
        document.getElementById('modalPagamento').style.display = 'none';
        pagamentoEmAndamento = false;

        // Se foi só um erro de internet ou timeout, ele MANTÉM o ID.
        // Assim, se você clicar em "Confirmar" de novo, ele não cria uma cobrança nova, 
        // ele apenas se reconecta àquela que já está na tela da maquininha!
        if (e.message.includes("cancelado")) {
            sessionStorage.removeItem('idVendaAtual');
            idVendaGlobal = "V" + Date.now();
            sessionStorage.setItem('idVendaAtual', idVendaGlobal);
        }
    }
}

function exibirStatusPagamento(mensagem) {
    // Busca o elemento interno do modal que você já tem
    const container = document.querySelector('#modalPagamento .modal-content');
    if (container) {
        container.innerHTML = `
            <div class="spinner"></div>
            <h3>${mensagem}</h3>
            <p>Não feche esta tela.</p>
        `;
    }
}