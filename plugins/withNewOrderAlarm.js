const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withNewOrderAlarm(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    if (!manifest.manifest.application) return config;
    const app = manifest.manifest.application[0];
    if (!app.receiver) app.receiver = [];
    app.receiver.push({
      $: {
        "android:name": "com.emergent.restroorder.admin.NewOrderReceiver",
        "android:exported": "false",
      },
    });
    return config;
  });
};
