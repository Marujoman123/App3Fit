const btnEntrar = document.getElementById('btnEntrar');
const cpfInput = document.getElementById('cpf');
const mensagemErro = document.getElementById('mensagem-erro');
const inputs = document.querySelectorAll('input');

inputs.forEach(input => {
    input.addEventListener('focus', () => {
        // Aguarda 300ms para o teclado terminar de subir e centraliza o campo na tela
        setTimeout(() => {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    });
});


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
    const urlScript = "https://script.google.com/macros/s/AKfycbz6tx-CCnWhqW3IvahfDo0jQ6rVjEo3Eyqwl4Fcui0ZUubihtbhevnUbPy23QRLLR7l/exec";
    const cpfLimpo = cpfInput.value.replace(/\D/g, "");

    mensagemErro.innerText = "Verificando...";
    btnEntrar.disabled = true;

    try {
        // Faz a requisição GET para o Script
        const response = await fetch(`${urlScript}?cpf=${cpfLimpo}`);
        const resultado = await response.json();

        // ... dentro do ValidarNoGoogleSheets
        if (resultado.status === "exists") {
            alert("Bem-vindo, " + resultado.nome);
            window.location.href = "caixa.html"
        } else {
            // Se não existir, leva para o cadastro passando o CPF pela URL
            const cpfLimpo = cpfInput.value.replace(/\D/g, "");
            localStorage.setItem('cpfParaCadastro', cpfLimpo); // Salva no "HD" do celular
            window.location.href = "cadastro.html?cpf=" + cpfLimpo; // Tenta passar pela URL também
        }
    } catch (error) {
        console.error("Erro na consulta:", error);
        mensagemErro.innerText = "Erro ao conectar ao servidor.";
    } finally {
        btnEntrar.disabled = false;
    }
}

