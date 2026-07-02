import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import SimulatorResultPanel from "./SimulatorResultPanel";
import SimulatorProductsPanel from "./SimulatorProductsPanel";
import SimulatorHistoryPanel from "./SimulatorHistoryPanel";
import { COMPANY_OPTIONS } from "./companyDirectory";
import {
  MOTOR_TYPE_OPTIONS,
  PHASE_OPTIONS,
  PRODUCT_CATALOG,
  SCREW_TYPE_OPTIONS,
  SPEED_MODE_OPTIONS,
} from "./motorSimulatorData";
import {
  DEFAULT_MOTOR_IMAGE,
  ENVIRONMENT_OPTIONS,
  MOTOR_MAX_RPM,
  PRECISION_OPTIONS,
  SAFETY_FACTOR,
  EFFICIENCY,
  buildSimulationResult,
  calculateMotionProfile,
  fetchWebManualExtractions,
  fetchWebRecommendations,
  formatNumber,
  getAvailableScrewSpecs,
  getEncoderRecommendation,
  getLmGuideRecommendation,
  getProductRecommendations,
  getRecommendedBallScrew,
  getRecommendedReducer,
  getSelectedScrewSpec,
  getSummaryRecommendations,
  normalizeDecimalInput,
  roundToDecimals,
  validateInputs,
} from "./motorSimulatorLogic";
import { GRAVITY, parseNumber } from "./sharedUtils";

function useDebounced(value, delay = 200) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function MotorSimulator({ onBack, prefill }) {
  const [detailMode, setDetailMode] = useState(false);
  const [company, setCompany] = useState("all");
  const [motorType, setMotorType] = useState("전체");
  const [phaseType, setPhaseType] = useState("전체");
  const [environment, setEnvironment] = useState("general");
  const [precisionLevel, setPrecisionLevel] = useState("general");
  const [direction, setDirection] = useState("vertical");
  const [speedMode, setSpeedMode] = useState("constant");
  const [weight, setWeight] = useState(() =>
    prefill && Number.isFinite(prefill.weightKg) && prefill.weightKg > 0
      ? prefill.weightKg.toFixed(3)
      : "",
  );
  const [speed, setSpeed] = useState("");
  const [minSpeedInput, setMinSpeedInput] = useState("");
  const [maxSpeedInput, setMaxSpeedInput] = useState("");
  const [stroke, setStroke] = useState(
    prefill && Number.isFinite(prefill.strokeMm) && prefill.strokeMm > 0
      ? String(prefill.strokeMm)
      : "",
  );
  const [targetTime, setTargetTime] = useState("");
  const [screwType, setScrewType] = useState("ball");
  const [screwSpec, setScrewSpec] = useState("M16");
  const [lead, setLead] = useState("10");
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [webRecommendations, setWebRecommendations] = useState([]);
  const [webManuals, setWebManuals] = useState([]);
  const [webCandidateProducts, setWebCandidateProducts] = useState([]);
  const [webSearchStatus, setWebSearchStatus] = useState("idle");
  const [webSearchError, setWebSearchError] = useState("");
  const [webSearchParams, setWebSearchParams] = useState(null);
  const [isProductsExpanded, setIsProductsExpanded] = useState(false);
  const [isManualsExpanded, setIsManualsExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [cyclesPerMin, setCyclesPerMin] = useState("");
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [calcHistory, setCalcHistory] = useState([]);
  const historyRef = useRef(null);

  const availableScrewSpecs = useMemo(
    () => getAvailableScrewSpecs(screwType, detailMode),
    [screwType, detailMode],
  );
  const selectedScrewSpec = useMemo(
    () => getSelectedScrewSpec(screwType, screwSpec, detailMode),
    [screwType, screwSpec, detailMode],
  );

  // 타이핑 중 계산 억제 — 200ms 후 실행
  const dWeight = useDebounced(weight, 200);
  const dStroke = useDebounced(stroke, 200);
  const dSpeed = useDebounced(speed, 200);
  const dMaxSpeed = useDebounced(maxSpeedInput, 200);
  const dMinSpeed = useDebounced(minSpeedInput, 200);
  const dTargetTime = useDebounced(targetTime, 200);

  const weightKg = useMemo(() => roundToDecimals(parseNumber(dWeight), 3), [dWeight]);
  const strokeMm = useMemo(() => parseNumber(dStroke), [dStroke]);
  const inputSpeedMm = useMemo(
    () => speedMode === "constant" ? parseNumber(dSpeed) : parseNumber(dMaxSpeed),
    [speedMode, dSpeed, dMaxSpeed],
  );
  const targetTimeSec = useMemo(() => parseNumber(dTargetTime), [dTargetTime]);

  const targetDrivenSpeedMm = useMemo(() =>
    strokeMm !== null && strokeMm > 0 && targetTimeSec !== null && targetTimeSec > 0
      ? roundToDecimals(strokeMm / targetTimeSec, 3)
      : null,
    [strokeMm, targetTimeSec],
  );
  const derivedSpeedMm = useMemo(() =>
    inputSpeedMm === null && targetDrivenSpeedMm !== null
      ? roundToDecimals(targetDrivenSpeedMm * 1.5, 3)
      : null,
    [inputSpeedMm, targetDrivenSpeedMm],
  );
  const designSpeedMm = useMemo(() =>
    inputSpeedMm !== null || derivedSpeedMm !== null || targetDrivenSpeedMm !== null
      ? roundToDecimals(Math.max(inputSpeedMm ?? 0, derivedSpeedMm ?? 0, targetDrivenSpeedMm ?? 0), 3)
      : null,
    [inputSpeedMm, derivedSpeedMm, targetDrivenSpeedMm],
  );

  const previewMotionProfile = useMemo(
    () => calculateMotionProfile(strokeMm, designSpeedMm ?? inputSpeedMm ?? 0, targetTimeSec),
    [strokeMm, designSpeedMm, inputSpeedMm, targetTimeSec],
  );
  const previewPeakForceN = useMemo(() =>
    weightKg !== null
      ? weightKg * 9.81 * (direction === "vertical" ? 1.0 : 0.05) +
        weightKg * (previewMotionProfile.accelerationMmS2 / 1000)
      : null,
    [weightKg, direction, previewMotionProfile],
  );
  const ballScrewRecommendation = useMemo(
    () => getRecommendedBallScrew(
      previewPeakForceN ?? (weightKg ?? 20) * 9.81,
      designSpeedMm ?? inputSpeedMm ?? 0,
      strokeMm ?? 200,
    ),
    [previewPeakForceN, weightKg, designSpeedMm, inputSpeedMm, strokeMm],
  );
  const appliedLeadMm = useMemo(() =>
    detailMode && selectedScrewSpec.value === "CUSTOM"
      ? parseNumber(lead)
      : detailMode
        ? selectedScrewSpec.leadMm
        : ballScrewRecommendation.leadMm,
    [detailMode, selectedScrewSpec, lead, ballScrewRecommendation],
  );

  const numericInputs = useMemo(() => ({
    speedMode,
    direction,
    weightKg,
    inputSpeedMm,
    speedMm: designSpeedMm,
    minSpeedMm: speedMode === "variable" ? parseNumber(dMinSpeed) : null,
    maxSpeedMm: speedMode === "variable" ? parseNumber(dMaxSpeed) : null,
    strokeMm,
    targetTimeSec,
    targetDrivenSpeedMm,
    leadMm: appliedLeadMm,
    customLeadRequired: detailMode && selectedScrewSpec.value === "CUSTOM",
  }), [speedMode, direction, weightKg, inputSpeedMm, designSpeedMm, dMinSpeed, dMaxSpeed,
    strokeMm, targetTimeSec, targetDrivenSpeedMm, appliedLeadMm, detailMode, selectedScrewSpec]);

  const summaryRecommendations = useMemo(
    () => result?.summaryRecommendations ?? getSummaryRecommendations(result?.productRecommendations ?? []),
    [result],
  );
  const featuredRecommendations = useMemo(
    () => summaryRecommendations.filter(
      (p) => p.recommendationTierKey === "optimal" || p.recommendationTierKey === "best",
    ),
    [summaryRecommendations],
  );

  // 듀티사이클 / 발열 계산
  const thermalCalc = useMemo(() => {
    const cyclesPerMinNum = parseNumber(cyclesPerMin);
    const tMove = result?.moveTime ?? null;
    const dutyCycle = (cyclesPerMinNum && cyclesPerMinNum > 0 && tMove && tMove > 0)
      ? Math.min((tMove * cyclesPerMinNum * (isRoundTrip ? 2 : 1)) / 60, 1.0)
      : null;
    const avgPower = dutyCycle != null && result?.power ? result.power * dutyCycle : null;
    const thermalWarnLevel = dutyCycle == null ? null : dutyCycle > 0.75 ? "danger" : dutyCycle > 0.45 ? "caution" : "ok";
    const thermalWarnMsg =
      thermalWarnLevel === "danger" ? `듀티사이클 ${(dutyCycle * 100).toFixed(0)}% — 연속 운전에 준하는 부하입니다. 모터 정격 연속 출력(S1)과 방열 조건을 반드시 확인하세요.`
      : thermalWarnLevel === "caution" ? `듀티사이클 ${(dutyCycle * 100).toFixed(0)}% — 간헐 운전이지만 부하가 높습니다. 카탈로그의 S3/S6 간헐 정격 곡선을 확인하세요.`
      : null;
    return { dutyCycle, avgPower, thermalWarnLevel, thermalWarnMsg };
  }, [cyclesPerMin, result, isRoundTrip]);
  const { dutyCycle, avgPower, thermalWarnLevel, thermalWarnMsg } = thermalCalc;

  const runWebSearch = async (params) => {
    setWebSearchParams(params);
    setWebSearchStatus("loading");
    setWebSearchError("");
    setWebRecommendations([]);
    setWebManuals([]);
    setWebCandidateProducts([]);

    try {
      const [productData, manualData] = await Promise.all([
        fetchWebRecommendations(params),
        fetchWebManualExtractions(params),
      ]);

      setWebRecommendations(productData.results);
      setWebManuals(manualData.results);
      setWebCandidateProducts(manualData.candidates);
      setWebSearchError(productData.error || manualData.error);
      setWebSearchStatus("done");
      return {
        recommendations: productData.results,
        manuals: manualData.results,
        candidates: manualData.candidates,
        error: productData.error || manualData.error,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "웹 검색을 불러오지 못했습니다.";
      setWebRecommendations([]);
      setWebManuals([]);
      setWebCandidateProducts([]);
      setWebSearchError(message);
      setWebSearchStatus("error");
      return {
        recommendations: [],
        manuals: [],
        candidates: [],
        error: message,
      };
    }
  };

  const handleCalculate = async (event) => {
    event.preventDefault();

    const nextErrors = validateInputs(numericInputs);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setResult(null);
      setWebRecommendations([]);
      setWebManuals([]);
      setWebCandidateProducts([]);
      setWebSearchStatus("idle");
      setWebSearchError("");
      setWebSearchParams(null);
      return;
    }

    const speedMps = numericInputs.speedMm / 1000;
    const leadMeters = numericInputs.leadMm / 1000;

    // 사다리꼴 속도 프로파일로 가속도 계산
    const motionProfile = calculateMotionProfile(numericInputs.strokeMm, numericInputs.speedMm, numericInputs.targetTimeSec);
    const accelMpS2 = motionProfile.accelerationMmS2 / 1000; // mm/s² → m/s²

    // 피크 추력 = 정하중 + 가속 구간 동하중
    const frictionLoad = direction === "vertical" ? 0 : numericInputs.weightKg * GRAVITY * 0.05; // LM가이드 마찰 μ=0.05
    const gravityLoad = direction === "vertical" ? numericInputs.weightKg * GRAVITY : 0;
    const accelerationLoad = numericInputs.weightKg * accelMpS2;
    const thrust = gravityLoad + frictionLoad + accelerationLoad; // 동적 피크 추력 (N)

    const torque = (thrust * leadMeters) / (2 * Math.PI * EFFICIENCY);
    const peakTorque = torque * SAFETY_FACTOR;
    const rpm = (speedMps / leadMeters) * 60;
    const power = (thrust * speedMps) / EFFICIENCY;
    const designPower = power * SAFETY_FACTOR;
    const gearRatio = rpm > 0 ? Number((MOTOR_MAX_RPM / rpm).toFixed(1)) : 0;
    const fallbackReducer = getRecommendedReducer(gearRatio, torque);

    // 볼스크류 · LM가이드를 실제 계산된 피크 추력으로 재선정
    const finalBallScrewRecommendation = getRecommendedBallScrew(thrust, numericInputs.speedMm, numericInputs.strokeMm);
    const finalLmGuideRecommendation = getLmGuideRecommendation(thrust * SAFETY_FACTOR, environment, true);

    const recommendationParams = {
      company,
      motorType,
      phaseType,
      direction,
      designPower,
      peakTorque,
      rpm,
      thrust,
      speedMm: numericInputs.speedMm,
      environment,
      precisionLevel,
    };

    const productRecommendations = getProductRecommendations(recommendationParams);
    const nextResult = buildSimulationResult({
      company,
      direction,
      environment,
      precisionLevel,
      numericInputs: { ...numericInputs, motionProfile },
      designPower,
      peakTorque,
      rpm,
      thrust,
      power,
      torque,
      gearRatio,
      fallbackReducer,
      productRecommendations,
      ballScrewRecommendation: finalBallScrewRecommendation,
      lmGuideRecommendation: finalLmGuideRecommendation,
    });

    setResult(nextResult);
    setCalcHistory((prev) => [
      { id: Date.now(), params: { weightKg: numericInputs.weightKg, strokeMm: numericInputs.strokeMm, speedMm: numericInputs.speedMm, direction, targetTimeSec: numericInputs.targetTimeSec }, result: nextResult },
      ...prev.slice(0, 4),
    ]);

    const searchPayload = {
      company,
      motorType,
      phaseType,
      direction,
      requiredPowerW: designPower,
      requiredTorqueNm: peakTorque,
      requiredRpm: rpm,
      requiredForceN: thrust,
      requiredSpeedMmS: numericInputs.speedMm,
    };

    const webSearchData = await runWebSearch(searchPayload);

    if (webSearchData.candidates.length > 0) {
      const mergedRecommendations = getProductRecommendations({
        ...recommendationParams,
        catalog: [...PRODUCT_CATALOG, ...webSearchData.candidates],
      });

      setResult(
        buildSimulationResult({
          company,
          direction,
          environment,
          precisionLevel,
          numericInputs: { ...numericInputs, motionProfile },
          designPower,
          peakTorque,
          rpm,
          thrust,
          power,
          torque,
          gearRatio,
          fallbackReducer,
          productRecommendations: mergedRecommendations,
          ballScrewRecommendation: finalBallScrewRecommendation,
          lmGuideRecommendation: finalLmGuideRecommendation,
        }),
      );
    }
  };

  return (
    <div className="app app--simulator">
      <header className="app-header app-header--simulator">
        <div>
          <p className="page-kicker">Motion Design Assistant</p>
          <h1>모션 설계 도우미</h1>
          <p>Motor · Reducer · Ball Screw · LM Guide · Encoder를 한 화면에서 통합 추천합니다.</p>
        </div>
        <button type="button" className="ghost-button" onClick={onBack}>
          대문으로 돌아가기
        </button>
      </header>

      <main className="card-grid">
        <section className="card card--input">
          <h2>기본 입력</h2>
          <div className="note-box note-box--quick">
            <h3>빠른 입력 가이드</h3>
            <ul>
              <li>처음에는 이동 방향, 하중, 이송 거리, 속도만 넣으면 됩니다.</li>
              <li>기본값은 전체 회사 비교이며, 볼스크류와 LM가이드도 자동 추천됩니다.</li>
              <li>속도는 정속과 가변속 중에서 바로 선택할 수 있고, 상세 모드에서는 회사·환경·정밀도·수동 나사 조건을 더 조정합니다.</li>
            </ul>
          </div>

          <form className="form" onSubmit={handleCalculate}>
            <label className="field">
              <span>이동 방향</span>
              <select value={direction} onChange={(event) => setDirection(event.target.value)}>
                <option value="vertical">수직</option>
                <option value="horizontal">수평</option>
              </select>
              <small className="field-help">
                수직은 중력 하중을 직접 반영하고, 수평은 가이드 저항을 반영한 완화 조건으로 계산합니다.
              </small>
              {errors.direction ? <small className="error">{errors.direction}</small> : null}
            </label>

            <label className="field">
              <span>하중 (kg)</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                onBlur={() => setWeight((current) => normalizeDecimalInput(current, 3))}
                placeholder="예: 15.500"
              />
              {errors.weight ? <small className="error">{errors.weight}</small> : null}
            </label>

            <label className="field">
              <span>이송 거리 (mm)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={stroke}
                onChange={(event) => setStroke(event.target.value)}
                placeholder="예: 100"
              />
              {errors.stroke ? <small className="error">{errors.stroke}</small> : null}
            </label>

            <label className="field">
              <span>속도 방식</span>
              <select value={speedMode} onChange={(event) => setSpeedMode(event.target.value)}>
                {SPEED_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small className="field-help">가변속은 최대속도를 기준으로 모터와 감속기 여유를 계산합니다.</small>
            </label>

            {speedMode === "variable" ? (
              <div className="speed-range">
                <label className="field">
                  <span>최소속도 (mm/s, 선택)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={minSpeedInput}
                    onChange={(event) => setMinSpeedInput(event.target.value)}
                    placeholder="예: 20"
                  />
                  {errors.minSpeed ? <small className="error">{errors.minSpeed}</small> : null}
                </label>
                <label className="field">
                  <span>최대속도 (mm/s, 선택)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={maxSpeedInput}
                    onChange={(event) => setMaxSpeedInput(event.target.value)}
                    placeholder="예: 120"
                  />
                  {errors.maxSpeed ? <small className="error">{errors.maxSpeed}</small> : null}
                </label>
              </div>
            ) : (
              <label className="field">
                <span>속도 (mm/s, 선택)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={speed}
                  onChange={(event) => setSpeed(event.target.value)}
                  placeholder="예: 120"
                />
                <small className="field-help">속도를 모르면 비워도 됩니다 — 목표 시간과 이송 거리로 자동 역산합니다.</small>
                {errors.speed ? <small className="error">{errors.speed}</small> : null}
              </label>
            )}

            <label className="field">
              <span>목표 시간 (sec, 선택)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={targetTime}
                onChange={(event) => setTargetTime(event.target.value)}
                placeholder="예: 5"
              />
              <small className="field-help">속도를 모르면 이송 거리 ÷ 목표 시간으로 역산합니다. 속도와 시간 중 하나만 있어도 계산됩니다.</small>
              {errors.targetTime ? <small className="error">{errors.targetTime}</small> : null}
            </label>

            <label className="field">
              <span>이송 횟수 (회/분, 선택)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={cyclesPerMin}
                onChange={(e) => setCyclesPerMin(e.target.value)}
                placeholder="예: 10"
              />
              <small className="field-help">입력 시 듀티사이클·발열 경고를 계산합니다.</small>
            </label>

            <label className="check-field" style={{ marginBottom: "8px" }}>
              <input type="checkbox" checked={isRoundTrip} onChange={(e) => setIsRoundTrip(e.target.checked)} />
              <span>왕복 이송 (편도×2)</span>
            </label>

            <div className="detail-toggle">
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={detailMode}
                  onChange={(event) => {
                    const nextChecked = event.target.checked;
                    setDetailMode(nextChecked);

                    if (!nextChecked) {
                      setCompany("all");
                      setMotorType("전체");
                      setPhaseType("전체");
                      setEnvironment("general");
                      setPrecisionLevel("general");
                    }
                  }}
                />
                <span>상세 모드</span>
              </label>
              <small className="detail-help">
                상세 모드에서 회사, 정밀도, 환경 조건, 모터 종류, 수동 볼스크류 조건을 조정할 수 있습니다.
              </small>
            </div>


            {detailMode ? (
              <>
                <label className="field">
                  <span>회사 선택</span>
                  <select value={company} onChange={(event) => setCompany(event.target.value)}>
                    {COMPANY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>정밀도 기준</span>
                  <select value={precisionLevel} onChange={(event) => setPrecisionLevel(event.target.value)}>
                    {PRECISION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>환경 조건</span>
                  <select value={environment} onChange={(event) => setEnvironment(event.target.value)}>
                    {ENVIRONMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>모터 종류</span>
                  <select value={motorType} onChange={(event) => setMotorType(event.target.value)}>
                    {MOTOR_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>전원/상 연결</span>
                  <select value={phaseType} onChange={(event) => setPhaseType(event.target.value)}>
                    {PHASE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>수동 볼스크류 방식</span>
                  <select
                    value={screwType}
                    onChange={(event) => {
                      const nextType = event.target.value;
                      const nextSpecs = getAvailableScrewSpecs(nextType, true);
                      setScrewType(nextType);
                      setScrewSpec(nextSpecs[0]?.value ?? "CUSTOM");
                    }}
                  >
                    {SCREW_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>수동 나사 크기</span>
                  <select value={screwSpec} onChange={(event) => setScrewSpec(event.target.value)}>
                    {availableScrewSpecs.map((option) => (
                      <option key={`${screwType}-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <small className="field-help">{selectedScrewSpec.guide}</small>
                </label>

                {selectedScrewSpec.value === "CUSTOM" ? (
                  <label className="field">
                    <span>리드 직접 입력 (mm/rev)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={lead}
                      onChange={(event) => setLead(event.target.value)}
                      placeholder="예: 10"
                    />
                    {errors.lead ? <small className="error">{errors.lead}</small> : null}
                  </label>
                ) : (
                  <div className="detail-static">
                    <span>수동 적용 리드</span>
                    <strong>{selectedScrewSpec.leadMm} mm/rev</strong>
                  </div>
                )}
              </>
            ) : null}

            <div className="input-actions">
              <button type="submit" className="button">
                패키지 추천 계산
              </button>
            </div>
          </form>
        </section>

        <div className="right-column">
        <section className="card card--summary">
          <div className="summary-header-row">
            <h2>추천 결과</h2>
            {result ? (
              <div className={`status status--${result.statusKey}`}>
                판정: <strong>{result.status}</strong>
              </div>
            ) : null}
          </div>
          <SimulatorResultPanel
            result={result}
            featuredRecommendations={featuredRecommendations}
            previewMotionProfile={previewMotionProfile}
            previewPeakForceN={previewPeakForceN}
            ballScrewRecommendation={ballScrewRecommendation}
            environment={environment}
            precisionLevel={precisionLevel}
            weightKg={weightKg}
            thermalWarnMsg={thermalWarnMsg}
            thermalWarnLevel={thermalWarnLevel}
            dutyCycle={dutyCycle}
            avgPower={avgPower}
            DEFAULT_MOTOR_IMAGE={DEFAULT_MOTOR_IMAGE}
          />
        </section>
        </div>

      </main>
    </div>
  );
}
