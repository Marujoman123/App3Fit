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
        
        if (json.status === "success") {
            listaLocalProdutos = json.produtos;
            
            if (tipoUsuario === "Parceiro") {
                document.getElementById('header-nome').innerText = primeiroNome + " (Parceiro)";
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
        const produto = listaLocalProdutos.find(p => p[0].toString() === codigo);

        if (produto) {
            const codigoProduto = produto[0]; // <--- PEGA O CÓDIGO (Coluna 0)
            const nome = produto[1];
            const preco = (tipoUsuario === "Parceiro") ? produto[3] : produto[2];
            
            // MODIFICADO: Salva o código junto com nome e preco
            carrinho.push({ 
                codigo: codigoProduto, // <--- ADICIONADO NA PONTE
                nome: nome, 
                preco: parseFloat(preco) 
            });
            
            adicionarNaTela(nome, preco);
        } else {
            alert("Produto não cadastrado!");
        }
        barcodeInput.value = ''; 
    }
});

function adicionarNaTela(nome, preco) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-carrinho';
    
    itemDiv.innerHTML = `
        <div class="item-info">
            <span class="item-nome">${nome}</span>
            
        </div>
        <span class="item-preco">R$ ${parseFloat(preco).toFixed(2)}</span>
         <button class="btn-remover">×</button>
    `;

  itemDiv.querySelector('.btn-remover').addEventListener('click', (e) => {
    e.stopPropagation();
    
    // MODIFICADO: Agora buscamos também pelo código para ser mais preciso
    const index = carrinho.findIndex(item => item.nome === nome && item.preco === parseFloat(preco));
    
    if (index > -1) {
        carrinho.splice(index, 1);
    }

    totalGeral -= parseFloat(preco);
    if (totalGeral < 0) totalGeral = 0; 
    
    valorTotalTxt.innerText = totalGeral.toFixed(2);
    itemDiv.remove();
});

    listaProdutosDiv.append(itemDiv);
    
    totalGeral += parseFloat(preco);
    valorTotalTxt.innerText = totalGeral.toFixed(2);
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
    inputScan.setAttribute('inputmode', 'none'); // Isso diz ao Android: "não chame o teclado aqui"
}






