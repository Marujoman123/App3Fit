const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";

// Recupera o carrinho e os dados do usuário do localStorage
const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
const totalOriginal = gr(parseFloat(localStorage.getItem('total_venda')) || 0);
const tipoUsuario = localStorage.getItem('usuario_tipo');
const nomeUsuario = localStorage.getItem('usuario_nome');
const cpfUsuario = localStorage.getItem('usuario_cpf');
const btnValidar = document.getElementById('btnValidarCupom');
const inputCupom = document.getElementById('inputCupom');

// Função para garantir 2 casas decimais sem erros de arredondamento
function gr(valor) {
    return Math.round((parseFloat(valor) + Number.EPSILON) * 100) / 100;
}


const saldoDisponivel = gr(parseFloat(localStorage.getItem('usuario_saldo')) || 0);
let saldoUtilizadoTotal = 0;
let descontoAplicado = 0;

// --- CONFIGURAÇÃO INICIAL DA TELA ---
if (tipoUsuario === "Parceiro") {
    document.getElementById('containerSaldo').style.display = 'block';
    document.getElementById('txtSaldoDisponivel').innerText = saldoDisponivel.toFixed(2);
    // Para parceiros, escondemos o cupom como solicitado anteriormente
    document.getElementById('containerCupom').style.display = 'none';
}


// ------------------------------MASCARA INPUT------------------------------
const inputSaldo = document.getElementById('inputUsarSaldo');

inputSaldo.addEventListener('input', function (e) {
    let value = e.target.value;

    // 1. Remove tudo que não for número
    value = value.replace(/\D/g, "");

    // 2. Transforma em centavos (divide por 100)
    // Se digitou "125", vira 1.25. Se digitou "5", vira 0.05
    value = (value / 100).toFixed(2) + "";

    // 3. Troca o ponto pela vírgula para exibição brasileira
    // value = value.replace(".", ",");

    // 4. Adiciona separador de milhar (opcional, mas recomendado)
    // value = value.replace(/(\d)(\d{3}),/g, "$1.$2,");

    // 5. Devolve o valor formatado para o campo
    e.target.value = value;
});


// ------------------------------/MASCARA INPUT------------------------------







// --- 1. RENDERIZAR ITENS NA TELA ---
const containerLista = document.getElementById('listaItensPagamento');
if (carrinho.length === 0) {
    containerLista.innerHTML = "<p>Carrinho vazio</p>";
} else {
    carrinho.forEach(item => {
        const p = document.createElement('p');
        p.style.fontSize = "0.9rem";
        p.style.margin = "5px 0";
        // Formato: 1x Nome do Produto - R$ 10.00
        p.innerHTML = `• ${item.nome} <span style="float:right;">R$ ${gr(parseFloat(item.preco)).toFixed(2)}</span>`;
        containerLista.appendChild(p);
    });
}

inputCupom.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        btnValidar.click();
    }
});

// Atualiza totais na tela
document.getElementById('totalOriginal').innerText = totalOriginal.toFixed(2);
document.getElementById('totalFinal').innerText = totalOriginal.toFixed(2);

// --- 2. LÓGICA DO CUPOM (Mantida) ---
if (tipoUsuario === "Parceiro") {
    document.getElementById('containerCupom').style.display = 'none';
    // document.getElementById('dtot').style.display = 'none';
    //document.getElementById('txtDesconto').style.display = 'none';
    //document.getElementById('linhatot').style.display = 'none';

}

document.getElementById('btnValidarCupom').addEventListener('click', async () => {
    const inputCupom = document.getElementById('inputCupom');
    const btn = document.getElementById('btnValidarCupom');
    const msgLabel = document.getElementById('msgCupom');
    const txtDescontoDiv = document.getElementById('txtDesconto');

    // --- LÓGICA PARA ALTERAR (RESETAR) ---
    if (btn.innerText === "Alterar") {
        descontoAplicado = 0;
        inputCupom.value = "";
        inputCupom.disabled = false;

        // Volta os valores na tela para o original
        txtDescontoDiv.style.display = 'none';
        document.getElementById('totalFinal').innerText = totalOriginal.toFixed(2);

        // Reseta o botão e a label
        btn.innerText = "Validar";
        btn.disabled = false;
        btn.style.backgroundColor = ""; // Volta para a cor padrão
        msgLabel.innerText = "";
        return;
    }

    // --- LÓGICA PARA VALIDAR ---
    const cupom = inputCupom.value.trim();
    if (!cupom) return;

    btn.innerText = "...";
    btn.disabled = true;
    msgLabel.innerText = "Validando...";
    msgLabel.style.color = "gray";

    try {
        const response = await fetch(`${URL_SCRIPT}?validarCupom=${cupom}`);
        const data = await response.json();

        if (data.status === "success") {
            descontoAplicado = totalOriginal * 0.10;

            txtDescontoDiv.style.display = 'block';
            document.getElementById('valorDesconto').innerText = descontoAplicado.toFixed(2);
            document.getElementById('totalFinal').innerText = (totalOriginal - descontoAplicado).toFixed(2);

            msgLabel.innerText = "Cupom de " + data.parceiro.split(" ")[0] + " aplicado!";
            msgLabel.style.color = "green";

            // TRANSFORMA EM BOTÃO DE ALTERAR
            inputCupom.disabled = true;
            btn.disabled = false; // Reativamos para ele poder clicar em "Alterar"
            btn.innerText = "Alterar";
            btn.style.backgroundColor = "#ffc107"; // Cor amarela/alerta para "Alterar"
            btn.style.color = "#000";
        } else {
            msgLabel.innerText = "Cupom inválido.";
            msgLabel.style.color = "red";
            btn.innerText = "Validar";
            btn.disabled = false;
            inputCupom.value = "";
            inputCupom.focus();
        }
    } catch (e) {
        msgLabel.innerText = "Erro de conexão.";
        msgLabel.style.color = "red";
        btn.innerText = "Validar";
        btn.disabled = false;
    }
});

// --- 3. FINALIZAR VENDA (ITEM POR ITEM) ---
document.getElementById('btnConfirmarPagamento').addEventListener('click', () => {
    const idVendaUnico = Number("2026" + Date.now().toString().slice(-8));
    const dataHora = new Date().toLocaleString('pt-BR');
    const cpfUsuario = localStorage.getItem('usuario_cpf') || "000.000.000-00";
    const nomeUsuario = localStorage.getItem('usuario_nome') || "Consumidor";
    const tipoUsuario = localStorage.getItem('usuario_tipo') || "Cliente";

    const inputCupomElement = document.getElementById('inputCupom');
    const cupomTexto = (inputCupomElement && inputCupomElement.value.trim() !== "") ? inputCupomElement.value : "NENHUM";

    const carrinhoParaVenda = JSON.parse(localStorage.getItem('carrinho')) || [];

    if (carrinhoParaVenda.length === 0) {
        alert("Erro: Carrinho vazio.");
        return;
    }

    const valorTotalFinal = gr(parseFloat(document.getElementById('totalFinal').innerText));
    const valorTotalOriginal = gr(parseFloat(document.getElementById('totalOriginal').innerText));

    const jsonVendaFinal = carrinhoParaVenda.map(item => {
        const valorItemOriginal = gr(parseFloat(item.preco));
        const proporcao = valorItemOriginal / valorTotalOriginal;

        const valorComDescontoCupom = (valorTotalOriginal > 0)
            ? valorItemOriginal * ((valorTotalOriginal - descontoAplicado) / valorTotalOriginal)
            : valorItemOriginal;

        const valorEmSaldoDesteItem = (typeof saldoUtilizadoTotal !== 'undefined') ? (saldoUtilizadoTotal * proporcao) : 0;
        const valorPagoDesteItem = Math.max(0, valorComDescontoCupom - valorEmSaldoDesteItem);

        let comissaoParceiro = 0;
        if (tipoUsuario === "Parceiro" && valorEmSaldoDesteItem > 0) {
            comissaoParceiro = -valorEmSaldoDesteItem;
        } else if (cupomTexto !== "NENHUM") {
            comissaoParceiro = valorItemOriginal * 0.15;
        }

        // RETORNO DO OBJETO: Certifique-se que os nomes das chaves batem com o doPost
        return {
            "ID Venda": idVendaUnico,
            "Data/Hora": dataHora,
            "CPF": cpfUsuario.replace(/\D/g, ""), // Enviamos apenas números para facilitar no Script
            "Nome": nomeUsuario,
            "Tipo": tipoUsuario,
            "Cod": item.codigo, // <--- CHAVE ESSENCIAL PARA O ESTOQUE
            "Produto": item.nome,
            "Valor Item": gr(valorItemOriginal),
            "cupom": cupomTexto,
            "ValoremSaldo": gr(valorEmSaldoDesteItem),
            "ValorPAgo": gr(valorPagoDesteItem),
            "Valor parceiro": gr(comissaoParceiro),
            "Valor liquido": gr(Math.max(0, valorPagoDesteItem - (comissaoParceiro > 0 ? comissaoParceiro : 0)))
        };
    });

    console.log("--- NOVA VENDA GERADA ---");
    console.table(jsonVendaFinal);

    // Agora você pode enviar jsonVendaFinal para o Google Sheets via Fetch
    enviarVendaParaPlanilha(jsonVendaFinal);

    alert('Venda Finalizada');
    // Sugestão de limpeza após sucesso real:
    // localStorage.removeItem('carrinho');
    // window.location.href = "index.html";


//    ------------------Enviar comporvante SMS android--------------------------
    // const msgSMS = `Ola! Sua compra de R$ ${valorTotalFinal.toFixed(2)} foi confirmada. ID: ${idVendaUnico}`;
    // const linkSMS = `sms:+55${19974083740}?body=${encodeURIComponent(msgSMS)}`;

    // // Abre o app de SMS do Android
    // window.location.href = linkSMS;
//    ------------------/Enviar comporvante SMS android--------------------------
});




// -----------------FORCÇAR QUE O TECLADO APAREÇA MESMO COM LEITOR-------------------------------
function forcarTeclado() {
    const inputs = document.querySelectorAll('input:not(#barcodeInput)');
    inputs.forEach(input => {
        // O atributo decimal ou numeric costuma forçar a chamada do teclado no Android
        if (!input.getAttribute('inputmode')) {
            input.setAttribute('inputmode', 'text');
        }
    });
}

document.addEventListener('DOMContentLoaded', forcarTeclado);

// -----------------/FORCÇAR QUE O TECLADO APAREÇA MESMO COM LEITOR-------------------------------


// --- FUNÇÃO PARA ATUALIZAR O TOTAL FINAL NA TELA ---
function atualizarResumoTela() {
    const totalComDesconto = totalOriginal - descontoAplicado;
    const totalFinal = totalComDesconto - saldoUtilizadoTotal;

    document.getElementById('totalFinal').innerText = Math.max(0, totalFinal).toFixed(2);

    const elTxtSaldo = document.getElementById('txtSaldoUsado');
    const elValorSaldo = document.getElementById('valorSaldoAbatido');
    const txtDescontoDiv = document.getElementById('txtDesconto');
    const valorDesconto = document.getElementById('valorDesconto');

    // Mostra linha de desconto de CUPOM (10%)
    if (descontoAplicado > 0) {
        txtDescontoDiv.style.display = 'block';
        valorDesconto.innerText = descontoAplicado.toFixed(2);
    } else {
        txtDescontoDiv.style.display = 'none';
    }

    // Mostra linha de saldo ABATIDO (para Parceiros usando saldo)
    if (saldoUtilizadoTotal > 0) {
        if (elTxtSaldo) {
            elTxtSaldo.style.display = 'block';
            elValorSaldo.innerText = saldoUtilizadoTotal.toFixed(2);
        }
    } else {
        if (elTxtSaldo) elTxtSaldo.style.display = 'none';
    }
}



// --- BOTÃO APLICAR SALDO (SÓ PARA PARCEIRO) ---
// --- FUNÇÃO PARA PREENCHER O VALOR SUGERIDO ---
function sugerirValorSaldo() {
    const inputSaldo = document.getElementById('inputUsarSaldo');
    const btnSaldo = document.getElementById('btnAplicarSaldo');

    // Se o botão já estiver como "Alterar", não sobrescrevemos o que o usuário escolheu
    if (btnSaldo.innerText === "Alterar") return;

    const valorRestante = totalOriginal - descontoAplicado;

    if (valorRestante > saldoDisponivel) {
        inputSaldo.value = saldoDisponivel.toFixed(2);
    } else {
        inputSaldo.value = valorRestante.toFixed(2);
    }
}

// --- LOGICA DO BOTÃO APLICAR / ALTERAR SALDO ---
document.getElementById('btnAplicarSaldo').addEventListener('click', () => {
    const inputSaldo = document.getElementById('inputUsarSaldo');
    const btn = document.getElementById('btnAplicarSaldo');
    const msg = document.getElementById('msgSaldo');

    // CASO: CLICOU EM ALTERAR
    if (btn.innerText === "Alterar") {
        saldoUtilizadoTotal = 0; // Reseta o saldo na conta
        inputSaldo.disabled = false;
        btn.innerText = "Aplicar";
        btn.style.backgroundColor = ""; // Volta cor original
        btn.style.color = "";
        msg.innerText = "";

        sugerirValorSaldo(); // Sugere novamente o valor
        atualizarResumoTela();
        return;
    }

    // CASO: CLICOU EM APLICAR
    const valorPretendido = gr(parseFloat(inputSaldo.value) || 0);
    if (valorPretendido <= 0) return;

    if (valorPretendido > saldoDisponivel) {
        msg.innerText = "Saldo insuficiente!";
        msg.style.color = "red";
        return;
    }

    const totalPossivel = totalOriginal - descontoAplicado;
    if (valorPretendido > totalPossivel) {
        msg.innerText = "Valor maior que a compra!";
        msg.style.color = "orange";
        return;
    }

    // Sucesso ao aplicar
    saldoUtilizadoTotal = valorPretendido;
    msg.innerText = "Saldo aplicado!";
    msg.style.color = "green";

    // Transforma em botão de Alterar
    inputSaldo.disabled = true;
    btn.innerText = "Alterar";
    btn.style.backgroundColor = "#ffc107"; // Amarelo para destaque
    btn.style.color = "#000";

    atualizarResumoTela();
});


// --- FUNÇÃO PARA PREENCHER O VALOR SUGERIDO ---
sugerirValorSaldo();


function sugerirValorSaldo() {
    const inputSaldo = document.getElementById('inputUsarSaldo');
    const btnSaldo = document.getElementById('btnAplicarSaldo');

    // Se o botão já estiver como "Alterar", não sobrescrevemos o que o usuário escolheu
    if (btnSaldo.innerText === "Alterar") return;

    const valorRestante = gr(totalOriginal) - descontoAplicado;

    if (valorRestante > saldoDisponivel) {
        inputSaldo.value = saldoDisponivel;
    } else {
        inputSaldo.value = valorRestante;
    }
}




// --- FUNÇÃO PARA ENVIAR PARA A PLANILHA ---
async function enviarVendaParaPlanilha(dadosVenda) {
    const btnConfirmar = document.getElementById('btnConfirmarPagamento');
    const originalText = btnConfirmar.innerText;

    // Feedback visual para o usuário
    btnConfirmar.innerText = "Processando...";
    btnConfirmar.disabled = true;

    try {
        // O fetch envia o array de objetos (jsonVendaFinal) com os valores numéricos
        const response = await fetch(URL_SCRIPT, {
            method: 'POST',
            mode: 'no-cors', // Evita bloqueios de política de mesma origem em apps mobile
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosVenda)
        });

        /* Nota: No modo 'no-cors', o status da resposta é sempre 0 e não conseguimos 
           ler o corpo. Se não houve erro de rede (catch), assumimos o sucesso.
        */

        alert("Venda Finalizada com Sucesso!");

        // --- ATUALIZAÇÃO DE SALDO LOCAL (Se o usuário for o comprador parceiro) ---
        if (tipoUsuario === "Parceiro" && saldoUtilizadoTotal > 0) {
            const novoSaldoLocal = saldoDisponivel - saldoUtilizadoTotal;
            localStorage.setItem('usuario_saldo', novoSaldoLocal.toFixed(2));
        }

        // --- LIMPEZA DE CARRINHO ---
        localStorage.removeItem('carrinho');
        localStorage.removeItem('total_venda');

        // Redireciona para o início
        window.location.href = "index.html";

    } catch (error) {
        console.error("Erro técnico no envio:", error);
        alert("Erro de conexão. Verifique sua internet e tente novamente.");

        // Reativa o botão para nova tentativa
        btnConfirmar.innerText = originalText;
        btnConfirmar.disabled = false;
    }
}
