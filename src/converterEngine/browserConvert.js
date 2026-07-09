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

async function embedImageInPdf(pdfDoc, file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = getExtension(file.name);
  const image = ext === "png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
  const layout = fitImageToA4(image.width, image.height);
  const page = pdfDoc.addPage([layout.pageWidth, layout.pageHeight]);
  page.drawImage(image, { x: layout.x, y: layout.y, width: layout.drawWidth, height: layout.drawHeight });
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

async function convertCsvToExcelBlob(file, options = {}) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = decodeBytes(bytes, options.encoding);
  const delimiter = detectCsvDelimiter(text, options.delimiter);
  const rows = parseCsvText(text, delimiter);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const out = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

async function parseAsciiDataFromFile(file, options = {}) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = decodeBytes(bytes, options.encoding);
  return parseAsciiDataText(text, options);
}

// 한 번 파싱한 ASCII 데이터를 지정된 형식(csv/xlsx/json) 하나의 Blob으로 직렬화한다.
// 여러 형식을 동시에 뽑을 때 파일을 매번 다시 파싱하지 않도록 파싱과 직렬화를 분리했다.
function serializeAsciiData(parsed, targetFormat) {
  const { metadata, columns, rowCount } = parsed;
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
    const targetFormats = options.targetFormats?.length ? options.targetFormats : ["jpg"];
    const outputs = [];
    for (const targetFormat of targetFormats) {
      const blob = await convertImageFormatBlob(file, targetFormat, 0.9);
      outputs.push({ name: `${base}.${targetFormat}`, blob });
    }
    return outputs;
  }

  if (conversionType === "images-to-pdf") {
    const blob = await convertImageToPdfBlob(file);
    return [{ name: `${base}.pdf`, blob }];
  }

  if (conversionType === "excel-csv") {
    if (ext === "csv") {
      const blob = await convertCsvToExcelBlob(file, options);
      return [{ name: `${base}.xlsx`, blob }];
    }
    const sheets = await convertExcelToCsvBlobs(file);
    return sheets.map(({ suffix, blob }) => ({ name: `${base}${suffix}.csv`, blob }));
  }

  if (conversionType === "ascii-data") {
    const targetFormats = options.targetFormats?.length ? options.targetFormats : ["csv"];
    const parsed = await parseAsciiDataFromFile(file, options);
    return targetFormats.map((targetFormat) => ({
      name: `${base}.${targetFormat}`,
      blob: serializeAsciiData(parsed, targetFormat),
    }));
  }

  throw new Error(`알 수 없는 변환 유형: ${conversionType}`);
}

export { toFriendlyError, getExtension };
