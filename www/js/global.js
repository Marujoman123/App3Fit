// Script comum (não-módulo): carregado antes dos scripts das páginas ainda não migradas.
function voltarParaPainel() {
    const origem = localStorage.getItem('origem_acesso');
    const tipoUsuario = localStorage.getItem('usuario_tipo');
    const prefixo = origem === 'externo' ? '../' : '';

    if (tipoUsuario === "Parceiro") {
        window.location.href = prefixo + "parceiro-painel.html";
    } else if (tipoUsuario === "Cliente") {
        window.location.href = prefixo + "cliente-painel.html";
    } else {
        window.location.href = "admin.html";
    }
}

// Evita erros de ponto flutuante
function gr(valor) {
    return Math.round((parseFloat(valor) + Number.EPSILON) * 100) / 100;
}
