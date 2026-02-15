function voltarParaPainel() {
    const origem = localStorage.getItem('origem_acesso');
    const tipoUsuario = localStorage.getItem('usuario_tipo');

    if (origem === 'externo') {


        if (tipoUsuario === "Parceiro") {
            // Altere para o caminho real do seu index fora da estrutura
            window.location.href = "../parceiro-painel.html";
        } else {
            // Se for Admin ou qualquer outro, volta para o admin
            window.location.href = "admin.html";
        }




    } else {


        if (tipoUsuario === "Parceiro") {
            // Altere para o caminho real do seu index fora da estrutura
            window.location.href = "parceiro-painel.html";
        } else {
            // Se for Admin ou qualquer outro, volta para o admin
            window.location.href = "admin.html";
        }

    }

}




// Função para evitar erros de ponto flutuante
function gr(valor) {
    return Math.round((parseFloat(valor) + Number.EPSILON) * 100) / 100;
}


