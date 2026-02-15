const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";
let produtosEstoque = [];
let carrinhoManual = [];
let tipoPreco = 'Cliente';
let dadosParceiroLocal = null;


iniciar();


// Função para evitar erros de ponto flutuante
function gr(valor) {
    return Math.round((parseFloat(valor) + Number.EPSILON) * 100) / 100;
}


function btnVoltar() {
    // Buscamos o tipo de usuário que salvamos no login
    const tipoUsuario = localStorage.getItem('usuario_tipo');

    if (tipoUsuario === "Parceiro") {
        window.location.href = "parceiro-painel.html";
    } else {
        // Se for Admin ou qualquer outro, volta para o admin
        window.location.href = "admin.html";
    }
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

    // 1. Atualiza a aparência visual dos botões
    document.getElementById('btnCli').classList.toggle('active', tipo === 'Cliente');
    document.getElementById('btnPar').classList.toggle('active', tipo === 'Parceiro');
    document.getElementById('btnRet').classList.toggle('active', tipo === 'Retirada');

    // 2. Lógica de Preenchimento Automático do Nome
    const nomeInput = document.getElementById('nomePedido');
    const nomeAdmin = localStorage.getItem('usuario_nome') || "Administrador";

    if (tipo === 'Retirada') {
        // Preenche com o nome do Admin logado
        nomeInput.value = nomeAdmin;
        nomeInput.readOnly = true; // Opcional: impede mudar o nome em retiradas
        nomeInput.style.backgroundColor = "#f0f0f0"; // Sinaliza que está travado
    } else {
        // Limpa o campo para preenchimento manual do cliente
        nomeInput.value = "";
        nomeInput.readOnly = false;
        nomeInput.style.backgroundColor = "#ffffff";
    }

    const btnBuscar = document.getElementById('btnBuscarParceiro');
    if (tipo === 'Parceiro') {
        btnBuscar.style.display = 'block';
        nomeInput.placeholder = 'Digite o CUPOM do parceiro para identificar';

    } else {
        btnBuscar.style.display = 'none';
        dadosParceiroLocal = null;
    }
    atualizarPrecosCarrinho();
}






// Função para buscar o parceiro na planilha pelo Nome ou CPF
document.getElementById('btnBuscarParceiro').addEventListener('click', async () => {

    BuscarParceiro();
});

function renderizarSelecao() {
    const div = document.getElementById('listaSelecaoManual');

    // 1. Primeiro filtramos a lista para remover o que for "TESTE"
    // 2. Depois mapeamos para gerar o HTML
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
            <span class="badge-estoque" style="${p.quantidade <= 0 ? 'color:red' : ''}">
                ${p.quantidade}
            </span>
        </div>
    `;
        }).join('');
}



function adicionarManual(codigo) {
    // Busca o produto na lista global de estoque
    const p = produtosEstoque.find(x => x.codigo === codigo);
    if (!p) return;

    // VERIFICAÇÃO DE ESTOQUE - Se estiver esgotado não consegue clicar mais
    if (p.quantidade <= 0) {
        // alert(`O produto ${p.nome} está esgotado!`);
        return;
    }

    // Subtrai do estoque local (memória)
    p.quantidade--;

    let preco;
    if (tipoPreco === 'Retirada') {
        preco = gr(p.precoCusto); // Usa o preço de custo da planilha
    } else if (tipoPreco === 'Parceiro') {
        preco = gr(p.precoParceiro);
    } else {
        preco = gr(p.precoCliente);
    }

    const existente = carrinhoManual.find(x => x.codigo === codigo);

    if (existente) {
        existente.quantidade++;
        existente.precoEfetivo = preco; // Garante que o preço atualize se mudar o botão
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
    // Percorre cada item que já foi adicionado ao carrinho manual
    carrinhoManual = carrinhoManual.map(item => {
        // Localiza o produto original na lista de estoque para pegar os dois preços
        const produtoOriginal = produtosEstoque.find(p => p.codigo === item.codigo);
        if (produtoOriginal) {
            let novoPreco;
            if (tipoPreco === 'Retirada') {
                novoPreco = gr(produtoOriginal.precoCusto);
            } else if (tipoPreco === 'Parceiro') {
                novoPreco = gr(produtoOriginal.precoParceiro);
            } else {
                novoPreco = gr(produtoOriginal.precoCliente);
            }
            return { ...item, precoEfetivo: novoPreco };
        }
        return item;
    });
    // Atualiza o resumo visual e o valor total na tela
    renderizarCarrinho();
}

function removerItemManual(index) {
    const itemNoCarrinho = carrinhoManual[index];

    // Localiza o produto na lista original para devolver o estoque
    const produtoOriginal = produtosEstoque.find(p => p.codigo === itemNoCarrinho.codigo);
    if (produtoOriginal) {
        produtoOriginal.quantidade++;
    }

    if (itemNoCarrinho.quantidade > 1) {
        itemNoCarrinho.quantidade -= 1;
    } else {
        carrinhoManual.splice(index, 1);
    }

    renderizarSelecao();
    renderizarCarrinho();
}

function limparPedidoCompleto() {
    if (confirm("Deseja remover todos os itens do pedido?")) {
        // Devolve tudo ao estoque antes de zerar
        carrinhoManual.forEach(item => {
            const original = produtosEstoque.find(p => p.codigo === item.codigo);
            if (original) {
                original.quantidade += item.quantidade;
            }
        });

        carrinhoManual = [];
        document.getElementById('nomePedido').value = '';
        renderizarSelecao();
        renderizarCarrinho();
    }
}

function abrirModalResumo() {
    document.getElementById('modalResumo').style.display = 'flex';
}

function fecharModalResumo() {
    document.getElementById('modalResumo').style.display = 'none';
}


function realizarVendaManual() {
    const nomeCliente = document.getElementById('nomePedido').value.trim();

    // Validações
    if (nomeCliente === "") {
        alert("⚠️ Por favor, digite o nome do cliente antes de realizar a venda.");
        document.getElementById('nomePedido').focus();
        return;
    }
    if (carrinhoManual.length === 0) {
        alert("⚠️ O carrinho está vazio.");
        return;
    }

    // Se for parceiro mas não buscou os dados, avisa
    if (tipoPreco === 'Parceiro' && !dadosParceiroLocal) {
        if (!confirm("Você não verificou o saldo do parceiro. Continuar assim mesmo?")) return;
    }

    // 1. Mapear carrinhoManual para o formato do checkout
    const carrinhoCheckout = carrinhoManual.map(item => ({
        codigo: item.codigo,
        nome: item.nome,
        kg: item.kg || "",
        preco: item.precoEfetivo,
        quantidade: item.quantidade
    }));

    // 2. Calcular o total geral
    const totalVenda = carrinhoManual.reduce((acc, item) => {
        return gr(acc + gr(item.precoEfetivo * item.quantidade));
    }, 0);

    // 3. Salvar no localStorage para a página de pagamento ler
    localStorage.setItem('carrinho', JSON.stringify(carrinhoCheckout));
    localStorage.setItem('total_venda', totalVenda.toFixed(2));

    // 4. Salvar dados do cliente temporariamente
    localStorage.setItem('usuario_nome', dadosParceiroLocal ? dadosParceiroLocal.nome : nomeCliente);
    localStorage.setItem('usuario_tipo', tipoPreco); // 'Cliente', 'Parceiro' ou 'Retirada'
    localStorage.setItem('usuario_cpf', dadosParceiroLocal ? dadosParceiroLocal.cpf : "000.000.000-00"); // CPF genérico para venda manual
    localStorage.setItem('usuario_saldo', dadosParceiroLocal ? dadosParceiroLocal.saldo : "0");

    // Flag para avisar a página de pagamento que é um lançamento manual
    localStorage.setItem('modo_pagamento_manual', 'true');

    // Se for retirada, avisamos a próxima página para travar cupons
    if (tipoPreco === 'Retirada') {
        localStorage.setItem('travar_cupom', 'true');
    } else {
        localStorage.removeItem('travar_cupom');
    }

    window.location.href = "pagamento.html";
}



async function BuscarParceiro() {

    const cupomDigitado = document.getElementById('nomePedido').value.trim().toUpperCase();
    if (!cupomDigitado) return alert("Digite o Cupom!");

    const btn = document.getElementById('btnBuscarParceiro');
    btn.innerText = "Buscando...";

    try {
        // A linha que você sugeriu, focada no parâmetro que o GS já entende
        const res = await fetch(`${URL_SCRIPT}?validarCupom=${cupomDigitado}`);
        const data = await res.json();

        if (data.status === "success") {
            // Guardamos os dados completos para levar para a página de pagamento
            dadosParceiroLocal = {
                nome: data.nome,
                cpf: data.cpf,
                saldo: data.saldo,
                tipo: "Parceiro"
            };
            alert(`Parceiro: ${data.nome}\nSaldo disponível: R$ ${parseFloat(data.saldo).toFixed(2)}`);
            document.getElementById('nomePedido').value = data.nome;
        } else {
            alert("Cupom não encontrado.");
            dadosParceiroLocal = null;
        }
    } catch (e) {
        alert("Erro na conexão.");
    } finally {
        btn.innerText = "🔍 Verificar Cupom";
    }




};

