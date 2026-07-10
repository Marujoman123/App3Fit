// URL do seu Google Apps Script (aquela que você gerou na implantação)
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbxoJK7T0b4-EmwtY7Nu00pLkNvBsZmeypryqsf_vCACvBtiK5LO54nFO8iUbfCNYVFg/exec";
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
        // Removido o 'no-cors' para permitir que o Script processe como uma requisição POST real
        const response = await fetch(URL_PLANILHA, {
            method: 'POST',
            body: JSON.stringify(dados) 
        });

        // Mesmo sem ler o corpo da resposta (devido ao Apps Script), 
        // o redirecionamento indica sucesso no envio.
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