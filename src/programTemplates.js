// src/programTemplates.js — 15개 유형별 완성 HTML 템플릿 (AI 없이 즉시 동작)
// injectBaseCSS() + injectInstructions() 가 나중에 적용되므로 <style id="base-ui"> 불필요

function _a(spec) { return spec._answers || {}; }
function _n(v, d=0) { return parseFloat(v) || d; }
function _has(val, kw) {
  if (Array.isArray(val)) return val.some(function(v){ return v.includes(kw); });
  return String(val || '').includes(kw);
}
function _first(val, fb) {
  if (Array.isArray(val) && val.length > 0) return val[0];
  if (typeof val === 'string' && val) return val;
  return fb || '';
}

// ─── 유형별 메타 정보 (씨앗여부, 한계, 개선제안, 사용설명, 프롬프트) ──────
export const TYPE_META = {
  motor_transfer: {
    seed: true,
    limits: ["실제 모터·PLC 하드웨어 제어 불가 — 시뮬레이션 전용","이동 이력 영구 저장 불가","여러 축 동시 제어 불가","실제 리미트 센서·엔코더 신호 수신 불가"],
    nexts1: ["속도 그래프 추가 (SVG)","CSV 이동 이력 내보내기","가속/감속 구간 시각화"],
    nexts2: ["Node.js + Modbus RTU 실제 모터 제어","동작 이력 DB 영구 저장","WebSocket 실시간 상태 모니터링"],
    nexts3: ["실제 엔코더 피드백 연동","다중 축 동기 제어 + 2D 경로 시각화","PLC I/O 신호 처리"],
    prompt1: "이 HTML에 속도 그래프와 CSV 이력 내보내기를 추가해줘. 단일 HTML 파일로 유지하고 한국어 UI로 만들어줘.",
    prompt2: "이 HTML 스펙으로 Node.js + Modbus RTU 실제 모터 제어 프로그램을 만들어줘. 파일은 HTML/CSS/JS/server.js로 분리해서 만들어줘.",
    prompt3: "실제 모터 드라이버와 시리얼 통신으로 연결하고 엔코더 피드백까지 구현한 완성형 프로그램을 HTML/CSS/JS/server.js로 분리해서 만들어줘.",
    manual: ["① 이송 거리(mm)와 이동 시간(초)을 설정하세요","② 동작 방식(한 방향 / 왕복)을 선택하세요","③ 반복 횟수를 설정하세요 (계속 반복 가능)","④ ▶ 시작 버튼으로 시뮬레이션을 시작합니다","⑤ ⛔ 비상정지로 즉시 멈출 수 있습니다","⑥ 동작 로그에서 시간별 이력을 확인하세요"],
  },
  motor_rotation: {
    seed: true,
    limits: ["실제 모터 드라이버 통신 불가 — 시뮬레이션 전용","RPM·토크 실측값 수신 불가","여러 모터 동시 제어 불가","회전 이력 영구 저장 불가"],
    nexts1: ["RPM 그래프 추가","회전 이력 CSV 내보내기","각도 표시 추가"],
    nexts2: ["UART/Modbus 실제 스텝 모터 제어","전류·토크 실시간 모니터링","운전 이력 DB 저장"],
    nexts3: ["다중 모터 동기 제어","서보 드라이버 EtherCAT 연동","토크 제한·과부하 보호"],
    prompt1: "이 HTML에 RPM 그래프와 회전 이력 CSV 내보내기를 추가해줘. 단일 HTML 파일로 유지해줘.",
    prompt2: "이 HTML 스펙으로 Modbus RTU 실제 모터 제어 프로그램을 HTML/CSS/JS/server.js로 분리해서 만들어줘.",
    prompt3: "실제 서보 드라이버와 통신하고 토크·전류 모니터링까지 구현한 완성형 프로그램을 만들어줘.",
    manual: ["① 1회전 시간(초)을 설정하세요 — 클수록 느린 회전","② 정지 조건(수동/시간/횟수)을 선택하세요","③ ▶ 시작으로 회전 시뮬레이션을 시작합니다","④ 방향 전환 버튼으로 정역 전환이 가능합니다"],
  },
  sensor: {
    seed: true,
    limits: ["실제 센서 연결 불가 — 랜덤 더미 데이터 표시","측정값 장기 저장·DB 연동 불가","경보 알림(소리·이메일) 없음","여러 센서 동시 비교 없음"],
    nexts1: ["측정 이력 CSV 내보내기","알람 소리 추가","최대·최소값 리셋 기능"],
    nexts2: ["WebSocket/Serial 실센서 데이터 수신","InfluxDB/CSV 장기 이력 저장","이메일 경보 발송"],
    nexts3: ["다채널 실시간 비교 차트","산업용 센서 Modbus 연동","SCADA 시스템 연동"],
    prompt1: "이 HTML에 측정 이력 CSV 내보내기와 알람 소리 기능을 추가해줘. 단일 HTML 파일로 유지해줘.",
    prompt2: "이 HTML 스펙으로 실제 센서 데이터를 WebSocket으로 수신하는 프로그램을 HTML/CSS/JS/server.js로 분리해서 만들어줘.",
    prompt3: "산업용 센서 Modbus TCP로 연결하고 다채널 실시간 차트까지 구현한 완성형 프로그램을 만들어줘.",
    manual: ["① 센서 이름과 단위를 설정하세요","② 측정 범위(최솟값~최댓값)를 입력하세요","③ 경보 임계값을 설정하세요 (초과 시 경고 표시)","④ ▶ 모니터링 시작으로 실시간 측정을 시작합니다","⑤ 추세 그래프에서 최근 20개 값을 확인하세요"],
  },
  process_timer: {
    seed: false,
    limits: ["단계 간 실제 I/O 출력 불가","공정 이력 영구 저장 불가","외부 시스템 연동 불가"],
    nexts1: ["단계별 소요 시간 CSV 저장","알람 소리 추가","공정 레시피 저장·불러오기"],
    nexts2: ["REST API로 PLC 출력 제어","공정 이력 DB 저장","모바일 완료 알림"],
    nexts3: ["SCADA 시스템 연동","다중 라인 동시 공정 관리","MES 시스템 연동"],
    prompt1: "이 HTML에 단계별 소요 시간 CSV 저장과 알람 소리를 추가해줘. 단일 HTML 파일로 유지해줘.",
    prompt2: "이 HTML 스펙으로 공정 이력이 DB에 저장되는 완성형 프로그램을 HTML/CSS/JS/server.js로 분리해서 만들어줘.",
    prompt3: "PLC REST API와 연동해서 실제 I/O 출력까지 제어하는 완성형 공정 관리 프로그램을 만들어줘.",
    manual: ["① 단계 이름과 소요 시간(초)을 설정하세요","② + 단계 추가 / − 단계 삭제로 공정을 구성하세요","③ ▶ 시작으로 공정을 시작합니다","④ 타이머가 완료되면 자동으로 다음 단계로 넘어갑니다","⑤ 다음 단계 → 버튼으로 수동 진행도 가능합니다"],
  },
  data_record: {
    seed: false,
    limits: ["브라우저 localStorage 한계 (~5MB)","여러 PC에서 데이터 공유 불가","자동 백업 없음"],
    nexts1: ["행 수정 기능 추가","필터·정렬 기능","차트 시각화 추가"],
    nexts2: ["Node.js + SQLite 영구 DB 저장","공유 URL로 팀 데이터 동기화","자동 이메일 보고서"],
    nexts3: ["ERP 시스템 연동","대용량 데이터 처리","클라우드 동기화"],
    prompt1: "이 HTML에 행 수정 기능과 필터·정렬을 추가해줘. 단일 HTML 파일로 유지해줘.",
    prompt2: "이 HTML 스펙으로 SQLite DB에 영구 저장되는 완성형 프로그램을 HTML/CSS/JS/server.js로 분리해서 만들어줘.",
    prompt3: "ERP 연동과 대용량 데이터 처리까지 지원하는 완성형 데이터 관리 시스템을 만들어줘.",
    manual: ["① 열 이름을 입력하고 + 열 추가를 누르세요","② 원하는 열 구성을 만든 후 값을 입력하세요","③ + 행 추가 버튼으로 데이터를 기록합니다","④ CSV 내보내기로 엑셀에서 열 수 있습니다","⑤ 데이터는 브라우저를 닫아도 저장됩니다"],
  },
  inventory: {
    seed: false,
    limits: ["브라우저 localStorage 한계","바코드 스캔 연동 불가","여러 사용자 동시 접근 불가","자동 알림 없음"],
    nexts1: ["검색·필터 기능 강화","카테고리별 통계 차트","재고 이력 그래프"],
    nexts2: ["공유 서버 DB로 팀 공동 관리","바코드 스캔 웹캠 연동","재고 부족 이메일 자동 알림"],
    nexts3: ["ERP/MES 연동","RFID 스캔 연동","발주 자동화 시스템"],
    prompt1: "이 HTML에 검색 필터와 카테고리별 통계 차트를 추가해줘. 단일 HTML 파일로 유지해줘.",
    prompt2: "이 HTML 스펙으로 팀이 공유하는 서버 DB 기반 재고 관리 시스템을 HTML/CSS/JS/server.js로 분리해서 만들어줘.",
    prompt3: "바코드 스캔과 이메일 자동 알림까지 포함한 완성형 재고 관리 시스템을 만들어줘.",
    manual: ["① + 품목 추가로 재고 품목을 등록하세요","② 품목명, 분류, 현재 재고, 최소 재고, 단위를 입력하세요","③ 재고가 최소 기준 이하면 자동으로 경고 표시됩니다","④ 입출고 버튼으로 수량을 변경하고 이력을 기록하세요","⑤ CSV 내보내기로 목록을 저장할 수 있습니다"],
  },
  lab_diary: {
    seed: false,
    limits: ["이미지·첨부파일 저장 불가","전문 키워드 검색 없음","여러 사용자 공동 작성 불가","클라우드 백업 없음"],
    nexts1: ["태그 기반 검색 강화","인쇄/PDF 내보내기","일지 템플릿 기능"],
    nexts2: ["이미지 첨부 및 갤러리 뷰","팀 공유 서버 DB","자동 클라우드 백업"],
    nexts3: ["Notion/Google Drive 동기화","AI 자동 요약 기능","버전 이력 관리"],
    prompt1: "이 HTML에 태그 검색과 인쇄 기능을 추가해줘. 단일 HTML 파일로 유지해줘.",
    prompt2: "이 HTML 스펙으로 이미지 첨부와 팀 공유가 되는 실험 일지 시스템을 HTML/CSS/JS/server.js로 분리해서 만들어줘.",
    prompt3: "Notion API 연동과 AI 자동 요약까지 포함한 완성형 실험 관리 플랫폼을 만들어줘.",
    manual: ["① 오른쪽 편집 패널에서 날짜와 제목을 입력하세요","② 목적/조건, 과정/결과, 결론/비고를 기록하세요","③ 저장 버튼으로 일지를 보존합니다","④ 왼쪽 목록에서 날짜별로 이전 일지를 찾아보세요","⑤ 검색창으로 제목·태그·날짜로 검색할 수 있습니다"],
  },
  calculator: {
    seed: false,
    limits: ["계산 이력 50개 제한","수식 그래프 없음","단위 자동 변환 없음"],
    nexts1: ["공학용 함수 추가 (sin, cos, log)","수식 그래프 실시간 플로팅","단위 변환 연동"],
    nexts2: ["계산식 저장·불러오기 서버","팀 공유 계산 이력","CSV 일괄 계산"],
    nexts3: ["Python scipy 고정밀 계산 연동","행렬·벡터 계산","심볼릭 수식 처리"],
    prompt1: "이 HTML 계산기에 sin, cos, log 등 공학용 함수와 수식 그래프를 추가해줘. 단일 HTML 파일로 유지해줘.",
    prompt2: "이 HTML 스펙으로 계산식 저장·공유가 되는 완성형 계산기를 HTML/CSS/JS/server.js로 분리해서 만들어줘.",
    prompt3: "Python numpy/sympy와 연동해서 행렬 계산과 심볼릭 수식 처리까지 가능한 완성형 계산 도구를 만들어줘.",
    manual: ["① 숫자와 연산자 버튼을 클릭하거나 키보드로 입력하세요","② = 또는 Enter로 계산합니다","③ C로 초기화, ⌫로 마지막 자리를 지울 수 있습니다","④ 계산 이력이 아래에 자동으로 저장됩니다","⑤ 이력은 브라우저를 닫아도 유지됩니다"],
  },
  data_analysis: {
    seed: false,
    limits: ["대용량(>10MB) 처리 느림","고급 통계(회귀분석·ML) 없음","실시간 스트리밍 데이터 불가","PDF 보고서 출력 불가"],
    nexts1: ["상관계수 분석 추가","박스플롯 시각화","이상값 자동 탐지"],
    nexts2: ["Python pandas 서버 연동 고급 분석","PDF/Word 보고서 자동 생성","실시간 데이터 스트림 분석"],
    nexts3: ["머신러닝 이상값 탐지","시계열 예측 모델","대용량 Parquet 파일 처리"],
    prompt1: "이 HTML에 상관계수 분석과 박스플롯을 추가해줘. 단일 HTML 파일로 유지해줘.",
    prompt2: "이 HTML 스펙으로 Python pandas 서버와 연동한 고급 데이터 분석 도구를 HTML/CSS/JS/server.py로 분리해서 만들어줘.",
    prompt3: "머신러닝 이상값 탐지와 시계열 예측까지 포함한 완성형 데이터 분석 플랫폼을 만들어줘.",
    manual: ["① 분석할 숫자 데이터를 텍스트 박스에 붙여넣으세요","② 쉼표, 탭, 줄바꿈으로 구분된 데이터를 지원합니다","③ 📊 분석 버튼을 누르면 자동으로 통계를 계산합니다","④ 히스토그램으로 데이터 분포를 확인하세요","⑤ CSV에서 한 열만 복사해서 붙여넣기도 가능합니다"],
  },
  spectrum: {
    seed: false,
    limits: ["브라우저 DFT 정밀도 제한 (float64 기반)","실시간 오디오·센서 입력 불가","고해상도(>1024 포인트) 느림","결과 파일 저장 불가"],
    nexts1: ["PNG 스펙트럼 이미지 저장","윈도우 함수 선택 (Hanning, Hamming)","위상 스펙트럼 추가"],
    nexts2: ["WebAudio API 실시간 마이크 FFT","Python scipy.fft 서버 연동 정밀 분석","CSV 결과 내보내기"],
    nexts3: ["워터폴 스펙트로그램","고속 WebAssembly FFT","하드웨어 DAQ 카드 연동"],
    prompt1: "이 HTML에 PNG 저장과 윈도우 함수(Hanning) 선택을 추가해줘. 단일 HTML 파일로 유지해줘.",
    prompt2: "이 HTML 스펙으로 WebAudio API 실시간 마이크 FFT와 Python scipy 정밀 분석을 HTML/CSS/JS/server.py로 분리해서 만들어줘.",
    prompt3: "하드웨어 DAQ 카드 연동과 실시간 워터폴 스펙트로그램까지 구현한 완성형 스펙트럼 분석기를 만들어줘.",
    manual: ["① 신호 데이터를 텍스트 박스에 붙여넣으세요","② 샘플링 주파수(Hz)를 실제 측정 조건에 맞게 입력하세요","③ 데모 신호 생성으로 50Hz+120Hz 테스트 신호를 만들 수 있습니다","④ 🔍 FFT 분석으로 주파수 스펙트럼을 계산합니다","⑤ 피크 주파수 표에서 주요 성분을 확인하세요"],
  },
  unit_convert: {
    seed: false,
    limits: ["사용자 정의 단위 추가 불가","변환 이력 저장 없음","복합 단위 수식 파서 없음"],
    nexts1: ["변환 이력 저장","즐겨찾기 단위 설정","단위 설명 툴팁 추가"],
    nexts2: ["사용자 정의 단위 등록 서버","팀 공유 변환 이력","API로 외부 단위 조회"],
    nexts3: ["복합 단위 수식 파서","물성 DB 연동 (밀도, 점도 등)","CAD 소프트웨어 연동"],
    prompt1: "이 HTML 단위 변환기에 변환 이력 저장과 즐겨찾기 기능을 추가해줘. 단일 HTML 파일로 유지해줘.",
    prompt2: "이 HTML 스펙으로 사용자 정의 단위 등록이 가능한 완성형 단위 변환 도구를 HTML/CSS/JS/server.js로 분리해서 만들어줘.",
    prompt3: "복합 단위 수식 파서와 물성 DB까지 연동한 완성형 공학 계산 도구를 만들어줘.",
    manual: ["① 상단 카테고리 탭에서 변환할 종류를 선택하세요","② 왼쪽에 변환할 값을 입력하고 단위를 선택하세요","③ 오른쪽에서 변환 결과 단위를 선택하면 즉시 계산됩니다","④ 온도 변환은 °C, °F, K를 지원합니다"],
  },
  compare: {
    seed: false,
    limits: ["판정 이력 200개 제한","통계 기반 공정 능력(Cp·Cpk) 없음","일괄 CSV 판정 없음"],
    nexts1: ["Cp·Cpk 공정 능력 지수 계산","관리도(X-bar, R) 추가","불합격 원인 분류"],
    nexts2: ["CSV 일괄 판정 및 보고서 생성","측정 장비 API 연동","팀 공유 판정 이력 DB"],
    nexts3: ["SPC 실시간 관리도","측정기 RS-232 자동 수신","ERP 품질 시스템 연동"],
    prompt1: "이 HTML에 Cp·Cpk 공정 능력 지수와 관리도를 추가해줘. 단일 HTML 파일로 유지해줘.",
    prompt2: "이 HTML 스펙으로 CSV 일괄 판정과 팀 공유 이력 DB를 갖춘 완성형 품질 검사 시스템을 HTML/CSS/JS/server.js로 분리해서 만들어줘.",
    prompt3: "SPC 실시간 관리도와 측정기 RS-232 자동 수신까지 포함한 완성형 품질 관리 시스템을 만들어줘.",
    manual: ["① 기준값과 허용 오차를 설정하세요","② 측정값을 입력하고 판정 버튼을 누르거나 Enter를 치세요","③ 합격/불합격이 즉시 표시됩니다","④ 편차가 허용 오차 이내면 합격입니다","⑤ 이력에서 합격률을 확인하고 CSV로 내보낼 수 있습니다"],
  },
  recipe: {
    seed: false,
    limits: ["레시피 브라우저 외부 저장 불가","레시피 기반 자동 실행 연동 없음","팀 공유 불가"],
    nexts1: ["레시피 JSON 파일 내보내기·가져오기","레시피 비교 기능","사용 이력 기록"],
    nexts2: ["팀 공유 레시피 서버 DB","레시피 버전 관리","자동 적용 API 연동"],
    nexts3: ["PLC 연동으로 레시피 자동 적용","MES 레시피 관리 시스템 연동","AI 최적 레시피 추천"],
    prompt1: "이 HTML에 레시피 JSON 파일 내보내기·가져오기와 비교 기능을 추가해줘. 단일 HTML 파일로 유지해줘.",
    prompt2: "이 HTML 스펙으로 팀이 공유하는 서버 DB 기반 레시피 관리 시스템을 HTML/CSS/JS/server.js로 분리해서 만들어줘.",
    prompt3: "PLC 자동 적용과 AI 최적 레시피 추천까지 포함한 완성형 레시피 관리 플랫폼을 만들어줘.",
    manual: ["① 오른쪽 편집 패널에서 레시피 이름과 설명을 입력하세요","② + 파라미터 추가로 조건값을 등록하세요","③ 저장 버튼으로 레시피를 보존합니다","④ 왼쪽 목록에서 저장된 레시피를 클릭해 불러오세요","⑤ 복사 버튼으로 기존 레시피를 기반으로 수정할 수 있습니다"],
  },
  report: {
    seed: false,
    limits: ["PDF 직접 인쇄 레이아웃 제한","Word/Excel 형식 내보내기 불가","데이터 자동 수집·집계 없음"],
    nexts1: ["차트 섹션 타입 추가","인쇄 레이아웃 개선","보고서 템플릿 저장"],
    nexts2: ["Word/Excel 파일 직접 생성","데이터 DB 연동 자동 집계","PDF 서버 사이드 생성"],
    nexts3: ["ERP 데이터 자동 집계","이메일 자동 발송","전자결재 시스템 연동"],
    prompt1: "이 HTML에 차트 섹션과 보고서 템플릿 저장 기능을 추가해줘. 단일 HTML 파일로 유지해줘.",
    prompt2: "이 HTML 스펙으로 Word/Excel 파일을 생성하는 완성형 보고서 도구를 HTML/CSS/JS/server.js로 분리해서 만들어줘.",
    prompt3: "ERP 데이터 자동 집계와 이메일 자동 발송까지 포함한 완성형 보고서 시스템을 만들어줘.",
    manual: ["① 기본 정보(제목, 날짜, 작성자)를 입력하세요","② 섹션 추가에서 섹션 이름과 타입을 선택하세요","③ 텍스트/표/수치 중 원하는 형식으로 내용을 입력하세요","④ 저장 버튼으로 보관하고 불러오기로 이어 작성하세요","⑤ 🖨️ 인쇄/PDF 버튼으로 출력하세요"],
  },
  stopwatch: {
    seed: false,
    limits: ["랩 이력 브라우저 내에서만 저장","여러 구간 동시 측정 불가","외부 이벤트 트리거 없음"],
    nexts1: ["랩 이력 CSV 내보내기","통계(평균 랩, 최고·최저 랩) 표시","소리 알림 추가"],
    nexts2: ["팀 공유 기록 서버","원격 시작·정지 API","멀티 채널 동시 측정"],
    nexts3: ["GPIO/센서 신호 자동 트리거","레이싱 타이밍 시스템","생산 라인 사이클 타임 분석"],
    prompt1: "이 HTML에 랩 CSV 내보내기와 평균·최고·최저 랩 통계를 추가해줘. 단일 HTML 파일로 유지해줘.",
    prompt2: "이 HTML 스펙으로 팀이 공유하는 기록 서버와 멀티 채널 측정이 가능한 완성형 타이밍 시스템을 HTML/CSS/JS/server.js로 분리해서 만들어줘.",
    prompt3: "GPIO 센서 신호 자동 트리거와 생산 라인 사이클 타임 분석까지 포함한 완성형 타이밍 시스템을 만들어줘.",
    manual: ["① ▶ 시작으로 스톱워치를 시작합니다","② ⏸ 일시정지 후 ▶ 계속으로 이어서 측정할 수 있습니다","③ 랩 버튼으로 구간 시간을 기록합니다","④ 카운트다운은 분/초를 설정 후 시작하세요","⑤ 시간 완료 시 알림 팝업이 표시됩니다"],
  },
};

export const SEED_TYPES = new Set(
  Object.entries(TYPE_META).filter(([,m]) => m.seed).map(([id]) => id)
);

// ─── 공통 UI 헬퍼 함수 ─────────────────────────────────────────────

function themeToggleBtn() {
  return `<button id="themeBtn" onclick="toggleTheme()" style="position:fixed;top:14px;right:14px;z-index:999;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:6px 14px;cursor:pointer;font-size:0.82rem;color:var(--muted);display:flex;align-items:center;gap:6px">☀️ 라이트</button>`;
}

function themeScriptHTML() {
  return `<script>
var _dark=true;
var _light={'--bg':'#f0f2f8','--surface':'#ffffff','--card':'#e8eaf4','--border':'rgba(0,0,0,0.1)','--text':'#1a1d2e','--muted':'#5a6070','--shadow':'0 4px 24px rgba(0,0,0,0.1)'};
function toggleTheme(){
  _dark=!_dark;
  var r=document.documentElement.style;
  if(_dark){Object.keys(_light).forEach(function(k){r.removeProperty(k);});document.getElementById('themeBtn').textContent='☀️ 라이트';}
  else{Object.keys(_light).forEach(function(k){r.setProperty(k,_light[k]);});document.getElementById('themeBtn').textContent='🌙 다크';}
}
<\/script>`;
}

function upgradeCardHTML(spec) {
  var meta = TYPE_META[spec._typeId] || {};
  var isSeed = !!meta.seed;
  var seedBanner = isSeed
    ? '<div style="background:rgba(108,99,255,0.1);border:1px solid rgba(108,99,255,0.3);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:0.88rem">'
      + '🌱 이 프로그램은 시뮬레이션 데모입니다. 아래 지시문을 복사해서 Claude / ChatGPT에 붙여넣으면 <strong>실제 동작하는 프로그램을 만들 수 있어요!</strong></div>'
    : '';
  var n1t = (meta.nexts1 || []).map(function(t){return '  - '+t;}).join('\n');
  var n2t = (meta.nexts2 || []).map(function(t){return '  - '+t;}).join('\n');
  var n3t = (meta.nexts3 || []).map(function(t){return '  - '+t;}).join('\n');
  var detail = (spec._detail || '').trim();
  var folderName = (spec.name || 'my-program').replace(/[^a-z0-9가-힣A-Z]/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,30) || 'my-program';

  var j1 = '아래는 제가 프로그램 설계소에서 만든 [' + spec.name + '] 시뮬레이션입니다.\n'
    + '이 시뮬레이션을 기반으로 실제 동작하는 완성 HTML 프로그램을 만들어주세요.\n'
    + '지금 바로 작업을 시작하고 완성 코드를 주세요.\n\n'
    + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
    + '[ 프로그램 정보 ]\n'
    + '  프로그램명: ' + spec.name + '\n'
    + '  목적: ' + (spec.purpose||'') + '\n'
    + '  UI 언어: 한국어 유지\n\n'
    + '[ 시뮬레이션 스펙 ]\n' + detail + '\n\n'
    + '[ 추가로 구현해주세요 ]\n' + n1t + '\n'
    + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
    + '단일 HTML 파일로 완성해주세요. (CDN 라이브러리 사용 가능)\n'
    + '완성 코드를 코드 블록으로 주세요.';

  var j2 = '아래 프로그램을 지금 바로 만들어주세요.\n'
    + '폴더 생성 → 모든 파일 작성 → npm install → 서버 실행까지 자동으로 해주세요.\n\n'
    + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
    + '[ 프로그램 정보 ]\n'
    + '  프로그램명: ' + spec.name + '\n'
    + '  목적: ' + (spec.purpose||'') + '\n'
    + '  기술 스택: Node.js + Express + HTML/CSS/JS\n'
    + '  UI 언어: 한국어 유지\n\n'
    + '[ 폴더 구조 ]\n'
    + '  ' + folderName + '/\n'
    + '  ├── package.json\n'
    + '  ├── server.js          (Node.js + Express 서버)\n'
    + '  ├── public/\n'
    + '  │   ├── index.html\n'
    + '  │   ├── style.css\n'
    + '  │   └── app.js\n'
    + '  └── data/              (데이터 저장 폴더)\n\n'
    + '[ 시뮬레이션 스펙 ]\n' + detail + '\n\n'
    + '[ 구현할 기능 ]\n' + n2t + '\n'
    + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
    + '모든 파일 생성 후 아래를 순서대로 실행해주세요:\n'
    + '  1. cd ' + folderName + '\n'
    + '  2. npm install\n'
    + '  3. node server.js\n\n'
    + '실행 완료 후 → http://localhost:3000 에서 확인하세요.';

  var j3 = '아래 하드웨어 연동 프로그램을 지금 바로 만들어주세요.\n'
    + '폴더 생성 → 모든 파일 작성 → npm install → 서버 실행까지 자동으로 해주세요.\n\n'
    + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
    + '[ 프로그램 정보 ]\n'
    + '  프로그램명: ' + spec.name + '\n'
    + '  목적: ' + (spec.purpose||'') + '\n'
    + '  기술 스택: Node.js + serialport/modbus + HTML/CSS/JS\n'
    + '  UI 언어: 한국어 유지\n\n'
    + '[ 폴더 구조 ]\n'
    + '  ' + folderName + '/\n'
    + '  ├── package.json\n'
    + '  ├── server.js          (하드웨어 통신 + REST API)\n'
    + '  ├── public/\n'
    + '  │   ├── index.html\n'
    + '  │   ├── style.css\n'
    + '  │   └── app.js         (WebSocket 실시간 연결)\n'
    + '  └── drivers/           (하드웨어 드라이버)\n\n'
    + '[ 시뮬레이션 스펙 ]\n' + detail + '\n\n'
    + '[ 하드웨어 연동 기능 ]\n' + n3t + '\n\n'
    + '[ 통신 방식 ]\n'
    + '  - Modbus RTU (RS-485 시리얼) 또는 Modbus TCP\n'
    + '  - WebSocket 실시간 상태 업데이트\n'
    + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
    + '모든 파일 생성 후 아래를 순서대로 실행해주세요:\n'
    + '  1. cd ' + folderName + '\n'
    + '  2. npm install\n'
    + '  3. node server.js\n\n'
    + '실행 완료 후 → http://localhost:3000 에서 확인하세요.';

  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  var j1e=esc(j1), j2e=esc(j2), j3e=esc(j3);

  return `<div class="card" id="upgradeCard" style="max-width:720px;margin:0 auto 16px;border-color:rgba(108,99,255,0.3)">
  <div onclick="document.getElementById('upgBody').style.display=document.getElementById('upgBody').style.display==='none'?'block':'none';document.getElementById('upgArrow').textContent=document.getElementById('upgBody').style.display==='none'?'▼':'▲'" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center">
    <div style="font-weight:700;color:var(--accent)">🚀 AI로 실제 프로그램 만들기</div>
    <span id="upgArrow" style="color:var(--muted)">▲</span>
  </div>
  <div id="upgBody" style="margin-top:14px">
    ${seedBanner}

    <div style="background:rgba(108,99,255,0.08);border:1px solid rgba(108,99,255,0.25);border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <div style="font-size:0.88rem;font-weight:700;color:var(--text);margin-bottom:10px">💡 사용 방법</div>
      <div style="font-size:0.82rem;color:var(--muted);line-height:2">
        <div><span style="display:inline-block;background:var(--accent);color:#fff;border-radius:50%;width:18px;height:18px;text-align:center;line-height:18px;font-size:0.72rem;font-weight:700;margin-right:6px">1</span><strong style="color:var(--text)">원하는 단계를 선택하고 지시문을 복사하세요</strong></div>
        <div><span style="display:inline-block;background:var(--accent);color:#fff;border-radius:50%;width:18px;height:18px;text-align:center;line-height:18px;font-size:0.72rem;font-weight:700;margin-right:6px">2</span><strong style="color:var(--text)">Claude / ChatGPT 대화창에 붙여넣고 전송하세요</strong><br>
        <span style="margin-left:24px;font-size:0.78rem">claude.ai &nbsp;|&nbsp; chatgpt.com &nbsp;(이메일/구글 계정으로 무료 가입)</span></div>
        <div><span style="display:inline-block;background:var(--accent);color:#fff;border-radius:50%;width:18px;height:18px;text-align:center;line-height:18px;font-size:0.72rem;font-weight:700;margin-right:6px">3</span><strong style="color:var(--text)">AI가 폴더·파일·설치·실행을 자동으로 처리해줍니다</strong></div>
        <div><span style="display:inline-block;background:var(--success);color:#fff;border-radius:50%;width:18px;height:18px;text-align:center;line-height:18px;font-size:0.72rem;font-weight:700;margin-right:6px">4</span><strong style="color:var(--text)">완성 코드를 받으면 저장 → 브라우저에서 열면 끝!</strong><br>
        <span style="margin-left:24px;font-size:0.78rem">코드 전체 복사 → 메모장에 붙여넣기 → 파일명.html 로 저장</span></div>
      </div>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <div style="font-size:0.88rem;font-weight:700;color:var(--text);margin-bottom:10px">📄 AI 지시문 — 복사해서 붙여넣기만 하세요</div>

      <div style="display:flex;gap:6px;margin-bottom:10px">
        <button id="jTab1" onclick="switchJisi(1)" style="flex:1;padding:8px 4px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:0.75rem;font-weight:700;cursor:pointer;line-height:1.3">🥇 1단계<br><span style="font-weight:400;font-size:0.7rem">HTML 개선</span></button>
        <button id="jTab2" onclick="switchJisi(2)" style="flex:1;padding:8px 4px;background:var(--surface);color:var(--muted);border:1px solid var(--border);border-radius:6px;font-size:0.75rem;font-weight:700;cursor:pointer;line-height:1.3">🥈 2단계<br><span style="font-weight:400;font-size:0.7rem">서버 완성</span></button>
        <button id="jTab3" onclick="switchJisi(3)" style="flex:1;padding:8px 4px;background:var(--surface);color:var(--muted);border:1px solid var(--border);border-radius:6px;font-size:0.75rem;font-weight:700;cursor:pointer;line-height:1.3">🥉 3단계<br><span style="font-weight:400;font-size:0.7rem">하드웨어</span></button>
      </div>
      <div id="jisiDesc" style="font-size:0.78rem;color:var(--muted);margin-bottom:8px;padding:6px 10px;background:rgba(108,99,255,0.06);border-radius:6px">
        🥇 1단계: 지금 바로 가능 — AI 대화창에서 HTML 기능을 추가해줍니다. 설치 없이 바로 사용!
      </div>

      <div id="j1d" style="display:none">${j1e}</div>
      <div id="j2d" style="display:none">${j2e}</div>
      <div id="j3d" style="display:none">${j3e}</div>

      <textarea id="jisiArea" readonly onclick="this.select()" style="width:100%;height:200px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:0.76rem;font-family:monospace;padding:10px 12px;resize:vertical;line-height:1.6;cursor:text"></textarea>
      <button id="jisiCopyBtn" onclick="var t=document.getElementById('jisiArea');navigator.clipboard.writeText(t.value).then(function(){var b=document.getElementById('jisiCopyBtn');b.textContent='✅ 복사됨! 대화창에 붙여넣기하세요 (Ctrl+V)';b.style.background='var(--success)';setTimeout(function(){b.textContent='📋 지시문 복사하기';b.style.background='var(--accent)';},2500)})" style="width:100%;margin-top:8px;padding:11px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:0.88rem;font-weight:700;cursor:pointer">📋 지시문 복사하기</button>
      <div style="margin-top:8px;font-size:0.76rem;color:var(--muted)">💡 붙여넣은 후 추가로 원하는 내용을 말씀하셔도 됩니다. 예: "로그인 기능도 추가해줘"</div>
    </div>

    <div style="border-top:1px solid var(--border);padding-top:12px;font-size:0.8rem;color:var(--muted)">
      <div style="margin-bottom:6px">❓ <strong style="color:var(--text)">이 HTML 파일은 어떻게 여나요?</strong><br>
      <span style="margin-left:16px">파일을 더블클릭하거나 크롬·엣지 브라우저로 드래그하면 열려요</span></div>
      <div>❓ <strong style="color:var(--text)">2·3단계는 Claude Code(코드 AI)를 추천해요</strong><br>
      <span style="margin-left:16px">claude.ai/code 에서 지시문을 붙여넣으면 폴더 생성부터 서버 실행까지 자동으로 해줍니다</span></div>
    </div>
  </div>
</div>
<script>
var _jDesc=['','🥇 1단계: 지금 바로 가능 — AI 대화창에서 HTML 기능을 추가해줍니다. 설치 없이 바로 사용!','🥈 2단계: 서버 완성 — 폴더 생성·파일 작성·npm install·서버 실행까지 AI가 자동으로 해줍니다.','🥉 3단계: 하드웨어 연동 — 실제 장비(모터·PLC·센서)와 연결하는 완성 프로그램을 만들어줍니다.'];
function switchJisi(n){
  var ta=document.getElementById('jisiArea');
  ta.value=document.getElementById('j'+n+'d').textContent;
  document.getElementById('jisiDesc').textContent=_jDesc[n];
  [1,2,3].forEach(function(i){
    var b=document.getElementById('jTab'+i);
    b.style.background=i===n?'var(--accent)':'var(--surface)';
    b.style.color=i===n?'#fff':'var(--muted)';
    b.style.border=i===n?'none':'1px solid var(--border)';
  });
}
switchJisi(1);
</script>`;
}

function manualCardHTML(spec) {
  var meta = TYPE_META[spec._typeId] || {};
  var steps = (meta.manual || ['프로그램을 사용하세요.']).map(function(s){return '<li style="margin-bottom:6px">'+s+'</li>';}).join('');
  return `<div class="card" style="max-width:720px;margin:0 auto 16px">
  <div onclick="var b=document.getElementById('manBody');var a=document.getElementById('manArrow');b.style.display=b.style.display==='none'?'block':'none';a.textContent=b.style.display==='none'?'▼':'▲'" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center">
    <div style="font-weight:700">📖 사용 설명서</div>
    <span id="manArrow" style="color:var(--muted)">▼</span>
  </div>
  <div id="manBody" style="display:none;margin-top:12px">
    <ul style="font-size:0.88rem;color:var(--muted);padding-left:16px">${steps}</ul>
    <div style="margin-top:12px;padding:10px 14px;background:var(--surface);border-radius:8px;font-size:0.8rem;color:var(--muted)">
      💬 기능을 추가하거나 수정하려면 이 파일을 Claude/ChatGPT에 붙여넣고 원하는 기능을 말씀하세요.
    </div>
  </div>
</div>`;
}

export function wrapTemplate(html, spec) {
  var btn = themeToggleBtn();
  var upg = upgradeCardHTML(spec);
  var man = manualCardHTML(spec);
  var scr = themeScriptHTML();
  return html
    .replace('<body>', '<body>\n' + btn)
    .replace('</body>', upg + '\n' + man + '\n' + scr + '\n</body>');
}



// ─── 1. 스톱워치 / 타이머 ───────────────────────────────────────────
export function tmpl_stopwatch(spec) {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
.timer-big{font-size:4rem;font-weight:700;color:var(--accent);text-align:center;font-variant-numeric:tabular-nums;letter-spacing:2px;padding:28px 0;}
.cd-inputs{display:flex;gap:8px;align-items:center;justify-content:center;margin-bottom:12px;}
.cd-inputs input{width:70px;text-align:center;font-size:1.2rem;}
</style></head><body>
<div class="app-header"><div>
  <div class="app-title">⏱️ ${spec.name}</div>
  <div class="app-sub">${spec.purpose}</div>
</div></div>

<div class="card">
  <div class="card-title">스톱워치</div>
  <div class="timer-big" id="swD">00:00.00</div>
  <div class="btn-row" style="justify-content:center">
    <button class="btn btn-success" id="swB" onclick="swTog()">▶ 시작</button>
    <button class="btn btn-ghost" onclick="swLap()">랩</button>
    <button class="btn btn-danger" onclick="swRst()">초기화</button>
  </div>
</div>

<div class="card">
  <div class="card-title">카운트다운</div>
  <div class="cd-inputs">
    <input type="number" id="cdM" value="5" min="0" max="99">
    <span style="color:var(--muted)">분</span>
    <input type="number" id="cdS" value="0" min="0" max="59">
    <span style="color:var(--muted)">초</span>
  </div>
  <div class="timer-big" id="cdD" style="font-size:2.6rem;padding:14px 0">05:00</div>
  <div class="btn-row" style="justify-content:center">
    <button class="btn btn-success" id="cdB" onclick="cdTog()">▶ 시작</button>
    <button class="btn btn-ghost" onclick="cdRst()">리셋</button>
  </div>
</div>

<div class="card">
  <div class="card-title">랩 기록</div>
  <table><thead><tr><th>#</th><th>구간</th><th>누적</th></tr></thead>
  <tbody id="laps"></tbody></table>
</div>

<script>
var swMs=0,swRun=false,swIv=null,swBase=0,swN=0;
var swD=document.getElementById('swD'),swB=document.getElementById('swB'),laps=document.getElementById('laps');
var cdD=document.getElementById('cdD'),cdB=document.getElementById('cdB'),cdM=document.getElementById('cdM'),cdSec=document.getElementById('cdS');
var cdMs=0,cdRun=false,cdIv=null;

function fms(v){var m=Math.floor(v/60000),s=Math.floor(v%60000/1000),c=Math.floor(v%1000/10);return pad(m)+':'+pad(s)+'.'+pad(c);}
function fs(v){return pad(Math.floor(v/60))+':'+pad(v%60);}
function pad(n){return String(n).padStart(2,'0');}

function swTog(){
  if(swRun){clearInterval(swIv);swRun=false;swB.textContent='▶ 계속';swB.className='btn btn-success';}
  else{var st=Date.now()-swMs;swIv=setInterval(function(){swMs=Date.now()-st;swD.textContent=fms(swMs);},10);swRun=true;swB.textContent='⏸ 일시정지';swB.className='btn btn-danger';}
}
function swLap(){if(!swRun)return;swN++;var seg=swMs-swBase;swBase=swMs;var tr=document.createElement('tr');tr.innerHTML='<td>'+swN+'</td><td>'+fms(seg)+'</td><td>'+fms(swMs)+'</td>';laps.prepend(tr);}
function swRst(){clearInterval(swIv);swRun=false;swMs=0;swBase=0;swN=0;swD.textContent='00:00.00';laps.innerHTML='';swB.textContent='▶ 시작';swB.className='btn btn-success';}

function cdTog(){
  if(cdRun){clearInterval(cdIv);cdRun=false;cdB.textContent='▶ 계속';cdB.className='btn btn-success';}
  else{
    if(cdMs<=0)cdMs=+cdM.value*60 + +cdSec.value;
    if(cdMs<=0)return;
    cdIv=setInterval(function(){cdMs--;cdD.textContent=fs(cdMs);if(cdMs<=0){clearInterval(cdIv);cdRun=false;cdD.style.color='var(--danger)';cdB.textContent='▶ 시작';cdB.className='btn btn-success';alert('카운트다운 완료!');setTimeout(function(){cdD.style.color='';},2000);}},1000);
    cdRun=true;cdB.textContent='⏸ 일시정지';cdB.className='btn btn-danger';
  }
}
function cdRst(){clearInterval(cdIv);cdRun=false;cdMs=0;cdD.textContent=fs(+cdM.value*60 + +cdSec.value);cdD.style.color='';cdB.textContent='▶ 시작';cdB.className='btn btn-success';}
cdM.onchange=cdSec.onchange=function(){if(!cdRun)cdD.textContent=fs(+cdM.value*60 + +cdSec.value);};
</script>
</body></html>`;
}

// ─── 2. 계산기 ─────────────────────────────────────────────────────
export function tmpl_calculator(spec) {
  const purpose = _a(spec).purpose || spec.purpose;
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
.calc-disp{background:var(--surface);border-radius:10px;padding:12px 16px;margin-bottom:10px;}
.calc-expr{font-size:0.85rem;color:var(--muted);min-height:18px;text-align:right;}
.calc-num{font-size:2.2rem;font-weight:700;text-align:right;word-break:break-all;}
.kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;}
.k{padding:15px 0;font-size:1rem;font-weight:600;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--text);transition:background 0.1s;}
.k:hover{background:var(--card);}
.k.op{color:var(--accent);}
.k.fn{color:var(--warning);font-size:0.85rem;}
.k.eq{background:var(--accent);color:#fff;border-color:var(--accent);}
.k.eq:hover{background:var(--accent-hover);}
.hist-item{padding:6px 0;border-bottom:1px solid var(--border);font-size:0.85rem;color:var(--muted);}
</style></head><body>
<div class="app-header"><div>
  <div class="app-title">🔢 ${spec.name}</div>
  <div class="app-sub">${purpose}</div>
</div></div>

<div class="card">
  <div class="calc-disp">
    <div class="calc-expr" id="expr"></div>
    <div class="calc-num" id="num">0</div>
  </div>
  <div class="kgrid" id="kgrid"></div>
</div>

<div class="card">
  <div class="card-title">계산 이력</div>
  <div id="hist" style="max-height:200px;overflow-y:auto"></div>
</div>

<script>
var keys=[['C','±','%','÷'],['7','8','9','×'],['4','5','6','−'],['1','2','3','+'],['0','.','⌫','=']];
var kg=document.getElementById('kgrid');
keys.forEach(function(row){row.forEach(function(k){
  var b=document.createElement('button');
  var cls='k'+(['÷','×','−','+'].indexOf(k)>=0?' op':k==='='?' eq':['C','±','%','⌫'].indexOf(k)>=0?' fn':'');
  b.className=cls;b.textContent=k;b.onclick=function(){key(k);};kg.appendChild(b);
});});

var expr=document.getElementById('expr'),num=document.getElementById('num'),hist=document.getElementById('hist');
var prev=0,op=null,fresh=false;
var hs=JSON.parse(localStorage.getItem('calc_h')||'[]');
hs.forEach(function(h){addHist(h);});

function addHist(t){var d=document.createElement('div');d.className='hist-item';d.textContent=t;hist.prepend(d);}

function key(k){
  var cur=parseFloat(num.textContent)||0;
  if(k==='C'){expr.textContent='';num.textContent='0';op=null;fresh=false;return;}
  if(k==='⌫'){var t=num.textContent;num.textContent=t.length>1?t.slice(0,-1):'0';return;}
  if(k==='±'){num.textContent=String(-cur);return;}
  if(k==='%'){num.textContent=String(cur/100);return;}
  if(['÷','×','−','+'].indexOf(k)>=0){prev=parseFloat(num.textContent)||0;op=k;fresh=true;expr.textContent=prev+' '+k;return;}
  if(k==='.'){if(num.textContent.indexOf('.')<0)num.textContent+='.';return;}
  if(k==='='){
    if(!op)return;
    var b=parseFloat(num.textContent)||0,r=0;
    if(op==='÷')r=b?prev/b:NaN;
    else if(op==='×')r=prev*b;
    else if(op==='−')r=prev-b;
    else r=prev+b;
    var line=prev+' '+op+' '+b+' = '+r;
    expr.textContent=line;num.textContent=String(r);op=null;fresh=false;
    hs.unshift(line);if(hs.length>50)hs.pop();localStorage.setItem('calc_h',JSON.stringify(hs));addHist(line);return;
  }
  if(fresh){num.textContent=k;fresh=false;}
  else num.textContent=num.textContent==='0'?k:num.textContent+k;
}
document.addEventListener('keydown',function(e){
  if(e.key>='0'&&e.key<='9'||e.key==='.')key(e.key);
  else if(e.key==='/')key('÷');else if(e.key==='*')key('×');
  else if(e.key==='-')key('−');else if(e.key==='+')key('+');
  else if(e.key==='Enter'||e.key==='=')key('=');
  else if(e.key==='Backspace')key('⌫');else if(e.key==='Escape')key('C');
});
</script>
</body></html>`;
}

// ─── 3. 단위 변환기 ─────────────────────────────────────────────────
export function tmpl_unit_convert(spec) {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
.conv-row{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:end;margin:12px 0;}
.conv-arrow{font-size:1.4rem;color:var(--accent);text-align:center;padding-bottom:10px;}
.result-box{background:var(--surface);border:1px solid var(--accent);border-radius:8px;padding:12px 16px;font-size:1.3rem;font-weight:700;color:var(--accent);min-height:44px;}
.cat-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;}
.cat-tab{padding:6px 14px;border-radius:20px;font-size:0.82rem;font-weight:600;cursor:pointer;background:var(--surface);border:1px solid var(--border);color:var(--muted);}
.cat-tab.active{background:var(--accent);color:#fff;border-color:var(--accent);}
</style></head><body>
<div class="app-header"><div>
  <div class="app-title">⚖️ ${spec.name}</div>
  <div class="app-sub">${spec.purpose}</div>
</div></div>

<div class="card">
  <div class="cat-tabs" id="tabs"></div>
  <div class="conv-row">
    <div>
      <label>값</label>
      <input type="number" id="inVal" value="1" oninput="conv()">
      <select id="fromU" onchange="conv()" style="margin-top:8px"></select>
    </div>
    <div class="conv-arrow">→</div>
    <div>
      <label>결과</label>
      <div class="result-box" id="outVal">—</div>
      <select id="toU" onchange="conv()" style="margin-top:8px"></select>
    </div>
  </div>
</div>

<script>
var CATS={
  '길이':{'mm':0.001,'cm':0.01,'m':1,'km':1000,'inch':0.0254,'feet':0.3048,'yard':0.9144,'mile':1609.34},
  '질량':{'mg':1e-6,'g':0.001,'kg':1,'ton':1000,'lb':0.453592,'oz':0.0283495},
  '힘':{'N':1,'kN':1000,'kgf':9.80665,'lbf':4.44822,'dyne':1e-5},
  '압력':{'Pa':1,'kPa':1000,'MPa':1e6,'bar':1e5,'psi':6894.76,'atm':101325,'kgf/cm²':98066.5},
  '속도':{'m/s':1,'km/h':0.277778,'mm/s':0.001,'ft/s':0.3048,'mph':0.44704},
  '각도':{'deg':1,'rad':57.2958,'grad':0.9,'arcmin':0.016667},
  '온도':'special',
  '시간':{'ms':0.001,'s':1,'min':60,'h':3600,'day':86400}
};
var cat='길이';
var tabs=document.getElementById('tabs'),fromU=document.getElementById('fromU'),toU=document.getElementById('toU'),inVal=document.getElementById('inVal'),outVal=document.getElementById('outVal');

function buildTabs(){tabs.innerHTML='';Object.keys(CATS).forEach(function(c){var b=document.createElement('button');b.className='cat-tab'+(c===cat?' active':'');b.textContent=c;b.onclick=function(){cat=c;buildTabs();buildUnits();conv();};tabs.appendChild(b);});}
function buildUnits(){fromU.innerHTML='';toU.innerHTML='';if(CATS[cat]==='special'){['°C','°F','K'].forEach(function(u){fromU.add(new Option(u,u));toU.add(new Option(u,u));});toU.value='°F';}else{Object.keys(CATS[cat]).forEach(function(u){fromU.add(new Option(u,u));toU.add(new Option(u,u));});if(cat==='길이'){fromU.value='mm';toU.value='m';}}}
function conv(){
  var v=parseFloat(inVal.value);if(isNaN(v)){outVal.textContent='—';return;}
  var f=fromU.value,t=toU.value;
  if(CATS[cat]==='special'){
    var c=0;
    if(f==='°C')c=v;else if(f==='°F')c=(v-32)/1.8;else c=v-273.15;
    var r=0;
    if(t==='°C')r=c;else if(t==='°F')r=c*1.8+32;else r=c+273.15;
    outVal.textContent=Math.round(r*10000)/10000+' '+t;
  }else{
    var base=v*(CATS[cat][f]||1),res=base/(CATS[cat][t]||1);
    outVal.textContent=(Math.abs(res)<0.001||Math.abs(res)>1e7)?res.toExponential(4):Math.round(res*1e8)/1e8+' '+t;
  }
}
buildTabs();buildUnits();conv();
</script>
</body></html>`;
}

// ─── 4. 재고/부품 관리 ─────────────────────────────────────────────
export function tmpl_inventory(spec) {
  const ans = _a(spec);
  const target = ans.target || '부품·소모품';
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
.warn-row td{background:rgba(245,158,11,0.08);}
.danger-row td{background:rgba(239,68,68,0.08);}
.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:100;align-items:center;justify-content:center;}
.modal.open{display:flex;}
.modal-box{background:var(--card);border-radius:var(--radius);padding:24px;width:360px;max-width:95vw;}
.modal-title{font-weight:700;font-size:1.1rem;margin-bottom:16px;}
.form-row{margin-bottom:12px;}
.form-row label{display:block;font-size:0.82rem;color:var(--muted);margin-bottom:4px;}
.drop-zone{border:2px dashed var(--border);border-radius:10px;padding:28px;text-align:center;cursor:pointer;transition:all 0.2s;color:var(--muted);}
.drop-zone:hover,.drop-zone.drag-over{border-color:var(--accent);background:rgba(108,99,255,0.06);color:var(--text);}
.map-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;align-items:center;}
#previewTable th,#previewTable td{padding:6px 10px;border:1px solid var(--border);font-size:0.8rem;white-space:nowrap;}
#previewTable th{background:var(--surface);font-weight:600;}
</style></head><body>
<div class="app-header"><div>
  <div class="app-title">🗃️ ${spec.name}</div>
  <div class="app-sub">${target} 재고 관리</div>
</div></div>

<div class="stat-grid" style="max-width:720px;margin:0 auto 16px">
  <div class="stat-box"><div class="stat-value" id="sTot">0</div><div class="stat-label">전체 품목</div></div>
  <div class="stat-box"><div class="stat-value" id="sLow" style="color:var(--warning)">0</div><div class="stat-label">부족 경고</div></div>
  <div class="stat-box"><div class="stat-value" id="sOut" style="color:var(--danger)">0</div><div class="stat-label">재고 없음</div></div>
</div>

<div class="card">
  <div class="card-title">재고 목록</div>
  <div class="btn-row" style="margin-bottom:12px">
    <button class="btn" onclick="openAdd()">+ 품목 추가</button>
    <button class="btn btn-ghost" onclick="csvExport()">CSV 내보내기</button>
  </div>
  <div style="overflow-x:auto">
  <table>
    <thead><tr><th>품목명</th><th>분류</th><th>현재고</th><th>최소</th><th>단위</th><th>상태</th><th>관리</th></tr></thead>
    <tbody id="tBody"></tbody>
  </table>
  </div>
</div>

<div class="card">
  <div class="card-title">입출고 이력</div>
  <table>
    <thead><tr><th>시각</th><th>품목</th><th>구분</th><th>수량</th><th>잔여</th></tr></thead>
    <tbody id="logBody" style="max-height:200px"></tbody>
  </table>
</div>

<div class="card">
  <div class="card-title">파일에서 가져오기</div>
  <p style="font-size:0.85rem;color:var(--muted);margin-bottom:14px">Excel(.xlsx/.xls) 또는 CSV(.csv) 파일을 업로드하면 품목을 일괄 등록합니다.<br>한글(HWP) 파일은 "다른 이름으로 저장 → CSV" 후 업로드하세요.</p>
  <div class="drop-zone" id="dropZone"
       onclick="document.getElementById('fileInput').click()"
       ondragover="event.preventDefault();this.classList.add('drag-over')"
       ondragleave="this.classList.remove('drag-over')"
       ondrop="event.preventDefault();this.classList.remove('drag-over');handleFile(event.dataTransfer.files[0])">
    <div style="font-size:2rem;margin-bottom:8px">📂</div>
    <div style="font-weight:600;margin-bottom:4px">파일을 드래그하거나 클릭해서 선택</div>
    <div style="font-size:0.82rem">지원 형식: Excel (.xlsx, .xls) · CSV (.csv)</div>
    <input type="file" id="fileInput" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleFile(this.files[0])">
  </div>
  <div id="importPreview" style="display:none;margin-top:16px">
    <p style="font-size:0.85rem;color:var(--muted);margin-bottom:10px" id="importInfo"></p>
    <div style="overflow-x:auto"><table id="previewTable"></table></div>
  </div>
</div>

<!-- 열 매핑 모달 -->
<div class="modal" id="mapModal">
  <div class="modal-box" style="max-width:500px;width:95vw">
    <div class="modal-title">열 매핑 설정</div>
    <p style="font-size:0.85rem;color:var(--muted);margin-bottom:16px">어떤 열이 어떤 항목에 해당하는지 선택해주세요 (* 필수)</p>
    <div id="mapFields"></div>
    <div class="btn-row" style="margin-top:20px">
      <button class="btn btn-success" onclick="importMapped()">가져오기</button>
      <button class="btn btn-ghost" onclick="document.getElementById('mapModal').className='modal'">취소</button>
    </div>
  </div>
</div>

<!-- 추가/수정 모달 -->
<div class="modal" id="modal">
  <div class="modal-box">
    <div class="modal-title" id="modalTitle">품목 추가</div>
    <div class="form-row"><label>품목명</label><input id="fName" type="text" placeholder="예: 볼트 M5"></div>
    <div class="form-row"><label>분류</label><input id="fCat" type="text" placeholder="예: 체결부품"></div>
    <div class="form-row"><label>현재 재고</label><input id="fQty" type="number" value="0" min="0"></div>
    <div class="form-row"><label>최소 재고 (경고 기준)</label><input id="fMin" type="number" value="5" min="0"></div>
    <div class="form-row"><label>단위</label><input id="fUnit" type="text" placeholder="개, EA, kg ..."></div>
    <div class="btn-row">
      <button class="btn" onclick="saveItem()">저장</button>
      <button class="btn btn-ghost" onclick="closeModal()">취소</button>
    </div>
  </div>
</div>

<!-- 입출고 모달 -->
<div class="modal" id="ioModal">
  <div class="modal-box">
    <div class="modal-title" id="ioTitle">입출고</div>
    <div class="form-row"><label>구분</label>
      <select id="ioType"><option value="in">입고</option><option value="out">출고</option></select>
    </div>
    <div class="form-row"><label>수량</label><input id="ioQty" type="number" value="1" min="1"></div>
    <div class="btn-row">
      <button class="btn btn-success" onclick="doIO()">확인</button>
      <button class="btn btn-ghost" onclick="document.getElementById('ioModal').className='modal'">취소</button>
    </div>
  </div>
</div>

<script>
var KEY='inv_items',LKEY='inv_log';
var items=JSON.parse(localStorage.getItem(KEY)||'[]');
var logs=JSON.parse(localStorage.getItem(LKEY)||'[]');
var editIdx=-1,ioIdx=-1;

function save(){localStorage.setItem(KEY,JSON.stringify(items));localStorage.setItem(LKEY,JSON.stringify(logs));}
function fmt(d){return new Date(d).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}

function render(){
  var tb=document.getElementById('tBody');tb.innerHTML='';
  var tot=items.length,low=0,out=0;
  items.forEach(function(it,i){
    var st=it.qty<=0?'danger':it.qty<it.min?'warn':'ok';
    if(st==='warn')low++;if(st==='danger')out++;
    var tr=document.createElement('tr');
    if(st==='warn')tr.className='warn-row';if(st==='danger')tr.className='danger-row';
    tr.innerHTML='<td>'+it.name+'</td><td>'+it.cat+'</td><td style="font-weight:700">'+it.qty+'</td><td>'+it.min+'</td><td>'+it.unit+'</td>'
      +'<td><span class="badge badge--'+(st==='ok'?'ok':st==='warn'?'warn':'ng')+'">'+(st==='ok'?'정상':st==='warn'?'부족':'없음')+'</span></td>'
      +'<td><button class="btn btn-ghost" style="padding:4px 10px;font-size:0.78rem" onclick="openIO('+i+')">입출고</button> '
      +'<button class="btn btn-ghost" style="padding:4px 10px;font-size:0.78rem" onclick="editItem('+i+')">수정</button> '
      +'<button class="btn btn-danger" style="padding:4px 10px;font-size:0.78rem" onclick="delItem('+i+')">삭제</button></td>';
    tb.appendChild(tr);
  });
  document.getElementById('sTot').textContent=tot;
  document.getElementById('sLow').textContent=low;
  document.getElementById('sOut').textContent=out;

  var lb=document.getElementById('logBody');lb.innerHTML='';
  logs.slice(0,50).forEach(function(l){
    var tr=document.createElement('tr');
    tr.innerHTML='<td>'+fmt(l.t)+'</td><td>'+l.name+'</td>'
      +'<td><span class="badge badge--'+(l.io==='in'?'ok':'ng')+'">'+(l.io==='in'?'입고':'출고')+'</span></td>'
      +'<td>'+l.qty+'</td><td>'+l.remain+'</td>';
    lb.appendChild(tr);
  });
}

function openAdd(){editIdx=-1;document.getElementById('modalTitle').textContent='품목 추가';
  ['fName','fCat','fUnit'].forEach(function(id){document.getElementById(id).value='';});
  document.getElementById('fQty').value=0;document.getElementById('fMin').value=5;
  document.getElementById('modal').className='modal open';}
function editItem(i){editIdx=i;var it=items[i];document.getElementById('modalTitle').textContent='품목 수정';
  document.getElementById('fName').value=it.name;document.getElementById('fCat').value=it.cat;
  document.getElementById('fQty').value=it.qty;document.getElementById('fMin').value=it.min;
  document.getElementById('fUnit').value=it.unit;document.getElementById('modal').className='modal open';}
function closeModal(){document.getElementById('modal').className='modal';}
function saveItem(){
  var it={name:document.getElementById('fName').value||'이름없음',cat:document.getElementById('fCat').value||'기타',
    qty:+document.getElementById('fQty').value,min:+document.getElementById('fMin').value,unit:document.getElementById('fUnit').value||'개'};
  if(editIdx<0)items.push(it);else items[editIdx]=it;
  save();render();closeModal();
}
function delItem(i){if(confirm('삭제할까요?')){items.splice(i,1);save();render();}}

function openIO(i){ioIdx=i;document.getElementById('ioTitle').textContent=items[i].name+' 입출고';
  document.getElementById('ioQty').value=1;document.getElementById('ioModal').className='modal open';}
function doIO(){
  var it=items[ioIdx],io=document.getElementById('ioType').value,qty=+document.getElementById('ioQty').value;
  if(io==='out'&&qty>it.qty){alert('재고 부족!');return;}
  if(io==='in')it.qty+=qty;else it.qty-=qty;
  logs.unshift({t:Date.now(),name:it.name,io:io,qty:qty,remain:it.qty});
  if(logs.length>200)logs.pop();
  save();render();document.getElementById('ioModal').className='modal';
}
function csvExport(){
  var rows=['품목명,분류,현재고,최소재고,단위'];
  items.forEach(function(it){rows.push(it.name+','+it.cat+','+it.qty+','+it.min+','+it.unit);});
  var a=document.createElement('a');a.href='data:text/csv;charset=utf-8,﻿'+encodeURIComponent(rows.join('\\n'));
  a.download='재고목록.csv';a.click();
}
// ── 파일 가져오기 ──────────────────────────────────────────────
var importedRows=[], importedHeaders=[];
var MAP_FIELDS=[
  {key:'name',label:'품목명',required:true},
  {key:'cat', label:'분류',  required:false},
  {key:'qty', label:'현재 재고',required:false},
  {key:'min', label:'최소 재고',required:false},
  {key:'unit',label:'단위',  required:false}
];
var MAP_KEYWORDS={name:['품목','이름','name','품명','제품','부품'],cat:['분류','카테','cat','종류','구분'],qty:['재고','수량','qty','quantity','현재'],min:['최소','min','기준'],unit:['단위','unit']};

function handleFile(file){
  if(!file)return;
  var n=file.name.toLowerCase();
  if(n.endsWith('.csv')){
    var r=new FileReader();r.onload=function(e){parseCSVData(e.target.result);};r.readAsText(file,'UTF-8');
  } else if(n.endsWith('.xlsx')||n.endsWith('.xls')){
    loadXLSX(function(){
      var r=new FileReader();r.onload=function(e){
        var wb=XLSX.read(e.target.result,{type:'array'});
        var ws=wb.Sheets[wb.SheetNames[0]];
        showImport(XLSX.utils.sheet_to_json(ws,{header:1}));
      };r.readAsArrayBuffer(file);
    });
  } else if(n.endsWith('.hwp')||n.endsWith('.hwpx')){
    alert('한글(.hwp) 파일은 브라우저에서 직접 읽을 수 없습니다.\\n[파일 → 다른 이름으로 저장 → CSV] 후 업로드하세요.');
  } else {
    alert('지원하지 않는 형식입니다.\\nExcel(.xlsx/.xls) 또는 CSV(.csv) 파일을 사용해주세요.');
  }
}
function loadXLSX(cb){
  if(window.XLSX){cb();return;}
  var s=document.createElement('script');
  s.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  s.onload=cb;s.onerror=function(){alert('SheetJS 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');};
  document.head.appendChild(s);
}
function parseCSVData(text){
  var lines=text.trim().split('\\n').map(function(l){
    return l.split(',').map(function(c){return c.trim().replace(/^"|"$/g,'');});
  });
  showImport(lines);
}
function showImport(data){
  if(!data||data.length<2){alert('데이터가 2행 이상이어야 합니다.');return;}
  importedHeaders=data[0].map(function(h){return String(h||'');});
  importedRows=data.slice(1).filter(function(r){return r.some(function(c){return c!=null&&String(c).trim();});});
  var info=document.getElementById('importInfo');
  info.textContent='📊 '+importedRows.length+'행 · '+importedHeaders.length+'열 감지됨 — 아래에서 열 매핑을 설정하세요';
  var tbl=document.getElementById('previewTable');
  tbl.innerHTML='<thead><tr>'+importedHeaders.map(function(h){return '<th>'+h+'</th>';}).join('')+'</tr></thead>'
    +'<tbody>'+importedRows.slice(0,5).map(function(r){
      return '<tr>'+importedHeaders.map(function(_,i){return '<td>'+(r[i]!=null?String(r[i]):'')+'</td>';}).join('')+'</tr>';
    }).join('')+'</tbody>';
  document.getElementById('importPreview').style.display='block';
  showMapDialog();
}
function showMapDialog(){
  function autoMatch(key){
    var kws=MAP_KEYWORDS[key]||[];
    for(var i=0;i<importedHeaders.length;i++){
      var h=importedHeaders[i].toLowerCase();
      if(kws.some(function(k){return h.includes(k);}))return i;
    }
    return '';
  }
  var opts='<option value="">— 사용 안 함 —</option>'
    +importedHeaders.map(function(h,i){return '<option value="'+i+'">'+h+'</option>';}).join('');
  document.getElementById('mapFields').innerHTML=MAP_FIELDS.map(function(f){
    var auto=String(autoMatch(f.key));
    var selOpts=opts.replace('value="'+auto+'"','value="'+auto+'" selected');
    return '<div class="map-row"><label style="font-size:0.88rem;font-weight:'+(f.required?'700':'400')+'">'
      +(f.required?'* ':'')+f.label+'</label>'
      +'<select id="map_'+f.key+'" style="padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text)">'+selOpts+'</select></div>';
  }).join('');
  document.getElementById('mapModal').className='modal open';
}
function importMapped(){
  var nameVal=document.getElementById('map_name').value;
  if(nameVal===''){alert('품목명 열을 선택해주세요.');return;}
  var nameCol=+nameVal;
  var catCol=document.getElementById('map_cat').value;
  var qtyCol=document.getElementById('map_qty').value;
  var minCol=document.getElementById('map_min').value;
  var unitCol=document.getElementById('map_unit').value;
  var added=0,skipped=0;
  importedRows.forEach(function(r){
    var name=String(r[nameCol]!=null?r[nameCol]:'').trim();
    if(!name){skipped++;return;}
    items.push({
      name:name,
      cat: catCol!==''?String(r[+catCol]||'기타').trim():'기타',
      qty: qtyCol!==''?(+r[+qtyCol]||0):0,
      min: minCol!==''?(+r[+minCol]||0):0,
      unit:unitCol!==''?String(r[+unitCol]||'개').trim():'개'
    });
    added++;
  });
  save();render();
  document.getElementById('mapModal').className='modal';
  document.getElementById('importPreview').style.display='none';
  document.getElementById('fileInput').value='';
  importedRows=[];importedHeaders=[];
  alert('✅ '+added+'개 품목을 가져왔습니다.'+(skipped?'\\n(빈 이름 '+skipped+'개 건너뜀)':''));
}
render();
</script>
</body></html>`;
}

// ─── 5. 데이터 기록 ─────────────────────────────────────────────────
export function tmpl_data_record(spec) {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:100;align-items:center;justify-content:center;}
.modal.open{display:flex;}
.modal-box{background:var(--card);border-radius:var(--radius);padding:24px;width:400px;max-width:96vw;}
</style></head><body>
<div class="app-header"><div>
  <div class="app-title">📋 ${spec.name}</div>
  <div class="app-sub">${spec.purpose}</div>
</div></div>

<div class="card">
  <div class="card-title">열 구성 설정</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <input id="colInput" type="text" placeholder="열 이름 입력 후 추가" style="flex:1;min-width:150px">
    <button class="btn" onclick="addCol()">+ 열 추가</button>
    <button class="btn btn-ghost" onclick="resetCols()">초기화</button>
  </div>
  <div id="colTags" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px"></div>
</div>

<div class="card">
  <div class="card-title">데이터 입력</div>
  <div id="inputForm"></div>
  <div class="btn-row">
    <button class="btn btn-success" onclick="addRow()">+ 행 추가</button>
    <button class="btn btn-ghost" onclick="csvExport()">CSV 내보내기</button>
    <button class="btn btn-danger" onclick="clearAll()">전체 삭제</button>
  </div>
</div>

<div class="card">
  <div class="card-title">기록 <span id="rowCount" style="color:var(--accent)">0</span>건</div>
  <div style="overflow-x:auto"><table id="dataTable"><thead><tr id="thead"></tr></thead><tbody id="tbody"></tbody></table></div>
</div>

<script>
var KEY='drec_data';
var cols=JSON.parse(localStorage.getItem('drec_cols')||'["항목","값","비고"]');
var rows=JSON.parse(localStorage.getItem(KEY)||'[]');

function saveCols(){localStorage.setItem('drec_cols',JSON.stringify(cols));}
function saveRows(){localStorage.setItem(KEY,JSON.stringify(rows));}

function renderCols(){
  var ct=document.getElementById('colTags');ct.innerHTML='';
  cols.forEach(function(c,i){
    var sp=document.createElement('span');
    sp.style.cssText='background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:4px 10px;font-size:0.82rem;display:inline-flex;align-items:center;gap:6px;';
    sp.innerHTML=c+' <span style="cursor:pointer;color:var(--danger)" onclick="removeCol('+i+')">✕</span>';
    ct.appendChild(sp);
  });
  var form=document.getElementById('inputForm');form.innerHTML='';
  cols.forEach(function(c){
    var d=document.createElement('div');d.style.marginBottom='8px';
    d.innerHTML='<label style="display:block;font-size:0.82rem;color:var(--muted);margin-bottom:4px">'+c+'</label><input id="f_'+c.replace(/\s/g,'_')+'" type="text" placeholder="'+c+' 입력">';
    form.appendChild(d);
  });
}
function addCol(){var v=document.getElementById('colInput').value.trim();if(!v)return;cols.push(v);saveCols();renderCols();document.getElementById('colInput').value='';}
function removeCol(i){if(!confirm('열을 삭제하면 해당 데이터도 사라집니다. 계속?'))return;cols.splice(i,1);saveCols();renderCols();renderTable();}
function resetCols(){if(!confirm('열 설정을 초기화할까요?'))return;cols=['항목','값','비고'];saveCols();renderCols();renderTable();}

function renderTable(){
  var th=document.getElementById('thead');th.innerHTML='<th>번호</th><th>시각</th>';
  cols.forEach(function(c){var t=document.createElement('th');t.textContent=c;th.appendChild(t);});
  var dt=document.createElement('th');dt.textContent='삭제';th.appendChild(dt);

  var tb=document.getElementById('tbody');tb.innerHTML='';
  rows.forEach(function(r,i){
    var tr=document.createElement('tr');
    var td='<td>'+(i+1)+'</td><td style="white-space:nowrap;font-size:0.82rem">'+new Date(r._t).toLocaleString('ko-KR')+'</td>';
    cols.forEach(function(c){td+='<td>'+(r[c]||'')+'</td>';});
    td+='<td><button class="btn btn-danger" style="padding:3px 8px;font-size:0.78rem" onclick="delRow('+i+')">삭제</button></td>';
    tr.innerHTML=td;tb.appendChild(tr);
  });
  document.getElementById('rowCount').textContent=rows.length;
}
function addRow(){
  var r={_t:Date.now()};
  cols.forEach(function(c){var el=document.getElementById('f_'+c.replace(/\s/g,'_'));r[c]=el?el.value:'';});
  rows.push(r);saveRows();renderTable();
  cols.forEach(function(c){var el=document.getElementById('f_'+c.replace(/\s/g,'_'));if(el)el.value='';});
}
function delRow(i){rows.splice(i,1);saveRows();renderTable();}
function clearAll(){if(!confirm('전체 기록을 삭제할까요?'))return;rows=[];saveRows();renderTable();}
function csvExport(){
  var head='﻿번호,시각,'+cols.join(',');
  var body=rows.map(function(r,i){return (i+1)+','+new Date(r._t).toLocaleString('ko-KR')+','+cols.map(function(c){return '"'+(r[c]||'')+'"';}).join(',');});
  var a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent([head].concat(body).join('\\n'));
  a.download='기록.csv';a.click();
}
renderCols();renderTable();
</script>
</body></html>`;
}

// ─── 6. 모터 이송 시뮬레이터 ───────────────────────────────────────
export function tmpl_motor_transfer(spec) {
  const ans = _a(spec);
  const dist = _n(ans.distance, 500);
  const dur  = _n(ans.duration, 10);
  const dirDisplay = Array.isArray(ans.direction) && ans.direction.length
    ? ans.direction.join(' · ')
    : (ans.direction || '수평 이송 (좌우)');
  const hasVertical = _has(ans.direction, '수직');
  const preferBack  = _has(ans.motion, '왕복');
  const hasEstop    = _has(ans.control, '비상정지');
  const hasJog      = _has(ans.control, '조그');
  const hasSpeed    = _has(ans.control, '속도 슬라이더');
  const hasPause    = _has(ans.control, '일시정지') || true; // 항상 일시정지 지원
  const hasLog      = _has(ans.log, '저장') || _has(ans.log, 'CSV');
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
.track-wrap{background:var(--surface);border-radius:10px;padding:16px;margin:12px 0;position:relative;height:70px;}
.track-line{position:absolute;top:50%;left:20px;right:20px;height:3px;background:var(--border);transform:translateY(-50%);}
.track-end{position:absolute;top:50%;width:6px;height:24px;background:var(--muted);border-radius:3px;transform:translateY(-50%);}
.track-end.left{left:20px;}
.track-end.right{right:20px;}
.carriage{position:absolute;top:50%;width:36px;height:36px;background:var(--accent);border-radius:8px;transform:translate(-50%,-50%);transition:left 0.1s linear;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 12px var(--accent);}
.prog-bar{height:8px;background:var(--surface);border-radius:4px;overflow:hidden;margin:6px 0;}
.prog-fill{height:100%;background:var(--accent);border-radius:4px;transition:width 0.1s linear;}
</style></head><body>
<div class="app-header"><div>
  <div class="app-title">↔️ ${spec.name}</div>
  <div class="app-sub">${dirDisplay}${hasVertical ? ' (수직 포함)' : ''}</div>
</div></div>

<div class="card">
  <div class="card-title">설정</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div><label>이송 거리 (mm)</label><input type="number" id="cDist" value="${dist}" min="1"></div>
    <div><label>이동 시간 (초)</label><input type="number" id="cDur" value="${dur}" min="1" step="0.1"></div>
    <div><label>동작 방식</label>
      <select id="cMotion">
        <option value="once" ${!preferBack ? 'selected':''}>한 방향</option>
        <option value="back" ${preferBack ? 'selected':''}>왕복</option>
      </select>
    </div>
    <div><label>반복</label>
      <select id="cRepeat">
        <option value="inf">계속 반복</option>
        <option value="1">1회</option>
        <option value="3">3회</option>
        <option value="5">5회</option>
        <option value="10">10회</option>
      </select>
    </div>
  </div>
</div>

<div class="card">
  <div class="card-title">동작 상태</div>
  <div class="track-wrap">
    <div class="track-line"></div>
    <div class="track-end left"></div>
    <div class="track-end right"></div>
    <div class="carriage" id="car">⚙</div>
  </div>
  <div class="prog-bar"><div class="prog-fill" id="prog" style="width:0%"></div></div>
  <div class="stat-grid" style="margin-top:12px">
    <div class="stat-box"><div class="stat-value" id="sPos">0</div><div class="stat-label">위치 (mm)</div></div>
    <div class="stat-box"><div class="stat-value" id="sRem">0</div><div class="stat-label">남은 거리 (mm)</div></div>
    <div class="stat-box"><div class="stat-value" id="sElap">0.0</div><div class="stat-label">경과 (초)</div></div>
    <div class="stat-box"><div class="stat-value" id="sCnt">0</div><div class="stat-label">완료 횟수</div></div>
  </div>
  <div class="status-bar"><div class="dot" id="stDot"></div><span id="stTxt">대기 중</span></div>
  ${hasSpeed ? `<div style="margin:10px 0 4px"><label style="font-size:0.82rem;color:var(--muted)">속도 배율</label><div style="display:flex;align-items:center;gap:10px;margin-top:4px"><input type="range" id="speedRange" min="10" max="300" value="100" oninput="document.getElementById('spVal').textContent=this.value+'%'" style="flex:1;cursor:pointer"><span id="spVal" style="font-size:0.82rem;color:var(--accent);width:42px;text-align:right">100%</span></div></div>` : ''}
  <div class="btn-row">
    <button class="btn btn-success" id="btnRun" onclick="toggle()">▶ 시작</button>
    ${hasEstop ? '<button class="btn btn-danger" onclick="estop()">⛔ 비상정지</button>' : ''}
    ${hasJog ? '<button class="btn btn-ghost" onclick="jog(-1)">◀ 조그</button><button class="btn btn-ghost" onclick="jog(1)">조그 ▶</button>' : ''}
    <button class="btn btn-ghost" onclick="doReset()">초기화</button>
  </div>
</div>

<div class="card">
  <div class="card-title">동작 로그</div>
  <div id="log" style="max-height:180px;overflow-y:auto;font-size:0.85rem;color:var(--muted)"></div>
</div>

<script>
var running=false,iv=null,pos=0,dir2=1,cnt=0,elapsed=0,startT=0,stopped=false;
var car=document.getElementById('car'),prog=document.getElementById('prog');
var sPos=document.getElementById('sPos'),sRem=document.getElementById('sRem'),sElap=document.getElementById('sElap'),sCnt=document.getElementById('sCnt');
var stDot=document.getElementById('stDot'),stTxt=document.getElementById('stTxt'),btnRun=document.getElementById('btnRun');
var logEl=document.getElementById('log');

function addLog(msg){var d=document.createElement('div');d.style.borderBottom='1px solid var(--border)';d.style.padding='4px 0';d.textContent=new Date().toLocaleTimeString('ko-KR')+' — '+msg;logEl.prepend(d);}
function setStatus(cls,txt){stDot.className='dot dot--'+cls;stTxt.textContent=txt;}
function updateDisplay(){
  var dist=+document.getElementById('cDist').value||500;
  var pct=Math.abs(pos/dist)*100;
  prog.style.width=Math.min(pct,100)+'%';
  sPos.textContent=Math.round(Math.abs(pos));
  sRem.textContent=Math.round(dist-Math.abs(pos));
  car.style.left=(20+(Math.abs(pos)/dist)*calc_track())+'px';
  sElap.textContent=elapsed.toFixed(1);
}
function calc_track(){return document.querySelector('.track-wrap').offsetWidth-56;}

function toggle(){
  if(running){clearInterval(iv);running=false;btnRun.textContent='▶ 계속';btnRun.className='btn btn-success';setStatus('warn','일시정지');addLog('일시정지');}
  else{
    stopped=false;
    var dist=+document.getElementById('cDist').value||500,dur2=+document.getElementById('cDur').value||10;
    var spEl=${hasSpeed ? "document.getElementById('speedRange')" : 'null'};
    var step=dist/(dur2*20)*(spEl?+spEl.value/100:1);
    startT=Date.now()-elapsed*1000;
    iv=setInterval(function(){
      elapsed=(Date.now()-startT)/1000;
      pos+=dir2*step;
      var motion=document.getElementById('cMotion').value;
      var repeat=document.getElementById('cRepeat').value;
      var leg=(dir2>0&&pos>=dist)||(dir2<0&&pos<=0);
      if(leg){
        pos=dir2>0?dist:0;
        if(motion==='back'){cnt++;addLog(dir2>0?'→ 정방향 완료':'← 역방향 완료');dir2*=-1;}
        else{cnt++;addLog('→ 완료 #'+cnt);pos=0;}
        sCnt.textContent=cnt;
        if(repeat!=='inf'&&cnt>= +repeat*(motion==='back'?2:1)){clearInterval(iv);running=false;pos=0;btnRun.textContent='▶ 시작';btnRun.className='btn btn-success';setStatus('off','완료');addLog('전체 동작 완료');updateDisplay();return;}
      }
      updateDisplay();
    },50);
    running=true;btnRun.textContent='⏸ 일시정지';btnRun.className='btn btn-danger';setStatus('on','동작 중');addLog('시작');
  }
}
function estop(){clearInterval(iv);running=false;pos=0;dir2=1;elapsed=0;btnRun.textContent='▶ 시작';btnRun.className='btn btn-success';setStatus('off','비상정지');addLog('⛔ 비상정지!');updateDisplay();}
function doReset(){clearInterval(iv);running=false;pos=0;dir2=1;elapsed=0;cnt=0;sCnt.textContent=0;sElap.textContent='0.0';btnRun.textContent='▶ 시작';btnRun.className='btn btn-success';setStatus('','대기 중');updateDisplay();}
${hasJog ? "function jog(d){if(running)return;var dist=+document.getElementById('cDist').value||500;pos+=d*10;pos=Math.max(0,Math.min(dist,pos));updateDisplay();addLog('조그: '+Math.round(pos)+'mm');}" : ''}
updateDisplay();
</script>
</body></html>`;
}

// ─── 7. 모터 회전 시뮬레이터 ───────────────────────────────────────
export function tmpl_motor_rotation(spec) {
  const ans = _a(spec);
  const speed        = _n(ans.speed, 3);
  const biDir        = _has(ans.direction, '정역');
  const hasEstopR    = _has(ans.control, '비상정지');
  const hasSpeedR    = _has(ans.control, '속도 슬라이더');
  const prefTime     = _has(ans.stop, '시간');
  const prefCount    = _has(ans.stop, '횟수');
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
.rotor-wrap{display:flex;justify-content:center;margin:16px 0;}
.rotor{width:120px;height:120px;border-radius:50%;border:4px solid var(--accent);position:relative;background:var(--surface);display:flex;align-items:center;justify-content:center;}
.rotor-needle{position:absolute;width:3px;height:46px;background:var(--accent);border-radius:2px;bottom:50%;left:50%;transform-origin:bottom center;transform:translateX(-50%) rotate(0deg);transition:transform 0.05s linear;}
.rotor-center{width:12px;height:12px;border-radius:50%;background:var(--accent);position:absolute;}
</style></head><body>
<div class="app-header"><div>
  <div class="app-title">🔄 ${spec.name}</div>
  <div class="app-sub">${spec.purpose}</div>
</div></div>

<div class="card">
  <div class="card-title">설정</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div><label>1회전 시간 (초)</label><input type="number" id="cSpeed" value="${speed}" min="0.1" step="0.1"></div>
    <div><label>정지 조건</label>
      <select id="cStop">
        <option value="manual" ${(!prefTime&&!prefCount)?'selected':''}>수동 정지</option>
        <option value="time" ${prefTime?'selected':''}>시간 지정</option>
        <option value="count" ${prefCount?'selected':''}>횟수 지정</option>
      </select>
    </div>
    <div id="timeRow"><label>동작 시간 (초)</label><input type="number" id="cTime" value="10" min="1"></div>
    <div id="countRow" style="display:none"><label>회전 횟수</label><input type="number" id="cCount" value="5" min="1"></div>
  </div>
</div>

<div class="card">
  <div class="card-title">동작 상태</div>
  <div class="rotor-wrap">
    <div class="rotor">
      <div class="rotor-needle" id="needle"></div>
      <div class="rotor-center"></div>
    </div>
  </div>
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-value" id="sRpm">0</div><div class="stat-label">RPM</div></div>
    <div class="stat-box"><div class="stat-value" id="sTurn">0</div><div class="stat-label">회전수</div></div>
    <div class="stat-box"><div class="stat-value" id="sElap">0</div><div class="stat-label">경과 (초)</div></div>
    <div class="stat-box"><div class="stat-value" id="sDir" style="font-size:1rem">—</div><div class="stat-label">방향</div></div>
  </div>
  <div class="status-bar"><div class="dot" id="stDot"></div><span id="stTxt">대기 중</span></div>
  ${hasSpeedR ? `<div style="margin:10px 0 4px"><label style="font-size:0.82rem;color:var(--muted)">속도 배율</label><div style="display:flex;align-items:center;gap:10px;margin-top:4px"><input type="range" id="rSpeedRange" min="10" max="300" value="100" oninput="document.getElementById('rSpVal').textContent=this.value+'%'" style="flex:1;cursor:pointer"><span id="rSpVal" style="font-size:0.82rem;color:var(--accent);width:42px;text-align:right">100%</span></div></div>` : ''}
  <div class="btn-row">
    <button class="btn btn-success" id="btnRun" onclick="toggle()">▶ 시작</button>
    ${biDir ? '<button class="btn btn-ghost" onclick="flipDir()">⇄ 방향 전환</button>' : ''}
    ${hasEstopR ? '<button class="btn btn-danger" onclick="doReset(true)">⛔ 비상정지</button>' : ''}
    <button class="btn btn-ghost" onclick="doReset()">초기화</button>
  </div>
</div>

<script>
var running=false,iv=null,angle=0,dir=1,turns=0,elapsed=0,startT=0;
var needle=document.getElementById('needle');
var sRpm=document.getElementById('sRpm'),sTurn=document.getElementById('sTurn'),sElap=document.getElementById('sElap'),sDir=document.getElementById('sDir');
var stDot=document.getElementById('stDot'),stTxt=document.getElementById('stTxt'),btnRun=document.getElementById('btnRun');

document.getElementById('cStop').onchange=function(){
  var v=this.value;
  document.getElementById('timeRow').style.display=v==='time'?'':'none';
  document.getElementById('countRow').style.display=v==='count'?'':'none';
};

function setStatus(c,t){stDot.className='dot dot--'+c;stTxt.textContent=t;}

function toggle(){
  if(running){clearInterval(iv);running=false;btnRun.textContent='▶ 계속';btnRun.className='btn btn-success';setStatus('warn','일시정지');}
  else{
    var sp=+document.getElementById('cSpeed').value||3;
    var degPerTick=360/(sp*20);
    startT=Date.now()-elapsed*1000;
    iv=setInterval(function(){
      elapsed=(Date.now()-startT)/1000;
      angle+=dir*degPerTick;
      if(angle>=360||angle<=-360){turns+=1;sTurn.textContent=turns;angle=angle%360;}
      needle.style.transform='translateX(-50%) rotate('+angle+'deg)';
      sRpm.textContent=Math.round(60/sp);
      sElap.textContent=elapsed.toFixed(1);
      sDir.textContent=dir>0?'정방향':'역방향';
      var stop=document.getElementById('cStop').value;
      if(stop==='time'&&elapsed>= +document.getElementById('cTime').value){doReset(true);}
      if(stop==='count'&&turns>= +document.getElementById('cCount').value){doReset(true);}
    },50);
    running=true;btnRun.textContent='⏸ 일시정지';btnRun.className='btn btn-danger';setStatus('on','회전 중');
  }
}
function flipDir(){dir*=-1;sDir.textContent=dir>0?'정방향':'역방향';}
function doReset(done){
  clearInterval(iv);running=false;elapsed=0;turns=0;angle=0;
  needle.style.transform='translateX(-50%) rotate(0deg)';
  sRpm.textContent=0;sTurn.textContent=0;sElap.textContent=0;sDir.textContent='—';
  btnRun.textContent='▶ 시작';btnRun.className='btn btn-success';
  setStatus(done?'off':'','대기 중');
}
</script>
</body></html>`;
}

// ─── 8. 공정 타이머 ────────────────────────────────────────────────
export function tmpl_process_timer(spec) {
  const ans = _a(spec);
  const stepCount = _n(ans.step_count, 4);
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
.step-item{display:flex;align-items:center;gap:12px;padding:12px;border-radius:8px;border:1px solid var(--border);margin-bottom:8px;transition:background 0.2s;}
.step-item.active{background:rgba(108,99,255,0.12);border-color:var(--accent);}
.step-item.done{background:rgba(34,197,94,0.08);border-color:var(--success);}
.step-num{width:28px;height:28px;border-radius:50%;background:var(--border);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;flex-shrink:0;}
.step-num.active{background:var(--accent);color:#fff;}
.step-num.done{background:var(--success);color:#fff;}
.step-prog{height:6px;background:var(--surface);border-radius:3px;overflow:hidden;margin-top:6px;}
.step-prog-fill{height:100%;background:var(--accent);border-radius:3px;transition:width 0.1s;}
.total-bar{height:10px;background:var(--surface);border-radius:5px;overflow:hidden;margin:10px 0;}
.total-fill{height:100%;background:var(--success);border-radius:5px;transition:width 0.5s;}
</style></head><body>
<div class="app-header"><div>
  <div class="app-title">⏱️ ${spec.name}</div>
  <div class="app-sub">${spec.purpose}</div>
</div></div>

<div class="card">
  <div class="card-title">단계 설정</div>
  <div id="stepSetup"></div>
  <div class="btn-row">
    <button class="btn btn-ghost" onclick="addStep()">+ 단계 추가</button>
    <button class="btn btn-ghost" onclick="removeStep()">− 단계 삭제</button>
  </div>
</div>

<div class="card">
  <div class="card-title">공정 실행</div>
  <div class="total-bar"><div class="total-fill" id="totalFill" style="width:0%"></div></div>
  <div id="stepList"></div>
  <div class="stat-grid" style="margin-top:12px">
    <div class="stat-box"><div class="stat-value" id="sCurStep">—</div><div class="stat-label">현재 단계</div></div>
    <div class="stat-box"><div class="stat-value" id="sStepTime">0</div><div class="stat-label">단계 남은 (초)</div></div>
    <div class="stat-box"><div class="stat-value" id="sTotalTime">0</div><div class="stat-label">전체 남은 (초)</div></div>
  </div>
  <div class="status-bar"><div class="dot" id="stDot"></div><span id="stTxt">대기 중</span></div>
  <div class="btn-row">
    <button class="btn btn-success" id="btnRun" onclick="toggle()">▶ 시작</button>
    <button class="btn btn-ghost" onclick="nextStep()">다음 단계 →</button>
    <button class="btn btn-danger" onclick="doReset()">초기화</button>
  </div>
</div>

<script>
var KEY='ptimer_steps';
var steps=JSON.parse(localStorage.getItem(KEY)||'null')||[{name:'예열',dur:60},{name:'공정 A',dur:120},{name:'공정 B',dur:90},{name:'냉각',dur:60}];
var curStep=0,running=false,iv=null,stepElap=0,startT=0;

function saveSteps(){localStorage.setItem(KEY,JSON.stringify(steps));}

function renderSetup(){
  var d=document.getElementById('stepSetup');d.innerHTML='';
  steps.forEach(function(s,i){
    var row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:8px;align-items:center;';
    row.innerHTML='<input type="text" value="'+s.name+'" placeholder="단계 이름" oninput="steps['+i+'].name=this.value;saveSteps()">'
      +'<div style="display:flex;align-items:center;gap:6px"><input type="number" value="'+s.dur+'" min="1" style="width:80px;text-align:right" oninput="steps['+i+'].dur=+this.value;saveSteps()"><span style="color:var(--muted);font-size:0.85rem">초</span></div>';
    d.appendChild(row);
  });
}
function addStep(){steps.push({name:'단계 '+(steps.length+1),dur:60});saveSteps();renderSetup();}
function removeStep(){if(steps.length<2)return;steps.pop();saveSteps();renderSetup();}

function renderList(){
  var d=document.getElementById('stepList');d.innerHTML='';
  var totalDone=steps.slice(0,curStep).reduce(function(a,s){return a+s.dur;},0);
  var totalAll=steps.reduce(function(a,s){return a+s.dur;},0);
  document.getElementById('totalFill').style.width=(totalDone/totalAll*100)+'%';
  steps.forEach(function(s,i){
    var div=document.createElement('div');
    div.className='step-item'+(i===curStep&&running?' active':i<curStep?' done':'');
    var pct=i===curStep?Math.min(stepElap/s.dur*100,100):(i<curStep?100:0);
    div.innerHTML='<div class="step-num '+(i<curStep?'done':i===curStep&&running?'active':'')+'">'+( i<curStep?'✓':(i+1))+'</div>'
      +'<div style="flex:1"><div style="font-weight:600">'+s.name+'</div>'
      +'<div style="font-size:0.8rem;color:var(--muted)">'+s.dur+'초</div>'
      +'<div class="step-prog"><div class="step-prog-fill" style="width:'+pct+'%"></div></div></div>';
    d.appendChild(div);
  });
}

function toggle(){
  if(running){clearInterval(iv);running=false;btnRun.textContent='▶ 계속';btnRun.className='btn btn-success';setStatus('warn','일시정지');}
  else{
    if(curStep>=steps.length)doReset();
    startT=Date.now()-stepElap*1000;
    iv=setInterval(function(){
      stepElap=(Date.now()-startT)/1000;
      var s=steps[curStep];
      document.getElementById('sStepTime').textContent=Math.max(0,Math.ceil(s.dur-stepElap));
      var totalRem=steps.slice(curStep+1).reduce(function(a,st){return a+st.dur;},0)+Math.max(0,s.dur-stepElap);
      document.getElementById('sTotalTime').textContent=Math.ceil(totalRem);
      renderList();
      if(stepElap>=s.dur){nextStep();}
    },200);
    running=true;btnRun.textContent='⏸ 일시정지';btnRun.className='btn btn-danger';
    document.getElementById('sCurStep').textContent=steps[curStep].name;
    setStatus('on','공정 중');
  }
}
var btnRun=document.getElementById('btnRun');
function setStatus(c,t){document.getElementById('stDot').className='dot dot--'+c;document.getElementById('stTxt').textContent=t;}
function nextStep(){
  stepElap=0;curStep++;
  if(curStep>=steps.length){clearInterval(iv);running=false;curStep=steps.length-1;setStatus('off','완료');btnRun.textContent='▶ 시작';btnRun.className='btn btn-success';document.getElementById('sCurStep').textContent='완료';alert('전체 공정 완료!');renderList();return;}
  startT=Date.now();document.getElementById('sCurStep').textContent=steps[curStep].name;
}
function doReset(){clearInterval(iv);running=false;curStep=0;stepElap=0;btnRun.textContent='▶ 시작';btnRun.className='btn btn-success';setStatus('','대기 중');document.getElementById('sCurStep').textContent='—';document.getElementById('sStepTime').textContent=0;document.getElementById('sTotalTime').textContent=0;document.getElementById('totalFill').style.width='0%';renderList();}
renderSetup();renderList();
</script>
</body></html>`;
}

// ─── 9. 센서 모니터링 ──────────────────────────────────────────────
export function tmpl_sensor(spec) {
  const ans = _a(spec);
  const sensorName = _first(ans.target, '온도');
  const unit = sensorName.includes('온도')?'°C':sensorName.includes('압력')?'kPa':sensorName.includes('진동')?'g':sensorName.includes('습도')?'%RH':sensorName.includes('전압')?'V':'';
  const threshold  = 80;
  const hasCSV     = _has(ans.save, 'CSV') || _has(ans.save, '저장');
  const allTargets = Array.isArray(ans.target) && ans.target.length > 1 ? ans.target : null;
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
.gauge-wrap{display:flex;justify-content:center;margin:12px 0;}
.gauge-val{font-size:3.5rem;font-weight:700;color:var(--accent);text-align:center;}
.gauge-unit{font-size:1rem;color:var(--muted);}
.gauge-bar{height:16px;background:var(--surface);border-radius:8px;overflow:hidden;margin:8px 0;}
.gauge-fill{height:100%;border-radius:8px;transition:width 0.3s,background 0.3s;}
.alarm{background:rgba(239,68,68,0.12);border:1px solid var(--danger);border-radius:8px;padding:10px 14px;display:none;color:var(--danger);font-weight:600;margin:8px 0;}
.alarm.show{display:block;}
.sparkline{display:flex;align-items:flex-end;gap:2px;height:60px;}
.spark-bar{flex:1;background:var(--accent);border-radius:2px 2px 0 0;min-width:4px;transition:height 0.3s;}
</style></head><body>
<div class="app-header"><div>
  <div class="app-title">📡 ${spec.name}</div>
  <div class="app-sub">${spec.purpose}</div>
</div></div>

<div class="card">
  <div class="card-title">센서 설정</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div><label>센서 이름</label><input id="cName" type="text" value="${sensorName}"></div>
    <div><label>단위</label><input id="cUnit" type="text" value="${unit}"></div>
    <div><label>측정 범위 최솟값</label><input id="cMin" type="number" value="0"></div>
    <div><label>측정 범위 최댓값</label><input id="cMax" type="number" value="100"></div>
    <div><label>경보 임계값</label><input id="cThresh" type="number" value="${threshold}"></div>
    <div><label>업데이트 간격 (초)</label><input id="cInterval" type="number" value="2" min="1" max="60"></div>
  </div>
</div>

<div class="card">
  <div class="card-title">실시간 모니터링</div>
  <div class="alarm" id="alarm">⚠️ 경보: 임계값 초과!</div>
  <div class="gauge-wrap">
    <div><div class="gauge-val" id="curVal">—</div><div class="gauge-unit" id="curUnit">${unit}</div></div>
  </div>
  <div class="gauge-bar"><div class="gauge-fill" id="gFill" style="width:0%"></div></div>
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-value" id="sMin">—</div><div class="stat-label">최솟값</div></div>
    <div class="stat-box"><div class="stat-value" id="sMax">—</div><div class="stat-label">최댓값</div></div>
    <div class="stat-box"><div class="stat-value" id="sAvg">—</div><div class="stat-label">평균</div></div>
    <div class="stat-box"><div class="stat-value" id="sCnt">0</div><div class="stat-label">측정 횟수</div></div>
  </div>
  <div class="card-title" style="margin-top:12px">추세</div>
  <div class="sparkline" id="spark"></div>
  <div class="status-bar"><div class="dot" id="stDot"></div><span id="stTxt">정지</span></div>
  <div class="btn-row">
    <button class="btn btn-success" id="btnMon" onclick="toggleMon()">▶ 모니터링 시작</button>
    ${hasCSV ? '<button class="btn btn-ghost" onclick="csvExport()">CSV 내보내기</button>' : ''}
    <button class="btn btn-ghost" onclick="clearData()">데이터 초기화</button>
  </div>
</div>
${allTargets ? `<div class="card" style="max-width:720px;margin:0 auto 16px"><div class="card-title">측정 채널</div><div style="display:flex;gap:8px;flex-wrap:wrap">${allTargets.map(function(t){return '<span style="background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:4px 14px;font-size:0.85rem">'+t+'</span>';}).join('')}</div></div>` : ''}

<script>
var iv=null,vals=[],exportLog=[],monRun=false;
function rnd(mn,mx){return mn+Math.random()*(mx-mn);}
function toggleMon(){
  if(monRun){clearInterval(iv);monRun=false;document.getElementById('btnMon').textContent='▶ 모니터링 시작';document.getElementById('btnMon').className='btn btn-success';document.getElementById('stDot').className='dot';document.getElementById('stTxt').textContent='정지';}
  else{
    var intv=+document.getElementById('cInterval').value||2;
    iv=setInterval(measure,intv*1000);measure();
    monRun=true;document.getElementById('btnMon').textContent='⏸ 정지';document.getElementById('btnMon').className='btn btn-danger';
    document.getElementById('stDot').className='dot dot--on';document.getElementById('stTxt').textContent='측정 중';
  }
}
function measure(){
  var mn=+document.getElementById('cMin').value,mx=+document.getElementById('cMax').value;
  var v=Math.round(rnd(mn,mx)*10)/10;
  vals.push(v);if(vals.length>60)vals.shift();
  exportLog.push({t:new Date().toLocaleTimeString('ko-KR'),v:v});
  document.getElementById('curVal').textContent=v;
  document.getElementById('curUnit').textContent=document.getElementById('cUnit').value;
  var pct=Math.max(0,Math.min(100,(v-mn)/(mx-mn)*100));
  var fill=document.getElementById('gFill');
  fill.style.width=pct+'%';fill.style.background=v>= +document.getElementById('cThresh').value?'var(--danger)':pct>60?'var(--warning)':'var(--accent)';
  document.getElementById('alarm').className='alarm'+(v>= +document.getElementById('cThresh').value?' show':'');
  var mn2=Math.min.apply(null,vals),mx2=Math.max.apply(null,vals),avg=vals.reduce(function(a,b){return a+b;},0)/vals.length;
  document.getElementById('sMin').textContent=mn2;document.getElementById('sMax').textContent=mx2;
  document.getElementById('sAvg').textContent=Math.round(avg*10)/10;document.getElementById('sCnt').textContent=vals.length;
  var sp=document.getElementById('spark');sp.innerHTML='';
  vals.slice(-20).forEach(function(val){
    var b=document.createElement('div');b.className='spark-bar';
    var h=Math.max(4,(val-mn)/(mx-mn)*56);b.style.height=h+'px';
    if(val>= +document.getElementById('cThresh').value)b.style.background='var(--danger)';
    sp.appendChild(b);
  });
}
function clearData(){vals=[];exportLog=[];document.getElementById('spark').innerHTML='';document.getElementById('curVal').textContent='—';['sMin','sMax','sAvg'].forEach(function(id){document.getElementById(id).textContent='—';});document.getElementById('sCnt').textContent=0;}
${hasCSV ? "function csvExport(){if(!exportLog.length){alert('데이터가 없습니다.');return;}var unit=document.getElementById('cUnit').value;var rows=['시각,'+document.getElementById('cName').value+'('+unit+')'];exportLog.forEach(function(d){rows.push(d.t+','+d.v);});var a=document.createElement('a');a.href='data:text/csv;charset=utf-8,\\uFEFF'+encodeURIComponent(rows.join('\\n'));a.download='sensor-log.csv';a.click();}" : ''}
</script>
</body></html>`;
}

// ─── 10. 실험 일지 ────────────────────────────────────────────────
export function tmpl_lab_diary(spec) {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
.entry-card{background:var(--surface);border-radius:8px;padding:14px;margin-bottom:10px;border:1px solid var(--border);cursor:pointer;}
.entry-card:hover{border-color:var(--accent);}
.entry-date{font-size:0.8rem;color:var(--muted);}
.entry-title{font-weight:700;margin:4px 0 2px;}
.entry-preview{font-size:0.85rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.side{width:240px;flex-shrink:0;}
.layout{display:flex;gap:16px;max-width:960px;margin:0 auto;}
.editor textarea{min-height:180px;}
@media(max-width:640px){.layout{flex-direction:column;}.side{width:100%;}}
</style></head><body>
<div class="app-header" style="max-width:960px"><div>
  <div class="app-title">📓 ${spec.name}</div>
  <div class="app-sub">${spec.purpose}</div>
</div></div>

<div class="layout">
  <div class="side">
    <div class="card" style="max-width:none">
      <div class="card-title">일지 목록</div>
      <input id="search" type="text" placeholder="검색..." oninput="renderList()" style="margin-bottom:10px">
      <div id="entryList"></div>
    </div>
  </div>
  <div style="flex:1">
    <div class="card editor" style="max-width:none">
      <div class="card-title" id="edTitle">새 일지 작성</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div><label>날짜</label><input type="date" id="fDate"></div>
        <div><label>분류/태그</label><input type="text" id="fTag" placeholder="예: 모터실험"></div>
      </div>
      <div style="margin-bottom:10px"><label>제목</label><input type="text" id="fTitle" placeholder="실험 제목"></div>
      <div style="margin-bottom:10px"><label>목적 / 조건</label><textarea id="fGoal" rows="3" placeholder="실험 목적 및 조건"></textarea></div>
      <div style="margin-bottom:10px"><label>과정 / 결과</label><textarea id="fResult" rows="5" placeholder="실험 과정 및 결과 기록"></textarea></div>
      <div style="margin-bottom:10px"><label>결론 / 비고</label><textarea id="fNote" rows="3" placeholder="결론 및 특이 사항"></textarea></div>
      <div class="btn-row">
        <button class="btn btn-success" onclick="saveEntry()">저장</button>
        <button class="btn btn-ghost" onclick="newEntry()">새 일지</button>
        <button class="btn btn-danger" id="delBtn" style="display:none" onclick="delEntry()">삭제</button>
      </div>
    </div>
  </div>
</div>

<script>
var KEY='labdiary',entries=JSON.parse(localStorage.getItem(KEY)||'[]'),curId=null;
function save(){localStorage.setItem(KEY,JSON.stringify(entries));}
function renderList(){
  var q=document.getElementById('search').value.toLowerCase();
  var el=document.getElementById('entryList');el.innerHTML='';
  var filtered=entries.filter(function(e){return !q||e.title.toLowerCase().includes(q)||e.tag.toLowerCase().includes(q)||e.date.includes(q);});
  filtered.sort(function(a,b){return b.date.localeCompare(a.date);});
  filtered.forEach(function(e){
    var d=document.createElement('div');d.className='entry-card';
    d.innerHTML='<div class="entry-date">'+e.date+(e.tag?' · <span style="color:var(--accent)">'+e.tag+'</span>':'')+'</div>'
      +'<div class="entry-title">'+e.title+'</div>'
      +'<div class="entry-preview">'+(e.result||e.goal||'')+'</div>';
    d.onclick=function(){loadEntry(e.id);};
    el.appendChild(d);
  });
  if(!filtered.length)el.innerHTML='<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:20px">일지 없음</div>';
}
function loadEntry(id){
  var e=entries.find(function(x){return x.id===id;});if(!e)return;
  curId=id;
  document.getElementById('fDate').value=e.date;document.getElementById('fTag').value=e.tag||'';
  document.getElementById('fTitle').value=e.title;document.getElementById('fGoal').value=e.goal||'';
  document.getElementById('fResult').value=e.result||'';document.getElementById('fNote').value=e.note||'';
  document.getElementById('edTitle').textContent='일지 수정';
  document.getElementById('delBtn').style.display='';
}
function saveEntry(){
  var d={id:curId||Date.now(),date:document.getElementById('fDate').value||new Date().toISOString().slice(0,10),
    tag:document.getElementById('fTag').value,title:document.getElementById('fTitle').value||'제목 없음',
    goal:document.getElementById('fGoal').value,result:document.getElementById('fResult').value,note:document.getElementById('fNote').value};
  if(curId){var idx=entries.findIndex(function(e){return e.id===curId;});if(idx>=0)entries[idx]=d;else entries.push(d);}
  else entries.push(d);
  curId=d.id;save();renderList();document.getElementById('edTitle').textContent='일지 수정';document.getElementById('delBtn').style.display='';
}
function newEntry(){curId=null;['fDate','fTag','fTitle','fGoal','fResult','fNote'].forEach(function(id){document.getElementById(id).value='';});document.getElementById('fDate').value=new Date().toISOString().slice(0,10);document.getElementById('edTitle').textContent='새 일지 작성';document.getElementById('delBtn').style.display='none';}
function delEntry(){if(!curId||!confirm('삭제할까요?'))return;entries=entries.filter(function(e){return e.id!==curId;});curId=null;save();renderList();newEntry();}
document.getElementById('fDate').value=new Date().toISOString().slice(0,10);
renderList();
</script>
</body></html>`;
}

// ─── 11. 비교/합불 판정 ────────────────────────────────────────────
export function tmpl_compare(spec) {
  const ans = _a(spec);
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
.result-big{font-size:3rem;font-weight:700;text-align:center;padding:24px 0;border-radius:10px;transition:background 0.3s;}
.result-big.ok{background:rgba(34,197,94,0.12);color:var(--success);}
.result-big.ng{background:rgba(239,68,68,0.12);color:var(--danger);}
.result-big.idle{background:var(--surface);color:var(--muted);}
</style></head><body>
<div class="app-header"><div>
  <div class="app-title">✅ ${spec.name}</div>
  <div class="app-sub">${spec.purpose}</div>
</div></div>

<div class="card">
  <div class="card-title">기준값 설정</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
    <div><label>기준값</label><input type="number" id="cRef" value="100" step="any"></div>
    <div><label>허용 오차 ±</label><input type="number" id="cTol" value="5" min="0" step="any"></div>
    <div><label>단위</label><input type="text" id="cUnit" value="mm"></div>
  </div>
</div>

<div class="card">
  <div class="card-title">측정값 입력</div>
  <div style="display:flex;gap:10px;align-items:flex-end">
    <div style="flex:1"><label>측정값</label><input type="number" id="mVal" step="any" placeholder="측정값 입력" onkeydown="if(event.key==='Enter')judge()"></div>
    <button class="btn" onclick="judge()" style="margin-bottom:0">판정</button>
  </div>
  <div class="result-big idle" id="result" style="margin-top:14px">—</div>
  <div id="detail" style="text-align:center;color:var(--muted);font-size:0.9rem;margin-top:8px"></div>
</div>

<div class="card">
  <div class="card-title">판정 이력 <span id="okRatio" style="color:var(--success)"></span></div>
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-value" id="sOk" style="color:var(--success)">0</div><div class="stat-label">합격</div></div>
    <div class="stat-box"><div class="stat-value" id="sNg" style="color:var(--danger)">0</div><div class="stat-label">불합격</div></div>
    <div class="stat-box"><div class="stat-value" id="sTotal">0</div><div class="stat-label">총 검사</div></div>
  </div>
  <table style="margin-top:12px">
    <thead><tr><th>#</th><th>측정값</th><th>기준</th><th>편차</th><th>판정</th></tr></thead>
    <tbody id="histBody"></tbody>
  </table>
  <div class="btn-row"><button class="btn btn-ghost" onclick="csvExport()">CSV 내보내기</button><button class="btn btn-danger" onclick="clearHist()">이력 초기화</button></div>
</div>

<script>
var KEY='compare_hist',hist=JSON.parse(localStorage.getItem(KEY)||'[]'),cnt=0;
function save(){localStorage.setItem(KEY,JSON.stringify(hist));}
function renderHist(){
  var tb=document.getElementById('histBody');tb.innerHTML='';
  var ok=hist.filter(function(h){return h.ok;}).length;
  hist.slice(0,50).forEach(function(h,i){
    var tr=document.createElement('tr');
    tr.innerHTML='<td>'+(hist.length-i)+'</td><td>'+h.val+' '+h.unit+'</td><td>'+h.ref+' ±'+h.tol+'</td>'
      +'<td style="color:'+(Math.abs(h.dev)<=h.tol?'var(--success)':'var(--danger)')+'">'+h.dev.toFixed(3)+'</td>'
      +'<td><span class="badge badge--'+(h.ok?'ok':'ng')+'">'+(h.ok?'합격':'불합격')+'</span></td>';
    tb.appendChild(tr);
  });
  document.getElementById('sOk').textContent=ok;document.getElementById('sNg').textContent=hist.length-ok;document.getElementById('sTotal').textContent=hist.length;
  document.getElementById('okRatio').textContent=hist.length?'합격률 '+Math.round(ok/hist.length*100)+'%':'';
}
function judge(){
  var v=parseFloat(document.getElementById('mVal').value);if(isNaN(v))return;
  var ref=+document.getElementById('cRef').value,tol=+document.getElementById('cTol').value,unit=document.getElementById('cUnit').value;
  var dev=v-ref,ok=Math.abs(dev)<=tol;
  var r=document.getElementById('result');r.textContent=ok?'합격 ✓':'불합격 ✗';r.className='result-big '+(ok?'ok':'ng');
  document.getElementById('detail').textContent='측정: '+v+' | 기준: '+ref+' ±'+tol+' | 편차: '+dev.toFixed(3)+' '+unit;
  hist.unshift({val:v,ref:ref,tol:tol,dev:dev,ok:ok,unit:unit,t:Date.now()});
  if(hist.length>200)hist.pop();save();renderHist();
}
function clearHist(){if(!confirm('이력을 초기화할까요?'))return;hist=[];save();renderHist();}
function csvExport(){
  var rows=['﻿번호,측정값,기준값,허용오차,편차,판정,시각'];
  hist.forEach(function(h,i){rows.push((i+1)+','+h.val+','+h.ref+','+h.tol+','+h.dev.toFixed(3)+','+(h.ok?'합격':'불합격')+','+new Date(h.t).toLocaleString('ko-KR'));});
  var a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(rows.join('\\n'));a.download='판정이력.csv';a.click();
}
renderHist();
</script>
</body></html>`;
}

// ─── 12. 실험 조건 관리 (레시피) ──────────────────────────────────
export function tmpl_recipe(spec) {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
.recipe-card{background:var(--surface);border-radius:8px;padding:12px 14px;margin-bottom:8px;border:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center;}
.recipe-card:hover{border-color:var(--accent);}
.recipe-card.active{border-color:var(--accent);background:rgba(108,99,255,0.1);}
.param-row{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:center;margin-bottom:6px;}
</style></head><body>
<div class="app-header"><div>
  <div class="app-title">🧪 ${spec.name}</div>
  <div class="app-sub">${spec.purpose}</div>
</div></div>

<div style="display:flex;gap:16px;max-width:960px;margin:0 auto;flex-wrap:wrap">
  <div style="flex:1;min-width:240px">
    <div class="card" style="max-width:none">
      <div class="card-title">저장된 레시피</div>
      <div id="recipeList"></div>
      <button class="btn btn-ghost" style="width:100%;margin-top:8px" onclick="newRecipe()">+ 새 레시피</button>
    </div>
  </div>
  <div style="flex:2;min-width:300px">
    <div class="card" style="max-width:none">
      <div class="card-title" id="edTitle">레시피 편집</div>
      <div style="margin-bottom:10px"><label>레시피 이름</label><input id="rName" type="text" placeholder="레시피 이름"></div>
      <div style="margin-bottom:10px"><label>설명</label><input id="rDesc" type="text" placeholder="간단한 설명"></div>
      <div class="card-title" style="margin:14px 0 8px">파라미터</div>
      <div id="params"></div>
      <button class="btn btn-ghost" onclick="addParam()" style="margin-bottom:14px">+ 파라미터 추가</button>
      <div class="btn-row">
        <button class="btn btn-success" onclick="saveRecipe()">저장</button>
        <button class="btn btn-ghost" onclick="copyRecipe()">복사</button>
        <button class="btn btn-danger" id="delBtn" style="display:none" onclick="delRecipe()">삭제</button>
      </div>
    </div>
  </div>
</div>

<script>
var KEY='recipes',recipes=JSON.parse(localStorage.getItem(KEY)||'[]'),curId=null;
function save(){localStorage.setItem(KEY,JSON.stringify(recipes));}

function renderList(){
  var el=document.getElementById('recipeList');el.innerHTML='';
  recipes.forEach(function(r){
    var d=document.createElement('div');d.className='recipe-card'+(r.id===curId?' active':'');
    d.innerHTML='<div><div style="font-weight:600">'+r.name+'</div><div style="font-size:0.8rem;color:var(--muted)">'+r.desc+'</div></div>'
      +'<div style="font-size:0.78rem;color:var(--muted)">파라미터 '+(r.params||[]).length+'개</div>';
    d.onclick=function(){loadRecipe(r.id);};el.appendChild(d);
  });
}
function renderParams(params){
  var el=document.getElementById('params');el.innerHTML='';
  (params||[]).forEach(function(p,i){
    var row=document.createElement('div');row.className='param-row';
    row.innerHTML='<input type="text" value="'+p.name+'" placeholder="파라미터명" oninput="updateParam('+i+',\\'name\\',this.value)">'
      +'<input type="text" value="'+p.value+'" placeholder="값" oninput="updateParam('+i+',\\'value\\',this.value)">'
      +'<button class="btn btn-danger" style="padding:8px 10px" onclick="removeParam('+i+')">✕</button>';
    el.appendChild(row);
  });
}
var curParams=[];
function updateParam(i,k,v){curParams[i][k]=v;}
function addParam(){curParams.push({name:'',value:''});renderParams(curParams);}
function removeParam(i){curParams.splice(i,1);renderParams(curParams);}

function loadRecipe(id){
  var r=recipes.find(function(x){return x.id===id;});if(!r)return;
  curId=id;curParams=JSON.parse(JSON.stringify(r.params||[]));
  document.getElementById('rName').value=r.name;document.getElementById('rDesc').value=r.desc||'';
  renderList();renderParams(curParams);document.getElementById('edTitle').textContent='레시피 수정';document.getElementById('delBtn').style.display='';
}
function saveRecipe(){
  var r={id:curId||Date.now(),name:document.getElementById('rName').value||'레시피',desc:document.getElementById('rDesc').value,params:JSON.parse(JSON.stringify(curParams))};
  if(curId){var idx=recipes.findIndex(function(x){return x.id===curId;});if(idx>=0)recipes[idx]=r;else recipes.push(r);}
  else recipes.push(r);
  curId=r.id;save();renderList();document.getElementById('delBtn').style.display='';
}
function newRecipe(){curId=null;curParams=[];document.getElementById('rName').value='';document.getElementById('rDesc').value='';renderParams([]);renderList();document.getElementById('edTitle').textContent='새 레시피';document.getElementById('delBtn').style.display='none';}
function copyRecipe(){var n={id:Date.now(),name:document.getElementById('rName').value+' (복사)',desc:document.getElementById('rDesc').value,params:JSON.parse(JSON.stringify(curParams))};recipes.push(n);curId=n.id;save();renderList();}
function delRecipe(){if(!confirm('삭제할까요?'))return;recipes=recipes.filter(function(r){return r.id!==curId;});curId=null;save();renderList();newRecipe();}
renderList();newRecipe();
</script>
</body></html>`;
}

// ─── 13. 결과 정리 / 보고서 ────────────────────────────────────────
export function tmpl_report(spec) {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
@media print{.no-print{display:none!important;} body{padding:0!important;} .card{box-shadow:none!important;border:1px solid #ccc!important;break-inside:avoid;}}
.section-add{display:flex;gap:8px;margin-bottom:8px;}
.report-section{border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:10px;position:relative;}
.section-label{font-size:0.8rem;color:var(--muted);margin-bottom:6px;}
</style></head><body>
<div class="app-header"><div>
  <div class="app-title">📄 ${spec.name}</div>
  <div class="app-sub">${spec.purpose}</div>
</div></div>

<div class="card no-print">
  <div class="card-title">기본 정보</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <div><label>보고서 제목</label><input id="rTitle" type="text" placeholder="제목 입력"></div>
    <div><label>날짜</label><input id="rDate" type="date"></div>
    <div><label>작성자</label><input id="rAuthor" type="text" placeholder="이름"></div>
    <div><label>소속/부서</label><input id="rDept" type="text" placeholder="소속"></div>
  </div>
</div>

<div class="card no-print">
  <div class="card-title">섹션 추가</div>
  <div class="section-add">
    <input id="secName" type="text" placeholder="섹션 이름 (예: 실험 결과)" style="flex:1">
    <select id="secType">
      <option value="text">텍스트</option>
      <option value="table">표</option>
      <option value="number">수치 목록</option>
    </select>
    <button class="btn" onclick="addSection()">+ 추가</button>
  </div>
</div>

<div id="sections"></div>

<div class="card no-print">
  <div class="btn-row">
    <button class="btn" onclick="saveReport()">저장</button>
    <button class="btn btn-ghost" onclick="loadReport()">불러오기</button>
    <button class="btn btn-success" onclick="window.print()">🖨️ 인쇄 / PDF</button>
  </div>
</div>

<script>
var KEY='report_data';
var secs=[];
document.getElementById('rDate').value=new Date().toISOString().slice(0,10);

function renderSections(){
  var el=document.getElementById('sections');el.innerHTML='';
  secs.forEach(function(s,i){
    var div=document.createElement('div');div.className='report-section';
    var del='<button class="btn btn-danger no-print" style="position:absolute;top:10px;right:10px;padding:4px 8px;font-size:0.75rem" onclick="removeSection('+i+')">✕</button>';
    if(s.type==='text'){
      div.innerHTML=del+'<div class="section-label">'+s.name+'</div><textarea rows="5" oninput="secs['+i+'].content=this.value" style="width:100%">'+( s.content||'')+'</textarea>';
    }else if(s.type==='table'){
      div.innerHTML=del+'<div class="section-label">'+s.name+'</div>'
        +'<textarea rows="6" placeholder="헤더1,헤더2,헤더3&#10;값1,값2,값3&#10;..." oninput="secs['+i+'].content=this.value;renderTable(this,'+i+')" style="width:100%;margin-bottom:8px" class="no-print">'+( s.content||'')+'</textarea>'
        +'<div id="tbl'+i+'"></div>';
      if(s.content)renderTableById(s.content,i);
    }else{
      div.innerHTML=del+'<div class="section-label">'+s.name+'</div><textarea rows="4" placeholder="항목: 값 (한 줄에 하나씩)&#10;예: 최대 토크: 2.5 N·m" oninput="secs['+i+'].content=this.value;renderNumList(this,'+i+')" style="width:100%;margin-bottom:8px" class="no-print">'+( s.content||'')+'</textarea>'
        +'<div id="nl'+i+'" class="stat-grid"></div>';
      if(s.content)renderNumListById(s.content,i);
    }
    el.appendChild(div);
  });
}
function renderTableById(txt,i){
  var el=document.getElementById('tbl'+i);if(!el)return;
  var rows=txt.trim().split('\\n').map(function(r){return r.split(',');});
  if(!rows.length)return;
  var html='<table><thead><tr>'+rows[0].map(function(c){return '<th>'+c.trim()+'</th>';}).join('')+'</tr></thead><tbody>';
  rows.slice(1).forEach(function(r){html+='<tr>'+r.map(function(c){return '<td>'+c.trim()+'</td>';}).join('')+'</tr>';});
  el.innerHTML=html+'</tbody></table>';
}
function renderNumListById(txt,i){
  var el=document.getElementById('nl'+i);if(!el)return;
  var lines=txt.trim().split('\\n').filter(function(l){return l.includes(':');});
  el.innerHTML=lines.map(function(l){var p=l.split(':');return '<div class="stat-box"><div class="stat-value" style="font-size:1rem">'+p[1].trim()+'</div><div class="stat-label">'+p[0].trim()+'</div></div>';}).join('');
}
function renderTable(el,i){renderTableById(el.value,i);}
function renderNumList(el,i){renderNumListById(el.value,i);}
function addSection(){var n=document.getElementById('secName').value.trim()||'섹션';var t=document.getElementById('secType').value;secs.push({name:n,type:t,content:''});renderSections();}
function removeSection(i){secs.splice(i,1);renderSections();}
function saveReport(){var d={title:document.getElementById('rTitle').value,date:document.getElementById('rDate').value,author:document.getElementById('rAuthor').value,dept:document.getElementById('rDept').value,secs:secs};localStorage.setItem(KEY,JSON.stringify(d));alert('저장되었습니다.');}
function loadReport(){var d=JSON.parse(localStorage.getItem(KEY)||'null');if(!d){alert('저장된 보고서가 없습니다.');return;}document.getElementById('rTitle').value=d.title||'';document.getElementById('rDate').value=d.date||'';document.getElementById('rAuthor').value=d.author||'';document.getElementById('rDept').value=d.dept||'';secs=d.secs||[];renderSections();}
</script>
</body></html>`;
}

// ─── 14. 데이터 분석 ──────────────────────────────────────────────
export function tmpl_data_analysis(spec) {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
.hist-bar-wrap{display:flex;align-items:flex-end;gap:2px;height:120px;margin:12px 0;}
.hist-bar{flex:1;background:var(--accent);border-radius:2px 2px 0 0;min-width:8px;position:relative;}
.hist-label{font-size:0.6rem;color:var(--muted);text-align:center;margin-top:2px;}
</style></head><body>
<div class="app-header"><div>
  <div class="app-title">📊 ${spec.name}</div>
  <div class="app-sub">${spec.purpose}</div>
</div></div>

<div class="card">
  <div class="card-title">데이터 입력</div>
  <div style="margin-bottom:8px"><label>숫자 데이터 붙여넣기 (쉼표, 탭, 줄바꿈으로 구분)</label>
  <textarea id="dataInput" rows="5" placeholder="예:&#10;1.2, 3.4, 5.6, 2.1, 4.5&#10;또는 CSV 열 하나를 복사해서 붙여넣기"></textarea></div>
  <div class="btn-row">
    <button class="btn" onclick="analyze()">📊 분석</button>
    <button class="btn btn-ghost" onclick="document.getElementById('dataInput').value=''">초기화</button>
  </div>
</div>

<div class="card" id="resultCard" style="display:none">
  <div class="card-title">분석 결과</div>
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-value" id="sN">0</div><div class="stat-label">데이터 수 (N)</div></div>
    <div class="stat-box"><div class="stat-value" id="sMean">—</div><div class="stat-label">평균</div></div>
    <div class="stat-box"><div class="stat-value" id="sStd">—</div><div class="stat-label">표준편차 (σ)</div></div>
    <div class="stat-box"><div class="stat-value" id="sMin">—</div><div class="stat-label">최솟값</div></div>
    <div class="stat-box"><div class="stat-value" id="sMax">—</div><div class="stat-label">최댓값</div></div>
    <div class="stat-box"><div class="stat-value" id="sMed">—</div><div class="stat-label">중앙값</div></div>
    <div class="stat-box"><div class="stat-value" id="sQ1">—</div><div class="stat-label">Q1 (25%)</div></div>
    <div class="stat-box"><div class="stat-value" id="sQ3">—</div><div class="stat-label">Q3 (75%)</div></div>
    <div class="stat-box"><div class="stat-value" id="sRng">—</div><div class="stat-label">범위</div></div>
  </div>
  <div class="card-title" style="margin-top:14px">분포 히스토그램</div>
  <div class="hist-bar-wrap" id="hist"></div>
  <div id="histLabels" style="display:flex;gap:2px;margin-top:2px"></div>
  <div class="card-title" style="margin-top:14px">데이터 미리보기</div>
  <div id="dataPreview" style="font-size:0.82rem;color:var(--muted);word-break:break-all;max-height:80px;overflow-y:auto"></div>
</div>

<script>
function r4(v){return Math.round(v*10000)/10000;}
function percentile(arr,p){var idx=(arr.length-1)*p/100,lo=Math.floor(idx),hi=Math.ceil(idx);return arr[lo]+(arr[hi]-arr[lo])*(idx-lo);}
function analyze(){
  var raw=document.getElementById('dataInput').value;
  var vals=raw.split(/[\\s,;\\t\\n]+/).map(function(s){return parseFloat(s);}).filter(function(v){return !isNaN(v);});
  if(!vals.length){alert('유효한 숫자 데이터가 없습니다.');return;}
  var n=vals.length,sum=vals.reduce(function(a,b){return a+b;},0),mean=sum/n;
  var variance=vals.reduce(function(a,b){return a+Math.pow(b-mean,2);},0)/n,std=Math.sqrt(variance);
  var sorted=vals.slice().sort(function(a,b){return a-b;});
  var mn=sorted[0],mx=sorted[n-1],med=percentile(sorted,50),q1=percentile(sorted,25),q3=percentile(sorted,75);

  document.getElementById('sN').textContent=n;document.getElementById('sMean').textContent=r4(mean);document.getElementById('sStd').textContent=r4(std);
  document.getElementById('sMin').textContent=r4(mn);document.getElementById('sMax').textContent=r4(mx);document.getElementById('sMed').textContent=r4(med);
  document.getElementById('sQ1').textContent=r4(q1);document.getElementById('sQ3').textContent=r4(q3);document.getElementById('sRng').textContent=r4(mx-mn);

  var bins=Math.min(20,Math.max(5,Math.ceil(Math.sqrt(n))));
  var step=(mx-mn||1)/bins,counts=Array(bins).fill(0);
  vals.forEach(function(v){var idx=Math.min(Math.floor((v-mn)/step),bins-1);counts[idx]++;});
  var maxC=Math.max.apply(null,counts);
  var histEl=document.getElementById('hist');histEl.innerHTML='';
  var lblEl=document.getElementById('histLabels');lblEl.innerHTML='';
  counts.forEach(function(c,i){
    var b=document.createElement('div');b.className='hist-bar';b.style.height=(c/maxC*110)+'px';
    b.title=r4(mn+i*step)+' ~ '+r4(mn+(i+1)*step)+': '+c+'개';histEl.appendChild(b);
    var lb=document.createElement('div');lb.className='hist-label';lb.style.flex='1';lb.style.minWidth='8px';lb.textContent=r4(mn+i*step);lblEl.appendChild(lb);
  });
  document.getElementById('dataPreview').textContent=vals.join(', ');
  document.getElementById('resultCard').style.display='';
}
</script>
</body></html>`;
}

// ─── 15. 스펙트럼 분석 ────────────────────────────────────────────
export function tmpl_spectrum(spec) {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${spec.name}</title>
<style>
.bar-chart{display:flex;align-items:flex-end;gap:1px;height:140px;background:var(--surface);border-radius:8px;padding:8px;overflow:hidden;}
.bar-item{flex:1;background:var(--accent);border-radius:1px 1px 0 0;min-width:2px;position:relative;}
.bar-item:hover{background:var(--accent-hover);}
</style></head><body>
<div class="app-header"><div>
  <div class="app-title">🌈 ${spec.name}</div>
  <div class="app-sub">${spec.purpose}</div>
</div></div>

<div class="card">
  <div class="card-title">신호 입력</div>
  <div style="margin-bottom:10px"><label>샘플 데이터 (쉼표 또는 줄바꿈 구분, 최대 1024개)</label>
  <textarea id="sigInput" rows="5" placeholder="예: 0,1,0,-1,0,1,0,-1 (반복 신호)&#10;또는 CSV에서 한 열 복사 붙여넣기"></textarea></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <div><label>샘플링 주파수 (Hz)</label><input id="fs" type="number" value="1000" min="1"></div>
    <div><label>표시할 피크 수</label><input id="peaks" type="number" value="5" min="1" max="20"></div>
  </div>
  <div class="btn-row">
    <button class="btn" onclick="doFFT()">🔍 FFT 분석</button>
    <button class="btn btn-ghost" onclick="genDemo()">데모 신호 생성</button>
  </div>
</div>

<div class="card" id="resultCard" style="display:none">
  <div class="card-title">주파수 스펙트럼 (진폭)</div>
  <div class="bar-chart" id="chart"></div>
  <div id="freqAxis" style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--muted);margin-top:4px;padding:0 8px"></div>
  <div class="card-title" style="margin-top:14px">주요 피크 주파수</div>
  <table>
    <thead><tr><th>순위</th><th>주파수 (Hz)</th><th>진폭</th><th>비율</th></tr></thead>
    <tbody id="peakBody"></tbody>
  </table>
</div>

<script>
function dft(x){
  var n=x.length,re=new Array(n).fill(0),im=new Array(n).fill(0);
  for(var k=0;k<n/2;k++){for(var t=0;t<n;t++){var a=2*Math.PI*k*t/n;re[k]+=x[t]*Math.cos(a);im[k]-=x[t]*Math.sin(a);}}
  var mag=[];for(var k=0;k<n/2;k++)mag.push(Math.sqrt(re[k]*re[k]+im[k]*im[k])/n*2);return mag;
}
function r2(v){return Math.round(v*100)/100;}

function doFFT(){
  var raw=document.getElementById('sigInput').value;
  var x=raw.split(/[\\s,;\\t\\n]+/).map(parseFloat).filter(function(v){return !isNaN(v);});
  if(x.length<8){alert('최소 8개 이상의 데이터가 필요합니다.');return;}
  var n=Math.min(x.length,1024);x=x.slice(0,n);
  var mag=dft(x);
  var fs=+document.getElementById('fs').value||1000;
  var maxM=Math.max.apply(null,mag);
  var chart=document.getElementById('chart');chart.innerHTML='';
  mag.forEach(function(m){var b=document.createElement('div');b.className='bar-item';b.style.height=Math.max(1,m/maxM*130)+'px';b.title=r2(m);chart.appendChild(b);});
  var fa=document.getElementById('freqAxis');fa.innerHTML='';
  [0,0.25,0.5,0.75,1].forEach(function(p){var sp=document.createElement('span');sp.textContent=r2(p*fs/2)+'Hz';fa.appendChild(sp);});

  var indexed=mag.map(function(m,i){return {f:i*(fs/n),m:m};}).filter(function(x){return x.f>0;});
  indexed.sort(function(a,b){return b.m-a.m;});
  var pk=+document.getElementById('peaks').value||5;
  var tb=document.getElementById('peakBody');tb.innerHTML='';
  indexed.slice(0,pk).forEach(function(p,i){
    var tr=document.createElement('tr');
    tr.innerHTML='<td>'+(i+1)+'</td><td style="color:var(--accent);font-weight:700">'+r2(p.f)+' Hz</td><td>'+r2(p.m)+'</td><td>'+Math.round(p.m/maxM*100)+'%</td>';
    tb.appendChild(tr);
  });
  document.getElementById('resultCard').style.display='';
}

function genDemo(){
  var fs=+document.getElementById('fs').value||1000,n=256;
  var sig=[];for(var t=0;t<n;t++){sig.push(Math.sin(2*Math.PI*50*t/fs)+0.5*Math.sin(2*Math.PI*120*t/fs)+0.1*(Math.random()*2-1));}
  document.getElementById('sigInput').value=sig.map(function(v){return Math.round(v*1000)/1000;}).join(',');
}
</script>
</body></html>`;
}

// ─── TEMPLATE MAP ─────────────────────────────────────────────────
export const TEMPLATE_MAP = {
  motor_transfer: tmpl_motor_transfer,
  motor_rotation: tmpl_motor_rotation,
  sensor:         tmpl_sensor,
  process_timer:  tmpl_process_timer,
  data_record:    tmpl_data_record,
  inventory:      tmpl_inventory,
  lab_diary:      tmpl_lab_diary,
  calculator:     tmpl_calculator,
  data_analysis:  tmpl_data_analysis,
  spectrum:       tmpl_spectrum,
  unit_convert:   tmpl_unit_convert,
  compare:        tmpl_compare,
  recipe:         tmpl_recipe,
  report:         tmpl_report,
  stopwatch:      tmpl_stopwatch,
};
