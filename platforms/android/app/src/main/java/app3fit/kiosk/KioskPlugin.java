package app3fit.kiosk;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import android.view.WindowManager;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Entra em Lock Task sempre que a tela do app volta ao primeiro plano
 * (abertura, boot, reinstalação via "cordova run", retorno após travamento).
 * Também abre o painel de Wi-Fi do Android sem sair do quiosque.
 */
public class KioskPlugin extends CordovaPlugin {

    /** Tempo máximo fora do app (painel de Wi-Fi / Configurações) antes de voltar sozinho. */
    private static final long WIFI_TIMEOUT_MS = 2 * 60 * 1000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable voltarAoApp = this::voltarAoApp;

    @Override
    protected void pluginInitialize() {
        enforce();
    }

    @Override
    public void onResume(boolean multitasking) {
        handler.removeCallbacks(voltarAoApp);
        enforce();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(voltarAoApp);
    }

    private void enforce() {
        final Activity activity = cordova.getActivity();
        final boolean lock = KioskPolicy.shouldLock(activity);
        // apply() também volta a lista do Lock Task para "só o app" (fecha as Configurações)
        if (lock) KioskPolicy.apply(activity);

        activity.runOnUiThread(() -> {
            if (lock) {
                // Caixa: tela sempre acesa enquanto o app está aberto
                activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                if (!KioskPolicy.isInLockTask(activity)) {
                    try {
                        activity.startLockTask();
                    } catch (Exception e) {
                        Log.e(KioskPolicy.TAG, "startLockTask falhou", e);
                    }
                }
            } else {
                activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                if (KioskPolicy.isInLockTask(activity)) {
                    try {
                        activity.stopLockTask();
                    } catch (Exception ignored) {
                    }
                }
            }
        });
    }

    /** Abre o painel de Wi-Fi do Android (Android 10+) ou a tela de Wi-Fi (versões antigas). */
    private void abrirWifi(CallbackContext cb) {
        final Activity activity = cordova.getActivity();
        activity.runOnUiThread(() -> {
            try {
                KioskPolicy.allowSettings(activity);
                Intent intent = Build.VERSION.SDK_INT >= 29
                        ? new Intent(Settings.Panel.ACTION_INTERNET_CONNECTIVITY)
                        : new Intent(Settings.ACTION_WIFI_SETTINGS);
                activity.startActivity(intent);
                if (KioskPolicy.shouldLock(activity)) {
                    handler.postDelayed(voltarAoApp, WIFI_TIMEOUT_MS);
                }
                cb.success();
            } catch (Exception e) {
                KioskPolicy.apply(activity);
                Log.e(KioskPolicy.TAG, "Não foi possível abrir o Wi-Fi", e);
                cb.error("Não foi possível abrir o Wi-Fi: " + e.getMessage());
            }
        });
    }

    /** Tempo esgotado: traz o app de volta e fecha as Configurações. */
    private void voltarAoApp() {
        Activity activity = cordova.getActivity();
        Log.i(KioskPolicy.TAG, "Tempo do Wi-Fi esgotado, voltando ao app");
        Intent launch = activity.getPackageManager().getLaunchIntentForPackage(activity.getPackageName());
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            try {
                activity.startActivity(launch);
            } catch (Exception e) {
                Log.e(KioskPolicy.TAG, "Não foi possível voltar ao app", e);
            }
        }
        KioskPolicy.apply(activity);
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        switch (action) {
            case "status":
                try {
                    callbackContext.success(new JSONObject(KioskPolicy.status(cordova.getActivity())));
                } catch (Exception e) {
                    callbackContext.error(e.getMessage());
                }
                return true;
            case "temInternet":
                callbackContext.success(KioskPolicy.hasInternet(cordova.getActivity()) ? 1 : 0);
                return true;
            case "abrirWifi":
                abrirWifi(callbackContext);
                return true;
            default:
                return false;
        }
    }
}
