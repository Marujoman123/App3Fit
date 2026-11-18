cordova.define('cordova/plugin_list', function(require, exports, module) {
  module.exports = [
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
    "cordova-plugin-kiosk": "1.0.0"
  };
});