const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withPluginManagementRepos(config) {
  return withProjectBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    if (!buildGradle.includes("google()")) {
      buildGradle = buildGradle.replace(
        "repositories {",
        `repositories {
        google()
        mavenCentral()`
      );
    }

    config.modResults.contents = buildGradle;
    return config;
  });
};
