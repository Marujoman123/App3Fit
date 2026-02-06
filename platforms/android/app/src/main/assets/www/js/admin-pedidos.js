const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";
let produtosEstoque = [];
let carrinhoManual = [];
let tipoPreco = 'Cliente';


// Função para evitar erros de ponto flutuante
function gr(valor) {
    return Math.round((parseFloat(valor) + Number.EPSILON) * 100) / 100;
}

async function iniciar() {
    const res = await fetch(URL_SCRIPT + "?todosProdutos=true");
    const json = await res.json();
    if (json.status === "success") {
        produtosEstoque = json.produtos;
        renderizarSelecao();
        document.getElementById('textLoading').style.display = 'none';
    }
}

function setTipo(tipo) {
    tipoPreco = tipo;
    document.getElementById('btnCli').classList.toggle('active', tipo === 'Cliente');
    document.getElementById('btnPar').classList.toggle('active', tipo === 'Parceiro');
    // Se mudar o tipo, atualiza os preços do carrinho já existente
    atualizarPrecosCarrinho();
}

function renderizarSelecao() {
    const div = document.getElementById('listaSelecaoManual');

    // 1. Primeiro filtramos a lista para remover o que for "TESTE"
    // 2. Depois mapeamos para gerar o HTML
    div.innerHTML = produtosEstoque
        .filter(p => p.linha.toUpperCase() !== 'TESTE')
        .map(p => `
            <div class="item-selecao" onclick="adicionarManual('${p.codigo}')">
                <div>
                    <small style="color: #666; display: block;">${p.linha}</small>
                    <strong>${p.nome}</strong> - <small>${p.kg}</small>
                </div>
                <span class="badge-estoque">${p.quantidade}</span>
            </div>
        `).join('');
}



function adicionarManual(codigo) {
    const p = produtosEstoque.find(x => x.codigo === codigo);
    if (!p) return;

    const existente = carrinhoManual.find(x => x.codigo === codigo);
    const preco = (tipoPreco === 'Parceiro') ? gr(p.precoParceiro) : gr(p.precoCliente);

    if (existente) {
        existente.quantidade++;
    } else {
        carrinhoManual.push({
            codigo: p.codigo,
            nome: p.nome,
            kg: p.kg, // Adicionado
            linha: p.linha,     // Adicionado
            quantidade: 1,
            precoEfetivo: preco
        });
    }
    renderizarCarrinho();
}

// Atualize sua função de renderizarCarrinho para atualizar o contador
function renderizarCarrinho() {
    const div = document.getElementById('resumoPedido');
    let total = 0;
    let totalItens = 0;

    div.innerHTML = carrinhoManual.map((item, idx) => {
        const sub = gr(item.precoEfetivo * item.quantidade);
        total = gr(total + sub);
        totalItens += item.quantidade;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span><b>${item.quantidade}x</b> ${item.nome}</span>
                <span>R$ ${sub.toFixed(2)}</span>
                <button onclick="removerItemManual(${idx})" style="border:none; background:#ffcdd2; color:#c62828; border-radius:5px; padding:2px 8px; width: 40px; height: 40px;">×</button>
            </div>
        `;
    }).join('');

    document.getElementById('totalPedido').innerText = `Total: R$ ${total.toFixed(2)}`;
    document.getElementById('countItens').innerText = totalItens; // Atualiza o botão flutuante
}

async function gerarPDFPedido() {
    const nomeInput = document.getElementById('nomePedido');
    const nomeCliente = nomeInput.value.trim();

    // 1. Verificação de Nome Obrigatório
    if (nomeCliente === "") {
        alert("⚠️ Por favor, digite o nome do cliente antes de gerar o PDF.");
        nomeInput.style.border = "2px solid red";
        nomeInput.focus();
        return;
    }

    // 2. Verificação de Carrinho Vazio
    if (carrinhoManual.length === 0) {
        alert("⚠️ O pedido está vazio. Adicione pelo menos um produto.");
        return;
    }

    nomeInput.style.border = "1px solid #ccc";

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const adminResponsavel = localStorage.getItem('usuario_nome') || "Administrador";
    const dataHoje = new Date().toLocaleString('pt-BR');
    const totalMarmitas = carrinhoManual.reduce((acc, item) => acc + item.quantidade, 0);

    // Título e Cabeçalho
    doc.setFontSize(18);
    doc.text("PEDIDO DE COMPRA - 3FIT", 14, 20);

    doc.setFontSize(11);
    doc.text(`Nome: ${nomeCliente}`, 14, 30);
    doc.text(`Tipo de Preço: ${tipoPreco}`, 14, 37);

    // Mapeando dados para a tabela com a trava de centavos gr()
    const body = carrinhoManual.map(i => {
        const subtotalItem = gr(i.precoEfetivo * i.quantidade);
        return [
            i.codigo,
            i.linha,
            `${i.nome} (${i.kg})`,
            i.quantidade,
            `R$ ${i.precoEfetivo.toFixed(2)}`,
            `R$ ${subtotalItem.toFixed(2)}`
        ];
    });

    doc.autoTable({
        startY: 45,
        head: [['Cod','Linha','Produto', 'Qtd', 'Unitário', 'Subtotal']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [255, 144, 69] },
        footStyles: {
            fillColor: [255, 144, 69],
            textColor: [255, 255, 255],
            fontSize: 11,
            fontStyle: 'bold'
        },
        foot: [
            [
                { content: `TOTAL DE MARMITAS: ${totalMarmitas}`, colSpan: 4 },
                'Total',
                document.getElementById('totalPedido').innerText.replace('Total: ', '')
            ],
        ]
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Pedido gerado por: ${adminResponsavel}`, 14, finalY);
    doc.text(`Data de emissão: ${dataHoje}`, 14, finalY + 7);

    // --- LÓGICA HÍBRIDA: PC vs MOBILE ---
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        // No Mobile: Baixa o arquivo (Android) ou abre visualização nativa (iOS)
        // Substituímos espaços no nome por underline para evitar erro no arquivo
        const nomeArquivo = `Pedido_${nomeCliente.replace(/\s+/g, '_')}.pdf`;
        doc.save(nomeArquivo);
    } else {
        // No PC: Abre em nova aba
        window.open(doc.output('bloburl'), '_blank');
    }
}


function atualizarPrecosCarrinho() {
    // Percorre cada item que já foi adicionado ao carrinho manual
    carrinhoManual = carrinhoManual.map(item => {
        // Localiza o produto original na lista de estoque para pegar os dois preços
        const produtoOriginal = produtosEstoque.find(p => p.codigo === item.codigo);

        if (produtoOriginal) {
            // Define o novo preço efetivo baseado no botão que foi clicado
            const novoPreco = (tipoPreco === 'Parceiro')
                ? gr(produtoOriginal.precoParceiro)
                : gr(produtoOriginal.precoCliente);

            return { ...item, precoEfetivo: novoPreco };
        }
        return item;
    });

    // Atualiza o resumo visual e o valor total na tela
    renderizarCarrinho();
}

function removerItemManual(index) {
    if (carrinhoManual[index].quantidade > 1) {
        // Se tem mais de 1, apenas diminui a quantidade
        carrinhoManual[index].quantidade -= 1;
    } else {
        // Se só tem 1, remove o item do array
        carrinhoManual.splice(index, 1);
    }
    renderizarCarrinho();
}

function limparPedidoCompleto() {
    if (confirm("Deseja remover todos os itens do pedido?")) {
        carrinhoManual = [];
        document.getElementById('nomePedido').value = '';
        renderizarCarrinho();
    }
}

function abrirModalResumo() {
    document.getElementById('modalResumo').style.display = 'flex';
}

function fecharModalResumo() {
    document.getElementById('modalResumo').style.display = 'none';
}

iniciar();