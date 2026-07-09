import { useEffect, useMemo, useRef, useState } from "react";
import ConverterPreviewPane from "./DocumentConverterPreview";
import { createElectronEngine } from "./converterEngine/electronEngine";
import { createWebEngine } from "./converterEngine/webEngine";

const MAX_BATCH_FILES = 50;

const CONVERSION_TYPES = [
  { id: "image-format", title: "이미지 포맷 변환", hint: "jpg·png·webp 간 형식을 바꿔요." },
  { id: "images-to-pdf", title: "이미지 → PDF", hint: "여러 이미지를 PDF로 만들어요." },
  { id: "excel-csv", title: "엑셀 ↔ CSV", hint: "엑셀은 CSV로, CSV는 엑셀로 바꿔요." },
  { id: "ascii-data", title: "실험 데이터(ASCII)", hint: "장비 텍스트 데이터를 표·그래프용 파일로 바꿔요." },
];

function getExtension(name) {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex === -1 ? "" : name.slice(dotIndex).toLowerCase();
}

function defaultOptionsFor(conversionType) {
  if (conversionType === "image-format") return { targetFormats: ["jpg"] };
  if (conversionType === "images-to-pdf") return { mergeIntoSinglePdf: false };
  if (conversionType === "excel-csv") return { encoding: "auto", delimiter: "auto" };
  if (conversionType === "ascii-data") return { targetFormats: ["xlsx"], encoding: "auto", delimiter: "auto" };
  return {};
}

function toggleFormat(list, format) {
  return list.includes(format) ? list.filter((item) => item !== format) : [...list, format];
}

// 결과 파일 하나(경로 문자열 또는 { name } 웹 디스크립터)의 이름/확장자를 알아낸다.
function outputRefName(ref) {
  return typeof ref === "string" ? ref.split(/[\\/]/).pop() : ref.name;
}

export default function DocumentConverter({ onBack }) {
  const engine = useMemo(
    () => (typeof window !== "undefined" && window.converterApp ? createElectronEngine() : createWebEngine()),
    [],
  );
  const isWeb = engine.kind === "web";

  const [config, setConfig] = useState(null);
  const [conversionType, setConversionType] = useState("image-format");
  const [files, setFiles] = useState([]); // { key, ref, name, supported }
  const [activeIndex, setActiveIndex] = useState(-1);
  const [outputTarget, setOutputTarget] = useState(null);
  const [options, setOptions] = useState(defaultOptionsFor("image-format"));
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [jobId, setJobId] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState({}); // key -> { success, outputPaths, error }
  const [diskWarning, setDiskWarning] = useState(null);
  const [notice, setNotice] = useState(null);

  const [originalPreview, setOriginalPreview] = useState(null);
  const [resultPreview, setResultPreview] = useState(null);

  const unsubscribeRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewObjectUrlsRef = useRef({ original: null, result: null });

  useEffect(() => {
    return () => {
      if (previewObjectUrlsRef.current.original) URL.revokeObjectURL(previewObjectUrlsRef.current.original);
      if (previewObjectUrlsRef.current.result) URL.revokeObjectURL(previewObjectUrlsRef.current.result);
    };
  }, []);

  useEffect(() => {
    engine.getConfig().then(setConfig).catch(() => {});
    engine.listProfiles().then(setProfiles).catch(() => {});
  }, [engine]);

  // 폴더 선택을 지원하지 않는 브라우저에서는 처음부터 "다운로드로 저장" 모드로 시작한다.
  useEffect(() => {
    if (isWeb && !engine.supportsDirectoryPicker) {
      setOutputTarget({ mode: "download", label: "다운로드 폴더" });
    }
  }, [isWeb, engine]);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  function resetForNewType(nextType) {
    setConversionType(nextType);
    setOptions(defaultOptionsFor(nextType));
    setFiles([]);
    setActiveIndex(-1);
    setResults({});
    setProgress(null);
    setSelectedProfileId("");
    setDiskWarning(null);
    setNotice(null);
  }

  const supportedExtensions = config?.[conversionType]?.inputExtensions || [];

  function addEntries(entries) {
    if (!entries || entries.length === 0) return;
    let firstNewIndex = -1;
    let truncated = false;

    setFiles((current) => {
      const existingKeys = new Set(current.map((f) => f.key));
      let additions = entries
        .filter((entry) => entry && !existingKeys.has(entry.key))
        .map((entry) => ({
          ...entry,
          supported: supportedExtensions.length === 0 || supportedExtensions.includes(getExtension(entry.name)),
        }));

      const remainingSlots = MAX_BATCH_FILES - current.length;
      if (additions.length > remainingSlots) {
        additions = additions.slice(0, Math.max(0, remainingSlots));
        truncated = true;
      }

      if (additions.length > 0) {
        firstNewIndex = current.length;
      }
      return [...current, ...additions];
    });

    if (truncated) {
      setNotice(`한 번에 최대 ${MAX_BATCH_FILES}개까지 변환할 수 있어요 — 초과분은 추가되지 않았어요.`);
    }

    if (firstNewIndex !== -1) {
      setActiveIndex((current) => (current === -1 ? firstNewIndex : current));
    }
  }

  async function handleChooseFiles() {
    if (engine.hasFileDialog) {
      const entries = await engine.chooseFiles(conversionType);
      addEntries(entries);
      return;
    }
    fileInputRef.current?.click();
  }

  function handleFileInputChange(event) {
    const entries = Array.from(event.target.files).map((file) => ({
      key: crypto.randomUUID(),
      ref: file,
      name: file.name,
    }));
    addEntries(entries);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    if (engine.kind === "electron") {
      const entries = Array.from(event.dataTransfer.files)
        .map((file) => file.path)
        .filter(Boolean)
        .map((path) => ({ key: path, ref: path, name: path.split(/[\\/]/).pop() || path }));
      addEntries(entries);
      return;
    }
    const entries = Array.from(event.dataTransfer.files).map((file) => ({
      key: crypto.randomUUID(),
      ref: file,
      name: file.name,
    }));
    addEntries(entries);
  }

  function handleRemoveFile(key) {
    setFiles((current) => current.filter((f) => f.key !== key));
    setResults((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleChooseOutputFolder() {
    const target = await engine.chooseOutputTarget();
    if (target) setOutputTarget(target);
  }

  const supportedFiles = files.filter((f) => f.supported);

  // 디스크 여유공간 사전 확인 — 지원하는 경우에만 표시됨 (웹 버전은 항상 통과)
  useEffect(() => {
    if (!outputTarget || supportedFiles.length === 0) {
      setDiskWarning(null);
      return undefined;
    }
    let cancelled = false;
    engine
      .checkDiskSpace(outputTarget, supportedFiles)
      .then((result) => {
        if (cancelled) return;
        setDiskWarning(
          result.supported && !result.sufficient
            ? "출력 폴더의 저장 공간이 부족할 수 있어요 — 다른 폴더를 선택하거나 공간을 확보해주세요."
            : null,
        );
      })
      .catch(() => {
        if (!cancelled) setDiskWarning(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputTarget, files]);

  async function runConvert(targetItems) {
    if (targetItems.length === 0 || !outputTarget || isConverting) return;
    const newJobId = crypto.randomUUID();
    setJobId(newJobId);
    setIsConverting(true);
    setProgress({ totalFiles: targetItems.length, completedFiles: 0, currentFileName: "", currentFilePercent: 0 });
    setNotice(null);

    if (unsubscribeRef.current) unsubscribeRef.current();
    unsubscribeRef.current = engine.onProgress((payload) => {
      if (payload.jobId !== newJobId) return;
      setProgress(payload);
    });

    try {
      const jobResults = await engine.convert({
        jobId: newJobId,
        conversionType,
        items: targetItems,
        outputTarget,
        options,
      });
      setResults((current) => {
        const next = { ...current };
        jobResults.forEach((result) => {
          next[result.key] = result;
        });
        return next;
      });
    } catch (error) {
      setNotice(`변환 중 문제가 발생했어요: ${error.message || error}`);
    } finally {
      setIsConverting(false);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }
  }

  function handleStartConversion() {
    runConvert(supportedFiles.map((f) => ({ key: f.key, ref: f.ref })));
  }

  function handleCancel() {
    if (jobId) engine.cancel(jobId);
  }

  function handleRetryFailed() {
    const failedKeys = new Set(Object.entries(results).filter(([, r]) => !r.success).map(([key]) => key));
    const items = files.filter((f) => failedKeys.has(f.key)).map((f) => ({ key: f.key, ref: f.ref }));
    runConvert(items);
  }

  function handleRetrySingle(key) {
    const file = files.find((f) => f.key === key);
    if (file) runConvert([{ key: file.key, ref: file.ref }]);
  }

  async function handleSaveProfile() {
    if (!profileNameDraft.trim()) return;
    setSavingProfile(true);
    try {
      await engine.saveProfile({ name: profileNameDraft.trim(), conversionType, options });
      setProfiles(await engine.listProfiles());
      setProfileNameDraft("");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleDeleteProfile(profileId) {
    await engine.deleteProfile(profileId);
    setProfiles(await engine.listProfiles());
    if (selectedProfileId === profileId) setSelectedProfileId("");
  }

  function handleSelectProfile(profileId) {
    setSelectedProfileId(profileId);
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      setConversionType(profile.conversionType);
      setOptions(profile.options);
    }
  }

  const profilesForType = profiles.filter((p) => p.conversionType === conversionType);
  const activeFile = activeIndex >= 0 ? files[activeIndex] : null;
  const activeResult = activeFile ? results[activeFile.key] : null;

  // 결과 파일이 여러 개(다중 형식 동시 변환, 엑셀 다중 시트 등)일 때 어떤 걸 미리 볼지
  const [selectedOutputIndex, setSelectedOutputIndex] = useState(0);
  useEffect(() => {
    setSelectedOutputIndex(0);
  }, [activeResult]);

  // 미리보기 로딩 — 원본 (좌측, 현재 선택된 1개 파일만)
  useEffect(() => {
    let cancelled = false;
    setOriginalPreview(null);
    if (!activeFile || !activeFile.supported) return undefined;

    async function loadOriginal() {
      try {
        let next = null;
        if (conversionType === "image-format" || conversionType === "images-to-pdf") {
          next = { kind: "image", data: await engine.previewImage(activeFile.ref) };
        } else if (conversionType === "excel-csv") {
          next = {
            kind: "table",
            data: await engine.previewTable(activeFile.ref, { encoding: options.encoding, delimiter: options.delimiter }),
          };
        } else if (conversionType === "ascii-data") {
          next = {
            kind: "ascii",
            data: await engine.previewAscii(activeFile.ref, { encoding: options.encoding, delimiter: options.delimiter }),
          };
        }
        if (!cancelled) {
          if (previewObjectUrlsRef.current.original) URL.revokeObjectURL(previewObjectUrlsRef.current.original);
          previewObjectUrlsRef.current.original = next?.kind === "image" ? next.data : null;
          setOriginalPreview(next);
        }
      } catch {
        if (!cancelled) setOriginalPreview({ kind: "none", data: null });
      }
    }

    loadOriginal();
    return () => {
      cancelled = true;
    };
  }, [activeFile, conversionType, engine, options.encoding, options.delimiter]);

  // 미리보기 로딩 — 결과 (우측, 변환이 성공한 경우에만, 여러 출력 중 선택된 1개)
  useEffect(() => {
    let cancelled = false;
    setResultPreview(null);
    if (!activeResult || !activeResult.success || !activeResult.outputPaths?.length) return undefined;
    const outputRef = activeResult.outputPaths[selectedOutputIndex] || activeResult.outputPaths[0];

    async function loadResult() {
      try {
        let next = null;
        if (conversionType === "image-format") {
          next = { kind: "image", data: await engine.previewImage(outputRef) };
        } else if (conversionType === "images-to-pdf") {
          next = { kind: "pdf", data: await engine.previewPdfBase64(outputRef) };
        } else if (conversionType === "excel-csv") {
          next = { kind: "table", data: await engine.previewTable(outputRef) };
        } else if (conversionType === "ascii-data") {
          const outputExt = getExtension(outputRefName(outputRef));
          next =
            outputExt === ".json"
              ? { kind: "text", data: await engine.previewText(outputRef) }
              : { kind: "table", data: await engine.previewTable(outputRef) };
        }
        if (!cancelled) {
          if (previewObjectUrlsRef.current.result) URL.revokeObjectURL(previewObjectUrlsRef.current.result);
          previewObjectUrlsRef.current.result = next?.kind === "image" ? next.data : null;
          setResultPreview(next);
        }
      } catch {
        if (!cancelled) setResultPreview({ kind: "none", data: null });
      }
    }

    loadResult();
    return () => {
      cancelled = true;
    };
  }, [activeResult, selectedOutputIndex, conversionType, engine]);

  const failedCount = Object.values(results).filter((r) => !r.success).length;
  const successCount = Object.values(results).filter((r) => r.success).length;
  const needsTargetFormats = conversionType === "image-format" || conversionType === "ascii-data";
  const hasNoTargetFormats = needsTargetFormats && (options.targetFormats?.length ?? 0) === 0;

  return (
    <div className="app app--converter">
      <header className="app-header app-header--converter">
        <div>
          <p className="page-kicker">BATCH DOCUMENT CONVERTER</p>
          <h1>일괄 문서 변환기</h1>
          <p>문서·이미지·스프레드시트·실험 데이터를 한 번에 변환하고, 변환 전후를 바로 비교해보세요.</p>
        </div>
        <button type="button" className="ghost-button" onClick={onBack}>
          대문으로 돌아가기
        </button>
      </header>

      {isWeb ? (
        <p className="converter-web-notice">
          웹 버전에서 실행 중이에요 — 이미지 변환·PDF 만들기·엑셀↔CSV·실험 데이터 변환은 그대로 되지만, 디스크 여유공간
          확인은 지원되지 않고
          {engine.supportsDirectoryPicker
            ? " 폴더 저장은 Chrome/Edge 계열 브라우저에서만 가능해요."
            : " 이 브라우저는 폴더 저장을 지원하지 않아 변환된 파일이 다운로드로 저장돼요."}
        </p>
      ) : null}

      <div className="converter-layout">
        <aside className="converter-type-list">
          {CONVERSION_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              className={`converter-type-item${type.id === conversionType ? " converter-type-item--active" : ""}`}
              onClick={() => resetForNewType(type.id)}
            >
              <strong>{type.title}</strong>
              <span>{type.hint}</span>
            </button>
          ))}
        </aside>

        <div className="converter-main">
          <div className="converter-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
            <p>여기로 파일을 끌어다 놓거나</p>
            <button type="button" className="button" onClick={handleChooseFiles}>
              파일 선택
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              accept={supportedExtensions.join(",")}
              onChange={handleFileInputChange}
            />
            <p className="converter-hint">
              변환된 파일은 원본 이름을 그대로 유지해요 (같은 이름이 있으면 자동으로 _1, _2가 붙어요). 한 번에 최대{" "}
              {MAX_BATCH_FILES}개까지 변환할 수 있어요.
            </p>
          </div>

          {files.length > 0 ? (
            <ul className="converter-file-list">
              {files.map((file, index) => {
                const result = results[file.key];
                return (
                  <li
                    key={file.key}
                    className={`converter-file-item${index === activeIndex ? " converter-file-item--active" : ""}`}
                    onClick={() => setActiveIndex(index)}
                  >
                    <span className="converter-file-name">{file.name}</span>
                    {!file.supported ? (
                      <span className="converter-file-tag converter-file-tag--unsupported">지원 안 함</span>
                    ) : null}
                    {result ? (
                      result.success ? (
                        <span className="converter-file-tag converter-file-tag--success">완료</span>
                      ) : (
                        <span className="converter-file-tag converter-file-tag--fail" title={result.error}>
                          실패
                        </span>
                      )
                    ) : null}
                    {result && !result.success ? (
                      <button
                        type="button"
                        className="ghost-button ghost-button--small"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRetrySingle(file.key);
                        }}
                      >
                        재시도
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="converter-file-remove"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveFile(file.key);
                      }}
                      aria-label="목록에서 제거"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="converter-options-row">
            <div className="converter-profile-select">
              <select value={selectedProfileId} onChange={(event) => handleSelectProfile(event.target.value)}>
                <option value="">저장된 프로파일 선택…</option>
                {profilesForType.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
              {selectedProfileId ? (
                <button
                  type="button"
                  className="ghost-button ghost-button--small"
                  onClick={() => handleDeleteProfile(selectedProfileId)}
                >
                  프로파일 삭제
                </button>
              ) : null}
            </div>

            {conversionType === "image-format" ? (
              <div className="converter-option converter-format-checkboxes">
                <span>변환할 형식 (여러 개 동시 선택 가능)</span>
                {["jpg", "png", "webp"].map((format) => (
                  <label key={format} className="converter-format-checkbox">
                    <input
                      type="checkbox"
                      checked={options.targetFormats.includes(format)}
                      onChange={() => setOptions({ ...options, targetFormats: toggleFormat(options.targetFormats, format) })}
                    />
                    {format.toUpperCase()}
                  </label>
                ))}
              </div>
            ) : null}

            {conversionType === "images-to-pdf" ? (
              <label className="converter-option converter-option--checkbox">
                <input
                  type="checkbox"
                  checked={options.mergeIntoSinglePdf}
                  onChange={(event) => setOptions({ ...options, mergeIntoSinglePdf: event.target.checked })}
                />
                여러 이미지를 파일명 순서로 하나의 PDF로 합치기
              </label>
            ) : null}

            {conversionType === "excel-csv" ? (
              <p className="converter-option-note">
                파일 확장자를 보고 자동으로 방향을 정해요 — 엑셀(.xlsx/.xls)은 CSV로, CSV는 엑셀로 변환돼요.
              </p>
            ) : null}

            {conversionType === "ascii-data" ? (
              <div className="converter-option converter-format-checkboxes">
                <span>변환할 형식 (여러 개 동시 선택 가능)</span>
                {[
                  { id: "csv", label: "CSV" },
                  { id: "xlsx", label: "엑셀(XLSX)" },
                  { id: "json", label: "JSON" },
                ].map((format) => (
                  <label key={format.id} className="converter-format-checkbox">
                    <input
                      type="checkbox"
                      checked={options.targetFormats.includes(format.id)}
                      onChange={() =>
                        setOptions({ ...options, targetFormats: toggleFormat(options.targetFormats, format.id) })
                      }
                    />
                    {format.label}
                  </label>
                ))}
              </div>
            ) : null}

            {conversionType === "excel-csv" || conversionType === "ascii-data" ? (
              <>
                <label className="converter-option">
                  인코딩
                  <select
                    value={options.encoding}
                    onChange={(event) => setOptions({ ...options, encoding: event.target.value })}
                  >
                    <option value="auto">자동 감지</option>
                    <option value="utf-8">UTF-8</option>
                    <option value="euc-kr">CP949(EUC-KR)</option>
                  </select>
                </label>
                <label className="converter-option">
                  구분자
                  <select
                    value={options.delimiter}
                    onChange={(event) => setOptions({ ...options, delimiter: event.target.value })}
                  >
                    <option value="auto">자동 감지</option>
                    <option value="comma">콤마(,)</option>
                    <option value="semicolon">세미콜론(;)</option>
                    <option value="tab">탭</option>
                  </select>
                </label>
                <p className="converter-option-note">
                  왼쪽 원본 미리보기가 깨지거나 컬럼이 이상하게 보이면 인코딩·구분자를 직접 골라보세요.
                </p>
              </>
            ) : null}

            <div className="converter-profile-save">
              <input
                type="text"
                placeholder="프로파일 이름"
                value={profileNameDraft}
                onChange={(event) => setProfileNameDraft(event.target.value)}
                maxLength={40}
              />
              <button
                type="button"
                className="ghost-button ghost-button--small"
                disabled={!profileNameDraft.trim() || savingProfile}
                onClick={handleSaveProfile}
              >
                저장
              </button>
            </div>
          </div>

          <div className="converter-output-row">
            <span>출력 폴더</span>
            {isWeb && !engine.supportsDirectoryPicker ? (
              <span className="converter-output-note">파일별로 다운로드돼요</span>
            ) : (
              <>
                <input type="text" readOnly value={outputTarget?.label || ""} placeholder="변환된 파일을 저장할 폴더를 선택해주세요" />
                <button type="button" className="ghost-button ghost-button--small" onClick={handleChooseOutputFolder}>
                  폴더 선택
                </button>
              </>
            )}
          </div>

          {diskWarning ? <p className="converter-disk-warning">⚠ {diskWarning}</p> : null}

          <div className="converter-preview-grid">
            <div className="converter-preview-pane">
              <p className="converter-preview-title">원본 미리보기</p>
              <ConverterPreviewPane kind={originalPreview?.kind} data={originalPreview?.data} />
            </div>
            <div className="converter-preview-pane">
              <p className="converter-preview-title">결과 미리보기</p>
              {activeResult && !activeResult.success ? (
                <p className="converter-preview-error">{activeResult.error}</p>
              ) : (
                <>
                  {activeResult?.success && activeResult.outputPaths.length > 1 ? (
                    <div className="converter-output-tabs">
                      {activeResult.outputPaths.map((outputRef, index) => (
                        <button
                          key={outputRefName(outputRef) + index}
                          type="button"
                          className={`converter-output-tab${index === selectedOutputIndex ? " converter-output-tab--active" : ""}`}
                          onClick={() => setSelectedOutputIndex(index)}
                        >
                          {outputRefName(outputRef)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <ConverterPreviewPane kind={resultPreview?.kind} data={resultPreview?.data} />
                </>
              )}
            </div>
          </div>

          {hasNoTargetFormats ? (
            <p className="converter-disk-warning">⚠ 변환할 형식을 하나 이상 선택해주세요.</p>
          ) : null}

          <div className="converter-action-row">
            <button
              type="button"
              className="button"
              disabled={supportedFiles.length === 0 || !outputTarget || isConverting || hasNoTargetFormats}
              onClick={handleStartConversion}
            >
              {isConverting ? "변환 중…" : "변환 시작"}
            </button>
            {isConverting ? (
              <button type="button" className="ghost-button" onClick={handleCancel}>
                취소
              </button>
            ) : null}
            {failedCount > 0 && !isConverting ? (
              <button type="button" className="ghost-button" onClick={handleRetryFailed}>
                실패 항목 전체 재시도 ({failedCount}개)
              </button>
            ) : null}
          </div>

          {progress ? (
            <div className="converter-progress">
              <div className="converter-progress__bar">
                <div
                  className="converter-progress__fill"
                  style={{
                    width: `${
                      ((progress.completedFiles + progress.currentFilePercent / 100) /
                        Math.max(1, progress.totalFiles)) *
                      100
                    }%`,
                  }}
                />
              </div>
              <p>
                {progress.completedFiles}/{progress.totalFiles} 파일 완료
                {progress.currentFileName ? ` — 현재: ${progress.currentFileName} (${progress.currentFilePercent}%)` : ""}
              </p>
            </div>
          ) : null}

          {Object.keys(results).length > 0 ? (
            <div className="converter-result-summary-row">
              <p className="converter-result-summary">
                성공 {successCount}개 · 실패 {failedCount}개
              </p>
              {typeof engine.openOutputFolder === "function" ? (
                <button
                  type="button"
                  className="ghost-button ghost-button--small"
                  onClick={() => engine.openOutputFolder(outputTarget)}
                >
                  결과 폴더 열기
                </button>
              ) : null}
            </div>
          ) : null}

          {notice ? <p className="converter-notice">{notice}</p> : null}
        </div>
      </div>
    </div>
  );
}
