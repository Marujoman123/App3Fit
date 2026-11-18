<#
  Manutenção do modo quiosque do App3fit (tablet ligado por USB, depuração USB ativa).

  Uso (na pasta do projeto):
    .\scripts\kiosk.ps1 status    # mostra o estado
    .\scripts\kiosk.ps1 off       # sai do quiosque para manutenção
    .\scripts\kiosk.ps1 on        # volta ao quiosque
    .\scripts\kiosk.ps1 ativar    # 1ª vez: torna o app Device Owner (tablet sem contas)
    .\scripts\kiosk.ps1 remover   # deixa de ser Device Owner (permite desinstalar)

  Atualizar o app continua sendo: cordova run android --device
#>
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('status', 'on', 'off', 'ativar', 'remover')]
    [string]$Acao
)

$adb = if ($env:ADB) { $env:ADB } else { 'C:\android\sdk\platform-tools\adb.exe' }
$pkg = 'com.exemplo.App3fit'
$admin = "$pkg/app3fit.kiosk.KioskAdminReceiver"
$receiver = "$pkg/app3fit.kiosk.KioskCommandReceiver"

function Send-KioskCommand([string]$cmd) {
    # -f 0x20 = FLAG_INCLUDE_STOPPED_PACKAGES (entrega mesmo com o app parado)
    & $adb shell am broadcast -a app3fit.kiosk.COMMAND -n $receiver -f 0x20 --es cmd $cmd
}

switch ($Acao) {
    'ativar' {
        & $adb shell dpm set-device-owner $admin
        if ($LASTEXITCODE -eq 0) { Send-KioskCommand 'on' }
    }
    'remover' { Send-KioskCommand 'remove-owner' }
    default   { Send-KioskCommand $Acao }
}
