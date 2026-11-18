// ============================================
// WIFI-QUIOSQUE.JS - Botão "Configurar Wi-Fi" no tablet-quiosque
// ============================================
// Só aparece no app (plugin cordova-plugin-kiosk) e só quando o tablet está
// SEM internet. Abre o painel de Wi-Fi do Android sem sair do quiosque.

import ErrorHandler from './errorHandler.js';

const INTERVALO_VERIFICACAO_MS = 5000;

function kiosk() {
  return window.App3fitKiosk;
}

function mostrarBotao(mostrar) {
  const area = document.getElementById('areaWifi');
  if (area) area.classList.toggle('wifi-oculto', !mostrar);
}

function verificarConexao() {
  if (!kiosk()) return;
  kiosk().temInternet(
    (temInternet) => mostrarBotao(!temInternet),
    (erro) => ErrorHandler.log('Falha ao verificar a internet', erro),
  );
}

function abrirWifi() {
  kiosk().abrirWifi(
    () => {},
    (erro) => {
      ErrorHandler.log('Falha ao abrir o Wi-Fi', erro);
      ErrorHandler.show('Não foi possível abrir as configurações de Wi-Fi.');
    },
  );
}

function initWifiQuiosque() {
  if (!kiosk()) return; // navegador comum (GitHub Pages): nada a fazer
  document.getElementById('btnConfigurarWifi').addEventListener('click', abrirWifi);
  verificarConexao();
  setInterval(verificarConexao, INTERVALO_VERIFICACAO_MS);
  document.addEventListener('resume', verificarConexao);
  window.addEventListener('online', verificarConexao);
  window.addEventListener('offline', verificarConexao);
}

document.addEventListener('deviceready', initWifiQuiosque);
