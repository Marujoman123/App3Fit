const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";
let totalGeral = 0;
let listaLocalProdutos = [];
let carrinho = []; // ADICIONADO: Array para armazenar os objetos dos produtos
const tipoUsuario = localStorage.getItem('usuario_tipo');
const nome = localStorage.getItem('usuario_nome');
const primeiroNome = nome.split(" ")[0];

// Elementos da tela
const loading = document.getElementById('loading');
const conteudoCaixa = document.getElementById('conteudoCaixa');
const formBarcode = document.getElementById('formBarcode');
const barcodeInput = document.getElementById('barcodeInput');
const listaProdutosDiv = document.getElementById('listaProdutos');
const valorTotalTxt = document.getElementById('valorTotal');


async function carregarDados() {
    try {
        const res = await fetch(URL_SCRIPT + "?todosProdutos=true");
        const json = await res.json();

        console.table(json);

        if (json.status === "success") {
            listaLocalProdutos = json.produtos;

            console.log(listaLocalProdutos)

            if (tipoUsuario === "Parceiro") {
                document.getElementById('header-nome').innerText = primeiroNome + " (Parceiro)";

                // Evento de Clique
                btnRelatorio.addEventListener('click', async () => {
                    window.location.href = "relatorio.html";
                });

                btnRelatorio.style.display = 'flex';


            } else {
                document.getElementById('header-nome').innerText = primeiroNome;
            }

            loading.style.display = 'none';
            conteudoCaixa.style.display = 'flex';
            barcodeInput.focus();
        }
    } catch (err) {
        alert("Erro ao sincronizar produtos. Verifique sua internet.");
        console.error(err);
    }
}

document.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') {
        barcodeInput.focus();
    }
});

formBarcode.addEventListener('submit', (e) => {
    e.preventDefault();
    const codigo = barcodeInput.value.trim();

    if (codigo) {
        const produtoInfo = listaLocalProdutos.find(p => p.codigo.toString() === codigo);

        if (produtoInfo) {
            // Acesse pelas propriedades
            const nome = produtoInfo.nome;
            const qtdEstoque = produtoInfo.quantidade;
            // ... restante da lógica
        }

        if (produtoInfo) {
            // 1. Pegar o preço correto (usando propriedades, não índices)
            // No novo formato, certifique-se que o doGet envia 'precoCliente' e 'precoParceiro'
            // ou ajuste conforme o objeto que você montou na Rota 1 do doGet
            const precoBruto = (tipoUsuario === "Parceiro") ? (produtoInfo.precoParceiro || 0) : (produtoInfo.precoCliente || 0);
            const precoVenda = gr(precoBruto); // Garante o arredondamento aqui

            // 2. Verifica se o produto já existe no carrinho (usando .codigo)
            const itemExistente = carrinho.find(item => item.codigo === produtoInfo.codigo);

            if (itemExistente) {
                itemExistente.quantidade += 1;
            } else {
                carrinho.push({
                    codigo: produtoInfo.codigo,
                    nome: produtoInfo.nome,
                    kg: produtoInfo.kg || "", // Se o seu objeto não tiver kg, evita erro
                    preco: precoVenda,
                    quantidade: 1
                });
            }

            renderizarCarrinho();
        } else {
            alert("Produto não cadastrado!");
        }
        barcodeInput.value = '';
    }
});

// FUNÇÃO PARA DESENHAR O CARRINHO NA TELA
function renderizarCarrinho() {
    listaProdutosDiv.innerHTML = '';
    totalGeral = 0;

    carrinho.forEach((item, index) => {
        // Aplica o gr() no subtotal do item
        const subtotalItem = gr(item.preco * item.quantidade);
        totalGeral = gr(totalGeral + subtotalItem); // Soma garantindo os centavos

        const itemDiv = document.createElement('div');
        itemDiv.className = 'linha-carrinho';
        itemDiv.innerHTML = `
            <span class="col-nome">${item.nome} - <b>${item.kg}</b></span>
            <span class="col-qtd">${item.quantidade}x</span>
            <span class="col-preco">R$ ${subtotalItem.toFixed(2)}</span>
            <div class="col-acao">
                <button class="btn-remover" onclick="removerItem(${index})">×</button>
            </div>
        `;
        listaProdutosDiv.appendChild(itemDiv);
    });

    valorTotalTxt.innerText = totalGeral.toFixed(2);
}



// FUNÇÃO PARA REMOVER OU DIMINUIR QUANTIDADE
function removerItem(index) {
    if (carrinho[index].quantidade > 1) {
        carrinho[index].quantidade -= 1;
    } else {
        carrinho.splice(index, 1);
    }
    renderizarCarrinho();
}






// 4. Botão Continuar
document.getElementById('btnContinuar').addEventListener('click', () => {
    if (totalGeral <= 0) {
        alert("O carrinho está vazio!");
        return;
    }

    // ADICIONADO: Salva o array de itens para a próxima página
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    localStorage.setItem('total_venda', totalGeral.toFixed(2));

    window.location.href = "pagamento.html";
});

carregarDados();




// No caixa.js, desative o teclado virtual explicitamente para o campo de scan
const inputScan = document.getElementById('barcodeInput');

if (inputScan) {
    // 1. Define como none
    inputScan.setAttribute('inputmode', 'none');

    // 2. Truque do readOnly: impede o teclado mas aceita entrada do leitor
    inputScan.addEventListener('focus', function () {
        this.readOnly = true;
        setTimeout(() => { this.readOnly = false; }, 50);
    });

    // 3. Forçar o fechamento se o teclado teimar em abrir
    inputScan.addEventListener('click', () => {
        inputScan.blur();
        setTimeout(() => inputScan.focus(), 10);
    });
}

// Função para evitar erros de ponto flutuante (centavos perdidos)
function gr(valor) {
    return Math.round((parseFloat(valor) + Number.EPSILON) * 100) / 100;
}








