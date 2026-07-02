export const LM_GUIDE_FIELDS = [
  "id",
  "manufacturer",
  "series",
  "model",
  "railSize",
  "blockType",
  "accuracyGrade",
  "preloadGrade",
  "dynamicLoad_N",
  "staticLoad_N",
  "momentMA_Nm",
  "momentMB_Nm",
  "momentMC_Nm",
  "maxSpeed_m_min",
  "railLength_mm",
  "material",
  "application",
  "catalogUrl",
  "note",
];

export const ENCODER_FIELDS = [
  "id",
  "manufacturer",
  "series",
  "model",
  "encoderType",
  "measurementType",
  "resolution",
  "accuracy",
  "interfaceType",
  "outputSignal",
  "supplyVoltage",
  "maxSpeed_rpm",
  "protectionGrade",
  "shaftType",
  "outerDiameter_mm",
  "measuringLength_mm",
  "application",
  "catalogUrl",
  "note",
];

export const LM_GUIDE_REQUIRED_FIELDS = ["id", "manufacturer", "series", "model"];
export const ENCODER_REQUIRED_FIELDS = ["id", "manufacturer", "series", "model"];

export const LM_GUIDE_NUMERIC_FIELDS = [
  "dynamicLoad_N",
  "staticLoad_N",
  "momentMA_Nm",
  "momentMB_Nm",
  "momentMC_Nm",
  "maxSpeed_m_min",
  "railLength_mm",
];

export const ENCODER_NUMERIC_FIELDS = [
  "maxSpeed_rpm",
  "outerDiameter_mm",
  "measuringLength_mm",
];

export const LM_GUIDE_MANUFACTURERS = [
  "THK",
  "HIWIN",
  "IKO",
  "NSK",
  "PMI",
  "Bosch Rexroth",
];

export const ENCODER_MANUFACTURERS = [
  "HEIDENHAIN",
  "Tamagawa",
  "POSITAL",
  "Hengstler",
  "Kübler",
  "Nidec Avtron",
];

export const PRODUCT_DB_TABS = [
  { id: "lmGuide", label: "LM가이드 DB" },
  { id: "encoder", label: "엔코더 DB" },
];

export const PRODUCT_DB_CONFIG = {
  lmGuide: {
    id: "lmGuide",
    title: "LM가이드 DB",
    fields: LM_GUIDE_FIELDS,
    requiredFields: LM_GUIDE_REQUIRED_FIELDS,
    numericFields: LM_GUIDE_NUMERIC_FIELDS,
    manufacturers: LM_GUIDE_MANUFACTURERS,
    sampleFileName: "lm-guide-sample",
    detailTitle: "LM가이드 상세",
    searchPlaceholder: "시리즈 또는 모델명 검색",
    keySpecs: ["railSize", "blockType", "accuracyGrade", "dynamicLoad_N", "staticLoad_N"],
  },
  encoder: {
    id: "encoder",
    title: "엔코더 DB",
    fields: ENCODER_FIELDS,
    requiredFields: ENCODER_REQUIRED_FIELDS,
    numericFields: ENCODER_NUMERIC_FIELDS,
    manufacturers: ENCODER_MANUFACTURERS,
    sampleFileName: "encoder-sample",
    detailTitle: "엔코더 상세",
    searchPlaceholder: "시리즈 또는 모델명 검색",
    keySpecs: ["encoderType", "measurementType", "resolution", "interfaceType", "maxSpeed_rpm"],
  },
};

export const LM_GUIDE_SAMPLE_ROW = {
  id: "lm-guide-sample-001",
  manufacturer: "HIWIN",
  series: "HGR",
  model: "HGR20CA",
  railSize: "20",
  blockType: "CA",
  accuracyGrade: "catalog_check_required",
  preloadGrade: "catalog_check_required",
  dynamicLoad_N: null,
  staticLoad_N: null,
  momentMA_Nm: null,
  momentMB_Nm: null,
  momentMC_Nm: null,
  maxSpeed_m_min: null,
  railLength_mm: null,
  material: "bearing_steel",
  application: "general_precision_motion",
  catalogUrl: "https://www.hiwin.com/",
  note: "catalog_check_required",
};

export const ENCODER_SAMPLE_ROW = {
  id: "encoder-sample-001",
  manufacturer: "HEIDENHAIN",
  series: "ERN",
  model: "ERN1387",
  encoderType: "incremental",
  measurementType: "rotary",
  resolution: "catalog_check_required",
  accuracy: "catalog_check_required",
  interfaceType: "catalog_check_required",
  outputSignal: "catalog_check_required",
  supplyVoltage: "catalog_check_required",
  maxSpeed_rpm: null,
  protectionGrade: "catalog_check_required",
  shaftType: "solid_shaft",
  outerDiameter_mm: null,
  measuringLength_mm: null,
  application: "precision_positioning",
  catalogUrl: "https://www.heidenhain.com/",
  note: "catalog_check_required",
};
