import * as XLSX from "xlsx";
import { PDFDocument } from "pdf-lib";
import {
  AsciiDataParseError,
  decodeBytes,
  detectCsvDelimiter,
  parseAsciiDataText,
  parseCsvText,
  rowsToCsv,
} from "./browserAsciiParser.js";

function toFriendlyError(error) {
  if (error instanceof AsciiDataParseError) return error.message;
  return `변환 중 문제가 발생했어요: ${error?.message || error}`;
}

function getExtension(name) {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex === -1 ? "" : name.slice(dotIndex + 1).toLowerCase();
}

function getBaseName(name) {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex === -1 ? name : name.slice(0, dotIndex);
}

async function convertImageFormatBlob(file, targetFormat, quality = 0.9) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");

  if (targetFormat === "jpg" || targetFormat === "jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);

  const mime = targetFormat === "jpg" ? "image/jpeg" : `image/${targetFormat}`;
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("이미지 변환에 실패했어요."))), mime, quality);
  });
}

async function embedImageInPdf(pdfDoc, file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = getExtension(file.name);
  const image = ext === "png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
}

async function convertImageToPdfBlob(file) {
  const pdfDoc = await PDFDocument.create();
  await embedImageInPdf(pdfDoc, file);
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

// 병합 모드: 파일명 오름차순으로 한 PDF에 합친다.
export async function convertMergedImagesToPdf(files) {
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
  const pdfDoc = await PDFDocument.create();
  const perFileResults = [];

  for (const file of sorted) {
    try {
      await embedImageInPdf(pdfDoc, file);
      perFileResults.push({ file, success: true });
    } catch (error) {
      perFileResults.push({ file, success: false, error: toFriendlyError(error) });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return { blob: new Blob([pdfBytes], { type: "application/pdf" }), perFileResults };
}

async function convertExcelToCsvBlobs(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  return workbook.SheetNames.map((sheetName) => ({
    suffix: `_${sheetName}`,
    blob: new Blob([XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])], { type: "text/csv" }),
  }));
}

async function convertCsvToExcelBlob(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = decodeBytes(bytes);
  const delimiter = detectCsvDelimiter(text);
  const rows = parseCsvText(text, delimiter);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const out = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

async function convertAsciiDataBlob(file, targetFormat) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = decodeBytes(bytes);
  const { metadata, columns, rowCount } = parseAsciiDataText(text);
  const columnLabels = columns.map((_, index) => `col${index + 1}`);
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => columns.map((col) => col[rowIndex]));

  if (targetFormat === "json") {
    const payload = { metadata, columns: columnLabels, rows };
    return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  }

  if (targetFormat === "xlsx") {
    const metadataRows = Object.entries(metadata).map(([key, value]) => [key, value]);
    const sheetRows = [...metadataRows, [], columnLabels, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    const out = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  const metadataLines = Object.entries(metadata).map(([key, value]) => `# ${key}: ${value}`);
  const csvBody = rowsToCsv([columnLabels, ...rows]);
  const content = [...metadataLines, csvBody].filter(Boolean).join("\n");
  return new Blob([content], { type: "text/csv" });
}

// 파일 하나를 변환해서 [{ name, blob }] 형태로 반환한다 (엑셀 다중 시트는 여러 개가 나올 수 있음).
export async function convertOneFileBlob(conversionType, file, options) {
  const ext = getExtension(file.name);
  const base = getBaseName(file.name);

  if (conversionType === "image-format") {
    const blob = await convertImageFormatBlob(file, options.targetFormat, 0.9);
    return [{ name: `${base}.${options.targetFormat}`, blob }];
  }

  if (conversionType === "images-to-pdf") {
    const blob = await convertImageToPdfBlob(file);
    return [{ name: `${base}.pdf`, blob }];
  }

  if (conversionType === "excel-csv") {
    if (ext === "csv") {
      const blob = await convertCsvToExcelBlob(file);
      return [{ name: `${base}.xlsx`, blob }];
    }
    const sheets = await convertExcelToCsvBlobs(file);
    return sheets.map(({ suffix, blob }) => ({ name: `${base}${suffix}.csv`, blob }));
  }

  if (conversionType === "ascii-data") {
    const targetFormat = options.targetFormat || "csv";
    const blob = await convertAsciiDataBlob(file, targetFormat);
    return [{ name: `${base}.${targetFormat}`, blob }];
  }

  throw new Error(`알 수 없는 변환 유형: ${conversionType}`);
}

export { toFriendlyError, getExtension };
