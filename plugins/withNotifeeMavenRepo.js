const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withNotifeeMavenRepo(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("maven.notifee.io")) {
      contents = contents.replace(
        /repositories\s*\{/,
        `repositories {
        maven { url "https://maven.notifee.app" }`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
