cordova.define('cordova/plugin_list', function(require, exports, module) {
  module.exports = [
    {
      "id": "cordova-plugin-keyboard.keyboard",
      "file": "plugins/cordova-plugin-keyboard/www/keyboard.js",
      "pluginId": "cordova-plugin-keyboard",
      "clobbers": [
        "window.Keyboard",
        "cordova.plugins.Keyboard"
      ]
    },
    {
      "id": "cordova-plugin-customurlscheme.LaunchMyApp",
      "file": "plugins/cordova-plugin-customurlscheme/www/android/LaunchMyApp.js",
      "pluginId": "cordova-plugin-customurlscheme",
      "clobbers": [
        "window.plugins.launchmyapp"
      ]
    },
    {
      "id": "cordova-plugin-kiosk.Kiosk",
      "file": "plugins/cordova-plugin-kiosk/www/kiosk.js",
      "pluginId": "cordova-plugin-kiosk",
      "clobbers": [
        "App3fitKiosk"
      ]
    }
  ];
  module.exports.metadata = {
    "cordova-plugin-keyboard": "1.3.0",
    "cordova-plugin-customurlscheme": "5.0.2",
    "cordova-plugin-kiosk": "1.0.0"
  };
});