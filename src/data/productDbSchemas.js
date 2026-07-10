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

export const VACUUM_FIELDS = [
  "id",
  "manufacturer",
  "partType",
  "series",
  "model",
  "flangeStandard",
  "flangeSize",
  "material",
  "sealType",
  "maxBakeoutTemp_C",
  "leakRate_mbarLs",
  "boltHoles",
  "tubeOD_mm",
  "weight_g",
  "application",
  "catalogUrl",
  "note",
];

export const MOTOR_FIELDS = [
  "id",
  "manufacturer",
  "motorType",
  "series",
  "model",
  "ratedTorque_Ncm",
  "holdingTorque_Ncm",
  "ratedSpeed_rpm",
  "ratedVoltage_V",
  "ratedCurrent_A",
  "stepAngle_deg",
  "frameSize_mm",
  "shaftDiameter_mm",
  "builtInEncoder",
  "weight_kg",
  "application",
  "catalogUrl",
  "note",
];

export const REDUCER_FIELDS = [
  "id",
  "manufacturer",
  "series",
  "model",
  "reducerType",
  "reductionRatio",
  "ratedTorque_Nm",
  "maxTorque_Nm",
  "backlash_arcmin",
  "efficiency_pct",
  "inputShaftDiameter_mm",
  "outputShaftDiameter_mm",
  "weight_kg",
  "application",
  "catalogUrl",
  "note",
];

export const BALL_SCREW_FIELDS = [
  "id",
  "manufacturer",
  "series",
  "model",
  "shaftDiameter_mm",
  "lead_mm",
  "accuracyGrade",
  "nutType",
  "dynamicLoad_N",
  "staticLoad_N",
  "maxRotationSpeed_rpm",
  "screwLength_mm",
  "material",
  "application",
  "catalogUrl",
  "note",
];

export const ELECTRIC_ACTUATOR_FIELDS = [
  "id",
  "manufacturer",
  "actuatorType",
  "series",
  "model",
  "strokeRange_mm",
  "maxSpeed_mm_s",
  "maxThrust_N",
  "repeatability_mm",
  "driveMethod",
  "motorIncluded",
  "weight_kg",
  "application",
  "catalogUrl",
  "note",
];

export const VACUUM_PUMP_FIELDS = [
  "id",
  "manufacturer",
  "pumpType",
  "series",
  "model",
  "pumpingSpeed_Ls",
  "ultimatePressure_mbar",
  "inletFlangeSize",
  "powerConsumption_W",
  "noiseLevel_dB",
  "coolingType",
  "controllerIncluded",
  "weight_kg",
  "application",
  "catalogUrl",
  "note",
];

export const VACUUM_VALVE_FIELDS = [
  "id",
  "manufacturer",
  "valveType",
  "series",
  "model",
  "flangeSize",
  "actuationType",
  "sealType",
  "orificeSize_mm",
  "maxBakeoutTemp_C",
  "leakRate_mbarLs",
  "weight_kg",
  "application",
  "catalogUrl",
  "note",
];

export const VACUUM_MOTION_FIELDS = [
  "id",
  "manufacturer",
  "motionType",
  "series",
  "model",
  "flangeSize",
  "travelRange_mm",
  "rotationRange_deg",
  "actuationType",
  "positioningAccuracy",
  "maxBakeoutTemp_C",
  "weight_kg",
  "application",
  "catalogUrl",
  "note",
];

export const VACUUM_GAUGE_FIELDS = [
  "id",
  "manufacturer",
  "gaugeType",
  "series",
  "model",
  "measurementRange_mbar",
  "flangeSize",
  "outputSignal",
  "controllerRequired",
  "maxBakeoutTemp_C",
  "application",
  "catalogUrl",
  "note",
];

export const LM_GUIDE_REQUIRED_FIELDS = ["id", "manufacturer", "series", "model"];
export const ENCODER_REQUIRED_FIELDS = ["id", "manufacturer", "series", "model"];
export const VACUUM_REQUIRED_FIELDS = ["id", "manufacturer", "partType", "model"];
export const MOTOR_REQUIRED_FIELDS = ["id", "manufacturer", "motorType", "model"];
export const REDUCER_REQUIRED_FIELDS = ["id", "manufacturer", "series", "model"];
export const BALL_SCREW_REQUIRED_FIELDS = ["id", "manufacturer", "series", "model"];
export const ELECTRIC_ACTUATOR_REQUIRED_FIELDS = ["id", "manufacturer", "actuatorType", "model"];
export const VACUUM_PUMP_REQUIRED_FIELDS = ["id", "manufacturer", "pumpType", "model"];
export const VACUUM_VALVE_REQUIRED_FIELDS = ["id", "manufacturer", "valveType", "model"];
export const VACUUM_MOTION_REQUIRED_FIELDS = ["id", "manufacturer", "motionType", "model"];
export const VACUUM_GAUGE_REQUIRED_FIELDS = ["id", "manufacturer", "gaugeType", "model"];

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

export const VACUUM_NUMERIC_FIELDS = [
  "maxBakeoutTemp_C",
  "leakRate_mbarLs",
  "boltHoles",
  "tubeOD_mm",
  "weight_g",
];

export const MOTOR_NUMERIC_FIELDS = [
  "ratedTorque_Ncm",
  "holdingTorque_Ncm",
  "ratedSpeed_rpm",
  "ratedVoltage_V",
  "ratedCurrent_A",
  "stepAngle_deg",
  "frameSize_mm",
  "shaftDiameter_mm",
  "weight_kg",
];

export const REDUCER_NUMERIC_FIELDS = [
  "reductionRatio",
  "ratedTorque_Nm",
  "maxTorque_Nm",
  "backlash_arcmin",
  "efficiency_pct",
  "inputShaftDiameter_mm",
  "outputShaftDiameter_mm",
  "weight_kg",
];

export const BALL_SCREW_NUMERIC_FIELDS = [
  "shaftDiameter_mm",
  "lead_mm",
  "dynamicLoad_N",
  "staticLoad_N",
  "maxRotationSpeed_rpm",
  "screwLength_mm",
];

export const ELECTRIC_ACTUATOR_NUMERIC_FIELDS = [
  "strokeRange_mm",
  "maxSpeed_mm_s",
  "maxThrust_N",
  "repeatability_mm",
  "weight_kg",
];

export const VACUUM_PUMP_NUMERIC_FIELDS = [
  "pumpingSpeed_Ls",
  "ultimatePressure_mbar",
  "powerConsumption_W",
  "noiseLevel_dB",
  "weight_kg",
];

export const VACUUM_VALVE_NUMERIC_FIELDS = [
  "orificeSize_mm",
  "maxBakeoutTemp_C",
  "leakRate_mbarLs",
  "weight_kg",
];

export const VACUUM_MOTION_NUMERIC_FIELDS = [
  "travelRange_mm",
  "rotationRange_deg",
  "maxBakeoutTemp_C",
  "weight_kg",
];

export const VACUUM_GAUGE_NUMERIC_FIELDS = ["maxBakeoutTemp_C"];

export const VACUUM_GAUGE_TYPES = [
  "열전대 게이지",
  "피라니 게이지",
  "이온 게이지 (핫캐소드)",
  "이온 게이지 (콜드캐소드)",
  "풀레인지 게이지",
  "커패시턴스 마노미터",
  "부르동 게이지",
];

export const LM_GUIDE_MANUFACTURERS = [
  "THK",
  "HIWIN",
  "IKO",
  "NSK",
  "PMI",
  "Bosch Rexroth",
  "MISUMI",
];

export const ENCODER_MANUFACTURERS = [
  "HEIDENHAIN",
  "Tamagawa",
  "POSITAL",
  "Hengstler",
  "Kübler",
  "Nidec Avtron",
];

export const VACUUM_MANUFACTURERS = [
  "MDC Precision",
  "Kurt J. Lesker",
  "Pfeiffer Vacuum",
  "VACOM",
  "Nor-Cal Products",
  "Duniway Stockroom",
  "호원 (Hohwon)",
];

export const VACUUM_PART_TYPES = [
  "플랜지/피팅",
  "챔버",
  "러핑 부품",
  "전기 피드스루",
  "뷰포트/글래스",
  "진공 브레이크",
  "진공 측정",
  "하드웨어/액세서리",
];

export const MOTOR_MANUFACTURERS = [
  "Oriental Motor",
  "Nanomotion",
  "Physik Instrumente (PI)",
  "Yaskawa",
  "Panasonic",
  "Faulhaber",
  "MISUMI",
];

export const MOTOR_TYPES = [
  "3상 스텝모터",
  "2상 스텝모터",
  "AC 서보모터",
  "압전모터 (Nanomotion)",
];

export const REDUCER_MANUFACTURERS = [
  "Harmonic Drive",
  "Neugart",
  "Apex Dynamics",
  "Sumitomo",
  "Nabtesco",
  "Wittenstein",
];

export const BALL_SCREW_MANUFACTURERS = [
  "THK",
  "HIWIN",
  "NSK",
  "PMI",
  "Bosch Rexroth",
  "Nook Industries",
  "MISUMI",
];

export const ELECTRIC_ACTUATOR_MANUFACTURERS = [
  "Oriental Motor",
  "SMC",
  "IAI",
  "THK",
  "Parker",
];

export const ELECTRIC_ACTUATOR_TYPES = [
  "볼스크류형 슬라이더",
  "벨트구동형 슬라이더",
  "로드형(실린더)",
  "미니 슬라이드 테이블",
];

export const VACUUM_PUMP_MANUFACTURERS = [
  "Edwards",
  "Pfeiffer Vacuum",
  "Agilent (Varian)",
  "Leybold",
  "Osaka Vacuum",
  "Ulvac",
  "PerkinElmer (Ultek)",
  "Alpha-EVS",
];

export const VACUUM_PUMP_TYPES = [
  "로터리 베인 펌프",
  "드라이 스크롤 펌프",
  "터보분자 펌프",
  "이온 펌프",
  "극저온(크라이오) 펌프",
  "티타늄 서브리메이션 펌프",
];

export const VACUUM_VALVE_MANUFACTURERS = [
  "VAT Vakuumventile",
  "MDC Precision",
  "Kurt J. Lesker",
  "Pfeiffer Vacuum",
  "VACOM",
  "Nor-Cal Products",
  "호원 (Hohwon)",
];

export const VACUUM_VALVE_TYPES = [
  "게이트 밸브",
  "앵글 밸브",
  "버터플라이 밸브",
  "체크 밸브",
  "벤트/릴리프 밸브",
  "볼 밸브",
];

export const VACUUM_MOTION_MANUFACTURERS = [
  "UHV Design",
  "Huntington Mechanical Labs",
  "MDC Precision",
  "Kurt J. Lesker",
  "VACOM",
  "Thermionics",
];

export const VACUUM_MOTION_TYPES = [
  "리니어 매니퓰레이터",
  "로터리 매니퓰레이터",
  "XYZ 매니퓰레이터",
  "워블 스틱",
  "벨로우즈 실 구동장치",
  "트랜스퍼 암",
];

export const PRODUCT_DB_TABS = [
  { id: "motor", label: "모터 DB" },
  { id: "reducer", label: "감속기 DB" },
  { id: "ballScrew", label: "볼스크류 DB" },
  { id: "electricActuator", label: "전동 액추에이터 DB" },
  { id: "lmGuide", label: "LM가이드 DB" },
  { id: "encoder", label: "엔코더 DB" },
  { id: "vacuum", label: "진공부품 DB" },
  { id: "vacuumPump", label: "진공펌프 DB" },
  { id: "vacuumValve", label: "진공밸브 DB" },
  { id: "vacuumMotion", label: "진공모션·매니퓰레이터 DB" },
  { id: "vacuumGauge", label: "진공 게이지 DB" },
];

export const PRODUCT_DB_CATEGORIES = [
  {
    id: "motion",
    label: "모션 구동계",
    description: "모션 설계 도우미가 추천하는 핵심 구동계 부품군",
    tabs: ["motor", "reducer", "ballScrew", "electricActuator", "lmGuide"],
  },
  {
    id: "sensor",
    label: "센서·피드백",
    description: "위치·속도 피드백 및 진공 측정용 센서 부품군",
    tabs: ["encoder", "vacuumGauge"],
  },
  {
    id: "vacuumComponents",
    label: "진공부품",
    description: "PAL UHV/HV 빔라인 표준에 맞춘 진공 부품군",
    tabs: ["vacuum", "vacuumPump", "vacuumValve", "vacuumMotion"],
  },
];

export const PRODUCT_DB_CONFIG = {
  motor: {
    id: "motor",
    title: "모터 DB",
    fields: MOTOR_FIELDS,
    requiredFields: MOTOR_REQUIRED_FIELDS,
    numericFields: MOTOR_NUMERIC_FIELDS,
    manufacturers: MOTOR_MANUFACTURERS,
    sampleFileName: "motor-sample",
    detailTitle: "모터 상세",
    searchPlaceholder: "제조사·시리즈·모델명 검색",
    keySpecs: ["motorType", "ratedTorque_Ncm", "holdingTorque_Ncm", "ratedVoltage_V", "frameSize_mm"],
    subCategoryField: null,
    subCategoryLabel: null,
    subCategories: [],
    compareField: "frameSize_mm",
    compareLabel: "프레임 사이즈",
  },
  reducer: {
    id: "reducer",
    title: "감속기 DB",
    fields: REDUCER_FIELDS,
    requiredFields: REDUCER_REQUIRED_FIELDS,
    numericFields: REDUCER_NUMERIC_FIELDS,
    manufacturers: REDUCER_MANUFACTURERS,
    sampleFileName: "reducer-sample",
    detailTitle: "감속기 상세",
    searchPlaceholder: "제조사·시리즈·모델명 검색",
    keySpecs: ["reducerType", "reductionRatio", "ratedTorque_Nm", "backlash_arcmin"],
    subCategoryField: null,
    subCategoryLabel: null,
    subCategories: [],
    compareField: "reductionRatio",
    compareLabel: "감속비",
  },
  ballScrew: {
    id: "ballScrew",
    title: "볼스크류 DB",
    fields: BALL_SCREW_FIELDS,
    requiredFields: BALL_SCREW_REQUIRED_FIELDS,
    numericFields: BALL_SCREW_NUMERIC_FIELDS,
    manufacturers: BALL_SCREW_MANUFACTURERS,
    sampleFileName: "ball-screw-sample",
    detailTitle: "볼스크류 상세",
    searchPlaceholder: "제조사·시리즈·모델명 검색",
    keySpecs: ["shaftDiameter_mm", "lead_mm", "accuracyGrade", "dynamicLoad_N"],
    subCategoryField: null,
    subCategoryLabel: null,
    subCategories: [],
    compareField: "shaftDiameter_mm",
    compareLabel: "축 지름",
  },
  electricActuator: {
    id: "electricActuator",
    title: "전동 액추에이터 DB",
    fields: ELECTRIC_ACTUATOR_FIELDS,
    requiredFields: ELECTRIC_ACTUATOR_REQUIRED_FIELDS,
    numericFields: ELECTRIC_ACTUATOR_NUMERIC_FIELDS,
    manufacturers: ELECTRIC_ACTUATOR_MANUFACTURERS,
    sampleFileName: "electric-actuator-sample",
    detailTitle: "전동 액추에이터 상세",
    searchPlaceholder: "제조사·시리즈·모델명 검색",
    keySpecs: ["actuatorType", "strokeRange_mm", "maxSpeed_mm_s", "maxThrust_N"],
    subCategoryField: null,
    subCategoryLabel: null,
    subCategories: [],
    compareField: "driveMethod",
    compareLabel: "구동 방식",
  },
  lmGuide: {
    id: "lmGuide",
    title: "LM가이드 DB",
    fields: LM_GUIDE_FIELDS,
    requiredFields: LM_GUIDE_REQUIRED_FIELDS,
    numericFields: LM_GUIDE_NUMERIC_FIELDS,
    manufacturers: LM_GUIDE_MANUFACTURERS,
    sampleFileName: "lm-guide-sample",
    detailTitle: "LM가이드 상세",
    searchPlaceholder: "제조사·시리즈·모델명 검색",
    keySpecs: ["railSize", "blockType", "accuracyGrade", "dynamicLoad_N", "staticLoad_N"],
    subCategoryField: null,
    subCategoryLabel: null,
    subCategories: [],
    compareField: "railSize",
    compareLabel: "레일 사이즈",
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
    searchPlaceholder: "제조사·시리즈·모델명 검색",
    keySpecs: ["encoderType", "measurementType", "resolution", "interfaceType", "maxSpeed_rpm"],
    subCategoryField: null,
    subCategoryLabel: null,
    subCategories: [],
    compareField: "resolution",
    compareLabel: "분해능",
  },
  vacuum: {
    id: "vacuum",
    title: "진공부품 DB",
    fields: VACUUM_FIELDS,
    requiredFields: VACUUM_REQUIRED_FIELDS,
    numericFields: VACUUM_NUMERIC_FIELDS,
    manufacturers: VACUUM_MANUFACTURERS,
    sampleFileName: "vacuum-parts-sample",
    detailTitle: "진공부품 상세",
    searchPlaceholder: "제조사·시리즈·모델명 검색",
    keySpecs: ["partType", "flangeStandard", "flangeSize", "material", "sealType"],
    subCategoryField: null,
    subCategoryLabel: null,
    subCategories: [],
    compareField: "flangeSize",
    compareLabel: "플랜지 사이즈",
  },
  vacuumPump: {
    id: "vacuumPump",
    title: "진공펌프 DB",
    fields: VACUUM_PUMP_FIELDS,
    requiredFields: VACUUM_PUMP_REQUIRED_FIELDS,
    numericFields: VACUUM_PUMP_NUMERIC_FIELDS,
    manufacturers: VACUUM_PUMP_MANUFACTURERS,
    sampleFileName: "vacuum-pump-sample",
    detailTitle: "진공펌프 상세",
    searchPlaceholder: "제조사·시리즈·모델명 검색",
    keySpecs: ["pumpType", "pumpingSpeed_Ls", "ultimatePressure_mbar", "inletFlangeSize"],
    subCategoryField: null,
    subCategoryLabel: null,
    subCategories: [],
    compareField: "inletFlangeSize",
    compareLabel: "흡입 플랜지",
  },
  vacuumValve: {
    id: "vacuumValve",
    title: "진공밸브 DB",
    fields: VACUUM_VALVE_FIELDS,
    requiredFields: VACUUM_VALVE_REQUIRED_FIELDS,
    numericFields: VACUUM_VALVE_NUMERIC_FIELDS,
    manufacturers: VACUUM_VALVE_MANUFACTURERS,
    sampleFileName: "vacuum-valve-sample",
    detailTitle: "진공밸브 상세",
    searchPlaceholder: "제조사·시리즈·모델명 검색",
    keySpecs: ["valveType", "flangeSize", "actuationType", "sealType"],
    subCategoryField: null,
    subCategoryLabel: null,
    subCategories: [],
    compareField: "flangeSize",
    compareLabel: "플랜지 사이즈",
  },
  vacuumMotion: {
    id: "vacuumMotion",
    title: "진공모션·매니퓰레이터 DB",
    fields: VACUUM_MOTION_FIELDS,
    requiredFields: VACUUM_MOTION_REQUIRED_FIELDS,
    numericFields: VACUUM_MOTION_NUMERIC_FIELDS,
    manufacturers: VACUUM_MOTION_MANUFACTURERS,
    sampleFileName: "vacuum-motion-sample",
    detailTitle: "진공모션·매니퓰레이터 상세",
    searchPlaceholder: "제조사·시리즈·모델명 검색",
    keySpecs: ["motionType", "flangeSize", "travelRange_mm", "rotationRange_deg"],
    subCategoryField: null,
    subCategoryLabel: null,
    subCategories: [],
    compareField: "flangeSize",
    compareLabel: "플랜지 사이즈",
  },
  vacuumGauge: {
    id: "vacuumGauge",
    title: "진공 게이지 DB",
    fields: VACUUM_GAUGE_FIELDS,
    requiredFields: VACUUM_GAUGE_REQUIRED_FIELDS,
    numericFields: VACUUM_GAUGE_NUMERIC_FIELDS,
    manufacturers: ["MDC Precision", "Pfeiffer Vacuum", "Edwards", "Agilent (Varian)", "Kurt J. Lesker", "INFICON"],
    sampleFileName: "vacuum-gauge-sample",
    detailTitle: "진공 게이지 상세",
    searchPlaceholder: "제조사·시리즈·모델명 검색",
    keySpecs: ["gaugeType", "measurementRange_mbar", "flangeSize", "outputSignal"],
    subCategoryField: null,
    subCategoryLabel: null,
    subCategories: [],
    compareField: "gaugeType",
    compareLabel: "게이지 종류",
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
  catalogUrl: "https://hiwin.com/products/linear-guideways/",
  note: "catalog_check_required",
};

export const MOTOR_SAMPLE_ROW = {
  id: "motor-oriental-blm-sample",
  manufacturer: "Oriental Motor",
  motorType: "3상 스텝모터",
  series: "BLE2",
  model: "BLM5200HP-GFS",
  ratedTorque_Ncm: "catalog_check_required",
  holdingTorque_Ncm: null,
  ratedSpeed_rpm: null,
  ratedVoltage_V: 200,
  ratedCurrent_A: "catalog_check_required",
  stepAngle_deg: null,
  frameSize_mm: 60,
  shaftDiameter_mm: null,
  builtInEncoder: "catalog_check_required",
  weight_kg: null,
  application: "precision_stage_drive",
  catalogUrl: "https://www.orientalmotor.com/stepper-motors/5-phase-stepper-motors-pkp-series.html",
  note: "catalog_check_required",
};

export const REDUCER_SAMPLE_ROW = {
  id: "reducer-harmonic-sample",
  manufacturer: "Harmonic Drive",
  series: "CSF",
  model: "CSF-25-100-2A",
  reducerType: "하모닉 드라이브",
  reductionRatio: 100,
  ratedTorque_Nm: "catalog_check_required",
  maxTorque_Nm: null,
  backlash_arcmin: "catalog_check_required",
  efficiency_pct: null,
  inputShaftDiameter_mm: null,
  outputShaftDiameter_mm: null,
  weight_kg: null,
  application: "precision_positioning_gearhead",
  catalogUrl: "https://www.harmonicdrive.net/products/component-sets/cup-type/csf-2a-lw",
  note: "catalog_check_required",
};

export const BALL_SCREW_SAMPLE_ROW = {
  id: "ballscrew-thk-sample",
  manufacturer: "THK",
  series: "BNK",
  model: "BNK1605",
  shaftDiameter_mm: 16,
  lead_mm: 5,
  accuracyGrade: "catalog_check_required",
  nutType: "catalog_check_required",
  dynamicLoad_N: null,
  staticLoad_N: null,
  maxRotationSpeed_rpm: null,
  screwLength_mm: null,
  material: "bearing_steel",
  application: "precision_linear_drive",
  catalogUrl: "https://www.thk.com/us/en/products/ball_screw/",
  note: "catalog_check_required",
};

export const ELECTRIC_ACTUATOR_SAMPLE_ROW = {
  id: "actuator-oriental-eac-sample",
  manufacturer: "Oriental Motor",
  actuatorType: "로드형(실린더)",
  series: "EAC",
  model: "EAC4R (구성형 파트넘버)",
  strokeRange_mm: 100,
  maxSpeed_mm_s: "catalog_check_required",
  maxThrust_N: "catalog_check_required",
  repeatability_mm: "catalog_check_required",
  driveMethod: "ball_screw",
  motorIncluded: "yes_alphastep_az_series",
  weight_kg: "catalog_check_required",
  application: "general_purpose_electric_cylinder",
  catalogUrl: "https://us.misumi-ec.com/vona2/detail/221303549504/",
  note: "catalog_check_required",
};

export const VACUUM_SAMPLE_ROW = {
  id: "vac-mdc-cf275-304ss",
  manufacturer: "MDC Precision",
  partType: "플랜지/피팅",
  series: "ConFlat (CF)",
  model: "CF275-304SS",
  flangeStandard: "CF",
  flangeSize: "DN40CF (2.75in)",
  material: "304_stainless_steel",
  sealType: "copper_gasket_metal_seal",
  maxBakeoutTemp_C: "catalog_check_required",
  leakRate_mbarLs: "catalog_check_required",
  boltHoles: 6,
  tubeOD_mm: null,
  weight_g: null,
  application: "uhv_flange_connection",
  catalogUrl: "https://www.mdcprecision.com/categories/vacuum-flanges-and-fittings",
  note: "catalog_check_required",
};

export const VACUUM_PUMP_SAMPLE_ROW = {
  id: "vacpump-edwards-nxds-sample",
  manufacturer: "Edwards",
  pumpType: "드라이 스크롤 펌프",
  series: "nXDS",
  model: "nXDS10i",
  pumpingSpeed_Ls: "catalog_check_required",
  ultimatePressure_mbar: "catalog_check_required",
  inletFlangeSize: "KF25",
  powerConsumption_W: null,
  noiseLevel_dB: null,
  coolingType: "air_cooled",
  controllerIncluded: "catalog_check_required",
  weight_kg: null,
  application: "dry_roughing_pump",
  catalogUrl: "https://www.edwardsvacuum.com/en-us/vacuum-pumps/our-products/dry-pumps/nxds-dry-scroll-pumps",
  note: "catalog_check_required",
};

export const VACUUM_VALVE_SAMPLE_ROW = {
  id: "vacvalve-vat-gate-sample",
  manufacturer: "VAT Vakuumventile",
  valveType: "게이트 밸브",
  series: "Series 10",
  model: "10836-KE44",
  flangeSize: "DN40CF (2.75in)",
  actuationType: "pneumatic",
  sealType: "elastomer",
  orificeSize_mm: null,
  maxBakeoutTemp_C: "catalog_check_required",
  leakRate_mbarLs: "catalog_check_required",
  weight_kg: null,
  application: "uhv_isolation_valve",
  catalogUrl: "https://www.lesker.com/valves/vat-valves/part/10836-ce44",
  note: "catalog_check_required",
};

export const VACUUM_MOTION_SAMPLE_ROW = {
  id: "vacmotion-uhvdesign-linear-sample",
  manufacturer: "UHV Design",
  motionType: "리니어 매니퓰레이터",
  series: "MDC-LT",
  model: "LT100-DN40CF",
  flangeSize: "DN40CF (2.75in)",
  travelRange_mm: 100,
  rotationRange_deg: null,
  actuationType: "manual_micrometer",
  positioningAccuracy: "catalog_check_required",
  maxBakeoutTemp_C: "catalog_check_required",
  weight_kg: null,
  application: "sample_positioning_uhv",
  catalogUrl: "https://www.uhvdesign.com/products/y-xy-xyz-and-xyzt-motion/",
  note: "catalog_check_required",
};

export const VACUUM_GAUGE_SAMPLE_ROW = {
  id: "vacgauge-mdc-tc-sample",
  manufacturer: "MDC Precision",
  gaugeType: "열전대 게이지",
  series: "Thermocouple Gauge Tube",
  model: "432013",
  measurementRange_mbar: "1e-3 ~ 1 (대략)",
  flangeSize: "KF16 (NW16)",
  outputSignal: "thermocouple_mV",
  controllerRequired: "yes",
  maxBakeoutTemp_C: "catalog_check_required",
  application: "roughing_pressure_monitoring",
  catalogUrl: "https://www.mdcprecision.com/products/thermocouple-gauge-tubes",
  note: "catalog_check_required",
};

export const ENCODER_SAMPLE_ROW = {
  id: "encoder-sample-001",
  manufacturer: "HEIDENHAIN",
  series: "ERN",
  model: "ERN1387",
  encoderType: "인크리멘탈",
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
  catalogUrl: "https://www.heidenhain.com/products/rotary-encoders/external/ern-400",
  note: "catalog_check_required",
};

export const FIELD_LABELS = {
  id: "ID",
  manufacturer: "제조사",
  series: "시리즈",
  model: "모델명",
  material: "재질",
  application: "용도",
  catalogUrl: "카탈로그 링크",
  note: "비고",
  weight_kg: "중량 (kg)",
  weight_g: "중량 (g)",

  // 모터
  motorType: "모터 종류",
  ratedTorque_Ncm: "정격 토크 (N·cm)",
  holdingTorque_Ncm: "정지 토크 (N·cm)",
  ratedSpeed_rpm: "정격 속도 (rpm)",
  ratedVoltage_V: "정격 전압 (V)",
  ratedCurrent_A: "정격 전류 (A)",
  stepAngle_deg: "스텝각 (°)",
  frameSize_mm: "프레임 사이즈 (mm)",
  shaftDiameter_mm: "축 지름 (mm)",
  builtInEncoder: "내장 엔코더",

  // 감속기
  reducerType: "감속기 종류",
  reductionRatio: "감속비",
  ratedTorque_Nm: "정격 토크 (N·m)",
  maxTorque_Nm: "최대 토크 (N·m)",
  backlash_arcmin: "백래시 (arcmin)",
  efficiency_pct: "효율 (%)",
  inputShaftDiameter_mm: "입력축 지름 (mm)",
  outputShaftDiameter_mm: "출력축 지름 (mm)",

  // 볼스크류
  lead_mm: "리드 (mm)",
  accuracyGrade: "정밀 등급",
  nutType: "너트 타입",
  dynamicLoad_N: "동적 정격하중 (N)",
  staticLoad_N: "정적 정격하중 (N)",
  maxRotationSpeed_rpm: "최대 회전속도 (rpm)",
  screwLength_mm: "스크류 길이 (mm)",

  // 전동 액추에이터
  actuatorType: "액추에이터 종류",
  strokeRange_mm: "스트로크 (mm)",
  maxSpeed_mm_s: "최대 속도 (mm/s)",
  maxThrust_N: "최대 추력 (N)",
  repeatability_mm: "반복 정밀도 (mm)",
  driveMethod: "구동 방식",
  motorIncluded: "모터 포함 여부",

  // LM가이드
  railSize: "레일 사이즈",
  blockType: "블록 타입",
  preloadGrade: "예압 등급",
  momentMA_Nm: "모멘트 MA (N·m)",
  momentMB_Nm: "모멘트 MB (N·m)",
  momentMC_Nm: "모멘트 MC (N·m)",
  maxSpeed_m_min: "최대 속도 (m/min)",
  railLength_mm: "레일 길이 (mm)",

  // 엔코더
  encoderType: "엔코더 종류",
  measurementType: "측정 방식",
  resolution: "분해능",
  accuracy: "정확도",
  interfaceType: "인터페이스",
  outputSignal: "출력 신호",
  supplyVoltage: "공급 전압",
  maxSpeed_rpm: "최대 속도 (rpm)",
  protectionGrade: "보호 등급",
  shaftType: "축 타입",
  outerDiameter_mm: "외경 (mm)",
  measuringLength_mm: "측정 길이 (mm)",

  // 진공부품
  partType: "부품 종류",
  flangeStandard: "플랜지 규격",
  flangeSize: "플랜지 사이즈",
  sealType: "실 종류",
  maxBakeoutTemp_C: "최대 베이크아웃 온도 (°C)",
  leakRate_mbarLs: "누설률 (mbar·L/s)",
  boltHoles: "볼트홀 수",
  tubeOD_mm: "튜브 외경 (mm)",

  // 진공펌프
  pumpType: "펌프 종류",
  pumpingSpeed_Ls: "배기속도 (L/s)",
  ultimatePressure_mbar: "도달 진공도 (mbar)",
  inletFlangeSize: "흡입 플랜지",
  powerConsumption_W: "소비전력 (W)",
  noiseLevel_dB: "소음 (dB)",
  coolingType: "냉각 방식",
  controllerIncluded: "컨트롤러 포함 여부",

  // 진공밸브
  valveType: "밸브 종류",
  actuationType: "구동 방식",
  orificeSize_mm: "오리피스 사이즈 (mm)",

  // 진공모션
  motionType: "모션 종류",
  travelRange_mm: "이송 범위 (mm)",
  rotationRange_deg: "회전 범위 (°)",
  positioningAccuracy: "위치결정 정밀도",

  // 진공 게이지
  gaugeType: "게이지 종류",
  measurementRange_mbar: "측정 범위 (mbar)",
  controllerRequired: "컨트롤러 필요 여부",
};

export function getFieldLabel(field) {
  return FIELD_LABELS[field] ?? field;
}
