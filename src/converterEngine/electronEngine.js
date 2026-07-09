// window.converterApp(IPC)를 웹 엔진과 동일한 인터페이스로 감싸는 어댑터.
export function createElectronEngine() {
  const api = window.converterApp;

  return {
    kind: "electron",
    hasFileDialog: true,
    supportsDirectoryPicker: true,

    getConfig: () => api.getConfig(),

    chooseFiles: async (conversionType) => {
      const paths = await api.chooseFiles(conversionType);
      return paths.map((path) => ({ key: path, ref: path, name: path.split(/[\\/]/).pop() || path }));
    },

    chooseOutputTarget: async () => {
      const dir = await api.chooseOutputFolder();
      return dir ? { mode: "directory", value: dir, label: dir } : null;
    },

    checkDiskSpace: (outputTarget, items) => api.checkDiskSpace(outputTarget.value, items.map((item) => item.ref)),

    convert: async ({ jobId, conversionType, items, outputTarget, options }) => {
      const results = await api.convert({
        jobId,
        conversionType,
        files: items.map((item) => item.ref),
        outputDir: outputTarget.value,
        options,
      });
      return results.map((result) => ({
        key: result.file,
        success: result.success,
        error: result.error,
        cancelled: result.cancelled,
        outputPaths: result.outputPaths,
      }));
    },

    cancel: (jobId) => api.cancel(jobId),
    onProgress: (cb) => api.onProgress(cb),

    // 결과 폴더 열기 — 브라우저에는 OS 파일 탐색기를 여는 API가 없어서 데스크톱(Electron) 전용.
    openOutputFolder: (outputTarget) => window.desktopApp?.openFolder(outputTarget.value),

    listProfiles: () => api.listProfiles(),
    saveProfile: (profile) => api.saveProfile(profile),
    deleteProfile: (profileId) => api.deleteProfile(profileId),

    previewImage: (ref) => api.previewImage(ref),
    previewAscii: (ref, options) => api.previewAscii(ref, options),
    previewTable: (ref, options) => api.previewTable(ref, options),
    previewPdfBase64: (ref) => api.previewPdfBase64(ref),
    previewText: (ref) => api.previewText(ref),
  };
}
