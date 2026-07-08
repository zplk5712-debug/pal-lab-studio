import jschardet from "jschardet";

const NUMERIC_TOKEN = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/;
const DELIMITER_CANDIDATES = [
  { name: "tab", regex: /\t+/ },
  { name: "comma", regex: /\s*,\s*/ },
  { name: "semicolon", regex: /\s*;\s*/ },
  { name: "whitespace", regex: /\s+/ },
];

export class AsciiDataParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "AsciiDataParseError";
  }
}

function toBinaryString(bytes) {
  let result = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    result += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return result;
}

// 자동감지된 인코딩으로 바이트를 텍스트로 디코딩한다 (브라우저 내장 TextDecoder 사용, 실패하면 UTF-8 폴백).
export function decodeBytes(bytes) {
  let label = "utf-8";
  try {
    const detected = jschardet.detect(toBinaryString(bytes));
    if (detected && detected.encoding) {
      label = detected.encoding.toLowerCase();
    }
  } catch {
    label = "utf-8";
  }
  if (label === "ascii") label = "utf-8";

  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function splitDataLine(line, delimiterRegex) {
  return line
    .trim()
    .split(delimiterRegex)
    .map((token) => token.trim())
    .filter((token) => token !== "");
}

function countNumericTokens(tokens) {
  return tokens.filter((token) => NUMERIC_TOKEN.test(token)).length;
}

function detectDelimiter(lines) {
  let best = { name: "whitespace", regex: /\s+/, score: -1 };
  for (const candidate of DELIMITER_CANDIDATES) {
    let score = 0;
    for (const line of lines) {
      const tokens = splitDataLine(line, candidate.regex);
      if (tokens.length >= 2 && countNumericTokens(tokens) === tokens.length) {
        score += 1;
      }
    }
    if (score > best.score) {
      best = { ...candidate, score };
    }
  }
  return best;
}

function isLikelyDataLine(line, delimiterRegex) {
  const tokens = splitDataLine(line, delimiterRegex);
  return tokens.length >= 2 && countNumericTokens(tokens) === tokens.length;
}

function parseHeaderLine(line) {
  const match = line.match(/^([^:=]+)[:=](.+)$/);
  if (!match) return null;
  return { key: match[1].trim(), value: match[2].trim() };
}

// 실험 장비 ASCII 데이터 텍스트를 헤더 메타데이터 + XY 숫자 데이터 배열로 파싱한다.
export function parseAsciiDataText(text) {
  const allLines = text.split(/\r\n|\n|\r/).filter((line) => line.trim() !== "");
  if (allLines.length === 0) {
    throw new AsciiDataParseError("파일이 비어 있어요 — 내용이 있는 데이터 파일인지 확인해주세요.");
  }

  const sampleLines = allLines.slice(Math.max(0, allLines.length - Math.min(50, allLines.length)));
  const delimiter = detectDelimiter(sampleLines);
  const dataStartIndex = allLines.findIndex((line) => isLikelyDataLine(line, delimiter.regex));

  if (dataStartIndex === -1) {
    throw new AsciiDataParseError(
      "데이터 블록을 인식하지 못했어요 — 숫자로 된 X, Y 컬럼이 있는지, 구분자(탭/쉼표/공백)가 일정한지 확인해주세요.",
    );
  }

  const metadata = {};
  allLines.slice(0, dataStartIndex).forEach((line) => {
    const parsed = parseHeaderLine(line);
    if (parsed) metadata[parsed.key] = parsed.value;
  });

  const rows = [];
  for (let i = dataStartIndex; i < allLines.length; i += 1) {
    if (!isLikelyDataLine(allLines[i], delimiter.regex)) continue;
    rows.push(splitDataLine(allLines[i], delimiter.regex).map(Number));
  }

  if (rows.length === 0) {
    throw new AsciiDataParseError("숫자 데이터 행을 찾지 못했어요 — 파일 형식이 예상과 다른 것 같아요.");
  }

  const columnCount = rows[0].length;
  const columns = Array.from({ length: columnCount }, (_, columnIndex) => rows.map((row) => row[columnIndex]));

  return { metadata, columns, rowCount: rows.length };
}

export function detectCsvDelimiter(text) {
  const sampleLines = text.split(/\r\n|\n|\r/).filter((line) => line.trim() !== "").slice(0, 5);
  const candidates = [",", ";", "\t"];
  let best = { delimiter: ",", score: -1 };
  for (const delimiter of candidates) {
    const counts = sampleLines.map((line) => line.split(delimiter).length - 1);
    const allPresent = counts.every((count) => count > 0);
    const consistent = counts.every((count) => count === counts[0]);
    const score = allPresent && consistent ? counts[0] : -1;
    if (score > best.score) best = { delimiter, score };
  }
  return best.delimiter;
}

export function parseCsvText(text, delimiter) {
  return text
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim() !== "")
    .map((line) => line.split(delimiter).map((cell) => cell.trim()));
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}
