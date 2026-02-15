const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";

// admin-relatorio.js
async function carregarRelatorio() {
    const corpo = document.getElementById('corpoTabela');
    const loading = document.getElementById('loadingEstoque');
    const tabela = document.getElementById('tabelaEstoque');

    try {
        const res = await fetch(URL_SCRIPT + "?todosProdutos=true");
        const json = await res.json();

        if (json.status === "success") {
            corpo.innerHTML = "";
            
            // Agora 'prod' é um objeto {codigo, nome, quantidade}
            json.produtos.forEach(prod => {
                const tr = document.createElement('tr');
                const classeQtd = prod.quantidade <= 2 ? 'style="color:red; font-weight:bold;"' : prod.quantidade <= 4 ? 'style="color:#CA9802; font-weight:bold;"' : '';
                if (prod.linha.toUpperCase() !== 'TESTE'){ //REtirando os produtos usados para teste
                tr.innerHTML = `
                    <td>${prod.linha}</td>
                    <td>${prod.nome}</td>
                    <td ${classeQtd}>${prod.quantidade}</td>
                `;
                }
                corpo.appendChild(tr);
            });

            loading.style.display = 'none';
            tabela.style.display = 'table';
            document.getElementById('btnPDF').style.display = 'block';
        }
    } catch (err) {
        loading.innerText = "Erro na conexão.";
        console.error(err);
    }
}

document.addEventListener('DOMContentLoaded', carregarRelatorio);


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



document.getElementById('btnPDF').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configuração do Título
    doc.setFontSize(18);
    doc.text("Relatório de Estoque - 3Fit", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 28);

    // Gerar a tabela
    doc.autoTable({
        html: '#tabelaEstoque',
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [255, 144, 69] }
    });

    // --- LÓGICA HÍBRIDA: PC vs MOBILE ---
    
    // Detecta se é um dispositivo móvel
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        // No Mobile, força o download direto. 
        // O Android baixa e o iOS abre uma tela de visualização própria.
        doc.save(`estoque_3fit_${Date.now()}.pdf`);
    } else {
        // No PC, mantém a abertura na nova aba
        const blob = doc.output('bloburl');
        window.open(blob, '_blank');
    }
});