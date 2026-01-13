const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";


// ======================================================
// 1. RECUPERAÇÃO DE DADOS E CONFIGURAÇÃO INICIAL
// ======================================================
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

// Função para arredondamento preciso
function gr(valor) {
    return Math.round((parseFloat(valor) + Number.EPSILON) * 100) / 100;
}

// Configuração de visibilidade por tipo de usuário
if (tipoUsuario === "Parceiro") {
    document.getElementById('containerSaldo').style.display = 'block';
    document.getElementById('txtSaldoDisponivel').innerText = saldoDisponivel.toFixed(2);
    document.getElementById('containerCupom').style.display = 'none';
}

// ======================================================
// 2. RENDERIZAÇÃO E INTERFACE
// ======================================================

// Lista os itens do carrinho no resumo
const containerLista = document.getElementById('listaItensPagamento');
if (carrinho.length === 0) {
    containerLista.innerHTML = "<p>Carrinho vazio</p>";
} else {
    carrinho.forEach(item => {
        const p = document.createElement('p');
        p.style.fontSize = "0.9rem";
        p.style.margin = "5px 0";
        p.innerHTML = `• ${item.nome} <span style="float:right;">R$ ${gr(parseFloat(item.preco)).toFixed(2)}</span>`;
        containerLista.appendChild(p);
    });
}

// Atualiza totais iniciais
document.getElementById('totalOriginal').innerText = totalOriginal.toFixed(2);
document.getElementById('totalFinal').innerText = totalOriginal.toFixed(2);

// Máscara para o campo de saldo
inputSaldo.addEventListener('input', function (e) {
    let value = e.target.value.replace(/\D/g, "");
    value = (value / 100).toFixed(2) + "";
    e.target.value = value;
});

// ======================================================
// 3. LÓGICA DE CUPOM E DESCONTO
// ======================================================

btnValidar.addEventListener('click', async () => {
    const msgLabel = document.getElementById('msgCupom');
    const txtDescontoDiv = document.getElementById('txtDesconto');

    if (btnValidar.innerText === "Alterar") {
        descontoAplicado = 0;
        inputCupom.value = "";
        inputCupom.disabled = false;
        txtDescontoDiv.style.display = 'none';
        btnValidar.innerText = "Validar";
        btnValidar.style.backgroundColor = "";
        msgLabel.innerText = "";
        atualizarResumoTela();
        return;
    }

    const cupom = inputCupom.value.trim();
    if (!cupom) return;

    btnValidar.innerText = "...";
    btnValidar.disabled = true;

    try {
        const response = await fetch(`${URL_SCRIPT}?validarCupom=${cupom}`);
        const data = await response.json();

        if (data.status === "success") {
            descontoAplicado = totalOriginal * 0.10;
            msgLabel.innerText = "Cupom de " + data.parceiro.split(" ")[0] + " aplicado!";
            msgLabel.style.color = "green";
            inputCupom.disabled = true;
            btnValidar.innerText = "Alterar";
            btnValidar.style.backgroundColor = "#ffc107";
            btnValidar.disabled = false;
        } else {
            msgLabel.innerText = "Inválido";
            msgLabel.style.color = "red";
            btnValidar.innerText = "Validar";
            btnValidar.disabled = false;
        }
        atualizarResumoTela();
    } catch (e) {
        alert("Erro ao validar cupom");
        btnValidar.disabled = false;
    }
});

// ======================================================
// 4. LÓGICA DE SALDO (PARCEIRO)
// ======================================================

document.getElementById('btnAplicarSaldo').addEventListener('click', () => {
    const btn = document.getElementById('btnAplicarSaldo');
    const msg = document.getElementById('msgSaldo');

    if (btn.innerText === "Alterar") {
        saldoUtilizadoTotal = 0;
        inputSaldo.disabled = false;
        btn.innerText = "Aplicar";
        btn.style.backgroundColor = "";
        sugerirValorSaldo();
        atualizarResumoTela();
        return;
    }

    const valorPretendido = gr(parseFloat(inputSaldo.value) || 0);
    const totalComDesconto = totalOriginal - descontoAplicado;

    if (valorPretendido > saldoDisponivel) {
        msg.innerText = "Saldo insuficiente!";
        return;
    }
    if (valorPretendido > totalComDesconto) {
        msg.innerText = "Valor maior que a compra!";
        return;
    }

    saldoUtilizadoTotal = valorPretendido;
    inputSaldo.disabled = true;
    btn.innerText = "Alterar";
    btn.style.backgroundColor = "#ffc107";
    atualizarResumoTela();
});

function atualizarResumoTela() {
    const totalComDesconto = totalOriginal - descontoAplicado;
    const totalFinal = Math.max(0, totalComDesconto - saldoUtilizadoTotal);

    document.getElementById('totalFinal').innerText = totalFinal.toFixed(2);
    document.getElementById('valorDesconto').innerText = descontoAplicado.toFixed(2);
    
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

// ======================================================
// 5. FINALIZAÇÃO DA VENDA (POINT PRO 3 + PLANILHA)
// ======================================================

btnConfirmar.addEventListener('click', async () => {
    const originalText = btnConfirmar.innerText;
    
    // Preparação dos dados
    const idVendaUnico = "2026" + Date.now().toString().slice(-8);
    const dataHora = new Date().toLocaleString('pt-BR');
    const cupomTexto = (inputCupom.value.trim() !== "") ? inputCupom.value.toUpperCase() : "NENHUM";

    if (carrinho.length === 0) return alert("Carrinho vazio");

    const jsonVendaFinal = carrinho.map(item => {
        const valorItemOriginal = gr(parseFloat(item.preco));
        const proporcao = valorItemOriginal / totalOriginal;
        const valorComDesconto = (totalOriginal > 0) ? valorItemOriginal * ((totalOriginal - descontoAplicado) / totalOriginal) : valorItemOriginal;
        const saldoDesteItem = gr(saldoUtilizadoTotal * proporcao);
        const valorPagoDesteItem = gr(Math.max(0, valorComDesconto - saldoDesteItem));

        let comissao = 0;
        if (tipoUsuario === "Parceiro" && saldoDesteItem > 0) comissao = -saldoDesteItem;
        else if (cupomTexto !== "NENHUM") comissao = valorItemOriginal * 0.15;

        return {
            "ID Venda": idVendaUnico,
            "Data/Hora": dataHora,
            "CPF": cpfUsuario.replace(/\D/g, ""),
            "Nome": nomeUsuario,
            "Tipo": tipoUsuario,
            "Cod": item.codigo,
            "Produto": item.nome,
            "Valor Item": gr(valorItemOriginal),
            "cupom": cupomTexto,
            "ValoremSaldo": gr(saldoDesteItem),
            "ValorPAgo": gr(valorPagoDesteItem),
            "Valor parceiro": gr(comissao),
            "Valor liquido": gr(Math.max(0, valorPagoDesteItem - (comissao > 0 ? comissao : 0)))
        };
    });

    const valorTotalMaquina = jsonVendaFinal.reduce((acc, i) => acc + i["ValorPAgo"], 0);

    try {
        btnConfirmar.disabled = true;
        let prosseguirParaGravacao = false;

        // --- PASSO 1: ACIONAR MÁQUINA ---
        if (valorTotalMaquina > 0) {
            btnConfirmar.innerText = "Chamando Point...";
            const resIntent = await fetch(URL_SCRIPT, { method: 'POST', body: JSON.stringify(jsonVendaFinal) });
            const intentData = await resIntent.json();

            if (intentData.status === "success" && intentData.intent_id) {
                btnConfirmar.innerText = "Pague na Maquininha...";
                
                // --- PASSO 2: LOOP DE ESPERA (O CADEADO) ---
                let statusPagamento = "OPEN";
                while (statusPagamento === "OPEN") {
                    await new Promise(r => setTimeout(r, 3000)); // Espera 3 segundos
                    
                    const check = await fetch(`${URL_SCRIPT}?verificarPagamento=${intentData.intent_id}`);
                    const statusMP = await check.json();
                    statusPagamento = statusMP.state; // Atualiza o status vindo da Point

                    if (statusPagamento === "FINISHED") {
                        prosseguirParaGravacao = true; // SÓ AQUI LIBERAMOS A GRAVAÇÃO
                    } else if (statusPagamento === "CANCELED") {
                        alert("Pagamento cancelado ou recusado na Point.");
                        btnConfirmar.innerText = originalText;
                        btnConfirmar.disabled = false;
                        return; // PARA TUDO AQUI
                    }
                }
            } else {
                alert("A máquina não respondeu. Verifique se está ligada no Wi-Fi.");
                btnConfirmar.disabled = false;
                btnConfirmar.innerText = originalText;
                return;
            }
        } else {
            // Se o valor for 0 (totalmente pago em saldo), libera a gravação direto
            prosseguirParaGravacao = true;
        }

        // --- PASSO 3: GRAVAÇÃO FINAL (SÓ OCORRE SE LIBERADO) ---
        if (prosseguirParaGravacao) {
            btnConfirmar.innerText = "Registrando Venda...";
            const resFinal = await fetch(`${URL_SCRIPT}?registrarVendaFinal=${encodeURIComponent(JSON.stringify(jsonVendaFinal))}`);
            const finalData = await resFinal.json();

            if (finalData.status === "success") {
                alert("Venda Aprovada e Registrada!");
                // Limpeza de cache e redirecionamento
                localStorage.removeItem('carrinho');
                window.location.href = "index.html";
            }
        }

    } catch (e) {
        alert("Erro técnico: " + e.message);
        btnConfirmar.disabled = false;
        btnConfirmar.innerText = originalText;
    }
    
});

// Inicialização
sugerirValorSaldo();
atualizarResumoTela();