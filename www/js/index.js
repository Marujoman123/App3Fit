const btnEntrar = document.getElementById('btnEntrar');
const cpfInput = document.getElementById('cpf');
const mensagemErro = document.getElementById('mensagem-erro');

// Evento de Clique
btnEntrar.addEventListener('click', async () => {
    // 1. Primeiro valida a matemática do CPF localmente
    const cpfValidoMatematicamente = TestaCPF();

    if (!cpfValidoMatematicamente) {
        alert("O CPF " + cpfInput.value + " não é válido.");
        cpfInput.value = '';
        mensagemErro.innerText = "Digite um CPF válido.";
        return; // Para a execução aqui
    }

    // 2. Se a matemática estiver OK, chama a validação na Planilha
    await ValidarNoGoogleSheets();
});

// Máscara e Tecla Enter (Seu código original está perfeito aqui)
cpfInput.addEventListener('input', (e) => {
    let valor = e.target.value.replace(/\D/g, "");
    if (valor.length > 11) valor = valor.slice(0, 11);
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = valor;
});

cpfInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        btnEntrar.click();
    }
});

// Função Matemática (Validada)
function TestaCPF() {
    const strCPF = cpfInput.value.replace(/\D/g, "");
    if (strCPF.length !== 11 || strCPF.split('').every(char => char === strCPF[0])) return false;

    let Soma = 0;
    let Resto;

    for (let i = 1; i <= 9; i++) Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
    Resto = (Soma * 10) % 11;
    if ((Resto == 10) || (Resto == 11)) Resto = 0;
    if (Resto != parseInt(strCPF.substring(9, 10))) return false;

    Soma = 0;
    for (let i = 1; i <= 10; i++) Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (12 - i);
    Resto = (Soma * 10) % 11;
    if ((Resto == 10) || (Resto == 11)) Resto = 0;
    if (Resto != parseInt(strCPF.substring(10, 11))) return false;

    return true;
}

// Função de Consulta à Planilha
async function ValidarNoGoogleSheets() {
    const URL_PLANILHA = "https://script.google.com/macros/s/AKfycby--AQNhoQcwiA7pI0pj181_IbN0oGmqhi0MPbzxESgiKU4S2PHzBCdo3zgLRbnZ1Ij/exec";
    const cpfLimpo = cpfInput.value.replace(/\D/g, "");

    mensagemErro.style.color = "#007bff";
    mensagemErro.innerText = "Consultando base de dados...";
    btnEntrar.disabled = true;

    try {
        const resposta = await fetch(`${URL_PLANILHA}?cpf=${cpfLimpo}`, {
            method: 'GET',
            mode: 'cors', // Garante que o navegador lide com o compartilhamento de recursos
            redirect: 'follow' // Necessário para seguir o redirecionamento do Google
        });
        const resultado = await resposta.json();

        if (resultado.status === "encontrado") {
            mensagemErro.style.color = "#28a745";
            mensagemErro.innerText = "Acesso autorizado!";
            alert("Sucesso! Bem-vindo.");
        } else {
            mensagemErro.style.color = "#dc3545";
            mensagemErro.innerText = "CPF não autorizado no sistema.";
        }
    } catch (erro) {
        mensagemErro.innerText = "Erro de conexão com a planilha.";
        console.error("Erro no Fetch:", erro);
    } finally {
        btnEntrar.disabled = false;
    }
}