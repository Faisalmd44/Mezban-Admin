const { withAndroidBuildGradle } = require("@expo/config-plugins");

module.exports = function withNotifeeMavenRepo(config) {
  return withAndroidBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    if (!buildGradle.includes("maven.notifee.io")) {
      buildGradle = buildGradle.replace(
        "allprojects { repositories {",
        "allprojects { repositories { maven { url 'https://maven.notifee.io' } "
      );
    }
    config.modResults.contents = buildGradle;
    return config;
  });
};
