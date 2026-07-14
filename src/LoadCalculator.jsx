import { useEffect, useMemo, useState } from "react";
import {
  LOAD_INPUT_MODE_OPTIONS,
  MANUAL_LOAD_INPUT_OPTIONS,
  MATERIAL_GROUP_OPTIONS,
  MAX_MODEL_FILE_SIZE_BYTES,
  MAX_MODEL_FILE_SIZE_MB,
  MIXED_MATERIAL_KEY,
  MODEL_FILE_EXTENSIONS,
  SHAPE_OPTIONS,
} from "./loadCalculatorData";
import {
  analyzeModelOnServer,
  calculateLoadResult,
  formatFileSize,
  formatLoadNumber,
  getMaterialOption,
  readModelFile,
  summarizeLoadResults,
  validateLoadForm,
} from "./loadCalculatorUtils";
import {
  cloneLoadItem,
  createLoadItem,
  getInputModeLabel,
  getItemQuickFacts,
  getItemTitle,
  getShapeOption,
} from "./loadCalculatorHelpers";
import LoadModelViewer from "./LoadModelViewer";

function renderMaterialOptionGroups() {
  return MATERIAL_GROUP_OPTIONS.map((group) => (
    <optgroup key={group.label} label={group.label}>
      {group.options.map((material) => (
        <option key={material.key} value={material.key}>
          {material.label}
        </option>
      ))}
    </optgroup>
  ));
}

export default function LoadCalculator({ onBack, onSendToMotor }) {
  const [items, setItems] = useState([createLoadItem()]);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [loadingIds, setLoadingIds] = useState([]);

  const itemCountLabel = useMemo(() => `${items.length}개 항목`, [items.length]);
  const resultByItemId = useMemo(
    () => new Map((result?.items ?? []).map((entry) => [entry.id, entry.result])),
    [result],
  );
  const totalQuantity = useMemo(
    () => (result ? result.items.reduce((sum, item) => sum + item.result.quantity, 0) : 0),
    [result],
  );

  function updateItemField(itemId, key, value) {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, [key]: value } : item)),
    );
    setResult(null);
  }

  function updateModelPartField(itemId, partName, key, value) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              modelPartItems: item.modelPartItems.map((part) =>
                part.name === partName
                  ? {
                      ...part,
                      [key]: value,
                      ...(key === "volumeMm3"
                        ? { volumeSource: value ? "manual" : "none" }
                        : {}),
                    }
                  : part,
              ),
            }
          : item,
      ),
    );
    setResult(null);
  }

  function toggleSelectedPart(itemId, partName) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              modelSelectedPartNames: item.modelSelectedPartNames.includes(partName)
                ? item.modelSelectedPartNames.filter((name) => name !== partName)
                : [...item.modelSelectedPartNames, partName],
            }
          : item,
      ),
    );
  }

  function selectAllParts(itemId) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, modelSelectedPartNames: item.modelPartItems.map((part) => part.name) }
          : item,
      ),
    );
  }

  function clearSelectedParts(itemId) {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, modelSelectedPartNames: [] } : item)),
    );
  }

  function applyMaterialToSelectedParts(itemId, materialKey) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              modelPartItems: item.modelPartItems.map((part) =>
                item.modelSelectedPartNames.includes(part.name) ? { ...part, materialKey } : part,
              ),
              // 적용 후 선택을 비워야, 다음에 새 부품을 고를 때 이전에 이미 소재를
              // 적용한 부품까지 같이 딸려가서 덮어써지는 걸 막을 수 있습니다.
              modelSelectedPartNames: [],
            }
          : item,
      ),
    );
    setResult(null);
  }

  function updateAssemblyMaterial(itemId, value) {
    // "다양함"을 다시 선택하면 공통 소재 적용을 끄고 부품별 소재를 그대로 둡니다.
    // 실제 소재를 선택하면 그 즉시 전체 부품에 적용합니다.
    const isMixed = value === MIXED_MATERIAL_KEY;

    setItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        return {
          ...item,
          materialKey: isMixed ? item.materialKey : value,
          modelAssemblyMaterialKey: value,
          modelUseCommonMaterial: isMixed ? false : true,
          modelPartItems: isMixed
            ? item.modelPartItems
            : item.modelPartItems.map((part) => ({
                ...part,
                materialKey: value,
              })),
        };
      }),
    );
    setResult(null);
  }

  function updateAssemblySetting(itemId, key, value) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        if (key === "modelUseCommonMaterial") {
          const commonMaterialKey =
            item.modelAssemblyMaterialKey && item.modelAssemblyMaterialKey !== MIXED_MATERIAL_KEY
              ? item.modelAssemblyMaterialKey
              : item.materialKey;

          return {
            ...item,
            modelUseCommonMaterial: value,
            modelAssemblyMaterialKey: value ? commonMaterialKey : item.modelAssemblyMaterialKey,
            modelPartItems: value
              ? item.modelPartItems.map((part) => ({
                  ...part,
                  materialKey: commonMaterialKey,
                }))
              : item.modelPartItems,
          };
        }

        return {
          ...item,
          [key]: value,
        };
      }),
    );
    setResult(null);
  }

  async function handleModelFileChange(itemId, file) {
    if (!file) {
      return;
    }

    if (file.size > MAX_MODEL_FILE_SIZE_BYTES) {
      setErrors((current) => ({
        ...current,
        [itemId]: {
          ...(current[itemId] ?? {}),
          modelFile: `파일이 너무 큽니다 (${formatFileSize(file.size)}). 최대 ${MAX_MODEL_FILE_SIZE_MB}MB까지 업로드할 수 있습니다.`,
        },
      }));
      return;
    }

    setLoadingIds((current) => [...current, itemId]);
    setResult(null);

    try {
      let parsed;

      try {
        parsed = await analyzeModelOnServer(file);
      } catch {
        parsed = await readModelFile(file);
      }

      setItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? (() => {
                const fallbackMaterialKey = item.modelAssemblyMaterialKey && item.modelAssemblyMaterialKey !== MIXED_MATERIAL_KEY
                  ? item.modelAssemblyMaterialKey
                  : item.materialKey || "al6061";
                const hasAutoDetectedMaterial =
                  Array.isArray(parsed.modelNotes) &&
                  parsed.modelNotes.some(
                    (note) => typeof note === "string" && note.includes("자동 설정했습니다"),
                  );
                const isFirstUpload = !item.modelFileObject;
                const useCommonMaterial = isFirstUpload
                  ? !hasAutoDetectedMaterial
                  : (item.modelUseCommonMaterial ?? true);
                // 처음 업로드했고 소재가 자동 인식됐다면, 공통 소재 칸에는 특정 소재(예: 알루미늄)를
                // 미리 지정해두지 않고 "다양함"으로 비워둡니다. 실제 적용은 사용자가 직접 선택할 때만 합니다.
                const displayedAssemblyMaterialKey =
                  isFirstUpload && hasAutoDetectedMaterial ? MIXED_MATERIAL_KEY : fallbackMaterialKey;

                return {
                  ...item,
                  ...parsed,
                  materialKey:
                    parsed.modelAssemblyType === "assembly"
                      ? fallbackMaterialKey
                      : parsed.modelPartItems[0]?.materialKey ?? item.materialKey,
                  modelAssemblyMaterialKey:
                    parsed.modelAssemblyType === "assembly" ? displayedAssemblyMaterialKey : fallbackMaterialKey,
                  modelUseCommonMaterial: parsed.modelAssemblyType === "assembly" ? useCommonMaterial : true,
                  modelShowPartDetails: false,
                  modelPartItems:
                    parsed.modelAssemblyType === "assembly"
                      ? parsed.modelPartItems.map((part) => ({
                          ...part,
                          materialKey: useCommonMaterial ? fallbackMaterialKey : part.materialKey,
                        }))
                      : parsed.modelPartItems,
                  modelFileObject: file,
                  modelSelectedPartNames: [],
                };
              })()
            : item,
        ),
      );

      setErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[itemId];
        return nextErrors;
      });
    } catch (error) {
      setItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                modelFileName: file.name,
                modelFileType: file.name.split(".").pop()?.toUpperCase() ?? "",
                modelFileSizeBytes: file.size,
                modelPartName: file.name.replace(/\.[^.]+$/, ""),
                modelDetectedUnit: "",
                modelDetectedVolumeM3: null,
                modelBoundingBox: "",
                modelBoundingBoxVolumeM3: null,
                modelVolumeFillRatio: null,
                modelStatus: "인식 실패",
                modelAnalysisSource: "",
                modelNotes: [
                  error instanceof Error ? error.message : "파일을 인식하지 못했습니다.",
                ],
                modelAssemblyType: "",
                modelPartCount: 0,
                modelPartItems: [],
                modelManualVolumeMm3: "",
                modelUseCommonMaterial: true,
                modelAssemblyMaterialKey: item.modelAssemblyMaterialKey || item.materialKey,
                modelShowPartDetails: false,
                modelFileObject: null,
                modelSelectedPartNames: [],
              }
            : item,
        ),
      );

      setErrors((current) => ({
        ...current,
        [itemId]: {
          ...(current[itemId] ?? {}),
          modelFile:
            error instanceof Error ? error.message : "파일을 읽지 못했습니다.",
        },
      }));
    } finally {
      setLoadingIds((current) => current.filter((id) => id !== itemId));
    }
  }

  function handleAddItem() {
    setItems((current) => [...current, createLoadItem()]);
    setResult(null);
  }

  function handleCopyItem(itemId) {
    setItems((current) => {
      const source = current.find((item) => item.id === itemId);

      if (!source) {
        return current;
      }

      return [...current, cloneLoadItem(source)];
    });
    setResult(null);
  }

  function handleRemoveItem(itemId) {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.id !== itemId) : current));
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[itemId];
      return nextErrors;
    });
    setLoadingIds((current) => current.filter((id) => id !== itemId));
    setResult(null);
  }

  function handleToggleCollapse(itemId) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, isCollapsed: !item.isCollapsed } : item,
      ),
    );
  }

  function handleReset() {
    setItems([createLoadItem()]);
    setErrors({});
    setHasCalculated(false);
    setLoadingIds([]);
    setResult(null);
  }

  function evaluateLoadItems(nextItems) {
    const nextErrors = {};
    const calculatedItems = [];

    nextItems.forEach((item, index) => {
      const itemErrors = validateLoadForm(item);

      if (Object.keys(itemErrors).length > 0) {
        nextErrors[item.id] = itemErrors;
        return;
      }

      calculatedItems.push({
        id: item.id,
        title: getItemTitle(index, item),
        result: calculateLoadResult(item),
      });
    });

    return {
      nextErrors,
      nextResult:
        Object.keys(nextErrors).length > 0
          ? null
          : {
              items: calculatedItems,
              totals: summarizeLoadResults(calculatedItems),
            },
    };
  }

  useEffect(() => {
    if (!hasCalculated) {
      return;
    }

    const { nextErrors, nextResult } = evaluateLoadItems(items);
    setErrors(nextErrors);
    setResult(nextResult);
  }, [hasCalculated, items]);

  function handleCalculate(event) {
    event.preventDefault();
    setHasCalculated(true);

    const { nextErrors, nextResult } = evaluateLoadItems(items);
    setErrors(nextErrors);
    setResult(nextResult);
  }

  return (
    <div className="app app--load">
      <header className="app-header app-header--load">
        <div>
          <p className="page-kicker">Load Calculator</p>
          <h1>하중 계산</h1>
          <p>
            직접 입력, 수동 입력, 모델링 파일 업로드(STEP, STP) 기준으로 여러
            항목의 하중을 합산 계산합니다.
          </p>
        </div>
        <button type="button" className="ghost-button" onClick={onBack}>
          대문으로 돌아가기
        </button>
      </header>

      <div className="load-grid">
        <section className="card load-card">
          <div className="load-panel-head">
            <div>
              <h2>입력</h2>
              <p className="graph-text">{itemCountLabel}</p>
            </div>
            <button type="button" className="ghost-button" onClick={handleAddItem}>
              항목 추가
            </button>
          </div>

          <form className="form" onSubmit={handleCalculate}>
            <div className="load-button-row load-button-row--top">
              <button type="submit" className="button">
                합산 계산하기
              </button>
              <button type="button" className="ghost-button" onClick={handleReset}>
                전체 초기화
              </button>
            </div>

            <div className="load-item-stack">
              {items.map((item, index) => {
                const itemErrors = errors[item.id] ?? {};
                const selectedShape = getShapeOption(item.shape);
                const selectedMaterial = getMaterialOption(item.materialKey);
                const isLoading = loadingIds.includes(item.id);
                const isAssemblyMaterialMixed = item.modelAssemblyMaterialKey === MIXED_MATERIAL_KEY;
                const assemblyMaterial = isAssemblyMaterialMixed
                  ? null
                  : getMaterialOption(item.modelAssemblyMaterialKey || item.materialKey);
                const detectedVolumeText =
                  item.modelDetectedVolumeM3 !== null
                    ? `${formatLoadNumber(item.modelDetectedVolumeM3, 6)} m³`
                    : "자동 인식 없음";
                const boundingBoxVolumeText =
                  item.modelBoundingBoxVolumeM3 !== null
                    ? `${formatLoadNumber(item.modelBoundingBoxVolumeM3, 6)} m³`
                    : "-";
                const volumeFillRatioText =
                  item.modelVolumeFillRatio !== null
                    ? `${formatLoadNumber(item.modelVolumeFillRatio * 100, 1)}%`
                    : "-";
                const isNearlySolidModel =
                  item.modelVolumeFillRatio !== null && item.modelVolumeFillRatio >= 0.85;
                const assemblyLabel =
                  item.modelAssemblyType === "assembly"
                    ? `조립도 인식 (${formatLoadNumber(item.modelPartCount, 0)}종)`
                    : item.modelAssemblyType === "single"
                      ? "단일 파트 인식"
                      : "-";
                const hasMissingAssemblyVolumes =
                  item.modelAssemblyType === "assembly" &&
                  item.modelPartItems.some((part) => part.volumeSource !== "auto");
                const missingAssemblyVolumeCount =
                  item.modelAssemblyType === "assembly"
                    ? item.modelPartItems.filter((part) => part.volumeSource !== "auto").length
                    : 0;
                const autoAssemblyVolumeCount =
                  item.modelAssemblyType === "assembly"
                    ? item.modelPartItems.length - missingAssemblyVolumeCount
                    : 0;
                const visibleAssemblyParts =
                  item.modelAssemblyType === "assembly" && !item.modelShowPartDetails
                    ? item.modelPartItems.filter((part) => part.volumeSource !== "auto")
                    : item.modelPartItems;
                const itemResult = resultByItemId.get(item.id) ?? null;
                const itemQuickFacts = getItemQuickFacts(item, itemResult);

                return (
                  <article
                    className={`note-box load-item-editor${item.isCollapsed ? " is-collapsed" : ""}`}
                    key={item.id}
                  >
                    <div className="load-item-editor__head">
                      <div className="load-item-editor__title">
                        <h3>{getItemTitle(index, item)}</h3>
                        <p className="graph-text">
                          각 항목을 계산한 뒤 전체 합계로 다시 합산합니다.
                        </p>
                        <div className="load-item-chip-row">
                          {itemQuickFacts.map((fact) => (
                            <span className="load-item-chip" key={`${item.id}-${fact}`}>
                              {fact}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="load-item-editor__actions">
                        <button
                          type="button"
                          className="ghost-button ghost-button--small"
                          onClick={() => handleCopyItem(item.id)}
                        >
                          복제
                        </button>
                        <button
                          type="button"
                          className="ghost-button ghost-button--small"
                          onClick={() => handleToggleCollapse(item.id)}
                        >
                          {item.isCollapsed ? "펼치기" : "접기"}
                        </button>
                        {items.length > 1 ? (
                          <button
                            type="button"
                            className="ghost-button ghost-button--small"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            삭제
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="load-top-fields">
                      <div className="field">
                        <span>항목 이름</span>
                        <input
                          type="text"
                          value={item.itemName}
                          placeholder={`예: 하중 항목 ${index + 1}`}
                          onChange={(event) => updateItemField(item.id, "itemName", event.target.value)}
                        />
                      </div>

                      <div className="field">
                        <span>입력 방식</span>
                        <select
                          value={item.inputMode}
                          onChange={(event) => updateItemField(item.id, "inputMode", event.target.value)}
                        >
                          {LOAD_INPUT_MODE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {item.isCollapsed ? (
                      <div className="load-item-preview">
                        <div className="load-item-preview-grid">
                          <div className="load-preview-metric">
                            <span>개수</span>
                            <strong>{formatLoadNumber(Number(item.quantity || 0), 0)}</strong>
                          </div>
                          <div className="load-preview-metric">
                            <span>안전율</span>
                            <strong>{formatLoadNumber(Number(item.safetyFactor || 0), 1)}</strong>
                          </div>
                          <div className="load-preview-metric">
                            <span>질량</span>
                            <strong>
                              {itemResult ? `${formatLoadNumber(itemResult.massKg, 3)} kg` : "계산 전"}
                            </strong>
                          </div>
                          <div className="load-preview-metric">
                            <span>안전율 반영 하중</span>
                            <strong>
                              {itemResult
                                ? `${formatLoadNumber(itemResult.safetyLoadN, 2)} N`
                                : "계산 전"}
                            </strong>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {!item.isCollapsed && item.inputMode === "direct" ? (
                      <>
                        <div className="field">
                          <span>형상 선택</span>
                          <select
                            value={item.shape}
                            onChange={(event) => updateItemField(item.id, "shape", event.target.value)}
                          >
                            {SHAPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <p className="field-help">{selectedShape.description}</p>
                        </div>

                        <div className="load-shape-fields">
                          {selectedShape.fields.map((field) => (
                            <div className="field" key={`${item.id}-${field.key}`}>
                              <span>
                                {field.label} ({field.unit})
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item[field.key]}
                                placeholder={field.placeholder}
                                onChange={(event) => updateItemField(item.id, field.key, event.target.value)}
                              />
                              {itemErrors[field.key] ? <p className="error">{itemErrors[field.key]}</p> : null}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}

                    {!item.isCollapsed && item.inputMode === "manual" ? (
                      <>
                        <div className="field">
                          <span>수동 입력 기준</span>
                          <select
                            value={item.manualInputType}
                            onChange={(event) =>
                              updateItemField(item.id, "manualInputType", event.target.value)
                            }
                          >
                            {MANUAL_LOAD_INPUT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {item.manualInputType === "mass" ? (
                          <div className="field">
                            <span>질량 (kg)</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.massKg}
                              placeholder="예: 12.5"
                              onChange={(event) => updateItemField(item.id, "massKg", event.target.value)}
                            />
                            {itemErrors.manualValue ? <p className="error">{itemErrors.manualValue}</p> : null}
                          </div>
                        ) : (
                          <div className="field">
                            <span>하중 (N)</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.forceN}
                              placeholder="예: 122.6"
                              onChange={(event) => updateItemField(item.id, "forceN", event.target.value)}
                            />
                            {itemErrors.manualValue ? <p className="error">{itemErrors.manualValue}</p> : null}
                          </div>
                        )}
                      </>
                    ) : null}

                    {!item.isCollapsed && item.inputMode === "model" ? (
                      <>
                        <div className="field">
                          <span>모델링 파일 업로드</span>
                          <label className="file-picker">
                            <input
                              className="file-picker__input"
                              type="file"
                              accept={MODEL_FILE_EXTENSIONS.join(",")}
                              onChange={(event) => {
                                const [file] = event.target.files ?? [];
                                void handleModelFileChange(item.id, file);
                                event.target.value = "";
                              }}
                            />
                            <span className="file-picker__button">파일 선택</span>
                            <span className="file-picker__name">
                              {item.modelFileName || "선택된 파일 없음"}
                            </span>
                          </label>
                          {isLoading ? (
                            <p className="field-help">
                              ⏳ 분석 서버를 깨우고 있습니다. 서버가 한동안 사용되지 않아 잠자기
                              상태였다면 최대 1분 정도 걸릴 수 있습니다...
                            </p>
                          ) : null}
                          {itemErrors.modelFile ? <p className="error">{itemErrors.modelFile}</p> : null}
                        </div>

                        <div className="load-model-summary">
                          <div className="result-row">
                            <span>파일명</span>
                            <strong>{item.modelFileName || "-"}</strong>
                          </div>
                          <div className="result-row">
                            <span>형식</span>
                            <strong>{item.modelFileType || "-"}</strong>
                          </div>
                          <div className="result-row">
                            <span>크기</span>
                            <strong>{formatFileSize(item.modelFileSizeBytes)}</strong>
                          </div>
                          <div className="result-row">
                            <span>인식 상태</span>
                            <strong>{isLoading ? "인식 중" : item.modelStatus || "-"}</strong>
                          </div>
                          <div className="result-row">
                            <span>해석 소스</span>
                            <strong>{item.modelAnalysisSource || "-"}</strong>
                          </div>
                          <div className="result-row">
                            <span>대표 부품명</span>
                            <strong>{item.modelPartName || "-"}</strong>
                          </div>
                          <div className="result-row">
                            <span>구조</span>
                            <strong>{assemblyLabel}</strong>
                          </div>
                          <div className="result-row">
                            <span>자동 체적</span>
                            <strong>{detectedVolumeText}</strong>
                          </div>
                          <div className="result-row">
                            <span>외곽 체적</span>
                            <strong>{boundingBoxVolumeText}</strong>
                          </div>
                          <div className="result-row">
                            <span>체적 점유율</span>
                            <strong>{volumeFillRatioText}</strong>
                          </div>
                          <div className="result-row">
                            <span>단위 기준</span>
                            <strong>{item.modelDetectedUnit || "-"}</strong>
                          </div>
                          <div className="result-row">
                            <span>외곽 크기</span>
                            <strong>{item.modelBoundingBox || "-"}</strong>
                          </div>
                        </div>

                        {item.modelNotes.length > 0 ? (
                          <div className="note-box load-model-notes">
                            <h3>인식 내용</h3>
                            <ul>
                              {item.modelNotes.map((note) => (
                                <li key={`${item.id}-${note}`}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {item.modelDetectedVolumeM3 !== null && item.modelBoundingBoxVolumeM3 !== null ? (
                          <div className="note-box load-volume-check">
                            <h3>체적 검증</h3>
                            <p>
                              자동 체적은 외곽체적의 <strong>{volumeFillRatioText}</strong> 입니다.
                            </p>
                            <p>
                              {isNearlySolidModel
                                ? "파일이 외곽 크기 대비 거의 꽉 찬 솔리드에 가깝습니다. 얇은 쉘 구조를 기대했다면 CAD 모델이 실체적 솔리드로 저장되었는지 확인해 주세요."
                                : "외곽 크기와 자동 체적을 함께 보면 단위 문제나 과대/과소 계산을 더 쉽게 확인할 수 있습니다."}
                            </p>
                          </div>
                        ) : null}

                        {item.modelAssemblyType === "assembly" && item.modelPartItems.length > 0 ? (
                          <div className="note-box load-model-parts">
                            <h3>STEP 조립도 일괄 계산</h3>
                            <p className="field-help">
                              기본은 조립도 전체에 같은 소재를 한 번에 적용합니다. 필요한 경우에만
                              고급 옵션을 열어 부품별 소재를 수정하세요.
                            </p>

                            <div className="load-assembly-summary">
                              <div className="detail-static">
                                <span>조립도 요약</span>
                                <strong>
                                  고유 부품 {formatLoadNumber(item.modelPartItems.length, 0)}종 / 자동 체적{" "}
                                  {formatLoadNumber(autoAssemblyVolumeCount, 0)}종 / 추가 입력{" "}
                                  {formatLoadNumber(missingAssemblyVolumeCount, 0)}종
                                </strong>
                              </div>

                              <div className="note-box load-step-guide">
                                <h3>빠른 진행 순서</h3>
                                <ol>
                                  <li>공통 소재를 먼저 1번 선택합니다.</li>
                                  <li>자동 체적이 없는 부품만 체적을 입력합니다.</li>
                                  <li>개수와 안전율을 확인한 뒤 합산 계산하기를 누릅니다.</li>
                                </ol>
                              </div>

                              <div className="field">
                                <span>공통 소재 선택</span>
                                <select
                                  value={item.modelAssemblyMaterialKey}
                                  onChange={(event) =>
                                    updateAssemblyMaterial(item.id, event.target.value)
                                  }
                                >
                                  <option value={MIXED_MATERIAL_KEY}>다양함(부품별 소재 자동 인식됨)</option>
                                  {renderMaterialOptionGroups()}
                                </select>
                                <p className="field-help">
                                  {isAssemblyMaterialMixed
                                    ? "소재를 선택하면 그 즉시 모든 부품에 적용됩니다. 지금은 부품별로 인식된 소재를 그대로 사용합니다."
                                    : `현재 공통 소재 밀도 ${formatLoadNumber(assemblyMaterial.densityKgM3, 0)} kg/m³`}
                                </p>
                                {itemErrors.modelAssemblyMaterialKey ? (
                                  <p className="error">{itemErrors.modelAssemblyMaterialKey}</p>
                                ) : null}
                              </div>

                              <div className="load-assembly-options">
                                <label className="check-field">
                                  <input
                                    type="checkbox"
                                    checked={item.modelUseCommonMaterial}
                                    onChange={(event) =>
                                      updateAssemblySetting(
                                        item.id,
                                        "modelUseCommonMaterial",
                                        event.target.checked,
                                      )
                                    }
                                  />
                                  전체 동일 소재로 계산
                                </label>

                                <label className="check-field">
                                  <input
                                    type="checkbox"
                                    checked={item.modelShowPartDetails}
                                    onChange={(event) =>
                                      updateAssemblySetting(
                                        item.id,
                                        "modelShowPartDetails",
                                        event.target.checked,
                                      )
                                    }
                                  />
                                  고급 옵션 열기
                                </label>
                              </div>
                            </div>

                            {hasMissingAssemblyVolumes ? (
                              <div className="detail-static">
                                <span>추가 입력 필요</span>
                                <strong>
                                  자동 체적이 없는 부품 {formatLoadNumber(missingAssemblyVolumeCount, 0)}
                                  종만 입력하면 됩니다.
                                </strong>
                                <span>
                                  공통 소재 계산을 유지하면 체적만 입력해도 바로 합산할 수 있습니다.
                                </span>
                              </div>
                            ) : (
                              <div className="detail-static">
                                <span>자동 체적 상태</span>
                                <strong>모든 부품 체적이 자동 반영되었습니다.</strong>
                                <span>
                                  지금은 소재와 조립 세트 수만 지정하면 전체 하중을 계산할 수 있습니다.
                                </span>
                              </div>
                            )}

                            {item.modelFileObject ? (
                              <p className="field-help load-model-viewer-pointer">
                                3D 형상을 보면서 부품을 선택하려면 오른쪽(모바일에서는 아래) 합산
                                결과 패널 상단을 확인하세요.
                              </p>
                            ) : null}

                            {visibleAssemblyParts.length > 0 ? (
                              <div className="load-part-editor-list">
                                {visibleAssemblyParts.map((part) => {
                                const partErrors = itemErrors.modelPartItems?.[part.name] ?? {};
                                const partMaterial = getMaterialOption(part.materialKey);
                                const volumeStatus =
                                  part.volumeSource === "auto"
                                    ? "자동 인식 체적"
                                    : part.volumeSource === "manual"
                                      ? "직접 입력 체적"
                                      : "자동 체적 없음";

                                const isPartSelected = item.modelSelectedPartNames.includes(part.name);

                                return (
                                  <div
                                    className={`load-part-editor${isPartSelected ? " is-selected" : ""}`}
                                    key={`${item.id}-${part.name}`}
                                  >
                                    <div className="load-part-editor__meta">
                                      <label className="check-field">
                                        <input
                                          type="checkbox"
                                          checked={isPartSelected}
                                          onChange={() => toggleSelectedPart(item.id, part.name)}
                                        />
                                        <strong>{part.name}</strong>
                                      </label>
                                      <span>{formatLoadNumber(part.count, 0)}개 / 조립 1세트</span>
                                    </div>
                                    <div className="load-part-editor__status">
                                      <span className={`load-pill ${part.volumeSource === "auto" ? "load-pill--auto" : "load-pill--warn"}`}>
                                        {volumeStatus}
                                      </span>
                                      <p className="field-help">
                                        {part.volumeSource === "auto"
                                          ? "STEP에서 읽은 체적입니다. 필요하면 수정할 수 있습니다."
                                          : "자동 인식이 없어서 이 부품만 직접 입력이 필요합니다."}
                                      </p>
                                    </div>
                                    <div
                                      className={`load-part-editor__grid ${
                                        !item.modelUseCommonMaterial || item.modelShowPartDetails
                                          ? ""
                                          : "load-part-editor__grid--single"
                                      }`}
                                    >
                                      {!item.modelUseCommonMaterial || item.modelShowPartDetails ? (
                                        <div className="field">
                                          <span>소재 선택</span>
                                          <select
                                            value={part.materialKey}
                                            onChange={(event) =>
                                              updateModelPartField(
                                                item.id,
                                                part.name,
                                                "materialKey",
                                                event.target.value,
                                              )
                                            }
                                          >
                                            {renderMaterialOptionGroups()}
                                          </select>
                                          <p className="field-help">
                                            밀도 {formatLoadNumber(partMaterial.densityKgM3, 0)} kg/m³
                                          </p>
                                          {partErrors.materialKey ? (
                                            <p className="error">{partErrors.materialKey}</p>
                                          ) : null}
                                        </div>
                                      ) : (
                                        <div className="detail-static">
                                          <span>적용 소재</span>
                                          <strong>{assemblyMaterial.label}</strong>
                                          <span>
                                            공통 소재 밀도{" "}
                                            {formatLoadNumber(assemblyMaterial.densityKgM3, 0)} kg/m³
                                          </span>
                                        </div>
                                      )}

                                      <div className="field">
                                        {part.volumeSource === "auto" ? (
                                          <div className="detail-static">
                                            <span>부품 1개 체적</span>
                                            <strong>{`${formatLoadNumber(part.volumeMm3, 2)} mm³`}</strong>
                                            <span>STEP에서 읽은 값을 그대로 사용합니다.</span>
                                          </div>
                                        ) : (
                                          <>
                                            <span>부품 1개 체적 (mm³)</span>
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={part.volumeMm3}
                                              placeholder="예: 850000"
                                              onChange={(event) =>
                                                updateModelPartField(
                                                  item.id,
                                                  part.name,
                                                  "volumeMm3",
                                                  event.target.value,
                                                )
                                              }
                                            />
                                            {partErrors.volumeMm3 ? (
                                              <p className="error">{partErrors.volumeMm3}</p>
                                            ) : null}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                                })}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {item.modelAssemblyType !== "assembly" ? (
                          <>
                            <div className="field">
                              <span>소재 선택</span>
                              <select
                                value={item.materialKey}
                                onChange={(event) => updateItemField(item.id, "materialKey", event.target.value)}
                              >
                                {renderMaterialOptionGroups()}
                              </select>
                              <p className="field-help">
                                선택 소재 밀도 {formatLoadNumber(selectedMaterial.densityKgM3, 0)} kg/m³
                              </p>
                              {itemErrors.materialKey ? <p className="error">{itemErrors.materialKey}</p> : null}
                            </div>

                            {item.modelDetectedVolumeM3 !== null ? (
                              <div className="detail-static">
                                <span>자동 인식 체적</span>
                                <strong>{detectedVolumeText}</strong>
                                <span>자동 인식된 체적을 그대로 계산에 사용합니다.</span>
                              </div>
                            ) : (
                              <div className="field">
                                <span>체적 입력 (mm³)</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.modelManualVolumeMm3}
                                  placeholder="자동 체적이 없을 때만 입력"
                                  onChange={(event) =>
                                    updateItemField(item.id, "modelManualVolumeMm3", event.target.value)
                                  }
                                />
                                <p className="field-help">
                                  이 파일은 자동 체적이 없어서 한 번만 입력하면 계산할 수 있습니다.
                                </p>
                                {itemErrors.modelManualVolumeMm3 ? (
                                  <p className="error">{itemErrors.modelManualVolumeMm3}</p>
                                ) : null}
                              </div>
                            )}
                          </>
                        ) : null}
                      </>
                    ) : null}

                    {!item.isCollapsed && item.inputMode === "direct" ? (
                      <div className="field">
                        <span>소재 선택</span>
                        <select
                          value={item.materialKey}
                          onChange={(event) => updateItemField(item.id, "materialKey", event.target.value)}
                        >
                          {renderMaterialOptionGroups()}
                        </select>
                        <p className="field-help">
                          선택 소재 밀도 {formatLoadNumber(selectedMaterial.densityKgM3, 0)} kg/m³
                        </p>
                        {itemErrors.materialKey ? <p className="error">{itemErrors.materialKey}</p> : null}
                      </div>
                    ) : null}

                    {!item.isCollapsed ? (
                      <div className="load-inline-fields">
                        <div className="field">
                          <span>
                            {item.inputMode === "model" && item.modelAssemblyType === "assembly"
                              ? "조립 세트 수"
                              : "개수"}
                          </span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            placeholder="예: 2"
                            onChange={(event) => updateItemField(item.id, "quantity", event.target.value)}
                          />
                          {itemErrors.quantity ? <p className="error">{itemErrors.quantity}</p> : null}
                        </div>

                        <div className="field">
                          <span>안전율</span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={item.safetyFactor}
                            placeholder="예: 1.5"
                            onChange={(event) => updateItemField(item.id, "safetyFactor", event.target.value)}
                          />
                          {itemErrors.safetyFactor ? <p className="error">{itemErrors.safetyFactor}</p> : null}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

          </form>
        </section>

        <section className="card load-card">
          <h2>합산 결과</h2>

          {items.some(
            (item) => item.inputMode === "model" && item.modelAssemblyType === "assembly" && item.modelFileObject,
          ) ? (
            <div className="load-model-viewer-panel-list">
              {items.map((item, index) =>
                item.inputMode === "model" && item.modelAssemblyType === "assembly" && item.modelFileObject ? (
                  <div className="note-box load-model-viewer-box" key={`${item.id}-viewer`}>
                    <h3>{getItemTitle(index, item)} · 형상으로 부품 선택하기</h3>
                    <p className="field-help">
                      3D 형상에서 부품을 클릭하면 여러 개를 한 번에 선택할 수 있습니다. 선택한
                      뒤 소재를 골라 한 번에 적용하세요.
                    </p>
                    <LoadModelViewer
                      file={item.modelFileObject}
                      selectedNames={new Set(item.modelSelectedPartNames)}
                      onToggleSelect={(partName) => toggleSelectedPart(item.id, partName)}
                      partMaterialKeys={Object.fromEntries(
                        item.modelPartItems.map((part) => [part.name, part.materialKey]),
                      )}
                    />
                    <div className="load-bulk-material-bar">
                      <span className="load-bulk-material-bar__count">
                        선택됨 {formatLoadNumber(item.modelSelectedPartNames.length, 0)}개
                      </span>
                      <button
                        type="button"
                        className="ghost-button ghost-button--small"
                        onClick={() => selectAllParts(item.id)}
                      >
                        전체 선택
                      </button>
                      <button
                        type="button"
                        className="ghost-button ghost-button--small"
                        onClick={() => clearSelectedParts(item.id)}
                      >
                        선택 해제
                      </button>
                      <select
                        className="load-bulk-material-bar__select"
                        disabled={item.modelSelectedPartNames.length === 0}
                        value=""
                        onChange={(event) => {
                          if (!event.target.value) {
                            return;
                          }
                          applyMaterialToSelectedParts(item.id, event.target.value);
                          event.target.value = "";
                        }}
                      >
                        <option value="" disabled>
                          선택 부품에 적용할 소재...
                        </option>
                        {renderMaterialOptionGroups()}
                      </select>
                    </div>
                    {item.modelSelectedPartNames.length > 0 ? (
                      <div className="load-selected-chip-row">
                        {item.modelSelectedPartNames.map((name) => (
                          <span className="load-item-chip" key={`${item.id}-selected-${name}`}>
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null,
              )}
            </div>
          ) : null}

          {result ? (
            <div className="result load-result">
              <div className="status status--ok">합산 계산 완료</div>

              <div className="note-box note-box--status">
                <h3>입력 요약</h3>
                <p>
                  총 {formatLoadNumber(result.totals.itemCount, 0)}개 항목 / 직접 입력{" "}
                  {formatLoadNumber(result.totals.directItemCount, 0)}개 / 수동 입력{" "}
                  {formatLoadNumber(result.totals.manualItemCount, 0)}개 / 모델 업로드{" "}
                  {formatLoadNumber(result.totals.modelItemCount, 0)}개
                </p>
              </div>

              <div className="load-result-summary">
                <div className="load-highlight-card load-highlight-card--weight">
                  <span className="summary-caption">총 무게 (kg)</span>
                  <strong>{formatLoadNumber(result.totals.massKg, 3)} kg</strong>
                  <p>모터 시뮬레이터의 하중(kg) 입력값으로 바로 넘길 수 있습니다.</p>
                  {typeof onSendToMotor === "function" ? (
                    <button
                      type="button"
                      className="button button--inline"
                      onClick={() =>
                        onSendToMotor({
                          weightKg: result.totals.massKg,
                          source: "load-calculator-total-mass",
                        })
                      }
                    >
                      모터 시뮬레이터로 무게 보내기
                    </button>
                  ) : null}
                </div>

                <div className="load-highlight-card">
                  <span className="summary-caption">총 안전율 반영 하중</span>
                  <strong>{formatLoadNumber(result.totals.safetyLoadN, 2)} N</strong>
                  <p>여러 항목의 안전율 반영 하중을 모두 합산한 최종 기준값입니다.</p>
                </div>

                <div className="load-highlight-card">
                  <span className="summary-caption">총 수량</span>
                  <strong>{formatLoadNumber(totalQuantity, 0)} 개</strong>
                  <p>복수 물건 계산 시 각 항목의 개수를 전부 더한 합계입니다.</p>
                </div>
              </div>

              <div className="result-list result-list--compact">
                <div className="result-row">
                  <span>합산 체적</span>
                  <strong>{`${formatLoadNumber(result.totals.volumeM3, 6)} m³`}</strong>
                </div>
                <div className="result-row">
                  <span>합산 질량</span>
                  <strong>{formatLoadNumber(result.totals.massKg, 3)} kg</strong>
                </div>
                <div className="result-row">
                  <span>합산 중량</span>
                  <strong>{formatLoadNumber(result.totals.weightN, 2)} N</strong>
                </div>
                <div className="result-row">
                  <span>합산 하중</span>
                  <strong>{formatLoadNumber(result.totals.loadKgf, 3)} kgf</strong>
                </div>
                <div className="result-row">
                  <span>안전율 적용</span>
                  <strong>항목별 개별 적용 후 합산</strong>
                </div>
              </div>

              <div className="load-result-items">
                {result.items.map((item) => (
                  <article className="note-box load-result-item" key={item.id}>
                    <div className="load-result-item__head">
                      <div>
                        <h3>{item.title}</h3>
                        <div className="load-item-chip-row">
                          <span className="load-item-chip">{getInputModeLabel(item.result.inputMode)}</span>
                          <span className="load-item-chip">
                            개수 {formatLoadNumber(item.result.quantity, 0)}
                          </span>
                        </div>
                      </div>
                      <strong>{formatLoadNumber(item.result.massKg, 3)} kg</strong>
                    </div>
                    <div className="result-list result-list--compact">
                      <div className="result-row">
                        <span>형상/기준</span>
                        <strong>{item.result.shapeLabel}</strong>
                      </div>
                      <div className="result-row">
                        <span>소재</span>
                        <strong>{item.result.materialLabel}</strong>
                      </div>
                      <div className="result-row">
                        <span>개수</span>
                        <strong>{formatLoadNumber(item.result.quantity, 0)}</strong>
                      </div>
                      <div className="result-row">
                        <span>체적</span>
                        <strong>
                          {item.result.volumeM3 !== null
                            ? `${formatLoadNumber(item.result.volumeM3, 6)} m³`
                            : "-"}
                        </strong>
                      </div>
                      <div className="result-row">
                        <span>질량</span>
                        <strong>{formatLoadNumber(item.result.massKg, 3)} kg</strong>
                      </div>
                      <div className="result-row">
                        <span>안전율</span>
                        <strong>{formatLoadNumber(item.result.safetyFactor, 2)}</strong>
                      </div>
                      <div className="result-row">
                        <span>중량</span>
                        <strong>{formatLoadNumber(item.result.weightN, 2)} N</strong>
                      </div>
                      <div className="result-row">
                        <span>하중</span>
                        <strong>{formatLoadNumber(item.result.loadKgf, 3)} kgf</strong>
                      </div>
                      <div className="result-row">
                        <span>안전율 반영 하중</span>
                        <strong>{formatLoadNumber(item.result.safetyLoadN, 2)} N</strong>
                      </div>
                    </div>

                    {item.result.partBreakdown?.length ? (
                      <div className="load-part-breakdown">
                        <h4>부품별 합산 결과</h4>
                        <div className="load-part-breakdown-list">
                          {item.result.partBreakdown.map((part) => (
                            <div className="load-part-breakdown-item" key={`${item.id}-${part.name}`}>
                              <div className="load-part-breakdown-item__head">
                                <strong>{part.name}</strong>
                                <span>{formatLoadNumber(part.totalCount, 0)}개 총합</span>
                              </div>
                              <div className="load-part-breakdown-item__grid">
                                <div className="result-row">
                                  <span>소재</span>
                                  <strong>{part.materialLabel}</strong>
                                </div>
                                <div className="result-row">
                                  <span>부품 1개 체적</span>
                                  <strong>{formatLoadNumber(part.unitVolumeM3, 6)} m³</strong>
                                </div>
                                <div className="result-row">
                                  <span>총 체적</span>
                                  <strong>{formatLoadNumber(part.totalVolumeM3, 6)} m³</strong>
                                </div>
                                <div className="result-row">
                                  <span>총 질량</span>
                                  <strong>{formatLoadNumber(part.massKg, 3)} kg</strong>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-box empty-box--guide">
              <h3>계산 안내</h3>
              <div className="load-formula-list">
                <p><strong>모델링 파일 인식</strong> — STEP/STP 파일의 조립 트리를 분석해 부품명·수량·체적 메타데이터를 읽습니다.</p>
                <p><strong>여러 항목 합산</strong> — 각 항목을 개별 계산한 뒤 총합으로 다시 합산합니다. 수동 입력은 질량·하중 기준으로 바로 환산합니다.</p>
                <p><strong>기본 공식</strong> — 질량 = 체적 × 밀도, 중량(N) = 질량 × 9.81, 안전율 반영 하중(N) = 중량 × 안전율</p>
              </div>
              <div className="note-box note-box--quick load-upload-notice">
                <p>
                  <strong>모델링 파일 업로드 제한 — STEP, STP만 지원, 파일당 최대 50MB</strong>
                </p>
                <p>
                  <strong>⏳ 체적 분석 서버가 잠자기 상태였다면, 깨어나는 데 최대 1분 정도 걸릴 수 있습니다.</strong>
                </p>
              </div>
              <p className="empty-box--guide-footnote">
                여러 항목을 입력하거나 모델링 파일을 업로드한 뒤 합산 계산하기를 누르면
                총 하중 결과를 한 번에 확인할 수 있습니다.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}



