const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";

// Recupera o carrinho e os dados do usuário do localStorage
const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
const totalOriginal = parseFloat(localStorage.getItem('total_venda')) || 0;
const tipoUsuario = localStorage.getItem('usuario_tipo');
const nomeUsuario = localStorage.getItem('usuario_nome');
const cpfUsuario = localStorage.getItem('usuario_cpf');
const btnValidar = document.getElementById('btnValidarCupom');
const inputCupom = document.getElementById('inputCupom');

let descontoAplicado = 0;

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
        p.innerHTML = `• ${item.nome} <span style="float:right;">R$ ${parseFloat(item.preco).toFixed(2)}</span>`;
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
    document.getElementById('dtot').style.display = 'none';
    document.getElementById('txtDesconto').style.display = 'none';
    document.getElementById('linhatot').style.display = 'none';

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
            inputCupom.value="";
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
    const idVendaUnico = Math.floor(100000 + Math.random() * 900000).toString();
    const dataHora = new Date().toLocaleString('pt-BR');
    const cpfUsuario = localStorage.getItem('usuario_cpf') || "000.000.000-00";
    const nomeUsuario = localStorage.getItem('usuario_nome') || "Consumidor";
    const tipoUsuario = localStorage.getItem('usuario_tipo') || "Cliente";
    
    // Pega o valor do input de cupom, mas se estiver vazio ou desabilitado, define como "NENHUM"
    const inputCupomElement = document.getElementById('inputCupom');
    const cupomTexto = (inputCupomElement && inputCupomElement.value.trim() !== "") ? inputCupomElement.value : "NENHUM";

    const carrinhoParaVenda = JSON.parse(localStorage.getItem('carrinho')) || [];
    
    if (carrinhoParaVenda.length === 0) {
        alert("Erro: Carrinho vazio.");
        return;
    }

    // --- CORREÇÃO DO FATOR DE DESCONTO ---
    const txtTotalFinal = document.getElementById('totalFinal').innerText;
    const txtTotalOriginal = document.getElementById('totalOriginal').innerText;
    
    const valorTotalFinal = parseFloat(txtTotalFinal);
    const valorTotalOriginal = parseFloat(txtTotalOriginal);

    // Se não houver desconto, o fator é 1. Se houver, é a proporção (ex: 0.9 para 10% off)
    let fatorDesconto = 1; 
    if (valorTotalOriginal > 0 && valorTotalFinal < valorTotalOriginal) {
        fatorDesconto = valorTotalFinal / valorTotalOriginal;
    }

  const jsonVendaFinal = carrinhoParaVenda.map(item => {
        const valorItemOriginal = parseFloat(item.preco);
        const valorComDesconto = valorItemOriginal * fatorDesconto;
        
        let comissaoParceiro = 0;

        // CORREÇÃO AQUI: Usamos !== para comparar se o cupom é diferente de "NENHUM"
        // Também verificamos se o cupomTexto (variável que já limpamos lá em cima) não é "NENHUM"
        if (cupomTexto !== "NENHUM") {
            comissaoParceiro = valorItemOriginal * 0.15;
        }

        return {
            "ID Venda": idVendaUnico,
            "Data/Hora": dataHora,
            "CPF": cpfUsuario,
            "Nome": nomeUsuario,
            "Tipo": tipoUsuario,
            "Cod": item.codigo,
            "Produto": item.nome,
            "Valor Item": valorItemOriginal.toFixed(2),
            "cupom": cupomTexto,
            "Valor desconto": valorComDesconto.toFixed(2),
            "Valor parceiro": comissaoParceiro.toFixed(2),
            "Valor liquido": (valorComDesconto - comissaoParceiro).toFixed(2)
        };
    });

    console.log("--- NOVA VENDA GERADA ---");
    console.table(jsonVendaFinal);
    
    // Sugestão: Limpar o carrinho após sucesso para evitar duplicidade
    // localStorage.removeItem('carrinho');
    alert('Venda Finalizada');
});




// -----------------FORCÇAR QUE O TECLADO APAREÇA MESMO COM LEITOR-------------------------------
function forcarTeclado() {
    const inputs = document.querySelectorAll('input:not(#barcodeInput)');
    inputs.forEach(input => {
        // O atributo decimal ou numeric costuma forçar a chamada do teclado no Android
        if(!input.getAttribute('inputmode')) {
            input.setAttribute('inputmode', 'text'); 
        }
    });
}

document.addEventListener('DOMContentLoaded', forcarTeclado);

// -----------------/FORCÇAR QUE O TECLADO APAREÇA MESMO COM LEITOR-------------------------------
