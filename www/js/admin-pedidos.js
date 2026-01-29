const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";
let produtosEstoque = [];
let carrinhoManual = [];
let tipoPreco = 'Cliente';

async function iniciar() {
    const res = await fetch(URL_SCRIPT + "?todosProdutos=true");
    const json = await res.json();
    if (json.status === "success") {
        produtosEstoque = json.produtos;
        renderizarSelecao();
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
    const preco = (tipoPreco === 'Parceiro') ? parseFloat(p.precoParceiro) : parseFloat(p.precoCliente);

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

function renderizarCarrinho() {
    const div = document.getElementById('resumoPedido');
    let total = 0;

    if (carrinhoManual.length === 0) {
        div.innerHTML = '<p style="color: #888; text-align: center;">Nenhum item selecionado</p>';
        document.getElementById('totalPedido').innerText = `Total: R$ 0.00`;
        return;
    }

    div.innerHTML = carrinhoManual.map((item, idx) => {
        const sub = item.precoEfetivo * item.quantidade;
        total += sub;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px dashed #eee;">
                <div style="flex: 1;">
                    <span style="font-weight: bold;">${item.quantidade}x</span> ${item.nome}
                    <br><small style="color: #666;">R$ ${item.precoEfetivo.toFixed(2)} cada</small>
                </div>
                <div style="text-align: right; margin-right: 10px;">
                    <span style="font-weight: bold;">R$ ${sub.toFixed(2)}</span>
                </div>
                <button onclick="removerItemManual(${idx})" style="background: #ffcdd2; color: #c62828; border: none; border-radius: 5px; width: 30px; height: 30px; flex-shrink: 0; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
        `;
    }).join('');

    document.getElementById('totalPedido').innerText = `Total: R$ ${total.toFixed(2)}`;
}

async function gerarPDFPedido() {
    const nomeInput = document.getElementById('nomePedido');
    const nomeCliente = nomeInput.value.trim();

    // 1. Verificação de Nome Obrigatório
    if (nomeCliente === "") {
        alert("⚠️ Por favor, digite o nome do cliente antes de gerar o PDF.");
        nomeInput.style.border = "2px solid red"; // Destaca o erro
        nomeInput.focus();
        return; // Interrompe a função aqui
    }

    // 2. Verificação de Carrinho Vazio (Opcional, mas recomendado)
    if (carrinhoManual.length === 0) {
        alert("⚠️ O pedido está vazio. Adicione pelo menos um produto.");
        return;
    }

    // Se passou pelas validações, limpa o destaque vermelho e segue o fluxo
    nomeInput.style.border = "1px solid #ccc";


    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // 1. Calcular o total de unidades (marmitas)
    const adminResponsavel = localStorage.getItem('usuario_nome') || "Administrador";
    const dataHoje = new Date().toLocaleString('pt-BR');
    const totalMarmitas = carrinhoManual.reduce((acc, item) => acc + item.quantidade, 0);

    
    // Título e Cabeçalho
    doc.setFontSize(18);
    doc.text("PEDIDO DE COMPRA - 3FIT", 14, 20);

    doc.setFontSize(11);
    doc.text(`Nome: ${nomeCliente}`, 14, 30);
    doc.text(`Tipo de Preço: ${tipoPreco}`, 14, 37);

    // Mapeando dados para a tabela
    const body = carrinhoManual.map(i => [
        `${i.linha} - ${i.nome} (${i.kg})`,
        i.quantidade,
        `R$ ${i.precoEfetivo.toFixed(2)}`,
        `R$ ${(i.precoEfetivo * i.quantidade).toFixed(2)}`
    ]);

    doc.autoTable({
        startY: 45,
        head: [['Produto / Linha', 'Qtd', 'Unitário', 'Subtotal']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [255, 144, 69] },
        // --- AQUI VOCÊ MUDA A COR DO RODAPÉ ---
        footStyles: {
            fillColor: [255, 144, 69], // Cor de fundo (Ex: Azul Escuro em RGB)
            textColor: [255, 255, 255], // Cor do texto (Branco)
            fontSize: 11,
            fontStyle: 'bold'
        },
        foot: [
            ['', '', '', ''], // Linha vazia para respiro
            [
                { content: `TOTAL DE MARMITAS: ${totalMarmitas}`, colSpan: 2 },
                'TOTAL GERAL',
                document.getElementById('totalPedido').innerText.replace('Total: ', '')
            ]
        ]
    });

    // --- RODAPÉ DE AUTORIA (Abaixo da tabela) ---
    // doc.lastAutoTable.finalY nos dá a posição exata onde a tabela terminou
    const finalY = doc.lastAutoTable.finalY + 15;

    doc.setFontSize(9);
    doc.setTextColor(100); // Cor cinza para o rodapé
    doc.text(`Pedido gerado por: ${adminResponsavel}`, 14, finalY);
    doc.text(`Data de emissão: ${dataHoje}`, 14, finalY + 7);

    // Abrir visualização
    window.open(doc.output('bloburl'), '_blank');
}


function atualizarPrecosCarrinho() {
    // Percorre cada item que já foi adicionado ao carrinho manual
    carrinhoManual = carrinhoManual.map(item => {
        // Localiza o produto original na lista de estoque para pegar os dois preços
        const produtoOriginal = produtosEstoque.find(p => p.codigo === item.codigo);

        if (produtoOriginal) {
            // Define o novo preço efetivo baseado no botão que foi clicado
            const novoPreco = (tipoPreco === 'Parceiro')
                ? parseFloat(produtoOriginal.precoParceiro)
                : parseFloat(produtoOriginal.precoCliente);

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

iniciar();