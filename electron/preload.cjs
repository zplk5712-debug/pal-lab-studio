const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  getAppInfo: () => ipcRenderer.invoke("desktop:get-app-info"),
  openUserDataFolder: () => ipcRenderer.invoke("desktop:open-user-data"),
  readDatabase: (databaseKey) => ipcRenderer.invoke("desktop:read-database", databaseKey),
  writeDatabase: (databaseKey, items) => ipcRenderer.invoke("desktop:write-database", databaseKey, items),
  chooseFolder: (defaultName) => ipcRenderer.invoke("desktop:choose-folder", defaultName),
  generateProject: (folderName, files) => ipcRenderer.invoke("desktop:generate-project", folderName, files),
  openFolder: (folderPath) => ipcRenderer.invoke("desktop:open-folder", folderPath),
  saveHtmlDialog: (defaultName) => ipcRenderer.invoke("desktop:save-html-dialog", defaultName),
  writeFile: (filePath, content) => ipcRenderer.invoke("desktop:write-file", filePath, content),
  ollamaStatus: () => ipcRenderer.invoke("desktop:ollama-status"),
  ollamaStart: () => ipcRenderer.invoke("desktop:ollama-start"),
  ollamaInstall: () => ipcRenderer.invoke("desktop:ollama-install"),
  ollamaPull: (model) => ipcRenderer.invoke("desktop:ollama-pull", model),
  onSetupLog: (cb) => ipcRenderer.on("ollama-setup-log", (_e, msg) => cb(msg)),
  onPullProgress: (cb) => ipcRenderer.on("ollama-pull-progress", (_e, obj) => cb(obj)),
  removeSetupListeners: () => {
    ipcRenderer.removeAllListeners("ollama-setup-log");
    ipcRenderer.removeAllListeners("ollama-pull-progress");
  },
});
