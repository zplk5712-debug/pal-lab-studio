import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const viteEntry = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");

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

function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http
        .get(url, (response) => {
          response.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() - startedAt > timeoutMs) {
            reject(new Error(`Timed out waiting for ${url}`));
            return;
          }

          setTimeout(check, 500);
        });

      request.setTimeout(3000, () => {
        request.destroy();
      });
    };

    check();
  });
}

const nodeExecutable = findNodeExecutable();
if (!nodeExecutable) {
  throw new Error("No usable node executable found for Electron development.");
}

const viteProcess = spawn(
  nodeExecutable,
  [viteEntry, "--host", "127.0.0.1", "--port", "5173", "--configLoader", "native"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
  },
);

const shutdown = () => {
  if (!viteProcess.killed) {
    viteProcess.kill();
  }
};

process.on("exit", shutdown);
process.on("SIGINT", () => {
  shutdown();
  process.exit(130);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(143);
});

await waitForServer("http://127.0.0.1:5173");

const electronCli = path.join(projectRoot, "node_modules", "electron", "cli.js");
const electronProcess = spawn(nodeExecutable, [electronCli, "."], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: "http://127.0.0.1:5173/",
    ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
  },
});

electronProcess.on("exit", (code) => {
  shutdown();
  process.exit(code ?? 0);
});
