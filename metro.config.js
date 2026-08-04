const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const rootDist = path.resolve(__dirname, "dist").replace(/\\/g, "/");
const rootWebBuild = path.resolve(__dirname, "web-build").replace(/\\/g, "/");

config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
  new RegExp(`^${rootDist.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/.*`),
  new RegExp(`^${rootWebBuild.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/.*`),
];

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
