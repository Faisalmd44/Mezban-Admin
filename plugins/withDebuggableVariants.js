const { withAndroidBuildGradle } = require("@expo/config-plugins");

module.exports = function withDebuggableVariants(config) {
  return withAndroidBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    if (!buildGradle.includes("debuggable true")) {
      buildGradle = buildGradle.replace(
        "android {",
        "android { buildTypes { debug { debuggable true } }"
      );
    }
    config.modResults.contents = buildGradle;
    return config;
  });
};
