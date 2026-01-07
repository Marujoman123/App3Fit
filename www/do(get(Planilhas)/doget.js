// ======================================================
// 1. FUNÇÃO PRINCIPAL (ROTEADOR GET)
// ======================================================
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- ROTA 1: Listar TODOS os produtos ---
    if (e.parameter.todosProdutos) {
      var abaProd = ss.getSheetByName("produtos"); // Mais seguro usar nome
      var dados = abaProd.getDataRange().getValues();
      dados.shift(); // Remove cabeçalho
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

    // --- ROTA 5: Buscar todas as vendas ---
    if (e.parameter.buscarTodasVendas) {
      var sheetVendas = ss.getSheetByName("Vendas");
      if (!sheetVendas) return respostaJSON({ status: "error", message: "Aba Vendas não encontrada" });
      var dadosVendas = sheetVendas.getDataRange().getValues();
      return respostaJSON({ status: "success", vendas: dadosVendas });
    }
    
    return respostaJSON({status: "error", message: "Rota não encontrada"});

  } catch (err) {
    return respostaJSON({status: "error", message: err.toString()});
  }
}

// ======================================================
// 2. FUNÇÕES AUXILIARES (LÓGICA DO NEGÓCIO)
// ======================================================

function validarCupom(cupomRecebido, ss) {
  var cupomBuscado = cupomRecebido.toUpperCase().trim();
  var abaParceiros = ss.getSheetByName("Parceiros");
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
  var abaProd = ss.getSheetByName("produtos");
  var dados = abaProd.getDataRange().getValues();
  
  for (var i = 1; i < dados.length; i++) {
    if (dados[i][0].toString().trim() === barcode.toString().trim()) {
      return respostaJSON({
        status: "success",
        nome: dados[i][1],
        precoCliente: dados[i][2],
        precoParceiro: dados[i][3],
        estoque: dados[i][4] // Coluna E
      });
    }
  }
  return respostaJSON({status: "not_found"});
}

function realizarLogin(cpfOriginal, ss) {
  var cpf = cpfOriginal.replace(/\D/g, "");
  
  var abaCli = ss.getSheetByName("Clientes");
  var dadosCli = abaCli.getDataRange().getValues();
  for (var i = 1; i < dadosCli.length; i++) {
    if (dadosCli[i][0].toString().replace(/\D/g, "") === cpf) {
      return respostaJSON({status: "exists", tipo: "Cliente", nome: dadosCli[i][1]});
    }
  }
  
  var abaPar = ss.getSheetByName("Parceiros");
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

/**
 * Atualiza o estoque na aba produtos
 * Coluna A (0): Código | Coluna E (4): Quantidade
 */
function atualizarEstoque(codProduto, quantidadeVendida, ss) {
  var sheetProdutos = ss.getSheetByName("produtos"); 
  if (!sheetProdutos) return;

  var dados = sheetProdutos.getDataRange().getValues();
  
  for (var i = 1; i < dados.length; i++) {
    if (dados[i][0].toString() === codProduto.toString()) { 
      var estoqueAtual = Number(dados[i][4]) || 0;
      var novoEstoque = estoqueAtual - quantidadeVendida;
      // Coluna E é a 5ª coluna
      sheetProdutos.getRange(i + 1, 5).setValue(novoEstoque); 
      break;
    }
  }
}

// ======================================================
// 3. FUNÇÃO DE PROCESSAMENTO DE DADOS (POST)
// ======================================================
function doPost(e) {
   //Pede uma trava para o script
  const trava = LockService.getScriptLock();
    try {   
// 2. Tenta trancar o script por até 1 segundos, Se outra pessoa estiver salvando, esta requisição espera aqui
    trava.waitLock(1000);

    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetVendas = ss.getSheetByName("Vendas");
    var sheetParceiros = ss.getSheetByName("Parceiros");

    if (Array.isArray(data)) {
      var totalSaldoDebitar = 0;    
      var totalComissaoCreditar = 0; 
      var cpfComprador = data[0]["CPF"].replace(/\D/g, "");
      var cupomUsado = data[0]["cupom"].toUpperCase().trim();

      data.forEach(function(item) {
        var proximoID = "2026" + (sheetVendas.getLastRow() + 1).toString().padStart(4, '0');
        totalSaldoDebitar += parseFloat(item["ValoremSaldo"]) || 0;
        totalComissaoCreditar += parseFloat(item["Valor parceiro"]) || 0;
        
        // 1. Registra a Venda
        sheetVendas.appendRow([
          proximoID, item["Data/Hora"], item["CPF"], item["Nome"],
          item["Tipo"], item["Cod"], item["Produto"], item["Valor Item"],
          item["cupom"], item["ValoremSaldo"], item["ValorPAgo"],
          item["Valor parceiro"], item["Valor liquido"]
        ]);

        // 2. Atualiza Estoque (Item por Item)
        atualizarEstoque(item["Cod"], 1, ss); 
      });

      // 3. Atualiza Saldo do Parceiro (Débito e Crédito)
      var dadosPar = sheetParceiros.getDataRange().getValues();
      for (var i = 1; i < dadosPar.length; i++) {
        var cpfNaPlanilha = dadosPar[i][0].toString().replace(/\D/g, "");
        var cupomNaPlanilha = dadosPar[i][3].toString().toUpperCase().trim();

        // Se o comprador usou saldo e é o parceiro atual do laço
        if (totalSaldoDebitar > 0 && cpfNaPlanilha === cpfComprador) {
          var saldoAtual = parseFloat(dadosPar[i][4]) || 0;
          sheetParceiros.getRange(i + 1, 5).setValue(saldoAtual - totalSaldoDebitar);
        }

        // Se a venda usou o cupom deste parceiro
        if (cupomUsado !== "NENHUM" && cupomNaPlanilha === cupomUsado) {
          // Buscamos o saldo novamente caso tenha sido alterado no if acima
          var saldoAtualDono = parseFloat(sheetParceiros.getRange(i + 1, 5).getValue()) || 0;
          sheetParceiros.getRange(i + 1, 5).setValue(saldoAtualDono + totalComissaoCreditar);
        }
      }
      return respostaJSON({status: "success"});
    } 
    return respostaJSON({status: "error", message: "Dados inválidos"});
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