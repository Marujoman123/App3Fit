// Função para carregar o perfil no topo da página
function carregarPerfilHeader() {
    const nome = localStorage.getItem('usuario_nome');
    const primeiroNome = nome.split(" ")[0];
    const tipo = localStorage.getItem('usuario_tipo');
    const saldo = localStorage.getItem('usuario_saldo');

    const elNome = document.getElementById('header-nome');
    const elSaldo = document.getElementById('header-saldo');

    if (nome) {
        // Pega apenas o primeiro nome para não ocupar muito espaço
        elNome.innerText = primeiroNome;

        // Se for parceiro, mostra o saldo
        if (tipo === "Parceiro" && saldo !== null) {
            elSaldo.innerText = `Saldo: R$ ${parseFloat(saldo).toFixed(2)}`;
            elSaldo.style.display = 'block';
        }
    } else {
        // Se não tiver nome (sessão expirada ou não logado), redireciona para login
        window.location.href = "index.html";
    }
}

// Executa assim que a página carrega
document.addEventListener('DOMContentLoaded', carregarPerfilHeader);