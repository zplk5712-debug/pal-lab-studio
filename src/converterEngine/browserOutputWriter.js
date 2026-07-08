// 출력 대상: { mode: "directory", directoryHandle } 또는 { mode: "download" }

async function resolveCollisionFreeName(dirHandle, fileName) {
  const dotIndex = fileName.lastIndexOf(".");
  const base = dotIndex === -1 ? fileName : fileName.slice(0, dotIndex);
  const ext = dotIndex === -1 ? "" : fileName.slice(dotIndex);
  let candidate = fileName;
  let counter = 1;

  for (;;) {
    try {
      await dirHandle.getFileHandle(candidate, { create: false });
      candidate = `${base}_${counter}${ext}`;
      counter += 1;
    } catch (error) {
      if (error && error.name === "NotFoundError") return candidate;
      throw error;
    }
  }
}

async function getSubDirectoryHandle(rootHandle, relativeDir) {
  if (!relativeDir) return rootHandle;
  let current = rootHandle;
  for (const part of relativeDir.split("/").filter(Boolean)) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
}

function triggerDownload(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// relativeDir: 원본 폴더구조를 반영한 하위 경로(있으면), fileName: 저장할 파일명
export async function writeOutput(outputTarget, relativeDir, fileName, blob) {
  if (outputTarget?.mode === "directory") {
    const dirHandle = await getSubDirectoryHandle(outputTarget.directoryHandle, relativeDir);
    const finalName = await resolveCollisionFreeName(dirHandle, fileName);
    const fileHandle = await dirHandle.getFileHandle(finalName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { name: finalName, blob };
  }

  triggerDownload(fileName, blob);
  return { name: fileName, blob };
}

export function isDirectoryPickerSupported() {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}
