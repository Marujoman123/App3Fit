const btnEntrar = document.getElementById('btnEntrar');
const cpfInput = document.getElementById('cpf');
const mensagemErro = document.getElementById('mensagem-erro');
const inputs = document.querySelectorAll('input');
const loginContainer  = document.getElementById('loginContainer');

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
    const urlScript = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";
    const cpfLimpo = cpfInput.value.replace(/\D/g, "");

    // Mostra o loading e esconde o botão (conforme combinamos)
    loginContainer.style.display = 'none';
    loadingLogin.style.display = 'block';

    let resultado;

    try {
        const response = await fetch(`${urlScript}?cpf=${cpfLimpo}`);
        
        if (!response.ok) throw new Error("Erro na rede");
        
        resultado = await response.json();
    } catch (error) {
        // O erro só aparece se a requisição REALMENTE falhar antes do redirecionamento
        console.error("Erro na consulta:", error);
        alert("Erro ao consultar servidor.");
        
        // Se deu erro, volta o botão
        loginContainer.style.display = 'block';
        loadingLogin.style.display = 'none';
        return; // Sai da função
    }

    // Se o código chegou aqui, a consulta foi um sucesso. 
    // Agora tratamos os dados fora do try/catch para evitar o falso erro de rede.
    if (resultado.status === "exists") {
        // ADICIONE ESTA LINHA ABAIXO:
        localStorage.setItem('usuario_cpf', cpfLimpo); 
        
        localStorage.setItem('usuario_nome', resultado.nome);
        localStorage.setItem('usuario_tipo', resultado.tipo);

        if (resultado.tipo === "Parceiro") {
            localStorage.setItem('usuario_saldo', resultado.saldo);
            localStorage.setItem('usuario_cupom', resultado.cupom);
            window.location.href = "caixa.html";
        } else {
            window.location.href = "caixa.html";
        }
    } else {
        // Se o usuário não existe, também é bom salvar o CPF para o cadastro
        localStorage.setItem('usuario_cpf', cpfLimpo); 
        localStorage.setItem('cpfParaCadastro', cpfLimpo);
        window.location.href = "cadastro.html?cpf=" + cpfLimpo;
    }
}

