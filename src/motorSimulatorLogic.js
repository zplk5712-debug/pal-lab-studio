import { COMPANY_OPTIONS, COMPANY_SITE_LINKS } from "./companyDirectory";
import {
  COMPANY_MANUALS,
  PRODUCT_CATALOG,
  SCREW_SPEC_OPTIONS,
} from "./motorSimulatorData";
import { GRAVITY, parseNumber } from "./sharedUtils";
import motorPlaceholderUrl from "../public/motor-placeholder.svg?url";

export const EFFICIENCY = 0.9;
export const SAFETY_FACTOR = 1.5;
export const MOTOR_MAX_RPM = 3000;
export const DEFAULT_MOTOR_IMAGE = motorPlaceholderUrl;
const STANDARD_GEAR_RATIOS = [1, 3, 5, 7, 10, 15, 20, 30, 50];
// 별도 감속기 부착 시 사용할 수 있는 표준 감속비 목록
const STANDARD_EXTERNAL_REDUCER_RATIOS = [3, 5, 10, 15, 20, 25, 30, 50];
const TARGET_REDUCER_RATIO = 5; // 감속기 경로 물리 계산 기준 감속비

export const RECOMMENDATION_TIER_META = {
  optimal: {
    label: "최적",
    description: "감속기 포함 구조를 우선 적용해 안정적으로 쓰기 좋은 대표 모델입니다.",
  },
  best: {
    label: "최선",
    description: "감속기 미포함 직결형 또는 일체형 대안입니다.",
  },
  secondary: {
    label: "비교 후보",
    description: "대표 2개 외에 함께 비교해볼 만한 추가 후보입니다.",
  },
};

export const CONFIDENCE_META = {
  optimal: {
    label: "최적",
    description: "여유율이 충분해서 실사용 기준으로 안정적인 편입니다.",
  },
  suitable: {
    label: "적합",
    description: "적용 가능하지만 실제 조립 조건을 한 번 더 확인하는 편이 좋습니다.",
  },
  caution: {
    label: "주의",
    description: "조건 여유가 작아서 주문 전 재검토가 필요합니다.",
  },
};

export const ENVIRONMENT_OPTIONS = [
  { value: "general", label: "일반 산업환경" },
  { value: "cleanroom", label: "클린룸" },
  { value: "vacuum", label: "진공 (헤드만 진공, 모터 외부)" },
  { value: "dust", label: "분진 환경" },
  { value: "high-temp", label: "고온 환경" },
];

export const PRECISION_OPTIONS = [
  { value: "general", label: "일반 이송" },
  { value: "precision", label: "정밀 위치결정" },
  { value: "high-precision", label: "고정밀 장비" },
];

export function roundToDecimals(value, digits = 3) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

export function normalizeDecimalInput(value, digits = 3) {
  const parsed = parseNumber(value);

  if (parsed === null) {
    return "";
  }

  return parsed.toFixed(digits);
}

export function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return Number(value).toLocaleString("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function getAvailableScrewSpecs(screwType, detailMode) {
  return SCREW_SPEC_OPTIONS.filter((option) => {
    if (detailMode && option.value === "CUSTOM") {
      return true;
    }

    return option.screwType === screwType;
  });
}

export function getSelectedScrewSpec(screwType, screwSpec, detailMode) {
  const availableSpecs = getAvailableScrewSpecs(screwType, detailMode);
  return availableSpecs.find((option) => option.value === screwSpec) ?? availableSpecs[0];
}

export function getEnvironmentLabel(environment) {
  return ENVIRONMENT_OPTIONS.find((option) => option.value === environment)?.label ?? "일반 산업환경";
}

export function getPrecisionLabel(precisionLevel) {
  return PRECISION_OPTIONS.find((option) => option.value === precisionLevel)?.label ?? "일반 이송";
}

export function getRecommendedReducer(requiredRatio, torque) {
  const safeRatio = Math.max(requiredRatio, 1);
  const selectedRatio =
    STANDARD_GEAR_RATIOS.find((ratio) => ratio >= safeRatio) ??
    STANDARD_GEAR_RATIOS[STANDARD_GEAR_RATIOS.length - 1];

  let type = "직결";
  let guide = "감속기 없이 커플링 직결 검토";

  if (selectedRatio > 1 && selectedRatio <= 10) {
    type = "유성감속기";
    guide = "표준 단단 유성감속기 권장";
  } else if (selectedRatio > 10 && selectedRatio <= 30) {
    type = "고감속 유성감속기";
    guide = "2단 유성감속기 또는 고감속 사양 검토";
  } else if (selectedRatio > 30) {
    type = "특주 감속기";
    guide = "고비율 감속기 또는 구조 변경 검토";
  }

  let size = "소형";

  if (torque > 5 && torque <= 20) {
    size = "중형";
  } else if (torque > 20) {
    size = "대형";
  }

  return {
    type,
    ratio: selectedRatio,
    size,
    guide,
  };
}

function buildExpertReview({
  selectedProduct,
  direction,
  numericInputs,
  thrust,
  peakTorque,
  rpm,
  power,
  fallbackReducer,
  moveTime,
}) {
  const selectedRatio = selectedProduct?.matchedRatio ?? fallbackReducer.ratio;
  const speedText =
    numericInputs.speedMode === "variable" &&
    Number.isFinite(numericInputs.minSpeedMm) &&
    Number.isFinite(numericInputs.maxSpeedMm)
      ? `${formatNumber(numericInputs.minSpeedMm, 1)} ~ ${formatNumber(numericInputs.maxSpeedMm, 1)} mm/s`
      : `${formatNumber(numericInputs.speedMm, 1)} mm/s`;

  const selectionReason = selectedProduct
    ? selectedProduct.driveMode === "linear-direct"
      ? `${selectedProduct.company} ${selectedProduct.series} 계열은 직결 구조로 추력 ${formatNumber(thrust, 1)} N과 속도 ${speedText} 조건을 직접 대응할 수 있어서 최선 후보로 유지했습니다.`
      : `${selectedProduct.company} ${selectedProduct.series} 계열은 필요 토크 ${formatNumber(peakTorque, 2)} N·m, 필요 속도 ${formatNumber(rpm, 0)} rpm, 필요 출력 ${formatNumber(power, 1)} W 조건을 만족하면서 감속기로 모터 부하를 줄이기 쉬운 편이라 최적 후보로 우선 추천했습니다.`
    : "현재 등록된 모델 기준으로 바로 맞는 후보가 부족해 회사별 카탈로그와 공식 사이트 비교가 필요한 상태입니다.";

  const applicationGuide =
    direction === "vertical"
      ? "수직 이송 조건으로 계산해 중력 하중을 직접 반영했습니다. 실제 선정 시에는 브레이크와 정전 시 자중 유지 구조를 같이 확인하는 편이 좋습니다."
      : "수평 이송 조건으로 계산해 가이드 저항 중심으로 반영했습니다. 실제 현장에서는 케이블 체인과 마찰 증가분을 추가 하중으로 보는 편이 안전합니다.";

  const orderChecks = [];

  if (numericInputs.strokeMm !== null && moveTime !== null) {
    orderChecks.push(`이송 거리 ${formatNumber(numericInputs.strokeMm, 1)} mm 기준 예상 이동 시간은 ${formatNumber(moveTime, 2)} sec 입니다.`);
  }

  if (numericInputs.targetTimeSec !== null && numericInputs.targetDrivenSpeedMm !== null) {
    orderChecks.push(`목표 시간 ${formatNumber(numericInputs.targetTimeSec, 2)} sec를 맞추려면 평균 속도 ${formatNumber(numericInputs.targetDrivenSpeedMm, 1)} mm/s 이상이 필요합니다.`);
  }

  if (selectedProduct?.driveMode !== "linear-direct" && selectedRatio >= 20) {
    orderChecks.push("감속비가 큰 편이라 백래시와 응답성을 주문 전에 확인하는 편이 좋습니다.");
  }

  if (direction === "vertical") {
    orderChecks.push("수직축은 브레이크 옵션 또는 추락 방지 구조를 우선 확인하세요.");
  }

  orderChecks.push("볼스크류 리드, LM가이드 블록 수량, 모터 설치면 강성은 실제 조립도와 함께 최종 확인하세요.");

  return {
    selectionReason,
    applicationGuide,
    orderChecks,
  };
}

function findMatchingRatio(availableRatios, maxAllowedRatio) {
  const safeRatio = Math.max(maxAllowedRatio, 1);
  const sortedRatios = [...availableRatios].sort((left, right) => left - right);
  const matchedRatios = sortedRatios.filter((ratio) => ratio <= safeRatio);

  return matchedRatios.length > 0 ? matchedRatios[matchedRatios.length - 1] : null;
}

function getOutputTorqueLimit(product, matchedRatio) {
  if (product.maxOutputTorqueNm !== undefined) {
    return product.maxOutputTorqueNm;
  }

  if (product.ratedMotorTorqueNm !== undefined) {
    return product.ratedMotorTorqueNm * matchedRatio * 0.92;
  }

  return 0;
}

function isDirectDriveProduct(product) {
  return product.driveMode === "linear-direct" || product.gearheadType === "직결 / 감속기 없음";
}

function isStepperMotorProduct(product) {
  return typeof product.motorType === "string" && product.motorType.includes("스텝모터");
}

function getMarginPercent(capacity, requirement) {
  if (!Number.isFinite(capacity) || !Number.isFinite(requirement) || requirement <= 0) {
    return 100;
  }

  return ((capacity - requirement) / requirement) * 100;
}

function getConfidenceMeta(marginPercent) {
  if (marginPercent >= 50) {
    return { key: "optimal", ...CONFIDENCE_META.optimal };
  }

  if (marginPercent >= 20) {
    return { key: "suitable", ...CONFIDENCE_META.suitable };
  }

  return { key: "caution", ...CONFIDENCE_META.caution };
}

function passesEnvironmentCompatibility(product, environment) {
  if (environment === "vacuum") {
    return product.company !== "Hyosung";
  }

  if (environment === "cleanroom") {
    return product.motorType !== "3상 유도전동기";
  }

  return true;
}

function attachConfidenceInfo(product, requirements) {
  const margins =
    product.driveMode === "linear-direct"
      ? [
          getMarginPercent(product.maxLinearForceN ?? 0, requirements.thrust),
          getMarginPercent(product.maxLinearSpeedMmS ?? 0, requirements.requiredSpeedMm),
          getMarginPercent(product.powerW ?? 0, requirements.designPower),
        ]
      : [
          getMarginPercent(product.outputTorqueLimitNm ?? 0, requirements.peakTorque),
          getMarginPercent(product.maxOutputSpeed ?? 0, requirements.requiredRpm),
          getMarginPercent(product.powerW ?? 0, requirements.designPower),
        ];

  const validMargins = margins.filter((value) => Number.isFinite(value));
  const minimumMarginPercent = validMargins.length > 0 ? Math.min(...validMargins) : -100;
  const confidence = getConfidenceMeta(minimumMarginPercent);

  return {
    ...product,
    minimumMarginPercent,
    confidenceKey: confidence.key,
    confidenceLabel: confidence.label,
    confidenceDescription: confidence.description,
  };
}

function assignRecommendationTier(product, tierKey, rank) {
  return {
    ...product,
    recommendationRank: rank,
    recommendationTierKey: tierKey,
    recommendationTierLabel: RECOMMENDATION_TIER_META[tierKey].label,
    recommendationTierDescription: RECOMMENDATION_TIER_META[tierKey].description,
  };
}

function createRecommendationPlaceholder(tierKey) {
  const placeholderMap = {
    optimal: {
      series: "감속기 포함형 자동 비교",
      productName: "감속기 포함 최적 모델 탐색 중",
      sampleModel: "등록 DB와 공식 사이트 비교 후보를 이어서 확인해 감속기 포함 패키지를 좁히는 단계입니다.",
      motorType: "감속기 포함 패키지",
      gearheadType: "감속기 포함형 자동 탐색",
      notes: "현재 입력 조건을 유지한 채 감속기 포함 패키지를 우선 비교하도록 정리했습니다.",
    },
    best: {
      series: "직결형 자동 비교",
      productName: "직결 최선 모델 탐색 중",
      sampleModel: "등록 DB 직결 후보가 부족하면 가장 가까운 대안을 함께 비교해 볼 수 있습니다.",
      motorType: "직결형 대안",
      gearheadType: "직결 / 감속기 없음",
      notes: "직결형 우선 비교를 시도하되, 후보가 부족하면 다른 실사용 대안도 함께 보도록 구성했습니다.",
    },
    secondary: {
      series: "비교 후보 자동 비교",
      productName: "비교 후보 추가 탐색 중",
      sampleModel: "공식 사이트와 등록 DB에서 비교 가능한 추가 후보를 이어서 확인합니다.",
      motorType: "비교 후보",
      gearheadType: "추가 대안 검토",
      notes: "대표 후보 외에 추가 비교 후보가 보이면 아래 비교 후보 상세에 이어서 표시합니다.",
    },
  };

  const rank = tierKey === "optimal" ? 1 : tierKey === "best" ? 2 : 3;

  return {
    company: "추천 보류",
    series: placeholderMap[tierKey].series,
    productName: placeholderMap[tierKey].productName,
    modelNumber: "-",
    sampleModel: placeholderMap[tierKey].sampleModel,
    motorType: placeholderMap[tierKey].motorType,
    phaseTypes: [],
    imageUrl: DEFAULT_MOTOR_IMAGE,
    powerW: 0,
    gearheadType: placeholderMap[tierKey].gearheadType,
    matchedRatio: null,
    notes: placeholderMap[tierKey].notes,
    sourceUrl: "",
    sourceType: "placeholder",
    isPlaceholder: true,
    confidenceKey: "caution",
    confidenceLabel: "주의",
    confidenceDescription: "등록 DB 후보가 부족해 공식 비교와 자동 탐색 결과를 함께 보는 단계입니다.",
    minimumMarginPercent: -100,
    recommendationRank: rank,
    recommendationTierKey: tierKey,
    recommendationTierLabel: RECOMMENDATION_TIER_META[tierKey].label,
    recommendationTierDescription: RECOMMENDATION_TIER_META[tierKey].description,
  };
}

export function getSummaryRecommendations(products) {
  const optimalProduct = products.find((product) => product.recommendationTierKey === "optimal") ?? null;
  const bestProduct = products.find((product) => product.recommendationTierKey === "best") ?? null;
  const secondaryProduct = products.find((product) => product.recommendationTierKey === "secondary") ?? null;

  return [
    optimalProduct ?? createRecommendationPlaceholder("optimal"),
    bestProduct ?? createRecommendationPlaceholder("best"),
    secondaryProduct ?? createRecommendationPlaceholder("secondary"),
  ];
}

export function getRecommendationSlotTitle(product) {
  if (product.recommendationTierKey === "optimal") {
    return "감속기 포함";
  }

  if (product.recommendationTierKey === "best") {
    return "직결형";
  }

  return "비교 후보";
}

export function getRecommendationBadgeText(product) {
  if (product.recommendationTierKey === "optimal") {
    return "1순위 · 감속기 포함";
  }

  if (product.recommendationTierKey === "best") {
    return "2순위 · 직결형";
  }

  return "비교 후보";
}

export function getRecommendationDriveSummary(product) {
  if (product.isPlaceholder) {
    return product.gearheadType;
  }

  if (product.driveMode === "linear-direct") {
    return "직결형 액추에이터 / 감속기 없음";
  }

  const ratioText = product.matchedRatio ? `${product.matchedRatio}:1` : "감속비 재확인";
  return `${product.gearheadType} / ${ratioText}`;
}

export function getProductModelNumber(product) {
  return product.modelNumber ?? product.sampleModel ?? "-";
}

export function getProductSpecSummary(product) {
  if (product.isPlaceholder) {
    return product.sampleModel;
  }

  if (product.driveMode === "linear-direct") {
    return `정격 전력 ${formatNumber(product.powerW, 1)} W / 최대 속도 ${formatNumber(product.maxLinearSpeedMmS, 0)} mm/s / 최대 추력 ${formatNumber(product.maxLinearForceN, 1)} N`;
  }

  return `정격 전력 ${formatNumber(product.powerW, 1)} W / 모터 최대 ${formatNumber(product.maxMotorRpm, 0)} rpm / 감속기 ${product.gearheadType}`;
}

export function getProductCapabilityLabel(product) {
  if (product.isPlaceholder) {
    return product.notes;
  }

  if (product.driveMode === "linear-direct") {
    return `${product.gearheadType} / ${formatNumber(product.maxLinearSpeedMmS, 0)} mm/s / ${formatNumber(product.maxLinearForceN, 1)} N`;
  }

  return `${product.gearheadType} / ${product.matchedRatio}:1 / ${formatNumber(product.outputTorqueLimitNm, 1)} N·m`;
}

const STANDARD_LEADS_MM = [1, 2, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32, 40, 50];

// 볼스크류 허용 좌굴 하중 기반 최소 축경 추정 (Euler 간이식, λ=60 기준)
function getMinScrewDiameterMm(peakForceN, strokeMm) {
  // 좌굴 허용 하중 Fk = π²·E·I / (λ·L)²  → 역산
  // 간이화: d_min(mm) ≈ 2.0 × (F × L²)^(1/4) where F in N, L in m
  const L = Math.max(strokeMm / 1000, 0.05); // m
  const d_mm = 2.0 * Math.pow(peakForceN * L * L, 0.25);
  return d_mm;
}

function getScrewSpecFromDiameter(d_mm) {
  if (d_mm <= 10) return { value: "M10", label: "M10" };
  if (d_mm <= 12) return { value: "M12", label: "M12" };
  if (d_mm <= 16) return { value: "M16", label: "M16" };
  if (d_mm <= 20) return { value: "M20", label: "M20" };
  if (d_mm <= 25) return { value: "M25", label: "M25" };
  if (d_mm <= 32) return { value: "M32", label: "M32" };
  return { value: "M40", label: "M40" };
}

export function calculateMotionProfile(strokeMm, speedMm, targetTimeSec) {
  if (!Number.isFinite(strokeMm) || strokeMm <= 0 || !Number.isFinite(speedMm) || speedMm <= 0) {
    return { feasible: false, accelerationMmS2: 980, t_acc: 0, t_const: 0, peakSpeedMm: speedMm ?? 0, profileNote: "", profileIsWarning: false };
  }

  const t_cruise = strokeMm / speedMm;

  // 시간 조건 없음 → 가속 구간 가정 (정보성, 경고 아님)
  if (!Number.isFinite(targetTimeSec) || targetTimeSec <= 0) {
    const t_acc = Math.max(0.3, t_cruise * 0.2);
    return {
      feasible: true,
      accelerationMmS2: speedMm / t_acc,
      t_acc,
      t_const: t_cruise,
      peakSpeedMm: speedMm,
      profileNote: `이송 시간 미입력 — 가속 구간 ${t_acc.toFixed(2)}s 가정 (0.3s 또는 이송시간의 20% 중 큰 값)`,
      profileIsWarning: false,
    };
  }

  // 목표 시간이 정속 이송 시간보다 짧음 → 삼각형 프로파일 (실제 경고)
  if (targetTimeSec < t_cruise * 0.98) {
    const peakSpeedMm = (2 * strokeMm) / targetTimeSec;
    const t_acc = targetTimeSec / 2;
    return {
      feasible: true,
      accelerationMmS2: peakSpeedMm / t_acc,
      t_acc,
      t_const: 0,
      peakSpeedMm,
      profileNote: `목표 시간 ${targetTimeSec}s에 맞추려면 피크 속도 ${peakSpeedMm.toFixed(0)} mm/s가 필요합니다 (삼각형 프로파일).`,
      profileIsWarning: true,
    };
  }

  const t_acc = targetTimeSec - t_cruise;

  // 가속 시간이 너무 짧으면 최소 0.3s 보정 (실제 경고)
  if (t_acc < 0.05) {
    return {
      feasible: true,
      accelerationMmS2: speedMm / 0.3,
      t_acc: 0.3,
      t_const: t_cruise,
      peakSpeedMm: speedMm,
      profileNote: "가속 구간이 매우 짧습니다 — 최소 0.3s 적용.",
      profileIsWarning: true,
    };
  }

  // 이송 시간 여유 충분 (정보성, 경고 아님)
  if (t_acc > t_cruise * 0.5) {
    const t_acc_capped = t_cruise * 0.3;
    return {
      feasible: true,
      accelerationMmS2: speedMm / t_acc_capped,
      t_acc: t_acc_capped,
      t_const: t_cruise * 0.7,
      peakSpeedMm: speedMm,
      profileNote: `이송 시간 여유가 충분합니다 — 가속 구간 ${t_acc_capped.toFixed(2)}s로 완만하게 적용했습니다.`,
      profileIsWarning: false,
    };
  }

  return {
    feasible: true,
    accelerationMmS2: speedMm / t_acc,
    t_acc,
    t_const: t_cruise - t_acc,
    peakSpeedMm: speedMm,
    profileNote: "",
    profileIsWarning: false,
  };
}

export function getRecommendedBallScrew(peakForceN, speedMm, strokeMm) {
  const safeForce = Number.isFinite(peakForceN) && peakForceN > 0 ? peakForceN : 100;
  const safeSpeed = Number.isFinite(speedMm) && speedMm > 0 ? speedMm : 50;
  const safeStroke = Number.isFinite(strokeMm) && strokeMm > 0 ? strokeMm : 200;

  const targetRpm = MOTOR_MAX_RPM * 0.75;
  const theoreticalLead = (safeSpeed * 60) / targetRpm;
  const leadMm = STANDARD_LEADS_MM.find((l) => l >= theoreticalLead) ?? STANDARD_LEADS_MM[STANDARD_LEADS_MM.length - 1];

  const d_min = getMinScrewDiameterMm(safeForce * 2.0, safeStroke);
  const screwSpec = getScrewSpecFromDiameter(d_min);

  const requiredRpm = (safeSpeed * 60) / leadMm;
  const rpmMargin = ((MOTOR_MAX_RPM - requiredRpm) / MOTOR_MAX_RPM * 100).toFixed(0);

  // 임계 회전수: N_c = 4.76×10^7 × d_root / L² (고정-지지 단순화, d_root ≈ 0.8×명칭경)
  const nominalDiameterMm = parseInt(screwSpec.value.replace("M", ""), 10);
  const rootDiameterMm = nominalDiameterMm * 0.8;
  const criticalRpm = Math.floor((4.76e7 * rootDiameterMm) / (safeStroke * safeStroke));
  const criticalSpeedRatio = requiredRpm / criticalRpm;
  const criticalSpeedOk = criticalSpeedRatio < 0.8;

  return {
    screwTypeValue: "ball",
    screwTypeLabel: "볼스크류",
    screwSpecValue: screwSpec.value,
    screwSpecLabel: screwSpec.label,
    leadMm,
    classLabel: safeForce < 500 ? "경량" : safeForce < 2000 ? "중하중" : safeForce < 5000 ? "고하중" : "대형 고하중",
    reason: `속도 ${safeSpeed} mm/s에서 모터 rpm 75% 운전 기준으로 리드 ${leadMm} mm/rev를 역산했습니다. 이 조건에서 모터 rpm ${requiredRpm.toFixed(0)} rpm (정격 대비 여유 ${rpmMargin}%). 축경은 ${safeStroke}mm 스트로크에서 피크 하중 ${safeForce.toFixed(0)} N 기준 좌굴 검토로 ${screwSpec.label}을 선정했습니다.`,
    criticalRpm,
    criticalSpeedRatio,
    criticalSpeedOk,
    requiredRpm,
  };
}

// ── 관성비 검토 ──────────────────────────────────────────────────────────────
export function getInertiaCheck(weightKg, leadMm, matchedRatio, powerW, isStepper) {
  const ratio = Math.max(matchedRatio ?? 1, 1);
  // 부하 관성 (볼스크류 선형 이송계)
  const J_load = weightKg * Math.pow((leadMm / 1000) / (2 * Math.PI), 2); // kg·m²
  // 모터 샤프트 기준 환산 부하 관성
  const J_load_referred = J_load / (ratio * ratio);
  // 모터 로터 관성 추정 (출력 기준 경험식: 소형 스텝/서보 클래스)
  const J_rotor = Math.max((powerW ?? 100) * 6e-6, 1e-5); // kg·m²
  const inertiaRatio = J_load_referred / J_rotor;
  const threshold = isStepper ? 3 : 10;
  const warnLevel = inertiaRatio <= threshold ? "ok" : inertiaRatio <= threshold * 2 ? "caution" : "danger";
  return { J_load, J_load_referred, J_rotor, inertiaRatio, threshold, warnLevel, isStepper };
}

// ── 수직축 홀딩 토크 ─────────────────────────────────────────────────────────
export function getVerticalAxisSummary(weightKg, leadMm) {
  // 정지 홀딩 토크: 중력 하중을 유지하는 데 필요한 최소 모터 토크
  const holdingTorqueNm = (weightKg * GRAVITY * (leadMm / 1000)) / (2 * Math.PI * EFFICIENCY);
  return {
    holdingTorqueNm,
    brakeRequired: true, // 볼스크류는 자기잠금 없음
  };
}

// ── 위치 결정 정밀도 추정 ────────────────────────────────────────────────────
export function getPositioningAccuracy(leadMm, precisionLevel) {
  const encoderPPR = precisionLevel === "high-precision" ? 10000 : precisionLevel === "precision" ? 2500 : 1000;
  const countsPerRev = encoderPPR * 4; // 4체배 처리
  const linearResolutionUm = (leadMm / countsPerRev) * 1000;
  const repeatabilityUm = linearResolutionUm * 2;
  // 볼스크류 백래시 + 리드 오차 기준값
  const backlashUm = precisionLevel === "high-precision" ? 10 : precisionLevel === "precision" ? 20 : 50;
  const leadErrorUm = precisionLevel === "high-precision" ? 23 : precisionLevel === "precision" ? 35 : 46;
  const theoreticalAccuracyUm = Math.sqrt(repeatabilityUm ** 2 + backlashUm ** 2);
  return { encoderPPR, countsPerRev, linearResolutionUm, repeatabilityUm, backlashUm, leadErrorUm, theoreticalAccuracyUm };
}

// THK LM 가이드 동하중 C값 (블록 1개 기준, 단위: N) — THK 카탈로그 기준
const LM_GUIDE_CATALOG = [
  { model: "RSR9WM",  C: 3900,  C0: 5200,  blockCount: 2, rail: "RSR9R",  label: "THK RSR9R + RSR9WM 블록 2ea",  class: "초경량" },
  { model: "RSR12WM", C: 6700,  C0: 9100,  blockCount: 2, rail: "RSR12R", label: "THK RSR12R + RSR12WM 블록 2ea", class: "경량" },
  { model: "HSR15A",  C: 10200, C0: 14800, blockCount: 2, rail: "HSR15R", label: "THK HSR15R + HSR15A 블록 2ea",  class: "표준" },
  { model: "HSR20A",  C: 16800, C0: 25200, blockCount: 2, rail: "HSR20R", label: "THK HSR20R + HSR20A 블록 2ea",  class: "표준" },
  { model: "HSR25A",  C: 24100, C0: 37300, blockCount: 2, rail: "HSR25R", label: "THK HSR25R + HSR25A 블록 2ea",  class: "중하중" },
  { model: "HSR30A",  C: 32500, C0: 51200, blockCount: 4, rail: "HSR30R", label: "THK HSR30R + HSR30A 블록 4ea",  class: "고하중" },
  { model: "HSR35A",  C: 45900, C0: 72100, blockCount: 4, rail: "HSR35R", label: "THK HSR35R + HSR35A 블록 4ea",  class: "고하중" },
  { model: "HSR45A",  C: 65600, C0: 104000,blockCount: 4, rail: "HSR45R", label: "THK HSR45R + HSR45A 블록 4ea",  class: "초고하중" },
];

export function getLmGuideRecommendation(peakForceNOrWeightKg, environment, isPeakForce = false) {
  const environmentLabel = getEnvironmentLabel(environment);

  // 하위 호환: 기존 weightKg 호출이면 중력 하중으로 변환
  const peakForceN = isPeakForce
    ? (Number.isFinite(peakForceNOrWeightKg) && peakForceNOrWeightKg > 0 ? peakForceNOrWeightKg : 200)
    : (Number.isFinite(peakForceNOrWeightKg) && peakForceNOrWeightKg > 0 ? peakForceNOrWeightKg * GRAVITY * 1.5 : 200);

  // 목표 수명 10,000km, HIWIN 기본 정격거리 50km
  // 필요 C = F × (L_target / L_basic)^(1/3) × safety
  // 블록 2개 병렬이면 C_per_block = C_required / 2
  const L_TARGET_KM = 10000;
  const L_BASIC_KM = 50;
  const SAFETY = 2.0;
  const lifeFactor = Math.pow(L_TARGET_KM / L_BASIC_KM, 1 / 3); // ≈ 5.85
  const C_required_total = peakForceN * lifeFactor * SAFETY;

  // 블록 수 고려해 블록당 필요 C 계산
  const guide = LM_GUIDE_CATALOG.find((g) => g.C * g.blockCount >= C_required_total) ?? LM_GUIDE_CATALOG[LM_GUIDE_CATALOG.length - 1];
  const achievedLifeKm = Math.pow((guide.C * guide.blockCount) / (peakForceN * SAFETY), 3) * L_BASIC_KM;

  return {
    manufacturer: "THK",
    model: guide.label,
    reason: `피크 하중 ${peakForceN.toFixed(0)} N 기준 — 목표 수명 ${L_TARGET_KM.toLocaleString()}km에서 필요 동하중 C = ${C_required_total.toFixed(0)} N. ${guide.label} 선정 시 예상 수명 ${achievedLifeKm > 99999 ? "100,000km 초과" : achievedLifeKm.toLocaleString("ko-KR", { maximumFractionDigits: 0 }) + "km"}.`,
    notes: `${environmentLabel} 조건 — 씰 등급·윤활 방식·블록 예압(Z0/ZA/ZB)을 THK에 사전 확인하세요.`,
    catalogUrl: "https://www.thk.com/",
  };
}

export function getEncoderRecommendation(precisionLevel, environment) {
  const environmentLabel = getEnvironmentLabel(environment);

  if (precisionLevel === "precision") {
    return {
      manufacturer: "Autonics",
      model: "Autonics E40S8 증분형 엔코더",
      reason: "정밀 위치결정이 필요하므로 증분형 피드백을 붙이는 편이 안전합니다.",
      notes: `${environmentLabel} 조건에서는 케이블, 분해능, 노이즈 대책도 같이 보세요.`,
      catalogUrl: "https://www.autonics.com/kr/product/category/Rotary-encoders",
    };
  }

  if (precisionLevel === "high-precision") {
    return {
      manufacturer: "SICK",
      model: "SICK AFS60 절대형 엔코더",
      reason: "반복 정밀도와 원점 복귀 안정성이 중요하므로 절대형 엔코더를 권장합니다.",
      notes: `${environmentLabel} 조건에서는 엔코더 보호등급과 온도 보정 범위를 함께 확인하세요.`,
      catalogUrl: "https://www.sick.com/kr/ko/",
    };
  }

  return {
    manufacturer: "Autonics",
    model: "기본 패키지 제외 / 필요시 Autonics E40S8 검토",
    reason: "일반 이송 조건으로 보고 기본 패키지에서는 엔코더를 필수로 넣지 않았습니다.",
    notes: "반복 위치 정밀도 요구가 생기면 증분형 엔코더부터 추가 검토하면 됩니다.",
    catalogUrl: "https://www.autonics.com/kr/product/category/Rotary-encoders",
  };
}

export function getManualLibrary(company, productRecommendations) {
  const targetCompanies =
    company === "all"
      ? COMPANY_OPTIONS.filter((option) => option.value !== "all").map((option) => option.value)
      : [company];

  const productManuals = productRecommendations.map((product) => ({
    id: `${product.company}-${product.series}-${product.productName}`,
    company: product.company,
    type: "추천 제품 페이지",
    title: `${product.company} ${product.series}`,
    description: product.sampleModel ?? product.productName,
    href: product.sourceUrl,
  }));

  const manualIds = new Set(productRecommendations.flatMap((product) => product.manualIds ?? []));
  const companyManuals = COMPANY_MANUALS.filter((manual) => {
    const companyOk = targetCompanies.includes(manual.company);
    return manualIds.size > 0 ? manualIds.has(manual.id) || companyOk : companyOk;
  });

  const seenHrefs = new Set();

  return [...COMPANY_SITE_LINKS, ...companyManuals, ...productManuals].filter((manual) => {
    if (!manual.href || seenHrefs.has(manual.href)) {
      return false;
    }

    seenHrefs.add(manual.href);
    return true;
  });
}

export function getCompanyComparisonLinks(company, productRecommendations) {
  if (company !== "all") {
    return [];
  }

  const recommendedCompanies = new Set(productRecommendations.map((product) => product.company));

  return COMPANY_SITE_LINKS.filter((site) => !recommendedCompanies.has(site.company)).map((site) => ({
    id: `compare-${site.company}`,
    company: site.company,
    productName: `${site.company} 공식 사이트 비교`,
    modelNumber: "공식 사이트에서 제품 직접 비교",
    description: site.description,
    href: site.href,
    type: "공식 비교",
  }));
}

export async function fetchWebRecommendations(searchParams) {
  const query = new URLSearchParams(
    Object.entries(searchParams).reduce((accumulator, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        accumulator[key] = String(value);
      }

      return accumulator;
    }, {}),
  );

  const response = await fetch(`/api/web-search-products?${query.toString()}`);
  const data = await response.json();

  return {
    results: Array.isArray(data.results) ? data.results : [],
    error: typeof data.error === "string" ? data.error : "",
  };
}

export async function fetchWebManualExtractions(searchParams) {
  const query = new URLSearchParams(
    Object.entries(searchParams).reduce((accumulator, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        accumulator[key] = String(value);
      }

      return accumulator;
    }, {}),
  );

  const response = await fetch(`/api/web-search-manuals?${query.toString()}`);
  const data = await response.json();

  return {
    results: Array.isArray(data.results) ? data.results : [],
    candidates: Array.isArray(data.candidates) ? data.candidates : [],
    error: typeof data.error === "string" ? data.error : "",
  };
}

function getStepperTorqueDerate(requiredRpm, maxOutputSpeed) {
  const ratio = requiredRpm / Math.max(maxOutputSpeed, 1);
  if (ratio <= 0.5) return 1.0;
  // 속도 50% 초과 구간에서 선형 저하: 100%속도 → 0.5배
  return Math.max(0.5, 1.0 - (ratio - 0.5));
}

function buildProductAnnotations(product, { direction, environment, precisionLevel, peakTorque, thrust, requiredRpm, requiredSpeedMm }) {
  const warnings = [];
  const isLinear = isDirectDriveProduct(product);
  const isStepper = isStepperMotorProduct(product);
  const margin = product.minimumMarginPercent;

  let recommendationReason;
  if (isLinear) {
    const forceMargin = getMarginPercent(product.linearForceLimitN ?? product.maxLinearForceN ?? 0, thrust);
    const speedMargin = getMarginPercent(product.maxOutputSpeed ?? product.maxLinearSpeedMmS ?? 0, requiredSpeedMm);
    const qualityNote = margin >= 50 ? "안정적인 운용 범위입니다." : margin >= 20 ? "실용 범위 내에서 적용 가능합니다." : "여유가 작아 정밀 검토가 필요합니다.";
    recommendationReason = `직결형 액추에이터로 감속기 없이 사양을 직접 충족합니다. 추력 여유 ${forceMargin.toFixed(0)}% · 속도 여유 ${speedMargin.toFixed(0)}% — ${qualityNote}`;
  } else {
    const torqueMargin = getMarginPercent(product.outputTorqueLimitNm ?? 0, peakTorque);
    const speedMargin = getMarginPercent(product.maxOutputSpeed ?? 0, requiredRpm);
    const motorDesc = isStepper ? "스텝모터" : (product.motorType ?? "서보모터");
    const qualityNote = margin >= 50 ? "충분한 여유로 안정적입니다." : margin >= 20 ? "실용 범위에서 적합합니다." : "여유가 부족합니다. 재검토 권장.";
    recommendationReason = `${product.matchedRatio}:1 감속 적용으로 ${motorDesc}(${product.company})의 출력을 효과적으로 활용합니다. 감속 후 토크 여유 ${torqueMargin.toFixed(0)}% · 속도 여유 ${speedMargin.toFixed(0)}% — ${qualityNote}`;
  }

  // 수직 방향 경고
  if (direction === "vertical") {
    warnings.push("수직 방향 — 전원 차단 시 파워오프 홀딩 브레이크 유무를 반드시 확인하세요. 브레이크 없으면 낙하 위험이 있습니다.");
    if (margin < 50) {
      warnings.push("수직 하중에서 여유율 50% 미만 — 가속/감속 피크 구간의 과부하 리스크를 추가 검토하세요.");
    }
  }

  // 스텝핑 모터 경고
  if (isStepper) {
    const speedRatio = requiredRpm / Math.max(product.maxOutputSpeed ?? 1, 1);
    if (speedRatio > 0.5) {
      warnings.push(`스텝모터 고속 구간 (정격의 ${(speedRatio * 100).toFixed(0)}%) — 실제 가용 토크는 카탈로그 값의 ${Math.round(getStepperTorqueDerate(requiredRpm, product.maxOutputSpeed ?? 1) * 100)}% 수준으로 저하됩니다. 제조사 토크-속도 곡선을 반드시 확인하세요.`);
    }
    if (precisionLevel !== "general") {
      warnings.push("스텝모터 오픈루프 운전 시 탈조(stall) 위험이 있습니다. 정밀 위치결정 용도에는 인코더 피드백(클로즈드루프) 구성을 권장합니다.");
    }
  }

  // 감속비 경고
  if ((product.matchedRatio ?? 1) >= 20) {
    warnings.push(`감속비 ${product.matchedRatio}:1 — 백래시가 증가할 수 있습니다. 정밀 위치결정 용도라면 제조사 카탈로그의 백래시 수치(arcmin)를 확인하세요.`);
  }

  // 전체 여유율 경고
  if (margin >= 0 && margin < 20) {
    warnings.push("전체 여유율 20% 미만 — 마찰 증가·온도 상승·가속 피크가 겹치면 사양을 초과할 수 있습니다. 주문 전 재검토를 권장합니다.");
  }

  // 환경 경고
  if (environment === "cleanroom") {
    warnings.push("클린룸 — 오일리스 윤활재·저분진 씰 옵션 여부와 ISO 청정도 등급을 제조사에 사전 확인하세요.");
  } else if (environment === "vacuum") {
    warnings.push("진공 환경 (모터 외부 설치, 액추에이터 헤드만 진공 내부) — 볼스크류·LM가이드의 아웃가싱 규격(< 1×10⁻⁶ Pa·m³/s)과 진공용 그리스 사용 여부를 제조사에 확인하세요. 모터 자체가 진공 챔버 내부에 들어가는 경우는 '인베큠 모션(In-Vacuum Motor)' 사양이 별도 적용됩니다.");
  } else if (environment === "dust") {
    warnings.push("분진 환경 — IP 보호 등급(IP54 이상 권장)과 씰 교체 주기를 확인하세요.");
  } else if (environment === "high-temp") {
    warnings.push("고온 환경 — 권선 절연 등급 F급(155°C) 이상 확인, 고온에서의 토크 디레이팅 곡선을 확인하세요.");
  }

  return { recommendationReason, engineeringWarnings: warnings };
}

function sortByMarginAndBrand(products) {
  const PREFERRED = ["Oriental Motor", "THK", "Nanomotion"];
  return [...products].sort((a, b) => {
    if (a.confidenceKey === b.confidenceKey) {
      const aP = PREFERRED.includes(a.company) ? 1 : 0;
      const bP = PREFERRED.includes(b.company) ? 1 : 0;
      if (aP !== bP) return bP - aP;
    }
    return b.minimumMarginPercent - a.minimumMarginPercent;
  });
}

export function getProductRecommendations({
  catalog = PRODUCT_CATALOG,
  company,
  motorType,
  phaseType,
  direction,
  designPower,
  peakTorque,
  rpm,
  thrust,
  speedMm,
  environment = "general",
  precisionLevel = "general",
}) {
  const verticalFactor = direction === "vertical" ? 1.3 : 1.0;
  const safeThrust = thrust * verticalFactor;
  const safeTorque = peakTorque * verticalFactor;

  // ── 공통 필터 ──
  const baseFilter = (product) => {
    const companyOk = company === "all" || product.company === company;
    const motorTypeOk = motorType === "전체" || product.motorType === motorType;
    const phaseOk = phaseType === "전체" || product.phaseTypes.includes(phaseType);
    const environmentOk = passesEnvironmentCompatibility(product, environment);
    const precisionOk = precisionLevel !== "high-precision" || !isStepperMotorProduct(product);
    return companyOk && motorTypeOk && phaseOk && environmentOk && precisionOk;
  };

  // ── 경로 A: 직결형 (감속기 없음 또는 일체형 액추에이터) ──
  const directRequiredSpeedMm = speedMm * 1.2;
  const directRequiredRpm = rpm * 1.2;
  const directMaxAllowedRatio = directRequiredRpm > 0 ? MOTOR_MAX_RPM / directRequiredRpm : 1;

  const directProducts = catalog
    .filter(baseFilter)
    .map((product) => {
      if (isDirectDriveProduct(product)) {
        const maxLinearSpeed = product.maxLinearSpeedMmS ?? 0;
        const maxLinearForce = product.maxLinearForceN ?? 0;
        if (directRequiredSpeedMm > maxLinearSpeed) return null;
        if (safeThrust > maxLinearForce) return null;
        if (designPower > product.powerW) return null;
        if (direction === "vertical" && !product.verticalReady) return null;
        return attachConfidenceInfo(
          { ...product, matchedRatio: 1, requiredRatio: 1, outputTorqueLimitNm: 0,
            minOutputSpeed: 0, maxOutputSpeed: maxLinearSpeed, linearForceLimitN: maxLinearForce },
          { requiredSpeedMm: directRequiredSpeedMm, requiredRpm: directRequiredRpm,
            designPower, peakTorque: safeTorque, thrust: safeThrust },
        );
      }
      // 직결: ratio=1만 허용
      const matchedRatio = findMatchingRatio(product.availableRatios, directMaxAllowedRatio);
      if (!matchedRatio || matchedRatio > 1) return null;
      const maxOutputSpeed = product.maxMotorRpm / matchedRatio;
      const minOutputSpeed = product.minMotorRpm / matchedRatio;
      const rawTorqueLimit = getOutputTorqueLimit(product, matchedRatio);
      const effectiveTorqueLimit = isStepperMotorProduct(product)
        ? rawTorqueLimit * getStepperTorqueDerate(directRequiredRpm, maxOutputSpeed)
        : rawTorqueLimit;
      if (rpm < Math.max(minOutputSpeed * 0.3, 0) || directRequiredRpm > maxOutputSpeed) return null;
      if (safeTorque > effectiveTorqueLimit) return null;
      if (designPower > product.powerW) return null;
      if (direction === "vertical" && !product.verticalReady) return null;
      return attachConfidenceInfo(
        { ...product, matchedRatio, requiredRatio: directMaxAllowedRatio,
          minOutputSpeed, maxOutputSpeed, outputTorqueLimitNm: effectiveTorqueLimit },
        { requiredSpeedMm: directRequiredSpeedMm, requiredRpm: directRequiredRpm,
          designPower, peakTorque: safeTorque, thrust: safeThrust },
      );
    })
    .filter(Boolean);

  // ── 경로 B: 감속기 포함 (모든 모터 + 별도 감속기 부착 가능) ──
  // 감속기 경로 물리: 리드를 TARGET_REDUCER_RATIO배 크게 잡아 모터 부하를 낮춤
  const reducerLeadMm = (speedMm * 60 * TARGET_REDUCER_RATIO) / (MOTOR_MAX_RPM * 0.75);
  const reducerOutputRpm = (speedMm / reducerLeadMm) * 60; // 볼스크류 출력 rpm
  const reducerOutputTorqueNm = (safeThrust * (reducerLeadMm / 1000)) / (2 * Math.PI * EFFICIENCY);
  const reducerDesignPower = (safeThrust * (speedMm / 1000)) / EFFICIENCY * SAFETY_FACTOR;
  const reducerRequiredOutputRpm = reducerOutputRpm * 1.2;
  const reducerMaxAllowedRatio = MOTOR_MAX_RPM / reducerRequiredOutputRpm;

  const reducerProducts = catalog
    .filter(baseFilter)
    .filter((product) => !isDirectDriveProduct(product)) // 일체형 액추에이터는 제외
    .map((product) => {
      // 기존 감속비 + 외부 감속기 표준 감속비 통합
      const effectiveRatios = [
        ...new Set([...product.availableRatios, ...STANDARD_EXTERNAL_REDUCER_RATIOS]),
      ].sort((a, b) => a - b);
      const matchedRatio = findMatchingRatio(effectiveRatios, reducerMaxAllowedRatio);
      if (!matchedRatio || matchedRatio <= 1) return null;

      const maxOutputSpeed = product.maxMotorRpm / matchedRatio;
      const minOutputSpeed = product.minMotorRpm / matchedRatio;
      const rawTorqueLimit = getOutputTorqueLimit(product, matchedRatio);
      const effectiveTorqueLimit = isStepperMotorProduct(product)
        ? rawTorqueLimit * getStepperTorqueDerate(reducerRequiredOutputRpm, maxOutputSpeed)
        : rawTorqueLimit;

      if (reducerRequiredOutputRpm > maxOutputSpeed) return null;
      if (reducerOutputTorqueNm > effectiveTorqueLimit) return null;
      if (reducerDesignPower > product.powerW) return null;
      if (direction === "vertical" && !product.verticalReady) return null;

      const isExternalReducer = !product.availableRatios.includes(matchedRatio);
      return attachConfidenceInfo(
        { ...product, matchedRatio, requiredRatio: reducerMaxAllowedRatio,
          minOutputSpeed, maxOutputSpeed, outputTorqueLimitNm: effectiveTorqueLimit,
          externalReducer: isExternalReducer, reducerLeadMm },
        { requiredSpeedMm: speedMm * 1.2, requiredRpm: reducerRequiredOutputRpm,
          designPower: reducerDesignPower, peakTorque: reducerOutputTorqueNm, thrust: safeThrust },
      );
    })
    .filter(Boolean);

  const sortedReducerProducts = sortByMarginAndBrand(reducerProducts);
  const sortedDirectProducts = sortByMarginAndBrand(directProducts);

  const sameProduct = (left, right) =>
    left &&
    right &&
    `${left.company}-${left.productName}-${getProductModelNumber(left)}` ===
      `${right.company}-${right.productName}-${getProductModelNumber(right)}`;

  const optimalCandidate = sortedReducerProducts[0] ?? null;
  const bestCandidate =
    sortedDirectProducts.find((p) => !sameProduct(p, optimalCandidate)) ??
    sortedDirectProducts[0] ??
    null;


  const annotationCtx = {
    direction, environment, precisionLevel, peakTorque, thrust,
    requiredRpm: directRequiredRpm,
    requiredSpeedMm: directRequiredSpeedMm,
  };

  const selectedProducts = [];

  if (optimalCandidate) {
    const tiered = assignRecommendationTier(optimalCandidate, "optimal", 1);
    const annotations = buildProductAnnotations(tiered, annotationCtx);
    let tradeoffNote = null;
    if (bestCandidate) {
      const optM = optimalCandidate.minimumMarginPercent.toFixed(0);
      const bestM = bestCandidate.minimumMarginPercent.toFixed(0);
      tradeoffNote = `감속기 포함(최적) vs 직결형(최선) 비교 — 최적 여유율 ${optM}% · 최선 여유율 ${bestM}%. 감속기는 모터 토크 부담을 낮추고 수명을 늘리지만 백래시·패키지 크기를 추가로 검토해야 합니다. 직결형은 응답이 빠르고 구조가 단순합니다.`;
    }
    selectedProducts.push({ ...tiered, ...annotations, tradeoffNote });
  }

  if (bestCandidate) {
    const tiered = assignRecommendationTier(bestCandidate, "best", 2);
    const annotations = buildProductAnnotations(tiered, annotationCtx);
    selectedProducts.push({ ...tiered, ...annotations, tradeoffNote: null });
  }

  // 비교 후보: 감속기/직결 통합 후보 중 상위 2개 이후 제품
  const allSorted = sortByMarginAndBrand([...sortedReducerProducts, ...sortedDirectProducts]);
  const secondaryCandidate =
    allSorted.find((p) => !sameProduct(p, optimalCandidate) && !sameProduct(p, bestCandidate)) ?? null;

  if (secondaryCandidate) {
    const tiered = assignRecommendationTier(secondaryCandidate, "secondary", 3);
    const annotations = buildProductAnnotations(tiered, annotationCtx);
    selectedProducts.push({ ...tiered, ...annotations, tradeoffNote: null });
  }

  return selectedProducts;
}

function buildDrivePackage({
  packageBaseProduct,
  fallbackReducer,
  ballScrewRecommendation,
  lmGuideRecommendation,
  encoderRecommendation,
  environment,
  precisionLevel,
  calcBasis,
}) {
  const { thrust, rpm, peakTorque, power, leadMm, direction, weightKg } = calcBasis ?? {};
  const reducerRatio = packageBaseProduct?.matchedRatio ?? (fallbackReducer?.ratio > 1 ? fallbackReducer.ratio : 1);

  return [
    {
      id: "ballscrew",
      title: "볼스크류",
      manufacturer: "가공 발주 사양",
      model: `${ballScrewRecommendation.screwSpecLabel} / ${formatNumber(ballScrewRecommendation.leadMm, 1)} mm/rev`,
      subText: ballScrewRecommendation.classLabel,
      reason: ballScrewRecommendation.reason,
      notes: `볼스크류는 규격품 구매가 아닌 사양에 맞춰 가공 발주하는 부품입니다. 축경·리드·길이를 확정한 뒤 전문 가공업체에 제작 의뢰하세요. ${getEnvironmentLabel(environment)}이면 씰·윤활·커버 조건도 함께 명시하세요.`,
      url: null,
    },
    {
      id: "lm-guide",
      title: "LM가이드",
      manufacturer: lmGuideRecommendation.manufacturer ?? "catalog_check_required",
      model: lmGuideRecommendation.model,
      subText: getEnvironmentLabel(environment),
      reason: lmGuideRecommendation.reason,
      notes: lmGuideRecommendation.notes,
      url: lmGuideRecommendation.catalogUrl ?? null,
    },
    {
      id: "encoder",
      title: "엔코더",
      manufacturer: encoderRecommendation.manufacturer ?? "catalog_check_required",
      model: encoderRecommendation.model,
      subText: getPrecisionLabel(precisionLevel),
      reason: encoderRecommendation.reason,
      notes: encoderRecommendation.notes,
      url: encoderRecommendation.catalogUrl ?? null,
    },
  ];
}

export function buildSimulationResult({
  company,
  direction,
  environment,
  precisionLevel,
  numericInputs,
  peakTorque,
  rpm,
  thrust,
  power,
  torque,
  gearRatio,
  fallbackReducer,
  productRecommendations,
  ballScrewRecommendation,
  lmGuideRecommendation: lmGuideOverride,
}) {
  const summaryRecommendations = getSummaryRecommendations(productRecommendations);
  const optimalProduct = summaryRecommendations[0]?.isPlaceholder ? null : summaryRecommendations[0];
  const bestProduct = summaryRecommendations[1]?.isPlaceholder ? null : summaryRecommendations[1];
  const secondaryProduct = summaryRecommendations[2]?.isPlaceholder ? null : summaryRecommendations[2];
  const selectedProduct = optimalProduct ?? bestProduct ?? secondaryProduct;
  const moveTime =
    numericInputs.strokeMm !== null && numericInputs.speedMm !== null && numericInputs.speedMm > 0
      ? numericInputs.strokeMm / numericInputs.speedMm
      : null;

  const hardWarnings = [];
  const softWarnings = [];

  // 모션 프로파일 경고 (정보성 메시지는 제외, 실제 경고만)
  if (numericInputs.motionProfile?.profileIsWarning && numericInputs.motionProfile.profileNote) {
    softWarnings.push(numericInputs.motionProfile.profileNote);
  }
  if (
    numericInputs.strokeMm !== null &&
    numericInputs.speedMm !== null &&
    numericInputs.targetTimeSec !== null &&
    numericInputs.targetTimeSec < (numericInputs.strokeMm / numericInputs.speedMm) * 0.98
  ) {
    hardWarnings.push(
      `목표 시간 ${formatNumber(numericInputs.targetTimeSec, 2)}s는 물리적으로 불가능합니다. ${formatNumber(numericInputs.speedMm, 0)} mm/s로 ${formatNumber(numericInputs.strokeMm, 0)} mm를 이송하려면 최소 ${formatNumber(numericInputs.strokeMm / numericInputs.speedMm, 1)}s가 필요합니다.`,
    );
  }

  if (rpm > MOTOR_MAX_RPM && selectedProduct?.driveMode !== "linear-direct") {
    hardWarnings.push("필요 rpm이 3000 rpm을 넘어서 표준 회전 모터로는 직접 대응이 어렵습니다.");
  }

  if (!selectedProduct) {
    hardWarnings.push("등록 DB 직접 매칭 후보가 부족해 공식 사이트 비교 후보와 자동 탐색 결과를 함께 확인하는 조건입니다.");
  }

  if (!optimalProduct) {
    softWarnings.push("감속기 포함 최적 모델이 부족해서 구조 변경 또는 회사 확대 비교가 필요할 수 있습니다.");
  }

  if (!bestProduct) {
    softWarnings.push("직결형 최선 모델은 이번 조건에서 충분한 여유가 있는 후보를 찾지 못했습니다.");
  }

  if (
    numericInputs.targetDrivenSpeedMm !== null &&
    numericInputs.inputSpeedMm !== null &&
    numericInputs.targetDrivenSpeedMm > numericInputs.inputSpeedMm
  ) {
    softWarnings.push(
      `목표 시간 기준 필요 평균 속도 ${formatNumber(numericInputs.targetDrivenSpeedMm, 1)} mm/s가 입력 속도보다 높아 더 엄격한 기준으로 선정했습니다.`,
    );
  }

  if (
    numericInputs.targetTimeSec !== null &&
    moveTime !== null &&
    moveTime > numericInputs.targetTimeSec * 1.05
  ) {
    softWarnings.push("현재 선정 기준으로는 목표 시간 조건을 딱 맞추기 어렵습니다. 속도나 리드, 감속비를 다시 검토해 보세요.");
  }

  if (selectedProduct?.driveMode === "linear-direct") {
    softWarnings.push("직결형은 응답은 빠르지만 모터 부하 여유와 유지력 검토가 더 중요합니다.");
  }

  if (selectedProduct?.matchedRatio >= 20) {
    softWarnings.push("감속비가 큰 편이라 백래시와 응답성 검토가 필요합니다.");
  }

  if (environment !== "general") {
    softWarnings.push(`${getEnvironmentLabel(environment)} 조건을 고려해 후보를 우선 배치했습니다. 실제 주문 전 옵션 사양을 다시 확인하세요.`);
  }

  if (precisionLevel !== "general") {
    softWarnings.push(`${getPrecisionLabel(precisionLevel)} 기준으로 엔코더와 구동계 여유를 조금 더 보수적으로 잡았습니다.`);
  }

  let status = "가능";
  let statusKey = "ok";

  if (hardWarnings.length > 0) {
    status = "불가";
    statusKey = "bad";
  } else if (softWarnings.length > 0) {
    status = "주의";
    statusKey = "warn";
  }

  // ── 추가 엔지니어링 검토 ──
  const inertiaCheck =
    selectedProduct && !selectedProduct.isPlaceholder && numericInputs.weightKg && numericInputs.leadMm
      ? getInertiaCheck(
          numericInputs.weightKg,
          numericInputs.leadMm,
          selectedProduct.matchedRatio ?? 1,
          selectedProduct.powerW,
          isStepperMotorProduct(selectedProduct),
        )
      : null;

  const verticalAxisSummary =
    direction === "vertical" && numericInputs.weightKg && numericInputs.leadMm
      ? getVerticalAxisSummary(numericInputs.weightKg, numericInputs.leadMm)
      : null;

  const positioningAccuracy = numericInputs.leadMm
    ? getPositioningAccuracy(numericInputs.leadMm, precisionLevel)
    : null;

  return {
    thrust,
    torque,
    peakTorque,
    rpm,
    power,
    gearRatio,
    status,
    statusKey,
    messages: [...hardWarnings, ...softWarnings],
    recommendedCompany: selectedProduct?.company ?? (company === "all" ? "재검토 필요" : company),
    weightKg: numericInputs.weightKg,
    speedMm: numericInputs.speedMm,
    inputSpeedMm: numericInputs.inputSpeedMm,
    minSpeedMm: numericInputs.minSpeedMm,
    maxSpeedMm: numericInputs.maxSpeedMm,
    strokeMm: numericInputs.strokeMm,
    targetTimeSec: numericInputs.targetTimeSec,
    targetDrivenSpeedMm: numericInputs.targetDrivenSpeedMm,
    appliedLeadMm: numericInputs.leadMm,
    speedMode: numericInputs.speedMode,
    environment,
    precisionLevel,
    moveTime,
    motionProfile: numericInputs.motionProfile ?? null,
    selectedProduct,
    summaryRecommendations,
    productRecommendations,
    inertiaCheck,
    verticalAxisSummary,
    positioningAccuracy,
    ballScrewCriticalSpeed: ballScrewRecommendation,
    manualLibrary: getManualLibrary(
      company,
      productRecommendations.filter((product) => !product.isPlaceholder),
    ),
    companyComparisonLinks: getCompanyComparisonLinks(
      company,
      productRecommendations.filter((product) => !product.isPlaceholder),
    ),
    expertReview: buildExpertReview({
      selectedProduct,
      direction,
      numericInputs,
      thrust,
      peakTorque,
      rpm,
      power,
      fallbackReducer,
      moveTime,
    }),
    packageRecommendation: buildDrivePackage({
      packageBaseProduct: optimalProduct ?? selectedProduct,
      fallbackReducer,
      ballScrewRecommendation,
      lmGuideRecommendation: lmGuideOverride ?? getLmGuideRecommendation(numericInputs.weightKg, environment),
      encoderRecommendation: getEncoderRecommendation(precisionLevel, environment),
      environment,
      precisionLevel,
      calcBasis: { thrust, rpm, peakTorque, power, leadMm: numericInputs.leadMm, direction, weightKg: numericInputs.weightKg },
    }),
  };
}

export function validateInputs(values) {
  const errors = {};

  if (!values.direction) {
    errors.direction = "이동 방향을 선택하세요.";
  }

  if (values.weightKg === null || values.weightKg <= 0) {
    errors.weight = "하중은 0보다 커야 합니다.";
  }

  if (values.strokeMm === null || values.strokeMm <= 0) {
    errors.stroke = "이송 거리는 0보다 크게 입력하세요.";
  }

  const hasSpeed = values.speedMode === "constant"
    ? values.inputSpeedMm !== null && values.inputSpeedMm > 0
    : values.maxSpeedMm !== null && values.maxSpeedMm > 0;
  const hasTime = values.targetTimeSec !== null && values.targetTimeSec > 0;
  const hasStroke = values.strokeMm !== null && values.strokeMm > 0;

  // 속도 또는 (이송거리 + 목표시간) 중 하나는 있어야 함
  if (!hasSpeed && !hasTime) {
    if (values.speedMode === "constant") {
      errors.speed = "속도 또는 목표 시간 중 하나를 입력하세요.";
    } else {
      errors.maxSpeed = "최대속도 또는 목표 시간 중 하나를 입력하세요.";
    }
  }

  if (!hasSpeed && hasTime && !hasStroke) {
    errors.stroke = "목표 시간만 입력할 경우 이송 거리도 함께 입력해야 합니다.";
  }

  if (values.speedMode === "variable" && hasSpeed) {
    if (values.minSpeedMm === null || values.minSpeedMm <= 0) {
      errors.minSpeed = "최소속도는 0보다 커야 합니다.";
    }
    if (values.minSpeedMm !== null && values.maxSpeedMm !== null && values.minSpeedMm >= values.maxSpeedMm) {
      errors.maxSpeed = "최대속도는 최소속도보다 커야 합니다.";
    }
  }

  if (values.targetTimeSec !== null && values.targetTimeSec <= 0) {
    errors.targetTime = "목표 시간은 0보다 커야 합니다.";
  }

  if (values.customLeadRequired && (values.leadMm === null || values.leadMm <= 0)) {
    errors.lead = "직접 입력 리드는 0보다 커야 합니다.";
  }

  return errors;
}
