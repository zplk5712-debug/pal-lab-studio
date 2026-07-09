const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const XLSX = require("xlsx");
const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");

const { buildOutputPath, findCommonBaseDir, resolveCollisionFreePath } = require("./filename-utils.cjs");
const { parseAsciiDataFile, AsciiDataParseError, decodeBuffer } = require("./ascii-parser.cjs");
const profileStore = require("./profile-store.cjs");

// 변환 유형별 지원 입력 확장자 — 렌더러(UI)의 필터/미지원 파일 표시에도 그대로 사용됨.
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

function isCancelled(jobId) {
  return Boolean(jobId && cancelFlags.get(jobId));
}

// 기술적인 에러를 초보자가 이해하고 대처할 수 있는 문구로 바꿔준다.
function toFriendlyError(error) {
  if (error instanceof AsciiDataParseError) {
    return error.message;
  }
  if (!error) {
    return "알 수 없는 문제가 발생했어요.";
  }
  if (error.code === "ENOENT") {
    return "파일을 찾을 수 없어요 — 원본 파일이 이동되었거나 삭제된 것 같아요.";
  }
  if (error.code === "EACCES" || error.code === "EPERM") {
    return "파일에 접근할 권한이 없어요 — 다른 프로그램에서 파일을 열어두지 않았는지 확인해주세요.";
  }
  if (error.code === "ENOSPC") {
    return "저장 공간이 부족해요 — 디스크 여유 공간을 확인해주세요.";
  }
  return `변환 중 문제가 발생했어요: ${error.message || error}`;
}

async function checkDiskSpace(outputDir, estimatedBytes) {
  try {
    await fsp.mkdir(outputDir, { recursive: true });
    const stats = await fsp.statfs(outputDir);
    const freeBytes = stats.bavail * stats.bsize;
    return { supported: true, freeBytes, sufficient: freeBytes > estimatedBytes * 1.2 };
  } catch {
    return { supported: false, freeBytes: null, sufficient: true };
  }
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

const DELIMITER_NAME_TO_CHAR = { comma: ",", semicolon: ";", tab: "\t" };

// forcedDelimiterName을 지정하면("comma"/"semicolon"/"tab") 자동감지 없이 그 구분자를 바로 사용한다.
function detectCsvDelimiter(text, forcedDelimiterName) {
  if (forcedDelimiterName && forcedDelimiterName !== "auto" && DELIMITER_NAME_TO_CHAR[forcedDelimiterName]) {
    return DELIMITER_NAME_TO_CHAR[forcedDelimiterName];
  }

  const sampleLines = text.split(/\r\n|\n|\r/).filter((line) => line.trim() !== "").slice(0, 5);
  const candidates = [",", ";", "\t"];
  let best = { delimiter: ",", score: -1 };

  for (const delimiter of candidates) {
    const counts = sampleLines.map((line) => line.split(delimiter).length - 1);
    const allPresent = counts.every((count) => count > 0);
    const consistent = counts.every((count) => count === counts[0]);
    const score = allPresent && consistent ? counts[0] : -1;
    if (score > best.score) {
      best = { delimiter, score };
    }
  }

  return best.delimiter;
}

// RFC4180 스타일 따옴표 필드("...")를 인식하는 CSV 파서 — 따옴표 안의 구분자/줄바꿈을 필드 값으로 취급한다.
function parseCsvText(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // \n에서 줄바꿈 처리하므로 무시
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

// --- 변환 유형별 실제 처리 ---------------------------------------------

async function convertImageFormat(inputPath, outputPath, options) {
  const targetExt = path.extname(outputPath).slice(1).toLowerCase();
  const format = targetExt === "jpg" ? "jpeg" : targetExt;
  let pipeline = sharp(inputPath);

  if (format === "jpeg") {
    pipeline = pipeline.flatten({ background: "#ffffff" });
  }

  await pipeline.toFormat(format, { quality: options.quality ?? 90 }).toFile(outputPath);
}

// 이미지 픽셀 수를 그대로 PDF 포인트로 쓰면 큰 사진이 비정상적으로 큰 페이지가 되므로,
// A4 안에 비율을 유지한 채 맞춰 넣는다 (가로가 더 길면 가로 A4 사용).
const A4_PORTRAIT = [595.28, 841.89];

function fitImageToA4(imageWidth, imageHeight) {
  const isLandscape = imageWidth > imageHeight;
  const [pageWidth, pageHeight] = isLandscape ? [A4_PORTRAIT[1], A4_PORTRAIT[0]] : A4_PORTRAIT;
  const scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  return {
    pageWidth,
    pageHeight,
    drawWidth,
    drawHeight,
    x: (pageWidth - drawWidth) / 2,
    y: (pageHeight - drawHeight) / 2,
  };
}

async function embedImageAsFittedPage(pdfDoc, inputPath) {
  const bytes = await fsp.readFile(inputPath);
  const ext = path.extname(inputPath).toLowerCase();
  const image = ext === ".png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
  const layout = fitImageToA4(image.width, image.height);
  const page = pdfDoc.addPage([layout.pageWidth, layout.pageHeight]);
  page.drawImage(image, { x: layout.x, y: layout.y, width: layout.drawWidth, height: layout.drawHeight });
}

async function convertSingleImageToPdf(inputPath, outputPath) {
  const pdfDoc = await PDFDocument.create();
  await embedImageAsFittedPage(pdfDoc, inputPath);
  const pdfBytes = await pdfDoc.save();
  await fsp.writeFile(outputPath, pdfBytes);
}

async function convertExcelToCsv(inputPath, commonBaseDir, outputRootDir) {
  const workbook = XLSX.readFile(inputPath);
  const outputPaths = [];

  for (const sheetName of workbook.SheetNames) {
    const csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
    const outputPath = buildOutputPath({
      inputPath,
      commonBaseDir,
      outputRootDir,
      newExtension: ".csv",
      suffix: `_${sheetName}`,
    });
    await fsp.writeFile(outputPath, csvContent, "utf8");
    outputPaths.push(outputPath);
  }

  return outputPaths;
}

async function convertCsvToExcel(inputPath, outputPath, options = {}) {
  const buffer = await fsp.readFile(inputPath);
  const text = decodeBuffer(buffer, options.encoding);
  const delimiter = detectCsvDelimiter(text, options.delimiter);
  const rows = parseCsvText(text, delimiter);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, outputPath);
}

// 한 번 파싱한 ASCII 데이터를 지정된 형식(csv/xlsx/json) 하나로 직렬화해 저장한다.
// 여러 형식을 동시에 뽑을 때 파일을 매번 다시 파싱하지 않도록 파싱과 직렬화를 분리했다.
async function writeAsciiData(parsed, outputPath, targetFormat) {
  const { metadata, columns, rowCount } = parsed;
  const columnLabels = columns.map((_, index) => `col${index + 1}`);
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => columns.map((col) => col[rowIndex]));

  if (targetFormat === "json") {
    const payload = { metadata, columns: columnLabels, rows };
    await fsp.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    return;
  }

  if (targetFormat === "xlsx") {
    const metadataRows = Object.entries(metadata).map(([key, value]) => [key, value]);
    const sheetRows = [...metadataRows, [], columnLabels, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, outputPath);
    return;
  }

  const metadataLines = Object.entries(metadata).map(([key, value]) => `# ${key}: ${value}`);
  const csvBody = rowsToCsv([columnLabels, ...rows]);
  const content = [...metadataLines, csvBody].filter(Boolean).join("\n");
  await fsp.writeFile(outputPath, content, "utf8");
}

// --- 배치 실행 ----------------------------------------------------------

async function convertOneFile({ conversionType, inputPath, commonBaseDir, outputRootDir, options }) {
  const ext = path.extname(inputPath).toLowerCase();

  if (conversionType === "image-format") {
    const targetFormats = options.targetFormats?.length ? options.targetFormats : ["jpg"];
    const outputPaths = [];
    for (const targetFormat of targetFormats) {
      const outputPath = buildOutputPath({
        inputPath,
        commonBaseDir,
        outputRootDir,
        newExtension: `.${targetFormat}`,
      });
      await convertImageFormat(inputPath, outputPath, options);
      outputPaths.push(outputPath);
    }
    return outputPaths;
  }

  if (conversionType === "images-to-pdf") {
    const outputPath = buildOutputPath({ inputPath, commonBaseDir, outputRootDir, newExtension: ".pdf" });
    await convertSingleImageToPdf(inputPath, outputPath);
    return [outputPath];
  }

  if (conversionType === "excel-csv") {
    if (ext === ".csv") {
      const outputPath = buildOutputPath({ inputPath, commonBaseDir, outputRootDir, newExtension: ".xlsx" });
      await convertCsvToExcel(inputPath, outputPath, options);
      return [outputPath];
    }
    return convertExcelToCsv(inputPath, commonBaseDir, outputRootDir);
  }

  if (conversionType === "ascii-data") {
    const targetFormats = options.targetFormats?.length ? options.targetFormats : ["csv"];
    const parsed = await parseAsciiDataFile(inputPath, options);
    const outputPaths = [];
    for (const targetFormat of targetFormats) {
      const outputPath = buildOutputPath({
        inputPath,
        commonBaseDir,
        outputRootDir,
        newExtension: `.${targetFormat}`,
      });
      await writeAsciiData(parsed, outputPath, targetFormat);
      outputPaths.push(outputPath);
    }
    return outputPaths;
  }

  throw new Error(`알 수 없는 변환 유형: ${conversionType}`);
}

// 병합 모드(images-to-pdf 전용): 선택된 이미지들을 파일명 오름차순으로 한 PDF에 합친다.
async function convertMergedImagesToPdf(filePaths, outputRootDir, onFileProgress) {
  const sortedPaths = [...filePaths].sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
  const pdfDoc = await PDFDocument.create();
  const results = [];

  for (let i = 0; i < sortedPaths.length; i += 1) {
    const inputPath = sortedPaths[i];
    try {
      await embedImageAsFittedPage(pdfDoc, inputPath);
      results.push({ file: inputPath, success: true });
    } catch (error) {
      results.push({ file: inputPath, success: false, error: toFriendlyError(error) });
    }
    onFileProgress(i, sortedPaths.length, path.basename(inputPath));
  }

  const desiredPath = path.join(outputRootDir, "images_merged.pdf");
  await fsp.mkdir(outputRootDir, { recursive: true });
  const outputPath = resolveCollisionFreePath(desiredPath);
  const pdfBytes = await pdfDoc.save();
  await fsp.writeFile(outputPath, pdfBytes);

  return results.map((result) => ({ ...result, outputPaths: result.success ? [outputPath] : [] }));
}

async function runConversionJob({ event, jobId, conversionType, files, outputDir, options }) {
  cancelFlags.set(jobId, false);
  const results = [];

  try {
    if (conversionType === "images-to-pdf" && options.mergeIntoSinglePdf) {
      const mergedResults = await convertMergedImagesToPdf(files, outputDir, (index, total, fileName) => {
        event.sender.send("converter:progress", {
          jobId,
          totalFiles: total,
          completedFiles: index,
          currentFileName: fileName,
          currentFilePercent: 50,
        });
      });
      cancelFlags.delete(jobId);
      return mergedResults;
    }

    const commonBaseDir = findCommonBaseDir(files);

    for (let i = 0; i < files.length; i += 1) {
      const inputPath = files[i];
      const fileName = path.basename(inputPath);

      if (isCancelled(jobId)) {
        results.push({ file: inputPath, success: false, error: "사용자가 변환을 취소했어요.", cancelled: true });
        continue;
      }

      event.sender.send("converter:progress", {
        jobId,
        totalFiles: files.length,
        completedFiles: i,
        currentFileName: fileName,
        currentFilePercent: 10,
      });

      try {
        event.sender.send("converter:progress", {
          jobId,
          totalFiles: files.length,
          completedFiles: i,
          currentFileName: fileName,
          currentFilePercent: 60,
        });

        const outputPaths = await convertOneFile({
          conversionType,
          inputPath,
          commonBaseDir,
          outputRootDir: outputDir,
          options,
        });

        results.push({ file: inputPath, success: true, outputPaths });
      } catch (error) {
        results.push({ file: inputPath, success: false, error: toFriendlyError(error) });
      }

      event.sender.send("converter:progress", {
        jobId,
        totalFiles: files.length,
        completedFiles: i + 1,
        currentFileName: fileName,
        currentFilePercent: 100,
      });
    }

    return results;
  } finally {
    cancelFlags.delete(jobId);
  }
}

function registerConverterIpc(ipcMain, { app, dialog }) {
  ipcMain.handle("converter:get-config", () => CONVERSION_CONFIG);

  ipcMain.handle("converter:choose-files", async (_event, conversionType) => {
    const config = CONVERSION_CONFIG[conversionType];
    const result = await dialog.showOpenDialog({
      title: "변환할 파일 선택",
      properties: ["openFile", "multiSelections"],
      filters: config
        ? [{ name: config.label, extensions: config.inputExtensions.map((e) => e.slice(1)) }]
        : undefined,
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  ipcMain.handle("converter:choose-output-folder", async () => {
    const result = await dialog.showOpenDialog({
      title: "출력 폴더 선택",
      properties: ["openDirectory", "createDirectory"],
      buttonLabel: "여기에 저장",
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("converter:check-disk-space", async (_event, { outputDir, files }) => {
    let estimatedBytes = 0;
    for (const filePath of files) {
      try {
        const stat = await fsp.stat(filePath);
        estimatedBytes += stat.size;
      } catch {
        // 무시하고 다음 파일 계속
      }
    }
    return checkDiskSpace(outputDir, estimatedBytes);
  });

  ipcMain.handle("converter:convert", async (event, payload) => {
    const jobId = payload.jobId || crypto.randomUUID();
    return runConversionJob({ event, jobId, ...payload });
  });

  ipcMain.handle("converter:cancel", async (_event, jobId) => {
    cancelFlags.set(jobId, true);
    return true;
  });

  ipcMain.handle("converter:list-profiles", async () => {
    return profileStore.readProfiles(app.getPath("userData"));
  });

  ipcMain.handle("converter:save-profile", async (_event, { name, conversionType, options }) => {
    return profileStore.saveProfile(app.getPath("userData"), { name, conversionType, options });
  });

  ipcMain.handle("converter:delete-profile", async (_event, profileId) => {
    return profileStore.deleteProfile(app.getPath("userData"), profileId);
  });

  // --- 미리보기 (좌: 원본 / 우: 결과, 현재 선택된 1개 파일만) ---------------

  ipcMain.handle("converter:preview-image", async (_event, filePath) => {
    const buffer = await sharp(filePath).resize(480, 480, { fit: "inside" }).png().toBuffer();
    return `data:image/png;base64,${buffer.toString("base64")}`;
  });

  ipcMain.handle("converter:preview-ascii", async (_event, filePath, options = {}) => {
    const { metadata, columns, rowCount } = await parseAsciiDataFile(filePath, options);
    const maxPoints = 500;
    const step = Math.max(1, Math.ceil(rowCount / maxPoints));
    const sampledColumns = columns.map((col) => col.filter((_, i) => i % step === 0));
    return { metadata, columns: sampledColumns, rowCount };
  });

  ipcMain.handle("converter:preview-table", async (_event, filePath, options = {}) => {
    const ext = path.extname(filePath).toLowerCase();
    const maxRows = 15;

    if (ext === ".csv") {
      const buffer = await fsp.readFile(filePath);
      const text = decodeBuffer(buffer, options.encoding);
      const delimiter = detectCsvDelimiter(text, options.delimiter);
      return parseCsvText(text, delimiter).slice(0, maxRows);
    }

    const workbook = XLSX.readFile(filePath);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false }).slice(0, maxRows);
  });

  ipcMain.handle("converter:preview-pdf-base64", async (_event, filePath) => {
    const buffer = await fsp.readFile(filePath);
    return buffer.toString("base64");
  });

  ipcMain.handle("converter:preview-text", async (_event, filePath) => {
    const buffer = await fsp.readFile(filePath);
    const text = decodeBuffer(buffer);
    return text.slice(0, 2000);
  });
}

module.exports = { registerConverterIpc, CONVERSION_CONFIG };
