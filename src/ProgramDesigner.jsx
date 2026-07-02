import { useState } from "react";
import { TEMPLATE_MAP, wrapTemplate, TYPE_META, SEED_TYPES } from "./programTemplates";

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
  const kindLabel = isSeed ? "🌱 씨앗형 (시뮬레이션 데모)" : "✅ 완성형";
  const limLines = (meta.limits  || ["브라우저 내에서만 동작"]).map(l => `  ✗ ${l}`).join("\n");
  const n1Lines  = (meta.nexts1  || []).map(n => `  → ${n}`).join("\n");
  const n2Lines  = (meta.nexts2  || []).map(n => `  → ${n}`).join("\n");
  const n3Lines  = (meta.nexts3  || []).map(n => `  → ${n}`).join("\n");
  const p1 = meta.prompt1 || "이 HTML에 기능을 추가해줘. 단일 HTML 파일로 유지해줘.";
  const p2 = meta.prompt2 || "이 HTML 스펙으로 완성형 프로그램을 HTML/CSS/JS/server.js로 분리해서 만들어줘.";
  const p3 = meta.prompt3 || "고급 기능까지 포함한 완성형 프로그램을 만들어줘.";
  const seedNote = isSeed
    ? `\n━━━━━━━━ 하드웨어 연동 안내 ━━━━━━━━\n  이 프로그램은 시뮬레이션 데모입니다.\n  실제 하드웨어(모터, PLC, 센서 등) 연동은 아래 AI 도구로\n  대화만으로 프로그램을 만들 수 있어요!\n`
    : "";
  const comment = `<!--
╔══════════════════════════════════════════════════════════╗
║               프로그램 설계소                            ║
╚══════════════════════════════════════════════════════════╝

[ 프로그램 정보 ]
  프로그램명 : ${spec.name}
  유형       : ${spec._type || ""} ${kindLabel}
  목적       : ${spec.purpose}
  생성일     : ${date}

[ 현재 기능 ]
${spec._detail || ""}

[ 현재 한계점 ]
${limLines}
${seedNote}
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
${isSeed ? `  이 프로그램은 시뮬레이션 전용입니다.\n  실제 장비 연동 시 아래 프로토콜 중 선택:\n  - Modbus RTU / Modbus TCP (산업용 모터·PLC)\n  - EtherCAT (고속 다축 제어)\n  - 시리얼 통신 RS-232 / RS-485\n  - 엔코더 피드백 연동 가능` : `  이 프로그램은 완성형으로 바로 사용 가능합니다.\n  서버 연동 시 Node.js + SQLite / PostgreSQL 권장`}

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

// ── Program types & questions (same as AiProgramAssistant) ─────────────────
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

const TYPE_QUESTIONS = {
  motor_transfer: [
    { id: "direction", text: "이송 방향은 어떻게 되나요?", icon: "🔧", choices: ["수평 이송 (좌우)", "수직 이송 (상하)", "수평·수직 둘 다"] },
    { id: "distance",  text: "이송 거리가 얼마나 되나요?", icon: "📏", type: "input", placeholder: "숫자로만 적어주세요. 예: 500mm" },
    { id: "duration",  text: "그 거리를 이동하는 데 몇 초 걸리나요?", icon: "⏱️", type: "input", placeholder: "숫자로만 적어주세요. 예: 10초" },
    { id: "sensor",    text: "끝에 리미트 센서가 있나요?", icon: "📡", choices: ["있어요", "없어요"] },
    { id: "motion",    text: "이동 방식은?", icon: "↔️", choices: ["한 방향만", "왕복 운동"] },
    { id: "estop",     text: "비상정지 버튼이 필요한가요?", icon: "🛑", choices: ["필요해요", "없어도 돼요"] },
    { id: "accel",     text: "출발·정지 시 부드럽게 가속/감속이 필요한가요?", icon: "🎚️", choices: ["부드럽게 가속/감속", "즉시 출발/정지"] },
    { id: "repeat",    text: "반복 동작인가요?", icon: "🔁", choices: ["한 번만", "횟수를 정해서", "계속 반복"] },
    { id: "display",   text: "화면에서 실시간으로 보고 싶은 정보는?", icon: "🖥️", choices: ["현재 위치 · 남은 거리", "동작 상태 · 완료 횟수", "둘 다"] },
  ],
  motor_rotation: [
    { id: "speed",     text: "1회전에 몇 초 걸리나요?", icon: "⚙️", type: "input", placeholder: "숫자로만 적어주세요. 예: 3초" },
    { id: "direction", text: "회전 방향은?", icon: "🔄", choices: ["한 방향만", "정역 전환 가능"] },
    { id: "stop",      text: "정지 조건은?", icon: "🛑", choices: ["시간 지정", "횟수 지정", "버튼으로 수동 정지"] },
    { id: "estop",     text: "비상정지 버튼이 필요한가요?", icon: "🚨", choices: ["필요해요", "없어도 돼요"] },
    { id: "accel",     text: "부드럽게 가속/감속이 필요한가요?", icon: "🎚️", choices: ["부드럽게", "즉시"] },
    { id: "repeat",    text: "반복 동작인가요?", icon: "🔁", choices: ["한 번만", "계속 반복"] },
    { id: "display",   text: "화면에서 보고 싶은 정보는?", icon: "🖥️", choices: ["현재 속도 · 각도", "동작 상태 · 완료 횟수", "둘 다"] },
  ],
  sensor: [
    { id: "target",    text: "무엇을 측정하나요?", icon: "📡", choices: ["온도 / 습도", "진동 / 소음", "압력 / 유량", "위치 / 거리"] },
    { id: "realtime",  text: "측정값을 실시간으로 화면에 보여줘야 하나요?", icon: "📺", choices: ["실시간으로", "일정 간격마다 갱신"] },
    { id: "save",      text: "측정 결과를 파일로 저장해야 하나요?", icon: "💾", choices: ["저장 필요", "화면에만 보여줘도 돼요"] },
    { id: "alert",     text: "기준값을 넘으면 경고가 필요한가요?", icon: "🚨", choices: ["경고 필요", "없어도 돼요"] },
    { id: "graph",     text: "그래프로 보여줘야 하나요?", icon: "📈", choices: ["그래프 필요", "숫자만 보여줘도 돼요"] },
  ],
  process_timer: [
    { id: "steps",     text: "몇 단계로 이루어지나요?", icon: "🔢", choices: ["2~3단계 (간단)", "4단계 이상 (복잡)"] },
    { id: "steptime",  text: "각 단계의 시간을 직접 입력할 수 있어야 하나요?", icon: "⏱️", choices: ["네, 입력 가능", "고정값으로 설정"] },
    { id: "auto",      text: "단계가 끝나면 자동으로 다음으로 넘어가나요?", icon: "⏭️", choices: ["자동으로", "버튼 눌러야 넘어가요"] },
    { id: "repeat",    text: "전체를 반복해야 하나요?", icon: "🔁", choices: ["한 번만", "계속 반복"] },
    { id: "pause",     text: "중간에 일시정지가 필요한가요?", icon: "⏸️", choices: ["필요해요", "없어도 돼요"] },
    { id: "display",   text: "화면에서 보고 싶은 정보는?", icon: "🖥️", choices: ["현재 단계 · 남은 시간", "전체 진행 상태", "둘 다"] },
  ],
  data_record: [
    { id: "target",    text: "무엇을 기록하나요?", icon: "📋", choices: ["장비·부품 관리", "작업 이력 · 일지", "측정값 기록"] },
    { id: "save",      text: "나중에 불러와서 수정할 수 있어야 하나요?", icon: "💾", choices: ["저장·불러오기 필요", "그날그날 보기만"] },
    { id: "search",    text: "검색이나 필터 기능이 필요한가요?", icon: "🔍", choices: ["날짜·이름으로 검색", "없어도 돼요"] },
    { id: "export",    text: "출력(프린트)이나 파일 내보내기가 필요한가요?", icon: "🖨️", choices: ["필요해요", "필요 없어요"] },
  ],
  inventory: [
    { id: "target",    text: "무엇을 관리하나요?", icon: "🗃️", choices: ["부품 · 소모품", "장비 · 기기", "둘 다"] },
    { id: "history",   text: "입출고 이력을 추적해야 하나요?", icon: "📋", choices: ["이력 추적", "현재 수량만"] },
    { id: "alert",     text: "재고 부족 경고가 필요한가요?", icon: "⚠️", choices: ["필요해요", "없어도 돼요"] },
    { id: "export",    text: "목록 출력이나 파일 내보내기가 필요한가요?", icon: "🖨️", choices: ["필요해요", "필요 없어요"] },
  ],
  lab_diary: [
    { id: "fields",    text: "기록할 항목은?", icon: "📓", choices: ["날짜·실험자·조건·결과 (기본)", "추가 항목 있음"] },
    { id: "search",    text: "날짜나 키워드로 검색이 필요한가요?", icon: "🔍", choices: ["검색 필요", "없어도 돼요"] },
    { id: "export",    text: "출력이나 파일 내보내기가 필요한가요?", icon: "🖨️", choices: ["필요해요", "필요 없어요"] },
  ],
  calculator: [
    { id: "purpose",   text: "어떤 계산이 필요한가요? 짧게 적어주세요.", icon: "🔢", type: "input", placeholder: "예: 모터 토크 계산" },
    { id: "save",      text: "계산 결과를 저장하거나 비교해야 하나요?", icon: "💾", choices: ["저장·비교 필요", "그때그때 계산만"] },
    { id: "steps",     text: "계산 과정(중간 값)도 보여줘야 하나요?", icon: "📐", choices: ["단계별로 보여줘요", "최종 결과만"] },
  ],
  data_analysis: [
    { id: "input",     text: "데이터를 어떻게 입력하나요?", icon: "📥", choices: ["파일 불러오기 (CSV 등)", "직접 숫자 입력"] },
    { id: "method",    text: "어떤 분석이 필요한가요?", icon: "🔢", choices: ["통계 (평균·최대·최소·표준편차)", "주파수 분석 (FFT)", "둘 다"] },
    { id: "graph",     text: "분석 결과를 그래프로 보여줘야 하나요?", icon: "📈", choices: ["그래프 필수", "숫자(표)만"] },
    { id: "save",      text: "결과를 파일로 저장하거나 내보내야 하나요?", icon: "💾", choices: ["저장 필요", "화면에서 보기만"] },
  ],
  spectrum: [
    { id: "input",     text: "데이터 형식은?", icon: "📥", choices: ["CSV · 텍스트 파일", "직접 숫자 입력"] },
    { id: "display",   text: "표시 방식은?", icon: "🌈", choices: ["파장 vs 강도 그래프", "주파수 스펙트럼", "둘 다"] },
    { id: "peak",      text: "피크(최대값) 검출 기능이 필요한가요?", icon: "📌", choices: ["자동 피크 탐색", "수동 마커", "없어도 돼요"] },
    { id: "save",      text: "결과를 저장해야 하나요?", icon: "💾", choices: ["저장 필요", "화면에서 보기만"] },
  ],
  unit_convert: [
    { id: "type",      text: "어떤 변환이 필요한가요?", icon: "⚖️", choices: ["물리 단위 (mm↔inch, N↔kgf 등)", "좌표계 변환", "데이터 형식 변환"] },
    { id: "batch",     text: "여러 항목을 한꺼번에 변환해야 하나요?", icon: "📋", choices: ["목록으로 한꺼번에", "하나씩 입력해서"] },
    { id: "save",      text: "자주 쓰는 변환식을 저장해놔야 하나요?", icon: "💾", choices: ["즐겨찾기 저장", "없어도 돼요"] },
  ],
  compare: [
    { id: "target",    text: "무엇을 비교하나요?", icon: "⚖️", choices: ["측정값 vs 기준값", "두 실험 결과끼리"] },
    { id: "verdict",   text: "합격/불합격 자동 판정이 필요한가요?", icon: "✅", choices: ["자동 판정", "값만 표시"] },
    { id: "tolerance", text: "허용 오차(±)를 직접 입력할 수 있어야 하나요?", icon: "🎯", choices: ["입력 가능", "고정값으로"] },
    { id: "multi",     text: "여러 항목을 동시에 비교해야 하나요?", icon: "📋", choices: ["항목이 여러 개", "하나씩 비교"] },
  ],
  recipe: [
    { id: "save",      text: "실험 조건을 저장하고 나중에 불러와야 하나요?", icon: "💾", choices: ["저장·불러오기 필수", "매번 새로 입력"] },
    { id: "list",      text: "여러 조건을 목록으로 관리해야 하나요?", icon: "📋", choices: ["여러 레시피 목록", "하나만 저장"] },
    { id: "result",    text: "조건별로 결과도 같이 기록해야 하나요?", icon: "📊", choices: ["조건+결과 세트로", "조건만 관리"] },
  ],
  report: [
    { id: "format",    text: "어떤 형태로 정리해야 하나요?", icon: "📄", choices: ["표 형식", "그래프 포함 보고서", "둘 다"] },
    { id: "print",     text: "출력(프린트)이 필요한가요?", icon: "🖨️", choices: ["인쇄용으로", "화면에서만"] },
    { id: "multi",     text: "여러 실험 결과를 한 번에 정리해야 하나요?", icon: "📚", choices: ["한 장에 여러 결과", "하나씩 따로"] },
    { id: "meta",      text: "날짜, 작성자 같은 기본 정보도 넣어야 하나요?", icon: "🏷️", choices: ["포함해요", "없어도 돼요"] },
  ],
  stopwatch: [
    { id: "type",      text: "어떤 기능이 필요한가요?", icon: "⏱️", choices: ["카운트다운 타이머", "스톱워치", "둘 다"] },
    { id: "alert",     text: "시간 완료 시 알림이 필요한가요?", icon: "🔔", choices: ["소리·시각 알림", "없어도 돼요"] },
    { id: "multi",     text: "여러 타이머를 동시에 사용해야 하나요?", icon: "⏲️", choices: ["여러 개 동시에", "하나만"] },
  ],
};

function compileWizardSpec(type, answers, extraNotes) {
  const q = TYPE_QUESTIONS[type.id] || [];
  const answered = q
    .map(qItem => ({ label: qItem.text.replace(/[?？]$/, ""), value: answers[qItem.id] }))
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

// ── Main Component ──────────────────────────────────────────────────────────
export default function ProgramDesigner({ onBack }) {
  // phases: typepick | wizard_qa | confirm | generating | done | history
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

  function handleWizardChoice(qId, choice) {
    const newAnswers = { ...wizardAnswers, [qId]: choice };
    setWizardAnswers(newAnswers);
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
    // setTimeout prevents phantom click on confirm's generate button (same y-position as finish btn)
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
          <p>유형을 선택하면 바로 사용 가능한 프로그램을 만들어 드려요</p>
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
          <p className="ai-typepick-title">어떤 프로그램을 만들고 싶으신가요?</p>
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.78rem", color: "#7b7f93" }}>✅ 완성형 — 바로 사용 가능</span>
            <span style={{ fontSize: "0.78rem", color: "#7b7f93" }}>🌱 씨앗형 — 시뮬레이션 (AI로 실제 제어 완성)</span>
          </div>
          <div className="ai-typepick-grid">
            {PROGRAM_TYPES.map(t => (
              <button key={t.id} className="ai-typepick-card" onClick={() => handleTypeCardClick(t)}>
                <span className="ai-typepick-icon">{t.icon}</span>
                <span className="ai-typepick-label">{t.label}</span>
                <span className="ai-typepick-desc">{t.desc}</span>
                <span style={{ fontSize: "0.7rem", marginTop: "4px", color: t.seed ? "#6c63ff" : "#22c55e" }}>
                  {t.seed ? "🌱 씨앗형" : "✅ 완성형"}
                </span>
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
                {currentQ.type === "input" ? (
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
                ) : (
                  <div className="ai-wizard-choices">
                    {currentQ.choices.map((c, ci) => (
                      <button
                        key={ci}
                        className={`ai-wizard-choice${wizardAnswers[currentQ.id] === c ? " ai-wizard-choice--selected" : ""}`}
                        onClick={() => handleWizardChoice(currentQ.id, c)}
                      >
                        <span className="ai-wizard-choice-num">{"①②③".charAt(ci)}</span>
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

          {SEED_TYPES.has(spec._typeId) && (
            <div style={{ background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
              <p style={{ fontWeight: 700, color: "#6c63ff", marginBottom: 6 }}>🌱 씨앗형 프로그램</p>
              <p style={{ fontSize: 13, color: "#9ba5bb", lineHeight: 1.6 }}>
                이 프로그램은 시뮬레이션 데모입니다. 실제 하드웨어 연동은 생성된 파일을 Claude / ChatGPT에 넣어 완성하세요.<br />
                <strong style={{ color: "#e8eaf0" }}>대화만으로 프로그램을 만들 수 있어요!</strong>
              </p>
            </div>
          )}

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
