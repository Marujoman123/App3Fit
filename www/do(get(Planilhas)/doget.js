// ======================================================
// 1. FUNÇÃO PRINCIPAL (ROTEADOR GET)
// ======================================================
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- ROTA 1: Listar TODOS os produtos (Carregamento inicial) ---
    if (e.parameter.todosProdutos) {
      var abaProd = ss.getSheets()[2]; // Aba Produtos
      var dados = abaProd.getDataRange().getValues();
      dados.shift(); // Remove a linha de cabeçalho
      return respostaJSON({ status: "success", produtos: dados });
    }
    
    // --- ROTA 2: Validar Cupom ---
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

    // --- ROTA 5: Buscar todas as vendas para o Relatório Local ---
    // (IMPORTANTE: Deve vir antes da mensagem de "Rota não encontrada")
    if (e.parameter.buscarTodasVendas) {
      var sheetVendas = ss.getSheetByName("Vendas");
      if (!sheetVendas) {
        return respostaJSON({ status: "error", message: "Aba Vendas não encontrada" });
      }
      var dadosVendas = sheetVendas.getDataRange().getValues();
      return respostaJSON({ status: "success", vendas: dadosVendas });
    }
    
    // Se nenhum parâmetro conhecido for enviado:
    return respostaJSON({status: "error", message: "Rota não encontrada ou parâmetro inválido"});

  } catch (err) {
    return respostaJSON({status: "error", message: err.toString()});
  }
}

// ======================================================
// 2. FUNÇÕES AUXILIARES (LÓGICA DO NEGÓCIO)
// ======================================================

function validarCupom(cupomRecebido, ss) {
  var cupomBuscado = cupomRecebido.toUpperCase().trim();
  var abaParceiros = ss.getSheets()[1]; // Aba Parceiros
  var dados = abaParceiros.getDataRange().getValues();

  for (var i = 1; i < dados.length; i++) {
    if (dados[i][3].toString().toUpperCase().trim() === cupomBuscado) {
      return respostaJSON({
        status: "success",
        parceiro: dados[i][1],
        mensagem: "Cupom válido"
      });
    }
  }
  return respostaJSON({ status: "not_found", message: "Cupom inválido" });
}

function buscarProduto(barcode, ss) {
  var abaProd = ss.getSheets()[2]; // Aba Produtos
  var dados = abaProd.getDataRange().getValues();
  
  for (var i = 1; i < dados.length; i++) {
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

function realizarLogin(cpfOriginal, ss) {
  var cpf = cpfOriginal.replace(/\D/g, "");
  
  var abaCli = ss.getSheets()[0];
  var dadosCli = abaCli.getDataRange().getValues();
  for (var i = 1; i < dadosCli.length; i++) {
    if (dadosCli[i][0].toString().replace(/\D/g, "") === cpf) {
      return respostaJSON({status: "exists", tipo: "Cliente", nome: dadosCli[i][1]});
    }
  }
  
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
      
      var totalSaldoDebitar = 0;    
      var totalComissaoCreditar = 0; 
      var cpfComprador = data[0]["CPF"].replace(/\D/g, "");
      var cupomUsado = data[0]["cupom"].toUpperCase().trim();

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

      for (var i = 1; i < dadosPar.length; i++) {
        var cpfNaPlanilha = dadosPar[i][0].toString().replace(/\D/g, "");
        var cupomNaPlanilha = dadosPar[i][3].toString().toUpperCase().trim();

        if (totalSaldoDebitar > 0 && cpfNaPlanilha === cpfComprador) {
          var saldoAtual = parseFloat(dadosPar[i][4]) || 0;
          sheetParceiros.getRange(i + 1, 5).setValue(saldoAtual - totalSaldoDebitar);
        }

        if (cupomUsado !== "NENHUM" && cupomNaPlanilha === cupomUsado) {
          var saldoAtualDono = parseFloat(dadosPar[i][4]) || 0;
          sheetParceiros.getRange(i + 1, 5).setValue(saldoAtualDono + totalComissaoCreditar);
        }
      }
      return respostaJSON({status: "success"});
    } 
  } catch (err) {
    return respostaJSON({status: "error", message: err.toString()});
  }
}

// ======================================================
// 4. FORMATADOR DE RESPOSTA (JSON)
// ======================================================
function respostaJSON(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}