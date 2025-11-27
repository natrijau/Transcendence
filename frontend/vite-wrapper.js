import { spawn } from "child_process";

const vite = spawn("node", ["node_modules/vite/bin/vite.js", "--host"], {
  stdio: "inherit",
});

process.on("SIGTERM", () => {
  vite.kill("SIGTERM");
  process.exit(0);
});

process.on("SIGINT", () => {
  vite.kill("SIGINT");
  process.exit(0);
});

vite.on("exit", (code) => {
  process.exit(code);
});
