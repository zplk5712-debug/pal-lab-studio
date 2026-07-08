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
    tabs: ["motor", "reducer", "ballScrew", "lmGuide"],
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
    searchPlaceholder: "시리즈 또는 모델명 검색",
    keySpecs: ["motorType", "ratedTorque_Ncm", "holdingTorque_Ncm", "ratedVoltage_V", "frameSize_mm"],
    subCategoryField: "motorType",
    subCategoryLabel: "모터 종류",
    subCategories: MOTOR_TYPES,
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
    searchPlaceholder: "시리즈 또는 모델명 검색",
    keySpecs: ["reducerType", "reductionRatio", "ratedTorque_Nm", "backlash_arcmin"],
    subCategoryField: "reducerType",
    subCategoryLabel: "감속기 종류",
    subCategories: ["하모닉 드라이브", "유성 감속기", "사이클로이드 감속기", "웜 감속기"],
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
    searchPlaceholder: "시리즈 또는 모델명 검색",
    keySpecs: ["shaftDiameter_mm", "lead_mm", "accuracyGrade", "dynamicLoad_N"],
    subCategoryField: "accuracyGrade",
    subCategoryLabel: "정밀 등급",
    subCategories: ["C0", "C1", "C3", "C5", "C7", "C10"],
    compareField: "shaftDiameter_mm",
    compareLabel: "축 지름",
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
    searchPlaceholder: "시리즈 또는 모델명 검색",
    keySpecs: ["railSize", "blockType", "accuracyGrade", "dynamicLoad_N", "staticLoad_N"],
    subCategoryField: "railSize",
    subCategoryLabel: "레일 사이즈",
    subCategories: ["9", "15", "20", "25", "30", "35", "45"],
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
    searchPlaceholder: "시리즈 또는 모델명 검색",
    keySpecs: ["encoderType", "measurementType", "resolution", "interfaceType", "maxSpeed_rpm"],
    subCategoryField: "encoderType",
    subCategoryLabel: "엔코더 종류",
    subCategories: ["인크리멘탈", "앱솔루트"],
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
    searchPlaceholder: "시리즈 또는 모델명 검색",
    keySpecs: ["partType", "flangeStandard", "flangeSize", "material", "sealType"],
    subCategoryField: "partType",
    subCategoryLabel: "부품 종류",
    subCategories: VACUUM_PART_TYPES,
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
    searchPlaceholder: "시리즈 또는 모델명 검색",
    keySpecs: ["pumpType", "pumpingSpeed_Ls", "ultimatePressure_mbar", "inletFlangeSize"],
    subCategoryField: "pumpType",
    subCategoryLabel: "펌프 종류",
    subCategories: VACUUM_PUMP_TYPES,
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
    searchPlaceholder: "시리즈 또는 모델명 검색",
    keySpecs: ["valveType", "flangeSize", "actuationType", "sealType"],
    subCategoryField: "valveType",
    subCategoryLabel: "밸브 종류",
    subCategories: VACUUM_VALVE_TYPES,
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
    searchPlaceholder: "시리즈 또는 모델명 검색",
    keySpecs: ["motionType", "flangeSize", "travelRange_mm", "rotationRange_deg"],
    subCategoryField: "motionType",
    subCategoryLabel: "모션 종류",
    subCategories: VACUUM_MOTION_TYPES,
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
    searchPlaceholder: "시리즈 또는 모델명 검색",
    keySpecs: ["gaugeType", "measurementRange_mbar", "flangeSize", "outputSignal"],
    subCategoryField: "gaugeType",
    subCategoryLabel: "게이지 종류",
    subCategories: VACUUM_GAUGE_TYPES,
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
  catalogUrl: "https://www.hiwin.com/",
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
  catalogUrl: "https://www.orientalmotor.com/",
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
  catalogUrl: "https://www.harmonicdrive.net/",
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
  catalogUrl: "https://www.thk.com/",
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
  catalogUrl: "https://www.edwardsvacuum.com/",
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
  catalogUrl: "https://www.vatvalve.com/",
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
  catalogUrl: "https://www.uhvdesign.com/",
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
  catalogUrl: "https://www.mdcprecision.com/",
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
  catalogUrl: "https://www.heidenhain.com/",
  note: "catalog_check_required",
};
