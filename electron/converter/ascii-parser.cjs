const fs = require("node:fs/promises");
const jschardet = require("jschardet");
const iconv = require("iconv-lite");

const NUMERIC_TOKEN = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/;
const DELIMITER_CANDIDATES = [
  { name: "tab", regex: /\t+/ },
  { name: "comma", regex: /\s*,\s*/ },
  { name: "semicolon", regex: /\s*;\s*/ },
  { name: "whitespace", regex: /\s+/ },
];

// 자동감지된 인코딩으로 버퍼를 텍스트로 디코딩한다. 실패하면 UTF-8로 폴백.
function decodeBuffer(buffer) {
  const detected = jschardet.detect(buffer);
  const encoding = (detected && detected.encoding) || "UTF-8";

  try {
    if (/^utf-?8$/i.test(encoding) || /^ascii$/i.test(encoding)) {
      return buffer.toString("utf8");
    }
    if (iconv.encodingExists(encoding)) {
      return iconv.decode(buffer, encoding);
    }
  } catch {
    // 아래 UTF-8 폴백으로 진행
  }

  return buffer.toString("utf8");
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

// 주어진 라인들 중 어떤 구분자가 숫자 데이터 라인을 가장 잘 인식하는지 찾는다.
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
  if (!match) {
    return null;
  }
  return { key: match[1].trim(), value: match[2].trim() };
}

class AsciiDataParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "AsciiDataParseError";
  }
}

// 실험 장비 ASCII 데이터 파일(txt/dat/asc/prn)을 헤더 메타데이터 + XY 숫자 데이터 배열로 파싱한다.
async function parseAsciiDataFile(filePath) {
  const buffer = await fs.readFile(filePath);
  const text = decodeBuffer(buffer);
  const allLines = text.split(/\r\n|\n|\r/).filter((line) => line.trim() !== "");

  if (allLines.length === 0) {
    throw new AsciiDataParseError("파일이 비어 있어요 — 내용이 있는 데이터 파일인지 확인해주세요.");
  }

  // 뒤쪽 일부 라인을 표본으로 구분자를 판정 (헤더에 숫자가 섞여도 영향 최소화)
  const sampleLines = allLines.slice(Math.max(0, allLines.length - Math.min(50, allLines.length)));
  const delimiter = detectDelimiter(sampleLines);

  let dataStartIndex = allLines.findIndex((line) => isLikelyDataLine(line, delimiter.regex));

  if (dataStartIndex === -1) {
    throw new AsciiDataParseError(
      "데이터 블록을 인식하지 못했어요 — 숫자로 된 X, Y 컬럼이 있는지, 구분자(탭/쉼표/공백)가 일정한지 확인해주세요.",
    );
  }

  const headerLines = allLines.slice(0, dataStartIndex);
  const metadata = {};
  headerLines.forEach((line) => {
    const parsed = parseHeaderLine(line);
    if (parsed) {
      metadata[parsed.key] = parsed.value;
    }
  });

  const rows = [];
  for (let i = dataStartIndex; i < allLines.length; i += 1) {
    const line = allLines[i];
    if (!isLikelyDataLine(line, delimiter.regex)) {
      continue;
    }
    rows.push(splitDataLine(line, delimiter.regex).map(Number));
  }

  if (rows.length === 0) {
    throw new AsciiDataParseError(
      "숫자 데이터 행을 찾지 못했어요 — 파일 형식이 예상과 다른 것 같아요.",
    );
  }

  const columnCount = rows[0].length;
  const columns = Array.from({ length: columnCount }, (_, columnIndex) =>
    rows.map((row) => row[columnIndex]),
  );

  return { metadata, columns, rowCount: rows.length, delimiter: delimiter.name };
}

module.exports = { parseAsciiDataFile, AsciiDataParseError, decodeBuffer, detectDelimiter, splitDataLine };
