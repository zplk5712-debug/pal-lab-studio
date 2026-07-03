import { useState } from "react";
import { TEMPLATE_MAP, wrapTemplate, TYPE_META } from "./programTemplates";

// ── CSS injected into generated HTML files ──────────────────────────────────
const BASE_CSS = `
  :root {
    --bg: #0f1117;
    --surface: #1a1d27;
    --card: #21253a;
    --border: rgba(255,255,255,0.08);
    --accent: #6c63ff;
    --accent-hover: #5a52e0;
    --success: #22c55e;
    --warning: #f59e0b;
    --danger: #ef4444;
    --text: #e8eaf0;
    --muted: #7b7f93;
    --radius: 12px;
    --shadow: 0 4px 24px rgba(0,0,0,0.4);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    padding: 24px 16px;
  }
  .app-header { max-width: 720px; margin: 0 auto 24px; display: flex; align-items: center; gap: 12px; }
  .app-title { font-size: 1.4rem; font-weight: 700; letter-spacing: -0.3px; }
  .app-sub { font-size: 0.82rem; color: var(--muted); margin-top: 2px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; max-width: 720px; margin: 0 auto 16px; box-shadow: var(--shadow); }
  .card-title { font-size: 0.78rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 14px; }
  label { display: block; font-size: 0.85rem; color: var(--muted); margin-bottom: 6px; margin-top: 14px; }
  label:first-of-type { margin-top: 0; }
  input[type=text], input[type=number], select, textarea { width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.95rem; outline: none; transition: border-color 0.15s; }
  input:focus, select:focus, textarea:focus { border-color: var(--accent); }
  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-size: 0.92rem; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s; }
  .btn:hover { background: var(--accent-hover); transform: translateY(-1px); }
  .btn:active { transform: translateY(0); }
  .btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--muted); }
  .btn-ghost:hover { border-color: var(--accent); color: var(--text); background: transparent; }
  .btn-success { background: var(--success); }
  .btn-success:hover { background: #16a34a; }
  .btn-danger { background: var(--danger); }
  .btn-danger:hover { background: #dc2626; }
  .btn-row { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin: 16px 0; }
  .stat-box { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; text-align: center; }
  .stat-value { font-size: 1.6rem; font-weight: 700; color: var(--accent); line-height: 1; }
  .stat-label { font-size: 0.75rem; color: var(--muted); margin-top: 4px; }
  .status-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--surface); border-radius: 8px; font-size: 0.85rem; color: var(--muted); margin-top: 14px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); flex-shrink: 0; }
  .dot--on { background: var(--success); box-shadow: 0 0 6px var(--success); }
  .dot--warn { background: var(--warning); box-shadow: 0 0 6px var(--warning); }
  .dot--off { background: var(--danger); }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  th { text-align: left; padding: 8px 10px; color: var(--muted); font-weight: 600; border-bottom: 1px solid var(--border); font-size: 0.78rem; text-transform: uppercase; }
  td { padding: 10px 10px; border-bottom: 1px solid var(--border); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,0.03); }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
  .badge--ok { background: rgba(34,197,94,0.15); color: var(--success); }
  .badge--warn { background: rgba(245,158,11,0.15); color: var(--warning); }
  .badge--ng { background: rgba(239,68,68,0.15); color: var(--danger); }
  progress { width: 100%; height: 8px; border-radius: 4px; overflow: hidden; appearance: none; }
  progress::-webkit-progress-bar { background: var(--surface); border-radius: 4px; }
  progress::-webkit-progress-value { background: var(--accent); border-radius: 4px; transition: width 0.3s; }
  .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); align-items:center; justify-content:center; z-index:1000; }
  .modal.open { display:flex; }
  .modal-box { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:28px; min-width:320px; max-width:480px; width:90%; }
  .modal-title { font-size:1.1rem; font-weight:700; margin-bottom:20px; }
  .warn-row td { color: var(--warning); }
  .danger-row td { color: var(--danger); }`;

function injectBaseCSS(html) {
  if (html.includes('id="base-ui"') || html.includes("id='base-ui'")) return html;
  const styleTag = `<style id="base-ui">${BASE_CSS}</style>`;
  if (html.includes("<head>")) return html.replace("<head>", `<head>\n${styleTag}`);
  if (html.includes("<HEAD>")) return html.replace("<HEAD>", `<HEAD>\n${styleTag}`);
  return styleTag + "\n" + html;
}

function injectInstructions(html, spec) {
  const date = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const tid = spec._typeId || "";
  const meta = TYPE_META[tid] || {};
  const isSeed = !!meta.seed;
  const limLines = (meta.limits  || ["브라우저 내에서만 동작"]).map(l => `  ✗ ${l}`).join("\n");
  const n1Lines  = (meta.nexts1  || []).map(n => `  → ${n}`).join("\n");
  const n2Lines  = (meta.nexts2  || []).map(n => `  → ${n}`).join("\n");
  const n3Lines  = (meta.nexts3  || []).map(n => `  → ${n}`).join("\n");
  const p1 = meta.prompt1 || "이 HTML에 기능을 추가해줘. 단일 HTML 파일로 유지해줘.";
  const p2 = meta.prompt2 || "이 HTML 스펙으로 완성형 프로그램을 HTML/CSS/JS/server.js로 분리해서 만들어줘.";
  const p3 = meta.prompt3 || "고급 기능까지 포함한 완성형 프로그램을 만들어줘.";
  const protoNote = `\n━━━━━━━━ 안내 ━━━━━━━━\n  이 프로그램은 완성된 최종본이 아니라 프로토타입입니다.\n  실제 서버 연동·데이터 영구 저장·하드웨어 제어 등은 아래 AI 도구로\n  대화만으로 완성할 수 있어요!\n`;
  const comment = `<!--
╔══════════════════════════════════════════════════════════╗
║               프로그램 설계소                            ║
╚══════════════════════════════════════════════════════════╝

[ 프로그램 정보 ]
  프로그램명 : ${spec.name}
  유형       : ${spec._type || ""}
  목적       : ${spec.purpose}
  생성일     : ${date}

[ 현재 기능 ]
${spec._detail || ""}

[ 현재 한계점 ]
${limLines}
${protoNote}
[ 업그레이드 명령어 — Claude / ChatGPT 대화창에 이 파일을 업로드하고 아래 명령어를 복사해서 전송하세요 ]

  🥇 1단계 — 지금 바로 개선 가능 (추가 설치 없이 AI 대화만으로):
${n1Lines}
  명령어: "${p1}"

  🥈 2단계 — 서버 기반 완성 프로그램 (파일 분리 + 실제 데이터 저장):
${n2Lines}
  명령어: "${p2}"

  🥉 3단계 — 하드웨어·고급 연동 (실제 장비 연결):
${n3Lines}
  명령어: "${p3}"

[ 하드웨어 확장 고려사항 ]
${isSeed ? `  실제 장비 연동 시 아래 프로토콜 중 선택:\n  - Modbus RTU / Modbus TCP (산업용 모터·PLC)\n  - EtherCAT (고속 다축 제어)\n  - 시리얼 통신 RS-232 / RS-485\n  - 엔코더 피드백 연동 가능` : `  서버 연동이 필요하면 Node.js + SQLite / PostgreSQL을 권장합니다.`}

[ 재생성 규칙 ]
  - 한국어 UI 유지
  - 파일 분리 권장: HTML / CSS / JS / 서버(server.js 또는 server.py)
  - 단일 파일 유지 시: <style id="base-ui"> 블록 수정 금지
══════════════════════════════════════════════════════════-->
`;
  if (html.startsWith("<!DOCTYPE") || html.startsWith("<!doctype")) {
    return html.replace(/^(<!DOCTYPE[^>]*>)/i, `$1\n${comment}`);
  }
  return comment + html;
}

function htmlFileName(name) {
  return (name.replace(/[^a-z0-9가-힣A-Z]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "my-program") + ".html";
}

function downloadHtml(filename, content) {
  const blob = new Blob([content], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Program types ────────────────────────────────────────────────────────────
const PROGRAM_TYPES = [
  { id: "motor_transfer", label: "모터 이송",       icon: "↔️",  desc: "수평·수직 이송, 왕복 동작",    seed: true },
  { id: "motor_rotation", label: "모터 회전",       icon: "🔄",  desc: "회전 제어, 속도 조절",          seed: true },
  { id: "sensor",         label: "센서 측정",       icon: "📡",  desc: "온도·진동·압력 모니터링",       seed: true },
  { id: "process_timer",  label: "공정 타이머",     icon: "⏱️",  desc: "순서 자동화, 단계별 공정" },
  { id: "data_record",    label: "데이터 기록",     icon: "📋",  desc: "관리 대장, 작업 이력" },
  { id: "inventory",      label: "재고/부품 관리",  icon: "🗃️",  desc: "부품·소모품 재고 추적" },
  { id: "lab_diary",      label: "실험 일지",       icon: "📓",  desc: "날짜별 실험 기록·조회" },
  { id: "calculator",     label: "계산기",          icon: "🔢",  desc: "공식·수식 계산" },
  { id: "data_analysis",  label: "데이터 분석",     icon: "📊",  desc: "통계, FFT, 그래프 해석" },
  { id: "spectrum",       label: "스펙트럼 분석",   icon: "🌈",  desc: "신호·분광 데이터 분석" },
  { id: "unit_convert",   label: "단위 변환",       icon: "⚖️",  desc: "물리 단위·좌표계 변환" },
  { id: "compare",        label: "비교/검증",       icon: "✅",  desc: "합불 판정, 기준값 비교" },
  { id: "recipe",         label: "실험 조건 관리",  icon: "🧪",  desc: "레시피 저장·불러오기" },
  { id: "report",         label: "결과 정리",       icon: "📄",  desc: "리포트, 보고서, 출력" },
  { id: "stopwatch",      label: "타이머/스톱워치", icon: "⏱️",  desc: "카운트다운·스톱워치" },
];

// ── Questions per type ───────────────────────────────────────────────────────
// multi: true  → 여러 개 선택 가능 (체크박스 방식, 다음 버튼으로 진행)
// type:"input" → 텍스트 직접 입력
// (기본)       → 하나만 선택, 선택 즉시 다음으로 이동
const TYPE_QUESTIONS = {
  motor_transfer: [
    { id: "direction", text: "이송 방향을 모두 선택해주세요", icon: "🔧", multi: true,
      choices: ["수평 이송 (좌우)", "수직 이송 (상하)", "회전 포함", "다축 동시 이송"] },
    { id: "distance",  text: "이송 거리가 얼마나 되나요?", icon: "📏", type: "input", placeholder: "예: 500mm" },
    { id: "speed",     text: "이송 속도 조건을 골라주세요", icon: "⚡", multi: true,
      choices: ["저속 정밀 이동", "고속 이송", "속도 가변 (단계별)", "빠른 이동 후 저속 정지"] },
    { id: "motion",    text: "동작 방식을 모두 선택해주세요", icon: "↔️", multi: true,
      choices: ["단방향 이동", "왕복 운동", "다단계 정지 (중간 정지점)", "목표 위치 지정 이동"] },
    { id: "sensor",    text: "필요한 센서를 모두 골라주세요", icon: "📡", multi: true,
      choices: ["리미트 센서 (끝단 감지)", "원점 복귀 센서", "위치 피드백 (엔코더)", "과부하 감지", "센서 없음"] },
    { id: "control",   text: "필요한 제어 기능을 골라주세요", icon: "🎛️", multi: true,
      choices: ["비상정지 버튼", "일시정지 / 재개", "수동 조그 이동 (미세 조정)", "속도 슬라이더", "방향 전환 버튼"] },
    { id: "accel",     text: "이동 프로파일은?", icon: "🎚️", multi: true,
      choices: ["가속 / 감속 (부드럽게)", "즉시 출발·정지", "목표 위치 도달 확인 표시"] },
    { id: "repeat",    text: "반복 동작 방식은?", icon: "🔁", multi: true,
      choices: ["한 번만", "횟수 지정 반복", "연속 반복 (수동 정지)", "조건 충족 시 반복"] },
    { id: "display",   text: "화면에 표시할 정보를 골라주세요", icon: "🖥️", multi: true,
      choices: ["현재 위치", "남은 거리", "현재 속도", "동작 상태", "완료 횟수", "오류 메시지"] },
    { id: "log",       text: "기록 / 저장 기능이 필요한가요?", icon: "💾", multi: true,
      choices: ["동작 이력 저장", "오류 로그 기록", "위치 데이터 CSV 내보내기", "필요 없음"] },
  ],
  motor_rotation: [
    { id: "speed",     text: "회전 속도를 입력해주세요", icon: "⚙️", type: "input", placeholder: "예: 1회전에 3초, 또는 100 RPM" },
    { id: "direction", text: "회전 방향 기능을 골라주세요", icon: "🔄", multi: true,
      choices: ["한 방향만", "정역 전환 가능", "각도 지정 회전", "인덱싱 (일정 각도씩)"] },
    { id: "stop",      text: "정지 조건을 모두 골라주세요", icon: "🛑", multi: true,
      choices: ["시간 지정", "횟수 지정", "각도 도달 시", "버튼으로 수동 정지", "과부하 감지 시 자동 정지"] },
    { id: "control",   text: "필요한 제어 기능을 골라주세요", icon: "🎛️", multi: true,
      choices: ["비상정지 버튼", "일시정지 / 재개", "속도 슬라이더", "토크 제한 설정", "원점 복귀"] },
    { id: "accel",     text: "가속 / 감속 방식은?", icon: "🎚️", multi: true,
      choices: ["부드럽게 가속 / 감속", "즉시 출발 / 정지", "S커브 프로파일"] },
    { id: "repeat",    text: "반복 방식은?", icon: "🔁", multi: true,
      choices: ["한 번만", "횟수 지정 반복", "연속 반복", "주기적 반복 (인터벌)"] },
    { id: "display",   text: "화면에 표시할 정보를 골라주세요", icon: "🖥️", multi: true,
      choices: ["현재 RPM / 속도", "회전 각도", "동작 상태", "완료 횟수", "경과 시간"] },
    { id: "log",       text: "기록 기능이 필요한가요?", icon: "💾", multi: true,
      choices: ["회전 이력 저장", "속도 / 각도 로그", "CSV 내보내기", "필요 없음"] },
  ],
  sensor: [
    { id: "target",    text: "측정할 대상을 모두 골라주세요", icon: "📡", multi: true,
      choices: ["온도", "습도", "진동 / 가속도", "소음", "압력", "유량", "위치 / 거리", "전압 / 전류"] },
    { id: "channel",   text: "채널 구성은?", icon: "🔌", multi: true,
      choices: ["단일 채널 (1개)", "2채널 동시 측정", "4채널 이상", "채널 이름 직접 입력"] },
    { id: "realtime",  text: "표시 방식을 골라주세요", icon: "📺", multi: true,
      choices: ["실시간 숫자 표시", "게이지 / 미터", "실시간 그래프", "트렌드 라인"] },
    { id: "interval",  text: "샘플링 / 갱신 주기는?", icon: "⏱️", multi: true,
      choices: ["매 0.5초", "매 1초", "매 5초", "사용자가 직접 설정"] },
    { id: "alert",     text: "경고 기능이 필요한가요?", icon: "🚨", multi: true,
      choices: ["상한 초과 경고", "하한 미달 경고", "변화율 급변 경고", "소리 알림", "화면 색상 변경", "필요 없음"] },
    { id: "graph",     text: "그래프 옵션을 골라주세요", icon: "📈", multi: true,
      choices: ["실시간 라인 그래프", "히스토그램", "최대 / 최소 표시", "기준선 표시", "그래프 불필요"] },
    { id: "save",      text: "기록 / 저장 기능은?", icon: "💾", multi: true,
      choices: ["자동 저장 (주기적)", "버튼 눌러서 저장", "CSV 내보내기", "타임스탬프 포함", "필요 없음"] },
    { id: "extra",     text: "추가 기능이 필요한가요?", icon: "✨", multi: true,
      choices: ["통계 (평균·최대·최소)", "이동 평균 필터", "보정값 (오프셋) 설정", "멀티 채널 비교", "없음"] },
  ],
  process_timer: [
    { id: "steps",     text: "공정 단계 수는?", icon: "🔢",
      choices: ["2~3단계 (간단)", "4~6단계 (중간)", "7단계 이상 (복잡)"] },
    { id: "step_cfg",  text: "각 단계 설정 항목을 골라주세요", icon: "⚙️", multi: true,
      choices: ["단계 이름 입력", "시간 직접 입력", "단계 설명 입력", "색상 구분", "담당자 지정"] },
    { id: "flow",      text: "단계 진행 방식은?", icon: "⏭️", multi: true,
      choices: ["시간 완료 시 자동 진행", "버튼 눌러야 다음 단계", "조건 충족 시 진행", "병렬 단계 동시 진행"] },
    { id: "control",   text: "제어 기능을 골라주세요", icon: "🎛️", multi: true,
      choices: ["일시정지 / 재개", "현재 단계 리셋", "전체 리셋", "단계 건너뛰기", "비상정지"] },
    { id: "repeat",    text: "반복 방식은?", icon: "🔁", multi: true,
      choices: ["한 번만", "횟수 지정 반복", "연속 반복 (수동 정지)", "특정 단계만 반복"] },
    { id: "alert",     text: "알림 기능이 필요한가요?", icon: "🔔", multi: true,
      choices: ["단계 완료 알림", "전체 공정 완료 알림", "시간 초과 경고", "소리 알림", "필요 없음"] },
    { id: "display",   text: "화면에 표시할 정보를 골라주세요", icon: "🖥️", multi: true,
      choices: ["현재 단계 표시", "남은 시간", "전체 진행률 (프로그레스바)", "완료된 단계 목록", "경과 시간"] },
    { id: "log",       text: "기록 기능이 필요한가요?", icon: "💾", multi: true,
      choices: ["공정 이력 저장", "단계별 실제 소요 시간", "파일로 저장", "필요 없음"] },
  ],
  data_record: [
    { id: "target",    text: "무엇을 기록하나요? 모두 골라주세요", icon: "📋", multi: true,
      choices: ["장비 / 설비 관리", "작업 이력 · 일지", "측정값 기록", "불량 / 이상 기록", "유지보수 이력", "재료 사용 기록"] },
    { id: "fields",    text: "기록할 항목을 골라주세요", icon: "📝", multi: true,
      choices: ["날짜 / 시간 (자동)", "작업자 / 담당자", "장비명 / 품목명", "수량 / 값", "상태 (정상 / 불량)", "메모 / 비고", "사진 첨부"] },
    { id: "input",     text: "입력 방식을 골라주세요", icon: "✏️", multi: true,
      choices: ["직접 텍스트 입력", "드롭다운 선택", "체크박스", "날짜 피커", "숫자 입력"] },
    { id: "manage",    text: "관리 기능을 골라주세요", icon: "🗂️", multi: true,
      choices: ["저장 / 불러오기", "기록 수정", "기록 삭제", "복사 / 복제"] },
    { id: "search",    text: "검색 / 필터 기능이 필요한가요?", icon: "🔍", multi: true,
      choices: ["날짜 범위 검색", "키워드 검색", "상태 필터", "담당자 필터", "필요 없음"] },
    { id: "stats",     text: "통계 기능이 필요한가요?", icon: "📊", multi: true,
      choices: ["건수 집계", "기간별 통계", "그래프 시각화", "요약 대시보드", "필요 없음"] },
    { id: "export",    text: "출력 / 내보내기 기능은?", icon: "🖨️", multi: true,
      choices: ["인쇄 (프린트)", "CSV 내보내기", "보고서 형태 출력", "필요 없음"] },
  ],
  inventory: [
    { id: "target",    text: "관리할 대상을 모두 골라주세요", icon: "🗃️", multi: true,
      choices: ["소모품 (나사·패킹 등)", "부품 / 교체 부품", "장비 / 기기", "공구 / 치공구", "원자재 / 재료"] },
    { id: "fields",    text: "관리할 항목을 골라주세요", icon: "📝", multi: true,
      choices: ["품번 / 코드", "품명 / 규격", "현재 수량", "보관 위치", "단가 / 금액", "공급업체", "최소 재고량", "유효기간"] },
    { id: "transaction", text: "트랜잭션 기능을 골라주세요", icon: "🔄", multi: true,
      choices: ["입고 처리", "출고 처리", "재고 조정", "위치 이동 기록"] },
    { id: "alert",     text: "알림 기능이 필요한가요?", icon: "⚠️", multi: true,
      choices: ["재고 부족 경고 (최소 재고 이하)", "유통기한 / 점검 기한 경고", "재고 0 표시", "필요 없음"] },
    { id: "search",    text: "검색 / 필터는?", icon: "🔍", multi: true,
      choices: ["품번 / 이름 검색", "위치 검색", "카테고리 필터", "재고 부족만 보기", "필요 없음"] },
    { id: "history",   text: "이력 관리가 필요한가요?", icon: "📋", multi: true,
      choices: ["입출고 이력 전체 보기", "날짜별 이력", "담당자별 이력", "필요 없음"] },
    { id: "export",    text: "출력 / 내보내기 기능은?", icon: "🖨️", multi: true,
      choices: ["재고 현황 인쇄", "CSV 내보내기", "발주 목록 출력", "필요 없음"] },
  ],
  lab_diary: [
    { id: "fields",    text: "기록할 항목을 모두 골라주세요", icon: "📓", multi: true,
      choices: ["날짜 / 시간", "실험자 / 작성자", "실험 조건 (온도·압력 등)", "실험 결과", "분석 / 해석", "다음 계획", "메모 / 특이사항", "사진 첨부"] },
    { id: "manage",    text: "관리 기능을 골라주세요", icon: "🗂️", multi: true,
      choices: ["저장 / 불러오기", "기록 수정", "기록 삭제", "복사 / 템플릿화", "태그 분류"] },
    { id: "search",    text: "검색 / 필터 기능이 필요한가요?", icon: "🔍", multi: true,
      choices: ["날짜 범위 검색", "키워드 검색", "실험자 검색", "조건값 필터", "필요 없음"] },
    { id: "view",      text: "화면 표시 방식은?", icon: "👁️", multi: true,
      choices: ["목록형 (테이블)", "카드형", "달력형 (날짜별)", "상세 보기"] },
    { id: "stats",     text: "통계 기능이 필요한가요?", icon: "📊", multi: true,
      choices: ["실험 횟수 집계", "성공 / 실패율", "기간별 통계", "그래프 시각화", "필요 없음"] },
    { id: "export",    text: "출력 / 내보내기 기능은?", icon: "🖨️", multi: true,
      choices: ["인쇄", "CSV 내보내기", "보고서 형태", "필요 없음"] },
  ],
  calculator: [
    { id: "purpose",   text: "어떤 계산이 필요한가요? 짧게 적어주세요", icon: "🔢", type: "input", placeholder: "예: 모터 토크 계산, 열전달 계산, 보 처짐 계산" },
    { id: "vars",      text: "입력 변수 수는 대략 얼마나 되나요?", icon: "📥",
      choices: ["2~3개 (간단)", "4~6개 (중간)", "7개 이상 (복잡)"] },
    { id: "method",    text: "계산 방식을 골라주세요", icon: "⚙️", multi: true,
      choices: ["단일 공식 계산", "단계별 순서 계산", "조건 분기 계산 (if/else)", "반복 계산 (루프)", "표 조회 (룩업 테이블)"] },
    { id: "display",   text: "결과 표시 방식을 골라주세요", icon: "📊", multi: true,
      choices: ["최종 결과만", "중간 계산값 표시", "수식 / 공식 설명", "단위 자동 표시", "합격 / 불합격 판정"] },
    { id: "extra",     text: "추가 기능이 필요한가요?", icon: "✨", multi: true,
      choices: ["결과 저장 / 불러오기", "여러 케이스 비교", "그래프로 시각화", "결과 복사 버튼", "단위 자동 변환", "없음"] },
    { id: "input_help", text: "입력 도움 기능이 필요한가요?", icon: "💡", multi: true,
      choices: ["입력 범위 검증 (경고)", "기본값 제공", "힌트 / 설명 표시", "없음"] },
  ],
  data_analysis: [
    { id: "input",     text: "데이터 입력 방식을 골라주세요", icon: "📥", multi: true,
      choices: ["CSV 파일 불러오기", "엑셀 파일 붙여넣기", "직접 숫자 입력", "텍스트 붙여넣기"] },
    { id: "method",    text: "필요한 분석 방법을 모두 골라주세요", icon: "🔢", multi: true,
      choices: ["기초 통계 (평균·최대·최소·표준편차)", "FFT 주파수 분석", "트렌드 분석 (회귀)", "이상값 탐지", "상관 분석", "이동 평균"] },
    { id: "stats",     text: "통계 항목을 골라주세요", icon: "📐", multi: true,
      choices: ["평균 / 중앙값", "최대 / 최솟값", "표준편차 / 분산", "분위수 (25·75%)", "상관계수", "필요 없음"] },
    { id: "process",   text: "데이터 처리 기능이 필요한가요?", icon: "⚙️", multi: true,
      choices: ["이상값 제거 / 표시", "이동 평균 필터", "노이즈 제거", "데이터 정규화", "없음"] },
    { id: "graph",     text: "시각화 방식을 골라주세요", icon: "📈", multi: true,
      choices: ["시계열 라인 그래프", "히스토그램", "산점도 (X-Y 플롯)", "박스 플롯", "FFT 스펙트럼 그래프", "없음"] },
    { id: "export",    text: "결과 저장 / 출력이 필요한가요?", icon: "💾", multi: true,
      choices: ["분석 결과 CSV 저장", "그래프 이미지 저장", "보고서 출력", "필요 없음"] },
  ],
  spectrum: [
    { id: "input",     text: "데이터 형식을 골라주세요", icon: "📥", multi: true,
      choices: ["CSV 파일", "텍스트 파일", "직접 숫자 입력", "붙여넣기"] },
    { id: "display",   text: "표시 방식을 골라주세요", icon: "🌈", multi: true,
      choices: ["파장 vs 강도 그래프", "주파수 스펙트럼", "3D 표면 플롯", "워터폴 차트"] },
    { id: "analysis",  text: "분석 기능을 골라주세요", icon: "🔬", multi: true,
      choices: ["피크 자동 탐색", "수동 마커 추가", "배경 제거 (베이스라인)", "데이터 정규화", "평균화 / 스무딩"] },
    { id: "compare",   text: "비교 기능이 필요한가요?", icon: "⚖️", multi: true,
      choices: ["기준 스펙트럼과 비교", "여러 데이터 오버레이", "차분 계산", "필요 없음"] },
    { id: "export",    text: "출력 / 저장이 필요한가요?", icon: "💾", multi: true,
      choices: ["피크 목록 CSV 저장", "그래프 이미지 저장", "보고서 출력", "필요 없음"] },
  ],
  unit_convert: [
    { id: "type",      text: "변환이 필요한 단위를 모두 골라주세요", icon: "⚖️", multi: true,
      choices: ["길이 (mm ↔ inch 등)", "질량 / 무게 (kg ↔ lb 등)", "힘 (N ↔ kgf ↔ lbf)", "토크 (N·m ↔ kgf·cm)", "압력 (Pa ↔ bar ↔ psi)", "온도 (℃ ↔ ℉ ↔ K)", "속도 (m/s ↔ rpm 등)", "각도 (° ↔ rad ↔ rev)"] },
    { id: "extra",     text: "추가 변환이 필요한가요?", icon: "🔄", multi: true,
      choices: ["좌표계 변환 (직교 ↔ 극)", "데이터 형식 변환 (진수)", "전력 (W ↔ HP)", "없음"] },
    { id: "batch",     text: "입력 방식은?", icon: "📋", multi: true,
      choices: ["하나씩 개별 변환", "목록 일괄 변환", "수식 직접 입력"] },
    { id: "save",      text: "저장 기능이 필요한가요?", icon: "💾", multi: true,
      choices: ["자주 쓰는 변환 즐겨찾기", "변환 이력 보기", "필요 없음"] },
    { id: "extra_ui",  text: "표시 옵션을 골라주세요", icon: "🖥️", multi: true,
      choices: ["변환 공식 표시", "단위 설명 / 정의", "소수점 자릿수 설정", "복사 버튼"] },
  ],
  compare: [
    { id: "target",    text: "무엇을 비교하나요? 모두 골라주세요", icon: "⚖️", multi: true,
      choices: ["측정값 vs 기준값 (규격)", "두 실험 결과끼리", "여러 샘플 동시 비교", "전후 비교 (Before / After)"] },
    { id: "items",     text: "비교 항목 구성은?", icon: "📋", multi: true,
      choices: ["단일 항목", "여러 항목 동시 비교", "가중치별 항목", "계층 구조 항목"] },
    { id: "verdict",   text: "판정 기능을 골라주세요", icon: "✅", multi: true,
      choices: ["합격 / 불합격 자동 판정", "허용 오차 (±) 직접 설정", "상대 오차 (%) 기준", "가중치 점수 판정", "값만 표시 (판정 없음)"] },
    { id: "visual",    text: "시각화 방식을 골라주세요", icon: "📊", multi: true,
      choices: ["수치 비교 표", "편차 막대 그래프", "레이더 차트", "색상으로 합불 표시", "없음"] },
    { id: "extra",     text: "추가 기능이 필요한가요?", icon: "✨", multi: true,
      choices: ["비교 결과 저장", "기준값 관리 (여러 규격)", "통계 요약", "없음"] },
    { id: "export",    text: "출력 / 내보내기가 필요한가요?", icon: "🖨️", multi: true,
      choices: ["판정 결과 인쇄", "CSV 내보내기", "보고서 생성", "필요 없음"] },
  ],
  recipe: [
    { id: "params",    text: "관리할 파라미터를 모두 골라주세요", icon: "🧪", multi: true,
      choices: ["온도", "압력", "시간", "속도", "농도", "전압 / 전류", "유량", "기타 숫자값"] },
    { id: "manage",    text: "레시피 관리 기능을 골라주세요", icon: "🗂️", multi: true,
      choices: ["레시피 저장", "레시피 불러오기", "복사 / 편집", "삭제", "이름 / 태그 붙이기"] },
    { id: "result",    text: "결과 연동이 필요한가요?", icon: "📊", multi: true,
      choices: ["조건 + 결과 세트로 저장", "성공 / 실패 표시", "점수 / 평가 기록", "결과 그래프", "없음"] },
    { id: "search",    text: "검색 기능이 필요한가요?", icon: "🔍", multi: true,
      choices: ["이름 / 태그 검색", "파라미터값 검색", "결과 기반 검색", "없음"] },
    { id: "compare",   text: "레시피 비교 기능이 필요한가요?", icon: "⚖️", multi: true,
      choices: ["레시피 간 파라미터 비교", "최적 조건 표시", "없음"] },
    { id: "export",    text: "출력 / 내보내기가 필요한가요?", icon: "🖨️", multi: true,
      choices: ["조건표 인쇄", "CSV 내보내기", "공유용 파일 저장", "필요 없음"] },
  ],
  report: [
    { id: "structure", text: "보고서 구성 항목을 골라주세요", icon: "📄", multi: true,
      choices: ["표지 (제목 · 날짜 · 작성자)", "목차", "요약 / 결론 요약", "본문 내용", "결론 / 제언", "첨부 자료"] },
    { id: "content",   text: "포함할 내용을 모두 골라주세요", icon: "📝", multi: true,
      choices: ["실험 정보 (조건·환경)", "측정 데이터 표", "그래프 / 차트", "사진 / 이미지", "분석 결과", "비교 결과"] },
    { id: "format",    text: "보고서 형식을 골라주세요", icon: "🎨", multi: true,
      choices: ["표 중심 형식", "그래프 포함 형식", "기술 문서 형식", "발표용 (큰 글씨)"] },
    { id: "auto",      text: "자동 채우기 기능이 필요한가요?", icon: "⚡", multi: true,
      choices: ["날짜 자동 입력", "작성자 기억", "보고서 번호 자동 생성", "없음"] },
    { id: "multi",     text: "여러 결과 정리 방식은?", icon: "📚", multi: true,
      choices: ["한 장에 여러 결과", "결과별 개별 페이지", "비교 표로 정리", "하나씩만"] },
    { id: "export",    text: "출력 / 저장 방식은?", icon: "🖨️", multi: true,
      choices: ["인쇄 (프린트)", "HTML 파일로 저장", "화면에서만 확인"] },
  ],
  stopwatch: [
    { id: "type",      text: "필요한 기능을 모두 골라주세요", icon: "⏱️", multi: true,
      choices: ["카운트다운 타이머", "스톱워치 (카운트업)", "인터벌 타이머 (반복)", "랩 타임 기록"] },
    { id: "display",   text: "표시 방식을 골라주세요", icon: "🖥️", multi: true,
      choices: ["시 : 분 : 초", "밀리초까지 표시", "진행률 바 (프로그레스)", "큰 화면 모드"] },
    { id: "alert",     text: "알림 기능이 필요한가요?", icon: "🔔", multi: true,
      choices: ["소리 알림 (완료 시)", "시각 알림 (색상 변경)", "중간 알림 (n초마다)", "없음"] },
    { id: "multi",     text: "동시 사용 타이머 수는?", icon: "⏲️", multi: true,
      choices: ["하나만", "2개 동시", "여러 개 동시 (탭 전환)", "이름 붙이기 가능"] },
    { id: "extra",     text: "추가 기능이 필요한가요?", icon: "✨", multi: true,
      choices: ["자동 반복 (완료 후 재시작)", "카운트업 (타임아웃 후 계속)", "랩 목록 저장", "CSV 내보내기", "없음"] },
  ],
};

// ── Spec compiler ─────────────────────────────────────────────────────────────
function compileWizardSpec(type, answers, extraNotes) {
  const q = TYPE_QUESTIONS[type.id] || [];
  const answered = q
    .map(qItem => {
      const val = answers[qItem.id];
      const displayVal = Array.isArray(val) ? val.join(", ") : val;
      return { label: qItem.text.replace(/[?？]$/, ""), value: displayVal };
    })
    .filter(item => item.value);
  const half = Math.ceil(answered.length / 2);
  const fmt = items => items.map(i => `${i.label}: ${i.value}`).join("\n");
  const detailText = answered.map(i => `• ${i.label}: ${i.value}`).join("\n")
    + (extraNotes ? `\n• 추가 요구사항: ${extraNotes}` : "");
  return {
    name: `${type.label} 프로그램`,
    purpose: `${type.label} — ${type.desc}`,
    input: fmt(answered.slice(0, half)) || type.desc,
    output: fmt(answered.slice(half)) + (extraNotes ? `\n추가 요구사항: ${extraNotes}` : "") || type.desc,
    users: "프리웨어 — 제작자 본인 및 공유 대상",
    _detail: detailText,
    _type: type.label,
    _typeId: type.id,
    _icon: type.icon,
    _answers: answers,
  };
}

const HISTORY_KEY = "ai-assistant:history:v1";
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function saveHistory(entries) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProgramDesigner({ onBack }) {
  const [phase, setPhase] = useState("typepick");
  const [selectedType, setSelectedType] = useState(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState({});
  const [extraNotes, setExtraNotes] = useState("");
  const [wizardShowExtra, setWizardShowExtra] = useState(false);
  const [spec, setSpec] = useState(null);
  const [progress, setProgress] = useState(0);
  const [lastFileName, setLastFileName] = useState("");
  const [history, setHistory] = useState(loadHistory);

  function reset() {
    setPhase("typepick");
    setSelectedType(null);
    setWizardStep(0);
    setWizardAnswers({});
    setExtraNotes("");
    setWizardShowExtra(false);
    setSpec(null);
    setProgress(0);
    setLastFileName("");
  }

  function handleTypeCardClick(type) {
    setSelectedType(type);
    setWizardStep(0);
    setWizardAnswers({});
    setExtraNotes("");
    setWizardShowExtra(false);
    setPhase("wizard_qa");
  }

  // 단일 선택: 선택 즉시 다음 질문으로 이동
  function handleWizardChoice(qId, choice) {
    const newAnswers = { ...wizardAnswers, [qId]: choice };
    setWizardAnswers(newAnswers);
    advanceWizard();
  }

  // 멀티 선택: 토글만 하고 이동하지 않음
  function handleMultiToggle(qId, choice) {
    const prev = Array.isArray(wizardAnswers[qId]) ? wizardAnswers[qId] : [];
    const next = prev.includes(choice) ? prev.filter(x => x !== choice) : [...prev, choice];
    setWizardAnswers({ ...wizardAnswers, [qId]: next });
  }

  // 다음 질문으로 이동 (멀티 선택 후 "다음" 버튼 또는 단일 선택 즉시)
  function advanceWizard() {
    const questions = TYPE_QUESTIONS[selectedType.id];
    if (wizardStep + 1 >= questions.length) {
      setWizardShowExtra(true);
    } else {
      setWizardStep(wizardStep + 1);
    }
  }

  function handleWizardBack() {
    if (wizardShowExtra) { setWizardShowExtra(false); return; }
    if (wizardStep > 0) { setWizardStep(wizardStep - 1); }
    else { setPhase("typepick"); setSelectedType(null); }
  }

  function handleWizardFinish() {
    const compiled = compileWizardSpec(selectedType, wizardAnswers, extraNotes);
    setTimeout(() => {
      setSpec(compiled);
      setPhase("confirm");
    }, 50);
  }

  function generateProgram() {
    setPhase("generating");
    setProgress(20);
    setTimeout(() => {
      try {
        const tmplFn = TEMPLATE_MAP[spec._typeId];
        if (!tmplFn) throw new Error("템플릿 없음: " + spec._typeId);
        setProgress(60);
        let html = wrapTemplate(tmplFn(spec), spec);
        setProgress(80);
        html = injectInstructions(injectBaseCSS(html), spec);
        setProgress(95);
        const fName = htmlFileName(spec.name);
        downloadHtml(fName, html);
        setLastFileName(fName);
        const entry = {
          id: Date.now(),
          name: spec.name,
          purpose: spec.purpose,
          path: `${fName} (다운로드됨)`,
          code: html,
          date: new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        };
        setHistory(prev => {
          const next = [entry, ...prev].slice(0, 20);
          saveHistory(next);
          return next;
        });
        setProgress(100);
        setPhase("done");
      } catch (e) {
        alert("생성 오류: " + e.message);
        setPhase("confirm");
      }
    }, 300);
  }

  return (
    <div className="app app--ai">
      <header className="app-header app-header--ai">
        <div>
          <p className="page-kicker">MODE 04</p>
          <h1>프로그램 설계소</h1>
          <p>유형을 선택하면 실행 가능한 프로토타입을 만들어 드려요</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {history.length > 0 && (
            <button
              type="button"
              className="ai-history-btn"
              onClick={() => setPhase(phase === "history" ? "typepick" : "history")}
            >
              {phase === "history" ? "← 뒤로" : `기록 ${history.length}`}
            </button>
          )}
          {(phase === "wizard_qa" || phase === "confirm") && (
            <button type="button" className="ai-reset-btn" onClick={reset} title="처음으로">
              ↺ 리셋
            </button>
          )}
          <button type="button" className="ghost-button" onClick={onBack}>← 홈으로</button>
        </div>
      </header>

      {/* ── 기록 ── */}
      {phase === "history" && (
        <div className="ai-history">
          <p className="page-kicker" style={{ color: "#a78bfa", marginBottom: 8 }}>생성 기록</p>
          <h2 style={{ marginBottom: 20, fontSize: "1.3rem" }}>만든 프로그램 목록</h2>
          {history.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>아직 생성된 프로그램이 없어요.</p>
          ) : (
            <div className="ai-history-list">
              {history.map(entry => (
                <div key={entry.id} className="ai-history-card">
                  <div className="ai-history-card__top">
                    <div>
                      <div className="ai-history-name">{entry.name}</div>
                      <div className="ai-history-purpose">{entry.purpose}</div>
                    </div>
                    <span className="ai-history-date">{entry.date}</span>
                  </div>
                  <div className="ai-history-path">
                    <span>📥</span>
                    <span>{entry.path}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {entry.code && (
                      <button
                        type="button"
                        className="ghost-button"
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        onClick={() => downloadHtml(htmlFileName(entry.name), entry.code)}
                      >
                        ⬇ 다시 다운로드
                      </button>
                    )}
                    <button
                      type="button"
                      className="ghost-button"
                      style={{ fontSize: 12, padding: "6px 12px", color: "#f87171" }}
                      onClick={() => {
                        setHistory(prev => {
                          const next = prev.filter(e => e.id !== entry.id);
                          saveHistory(next);
                          return next;
                        });
                      }}
                    >
                      🗑 삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 유형 선택 ── */}
      {phase === "typepick" && (
        <div className="ai-typepick">
          <div className="ai-guide-card">
            <h3>프로그램 설계소 사용법</h3>
            <ul>
              <li><strong>1. 유형 선택</strong> — 만들고 싶은 프로그램 유형을 아래에서 고릅니다.</li>
              <li><strong>2. 질문에 답하기</strong> — 원하는 기능을 여러 개 골라주세요. 더 구체적일수록 완성도가 높아져요.</li>
              <li><strong>3. 다운로드</strong> — 바로 실행되는 HTML 프로그램이 다운로드됩니다.</li>
            </ul>
            <p className="ai-guide-note">
              ⚠️ 여기서 만들어지는 프로그램은 <strong>완성된 최종 프로그램이 아니라</strong>, 완성형으로 가기 위한
              <strong> 중간 단계(프로토타입)</strong>입니다. 실제 하드웨어 연동·서버·DB 저장 같은 기능은 빠져 있어요.
              다운로드한 파일 안에 담긴 안내를 챗GPT·Claude 같은 <strong>생성형 AI 코딩 도구</strong>에 그대로 붙여넣으면,
              그 도구가 진짜 완성형 프로그램까지 만들어 줄 수 있습니다.
            </p>
          </div>
          <p className="ai-typepick-title">어떤 프로그램을 만들고 싶으신가요?</p>
          <div className="ai-typepick-grid">
            {PROGRAM_TYPES.map(t => (
              <button key={t.id} className="ai-typepick-card" onClick={() => handleTypeCardClick(t)}>
                <span className="ai-typepick-icon">{t.icon}</span>
                <span className="ai-typepick-label">{t.label}</span>
                <span className="ai-typepick-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 질문 마법사 ── */}
      {phase === "wizard_qa" && selectedType && (() => {
        const questions = TYPE_QUESTIONS[selectedType.id] || [];
        const currentQ = questions[wizardStep];
        const pct = Math.round((wizardStep / questions.length) * 100);
        const multiSelected = Array.isArray(wizardAnswers[currentQ?.id]) ? wizardAnswers[currentQ.id] : [];

        return (
          <div className="ai-wizard-qa">
            <div className="ai-wizard-header">
              <span className="ai-wizard-type-icon">{selectedType.icon}</span>
              <span className="ai-wizard-type-label">{selectedType.label}</span>
              <button className="ai-wizard-back" onClick={handleWizardBack}>← 뒤로</button>
            </div>
            <div className="ai-wizard-progress-bar">
              <div className="ai-wizard-progress-fill" style={{ width: `${wizardShowExtra ? 100 : pct}%` }} />
            </div>
            <p className="ai-wizard-progress-text">
              {wizardShowExtra ? "완료!" : `${wizardStep + 1} / ${questions.length}`}
            </p>

            {!wizardShowExtra && currentQ && (
              <div className="ai-wizard-question">
                <p className="ai-wizard-q-icon">{currentQ.icon}</p>
                <p className="ai-wizard-q-text">{currentQ.text}</p>

                {/* 텍스트 입력 */}
                {currentQ.type === "input" && (
                  <div className="ai-wizard-input-row">
                    <input
                      className="ai-wizard-text-input"
                      placeholder={currentQ.placeholder || ""}
                      defaultValue={wizardAnswers[currentQ.id] || ""}
                      id={`wiz-input-${currentQ.id}`}
                    />
                    <button
                      className="ai-wizard-confirm-btn"
                      onClick={() => {
                        const val = document.getElementById(`wiz-input-${currentQ.id}`)?.value?.trim();
                        if (val) handleWizardChoice(currentQ.id, val);
                      }}
                    >확인 →</button>
                  </div>
                )}

                {/* 멀티 선택 (체크박스 방식) */}
                {currentQ.multi && (
                  <div style={{ width: "100%" }}>
                    <p className="ai-wizard-q-sub">여러 개 선택 가능 · 해당 없으면 건너뛰기</p>
                    <div className="ai-wizard-multiselect">
                      {currentQ.choices.map((c, ci) => {
                        const isOn = multiSelected.includes(c);
                        return (
                          <button
                            key={ci}
                            className={`ai-wizard-check-item${isOn ? " ai-wizard-check-item--on" : ""}`}
                            onClick={() => handleMultiToggle(currentQ.id, c)}
                          >
                            <span className="ai-wizard-check-icon">{isOn ? "✓" : ""}</span>
                            {c}
                          </button>
                        );
                      })}
                    </div>
                    <div className="ai-wizard-multi-footer">
                      <span className="ai-wizard-selected-count">
                        {multiSelected.length > 0 ? `${multiSelected.length}개 선택됨` : "선택 없음"}
                      </span>
                      <button
                        className="ai-wizard-confirm-btn"
                        onClick={advanceWizard}
                      >
                        다음 →
                      </button>
                    </div>
                  </div>
                )}

                {/* 단일 선택 (선택 즉시 이동) */}
                {!currentQ.type && !currentQ.multi && (
                  <div className="ai-wizard-choices">
                    {currentQ.choices.map((c, ci) => (
                      <button
                        key={ci}
                        className={`ai-wizard-choice${wizardAnswers[currentQ.id] === c ? " ai-wizard-choice--selected" : ""}`}
                        onClick={() => handleWizardChoice(currentQ.id, c)}
                      >
                        <span className="ai-wizard-choice-num">{"①②③④".charAt(ci)}</span>
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {wizardShowExtra && (
              <div className="ai-wizard-extra">
                <p className="ai-wizard-q-icon">💬</p>
                <p className="ai-wizard-q-text">추가로 원하는 게 있으신가요?</p>
                <p className="ai-wizard-q-sub">화면 색상, 특별한 기능, 기타 요구사항을 자유롭게 적어주세요.</p>
                <textarea
                  className="ai-wizard-textarea"
                  placeholder="예: 버튼 크게, 배경 어둡게, 결과 저장 기능 추가... (없으면 그냥 다음으로)"
                  value={extraNotes}
                  onChange={e => setExtraNotes(e.target.value)}
                  rows={3}
                />
                <button className="ai-wizard-finish-btn button" onClick={handleWizardFinish}>
                  다음 — 프로그램 확인 →
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── 스펙 확인 ── */}
      {phase === "confirm" && spec && (
        <div className="ai-confirm-standalone">
          <p className="page-kicker" style={{ marginBottom: 8 }}>스펙 확인</p>
          <h2 style={{ marginBottom: 20, fontSize: "1.4rem" }}>이렇게 만들어 드릴까요?</h2>
          <div className="ai-spec-card">
            <div className="ai-spec-row"><span className="ai-spec-label">프로그램명</span><span className="ai-spec-value">{spec.name}</span></div>
            <div className="ai-spec-row"><span className="ai-spec-label">유형</span><span className="ai-spec-value">{spec._icon} {spec._type}</span></div>
            <div className="ai-spec-row"><span className="ai-spec-label">목적</span><span className="ai-spec-value">{spec.purpose}</span></div>
            {spec._detail && (
              <div className="ai-spec-row" style={{ flexDirection: "column", gap: 4 }}>
                <span className="ai-spec-label">선택 내용</span>
                <span className="ai-spec-value" style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-line" }}>{spec._detail}</span>
              </div>
            )}
          </div>

          <div style={{ background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
            <p style={{ fontWeight: 700, color: "#6c63ff", marginBottom: 6 }}>⚠️ 프로토타입 안내</p>
            <p style={{ fontSize: 13, color: "#9ba5bb", lineHeight: 1.6 }}>
              완성된 최종 프로그램이 아닌 프로토타입입니다. 실제 서버·하드웨어 연동은 생성된 파일을 Claude / ChatGPT에 넣어 완성하세요.<br />
              <strong style={{ color: "#e8eaf0" }}>대화만으로 완성형 프로그램을 만들 수 있어요!</strong>
            </p>
          </div>

          <div className="ai-spec-files">
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>생성될 파일</p>
            <div className="ai-file-item">
              <span className="ai-file-icon">🌐</span>
              <span>{htmlFileName(spec.name)}</span>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
              파일 하나만 다운로드됩니다. 더블클릭하면 바로 실행!
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button type="button" className="button" onClick={generateProgram} style={{ flex: 1 }}>
              네, 만들어주세요!
            </button>
            <button type="button" className="ghost-button" onClick={() => { setWizardShowExtra(true); setPhase("wizard_qa"); }}>
              수정할게요
            </button>
          </div>
        </div>
      )}

      {/* ── 생성 중 ── */}
      {phase === "generating" && (
        <div className="ai-generating">
          <div className="ai-gen-header">
            <p className="page-kicker">생성 중</p>
            <h2>프로그램을 만들고 있어요…</h2>
            <p style={{ color: "var(--muted)", marginTop: 6 }}>잠시만 기다려 주세요.</p>
          </div>
          <div className="ai-progress-wrap">
            <div className="ai-progress-bar">
              <div className="ai-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="ai-progress-pct">{Math.round(progress)}%</span>
          </div>
        </div>
      )}

      {/* ── 완료 ── */}
      {phase === "done" && (
        <div className="ai-done">
          <div className="ai-done-icon">✅</div>
          <h2>완성됐어요!</h2>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            파일이 다운로드 폴더에 저장됐어요 😊
          </p>
          <div className="ai-path-card">
            <span className="ai-path-icon">📥</span>
            <span className="ai-path-text">{lastFileName}</span>
          </div>
          <div className="ai-done-steps">
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>실행 방법</p>
            <div className="ai-step">
              <span className="ai-step-num">1</span>
              <div>다운로드 폴더에서 <strong>.html 파일을 더블클릭</strong>하면 브라우저에서 바로 실행돼요 🚀</div>
            </div>
            <div className="ai-step">
              <span className="ai-step-num">2</span>
              <div>다른 사람에게 보낼 때는 <strong>.html 파일 하나</strong>만 보내면 돼요 — 받는 사람도 더블클릭하면 열려요!</div>
            </div>
            <div className="ai-step">
              <span className="ai-step-num">3</span>
              <div>기능을 더 추가하려면 <strong>파일을 Claude / ChatGPT에 업로드</strong>하고 원하는 내용을 말하면 돼요</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap", justifyContent: "center" }}>
            <button type="button" className="button"
              onClick={() => {
                const entry = history[0];
                if (entry?.code) downloadHtml(htmlFileName(entry.name), entry.code);
              }}
            >
              ⬇ 다시 다운로드
            </button>
            <button type="button" className="ghost-button" onClick={reset}>
              새 프로그램 만들기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
