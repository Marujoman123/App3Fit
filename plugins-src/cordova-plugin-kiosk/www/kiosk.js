/* Modo quiosque: botão Voltar nunca fecha o app (na tela de login ele não faz nada). */
var exec = require('cordova/exec');

document.addEventListener('deviceready', function () {
    document.addEventListener('backbutton', function () {
        if (window.history.length > 1) window.history.back();
    }, false);
}, false);

module.exports = {
    /** Retorna {deviceOwner, enabled, lockTask}. */
    status: function (ok, err) {
        exec(ok, err, 'Kiosk', 'status', []);
    },

    /** Chama ok(true/false): há internet de verdade (rede validada pelo Android)? */
    temInternet: function (ok, err) {
        exec(function (r) { ok(r === 1); }, err, 'Kiosk', 'temInternet', []);
    },

    /** Abre o painel de Wi-Fi do Android sem sair do quiosque (volta sozinho em 2 min). */
    abrirWifi: function (ok, err) {
        exec(ok, err, 'Kiosk', 'abrirWifi', []);
    }
};
