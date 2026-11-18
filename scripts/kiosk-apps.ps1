# Desativa ou reativa os apps listados em apps-desativados.txt no tablet-quiosque.
# Uso: .\scripts\kiosk-apps.ps1 desativar | reativar | status
param([Parameter(Mandatory)][ValidateSet('desativar', 'reativar', 'status')][string]$Acao)

$adb = if ($env:ADB) { $env:ADB } else { 'C:\android\sdk\platform-tools\adb.exe' }
$lista = Get-Content (Join-Path $PSScriptRoot 'apps-desativados.txt') |
    Where-Object { $_ -and -not $_.StartsWith('#') } | ForEach-Object { $_.Trim() }
$desativados = (& $adb shell pm list packages -d) -replace '^package:', ''

foreach ($p in $lista) {
    switch ($Acao) {
        'desativar' { $r = & $adb shell pm disable-user --user 0 $p 2>&1 }
        'reativar'  { $r = & $adb shell pm enable --user 0 $p 2>&1 }
        'status'    { $r = if ($desativados -contains $p) { 'desativado' } else { 'ATIVO' } }
    }
    "{0,-45} {1}" -f $p, ($r -join ' ')
}
