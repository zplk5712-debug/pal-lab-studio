import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function findNodeExecutable() {
  const candidates = [
    process.execPath,
    "C:\\Program Files\\Common Files\\Adobe\\Creative Cloud Libraries\\libs\\node.exe",
    "C:\\Program Files\\Adobe\\Adobe Creative Cloud Experience\\libs\\node.exe",
    "C:\\Program Files\\Autodesk\\Desktop Connect\\forever\\node.exe",
    "C:\\Program Files\\WindowsApps\\OpenAI.Codex_26.602.9276.0_x64__2p2nqsd0c76g0\\app\\resources\\node.exe",
  ];

  return candidates.find(Boolean);
}

const nodeExecutable = findNodeExecutable();
if (!nodeExecutable) {
  throw new Error("No usable node executable found to start Electron.");
}

const electronCli = path.join(projectRoot, "node_modules", "electron", "cli.js");
const child = spawn(nodeExecutable, [electronCli, "."], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
