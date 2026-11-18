package app3fit.kiosk;

import android.app.ActivityManager;
import android.app.admin.DevicePolicyManager;
import android.bluetooth.BluetoothAdapter;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ResolveInfo;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.UserManager;
import android.provider.Settings;
import android.util.Log;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Regras do modo quiosque. Só funcionam quando o app é Device Owner
 * (adb shell dpm set-device-owner ...). Sem isso, tudo vira no-op.
 */
public final class KioskPolicy {

    static final String TAG = "App3fitKiosk";
    private static final String PREFS = "app3fit_kiosk";
    private static final String KEY_ENABLED = "enabled";
    private static final String KEY_HIDDEN = "hidden_launchers";

    /** Configurações do Android: liberadas só enquanto o painel de Wi-Fi está aberto. */
    static final String SETTINGS_PKG = "com.android.settings";

    /**
     * Interface do sistema: liberada no Lock Task para que a janela "Permitir depuração USB?"
     * (UsbDebuggingActivity) possa aparecer. Sem isso, um PC não autorizado fica sem acesso.
     * A cortina, o Home e os recentes continuam bloqueados por setLockTaskFeatures.
     */
    static final String SYSTEMUI_PKG = "com.android.systemui";

    /**
     * Restrições ativas enquanto o quiosque está ligado. Protegem o tablet caso alguém
     * caia nas Configurações completas pelo botão "Mais" do painel de Wi-Fi.
     * Não incluir DISALLOW_DEBUGGING_FEATURES nem DISALLOW_INSTALL_APPS: quebrariam o adb.
     */
    private static final String[] RESTRICTIONS = {
            UserManager.DISALLOW_FACTORY_RESET,
            UserManager.DISALLOW_SAFE_BOOT,
            UserManager.DISALLOW_ADD_USER,
            UserManager.DISALLOW_MODIFY_ACCOUNTS,
            // Leitor de código de barras: ninguém desliga o Bluetooth nem despareia o leitor.
            // Para parear outro leitor, use o modo manutenção (kiosk.ps1 off).
            UserManager.DISALLOW_CONFIG_BLUETOOTH,
    };

    /** BatteryManager.BATTERY_PLUGGED_AC | USB | WIRELESS */
    private static final String STAY_ON_ALL_PLUGS = "7";

    private KioskPolicy() {}

    static DevicePolicyManager dpm(Context ctx) {
        return (DevicePolicyManager) ctx.getSystemService(Context.DEVICE_POLICY_SERVICE);
    }

    static ComponentName admin(Context ctx) {
        return new ComponentName(ctx, KioskAdminReceiver.class);
    }

    static ComponentName mainActivity(Context ctx) {
        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        return launch != null ? launch.getComponent() : null;
    }

    public static boolean isDeviceOwner(Context ctx) {
        return dpm(ctx).isDeviceOwnerApp(ctx.getPackageName());
    }

    /** Quiosque ligado por padrão; desligado só pelo comando de manutenção. */
    public static boolean isEnabled(Context ctx) {
        return prefs(ctx).getBoolean(KEY_ENABLED, true);
    }

    static void setEnabled(Context ctx, boolean enabled) {
        prefs(ctx).edit().putBoolean(KEY_ENABLED, enabled).commit();
    }

    public static boolean shouldLock(Context ctx) {
        return isDeviceOwner(ctx) && isEnabled(ctx);
    }

    public static boolean isInLockTask(Context ctx) {
        ActivityManager am = (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
        return am.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE;
    }

    /** Aplica as políticas do quiosque (idempotente). */
    public static void apply(Context ctx) {
        if (!shouldLock(ctx)) return;
        DevicePolicyManager dpm = dpm(ctx);
        ComponentName admin = admin(ctx);
        try {
            dpm.setLockTaskPackages(admin, new String[]{ctx.getPackageName(), SYSTEMUI_PKG});
            if (Build.VERSION.SDK_INT >= 28) {
                // Barra de status só com informações (relógio, bateria, Wi-Fi), sem abrir.
                // Menu de energia liberado (segurar o botão): permite reiniciar sem PC.
                // Sem Home, recentes nem notificações.
                dpm.setLockTaskFeatures(admin, DevicePolicyManager.LOCK_TASK_FEATURE_SYSTEM_INFO
                        | DevicePolicyManager.LOCK_TASK_FEATURE_GLOBAL_ACTIONS);
            }

            ComponentName main = mainActivity(ctx);
            if (main != null) {
                IntentFilter home = new IntentFilter(Intent.ACTION_MAIN);
                home.addCategory(Intent.CATEGORY_HOME);
                home.addCategory(Intent.CATEGORY_DEFAULT);
                dpm.addPersistentPreferredActivity(admin, home, main);
            }

            dpm.setKeyguardDisabled(admin, true);
            dpm.setStatusBarDisabled(admin, true);
            dpm.setGlobalSetting(admin, Settings.Global.STAY_ON_WHILE_PLUGGED_IN, STAY_ON_ALL_PLUGS);
            // Garante a depuração USB ligada (alguém pode ter desligado nas Configurações)
            dpm.setGlobalSetting(admin, Settings.Global.ADB_ENABLED, "1");
            ensureBluetoothOn();
            for (String r : RESTRICTIONS) dpm.addUserRestriction(admin, r);
            hideOtherLaunchers(ctx, dpm, admin);
        } catch (SecurityException e) {
            Log.e(TAG, "Falha ao aplicar políticas do quiosque", e);
        }
    }

    /** Religa o Bluetooth (leitor de código de barras) se alguém tiver desligado. */
    @SuppressWarnings("deprecation")
    private static void ensureBluetoothOn() {
        BluetoothAdapter bt = BluetoothAdapter.getDefaultAdapter();
        if (bt != null && !bt.isEnabled()) {
            Log.i(TAG, "Bluetooth estava desligado; religando");
            bt.enable();
        }
    }

    /**
     * Oculta (sem desinstalar) os outros launchers. Sem isso, se o app travar,
     * o Android pode voltar para o launcher original que ficou na pilha.
     * Desfeito em release(). O FallbackHome do Settings nunca é ocultado.
     */
    private static void hideOtherLaunchers(Context ctx, DevicePolicyManager dpm, ComponentName admin) {
        Set<String> hidden = new HashSet<>(prefs(ctx).getStringSet(KEY_HIDDEN, new HashSet<>()));
        Intent home = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME);
        List<ResolveInfo> list = ctx.getPackageManager().queryIntentActivities(home, 0);
        for (ResolveInfo ri : list) {
            String pkg = ri.activityInfo.packageName;
            if (pkg.equals(ctx.getPackageName()) || pkg.equals("com.android.settings") || ri.priority < 0) {
                continue;
            }
            if (dpm.setApplicationHidden(admin, pkg, true)) {
                hidden.add(pkg);
                Log.i(TAG, "Launcher ocultado: " + pkg);
            }
        }
        prefs(ctx).edit().putStringSet(KEY_HIDDEN, hidden).commit();
    }

    private static void restoreLaunchers(Context ctx, DevicePolicyManager dpm, ComponentName admin) {
        Set<String> hidden = prefs(ctx).getStringSet(KEY_HIDDEN, new HashSet<>());
        for (String pkg : hidden) {
            dpm.setApplicationHidden(admin, pkg, false);
        }
        prefs(ctx).edit().remove(KEY_HIDDEN).commit();
    }

    /**
     * Libera temporariamente as Configurações do Android no Lock Task, para o painel de Wi-Fi.
     * Volta a ser só o app no próximo apply() (quando o app volta para a frente).
     */
    public static void allowSettings(Context ctx) {
        if (!shouldLock(ctx)) return;
        try {
            dpm(ctx).setLockTaskPackages(admin(ctx), new String[]{ctx.getPackageName(), SYSTEMUI_PKG, SETTINGS_PKG});
        } catch (SecurityException e) {
            Log.e(TAG, "Falha ao liberar Configurações", e);
        }
    }

    /** true se há internet de verdade (rede validada pelo Android). */
    public static boolean hasInternet(Context ctx) {
        ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        Network n = cm.getActiveNetwork();
        if (n == null) return false;
        NetworkCapabilities caps = cm.getNetworkCapabilities(n);
        return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }

    /** Desliga o quiosque para manutenção. O app continua Device Owner. */
    public static void release(Context ctx) {
        if (!isDeviceOwner(ctx)) return;
        DevicePolicyManager dpm = dpm(ctx);
        ComponentName admin = admin(ctx);
        try {
            // Tirar o pacote da lista encerra o Lock Task imediatamente
            dpm.setLockTaskPackages(admin, new String[0]);
            dpm.clearPackagePersistentPreferredActivities(admin, ctx.getPackageName());
            dpm.setKeyguardDisabled(admin, false);
            dpm.setStatusBarDisabled(admin, false);
            dpm.setGlobalSetting(admin, Settings.Global.STAY_ON_WHILE_PLUGGED_IN, "0");
            for (String r : RESTRICTIONS) dpm.clearUserRestriction(admin, r);
            restoreLaunchers(ctx, dpm, admin);
        } catch (SecurityException e) {
            Log.e(TAG, "Falha ao liberar políticas do quiosque", e);
        }
    }

    /** Desfaz tudo e deixa de ser Device Owner (o app volta a poder ser desinstalado). */
    @SuppressWarnings("deprecation")
    public static void removeOwner(Context ctx) {
        if (!isDeviceOwner(ctx)) return;
        release(ctx);
        dpm(ctx).clearDeviceOwnerApp(ctx.getPackageName());
    }

    public static String status(Context ctx) {
        return "{\"deviceOwner\":" + isDeviceOwner(ctx)
                + ",\"enabled\":" + isEnabled(ctx)
                + ",\"lockTask\":" + isInLockTask(ctx) + "}";
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
