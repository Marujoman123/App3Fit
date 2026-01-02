// URL do seu Google Apps Script (aquela que você gerou na implantação)
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbzOsEqzpZPE0JJk6U3Hs7Y3pAU2d47kuBcKuRy1k2RfPOeQ4muCLj8GLG1GhHZ7eCjz/exec";
const cadCpf = document.getElementById('cadCpf');
const btnSalvar = document.getElementById('btnSalvar');

const cadNome = document.getElementById('cadNome');
const cadTelefone = document.getElementById('cadTelefone');
const inputs = document.querySelectorAll('input');


capturarCPF();
cadNome.focus();

// Máscara e Tecla Enter (Seu código original está perfeito aqui)
cadCpf.addEventListener('input', (e) => {
    let valor = e.target.value.replace(/\D/g, "");
    if (valor.length > 11) valor = valor.slice(0, 11);
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = valor;
});

cadCpf.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        cadNome.focus();
    }
});

cadNome.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        cadTelefone.focus();
    }
});

cadTelefone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        btnSalvar.click();
    }
});


// 2. Máscara de Telefone (Opcional, mas melhora a experiência)
cadTelefone.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, "");
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    e.target.value = v;
});

// 3. Evento de clique para salvar
btnSalvar.addEventListener('click', async () => {
    const nome = cadNome.value.trim();
    const telefone = cadTelefone.value.trim();
    const cpf = cadCpf.value;
    const cpfLimpo = cpf.replace(/\D/g, "");

    if (!nome || !telefone || !cpf) {
        alert("Por favor, preencha todos os campos.");
        cadNome.focus();
        return;
    }

    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";

    const dados = {
        cpf: cpf,
        nome: nome,
        telefone: telefone.replace(/\D/g, ""),
        tipo: "Cliente",
        saldo: 0
    };

    try {
        // Enviando para o Google Sheets
        const response = await fetch(URL_PLANILHA, {
            method: 'POST',
            mode: 'no-cors', // Importante para evitar erros de CORS no Apps Script
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        // Como usamos 'no-cors', o fetch não consegue ler o JSON de resposta com precisão, 
        // mas se não cair no 'catch', o dado foi enviado.
        alert("Cadastro realizado com sucesso!");


        localStorage.setItem('usuario_cpf', cpfLimpo);        
        localStorage.setItem('usuario_nome', nome);
        localStorage.setItem('usuario_tipo', "Cliente");

        window.location.href = "caixa.html";

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao conectar com o banco de dados.");
        btnSalvar.disabled = false;
        btnSalvar.innerText = "Finalizar Cadastro";
    }
});


function capturarCPF() {

    // 1. Tenta pegar o CPF da URL ou do LocalStorage
    const urlParams = new URLSearchParams(window.location.search);
    let cpfRecebido = urlParams.get('cpf') || localStorage.getItem('cpfParaCadastro');

    if (cpfRecebido && cadCpf) {
        // Remove qualquer caractere que não seja número antes de formatar
        let valor = cpfRecebido.replace(/\D/g, "");

        // Aplica a máscara: 000.000.000-00
        if (valor.length === 11) {
            valor = valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        }

        cadCpf.value = valor;
        console.log("CPF carregado e formatado: " + valor);
    }
}



// -----------------FORCÇAR QUE O TECLADO APAREÇA MESMO COM LEITOR-------------------------------
function forcarTeclado() {
    const inputs = document.querySelectorAll('input:not(#barcodeInput)');
    inputs.forEach(input => {
        // O atributo decimal ou numeric costuma forçar a chamada do teclado no Android
        if(!input.getAttribute('inputmode')) {
            input.setAttribute('inputmode', 'text'); 
        }
    });
}

document.addEventListener('DOMContentLoaded', forcarTeclado);

// -----------------/FORCÇAR QUE O TECLADO APAREÇA MESMO COM LEITOR-------------------------------