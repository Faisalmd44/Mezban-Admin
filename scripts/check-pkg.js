const fs = require("fs");
const path = require("path");

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));

const required = ["expo", "expo-router", "react-native", "@supabase/supabase-js"];
const missing = required.filter((dep) => !pkg.dependencies[dep]);

if (missing.length > 0) {
  console.error("Missing required dependencies:", missing.join(", "));
  process.exit(1);
}

console.log("All required dependencies present.");
