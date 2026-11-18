# Manual de manutenção do tablet-quiosque (App3fit)

Este manual explica como atualizar o app no tablet do caixa e como fazer manutenção
sem desmontar o modo quiosque.

---

## 1. Como o quiosque funciona (resumo)

| Item | Detalhe |
|---|---|
| Tablet | Teclast A73PAD, Android 10 (API 29) |
| App | `com.exemplo.App3fit` (Cordova) |
| Mecanismo | O app é **Device Owner** e roda em **Lock Task Mode** |
| Código | Plugin local em `plugins-src/cordova-plugin-kiosk/` |
| Script de manutenção | `scripts/kiosk.ps1` |

Com o quiosque **ligado**:

- O app abre sozinho ao ligar o tablet e volta sozinho se fechar ou travar.
- Home, recentes, notificações e menu de energia ficam bloqueados.
- A barra do Android no topo fica visível só com informações (relógio, **bateria**, Wi-Fi).
  Ela não abre ao deslizar o dedo.
- **Mantenha o tablet sempre no carregador de parede.** A tela nunca apaga, e na porta USB
  do PC ou fora da tomada a bateria acaba (o tablet desliga e fica com a tela preta).
- O botão Voltar só navega dentro do app e nunca o fecha.
- Não há tela de bloqueio, e a tela fica sempre acesa enquanto o tablet está no carregador.
- O launcher original do Android fica **oculto** (não é desinstalado).
- A depuração USB continua funcionando (o app religa a depuração se alguém desligar), e a
  janela "Permitir depuração USB?" consegue aparecer por cima do app.
- Ficam bloqueados: redefinição de fábrica pelas Configurações, modo de segurança,
  novos usuários e novas contas.
- Sem internet, a tela de login mostra o botão **Configurar Wi-Fi** (seção 4.1).

Com o quiosque **desligado (modo manutenção)**, o Android volta ao normal (Home, barra,
Configurações, launcher), mas o app continua sendo Device Owner, pronto para voltar ao quiosque.

---

## 2. Antes de começar (sempre)

1. Conecte o tablet ao PC pelo cabo USB.
2. Abra o PowerShell na pasta do projeto:
   ```powershell
   cd C:\Aplicativos\App3fit
   ```
3. Confirme que o PC enxerga o tablet:
   ```powershell
   C:\android\sdk\platform-tools\adb.exe devices
   ```
   Deve aparecer uma linha terminando em `device`. Veja a seção 7 se aparecer
   `unauthorized`, `offline` ou nada.

> Se o PowerShell recusar rodar o script (`execução de scripts foi desabilitada`), use:
> ```powershell
> powershell -ExecutionPolicy Bypass -File .\scripts\kiosk.ps1 status
> ```

---

## 3. Colocar uma nova versão do app

**Não precisa sair do quiosque.**

1. Faça e teste as alterações normalmente (em `www/`).
2. Conecte o tablet (seção 2).
3. Rode:
   ```powershell
   cordova run android --device
   ```
4. Espere aparecer `INSTALL SUCCESS` e `LAUNCH SUCCESS`. O app reinicia sozinho já travado no quiosque.
5. (Opcional) Confira o estado:
   ```powershell
   .\scripts\kiosk.ps1 status
   ```
   O esperado é `"deviceOwner":true,"enabled":true,"lockTask":true`.

### Importante: a chave de assinatura

As atualizações só instalam se o APK for assinado com a **mesma chave** de sempre:
`%USERPROFILE%\.android\debug.keystore`.

- **Guarde uma cópia desse arquivo** (pendrive, nuvem pessoal).
- Se você trocar de PC, copie esse arquivo para o mesmo caminho no PC novo **antes** de compilar.
- Se a chave for perdida, a instalação falha com `INSTALL_FAILED_UPDATE_INCOMPATIBLE`.
  Veja a seção 7.

### Se você alterar o plugin do quiosque

Mudanças em `plugins-src/cordova-plugin-kiosk/` só entram no app depois de reinstalar o plugin:

```powershell
cordova plugin rm cordova-plugin-kiosk
cordova plugin add ./plugins-src/cordova-plugin-kiosk
cordova run android --device
```

---

## 4. Manutenção geral (sair e voltar ao quiosque)

### 4.1 Trocar o Wi-Fi (sem PC e sem modo manutenção)

Use quando o tablet mudar de lugar ou a rede mudar.

1. Deixe o app na **tela de login** (a do CPF).
2. Sem internet, aparece a mensagem "Sem conexão com a internet" e o botão
   **Configurar Wi-Fi** (ele leva até 5 segundos para aparecer).
3. Toque no botão. Abre o painel de Internet do Android por cima do app.
4. Escolha a rede, digite a senha e toque em **Conectar**.
5. Toque em **Concluído**. O app volta e o botão some quando a internet funcionar.

Regras de segurança:

- O botão **só aparece sem internet**. Com a internet funcionando, troque a rede pelo modo
  manutenção (abaixo).
- Se em **2 minutos** o painel não for fechado, o app volta para a frente sozinho e fecha as
  Configurações. Se precisar de mais tempo, toque no botão de novo.
- Evite o botão **Mais** do painel: ele abre as Configurações completas (que continuam
  limitadas pelo quiosque e fecham em 2 minutos).

### 4.2 Outras manutenções (modo manutenção, pelo PC)

Use para ajustar data/hora, brilho, som, atualizar o Android, etc.

### Sair do quiosque
```powershell
.\scripts\kiosk.ps1 off
```
O Android volta ao normal. Use o tablet como um tablet comum.
O quiosque **não volta sozinho**, nem se você reiniciar o tablet.

### Voltar ao quiosque
```powershell
.\scripts\kiosk.ps1 on
```
O app abre e trava de novo.

### Ver o estado
```powershell
.\scripts\kiosk.ps1 status
```

| Campo | Significado |
|---|---|
| `deviceOwner` | `true` = o app controla o tablet |
| `enabled` | `true` = quiosque ligado; `false` = modo manutenção |
| `lockTask` | `true` = o app está travado na tela agora |

### Tarefas comuns em modo manutenção

| Tarefa | Onde |
|---|---|
| Trocar rede Wi-Fi (com internet funcionando) | Configurações → Rede e Internet → Wi-Fi |
| Data e hora | Configurações → Sistema → Data e hora |
| Brilho / tempo de tela | Configurações → Tela |
| Som | Configurações → Som |
| Atualização do Android | Configurações → Sistema → Atualização |

Ao terminar, rode `.\scripts\kiosk.ps1 on`.

> **Nunca** adicione uma conta Google, nem desligue as Opções do desenvolvedor ou a
> Depuração USB, nem use "Revogar autorizações de depuração USB". Sem a depuração USB,
> não há como sair do quiosque sem resetar o tablet.

---

## 5. Reiniciar o tablet

- **Use o botão de energia**, não o `adb reboot`. Neste tablet, o `adb reboot` faz ele ligar
  no **modo de fábrica** da MediaTek (tela de diagnóstico).
- Com o quiosque ligado, o menu de energia está bloqueado. Para reiniciar:
  **segure o botão de energia por 10 a 15 segundos** até a tela apagar, solte e ligue de novo
  (≈3 segundos no botão).
- **Não segure nenhum botão de volume** ao ligar.
- Ao ligar, o app abre sozinho no quiosque (pode levar cerca de 1 minuto).

### Se cair no modo de fábrica (tela de diagnóstico / "Factory Mode")
1. **Não toque em nenhuma opção.** Algumas (como "Clear eMMC") **apagam o tablet**.
2. Segure o botão de energia por 10 a 15 segundos até desligar.
3. Desconecte o cabo USB e ligue de novo.

---

## 6. Remover o quiosque de vez

Use só se o tablet deixar de ser caixa, ou se precisar desinstalar o app.

```powershell
.\scripts\kiosk.ps1 remover
```

O quiosque é desligado, o launcher original volta e o app deixa de ser Device Owner.
Depois disso o app pode ser desinstalado normalmente.

Para voltar a usar como quiosque, siga a seção 8.

---

## 7. Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `adb devices` não mostra nada | Cabo ou porta USB | Troque o cabo (use um cabo de dados, não só de carga) ou a porta. |
| `unauthorized` | PC novo, ou o tablet "esqueceu" o PC (ex.: depois de a bateria acabar) | A janela "Permitir depuração USB?" aparece por cima do app, mesmo com o quiosque ligado. Marque **Sempre permitir neste computador** e toque em **OK**. Se a janela não aparecer, desconecte e reconecte o cabo. Se ainda assim não aparecer, reinicie o tablet pelo botão de energia (seção 5) com o cabo conectado e aceite a janela logo que o tablet ligar. |
| `offline` | Conexão travada | Desconecte e reconecte o cabo. Se persistir: `adb kill-server` e depois `adb devices`. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Chave de assinatura diferente | Restaure o `debug.keystore` original (seção 3). Sem ele: `kiosk.ps1 remover`, depois `adb uninstall com.exemplo.App3fit`, instale de novo e refaça a seção 8. **Os dados locais do app serão perdidos.** |
| `Broadcast wait for finish timeout` | Tablet acabou de ligar e está ocupado | Espere 1 minuto e rode o comando de novo. |
| App abre, mas não carrega dados | Sem internet | Volte à tela de login e use **Configurar Wi-Fi** (seção 4.1). Se o botão não aparecer, use `kiosk.ps1 off`, verifique o Wi-Fi e depois `kiosk.ps1 on`. |
| Botão "Configurar Wi-Fi" não aparece sem internet | O Android ainda considera a rede funcionando | Espere alguns segundos na tela de login. Se continuar, use o modo manutenção. |
| "Ver recibo" não abre | O quiosque bloqueia o navegador do sistema | Limitação conhecida: o recibo abre fora do app. |
| Tela apagou | Tablet fora do carregador | A tela fica sempre acesa só no carregador. Mantenha o tablet conectado. |
| Tela preta, não liga e o PC não detecta | Bateria acabou | Ligue no carregador de parede, espere 20 a 30 minutos e segure o botão de energia por 15 segundos. Se não ligar, segure energia + volume para cima por 15 segundos. |
| Leitor de código de barras não funciona | Leitor desconectado ou sem carga | O quiosque não bloqueia o leitor. Reconecte ou pareie o leitor (pareamento Bluetooth exige o modo manutenção). |

### Comandos adb diretos (se o script não estiver disponível)

```powershell
$adb = 'C:\android\sdk\platform-tools\adb.exe'
$r = 'com.exemplo.App3fit/app3fit.kiosk.KioskCommandReceiver'

& $adb shell am broadcast -a app3fit.kiosk.COMMAND -n $r -f 0x20 --es cmd status
& $adb shell am broadcast -a app3fit.kiosk.COMMAND -n $r -f 0x20 --es cmd off
& $adb shell am broadcast -a app3fit.kiosk.COMMAND -n $r -f 0x20 --es cmd on
& $adb shell am broadcast -a app3fit.kiosk.COMMAND -n $r -f 0x20 --es cmd remove-owner
```

Esses comandos só funcionam pelo adb. Outros apps não conseguem enviá-los.

---

## 8. Configurar um tablet novo (ou depois de resetar)

1. Ligue o tablet e faça a configuração inicial **sem adicionar conta Google**
   (pule a etapa de login).
2. Ative as Opções do desenvolvedor: Configurações → Sobre o tablet → toque 7 vezes em
   "Número da versão".
3. Em Opções do desenvolvedor, ative **Depuração USB**.
4. Conecte ao PC e aceite "Permitir depuração USB" (marque "Sempre permitir neste computador").
5. Confira que o tablet tem **Android 7.0 ou mais novo**:
   ```powershell
   C:\android\sdk\platform-tools\adb.exe shell getprop ro.build.version.sdk
   ```
   O número precisa ser **24 ou maior**.
6. Instale o app:
   ```powershell
   cordova run android --device
   ```
7. Ative o quiosque (uma vez só):
   ```powershell
   .\scripts\kiosk.ps1 ativar
   ```
   Deve aparecer `Success: Device owner set to package ...`.

> Se o passo 7 falhar com uma mensagem sobre contas ou usuários, o tablet tem alguma conta
> cadastrada (Configurações → Contas). Remova as contas e tente de novo.
