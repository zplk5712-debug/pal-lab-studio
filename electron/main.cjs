const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const os = require("node:os");
const { execFile, spawn, exec } = require("node:child_process");
const { promisify } = require("node:util");
const execFileAsync = promisify(execFile);
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");
const { registerConverterIpc } = require("./converter/ipc-handlers.cjs");

const isDev = !app.isPackaged;
const appTitle = "이지랩 스튜디오";
const databaseFiles = {
  lmGuide: "lm-guide-database.json",
  encoder: "encoder-database.json",
};

function getDataDirectory() {
  return path.join(app.getPath("userData"), "data");
}

async function ensureDataDirectory() {
  const dataDirectory = getDataDirectory();
  await fs.mkdir(dataDirectory, { recursive: true });
  return dataDirectory;
}

async function readDatabaseFile(databaseKey) {
  const fileName = databaseFiles[databaseKey];
  if (!fileName) {
    throw new Error(`Unknown database key: ${databaseKey}`);
  }

  const dataDirectory = await ensureDataDirectory();
  const filePath = path.join(dataDirectory, fileName);

  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeDatabaseFile(databaseKey, items) {
  const fileName = databaseFiles[databaseKey];
  if (!fileName) {
    throw new Error(`Unknown database key: ${databaseKey}`);
  }

  const dataDirectory = await ensureDataDirectory();
  const filePath = path.join(dataDirectory, fileName);
  await fs.writeFile(filePath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  return filePath;
}

function getRendererUrl() {
  if (process.env.VITE_DEV_SERVER_URL) {
    return process.env.VITE_DEV_SERVER_URL;
  }

  return `file://${path.join(__dirname, "..", "dist", "index.html")}`;
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    autoHideMenuBar: false,
    backgroundColor: "#081222",
    title: appTitle,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.loadURL(getRendererUrl());
  return mainWindow;
}

function buildAppMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Open Data Folder",
          click: async () => {
            await shell.openPath(app.getPath("userData"));
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "togglefullscreen" },
        ...(isDev ? [{ role: "toggleDevTools" }] : []),
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Version Info",
          click: async () => {
            await dialog.showMessageBox({
              type: "info",
              title: appTitle,
              message: `${appTitle} ${app.getVersion()}`,
              detail:
                "Offline installation is supported. To update in offline environments, run a newer installer over the existing app.",
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

registerConverterIpc(ipcMain, { app, dialog });

ipcMain.handle("desktop:get-app-info", () => ({
  name: app.getName(),
  version: app.getVersion(),
  userDataPath: app.getPath("userData"),
  dataDirectoryPath: getDataDirectory(),
  isPackaged: app.isPackaged,
}));

ipcMain.handle("desktop:open-user-data", async () => {
  const result = await shell.openPath(await ensureDataDirectory());
  return result === "" ? true : result;
});

ipcMain.handle("desktop:read-database", async (_event, databaseKey) => {
  return readDatabaseFile(databaseKey);
});

ipcMain.handle("desktop:write-database", async (_event, databaseKey, items) => {
  if (!Array.isArray(items)) {
    throw new Error("Database payload must be an array.");
  }

  return writeDatabaseFile(databaseKey, items);
});

ipcMain.handle("desktop:choose-folder", async (_event, defaultName) => {
  const desktopPath = app.getPath("desktop");
  const result = await dialog.showOpenDialog({
    title: "프로젝트를 저장할 위치 선택",
    defaultPath: desktopPath,
    properties: ["openDirectory", "createDirectory"],
    buttonLabel: "여기에 저장",
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return path.join(result.filePaths[0], defaultName);
});

ipcMain.handle("desktop:save-html-dialog", async (_event, defaultName) => {
  const desktopPath = app.getPath("desktop");
  const result = await dialog.showSaveDialog({
    title: "프로그램 파일 저장",
    defaultPath: path.join(desktopPath, `${defaultName}.html`),
    filters: [{ name: "HTML 파일", extensions: ["html"] }],
    buttonLabel: "저장",
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
});

ipcMain.handle("desktop:write-file", async (_event, filePath, content) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
});

ipcMain.handle("desktop:generate-project", async (_event, folderNameOrPath, files) => {
  const projectDir = path.isAbsolute(folderNameOrPath)
    ? folderNameOrPath
    : path.join(app.getPath("desktop"), folderNameOrPath);

  await fs.mkdir(projectDir, { recursive: true });

  for (const { name, content } of files) {
    const filePath = path.join(projectDir, name);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
  }

  return projectDir;
});

ipcMain.handle("desktop:open-folder", async (_event, folderPath) => {
  await shell.openPath(folderPath);
  return true;
});

// ── Ollama 설치 마법사 ────────────────────────────────────────────────

async function isOllamaRunning() {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:11434/api/tags", (res) => {
      let body = "";
      res.on("data", d => { body += d; });
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          resolve({ running: true, models: (data.models || []).map(m => m.name) });
        } catch {
          resolve({ running: false, models: [] });
        }
      });
    });
    req.on("error", () => resolve({ running: false, models: [] }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ running: false, models: [] }); });
  });
}

function getOllamaExePath() {
  // Common Windows install paths
  const candidates = [
    "ollama",
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Ollama", "ollama.exe"),
    path.join(process.env.PROGRAMFILES || "", "Ollama", "ollama.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "", "Ollama", "ollama.exe"),
  ];
  for (const p of candidates) {
    try {
      if (p === "ollama" || fsSync.existsSync(p)) return p;
    } catch {}
  }
  return "ollama";
}

async function isOllamaInstalled() {
  const exePath = getOllamaExePath();
  try {
    await execFileAsync(exePath, ["--version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

ipcMain.handle("desktop:ollama-status", async () => {
  const running = await isOllamaRunning();
  if (running.running) return { installed: true, running: true, models: running.models };
  const installed = await isOllamaInstalled();
  return { installed, running: false, models: [] };
});

ipcMain.handle("desktop:ollama-start", async (event) => {
  // Ollama on Windows auto-starts after install, but try spawning serve just in case
  const proc = spawn(getOllamaExePath(), ["serve"], { detached: true, stdio: "ignore", windowsHide: true });
  proc.unref();

  // Poll until it responds (up to 15s)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    const status = await isOllamaRunning();
    if (status.running) {
      event.sender.send("ollama-setup-log", "Ollama 서버 시작 완료!");
      return { ok: true, models: status.models };
    }
  }
  throw new Error("Ollama 서버 시작 시간 초과");
});

ipcMain.handle("desktop:ollama-install", async (event) => {
  const installerPath = path.join(os.tmpdir(), "OllamaSetup.exe");

  // Find bundled installer first (when packaged)
  const bundledInstaller = app.isPackaged
    ? path.join(process.resourcesPath, "OllamaSetup.exe")
    : path.join(__dirname, "..", "resources", "OllamaSetup.exe");

  if (fsSync.existsSync(bundledInstaller)) {
    event.sender.send("ollama-setup-log", "번들 설치파일로 설치 중…");
    await execFileAsync(bundledInstaller, ["/S"], { timeout: 120000 });
    event.sender.send("ollama-setup-log", "Ollama 설치 완료!");
    return { ok: true };
  }

  // Download from internet
  event.sender.send("ollama-setup-log", "Ollama 다운로드 중… (약 200MB)");

  await new Promise((resolve, reject) => {
    function download(url, dest, depth = 0) {
      if (depth > 5) return reject(new Error("리다이렉트 횟수 초과"));
      const mod = url.startsWith("https") ? https : http;
      mod.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return download(res.headers.location, dest, depth + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));

        const total = parseInt(res.headers["content-length"] || "0");
        let received = 0;
        const file = fsSync.createWriteStream(dest);

        res.on("data", chunk => {
          received += chunk.length;
          file.write(chunk);
          if (total > 0) {
            const pct = Math.round(received / total * 100);
            event.sender.send("ollama-setup-log", `다운로드 중… ${pct}%`);
          }
        });
        res.on("end", () => { file.end(); resolve(); });
        res.on("error", reject);
      }).on("error", reject);
    }
    download("https://ollama.com/download/OllamaSetup.exe", installerPath);
  });

  event.sender.send("ollama-setup-log", "설치 중…");
  await execFileAsync(installerPath, ["/S"], { timeout: 120000 });
  event.sender.send("ollama-setup-log", "Ollama 설치 완료!");
  return { ok: true };
});

ipcMain.handle("desktop:ollama-pull", async (event, modelName) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ name: modelName, stream: true });
    const req = http.request({
      hostname: "localhost",
      port: 11434,
      path: "/api/pull",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      let buffer = "";
      res.on("data", chunk => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (!event.sender.isDestroyed()) {
              event.sender.send("ollama-pull-progress", obj);
            }
            if (obj.status === "success") resolve(true);
          } catch {}
        }
      });
      res.on("end", () => resolve(true));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
});


app.whenReady().then(() => {
  buildAppMenu();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
