const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";

// ======================================================
// CONFIGURAÇÃO DE AMBIENTE
// ======================================================
const AMBIENTE = 'DESENV'; // Troque para 'PROD' quando for usar a maquininha real e 'DESENV' para o desenvolvimento

// CONFIGURAÇÃO MERCADO PAGO
const configMP = {
    token: "APP_USR-3577250795393962-011007-1f142324435256c80ac8559f4743683f-3117694591",
    deviceId: "PAX_Q92__Q92-1733541950",
    installments: 1,
    paymentType: "credit_card"
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

inputCupom.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        btnValidar.click();
    }
});

// LÓGICA DE INTERFACE
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

document.getElementById('totalOriginal').innerText = totalOriginal.toFixed(2);
document.getElementById('totalFinal').innerText = totalOriginal.toFixed(2);

inputSaldo.addEventListener('input', function (e) {
    let value = e.target.value.replace(/\D/g, "");
    value = (value / 100).toFixed(2) + "";
    e.target.value = value;
});

// FUNÇÕES DE CÁLCULO
function atualizarResumoTela() {
    // 1. Calcula os valores baseados nas variáveis globais
    const totalComDesconto = gr(totalOriginal - descontoAplicado);
    const totalFinal = gr(Math.max(0, totalComDesconto - saldoUtilizadoTotal));

    // 2. Atualiza os textos na tela
    document.getElementById('totalOriginal').innerText = totalOriginal.toFixed(2);
    document.getElementById('totalFinal').innerText = totalFinal.toFixed(2);

    // ESTA LINHA É A QUE MOSTRA O DESCONTO:
    const elDesconto = document.getElementById('valorDesconto');
    if (elDesconto) {
        elDesconto.innerHTML = "Desconto: <b>R$" + descontoAplicado.toFixed(2) + "</b>";
    }

    // 3. Gerencia a exibição do saldo usado (se for parceiro)
    const elSaldoUsado = document.getElementById('txtSaldoUsado');
    if (elSaldoUsado) {
        elSaldoUsado.style.display = saldoUtilizadoTotal > 0 ? 'block' : 'none';
        document.getElementById('valorSaldoAbatido').innerText = saldoUtilizadoTotal.toFixed(2);
    }
}
function sugerirValorSaldo() {
    if (tipoUsuario !== "Parceiro") return;
    const valorRestante = totalOriginal - descontoAplicado;
    inputSaldo.value = (valorRestante > saldoDisponivel ? saldoDisponivel : valorRestante).toFixed(2);
}

// BOTOES DE AÇÃO
btnValidar.addEventListener('click', async () => {
    const cupom = inputCupom.value.trim().toUpperCase();
    const textoCupom = document.getElementById("txtCumpom");
    const valorDesconto = document.getElementById("valorDesconto");

    // Se o campo estiver vazio, entendemos que o usuário quer remover o cupom
    if (!cupom) {
        descontoAplicado = 0;
        valorDesconto.style.display = 'none';
        btnValidar.classList.remove('btn-success');
        atualizarResumoTela();
        alert("Cupom removido.");
        return;
    }

    btnValidar.innerText = "Verificando...";
    // Resetamos o visual do botão para neutro durante a nova validação
    btnValidar.classList.remove('btn-success');


    try {
        const response = await fetch(`${URL_SCRIPT}?validarCupom=${cupom}`);
        const data = await response.json();



        if (data.status === "success") {

            // 2. Só faça o split se o cupom for válido e o parceiro existir
            const nomeParceiro = data.parceiro ? data.parceiro.split(" ")[0] : "Parceiro";

            // Aplica 10% sobre o total e exibe na tela
            descontoAplicado = gr(totalOriginal * 0.10);

            valorDesconto.style.display = 'block';
            textoCupom.style.display = 'block';
            textoCupom.style.color = 'Green';
            textoCupom.innerHTML = "Cupom de " + nomeParceiro + " aplicado: 10% de desconto!";
            btnValidar.classList.add('btn-success');
            atualizarResumoTela();

        } else {
            // Se o novo cupom falhar, zeramos o desconto anterior por segurança
            descontoAplicado = 0;
            valorDesconto.style.display = 'none';
            atualizarResumoTela();

            textoCupom.style.display = 'block';
            textoCupom.style.color = 'red';
            textoCupom.innerHTML = "Cupom inválido ou expirado.";
        }
    } catch (e) {
        alert("Erro ao conectar com o servidor para validar cupom.");
    } finally {
        btnValidar.innerText = "Validar";
    }
});

document.getElementById('btnAplicarSaldo').addEventListener('click', () => {
    const valorPretendido = gr(parseFloat(inputSaldo.value) || 0);
    saldoUtilizadoTotal = valorPretendido;
    atualizarResumoTela();
});

// ======================================================
// FINALIZAÇÃO (COM CONVERSÃO PARA CENTAVOS INTEIROS)
// ======================================================

btnConfirmar.addEventListener('click', async () => {
    const originalText = btnConfirmar.innerText;
    const idVendaUnico = "V" + Date.now();
    const dataHora = new Date().toLocaleString('pt-BR');
    const cupomTexto = (inputCupom.value.trim() !== "") ? inputCupom.value.toUpperCase() : "NENHUM";

    const jsonVendaFinal = carrinho.map(item => {
        const valorItemOriginal = gr(parseFloat(item.preco));

        // Calcula quanto este item representa no total para ratear o desconto e o saldo
        const proporcao = valorItemOriginal / totalOriginal;

        // Aplica o desconto do cupom proporcionalmente ao item
        const valorComDescontoCupom = gr(valorItemOriginal - (descontoAplicado * proporcao));

        // Abate o saldo (se houver) do valor já com desconto do cupom
        const saldoDesteItem = gr(saldoUtilizadoTotal * proporcao);

        // Valor que será enviado para a maquininha
        const valorPagoDesteItem = gr(Math.max(0, valorComDescontoCupom - saldoDesteItem));

        let comissao = 0;
        if (tipoUsuario === "Parceiro" && saldoDesteItem > 0) {
            comissao = -saldoDesteItem; // Se usou saldo, registra como débito
        } else if (descontoAplicado > 0) {
            // Se houve cupom, calculamos a comissão de 15% (ou o valor que você desejar)
            comissao = gr(valorItemOriginal * 0.10);
        }

        return {
            "ID Venda": idVendaUnico,
            "Data/Hora": dataHora,
            "CPF": cpfUsuario.replace(/\D/g, ""),
            "Nome": nomeUsuario,
            "Tipo": tipoUsuario,
            "Cod": item.codigo,
            "Produto": item.nome,
            "Valor Item": gr(valorItemOriginal),
            "cupom": descontoAplicado > 0 ? cupomTexto : "NENHUM",
            "ValoremSaldo": gr(saldoDesteItem),
            "ValorPAgo": gr(valorPagoDesteItem),
            "Valor parceiro": gr(comissao),
            "Valor liquido": gr(Math.max(0, valorPagoDesteItem - (comissao > 0 ? comissao : 0)))
        };
    });

    // --- CONVERSÃO PARA CENTAVOS INTEIROS ---
    const valorTotalReais = jsonVendaFinal.reduce((acc, i) => acc + i["ValorPAgo"], 0);
    const valorTotalCentavos = Math.round(valorTotalReais * 100);

    try {
        btnConfirmar.disabled = true;
        let prosseguirParaGravacao = false;

        // VERIFICAÇÃO DE AMBIENTE
        if (AMBIENTE === 'PROD' && valorTotalCentavos > 0) {

            btnConfirmar.innerText = "Modo Produção: Chamando Point...";

            const payloadParaEnvio = {
                config: { ...configMP, amount: valorTotalCentavos },
                itens: jsonVendaFinal
            };

            // --- LINHA ADICIONADA PARA VERIFICAÇÃO ---
            console.log("--- DEBUG: ENVIANDO PARA GOOGLE SCRIPT ---");
            console.log(JSON.stringify(payloadParaEnvio, null, 2));

            const response = await fetch(URL_SCRIPT, {
                method: 'POST',
                body: JSON.stringify(payloadParaEnvio)
            });
            const resIntent = await response.json();

            if (resIntent.status === "success" && resIntent.intent_id) {
                btnConfirmar.innerText = "Pague na Maquininha...";

                let statusPagamento = "OPEN";
                while (statusPagamento === "OPEN") {
                    await new Promise(r => setTimeout(r, 3000));
                    const check = await fetch(`${URL_SCRIPT}?verificarPagamento=${resIntent.intent_id}&token=${configMP.token}`);
                    const statusMP = await check.json();
                    statusPagamento = statusMP.state;

                    if (statusPagamento === "FINISHED") prosseguirParaGravacao = true;
                    if (statusPagamento === "CANCELED") {
                        alert("Pagamento cancelado.");
                        btnConfirmar.innerText = originalText;
                        btnConfirmar.disabled = false;
                        return;
                    }
                }
            } else {
                alert("Erro na máquina: " + (resIntent.message || "Sem resposta"));
                btnConfirmar.disabled = false;
                return;
            }

        } else {
            // Se estiver em 'DESENV' ou valor for 0, pula a máquina e libera a gravação
            console.warn("--- MODO DESENVOLVIMENTO ATIVO: PUMPANDO PARA PLANILHA ---");
            prosseguirParaGravacao = true;
        }

        // GRAVAÇÃO FINAL
        if (prosseguirParaGravacao) {
            btnConfirmar.innerText = "Registrando...";
            const resFinal = await fetch(`${URL_SCRIPT}?registrarVendaFinal=${encodeURIComponent(JSON.stringify(jsonVendaFinal))}`);
            const finalData = await resFinal.json();

            if (finalData.status === "success") {
                alert(AMBIENTE === 'DESENV' ? "Teste Concluído! Gravado." : "Venda Aprovada e Registrada!");
                localStorage.removeItem('carrinho');
                window.location.href = "index.html";
            }
        }

    } catch (e) {
        alert("Erro: " + e.message);
        btnConfirmar.disabled = false;
    }
});

sugerirValorSaldo();
atualizarResumoTela();