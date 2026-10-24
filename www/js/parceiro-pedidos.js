const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbxoJK7T0b4-EmwtY7Nu00pLkNvBsZmeypryqsf_vCACvBtiK5LO54nFO8iUbfCNYVFg/exec";
let produtosEstoque = [];
let carrinhoManual = [];
let tipoPreco = 'Cliente';

console.log(localStorage.getItem("origem_acesso"));

// Inicia ao carregar
document.addEventListener('DOMContentLoaded', iniciar);



async function iniciar() {
    try {
        const res = await fetch(URL_SCRIPT + "?todosProdutos=true");
        const json = await res.json();
        if (json.status === "success") {
            produtosEstoque = json.produtos;
            renderizarSelecao();
            document.getElementById('textLoading').style.display = 'none';
        }
    } catch (e) {
        alert("Erro ao carregar produtos.");
    }
}

function setTipo(tipo) {
    tipoPreco = tipo;
    document.getElementById('btnCli').classList.toggle('active', tipo === 'Cliente');
    document.getElementById('btnPar').classList.toggle('active', tipo === 'Parceiro');

    const nomeInput = document.getElementById('nomePedido');
    const nomeParceiro = localStorage.getItem('usuario_nome') || "Parceiro";

    if (tipo === 'Parceiro') {
        nomeInput.value = nomeParceiro;
        nomeInput.readOnly = true;
        nomeInput.style.backgroundColor = "#f0f0f0";
    } else {
        nomeInput.value = "";
        nomeInput.readOnly = false;
        nomeInput.style.backgroundColor = "#ffffff";
        nomeInput.placeholder = "Nome do seu cliente final";
    }
    atualizarPrecosCarrinho();
}

function renderizarSelecao() {
    const div = document.getElementById('listaSelecaoManual');
    div.innerHTML = produtosEstoque
        .filter(p => p.linha.toUpperCase() !== 'TESTE')
        .map(p => {
            const esgotado = p.quantidade <= 0 ? 'item-esgotado' : '';
            return `
                <div class="item-selecao ${esgotado}" onclick="adicionarManual('${p.codigo}')">
                    <div>
                        <small style="color: #666; display: block;">${p.linha}</small>
                        <strong>${p.nome}</strong> - <small>${p.kg}</small>
                    </div>
                    <span class="badge-estoque">${p.quantidade}</span>
                </div>`;
        }).join('');
}

function adicionarManual(codigo) {
    const p = produtosEstoque.find(x => x.codigo === codigo);
    if (!p || p.quantidade <= 0) return;

    p.quantidade--;
    const preco = (tipoPreco === 'Parceiro') ? gr(p.precoParceiro) : gr(p.precoCliente);

    const existente = carrinhoManual.find(x => x.codigo === codigo);
    if (existente) {
        existente.quantidade++;
        existente.precoEfetivo = preco;
    } else {
        carrinhoManual.push({
            codigo: p.codigo,
            nome: p.nome,
            kg: p.kg,
            linha: p.linha,
            quantidade: 1,
            precoEfetivo: preco
        });
    }
    renderizarSelecao();
    renderizarCarrinho();
}

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
            </div>`;
    }).join('');

    document.getElementById('totalPedido').innerText = `Total: R$ ${total.toFixed(2)}`;
    document.getElementById('countItens').innerText = totalItens;
}

function removerItemManual(index) {
    const item = carrinhoManual[index];
    const original = produtosEstoque.find(p => p.codigo === item.codigo);
    if (original) original.quantidade++;

    if (item.quantidade > 1) item.quantidade--;
    else carrinhoManual.splice(index, 1);

    renderizarSelecao();
    renderizarCarrinho();
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
    const totalMarmitas = carrinhoManual.reduce((acc, item) => acc + item.quantidade, 0);
    const dataHoje = new Date().toLocaleString('pt-BR');

    // Título e Cabeçalho
    doc.setFontSize(18);
    doc.text("PEDIDO DE COMPRA - 3FIT", 14, 20);

    doc.setFontSize(11);
    doc.text(`Nome: ${nomeCliente}`, 14, 30);
    const labelTipo = tipoPreco === 'Retirada' ? "RETIRADA DE ESTOQUE (CUSTO)" : `PREÇO: ${tipoPreco}`;
    doc.text(labelTipo, 14, 37);

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
        head: [['Cod', 'Linha', 'Produto', 'Qtd', 'Unitário', 'Subtotal']],
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
    const nomeArquivo = `Pedido_${nomeCliente.replace(/\s+/g, '_')}.pdf`;

    try {
        if (isMobile) {
            // No Mobile, usamos o método .save(). 
            // No Android, isso baixa o arquivo. No iOS, o Safari abre o visualizador nativo.
            doc.save(nomeArquivo);
        } else {
            // No PC, tentamos abrir a aba. Se falhar, ele baixa como segurança.
            const blob = doc.output('bloburl');
            if (!window.open(blob, '_blank')) {
                doc.save(nomeArquivo);
            }
        }
    } catch (e) {
        // Caso qualquer erro ocorra (comum em navegadores de dentro do Instagram/Facebook), 
        // tentamos o download forçado como última opção
        doc.save(nomeArquivo);
    }

    // Opcional: Chama o WhatsApp após 2 segundos
    // setTimeout(() => {
    //     if (confirm("Deseja enviar o resumo via WhatsApp?")) {
    //         enviarWhatsAppPedido(nomeCliente, document.getElementById('totalPedido').innerText, totalMarmitas);
    //     }
    // }, 2000);
}

function atualizarPrecosCarrinho() {
    carrinhoManual = carrinhoManual.map(item => {
        const original = produtosEstoque.find(p => p.codigo === item.codigo);
        if (original) {
            item.precoEfetivo = (tipoPreco === 'Parceiro') ? gr(original.precoParceiro) : gr(original.precoCliente);
        }
        return item;
    });
    renderizarCarrinho();
}

function limparPedidoCompleto() {
    if (confirm("Limpar carrinho?")) {
        carrinhoManual.forEach(item => {
            const original = produtosEstoque.find(p => p.codigo === item.codigo);
            if (original) original.quantidade += item.quantidade;
        });
        carrinhoManual = [];
        renderizarSelecao();
        renderizarCarrinho();
    }
}

function abrirModalResumo() { document.getElementById('modalResumo').style.display = 'flex'; }
function fecharModalResumo() { document.getElementById('modalResumo').style.display = 'none'; }