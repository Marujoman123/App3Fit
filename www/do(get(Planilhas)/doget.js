// ======================================================
// 1. FUNÇÃO PRINCIPAL (ROTEADOR GET)
// ======================================================
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- ROTA 1: Listar TODOS os produtos com Estoque Atualizado ---
    if (e.parameter.todosProdutos) {
      var abaProd = ss.getSheetByName("produtos"); 
      var abaEstoque = ss.getSheetByName("Estoque");
      
      var dadosProd = abaProd.getDataRange().getValues();
      var dadosEstoque = abaEstoque.getDataRange().getValues();
      
      // Criamos um "mapa" de estoque para busca rápida: { "Cod": Quantidade }
      var mapaEstoque = {};
      for (var i = 1; i < dadosEstoque.length; i++) {
        mapaEstoque[dadosEstoque[i][0].toString()] = dadosEstoque[i][1];
      }
      
      // Montamos a lista final unindo Nome + Quantidade
      var listaFinal = [];
      for (var j = 1; j < dadosProd.length; j++) {
        var cod = dadosProd[j][0].toString();
        var linha = dadosProd[j][6];
        var nome = dadosProd[j][7];
        var estoqueAtual = mapaEstoque[cod] || 0; // Se não achar no estoque, assume 0
        
        listaFinal.push({
          codigo: cod,
          nome: nome,
          linha: linha,
          quantidade: estoqueAtual
        });
      }
      
      return respostaJSON({ status: "success", produtos: listaFinal });
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

    // --- ROTA 6: Verificar Status do Pagamento na Maquininha ---
    if (e.parameter.verificarPagamento) {
      var intentId = e.parameter.verificarPagamento;
      var tokenMP = e.parameter.token; 
      return consultarStatusPagamento(intentId, tokenMP);
    }

    // --- ROTA 7: Registrar Venda Final (Chamada após aprovação da Point) ---
    if (e.parameter.registrarVendaFinal) {
      var dadosVenda = JSON.parse(e.parameter.registrarVendaFinal);
      return registrarVendaNaPlanilha(dadosVenda);
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
        precoCliente: dados[i][4],
        precoParceiro: dados[i][5],
        estoque: dados[i][6] 
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

function atualizarEstoque(codProduto, quantidadeVendida, ss) {
  var sheetProdutos = ss.getSheetByName("Estoque"); 
  if (!sheetProdutos) return;
  
  var dados = sheetProdutos.getDataRange().getValues();
  
  for (var i = 1; i < dados.length; i++) {
    // Usamos == para comparar, ou toString() como você fez, para evitar erro de tipo (número vs texto)
    if (dados[i][0].toString() === codProduto.toString()) { 
      
      var estoqueAtual = Number(dados[i][1]) || 0;
      var novoEstoque = estoqueAtual - quantidadeVendida;
      
      // Ajuste de segurança: Evitar que o estoque fique negativo se você não quiser
      if (novoEstoque < 0) novoEstoque = 0; 

      // i + 1 porque o array começa em 0 e a planilha em 1
      // Coluna 2 é a Coluna B (Quantidade)
      sheetProdutos.getRange(i + 1, 2).setValue(novoEstoque); 
      
      // Opcional: Registrar no console para debug do Apps Script
      console.log("Produto: " + codProduto + " | Estoque anterior: " + estoqueAtual + " | Novo: " + novoEstoque);
      
      return; // Encerra a função após encontrar e atualizar
    }
  }
}

// ======================================================
// 3. FUNÇÃO DE PROCESSAMENTO DE DADOS (POST)
// ======================================================
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // --- CASO 1: É UM CADASTRO DE NOVO CLIENTE ---
    // Verificamos se no JSON existe o campo "telefone", que é exclusivo do cadastro
    if (data.telefone) {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Clientes"); // Nome da sua aba de clientes
      sheet.appendRow([
        data.cpf, 
        data.nome, 
        "'" + data.telefone, // O ' evita que o Excel/Google suma com o zero à esquerda
        data.tipo, 
        data.saldo
      ]);
      return respostaJSON({ status: "success", message: "Cliente cadastrado com sucesso" });
    }

    // --- CASO 2: É UMA VENDA (INTEGRAÇÃO COM POINT) ---
    if (data.config && data.config.token) {
      var token = data.config.token;
      var deviceId = data.config.deviceId;
      var valorParaMaquininha = Number.parseInt(data.config.amount);
      var idVenda = data.itens[0]["ID Venda"].toString();

      if (valorParaMaquininha > 0) {
        var resMP = acionarMaquinaPoint(valorParaMaquininha, idVenda, token, deviceId, data.config.installments, data.config.paymentType);
        var resObj = JSON.parse(resMP.getContentText());
        
        if (resObj.id) {
          return respostaJSON({ status: "success", intent_id: resObj.id });
        } else {
          return respostaJSON({ status: "error", message: "Erro MP: " + resMP.getContentText() });
        }
      }
    }

    return respostaJSON({ status: "error", message: "Dados inválidos ou formato desconhecido" });

  } catch (err) {
    return respostaJSON({ status: "error", message: "Erro no Servidor: " + err.toString() });
  }
}

// Função auxiliar para responder JSON corretamente
function respostaJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function registrarVendaNaPlanilha(data) {
  const trava = LockService.getScriptLock();
  try {
    trava.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetVendas = ss.getSheetByName("Vendas");
    var sheetParceiros = ss.getSheetByName("Parceiros");

    var totalSaldoDebitar = 0;    
    var totalComissaoCreditar = 0; 
    var cpfComprador = data[0]["CPF"].replace(/\D/g, "");
    var cupomUsado = data[0]["cupom"].toUpperCase().trim();

    data.forEach(function(item) {
      var proximoID = "2026" + (sheetVendas.getLastRow() + 1).toString().padStart(4, '0');
      totalSaldoDebitar += parseFloat(item["ValoremSaldo"]) || 0;
      totalComissaoCreditar += parseFloat(item["Valor parceiro"]) || 0;
      
      sheetVendas.appendRow([
        proximoID, item["Data/Hora"], item["CPF"], item["Nome"],
        item["Tipo"], item["Cod"], item["Produto"], item["Quantidade"], item["Valor Unit"],item["Valor Total Item"],
        item["cupom"], item["ValoremSaldo"], item["ValorPAgo"],
        item["Valor parceiro"], item["Valor liquido"], item["Tipo Pagamento"]
      ]);

      tualizarEstoque(item["Cod"], item["Quantidade"], ss); 
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
        var saldoAtualDono = parseFloat(sheetParceiros.getRange(i + 1, 5).getValue()) || 0;
        sheetParceiros.getRange(i + 1, 5).setValue(saldoAtualDono + totalComissaoCreditar);
      }
    }
    trava.releaseLock();
    return respostaJSON({status: "success", message: "Venda gravada com sucesso"});
  } catch (err) {
    trava.releaseLock();
    return respostaJSON({status: "error", message: err.toString()});
  }
}

// ======================================================
// 4. INTEGRAÇÃO MERCADO PAGO E AUXILIARES
// ======================================================

// ======================================================
// INTEGRAÇÃO MERCADO PAGO ATUALIZADA (V2)
// ======================================================

function acionarMaquinaPoint(valorCentavos, idVenda, token, deviceId, installments, type) {
  const url = `https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents`;
  
  const payload = {
    "amount": valorCentavos, // Aqui deve ir o número puro, sem aspas e sem .0
    "description": "Venda App 2026 - ID " + idVenda,
    "payment": { 
      "installments": installments, 
      "type": type 
    },
    "additional_info": {
      "external_reference": idVenda,
      "print_on_terminal": true
    }
  };

  const options = {
    "method": "post",
    "headers": {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json",
      "X-Idempotency-Key": "ID-" + idVenda + "-" + Date.now()
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  return UrlFetchApp.fetch(url, options);
}

function consultarStatusPagamento(intentId, token) {
  // CORREÇÃO AQUI: A URL de consulta na V2 não usa "/devices/ID/..." 
  // Ela usa diretamente o ID da intenção (payment-intent)
  const url = `https://api.mercadopago.com/point/integration-api/payment-intents/${intentId}`;
  
  const options = {
    "method": "get",
    "headers": { 
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    "muteHttpExceptions": true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  
  // Log para debug caso precise ver no Google Script
  Logger.log("Status da Consulta: " + response.getContentText());
  
  return respostaJSON(data);
}

function respostaJSON(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}