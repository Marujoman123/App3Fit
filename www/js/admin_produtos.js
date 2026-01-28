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
                if (prod.linha!=""){ //REtirando os produtos usados para teste
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

    // --- MUDANÇA AQUI: Visualizar em vez de Baixar ---
    // Gera um link temporário (Blob URL) para o PDF
    const blob = doc.output('bloburl');
    
    // Abre em uma nova aba/janela do navegador
    window.open(blob, '_blank');
});