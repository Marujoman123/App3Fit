package app3fit.kiosk;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Comandos de manutenção, enviados pelo PC via adb (ver scripts/kiosk.ps1):
 *   cmd=on            liga o quiosque e abre o app
 *   cmd=off           desliga o quiosque (Home/barra voltam ao normal)
 *   cmd=remove-owner  desliga e deixa de ser Device Owner
 *   cmd=status        mostra o estado
 * Protegido no manifest por android.permission.DUMP: só o adb shell consegue enviar.
 */
public class KioskCommandReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String cmd = intent.getStringExtra("cmd");
        if (cmd == null) cmd = "status";
        Log.i(KioskPolicy.TAG, "Comando de manutenção: " + cmd);

        switch (cmd) {
            case "on":
                KioskPolicy.setEnabled(ctx, true);
                KioskPolicy.apply(ctx);
                openApp(ctx);
                break;
            case "off":
                KioskPolicy.setEnabled(ctx, false);
                KioskPolicy.release(ctx);
                break;
            case "remove-owner":
                KioskPolicy.setEnabled(ctx, false);
                KioskPolicy.removeOwner(ctx);
                break;
            case "status":
                break;
            default:
                setResultData("comando desconhecido: " + cmd);
                return;
        }
        setResultData(KioskPolicy.status(ctx));
    }

    private void openApp(Context ctx) {
        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (launch == null) return;
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        try {
            ctx.startActivity(launch);
        } catch (Exception e) {
            Log.e(KioskPolicy.TAG, "Não foi possível abrir o app", e);
        }
    }
}
