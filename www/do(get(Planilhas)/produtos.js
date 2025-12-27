// Dentro do seu doGet(e) no Google Apps Script
if (e.parameter.barcode) {
  var barcode = e.parameter.barcode;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaProdutos = ss.getSheets()[2]; 
  var dados = abaProdutos.getDataRange().getValues();

  for (var k = 0; k < dados.length; k++) {
    if (dados[k][0].toString() === barcode) {
      return respostaJSON({
        "status": "success",
        "nome": dados[k][1],
        "precoCliente": dados[k][2],
        "precoParceiro": dados[k][3]
      });
    }
  }
  return respostaJSON({ "status": "not_found" });
}