const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const shimPath = path.resolve(
  __dirname,
  "src/shims/react-native-ping.js"
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-ping") {
    return {
      filePath: shimPath,
      type: "sourceFile",
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
