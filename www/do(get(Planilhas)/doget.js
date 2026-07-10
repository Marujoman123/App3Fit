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

      // getDisplayValues obriga a ler como texto, impedindo erros de notação científica
      var dadosProd = abaProd.getDataRange().getDisplayValues();
      var dadosEstoque = abaEstoque.getDataRange().getDisplayValues();

      // 1. Cria dicionário dos produtos para saber quais códigos realmente existem
      var produtosValidos = {};
      for (var j = 1; j < dadosProd.length; j++) {
        var codValido = dadosProd[j][0].toString().trim().replace(/^0+/, '');
        if (codValido !== "") produtosValidos[codValido] = true;
      }

      // 2. Mapeia estoque com a Busca Inteligente
      var mapaEstoque = {};
      for (var i = 1; i < dadosEstoque.length; i++) {
        var codigoBruto = dadosEstoque[i][0].toString().trim();
        var codigoSemZeros = codigoBruto.replace(/^0+/, '');
        var codigoReal = "";

        // A) Tenta achar o código exato primeiro (códigos antigos funcionam aqui)
        if (produtosValidos[codigoSemZeros]) {
          codigoReal = codigoSemZeros;
        } 
        // B) Se não achou exato e tem mais de 7 dígitos, corta o lote (códigos novos)
        else if (codigoBruto.length > 7) {
          var codigoCortado = codigoBruto.substring(7).replace(/^0+/, '');
          if (produtosValidos[codigoCortado]) {
            codigoReal = codigoCortado;
          }
        }

        // Se encontrou correspondência, soma a quantidade (agrupa múltiplos lotes)
        if (codigoReal !== "") {
          var qtd = Number(dadosEstoque[i][1]) || 0;
          mapaEstoque[codigoReal] = (mapaEstoque[codigoReal] || 0) + qtd;
        }
      }

      var listaFinal = [];

      for (var j = 1; j < dadosProd.length; j++) {
        var codPlanilha = dadosProd[j][0].toString().trim().replace(/^0+/, '');
        var estoqueAtual = mapaEstoque[codPlanilha] || 0;

        if (estoqueAtual > 0) {
          listaFinal.push({
            codigo: dadosProd[j][0].toString().trim(), // Mantém original pro front
            nome: dadosProd[j][1],
            kg: dadosProd[j][2],
            linha: dadosProd[j][6],
            precoCusto: dadosProd[j][3],
            precoCliente: dadosProd[j][4],
            precoParceiro: dadosProd[j][5],
            quantidade: estoqueAtual
          });
        }
      }

      return respostaJSON({ status: "success", produtos: listaFinal });
    }

    // --- ROTA 1.B: Listar TODOS os produtos (MESMO ZERADOS) para Encomenda ---
    if (e.parameter.todosProdutosSemFiltro) {
      var abaProd = ss.getSheetByName("produtos");
      var dadosProd = abaProd.getDataRange().getValues();
      var listaCompleta = [];

      for (var j = 1; j < dadosProd.length; j++) {
        listaCompleta.push({
          codigo: dadosProd[j][0].toString(),
          nome: dadosProd[j][1],
          kg: dadosProd[j][2],
          linha: dadosProd[j][6],
          precoCusto: dadosProd[j][3],
          precoCliente: dadosProd[j][4],
          precoParceiro: dadosProd[j][5],
          quantidade: 0 // Força 0 pois na encomenda começa zerado
        });
      }
      return respostaJSON({ status: "success", produtos: listaCompleta });
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

    return respostaJSON({ status: "error", message: "Rota não encontrada" });

  } catch (err) {
    return respostaJSON({ status: "error", message: err.toString() });
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
        nome: dados[i][1],
        cpf: dados[i][0],
        saldo: dados[i][4],
        mensagem: "Cupom válido"
      });
    }
  }
  return respostaJSON({ status: "not_found", message: "Cupom inválido" });
}

function buscarProduto(barcode, ss) {
  var barcodeStr = barcode.toString().trim();
  var abaProd = ss.getSheetByName("produtos");
  var dados = abaProd.getDataRange().getDisplayValues(); 

  for (var i = 1; i < dados.length; i++) {
    var codPlanilha = dados[i][0].toString().trim().replace(/^0+/, '');
    var codBuscaSemZeros = barcodeStr.replace(/^0+/, '');
    var codBuscaCortado = barcodeStr.length > 7 ? barcodeStr.substring(7).replace(/^0+/, '') : "";

    // Bate o código exato ou o código já cortado
    if (codPlanilha === codBuscaSemZeros || codPlanilha === codBuscaCortado) {
      return respostaJSON({
        status: "success",
        nome: dados[i][1],
        precoCliente: dados[i][4],
        precoParceiro: dados[i][5],
        estoque: dados[i][6]
      });
    }
  }
  return respostaJSON({ status: "not_found" });
}

function realizarLogin(cpfOriginal, ss) {
  var cpf = cpfOriginal.replace(/\D/g, "");
  var abaCli = ss.getSheetByName("Clientes");
  var dadosCli = abaCli.getDataRange().getValues();
  for (var i = 1; i < dadosCli.length; i++) {
    if (dadosCli[i][0].toString().replace(/\D/g, "") === cpf) {
      return respostaJSON({ status: "exists", tipo: "Cliente", nome: dadosCli[i][1] });
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
  return respostaJSON({ status: "not_found" });
}

function atualizarEstoque(codProduto, quantidadeVendida, ss) {
  var sheetProdutos = ss.getSheetByName("Estoque");
  if (!sheetProdutos) return;

  var dados = sheetProdutos.getDataRange().getDisplayValues(); 
  var qtdRestante = quantidadeVendida;
  var codVendidoLimpo = codProduto.toString().trim().replace(/^0+/, '');

  // PASSO 1: Percorre as linhas e deduz dos lotes que têm estoque disponível
  for (var i = 1; i < dados.length; i++) {
    var codigoBruto = dados[i][0].toString().trim();
    var codigoSemZeros = codigoBruto.replace(/^0+/, '');
    var codigoCortado = codigoBruto.length > 7 ? codigoBruto.substring(7).replace(/^0+/, '') : "";

    // Compara se o código bate e se ainda tem quantidade pra baixar
    if ((codigoSemZeros === codVendidoLimpo || codigoCortado === codVendidoLimpo) && qtdRestante > 0) {
      var estoqueAtual = Number(dados[i][1]) || 0;

      if (estoqueAtual > 0) {
        var deduzir = Math.min(estoqueAtual, qtdRestante);
        var novoEstoque = estoqueAtual - deduzir;
        sheetProdutos.getRange(i + 1, 2).setValue(novoEstoque);
        qtdRestante -= deduzir;
      }
    }
  }

  // PASSO 2: Ajuste de segurança caso o estoque total termine e falte baixar algo
  if (qtdRestante > 0) {
    for (var i = 1; i < dados.length; i++) {
      var codigoBruto = dados[i][0].toString().trim();
      var codigoSemZeros = codigoBruto.replace(/^0+/, '');
      var codigoCortado = codigoBruto.length > 7 ? codigoBruto.substring(7).replace(/^0+/, '') : "";

      if (codigoSemZeros === codVendidoLimpo || codigoCortado === codVendidoLimpo) {
        var estoqueAtual = Number(dados[i][1]) || 0;
        var novoEstoque = estoqueAtual - qtdRestante;
        
        if (novoEstoque < 0) novoEstoque = 0; // Trava para não ficar negativo
        
        sheetProdutos.getRange(i + 1, 2).setValue(novoEstoque);
        break; 
      }
    }
  }
}

// ======================================================
// 3. FUNÇÃO DE PROCESSAMENTO DE DADOS (POST)
// ======================================================
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // --- ROTA 1: Gravar a venda final na planilha ---
    if (data.acao === "registrarVendaFinal") {
      return registrarVendaNaPlanilha(data.dados);
    }

    // --- ROTA 2: Cadastro de Novo Cliente ---
    if (data.telefone) {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Clientes");
      sheet.appendRow([
        data.cpf,
        data.nome,
        "'" + data.telefone,
        data.tipo,
        data.saldo
      ]);
      return respostaJSON({ status: "success", message: "Cliente cadastrado com sucesso" });
    }

    // --- ROTA 3: Iniciar Intenção de Pagamento na Point ---
    if (data.config && data.config.token) {
      var token = data.config.token;
      var deviceId = data.config.deviceId;
      var valorParaMaquininha = Number.parseInt(data.config.amount);

      var idVenda = data.itens && data.itens.length > 0 ? data.itens[0]["ID Venda"].toString() : "V" + Date.now();

      if (valorParaMaquininha > 0) {
        cancelarIntencoesPendentes(deviceId, token);
        Utilities.sleep(1500); 

        var resMP = acionarMaquinaPoint(
          valorParaMaquininha,
          idVenda,
          token,
          deviceId,
          data.config.payment || null
        );

        var responseText = resMP.getContentText();
        var resObj = JSON.parse(responseText);
        var responseCode = resMP.getResponseCode(); 

        if (resObj.id) {
          return respostaJSON({ status: "success", intent_id: resObj.id });
        }

        if (responseCode === 409 || resObj.error === "2205") {
          return respostaJSON({
            status: "error",
            message: "A maquininha está ocupada com outro pedido. Cancele a operação atual no botão VERMELHO da maquininha e tente novamente."
          });
        }

        console.error("Erro retornado pelo Mercado Pago: " + responseText);
        return respostaJSON({
          status: "error",
          message: "Erro na Point: " + (resObj.message || "Verifique a conexão da máquina.")
        });
      }
    }

    return respostaJSON({ status: "error", message: "Dados inválidos ou rota desconhecida." });

  } catch (err) {
    console.error("Erro crítico no doPost: " + err.toString());
    return respostaJSON({ status: "error", message: "Erro no Servidor: " + err.toString() });
  }
}

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

    data.forEach(function (item) {
      var proximoID = "2026" + (sheetVendas.getLastRow() + 1).toString().padStart(4, '0');
      totalSaldoDebitar += parseFloat(item["ValoremSaldo"]) || 0;
      totalComissaoCreditar += parseFloat(item["Valor parceiro"]) || 0;

      sheetVendas.appendRow([
        proximoID, item["Data/Hora"], item["CPF"], item["Nome"],
        item["Tipo"], item["Cod"], item["Produto"], item["Quantidade"], item["Valor Unit"], item["Valor Total Item"],
        item["cupom"], item["ValoremSaldo"], item["ValorPAgo"],
        item["Valor parceiro"], item["Valor liquido"], item["Tipo Pagamento"]
      ]);

      atualizarEstoque(item["Cod"], item["Quantidade"], ss);
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
    return respostaJSON({ status: "success", message: "Venda gravada com sucesso" });
  } catch (err) {
    trava.releaseLock();
    return respostaJSON({ status: "error", message: err.toString() });
  }
}

// ======================================================
// 4. INTEGRAÇÃO MERCADO PAGO E AUXILIARES
// ======================================================

function acionarMaquinaPoint(valorCentavos, idVenda, token, deviceId, paymentConfig) {
  const url = "https://api.mercadopago.com/point/integration-api/devices/" + deviceId + "/payment-intents";

  const payload = {
    "amount": valorCentavos,
    "description": "Venda 3FIT - ID " + idVenda,
    "additional_info": {
      "external_reference": idVenda,
      "print_on_terminal": true
    }
  };

  if (paymentConfig) {
    payload.payment = paymentConfig;
  }

  const options = {
    "method": "post",
    "headers": {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json",
      "X-Idempotency-Key": "ID-" + idVenda 
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  return UrlFetchApp.fetch(url, options);
}

function consultarStatusPagamento(intentId, token) {
  var url = "https://api.mercadopago.com/point/integration-api/payment-intents/" + intentId + "?t=" + new Date().getTime();
  var options = {
    "method": "get",
    "headers": {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    },
    "muteHttpExceptions": true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var data = JSON.parse(response.getContentText());

    var mpStatus = (data.state || data.status || "").toUpperCase();
    var paymentStatus = "";
    if (data.payment && data.payment.state) {
      paymentStatus = data.payment.state.toUpperCase();
    }

    var statusFinal = "pending";

    if (mpStatus === "FINISHED" || mpStatus === "CLOSED" || mpStatus === "PROCESSED" || paymentStatus === "APPROVED") {
      statusFinal = "approved";
    }
    else if (mpStatus === "CANCELED" || mpStatus === "ABANDONED" || mpStatus === "EXPIRED" || mpStatus === "FAILED" || paymentStatus === "REJECTED") {
      statusFinal = "canceled";
    }

    return respostaJSON({
      status: statusFinal,
      raw_status: paymentStatus !== "" ? paymentStatus : mpStatus,
      json_completo: data
    });

  } catch (err) {
    return respostaJSON({ status: "error", message: err.toString() });
  }
}

function cancelarIntencoesPendentes(deviceId, token) {
  try {
    var url = "https://api.mercadopago.com/point/integration-api/devices/" + deviceId + "/payment-intents";
    var options = {
      "method": "delete",
      "headers": {
        "Authorization": "Bearer " + token
      },
      "muteHttpExceptions": true
    };
    UrlFetchApp.fetch(url, options);
  } catch (e) {}
}