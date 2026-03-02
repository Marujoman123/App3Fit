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

      // Mapa de estoque: { "Código": Quantidade }
      var mapaEstoque = {};
      for (var i = 1; i < dadosEstoque.length; i++) {
        mapaEstoque[dadosEstoque[i][0].toString()] = dadosEstoque[i][1];
      }

      var listaFinal = [];

      // Percorre os produtos (começa em 1 para pular cabeçalho)
      for (var j = 1; j < dadosProd.length; j++) {
        var cod = dadosProd[j][0].toString();
        var estoqueAtual = mapaEstoque[cod] || 0;

        // FILTRO: Só adiciona à lista se houver estoque
        if (estoqueAtual > 0) {
          listaFinal.push({
            codigo: cod,
            nome: dadosProd[j][1],         // Ajuste se o nome estiver em outra coluna
            kg: dadosProd[j][2],           // Coluna C
            linha: dadosProd[j][6],       // Coluna D (Ajuste conforme sua planilha)
            precoCusto: dadosProd[j][3],
            precoCliente: dadosProd[j][4],  // Coluna E
            precoParceiro: dadosProd[j][5], // Coluna F
            quantidade: estoqueAtual
          });
        }
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
    // Índice 0 = CPF, Índice 1 = Nome, Índice 3 = Cupom, Índice 4 = Saldo
    if (dados[i][3].toString().toUpperCase().trim() === cupomBuscado) {
      return respostaJSON({
        status: "success", // Mantemos "success" para o seu fetch reconhecer
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

      // Pegamos o ID da venda do primeiro item do carrinho
      var idVenda = data.itens && data.itens.length > 0 ? data.itens[0]["ID Venda"].toString() : "V" + Date.now();

      if (valorParaMaquininha > 0) {

        // 🚨 COMANDO DE CHOQUE: Limpa a maquininha antes de enviar a nova!
        cancelarIntencoesPendentes(deviceId, token);
        Utilities.sleep(1500); // Pausa 1.5s para o Mercado Pago processar a limpeza

        // Chamada para a função auxiliar externa
        var resMP = acionarMaquinaPoint(
          valorParaMaquininha,
          idVenda,
          token,
          deviceId,
          data.config.payment || null
        );

        var responseText = resMP.getContentText();
        var resObj = JSON.parse(responseText);
        var responseCode = resMP.getResponseCode(); // Captura o código HTTP (ex: 201, 409, 400)

        // Caso A: Sucesso (Intenção criada)
        if (resObj.id) {
          return respostaJSON({ status: "success", intent_id: resObj.id });
        }

        // Caso B: Erro 409 - Maquininha com pagamento pendente (Ocupada)
        if (responseCode === 409 || resObj.error === "2205") {
          return respostaJSON({
            status: "error",
            message: "A maquininha está ocupada com outro pedido. Cancele a operação atual no botão VERMELHO da maquininha e tente novamente."
          });
        }

        // Caso C: Outros erros (Token inválido, DeviceID errado, etc)
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

// ======================================================
// INTEGRAÇÃO MERCADO PAGO ATUALIZADA (V2)
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
      "X-Idempotency-Key": "ID-" + idVenda // Chave para evitar duplicidade
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

    // 1. Pega o status geral da maquininha
    var mpStatus = (data.state || data.status || "").toUpperCase();
    
    // 2. CRIA A VARIÁVEL paymentStatus com segurança (isso resolve o seu ReferenceError)
    var paymentStatus = "";
    if (data.payment && data.payment.state) {
      paymentStatus = data.payment.state.toUpperCase();
    }

    var statusFinal = "pending";

    // 3. Verifica se foi Aprovado/Finalizado
    if (mpStatus === "FINISHED" || mpStatus === "CLOSED" || mpStatus === "PROCESSED" || paymentStatus === "APPROVED") {
      statusFinal = "approved";
    }
    // 4. Verifica se foi Cancelado/Rejeitado
    else if (mpStatus === "CANCELED" || mpStatus === "ABANDONED" || mpStatus === "EXPIRED" || mpStatus === "FAILED" || paymentStatus === "REJECTED") {
      statusFinal = "canceled";
    }

    // 5. Retorna para o seu App
    return respostaJSON({
      status: statusFinal,
      raw_status: paymentStatus !== "" ? paymentStatus : mpStatus,
      json_completo: data
    });

  } catch (err) {
    return respostaJSON({ status: "error", message: err.toString() });
  }
}

// Função para limpar a tela da máquina antes de uma nova venda
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
  } catch (e) {
    // Apenas ignora se não houver nada para limpar
  }
}