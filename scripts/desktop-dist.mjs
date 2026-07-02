import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const tempOutputDir = path.join(tmpdir(), "motor-simulator-release");
const releaseDir = path.join(projectRoot, "release");
const localNodeDir = path.join(projectRoot, ".tools", "node-v22.18.0-win-x64");
const localNodeExecutable = path.join(localNodeDir, "node.exe");
const localNpmExecutable = path.join(localNodeDir, "npm.cmd");

function findNodeExecutable() {
  const candidates = [
    localNodeExecutable,
    process.execPath,
    "C:\\Program Files\\Common Files\\Adobe\\Creative Cloud Libraries\\libs\\node.exe",
    "C:\\Program Files\\Adobe\\Adobe Creative Cloud Experience\\libs\\node.exe",
    "C:\\Program Files\\Autodesk\\Desktop Connect\\forever\\node.exe",
    "C:\\Program Files\\WindowsApps\\OpenAI.Codex_26.602.9276.0_x64__2p2nqsd0c76g0\\app\\resources\\node.exe",
  ];

  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function createSpawnEnv(nodeExecutable) {
  const pathEntries = [process.env.PATH ?? ""];

  if (existsSync(localNodeDir)) {
    pathEntries.unshift(localNodeDir);
  }

  return {
    ...process.env,
    PATH: pathEntries.join(path.delimiter),
    npm_execpath: existsSync(localNpmExecutable)
      ? localNpmExecutable
      : process.env.npm_execpath,
    npm_node_execpath: nodeExecutable,
  };
}

function runStep(command, args, label, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env,
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed with exit code ${code ?? "unknown"}.`));
    });
  });
}

const nodeExecutable = findNodeExecutable();
if (!nodeExecutable) {
  throw new Error("No usable node executable found for desktop packaging.");
}
const spawnEnv = createSpawnEnv(nodeExecutable);

await runStep(
  nodeExecutable,
  [path.join(projectRoot, "node_modules", "vite", "bin", "vite.js"), "build", "--configLoader", "native"],
  "Vite build",
  spawnEnv,
);

await runStep(nodeExecutable, [path.join(projectRoot, "scripts", "build-icons.mjs")], "Icon build", spawnEnv);

await fs.rm(tempOutputDir, { recursive: true, force: true });
await fs.mkdir(tempOutputDir, { recursive: true });

await runStep(
  nodeExecutable,
  [
    path.join(projectRoot, "node_modules", "electron-builder", "cli.js"),
    "--win",
    "nsis",
    "portable",
    `--config.directories.output=${tempOutputDir}`,
  ],
  "Electron Builder",
  spawnEnv,
);

await fs.rm(releaseDir, { recursive: true, force: true });
await fs.mkdir(releaseDir, { recursive: true });
await fs.cp(tempOutputDir, releaseDir, { recursive: true });
