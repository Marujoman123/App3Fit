// ======================================================
// 1. FUNÇÃO PRINCIPAL (ROTEADOR GET)
// ======================================================
function doGet(e) {
  try {
    // Conecta na planilha ativa
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- ROTA 1: Listar TODOS os produtos (Carregamento inicial) ---
    if (e.parameter.todosProdutos) {
      var abaProd = ss.getSheets()[2]; // Aba Produtos
      var dados = abaProd.getDataRange().getValues();
      dados.shift(); // Remove a linha de cabeçalho
      return respostaJSON({ status: "success", produtos: dados });
    }
    
    // --- ROTA 2: Validar Cupom (Nova Lógica) ---
    if (e.parameter.validarCupom) {
      return validarCupom(e.parameter.validarCupom, ss);
    }
    
    // --- ROTA 3: Buscar Produto Único (Código de Barras) ---
    if (e.parameter.barcode) {
      return buscarProduto(e.parameter.barcode, ss);
    }
    
    // --- ROTA 4: Login (CPF) ---
    if (e.parameter.cpf) {
      return realizarLogin(e.parameter.cpf, ss);
    }
    
    // Se nenhum parâmetro conhecido for enviado:
    return respostaJSON({status: "error", message: "Rota não encontrada ou parâmetro inválido"});

  } catch (err) {
    // Captura erros gerais de execução
    return respostaJSON({status: "error", message: err.toString()});
  }
}

// ======================================================
// 2. FUNÇÕES AUXILIARES (LÓGICA DO NEGÓCIO)
// ======================================================

// Função para validar se o cupom existe na aba Parceiros
function validarCupom(cupomRecebido, ss) {
  var cupomBuscado = cupomRecebido.toUpperCase().trim();
  var abaParceiros = ss.getSheets()[1]; // Aba Parceiros (Índice 1)
  var dados = abaParceiros.getDataRange().getValues();

  // Começa do 1 para pular o cabeçalho
  for (var i = 1; i < dados.length; i++) {
    // Coluna D (índice 3) é onde está o código do cupom
    if (dados[i][3].toString().toUpperCase().trim() === cupomBuscado) {
      return respostaJSON({
        status: "success",
        parceiro: dados[i][1], // Retorna o nome do parceiro dono do cupom
        mensagem: "Cupom válido"
      });
    }
  }
  return respostaJSON({ status: "not_found", message: "Cupom inválido" });
}

// Função para buscar um produto específico
function buscarProduto(barcode, ss) {
  var abaProd = ss.getSheets()[2]; // Aba Produtos (Índice 2)
  var dados = abaProd.getDataRange().getValues();
  
  for (var i = 1; i < dados.length; i++) {
    // Converte para String e remove espaços para garantir a comparação
    if (dados[i][0].toString().trim() === barcode.toString().trim()) {
      return respostaJSON({
        status: "success",
        nome: dados[i][1],
        precoCliente: dados[i][2],
        precoParceiro: dados[i][3]
      });
    }
  }
  return respostaJSON({status: "not_found"});
}

// Função para fazer Login
function realizarLogin(cpfOriginal, ss) {
  var cpf = cpfOriginal.replace(/\D/g, "");
  
  // 1. Busca na aba Clientes (Índice 0)
  var abaCli = ss.getSheets()[0];
  var dadosCli = abaCli.getDataRange().getValues();
  for (var i = 1; i < dadosCli.length; i++) {
    if (dadosCli[i][0].toString().replace(/\D/g, "") === cpf) {
      return respostaJSON({status: "exists", tipo: "Cliente", nome: dadosCli[i][1]});
    }
  }
  
  // 2. Busca na aba Parceiros (Índice 1)
  var abaPar = ss.getSheets()[1];
  var dadosPar = abaPar.getDataRange().getValues();
  for (var j = 1; j < dadosPar.length; j++) {
    if (dadosPar[j][0].toString().replace(/\D/g, "") === cpf) {
      return respostaJSON({
        status: "exists", 
        tipo: "Parceiro", 
        nome: dadosPar[j][1],
        cupom: dadosPar[j][3],
        saldo: dadosPar[j][4]
      });
    }
  }
  return respostaJSON({status: "not_found"});
}

// ======================================================
// 3. FUNÇÃO DE PROCESSAMENTO DE DADOS (POST)
// ======================================================
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (Array.isArray(data)) {
      var sheetVendas = ss.getSheetByName("Vendas");
      var sheetParceiros = ss.getSheetByName("Parceiros");
      
      var totalSaldoDebitar = 0;    // Saldo usado pelo comprador (se for parceiro)
      var totalComissaoCreditar = 0; // Comisssão para o dono do cupom
      var cpfComprador = data[0]["CPF"].replace(/\D/g, "");
      var cupomUsado = data[0]["cupom"].toUpperCase().trim();

      // 1. Grava os itens na aba Vendas e calcula totais
      data.forEach(function(item) {
        totalSaldoDebitar += parseFloat(item["ValoremSaldo"]);
        totalComissaoCreditar += parseFloat(item["Valor parceiro"]);
        
        sheetVendas.appendRow([
          item["ID Venda"], item["Data/Hora"], item["CPF"], item["Nome"],
          item["Tipo"], item["Cod"], item["Produto"], item["Valor Item"],
          item["cupom"], item["ValoremSaldo"], item["ValorPAgo"],
          item["Valor parceiro"], item["Valor liquido"]
        ]);
      });

      var dadosPar = sheetParceiros.getDataRange().getValues();

      // 2. LÓGICA DE SALDO
      for (var i = 1; i < dadosPar.length; i++) {
        var cpfNaPlanilha = dadosPar[i][0].toString().replace(/\D/g, "");
        var cupomNaPlanilha = dadosPar[i][3].toString().toUpperCase().trim();

        // A) DEBITAR saldo do comprador (se ele usou saldo próprio)
        if (totalSaldoDebitar > 0 && cpfNaPlanilha === cpfComprador) {
          var saldoAtual = parseFloat(dadosPar[i][4]) || 0;
          sheetParceiros.getRange(i + 1, 5).setValue(saldoAtual - totalSaldoDebitar);
        }

        // B) CREDITAR comissão ao DONO DO CUPOM (se um cupom foi usado)
        if (cupomUsado !== "NENHUM" && cupomNaPlanilha === cupomUsado) {
          var saldoAtualDono = parseFloat(dadosPar[i][4]) || 0;
          // Soma a comissão ao saldo do dono do cupom
          sheetParceiros.getRange(i + 1, 5).setValue(saldoAtualDono + totalComissaoCreditar);
        }
      }
      
      return respostaJSON({status: "success"});
    } 
    
    // ... manter lógica de cadastro de cliente ...
  } catch (err) {
    return respostaJSON({status: "error", message: err.toString()});
  }
}




// ======================================================
// 4. FORMATADOR DE RESPOSTA (JSON)
// ======================================================
function respostaJSON(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}








