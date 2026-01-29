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
            const precoVenda = (tipoUsuario === "Parceiro") ? parseFloat(produtoInfo.precoParceiro || 0) : parseFloat(produtoInfo.precoCliente || 0);

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
        const subtotalItem = item.preco * item.quantidade;
        totalGeral += subtotalItem;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'linha-carrinho'; // Use a mesma classe do header
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
    listaProdutosDiv.scrollTop = listaProdutosDiv.scrollHeight;
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






// function adicionarNaTela(nome, preco, kg) {
//     const itemDiv = document.createElement('div');
//     itemDiv.className = 'item-carrinho';

//     itemDiv.innerHTML = `  
//             <span class="item-nome">${nome} - <b>${kg}</b></span>
//             <span class="item-preco">R$ ${parseFloat(preco).toFixed(2)}</span>      
//           <button class="btn-remover">×</button>
//     `;

//     itemDiv.querySelector('.btn-remover').addEventListener('click', (e) => {
//         e.stopPropagation();

//         // MODIFICADO: Agora buscamos também pelo código para ser mais preciso
//         const index = carrinho.findIndex(item => item.nome === nome && item.preco === parseFloat(preco));

//         if (index > -1) {
//             carrinho.splice(index, 1);
//         }

//         totalGeral -= parseFloat(preco);
//         if (totalGeral < 0) totalGeral = 0;

//         valorTotalTxt.innerText = totalGeral.toFixed(2);
//         itemDiv.remove();
//     });

//     listaProdutosDiv.append(itemDiv);

//     // NOVO: Faz o scroll descer automaticamente ao adicionar um produto
//     listaProdutosDiv.scrollTop = listaProdutosDiv.scrollHeight;

//     totalGeral += parseFloat(preco);
//     valorTotalTxt.innerText = totalGeral.toFixed(2);
// }



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








