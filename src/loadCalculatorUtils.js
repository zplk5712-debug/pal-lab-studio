import { MATERIAL_OPTIONS, SHAPE_OPTIONS } from "./loadCalculatorData";
import { GRAVITY, parseNumber as parsePositiveNumber } from "./sharedUtils";

const MM3_PER_M3 = 1_000_000_000;

function mm3ToM3(value) {
  return value / MM3_PER_M3;
}

function m3ToMm3(value) {
  return value * MM3_PER_M3;
}

function getBoundingBoxMetrics(bounds) {
  if (!bounds) {
    return {
      text: "",
      volumeM3: null,
      width: 0,
      depth: 0,
      height: 0,
    };
  }

  const width = Math.max(0, bounds.maxX - bounds.minX);
  const depth = Math.max(0, bounds.maxY - bounds.minY);
  const height = Math.max(0, bounds.maxZ - bounds.minZ);
  const volumeM3 = mm3ToM3(width * depth * height);

  return {
    text: formatBoundingBox(bounds),
    volumeM3,
    width,
    depth,
    height,
  };
}

function getShapeConfig(shape) {
  return SHAPE_OPTIONS.find((item) => item.value === shape) ?? SHAPE_OPTIONS[0];
}

function getModelVolumeM3(form) {
  const manualVolumeMm3 = parsePositiveNumber(form.modelManualVolumeMm3);

  if (manualVolumeMm3 !== null && manualVolumeMm3 > 0) {
    return mm3ToM3(manualVolumeMm3);
  }

  return Number.isFinite(form.modelDetectedVolumeM3) ? form.modelDetectedVolumeM3 : null;
}

function getAssemblyModelVolumeM3(form, assemblyQuantity = 1) {
  if (!Array.isArray(form.modelPartItems) || form.modelPartItems.length === 0) {
    return null;
  }

  return form.modelPartItems.reduce((sum, part) => {
    const partVolumeMm3 = parsePositiveNumber(part.volumeMm3);
    const partCount = Number.isFinite(part.count) ? part.count : 0;

    if (partVolumeMm3 === null || partVolumeMm3 <= 0 || partCount <= 0) {
      return sum;
    }

    return sum + mm3ToM3(partVolumeMm3) * partCount * assemblyQuantity;
  }, 0);
}

function formatBoundingBox(bounds) {
  if (!bounds) {
    return "";
  }

  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxY - bounds.minY;
  const height = bounds.maxZ - bounds.minZ;

  return `${formatLoadNumber(width, 2)} × ${formatLoadNumber(depth, 2)} × ${formatLoadNumber(height, 2)} mm`;
}

function detectBinaryStl(arrayBuffer) {
  if (arrayBuffer.byteLength < 84) {
    return false;
  }

  const view = new DataView(arrayBuffer);
  const triangleCount = view.getUint32(80, true);
  return 84 + triangleCount * 50 === arrayBuffer.byteLength;
}

function updateBounds(bounds, x, y, z) {
  if (!bounds) {
    return { minX: x, maxX: x, minY: y, maxY: y, minZ: z, maxZ: z };
  }

  return {
    minX: Math.min(bounds.minX, x),
    maxX: Math.max(bounds.maxX, x),
    minY: Math.min(bounds.minY, y),
    maxY: Math.max(bounds.maxY, y),
    minZ: Math.min(bounds.minZ, z),
    maxZ: Math.max(bounds.maxZ, z),
  };
}

function signedTriangleVolume(v0, v1, v2) {
  return (
    (v0.x * (v1.y * v2.z - v1.z * v2.y) -
      v0.y * (v1.x * v2.z - v1.z * v2.x) +
      v0.z * (v1.x * v2.y - v1.y * v2.x)) /
    6
  );
}

function parseBinaryStl(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const triangleCount = view.getUint32(80, true);
  let offset = 84;
  let volumeMm3 = 0;
  let bounds = null;

  for (let index = 0; index < triangleCount; index += 1) {
    offset += 12;

    const v0 = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    };
    offset += 12;

    const v1 = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    };
    offset += 12;

    const v2 = {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    };
    offset += 14;

    volumeMm3 += signedTriangleVolume(v0, v1, v2);
    bounds = updateBounds(bounds, v0.x, v0.y, v0.z);
    bounds = updateBounds(bounds, v1.x, v1.y, v1.z);
    bounds = updateBounds(bounds, v2.x, v2.y, v2.z);
  }

  const detectedVolumeM3 = mm3ToM3(Math.abs(volumeMm3));
  const boundingMetrics = getBoundingBoxMetrics(bounds);

  return {
    volumeM3: detectedVolumeM3,
    boundingBox: boundingMetrics.text,
    boundingBoxVolumeM3: boundingMetrics.volumeM3,
    volumeFillRatio:
      boundingMetrics.volumeM3 && boundingMetrics.volumeM3 > 0
        ? detectedVolumeM3 / boundingMetrics.volumeM3
        : null,
    unit: "mm",
    notes: ["STL 메쉬를 기준으로 체적을 자동 계산했습니다."],
    status: "자동 체적 계산 완료",
  };
}

function parseAsciiStl(text) {
  const vertexRegex =
    /vertex\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
  const vertices = [];
  let match = vertexRegex.exec(text);

  while (match) {
    vertices.push({
      x: Number(match[1]),
      y: Number(match[2]),
      z: Number(match[3]),
    });
    match = vertexRegex.exec(text);
  }

  let volumeMm3 = 0;
  let bounds = null;

  for (let index = 0; index < vertices.length; index += 3) {
    const v0 = vertices[index];
    const v1 = vertices[index + 1];
    const v2 = vertices[index + 2];

    if (!v0 || !v1 || !v2) {
      break;
    }

    volumeMm3 += signedTriangleVolume(v0, v1, v2);
    bounds = updateBounds(bounds, v0.x, v0.y, v0.z);
    bounds = updateBounds(bounds, v1.x, v1.y, v1.z);
    bounds = updateBounds(bounds, v2.x, v2.y, v2.z);
  }

  const detectedVolumeM3 = mm3ToM3(Math.abs(volumeMm3));
  const boundingMetrics = getBoundingBoxMetrics(bounds);

  return {
    volumeM3: detectedVolumeM3,
    boundingBox: boundingMetrics.text,
    boundingBoxVolumeM3: boundingMetrics.volumeM3,
    volumeFillRatio:
      boundingMetrics.volumeM3 && boundingMetrics.volumeM3 > 0
        ? detectedVolumeM3 / boundingMetrics.volumeM3
        : null,
    unit: "mm",
    notes: ["ASCII STL 메쉬를 기준으로 체적을 자동 계산했습니다."],
    status: "자동 체적 계산 완료",
  };
}

function inferStepLengthUnit(text) {
  if (/SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\.\s*\)/i.test(text)) {
    return "mm";
  }

  if (/SI_UNIT\s*\(\s*\$?\s*,\s*\.METRE\.\s*\)/i.test(text)) {
    return "m";
  }

  return "unknown";
}

function convertStepVolumeValueToM3(rawVolume, lengthUnit) {
  if (lengthUnit === "mm") {
    return mm3ToM3(rawVolume);
  }

  if (lengthUnit === "m") {
    return rawVolume;
  }

  return null;
}

function decodeUtf16BeHex(hexValue) {
  const cleanHex = hexValue.replace(/\s+/g, "");

  if (!cleanHex || cleanHex.length % 4 !== 0) {
    return "";
  }

  const codePoints = [];

  for (let index = 0; index < cleanHex.length; index += 4) {
    const chunk = cleanHex.slice(index, index + 4);
    const codePoint = Number.parseInt(chunk, 16);

    if (!Number.isFinite(codePoint)) {
      return "";
    }

    codePoints.push(codePoint);
  }

  return String.fromCharCode(...codePoints);
}

function decodeStepName(value, fallback = "Unnamed part") {
  if (!value) {
    return fallback;
  }

  const decoded = value
    .replace(/\\X2\\([0-9A-F]+)\\X0\\/gi, (_, hex) => decodeUtf16BeHex(hex) || "")
    .replace(/\\X\\([0-9A-F]{2})/gi, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/\\P[A-Z]\\?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return decoded || fallback;
}

function extractStepVolumeCandidatesM3(text, lengthUnit) {
  const matches = [...text.matchAll(/VOLUME_MEASURE\s*\(\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*\)/gi)];

  const values = matches
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => convertStepVolumeValueToM3(value, lengthUnit))
    .filter((value) => Number.isFinite(value) && value > 0);

  return [...new Set(values)];
}

function extractStepAssemblyParts(text) {
  const productMatches = [...text.matchAll(/PRODUCT\s*\(\s*'([^']*)'/gi)];
  const productNames = productMatches
    .map((match) => decodeStepName((match[1] || "").trim(), "Unnamed part"))
    .filter((name) => name && name.toUpperCase() !== "NONE");

  const counts = new Map();

  productNames.forEach((name) => {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });

  const parts = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));

  const uniquePartCount = parts.length;
  const totalInstances = parts.reduce((sum, item) => sum + item.count, 0);
  const hasAssemblyUsage = /NEXT_ASSEMBLY_USAGE_OCCURRENCE/i.test(text);

  return {
    assemblyType:
      hasAssemblyUsage || uniquePartCount > 1 || totalInstances > 1 ? "assembly" : "single",
    uniquePartCount,
    totalInstances,
    parts,
  };
}

function parseStepText(text, fileName) {
  const productMatch = text.match(/PRODUCT\s*\(\s*'([^']*)'/i);
  const lengthUnit = inferStepLengthUnit(text);
  const volumeCandidatesM3 = extractStepVolumeCandidatesM3(text, lengthUnit);
  const assembly = extractStepAssemblyParts(text);
  const notes = [];

  if (lengthUnit === "mm") {
    notes.push("STEP 길이 단위를 mm로 인식했습니다.");
  } else if (lengthUnit === "m") {
    notes.push("STEP 길이 단위를 m로 인식했습니다.");
  } else {
    notes.push("STEP 길이 단위를 확정하지 못했습니다.");
  }

  if (volumeCandidatesM3.length > 0) {
    notes.push(`STEP 메타데이터에서 체적 후보 ${volumeCandidatesM3.length}개를 찾았습니다.`);
  } else {
    notes.push("STEP 메타데이터에서 직접 체적을 찾지 못했습니다.");
  }

  if (assembly.assemblyType === "assembly") {
    notes.push(`조립도로 인식했습니다. 고유 부품 ${assembly.uniquePartCount}종입니다.`);
  } else {
    notes.push("단일 파트 STEP으로 인식했습니다.");
  }

  const canMapAssemblyVolumes =
    assembly.assemblyType === "assembly" &&
    volumeCandidatesM3.length > 0 &&
    volumeCandidatesM3.length === assembly.parts.length;

  const partName = decodeStepName(productMatch?.[1], fileName.replace(/\.[^.]+$/, ""));

  return {
    partName,
    volumeM3: volumeCandidatesM3.length > 0 ? Math.max(...volumeCandidatesM3) : null,
    boundingBox: "",
    unit: lengthUnit,
    notes,
    status:
      volumeCandidatesM3.length > 0 ? "STEP 메타데이터 체적 인식 완료" : "STEP 메타데이터만 인식",
    assemblyType: assembly.assemblyType,
    partCount: assembly.uniquePartCount,
    partItems: assembly.parts.map((part, index) => ({
      ...part,
      materialKey: "al6061",
      volumeMm3:
        assembly.assemblyType === "single" && volumeCandidatesM3[0]
          ? String(Math.round(m3ToMm3(volumeCandidatesM3[0])))
          : canMapAssemblyVolumes
            ? String(Math.round(m3ToMm3(volumeCandidatesM3[index] || 0)))
            : "",
      volumeSource:
        assembly.assemblyType === "single" && volumeCandidatesM3[0]
          ? "auto"
          : canMapAssemblyVolumes && volumeCandidatesM3[index]
            ? "auto"
            : "none",
    })),
  };
}

export function formatLoadNumber(value, digits = 2) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "-";
  }

  return numericValue.toLocaleString("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatFileSize(bytes) {
  const value = Number(bytes);

  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  if (value >= 1024 * 1024) {
    return `${formatLoadNumber(value / (1024 * 1024), 2)} MB`;
  }

  return `${formatLoadNumber(value / 1024, 2)} KB`;
}

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function getMaterialOption(materialKey) {
  return MATERIAL_OPTIONS.find((item) => item.key === materialKey) ?? MATERIAL_OPTIONS[0];
}

export async function analyzeModelOnServer(file) {
  const arrayBuffer = await file.arrayBuffer();
  const response = await fetch("/api/analyze-model", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileSizeBytes: file.size,
      dataBase64: arrayBufferToBase64(arrayBuffer),
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.result) {
    throw new Error(payload?.error || "server model analysis failed");
  }

  return payload.result;
}

export async function readModelFile(file) {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;

  if (extension === ".stl") {
    const arrayBuffer = await file.arrayBuffer();
    const parsed = detectBinaryStl(arrayBuffer)
      ? parseBinaryStl(arrayBuffer)
      : parseAsciiStl(new TextDecoder("utf-8").decode(arrayBuffer));

    return {
      modelFileName: file.name,
      modelFileType: extension.toUpperCase().slice(1),
      modelFileSizeBytes: file.size,
      modelPartName: file.name.replace(/\.[^.]+$/, ""),
      modelAnalysisSource: "브라우저 로컬 해석",
      modelDetectedUnit: parsed.unit,
      modelDetectedVolumeM3: parsed.volumeM3,
      modelBoundingBox: parsed.boundingBox,
      modelBoundingBoxVolumeM3: parsed.boundingBoxVolumeM3 ?? null,
      modelVolumeFillRatio: parsed.volumeFillRatio ?? null,
      modelStatus: parsed.status,
      modelNotes: parsed.notes,
      modelAssemblyType: "single",
      modelPartCount: 1,
      modelPartItems: [
        {
          name: file.name.replace(/\.[^.]+$/, ""),
          count: 1,
          materialKey: "al6061",
          volumeMm3: parsed.volumeM3 ? String(Math.round(m3ToMm3(parsed.volumeM3))) : "",
          volumeSource: parsed.volumeM3 ? "auto" : "none",
        },
      ],
    };
  }

  if (extension === ".step" || extension === ".stp") {
    const text = await file.text();
    const parsed = parseStepText(text, file.name);

    return {
      modelFileName: file.name,
      modelFileType: extension.toUpperCase().slice(1),
      modelFileSizeBytes: file.size,
      modelPartName: parsed.partName,
      modelAnalysisSource: "브라우저 로컬 해석",
      modelDetectedUnit: parsed.unit,
      modelDetectedVolumeM3: parsed.volumeM3,
      modelBoundingBox: parsed.boundingBox,
      modelBoundingBoxVolumeM3: null,
      modelVolumeFillRatio: null,
      modelStatus: parsed.status,
      modelNotes: parsed.notes,
      modelAssemblyType: parsed.assemblyType,
      modelPartCount: parsed.partCount,
      modelPartItems: parsed.partItems,
    };
  }

  throw new Error("지원하지 않는 파일 형식입니다. STL, STEP, STP만 업로드할 수 있습니다.");
}

export function validateLoadForm(form) {
  const errors = {};
  const quantity = parsePositiveNumber(form.quantity);
  const safetyFactor = parsePositiveNumber(form.safetyFactor);

  if (quantity === null || quantity <= 0) {
    errors.quantity = "개수는 0보다 커야 합니다.";
  }

  if (safetyFactor === null || safetyFactor <= 0) {
    errors.safetyFactor = "안전율은 0보다 커야 합니다.";
  }

  if (form.inputMode === "manual") {
    const manualValue =
      form.manualInputType === "mass"
        ? parsePositiveNumber(form.massKg)
        : parsePositiveNumber(form.forceN);

    if (manualValue === null || manualValue <= 0) {
      errors.manualValue =
        form.manualInputType === "mass"
          ? "질량은 0보다 커야 합니다."
          : "하중은 0보다 커야 합니다.";
    }

    return errors;
  }

  if (form.inputMode === "model") {
    if (!form.modelFileName) {
      errors.modelFile = "모델링 파일을 업로드해 주세요.";
    }

    if (form.modelAssemblyType === "assembly") {
      if (!Array.isArray(form.modelPartItems) || form.modelPartItems.length === 0) {
        errors.modelPartItems = {
          __root__: {
            volumeMm3: "조립도에서 인식된 부품이 없습니다.",
          },
        };
        return errors;
      }

      if (form.modelUseCommonMaterial) {
        if (!form.modelAssemblyMaterialKey) {
          errors.modelAssemblyMaterialKey = "공통 소재를 선택해 주세요.";
        }
      }

      const partErrors = {};

      form.modelPartItems.forEach((part) => {
        const nextPartError = {};
        const partVolumeMm3 = parsePositiveNumber(part.volumeMm3);

        if (!form.modelUseCommonMaterial && !part.materialKey) {
          nextPartError.materialKey = "소재를 선택해 주세요.";
        }

        if (partVolumeMm3 === null || partVolumeMm3 <= 0) {
          nextPartError.volumeMm3 = "부품 1개 체적을 입력해 주세요.";
        }

        if (Object.keys(nextPartError).length > 0) {
          partErrors[part.name] = nextPartError;
        }
      });

      if (Object.keys(partErrors).length > 0) {
        errors.modelPartItems = partErrors;
      }

      return errors;
    }

    if (!form.materialKey) {
      errors.materialKey = "소재를 선택해 주세요.";
    }

    const manualVolumeMm3 = parsePositiveNumber(form.modelManualVolumeMm3);
    const hasDetectedVolume = Number.isFinite(form.modelDetectedVolumeM3) && form.modelDetectedVolumeM3 > 0;

    if (!hasDetectedVolume && (manualVolumeMm3 === null || manualVolumeMm3 <= 0)) {
      errors.modelManualVolumeMm3 = "자동 체적이 없으면 체적을 직접 입력해야 합니다.";
    }

    if (form.modelManualVolumeMm3 !== "" && (manualVolumeMm3 === null || manualVolumeMm3 <= 0)) {
      errors.modelManualVolumeMm3 = "체적은 0보다 커야 합니다.";
    }

    return errors;
  }

  if (!form.materialKey) {
    errors.materialKey = "소재를 선택해 주세요.";
  }

  const shapeConfig = getShapeConfig(form.shape);

  shapeConfig.fields.forEach((field) => {
    const numericValue = parsePositiveNumber(form[field.key]);

    if (numericValue === null || numericValue <= 0) {
      errors[field.key] = `${field.label}는 0보다 커야 합니다.`;
    }
  });

  if (form.shape === "hollowCylinder") {
    const outerDiameter = parsePositiveNumber(form.outerDiameterMm);
    const innerDiameter = parsePositiveNumber(form.innerDiameterMm);

    if (
      outerDiameter !== null &&
      innerDiameter !== null &&
      outerDiameter > 0 &&
      innerDiameter > 0 &&
      innerDiameter >= outerDiameter
    ) {
      errors.innerDiameterMm = "내경은 외경보다 작아야 합니다.";
    }
  }

  return errors;
}

export function calculateVolumeM3(form) {
  const lengthMm = parsePositiveNumber(form.lengthMm) ?? 0;
  const widthMm = parsePositiveNumber(form.widthMm) ?? 0;
  const heightMm = parsePositiveNumber(form.heightMm) ?? 0;
  const thicknessMm = parsePositiveNumber(form.thicknessMm) ?? 0;
  const diameterMm = parsePositiveNumber(form.diameterMm) ?? 0;
  const outerDiameterMm = parsePositiveNumber(form.outerDiameterMm) ?? 0;
  const innerDiameterMm = parsePositiveNumber(form.innerDiameterMm) ?? 0;
  const volumeMm3 = parsePositiveNumber(form.volumeMm3) ?? 0;

  switch (form.shape) {
    case "box":
      return mm3ToM3(lengthMm * widthMm * heightMm);
    case "cylinder": {
      const radiusMm = diameterMm / 2;
      return mm3ToM3(Math.PI * radiusMm * radiusMm * heightMm);
    }
    case "hollowCylinder": {
      const outerRadiusMm = outerDiameterMm / 2;
      const innerRadiusMm = innerDiameterMm / 2;
      return mm3ToM3(Math.PI * (outerRadiusMm ** 2 - innerRadiusMm ** 2) * heightMm);
    }
    case "plate":
      return mm3ToM3(lengthMm * widthMm * thicknessMm);
    case "customVolume":
      return mm3ToM3(volumeMm3);
    default:
      return 0;
  }
}

export function calculateLoadResult(form) {
  const quantity = parsePositiveNumber(form.quantity) ?? 1;
  const safetyFactor = parsePositiveNumber(form.safetyFactor) ?? 1;

  if (form.inputMode === "manual") {
    const massKg =
      form.manualInputType === "mass"
        ? parsePositiveNumber(form.massKg) ?? 0
        : (parsePositiveNumber(form.forceN) ?? 0) / GRAVITY;
    const weightN =
      form.manualInputType === "force"
        ? parsePositiveNumber(form.forceN) ?? 0
        : massKg * GRAVITY;

    return {
      inputMode: "manual",
      shapeLabel: "수동 하중 입력",
      materialLabel: "직접 입력",
      densityKgM3: null,
      quantity,
      safetyFactor,
      volumeM3: null,
      volumeMm3: null,
      massKg,
      weightN,
      loadKgf: massKg,
      safetyLoadN: weightN * safetyFactor,
      manualInputType: form.manualInputType,
    };
  }

  const material = getMaterialOption(form.materialKey);
  const isAssemblyModel = form.inputMode === "model" && form.modelAssemblyType === "assembly";

  if (isAssemblyModel) {
    const commonMaterial = getMaterialOption(form.modelAssemblyMaterialKey || form.materialKey);
    const useCommonMaterial = Boolean(form.modelUseCommonMaterial);

    const partBreakdown = form.modelPartItems.map((part) => {
      const resolvedMaterial = useCommonMaterial
        ? commonMaterial
        : getMaterialOption(part.materialKey);
      const unitVolumeM3 = mm3ToM3(parsePositiveNumber(part.volumeMm3) ?? 0);
      const totalCount = part.count * quantity;
      const totalVolumeM3 = unitVolumeM3 * totalCount;
      const partMassKg = totalVolumeM3 * resolvedMaterial.densityKgM3;
      const partWeightN = partMassKg * GRAVITY;

      return {
        name: part.name,
        count: part.count,
        totalCount,
        materialKey: resolvedMaterial.key,
        materialLabel: resolvedMaterial.label,
        densityKgM3: resolvedMaterial.densityKgM3,
        unitVolumeM3,
        totalVolumeM3,
        massKg: partMassKg,
        weightN: partWeightN,
      };
    });

    const totalVolumeM3 = getAssemblyModelVolumeM3(form, quantity) ?? 0;
    const totalMassKg = partBreakdown.reduce((sum, part) => sum + part.massKg, 0);
    const weightN = totalMassKg * GRAVITY;

    return {
      inputMode: form.inputMode,
      shapeLabel: "모델링 파일 조립도",
      materialLabel: useCommonMaterial
        ? `${commonMaterial.label} 공통 적용`
        : "부품별 개별 소재 적용",
      densityKgM3: useCommonMaterial ? commonMaterial.densityKgM3 : null,
      quantity,
      safetyFactor,
      volumeM3: totalVolumeM3,
      volumeMm3: m3ToMm3(totalVolumeM3),
      massKg: totalMassKg,
      weightN,
      loadKgf: totalMassKg,
      safetyLoadN: weightN * safetyFactor,
      manualInputType: null,
      modelFileName: form.modelFileName,
      modelPartName: form.modelPartName,
      modelUseCommonMaterial: useCommonMaterial,
      commonMaterialLabel: commonMaterial.label,
      partBreakdown,
    };
  }

  const singleVolumeM3 =
    form.inputMode === "model" ? getModelVolumeM3(form) ?? 0 : calculateVolumeM3(form);
  const totalVolumeM3 = singleVolumeM3 * quantity;
  const totalMassKg = totalVolumeM3 * material.densityKgM3;
  const weightN = totalMassKg * GRAVITY;

  return {
    inputMode: form.inputMode,
    shapeLabel: form.inputMode === "model" ? "모델링 파일" : getShapeConfig(form.shape).label,
    materialLabel: material.label,
    densityKgM3: material.densityKgM3,
    quantity,
    safetyFactor,
    volumeM3: totalVolumeM3,
    volumeMm3: m3ToMm3(totalVolumeM3),
    massKg: totalMassKg,
    weightN,
    loadKgf: totalMassKg,
    safetyLoadN: weightN * safetyFactor,
    manualInputType: null,
    modelFileName: form.modelFileName,
    modelPartName: form.modelPartName,
  };
}

export function summarizeLoadResults(items) {
  return items.reduce(
    (summary, item) => {
      const { result } = item;

      if (Number.isFinite(result.volumeM3)) {
        summary.volumeM3 += result.volumeM3;
      }

      summary.massKg += result.massKg;
      summary.weightN += result.weightN;
      summary.loadKgf += result.loadKgf;
      summary.safetyLoadN += result.safetyLoadN;
      summary.itemCount += 1;

      if (result.inputMode === "direct") {
        summary.directItemCount += 1;
      } else if (result.inputMode === "manual") {
        summary.manualItemCount += 1;
      } else if (result.inputMode === "model") {
        summary.modelItemCount += 1;
      }

      return summary;
    },
    {
      itemCount: 0,
      directItemCount: 0,
      manualItemCount: 0,
      modelItemCount: 0,
      volumeM3: 0,
      massKg: 0,
      weightN: 0,
      loadKgf: 0,
      safetyLoadN: 0,
    },
  );
}
