// Função para carregar o perfil no topo da página
function carregarPerfilHeader() {
    const nome = localStorage.getItem('usuario_nome');
    const primeiroNome = nome.split(" ")[0];
    const tipo = localStorage.getItem('usuario_tipo');
    const saldo = localStorage.getItem('usuario_saldo');

    const elNome = document.getElementById('header-nome');
    const elSaldo = document.getElementById('header-saldo');
    const btnRelatorio = document.getElementById('btnRelatorio');

    if (nome) {
        // Pega apenas o primeiro nome para não ocupar muito espaço
        elNome.innerText = primeiroNome;

        // Se for parceiro, mostra o saldo
        if (tipo === "Parceiro" && saldo !== null) {
            // Somar + 0 remove o sinal negativo do zero
            const saldoFormatado = (parseFloat(saldo) + 0).toFixed(2);
            elSaldo.innerText = `Saldo: R$ ${saldoFormatado}`;
            elSaldo.style.display = 'block';
        }
    } else {
        // Se não tiver nome (sessão expirada ou não logado), redireciona para login
        window.location.href = "index.html";
    }
}

// Executa assim que a página carrega
document.addEventListener('DOMContentLoaded', carregarPerfilHeader);



btnSair.addEventListener('click', () => {
    window.location.href = "index.html";
});


// ------------------------INATIVIDADE DO APLICATIVO----------------------


// Configuração: 3 minutos (180.000 milissegundos)
const TEMPO_LIMITE = 3 * 60 * 1000;
let cronometroInatividade;

function iniciarMonitoramento() {
    // Lista de eventos que provam que o usuário ainda está lá
    const eventos = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    // Para cada interação, o cronômetro reinicia
    eventos.forEach(evento => {
        document.addEventListener(evento, resetarTemporizador, true);
    });

    resetarTemporizador();
}

function resetarTemporizador() {
    // Cancela o agendamento anterior
    clearTimeout(cronometroInatividade);

    // Se estiver na index.html, não precisa deslogar dela mesma
    if (!window.location.href.includes("index.html")) {
        // Agenda o logout para daqui a 3 minutos
        cronometroInatividade = setTimeout(voltarAoInicio, TEMPO_LIMITE);
    }
}

function voltarAoInicio() {
    // 1. Limpa os dados sensíveis do LocalStorage (CPF, Saldo, Carrinho)
    localStorage.clear();

    // 2. Opcional: Avisar o usuário antes (mas em totens autônomos geralmente é direto)
    // alert("Sessão encerrada por inatividade.");

    // 3. Volta para a página de Login
    window.location.href = "index.html";
}

// Inicia assim que a página carregar
document.addEventListener('DOMContentLoaded', iniciarMonitoramento);


// ------------------------/INATIVIDADE DO APLICATIVO----------------------



// Fechar ao clicar no botão cancelar
document.getElementById('btnFecharModal').addEventListener('click', () => {
    // Abre a caixa de confirmação
    const confirmacao = confirm("Tem certeza que deseja cancelar e voltar para o início?");
    // Se o usuário clicou em "OK" (true)
    if (confirmacao) {
        window.location.href = "index.html";
    }
    // Se clicou em "Cancelar" (false), o código não faz nada e o modal continua aberto
});




