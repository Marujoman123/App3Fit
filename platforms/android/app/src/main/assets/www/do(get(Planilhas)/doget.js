// ======================================================
// 1. FUNÇÃO PRINCIPAL (ROTEADOR GET)
// ======================================================
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- ROTA 1: Listar TODOS os produtos ---
    if (e.parameter.todosProdutos) {
      var abaProd = ss.getSheetByName("produtos"); 
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
      sheetProdutos.getRange(i + 1, 5).setValue(novoEstoque); 
      break;
    }
  }
}

// ======================================================
// 3. FUNÇÃO DE PROCESSAMENTO DE DADOS (POST)
// ======================================================
function doPost(e) {
  const trava = LockService.getScriptLock();
  try {   
    // Tenta trancar por até 10 segundos para evitar duplicidade em massa
    trava.waitLock(10000);

    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetVendas = ss.getSheetByName("Vendas");
    var sheetParceiros = ss.getSheetByName("Parceiros");

    if (Array.isArray(data)) {
      var totalSaldoDebitar = 0;    
      var totalComissaoCreditar = 0; 
      var cpfComprador = data[0]["CPF"].replace(/\D/g, "");
      var cupomUsado = data[0]["cupom"].toUpperCase().trim();
      var idVendaOriginal = data[0]["ID Venda"];

      // 1. Envia valor para a máquina Point Pro 3 antes de registrar na planilha
      // Somente se o valor pago for maior que 0
      var valorTotalPago = data.reduce((acc, item) => acc + parseFloat(item["ValorPAgo"]), 0);
      if (valorTotalPago > 0) {
        criarIntencaoPagamento(valorTotalPago, idVendaOriginal);
      }

      data.forEach(function(item) {
        // Gerar ID sequencial baseado na última linha real
        var proximoID = "2026" + (sheetVendas.getLastRow() + 1).toString().padStart(4, '0');
        totalSaldoDebitar += parseFloat(item["ValoremSaldo"]) || 0;
        totalComissaoCreditar += parseFloat(item["Valor parceiro"]) || 0;
        
        // Registrar a Venda
        sheetVendas.appendRow([
          proximoID, item["Data/Hora"], item["CPF"], item["Nome"],
          item["Tipo"], item["Cod"], item["Produto"], item["Valor Item"],
          item["cupom"], item["ValoremSaldo"], item["ValorPAgo"],
          item["Valor parceiro"], item["Valor liquido"]
        ]);

        // Atualizar Estoque
        atualizarEstoque(item["Cod"], 1, ss); 
      });

      // 2. Atualizar Saldo do Parceiro
      var dadosPar = sheetParceiros.getDataRange().getValues();
      for (var i = 1; i < dadosPar.length; i++) {
        var cpfNaPlanilha = dadosPar[i][0].toString().replace(/\D/g, "");
        var cupomNaPlanilha = dadosPar[i][3].toString().toUpperCase().trim();

        if (totalSaldoDebitar > 0 && cpfNaPlanilha === cpfComprador) {
          var saldoAtual = parseFloat(dadosPar[i][4]) || 0;
          sheetParceiros.getRange(i + 1, 5).setValue(saldoAtual - totalSaldoDebitar);
        }

        if (cupomUsado !== "NENHUM" && cupomNaPlanilha === cupomUsado) {
          var saldoAtualDono = parseFloat(sheetParceiros.getRange(i + 1, 5).getValue()) || 0;
          sheetParceiros.getRange(i + 1, 5).setValue(saldoAtualDono + totalComissaoCreditar);
        }
      }
      
      trava.releaseLock(); // Libera a trava após sucesso
      return respostaJSON({status: "success"});
    } 
    return respostaJSON({status: "error", message: "Dados inválidos"});
  } catch (err) {
    trava.releaseLock(); // Garante liberação mesmo em erro
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

// ======================================================
// 5. INTEGRAÇÃO MERCADO PAGO POINT PRO 3
// ======================================================
const MP_TOKEN = "TEST-3577250795393962-011007-4e69cf8e50732deb7f8eb28ff51fa2a8-3117694591";
const DEVICE_ID = "1733541950"; 

function criarIntencaoPagamento(valor, idVenda) {
  const url = `https://api.mercadopago.com/point/integrate/devices/${DEVICE_ID}/payment_intents`;
  const payload = {
    "amount": Math.round(valor * 100) / 100,
    "description": "Venda App 2026 - ID " + idVenda,
    "payment": { 
      "installments": 1, 
      "type": "credit_card" 
    }
  };

  const options = {
    "method": "post",
    "headers": {
      "Authorization": "Bearer " + MP_TOKEN,
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  return UrlFetchApp.fetch(url, options);
}