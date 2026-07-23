const { withAndroidBuildGradle } = require("@expo/config-plugins");

module.exports = function withGradleMemoryFix(config) {
  return withAndroidBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    if (!buildGradle.includes("org.gradle.jvmargs")) {
      buildGradle = buildGradle.replace(
        "android {",
        "android { \n// Gradle memory fix\norg.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=512m\n"
      );
    }
    config.modResults.contents = buildGradle;
    return config;
  });
};
