import * as XLSX from "xlsx";
import { convertMergedImagesToPdf, convertOneFileBlob, getExtension, toFriendlyError } from "./browserConvert.js";
import { decodeBytes, detectCsvDelimiter, parseAsciiDataText, parseCsvText } from "./browserAsciiParser.js";
import { isDirectoryPickerSupported, writeOutput } from "./browserOutputWriter.js";
import * as profileStore from "./browserProfileStore.js";

// 데스크톱(Electron)의 CONVERSION_CONFIG와 지원 확장자를 동일하게 맞춘 브라우저용 사본.
const CONVERSION_CONFIG = {
  "image-format": {
    label: "이미지 포맷 변환",
    inputExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    outputExtensions: [".jpg", ".png", ".webp"],
  },
  "images-to-pdf": {
    label: "이미지 → PDF",
    inputExtensions: [".jpg", ".jpeg", ".png"],
    outputExtensions: [".pdf"],
  },
  "excel-csv": {
    label: "엑셀 ↔ CSV",
    inputExtensions: [".xlsx", ".xls", ".csv"],
    outputExtensions: [".xlsx", ".csv"],
  },
  "ascii-data": {
    label: "실험 데이터(ASCII)",
    inputExtensions: [".txt", ".dat", ".asc", ".prn"],
    outputExtensions: [".csv", ".xlsx", ".json"],
  },
};

const cancelFlags = new Map();
const progressListeners = new Set();

function emitProgress(payload) {
  progressListeners.forEach((cb) => cb(payload));
}

function getBlobLike(ref) {
  return ref instanceof File ? ref : ref.blob;
}

function getRefName(ref) {
  return ref instanceof File ? ref.name : ref.name;
}

function getRelativeDir(file) {
  // 폴더째 드래그하거나 webkitdirectory로 선택한 경우에만 상대 경로 정보가 있음.
  const relPath = file.webkitRelativePath;
  if (!relPath) return "";
  const parts = relPath.split("/");
  parts.pop();
  return parts.join("/");
}

async function runConvertJob({ jobId, conversionType, items, outputTarget, options }) {
  cancelFlags.set(jobId, false);
  const results = [];

  try {
    if (conversionType === "images-to-pdf" && options.mergeIntoSinglePdf) {
      const files = items.map((item) => item.ref);
      const { blob, perFileResults } = await convertMergedImagesToPdf(files);
      const written = await writeOutput(outputTarget, "", "images_merged.pdf", blob);

      perFileResults.forEach((result, index) => {
        emitProgress({
          jobId,
          totalFiles: items.length,
          completedFiles: index + 1,
          currentFileName: result.file.name,
          currentFilePercent: 100,
        });
      });

      return items.map((item, index) => {
        const result = perFileResults[index];
        return {
          key: item.key,
          success: result.success,
          error: result.error,
          outputPaths: result.success ? [written] : [],
        };
      });
    }

    for (let i = 0; i < items.length; i += 1) {
      const { key, ref } = items[i];
      const fileName = ref.name;

      if (cancelFlags.get(jobId)) {
        results.push({ key, success: false, error: "사용자가 변환을 취소했어요.", cancelled: true });
        continue;
      }

      emitProgress({ jobId, totalFiles: items.length, completedFiles: i, currentFileName: fileName, currentFilePercent: 10 });

      try {
        emitProgress({ jobId, totalFiles: items.length, completedFiles: i, currentFileName: fileName, currentFilePercent: 60 });
        const converted = await convertOneFileBlob(conversionType, ref, options);
        const relativeDir = getRelativeDir(ref);
        const outputPaths = [];
        for (const { name, blob } of converted) {
          outputPaths.push(await writeOutput(outputTarget, relativeDir, name, blob));
        }
        results.push({ key, success: true, outputPaths });
      } catch (error) {
        results.push({ key, success: false, error: toFriendlyError(error) });
      }

      emitProgress({ jobId, totalFiles: items.length, completedFiles: i + 1, currentFileName: fileName, currentFilePercent: 100 });

      // 브라우저 메인 스레드에서 처리하므로, 파일 사이사이에 렌더링/진행률 업데이트가
      // 반영될 수 있도록 한 프레임 양보한다 (버벅임 완화).
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    return results;
  } finally {
    cancelFlags.delete(jobId);
  }
}

async function previewImage(ref) {
  const blobLike = getBlobLike(ref);
  return URL.createObjectURL(blobLike);
}

async function previewAscii(ref, options = {}) {
  const blobLike = getBlobLike(ref);
  const bytes = new Uint8Array(await blobLike.arrayBuffer());
  const text = decodeBytes(bytes, options.encoding);
  const { metadata, columns, rowCount } = parseAsciiDataText(text, options);
  const maxPoints = 500;
  const step = Math.max(1, Math.ceil(rowCount / maxPoints));
  const sampledColumns = columns.map((col) => col.filter((_, i) => i % step === 0));
  return { metadata, columns: sampledColumns, rowCount };
}

async function previewTable(ref, options = {}) {
  const blobLike = getBlobLike(ref);
  const name = getRefName(ref);
  const maxRows = 15;

  if (getExtension(name) === "csv") {
    const bytes = new Uint8Array(await blobLike.arrayBuffer());
    const text = decodeBytes(bytes, options.encoding);
    const delimiter = detectCsvDelimiter(text, options.delimiter);
    return parseCsvText(text, delimiter).slice(0, maxRows);
  }

  const buffer = await blobLike.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false }).slice(0, maxRows);
}

async function previewPdfBase64(ref) {
  const blobLike = getBlobLike(ref);
  const buffer = await blobLike.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function previewText(ref) {
  const blobLike = getBlobLike(ref);
  const bytes = new Uint8Array(await blobLike.arrayBuffer());
  return decodeBytes(bytes).slice(0, 2000);
}

export function createWebEngine() {
  return {
    kind: "web",
    hasFileDialog: false,
    supportsDirectoryPicker: isDirectoryPickerSupported(),

    getConfig: async () => CONVERSION_CONFIG,

    chooseOutputTarget: async () => {
      if (!isDirectoryPickerSupported()) {
        return { mode: "download", label: "다운로드 폴더" };
      }
      try {
        const directoryHandle = await window.showDirectoryPicker();
        return { mode: "directory", directoryHandle, label: directoryHandle.name };
      } catch {
        return null;
      }
    },

    checkDiskSpace: async () => ({ supported: false, freeBytes: null, sufficient: true }),

    convert: (payload) => runConvertJob(payload),

    cancel: async (jobId) => {
      cancelFlags.set(jobId, true);
      return true;
    },

    onProgress: (cb) => {
      progressListeners.add(cb);
      return () => progressListeners.delete(cb);
    },

    listProfiles: () => profileStore.listProfiles(),
    saveProfile: (profile) => profileStore.saveProfile(profile),
    deleteProfile: (profileId) => profileStore.deleteProfile(profileId),

    previewImage,
    previewAscii,
    previewTable,
    previewPdfBase64,
    previewText,
  };
}
