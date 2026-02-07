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

    // Rota 1: Gravar a venda final na planilha (Ação disparada após aprovação)
    if (data.acao === "registrarVendaFinal") {
      return registrarVendaNaPlanilha(data.dados);
    }

    // Rota 2: Cadastro de Novo Cliente
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

    // Rota 3: Iniciar Intenção de Pagamento na Point
    if (data.config && data.config.token) {
      var token = data.config.token;
      var deviceId = data.config.deviceId;
      var valorParaMaquininha = Number.parseInt(data.config.amount);
      
      // Pegamos o ID da venda do primeiro item do carrinho
      var idVenda = data.itens && data.itens.length > 0 ? data.itens[0]["ID Venda"].toString() : "V" + Date.now();

      if (valorParaMaquininha > 0) {
        // AJUSTE: Passamos data.config.payment, que pode ser null/undefined na nova lógica
        var resMP = acionarMaquinaPoint(
          valorParaMaquininha,
          idVenda,
          token,
          deviceId,
          data.config.payment || null // Se não existir, envia null
        );
        
        var resObj = JSON.parse(resMP.getContentText());

        if (resObj.id) {
          return respostaJSON({ status: "success", intent_id: resObj.id });
        } else {
          // Log de erro no console do Google Scripts para facilitar seu debug
          console.error("Erro retornado pelo Mercado Pago: " + resMP.getContentText());
          return respostaJSON({ status: "error", message: "Erro MP: " + resMP.getContentText() });
        }
      }
    }

    return respostaJSON({ status: "error", message: "Dados inválidos ou formato desconhecido" });

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

  // Se o JavaScript enviou configurações (como parcelas no crédito), adiciona aqui.
  // Se for null (nosso novo padrão), a máquina pergunta o tipo ao cliente.
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
  const url = "https://api.mercadopago.com/point/integration-api/payment-intents/" + intentId;

  const options = {
    "method": "get",
    "headers": {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    "muteHttpExceptions": true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    // LOGICA DE STATUS:
    // Na Point, 'FINISHED' significa que o dinheiro entrou e a transação acabou com sucesso.
    var statusFinal = "pending";
    
    // Verificamos tanto 'status' quanto 'state' (a API do MP varia entre versões)
    var mpStatus = (data.status || data.state || "").toUpperCase();

    if (mpStatus === "FINISHED" || mpStatus === "PROCESSED" || mpStatus === "SUCCESS") {
      statusFinal = "approved";
    } else if (mpStatus === "CANCELED" || mpStatus === "ABORTED") {
      statusFinal = "canceled";
    }

    return respostaJSON({ 
      status: statusFinal, 
      id_mercado_pago: data.payment_id || null, // ID real do pagamento para conciliação
      raw_status: mpStatus 
    });

  } catch (err) {
    return respostaJSON({ status: "error", message: err.toString() });
  }
}