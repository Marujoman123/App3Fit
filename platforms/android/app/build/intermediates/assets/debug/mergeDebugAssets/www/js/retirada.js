
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";
let totalGeral = 0;
let listaLocalProdutos = [];
let carrinho = [];

// Elementos da tela (IDs devem ser os mesmos do HTML do caixa)
const loading = document.getElementById('loading');
const barcodeInput = document.getElementById('barcodeInput');
const listaProdutosDiv = document.getElementById('listaProdutos');
const valorTotalTxt = document.getElementById('valorTotal');

async function carregarDados() {
    try {
        const res = await fetch(URL_SCRIPT + "?todosProdutos=true");
        const json = await res.json();
        if (json.status === "success") {
            listaLocalProdutos = json.produtos;
            loading.style.display = 'none';
            document.getElementById('conteudoCaixa').style.display = 'flex';
            barcodeInput.focus();
        }
    } catch (err) {
        alert("Erro ao sincronizar estoque.");
    }
}

document.getElementById('formBarcode').addEventListener('submit', (e) => {
    e.preventDefault();
    const codigo = barcodeInput.value.trim();
    const produtoInfo = listaLocalProdutos.find(p => p.codigo.toString() === codigo);

    if (produtoInfo) {
        // DIFERENCIAL: Aqui usamos SEMPRE o preço de custo
        const precoCusto = parseFloat(produtoInfo.precoCusto || 0);

        const itemExistente = carrinho.find(item => item.codigo === produtoInfo.codigo);
        if (itemExistente) {
            itemExistente.quantidade += 1;
        } else {
            carrinho.push({
                codigo: produtoInfo.codigo,
                nome: produtoInfo.nome,
                kg: produtoInfo.kg || "",
                preco: precoCusto, // Define o custo como preço do item
                quantidade: 1
            });
        }
        renderizarCarrinho();
    } else {
        alert("Produto não encontrado!");
    }
    barcodeInput.value = '';
});

function renderizarCarrinho() {
    listaProdutosDiv.innerHTML = '';
    totalGeral = 0;
    carrinho.forEach((item, index) => {
        const subtotal = item.preco * item.quantidade;
        totalGeral += subtotal;
        listaProdutosDiv.innerHTML += `
            <div class="linha-carrinho">
                <span class="col-nome">${item.nome} (Custo)</span>
                <span class="col-qtd">${item.quantidade}x</span>
                <span class="col-preco">R$ ${subtotal.toFixed(2)}</span>
                <button class="btn-remover" onclick="removerItem(${index})">×</button>
            </div>`;
    });
    valorTotalTxt.innerText = totalGeral.toFixed(2);
}

function removerItem(index) {
    if (carrinho[index].quantidade > 1) {
        carrinho[index].quantidade--;
    } else {
        carrinho.splice(index, 1);
    }
    renderizarCarrinho();
}

// Botão de Finalizar Retirada (Direto, sem maquininha)
document.getElementById('btnFinalizarRetirada').addEventListener('click', async () => {
    if (carrinho.length === 0) return alert("Carrinho vazio!");

    if (confirm("Confirmar a retirada destes itens do estoque?")) {
        // Prepara os dados para o registrarVendaFinal do Apps Script
        const idVendaUnico = "RET-" + Date.now();
        const dataHora = new Date().toLocaleString('pt-BR');
        
        const dadosFinal = carrinho.map(item => ({
            "ID Venda": idVendaUnico,
            "Data/Hora": dataHora,
            "CPF": localStorage.getItem('usuario_cpf'),
            "Nome": localStorage.getItem('usuario_nome'),
            "Tipo": "RETIRADA",
            "Cod": item.codigo,
            "Produto": item.nome,
            "Quantidade": item.quantidade,
            "Valor Unit": item.preco,
            "Valor Total Item": item.preco * item.quantidade,
            "cupom": "NENHUM",
            "ValoremSaldo": 0,
            "ValorPAgo": 0, // Como é retirada, o valor pago financeiramente é 0
            "Valor parceiro": 0,
            "Valor liquido": 0,
            "Tipo Pagamento": "RETIRADA_ESTOQUE"
        }));

        try {
            const res = await fetch(URL_SCRIPT, {
                method: 'POST',
                body: JSON.stringify({ acao: "registrarVendaFinal", dados: dadosFinal })
            });
            const data = await res.json();
            if (data.status === "success") {
                alert("Estoque atualizado com sucesso!");
                window.location.href = "admin.html";
            }
        } catch (e) {
            alert("Erro ao registrar retirada.");
        }
    }
});

carregarDados();