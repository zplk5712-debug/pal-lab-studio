export const LOAD_INPUT_MODE_OPTIONS = [
  { value: "direct", label: "직접 입력" },
  { value: "manual", label: "수동 입력" },
  { value: "model", label: "모델링 파일 업로드" },
];

export const MANUAL_LOAD_INPUT_OPTIONS = [
  { value: "mass", label: "질량(kg) 입력" },
  { value: "force", label: "하중(N) 입력" },
];

export const MODEL_FILE_EXTENSIONS = [".step", ".stp"];

export const MAX_MODEL_FILE_SIZE_MB = 50;
export const MAX_MODEL_FILE_SIZE_BYTES = MAX_MODEL_FILE_SIZE_MB * 1024 * 1024;

// 조립품의 공통 소재 선택칸에서 "아직 특정 소재를 고르지 않음(부품별로 다양함)"을 나타내는 값입니다.
export const MIXED_MATERIAL_KEY = "__mixed__";

export const SHAPE_OPTIONS = [
  {
    value: "box",
    label: "직육면체",
    description: "길이, 폭, 높이로 체적을 계산합니다.",
    fields: [
      { key: "lengthMm", label: "길이", unit: "mm", placeholder: "예: 300" },
      { key: "widthMm", label: "폭", unit: "mm", placeholder: "예: 120" },
      { key: "heightMm", label: "높이", unit: "mm", placeholder: "예: 80" },
    ],
  },
  {
    value: "cylinder",
    label: "원기둥",
    description: "지름과 높이로 체적을 계산합니다.",
    fields: [
      { key: "diameterMm", label: "지름", unit: "mm", placeholder: "예: 80" },
      { key: "heightMm", label: "높이", unit: "mm", placeholder: "예: 200" },
    ],
  },
  {
    value: "hollowCylinder",
    label: "중공 원기둥",
    description: "외경, 내경, 높이로 체적을 계산합니다.",
    fields: [
      { key: "outerDiameterMm", label: "외경", unit: "mm", placeholder: "예: 120" },
      { key: "innerDiameterMm", label: "내경", unit: "mm", placeholder: "예: 90" },
      { key: "heightMm", label: "높이", unit: "mm", placeholder: "예: 240" },
    ],
  },
  {
    value: "plate",
    label: "판재",
    description: "길이, 폭, 두께로 체적을 계산합니다.",
    fields: [
      { key: "lengthMm", label: "길이", unit: "mm", placeholder: "예: 500" },
      { key: "widthMm", label: "폭", unit: "mm", placeholder: "예: 250" },
      { key: "thicknessMm", label: "두께", unit: "mm", placeholder: "예: 12" },
    ],
  },
  {
    value: "customVolume",
    label: "사용자 정의 체적 입력",
    description: "체적을 직접 입력하고 소재와 수량만 적용합니다.",
    fields: [
      { key: "volumeMm3", label: "체적", unit: "mm³", placeholder: "예: 1200000" },
    ],
  },
];

export const MATERIAL_GROUP_OPTIONS = [
  {
    label: "철계 금속",
    options: [
      { key: "carbonSteel", label: "탄소강", densityKgM3: 7850 },
      { key: "lowCarbonSteel", label: "저탄소강", densityKgM3: 7850 },
      { key: "alloySteel", label: "합금강", densityKgM3: 7830 },
      { key: "toolSteel", label: "공구강", densityKgM3: 7770 },
      { key: "castIron", label: "주철", densityKgM3: 7150 },
      { key: "stainless304", label: "스테인리스 304", densityKgM3: 7930 },
      { key: "stainless316", label: "스테인리스 316", densityKgM3: 7980 },
      { key: "stainless310", label: "스테인리스 310", densityKgM3: 7900 },
      { key: "stainless430", label: "스테인리스 430", densityKgM3: 7750 },
      { key: "invar", label: "인바(Invar)", densityKgM3: 8050 },
      { key: "kovar", label: "코바(Kovar)", densityKgM3: 8360 },
    ],
  },
  {
    label: "비철금속",
    options: [
      { key: "al1050", label: "알루미늄 1050", densityKgM3: 2710 },
      { key: "al5052", label: "알루미늄 5052", densityKgM3: 2680 },
      { key: "al6061", label: "알루미늄 6061", densityKgM3: 2700 },
      { key: "al7075", label: "알루미늄 7075", densityKgM3: 2810 },
      { key: "copper", label: "구리", densityKgM3: 8960 },
      { key: "oxygenFreeCopper", label: "무산소동 (OFHC)", densityKgM3: 8940 },
      { key: "ofeCopper", label: "OFE 무산소동", densityKgM3: 8940 },
      { key: "glidcopAl15", label: "GlidCop AL-15", densityKgM3: 8910 },
      { key: "glidcopAl25", label: "GlidCop AL-25", densityKgM3: 8890 },
      { key: "cuCrZr", label: "CuCrZr", densityKgM3: 8890 },
      { key: "chromeCopper", label: "크롬동 (C18200)", densityKgM3: 8890 },
      { key: "telluriumCopper", label: "텔루륨동 (C14500)", densityKgM3: 8890 },
      { key: "berylliumCopper", label: "베릴륨동 (C17200)", densityKgM3: 8250 },
      { key: "phosphorBronze", label: "인청동", densityKgM3: 8890 },
      { key: "brass", label: "황동", densityKgM3: 8530 },
      { key: "bronze", label: "청동", densityKgM3: 8800 },
      { key: "nickelSilver", label: "니켈실버", densityKgM3: 8600 },
      { key: "nickel", label: "니켈", densityKgM3: 8908 },
      { key: "titaniumGr2", label: "티타늄 Grade 2", densityKgM3: 4510 },
      { key: "titaniumGr5", label: "티타늄 Grade 5", densityKgM3: 4430 },
      { key: "magnesiumAZ31", label: "마그네슘 AZ31", densityKgM3: 1780 },
      { key: "zinc", label: "아연", densityKgM3: 7140 },
      { key: "tin", label: "주석", densityKgM3: 7310 },
      { key: "lead", label: "납", densityKgM3: 11340 },
    ],
  },
  {
    label: "내열·희소금속",
    options: [
      { key: "tungsten", label: "텅스텐", densityKgM3: 19250 },
      { key: "molybdenum", label: "몰리브덴", densityKgM3: 10280 },
      { key: "tantalum", label: "탄탈럼", densityKgM3: 16690 },
      { key: "niobium", label: "니오븀", densityKgM3: 8570 },
      { key: "silver", label: "은", densityKgM3: 10490 },
      { key: "gold", label: "금", densityKgM3: 19320 },
      { key: "platinum", label: "백금", densityKgM3: 21450 },
      { key: "palladium", label: "팔라듐", densityKgM3: 12020 },
      { key: "rhodium", label: "로듐", densityKgM3: 12410 },
      { key: "iridium", label: "이리듐", densityKgM3: 22560 },
      { key: "ruthenium", label: "루테늄", densityKgM3: 12370 },
      { key: "osmium", label: "오스뮴", densityKgM3: 22590 },
      { key: "monel400", label: "모넬 400", densityKgM3: 8800 },
      { key: "incoloy800", label: "인콜로이 800", densityKgM3: 7940 },
      { key: "inconel718", label: "인코넬 718", densityKgM3: 8190 },
      { key: "inconel625", label: "인코넬 625", densityKgM3: 8440 },
      { key: "hastelloyC276", label: "하스텔로이 C-276", densityKgM3: 8890 },
    ],
  },
  {
    label: "귀금속·보석·광학재료",
    options: [
      { key: "gold24k", label: "금 24K", densityKgM3: 19320 },
      { key: "platinumLab", label: "백금 (실험실용)", densityKgM3: 21450 },
      { key: "diamond", label: "다이아몬드", densityKgM3: 3515 },
      { key: "ruby", label: "루비", densityKgM3: 3980 },
      { key: "emerald", label: "에메랄드", densityKgM3: 2760 },
      { key: "yag", label: "YAG", densityKgM3: 4550 },
    ],
  },
  {
    label: "반도체·세라믹·유리",
    options: [
      { key: "silicon", label: "실리콘", densityKgM3: 2329 },
      { key: "quartz", label: "석영(Quartz)", densityKgM3: 2650 },
      { key: "fusedSilica", label: "용융 실리카", densityKgM3: 2203 },
      { key: "borosilicateGlass", label: "붕규산 유리", densityKgM3: 2230 },
      { key: "sodaLimeGlass", label: "소다석회 유리", densityKgM3: 2500 },
      { key: "alumina", label: "알루미나", densityKgM3: 3950 },
      { key: "zirconia", label: "지르코니아", densityKgM3: 6050 },
      { key: "siliconCarbide", label: "탄화규소(SiC)", densityKgM3: 3210 },
      { key: "siliconNitride", label: "질화규소(Si3N4)", densityKgM3: 3200 },
      { key: "sapphire", label: "사파이어", densityKgM3: 3980 },
      { key: "macor", label: "마코어(Macor)", densityKgM3: 2520 },
    ],
  },
  {
    label: "탄소·흑연",
    options: [
      { key: "graphite", label: "흑연", densityKgM3: 1800 },
      { key: "glassyCarbon", label: "글래시 카본", densityKgM3: 1420 },
      { key: "carbonFiberComposite", label: "카본파이버 복합재", densityKgM3: 1600 },
      { key: "cfrp", label: "CFRP", densityKgM3: 1550 },
      { key: "carbonCarbon", label: "C/C 복합재", densityKgM3: 1750 },
    ],
  },
  {
    label: "플라스틱·고분자·기타",
    options: [
      { key: "abs", label: "ABS", densityKgM3: 1040 },
      { key: "pom", label: "POM", densityKgM3: 1410 },
      { key: "peek", label: "PEEK", densityKgM3: 1320 },
      { key: "ptfe", label: "PTFE", densityKgM3: 2200 },
      { key: "pvdf", label: "PVDF", densityKgM3: 1780 },
      { key: "pvc", label: "PVC", densityKgM3: 1380 },
      { key: "polycarbonate", label: "폴리카보네이트(PC)", densityKgM3: 1200 },
      { key: "acrylic", label: "아크릴(PMMA)", densityKgM3: 1190 },
      { key: "nylon6", label: "나일론 6", densityKgM3: 1130 },
      { key: "polypropylene", label: "폴리프로필렌(PP)", densityKgM3: 900 },
      { key: "hdpe", label: "HDPE", densityKgM3: 950 },
      { key: "uhmwpe", label: "UHMW-PE", densityKgM3: 930 },
      { key: "epoxyG10", label: "에폭시 G10/FR4", densityKgM3: 1850 },
      { key: "rubber", label: "고무", densityKgM3: 1100 },
    ],
  },
];

export const MATERIAL_OPTIONS = MATERIAL_GROUP_OPTIONS.flatMap((group) => group.options);

export const DEFAULT_LOAD_FORM = {
  itemName: "",
  isCollapsed: false,
  inputMode: "direct",
  shape: "box",
  materialKey: "al6061",
  quantity: "1",
  safetyFactor: "1.5",
  manualInputType: "mass",
  massKg: "",
  forceN: "",
  lengthMm: "",
  widthMm: "",
  heightMm: "",
  diameterMm: "",
  outerDiameterMm: "",
  innerDiameterMm: "",
  thicknessMm: "",
  volumeMm3: "",
  modelFileName: "",
  modelFileType: "",
  modelFileSizeBytes: null,
  modelPartName: "",
  modelDetectedUnit: "",
  modelDetectedVolumeM3: null,
  modelBoundingBox: "",
  modelBoundingBoxVolumeM3: null,
  modelVolumeFillRatio: null,
  modelStatus: "",
  modelAnalysisSource: "",
  modelNotes: [],
  modelAssemblyType: "",
  modelPartCount: 0,
  modelPartItems: [],
  modelManualVolumeMm3: "",
  modelUseCommonMaterial: true,
  modelAssemblyMaterialKey: "al6061",
  modelShowPartDetails: false,
  modelFileObject: null,
  modelSelectedPartNames: [],
};
