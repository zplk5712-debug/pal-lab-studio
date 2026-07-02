import { useEffect, useMemo, useState } from "react";
import {
  ENCODER_SAMPLE_ROW,
  LM_GUIDE_SAMPLE_ROW,
  PRODUCT_DB_CONFIG,
  PRODUCT_DB_TABS,
} from "./data/productDbSchemas";

const SAMPLE_ROWS = {
  lmGuide: LM_GUIDE_SAMPLE_ROW,
  encoder: ENCODER_SAMPLE_ROW,
};

function stringifyDisplayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function normalizeCellValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function convertNumericValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value === "catalog_check_required") {
    return value;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : Number.NaN;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsvText(text) {
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = cells[index] ?? "";
      return row;
    }, {});
  });
}

function sanitizeRows(rawRows, config) {
  return rawRows.map((rawRow, index) => {
    const sanitized = { __rowNumber: index + 1 };

    config.fields.forEach((field) => {
      const normalized = normalizeCellValue(rawRow[field]);
      sanitized[field] = config.numericFields.includes(field) ? convertNumericValue(normalized) : normalized;
    });

    return sanitized;
  });
}

function validateRows(rows, config, existingItems) {
  const issues = [];
  const existingIds = new Set(existingItems.map((item) => item.id));
  const uploadedIds = new Set();

  rows.forEach((row) => {
    config.requiredFields.forEach((field) => {
      if (row[field] === null || row[field] === undefined || row[field] === "") {
        issues.push({
          rowNumber: row.__rowNumber,
          field,
          type: "required",
          message: `${row.__rowNumber}행: ${field} 필드는 필수입니다.`,
        });
      }
    });

    config.numericFields.forEach((field) => {
      if (Number.isNaN(row[field])) {
        issues.push({
          rowNumber: row.__rowNumber,
          field,
          type: "numeric",
          message: `${row.__rowNumber}행: ${field} 값은 숫자 또는 null이어야 합니다.`,
        });
      }
    });

    if (row.id) {
      if (existingIds.has(row.id)) {
        issues.push({
          rowNumber: row.__rowNumber,
          field: "id",
          type: "duplicate-existing",
          message: `${row.__rowNumber}행: id "${row.id}" 는 기존 데이터와 중복됩니다.`,
        });
      }

      if (uploadedIds.has(row.id)) {
        issues.push({
          rowNumber: row.__rowNumber,
          field: "id",
          type: "duplicate-upload",
          message: `${row.__rowNumber}행: id "${row.id}" 가 업로드 파일 내부에서 중복됩니다.`,
        });
      }

      uploadedIds.add(row.id);
    }
  });

  return issues;
}

function compactRows(rows) {
  return rows.map((row) => {
    const sanitized = {};

    Object.entries(row).forEach(([key, value]) => {
      if (key === "__rowNumber") {
        return;
      }

      sanitized[key] = Number.isNaN(value) ? null : value;
    });

    return sanitized;
  });
}

function buildCsvTemplate(sampleRow) {
  const headers = Object.keys(sampleRow);
  const values = headers.map((header) => {
    const rawValue = sampleRow[header];
    if (rawValue === null || rawValue === undefined) {
      return "";
    }

    const textValue = String(rawValue).replace(/"/g, '""');
    return `"${textValue}"`;
  });

  return `${headers.join(",")}\n${values.join(",")}\n`;
}

function downloadBlob(fileName, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

function getKeySpecSummary(item, config) {
  return config.keySpecs
    .map((field) => `${field}: ${stringifyDisplayValue(item[field])}`)
    .join(" / ");
}

function getDatabaseByTab(tabId, lmGuideItems, encoderItems) {
  return tabId === "lmGuide" ? lmGuideItems : encoderItems;
}

export default function ProductDatabaseManager({
  onBack,
  lmGuideItems,
  encoderItems,
  onUpdateLmGuideItems,
  onUpdateEncoderItems,
}) {
  const [activeTab, setActiveTab] = useState("lmGuide");
  const [manufacturerFilter, setManufacturerFilter] = useState("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [uploadState, setUploadState] = useState(null);
  const [hasSelectedManually, setHasSelectedManually] = useState(false);

  const config = PRODUCT_DB_CONFIG[activeTab];
  const items = getDatabaseByTab(activeTab, lmGuideItems, encoderItems);

  const filteredItems = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return items.filter((item) => {
      const matchesManufacturer = manufacturerFilter === "all" || item.manufacturer === manufacturerFilter;
      const matchesSearch =
        keyword === "" ||
        String(item.series ?? "").toLowerCase().includes(keyword) ||
        String(item.model ?? "").toLowerCase().includes(keyword);

      return matchesManufacturer && matchesSearch;
    });
  }, [items, manufacturerFilter, searchKeyword]);

  const selectedItem = useMemo(() => {
    return filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;
  }, [filteredItems, selectedId]);

  useEffect(() => {
    if (!filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0]?.id ?? "");
    }
  }, [filteredItems, selectedId]);

  useEffect(() => {
    setManufacturerFilter("all");
    setSearchKeyword("");
    setSelectedId("");
    setUploadState(null);
  }, [activeTab]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    try {
      const text = await file.text();
      let rawRows = [];

      if (extension === "json") {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          rawRows = parsed;
        } else if (Array.isArray(parsed.items)) {
          rawRows = parsed.items;
        } else {
          throw new Error("JSON은 배열 또는 { items: [] } 구조여야 합니다.");
        }
      } else if (extension === "csv") {
        rawRows = parseCsvText(text);
      } else {
        throw new Error("지원 형식은 JSON 또는 CSV 입니다.");
      }

      const sanitizedRows = sanitizeRows(rawRows, config);
      const issues = validateRows(sanitizedRows, config, items);

      setUploadState({
        fileName: file.name,
        fileType: extension,
        rows: compactRows(sanitizedRows),
        previewRows: sanitizedRows.slice(0, 5),
        issues,
      });
    } catch (error) {
      setUploadState({
        fileName: file.name,
        fileType: extension ?? "unknown",
        rows: [],
        previewRows: [],
        issues: [
          {
            rowNumber: 0,
            field: "file",
            type: "parse",
            message: error instanceof Error ? error.message : "파일 파싱 중 오류가 발생했습니다.",
          },
        ],
      });
    } finally {
      event.target.value = "";
    }
  }

  function handleConfirmUpload() {
    if (!uploadState || uploadState.issues.length > 0 || uploadState.rows.length === 0) {
      return;
    }

    if (activeTab === "lmGuide") {
      onUpdateLmGuideItems((current) => [...current, ...uploadState.rows]);
    } else {
      onUpdateEncoderItems((current) => [...current, ...uploadState.rows]);
    }

    setUploadState(null);
  }

  function handleDownloadSample(type) {
    const sampleRow = SAMPLE_ROWS[activeTab];
    const baseName = PRODUCT_DB_CONFIG[activeTab].sampleFileName;

    if (type === "json") {
      downloadBlob(`${baseName}.json`, "application/json", JSON.stringify([sampleRow], null, 2));
      return;
    }

    downloadBlob(`${baseName}.csv`, "text/csv;charset=utf-8", buildCsvTemplate(sampleRow));
  }

  return (
    <div className="app app--db">
      <header className="app-header app-header--db">
        <div>
          <p className="page-kicker">PRODUCT DB MANAGER</p>
          <h1>제품 DB 관리</h1>
          <p>LM가이드와 엔코더 카탈로그 데이터를 업로드하고, 검색하고, 추후 추천엔진과 연결할 수 있게 준비합니다.</p>
        </div>
        <button type="button" className="ghost-button" onClick={onBack}>
          대문으로 돌아가기
        </button>
      </header>

      <div className="db-tab-row">
        {PRODUCT_DB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`db-tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className="db-grid">
        <section className="card db-sidebar-card">
          <h2>{config.title} 필터</h2>
          <div className="field">
            <span>제조사</span>
            <select value={manufacturerFilter} onChange={(event) => setManufacturerFilter(event.target.value)}>
              <option value="all">전체 제조사</option>
              {config.manufacturers.map((manufacturer) => (
                <option key={manufacturer} value={manufacturer}>
                  {manufacturer}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span>시리즈/모델 검색</span>
            <input
              type="text"
              value={searchKeyword}
              placeholder={config.searchPlaceholder}
              onChange={(event) => setSearchKeyword(event.target.value)}
            />
          </div>

          <div className="db-sidebar-summary">
            <strong>{filteredItems.length}개 항목</strong>
            <p>필터 결과 기준입니다. 선택한 항목 상세는 오른쪽에서 확인할 수 있습니다.</p>
          </div>

          <div className="db-download-row">
            <button type="button" className="ghost-button" onClick={() => handleDownloadSample("json")}>
              JSON 샘플 다운로드
            </button>
            <button type="button" className="ghost-button" onClick={() => handleDownloadSample("csv")}>
              CSV 샘플 다운로드
            </button>
          </div>
        </section>

        <section className="card db-list-card">
          <div className="card-section-header">
            <div>
              <h2>{config.title} 목록</h2>
              <p>제조사, 모델명, 시리즈, 주요 사양, 카탈로그 링크를 빠르게 확인할 수 있습니다.</p>
            </div>
          </div>

          <div className="db-list">
            {filteredItems.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`db-list-item${selectedItem?.id === item.id ? " is-selected" : ""}`}
                onClick={() => { setSelectedId(item.id); setHasSelectedManually(true); }}
              >
                <div className="db-list-item__head">
                  <strong>{item.model}</strong>
                  <span>{item.manufacturer}</span>
                </div>
                <p>{item.series}</p>
                <small>{getKeySpecSummary(item, config)}</small>
              </button>
            ))}

            {filteredItems.length === 0 ? (
              <div className="empty-box">
                <p>현재 조건에 맞는 등록 항목이 없습니다. 제조사 필터 또는 검색어를 조정해 주세요.</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="card db-detail-card">
          <div className="card-section-header">
            <div>
              <h2>{config.detailTitle}</h2>
              <p>선택된 항목의 전체 필드를 확인합니다. 불확실한 값은 `catalog_check_required` 또는 `-` 로 표시됩니다.</p>
            </div>
          </div>

          {hasSelectedManually && selectedItem ? (
            <div className="db-detail">
              <div className="db-detail-hero">
                <div>
                  <span className="summary-caption summary-caption--section">{selectedItem.manufacturer}</span>
                  <strong>{selectedItem.model}</strong>
                  <p>{selectedItem.series}</p>
                </div>
                {selectedItem.catalogUrl ? (
                  <a href={selectedItem.catalogUrl} target="_blank" rel="noreferrer" className="ghost-button db-link-button">
                    카탈로그 열기
                  </a>
                ) : null}
              </div>

              <div className="db-detail-grid">
                {config.fields.map((field) => (
                  <div className="db-detail-row" key={field}>
                    <span>{field}</span>
                    <strong>{stringifyDisplayValue(selectedItem[field])}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-box empty-box--guide">
              <h3>제품 DB 관리 사용법</h3>
              <ul>
                <li><strong>1. 필터·검색</strong> — 왼쪽에서 제조사를 고르거나 모델명으로 검색합니다.</li>
                <li><strong>2. 항목 선택</strong> — 목록에서 항목을 클릭하면 여기에 전체 상세가 표시됩니다.</li>
                <li><strong>3. 업로드</strong> — JSON/CSV 파일을 올려 새 항목을 검사 후 추가합니다.</li>
              </ul>
            </div>
          )}
        </section>

        <section className="card db-upload-card">
          <div className="card-section-header">
            <div>
              <h2>{config.title} 업로드</h2>
              <p>JSON 또는 CSV 파일을 올리면 미리보기, 필수 필드 검사, 숫자 유효성 검사, 중복 id 검사를 먼저 수행합니다.</p>
            </div>
          </div>

          <label className="file-picker">
            <span className="file-picker__button">파일 선택</span>
            <span className="file-picker__name">{uploadState?.fileName ?? "선택된 파일 없음"}</span>
            <input type="file" accept=".json,.csv" onChange={handleFileChange} />
          </label>

          {uploadState ? (
            <div className="db-upload-preview">
              <div className="db-upload-preview__meta">
                <div className="db-upload-preview__stat">
                  <span>형식</span>
                  <strong>{uploadState.fileType?.toUpperCase()}</strong>
                </div>
                <div className="db-upload-preview__stat">
                  <span>미리보기 행</span>
                  <strong>{uploadState.previewRows.length}</strong>
                </div>
                <div className="db-upload-preview__stat">
                  <span>검사 이슈</span>
                  <strong>{uploadState.issues.length}</strong>
                </div>
              </div>

              <div className="db-upload-table">
                <table>
                  <thead>
                    <tr>
                      {config.fields.slice(0, 6).map((field) => (
                        <th key={field}>{field}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uploadState.previewRows.map((row) => (
                      <tr key={`preview-${row.__rowNumber}`}>
                        {config.fields.slice(0, 6).map((field) => (
                          <td key={field}>{stringifyDisplayValue(row[field])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {uploadState.issues.length > 0 ? (
                <div className="note-box note-box--status">
                  <h3>업로드 검사 결과</h3>
                  <ul>
                    {uploadState.issues.map((issue) => (
                      <li key={`${issue.type}-${issue.rowNumber}-${issue.field}`}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="note-box">
                  <h3>업로드 준비 완료</h3>
                  <p>필수 필드와 숫자 필드 검사를 모두 통과했습니다. 확정하면 현재 DB 뒤에 항목이 추가됩니다.</p>
                </div>
              )}

              <div className="load-button-row">
                <button
                  type="button"
                  className="button"
                  disabled={uploadState.issues.length > 0 || uploadState.rows.length === 0}
                  onClick={handleConfirmUpload}
                >
                  업로드 확정
                </button>
                <button type="button" className="ghost-button" onClick={() => setUploadState(null)}>
                  업로드 취소
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-box">
              <p>샘플 양식을 내려받은 뒤 JSON 또는 CSV 파일을 업로드해 주세요.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
