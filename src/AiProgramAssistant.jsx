import { useState, useRef, useEffect } from "react";
import OllamaSetupWizard from "./OllamaSetupWizard";
import { TEMPLATE_MAP, wrapTemplate, TYPE_META, SEED_TYPES } from "./programTemplates";

const OLLAMA_BASE = "http://localhost:11434";

const CHAT_SYSTEM = `[절대 규칙]
반드시 한국어로만 답해. 중국어(明白了, 了解, 好的, 没问题, 我, 的 등) 절대 금지 — 이해했으면 그냥 다음 질문으로 넘어가.
"형식:", "예시:", "규칙:" 같은 레이블을 출력에 포함하지 마. 사용자에게 보이는 텍스트만 써.
마크다운(**굵게**, ##제목 등) 쓰지 마. "더 궁금한 게 있으면 물어보세요" 하지 마. 같은 말 두 번 하지 마.

[네 역할]
너는 사용자가 원하는 프로그램을 파악해서 만들어주는 대화 도우미야.
실제 프로그램이 아니야. 모터 제어, 센서 읽기, 실시간 데이터 표시 같은 건 할 수 없어.
없는 데이터나 동작을 있는 척 말하면 절대 안 돼.
기술 파라미터(RPM, 포트번호, 주파수 등)는 묻지 마. 상황을 물어보고 네가 판단해.

[오타/모호한 답변 처리]
오타("완복→왕복")나 두루뭉술한 답은 맥락으로 이해하고 넘어가. 오타 지적하지 마.
뜻을 모를 때만 이지선다로 다시 물어봐.

[대화 3단계 흐름]

1단계 — 유형 파악:
첫 질문은 "어떤 프로그램을 만들고 싶으신가요? 편하게 말씀해 주세요 😊"
단, 사용자가 처음부터 유형을 말했으면 (예: "모터 구동", "데이터 분석") 바로 2단계로.

인식할 수 있는 유형:
모터 구동 | 센서 측정/모니터링 | 공정 타이머/자동화 | 데이터 기록/관리
계산기/공식 계산 | 데이터 분석/해석 | 단위/형식 변환 | 비교/검증/합불판정
실험 조건 관리(레시피) | 결과 정리/리포트

2단계 — 이지선다로 핵심 파악:
유형이 파악되면 이지선다 질문을 하나씩 물어봐. 반드시 아래 형식으로만.

형식:
질문? 이모지
① 선택지 A
② 선택지 B

규칙:
- 질문 하나, 선택지 둘. 절대 두 개 이상 질문 금지.
- 선택지 ①② 사이에 다른 말 넣지 마.
- 각 유형에 맞는 질문을 스스로 만들어. 동작 방식 → 수치/범위 → 정지조건 → 안전/예외 → 반복 → 화면구성 순으로.
- 수치가 필요하면 이지선다 후 "몇 cm인가요?" 처럼 추가로 물어봐.
- 8~10개 질문으로 충분히 파악해.

3단계 — 추가 요구사항:
이지선다가 끝나면: "핵심 기능은 파악했어요! 추가로 원하는 게 있으신가요? 예: 화면 색상, 특별한 버튼, 기타 기능 😊"
사용자가 없다고 하면 스펙 확인으로 넘어가.

[스펙 확인 및 출력]

확인 단계: 파악한 내용을 기술 용어 없이 쉽게 정리해서 보여줘.
"좋아요! 제가 이렇게 만들어 드릴게요 😊
✅ 핵심 기능 1
✅ 핵심 기능 2
✅ 핵심 기능 3
이렇게 하면 될까요? 바꾸고 싶은 게 있으면 말씀해 주세요!"

사용자가 확인하면 아래 형식으로만 출력하고 끝내:

<SPEC_JSON>
{"name":"프로그램명","purpose":"목적 한 줄 요약","input":"사용자가 조작하는 것","output":"화면 구성과 동작 (기술 내용 포함, 구체적으로)","users":"프리웨어 — 제작자 본인 및 공유 대상"}
</SPEC_JSON>`;

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
  .app-header {
    max-width: 720px;
    margin: 0 auto 24px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .app-title {
    font-size: 1.4rem;
    font-weight: 700;
    letter-spacing: -0.3px;
  }
  .app-sub {
    font-size: 0.82rem;
    color: var(--muted);
    margin-top: 2px;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    max-width: 720px;
    margin: 0 auto 16px;
    box-shadow: var(--shadow);
  }
  .card-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 14px;
  }
  label {
    display: block;
    font-size: 0.85rem;
    color: var(--muted);
    margin-bottom: 6px;
    margin-top: 14px;
  }
  label:first-of-type { margin-top: 0; }
  input[type=text], input[type=number], select, textarea {
    width: 100%;
    padding: 10px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.15s;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--accent);
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .btn:hover { background: var(--accent-hover); transform: translateY(-1px); }
  .btn:active { transform: translateY(0); }
  .btn-ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
  }
  .btn-ghost:hover { border-color: var(--accent); color: var(--text); background: transparent; }
  .btn-success { background: var(--success); }
  .btn-success:hover { background: #16a34a; }
  .btn-danger { background: var(--danger); }
  .btn-danger:hover { background: #dc2626; }
  .btn-row {
    display: flex;
    gap: 10px;
    margin-top: 18px;
    flex-wrap: wrap;
  }
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
    margin: 16px 0;
  }
  .stat-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px;
    text-align: center;
  }
  .stat-value {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
  }
  .stat-label {
    font-size: 0.75rem;
    color: var(--muted);
    margin-top: 4px;
  }
  .status-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--surface);
    border-radius: 8px;
    font-size: 0.85rem;
    color: var(--muted);
    margin-top: 14px;
  }
  .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--muted);
    flex-shrink: 0;
  }
  .dot--on { background: var(--success); box-shadow: 0 0 6px var(--success); }
  .dot--warn { background: var(--warning); box-shadow: 0 0 6px var(--warning); }
  .dot--off { background: var(--danger); }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }
  th {
    text-align: left;
    padding: 8px 10px;
    color: var(--muted);
    font-weight: 600;
    border-bottom: 1px solid var(--border);
    font-size: 0.78rem;
    text-transform: uppercase;
  }
  td {
    padding: 10px 10px;
    border-bottom: 1px solid var(--border);
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,0.03); }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 0.72rem;
    font-weight: 600;
  }
  .badge--ok { background: rgba(34,197,94,0.15); color: var(--success); }
  .badge--warn { background: rgba(245,158,11,0.15); color: var(--warning); }
  .badge--ng { background: rgba(239,68,68,0.15); color: var(--danger); }
  progress { width: 100%; height: 8px; border-radius: 4px; overflow: hidden; appearance: none; }
  progress::-webkit-progress-bar { background: var(--surface); border-radius: 4px; }
  progress::-webkit-progress-value { background: var(--accent); border-radius: 4px; transition: width 0.3s; }`;

const GEN_SYSTEM = `You are a skilled web developer. Write a complete, immediately runnable single HTML file based on the given spec.

Rules:
- Complete HTML file (DOCTYPE, html, head, body all included)
- NO external libraries, CDN, or npm — pure HTML + CSS + JS only
- Output HTML code only — no explanation, no markdown code fences
- The file must work when double-clicked in a file browser

UI REQUIREMENTS (mandatory):
- Write ONLY a small <style> block with program-specific overrides. Do NOT write the base CSS — it is injected automatically.
- Available CSS variables: --bg, --surface, --card, --border, --accent, --success, --warning, --danger, --text, --muted, --radius, --shadow
- Available ready-made classes: .card, .card-title, .btn, .btn-success, .btn-danger, .btn-ghost, .btn-row, .stat-grid, .stat-box, .stat-value, .stat-label, .status-bar, .dot, .dot--on, .dot--warn, .dot--off, .badge, .badge--ok, .badge--warn, .badge--ng, .app-header, .app-title, .app-sub
- Page structure: start body with <div class="app-header"><div><div class="app-title">...</div><div class="app-sub">...</div></div></div> then wrap each section in <div class="card">
- Use .stat-grid + .stat-box + .stat-value for live numeric displays
- Use .btn for all buttons
- The result must look clean and professional`;

const REFINE_GEN_SYSTEM = `You are a skilled web developer. Apply the requested improvements to the existing HTML file.

Rules:
- Keep the complete HTML file structure (DOCTYPE through /html)
- NO external libraries or CDN — pure HTML + CSS + JS only
- Output HTML code only — no explanation, no markdown code fences
- Preserve and build upon the existing dark-theme base CSS`;

function makeRefineSystem(spec) {
  return `너는 방금 완성된 React 프로그램을 계속 개선해주는 도우미야. 반드시 한국어로만 대답해.

현재 프로그램:
- 이름: ${spec.name}
- 목적: ${spec.purpose}
- 사용자 입력: ${spec.input}
- 결과/출력: ${spec.output}

규칙:
- 무조건 한국어만. 다른 언어 절대 금지.
- "컴포넌트", "렌더링" 같은 기술 용어 쓰지 마.
- 질문은 짧게 한 번에 하나씩.
- 이모지 1개 사용.
- 항상 구체적인 예시를 들어줘.

첫 메시지에서 반드시:
1. "방금 [프로그램명]이 완성됐어요! 😊" 로 시작
2. 바로 개선 가능한 아이디어 3가지를 번호와 함께 제안
   예시 형태: ① 디자인 개선 — 버튼 색상, 여백 정리  ② 오류 방지 — 잘못된 값 입력 시 알림  ③ 기능 추가 — 결과 저장하기

개선 내용이 사용자와 합의되면 반드시 아래 형식으로만 출력하고 끝내:

<IMPROVE_JSON>
{"description":"개선 내용 한 줄 요약","prompt":"기존 코드에 적용할 구체적인 수정 지시 (영어 또는 한국어)"}
</IMPROVE_JSON>`;
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

function cleanCode(raw) {
  return raw
    .replace(/^```[a-zA-Z]*\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

function injectBaseCSS(html) {
  if (html.includes('id="base-ui"') || html.includes("id='base-ui'")) return html;
  const styleTag = `<style id="base-ui">${BASE_CSS}</style>`;
  if (html.includes('<head>')) return html.replace('<head>', `<head>\n${styleTag}`);
  if (html.includes('<HEAD>')) return html.replace('<HEAD>', `<HEAD>\n${styleTag}`);
  return styleTag + "\n" + html;
}

const TYPE_LIMITS = {
  motor_transfer: {
    limits: [
      "실제 모터·PLC 하드웨어 제어 불가 — 시뮬레이션 전용",
      "이동 이력 데이터 영구 저장 불가 (새로 고침 시 초기화)",
      "여러 축 동시 제어 불가 (단일 축만 표시)",
      "실제 리미트 센서·엔코더 신호 수신 불가",
    ],
    nexts: [
      "Python/Node.js 서버 연동으로 실제 모터 시리얼 제어",
      "CSV 이동 이력 자동 저장 및 엑셀 내보내기",
      "X·Y 다중 축 동기 제어 + 2D 경로 시각화",
      "속도·토크 실시간 그래프 (Chart.js 또는 SVG)",
    ],
  },
  motor_rotation: {
    limits: [
      "실제 모터 드라이버 통신 불가 — 시뮬레이션 전용",
      "RPM·토크 등 실측값 수신 불가",
      "여러 모터 동시 제어 불가",
      "회전 이력 영구 저장 불가",
    ],
    nexts: [
      "UART/ModBus 연동으로 실제 스텝 모터 제어",
      "RPM·전류 실시간 그래프 시각화",
      "다중 모터 동기/비동기 제어 시퀀서",
      "CSV/Excel 운전 이력 자동 저장",
    ],
  },
  sensor: {
    limits: [
      "실제 센서 하드웨어 연결 불가 — 더미 데이터 표시",
      "측정값 장기 저장·DB 연동 불가",
      "경보 알림(소리·이메일) 기능 없음",
      "여러 센서 동시 비교 그래프 없음",
    ],
    nexts: [
      "WebSocket/Serial 연동으로 실센서 데이터 수신",
      "InfluxDB/CSV 장기 이력 저장",
      "임계값 초과 시 소리·팝업 경보",
      "다채널 실시간 비교 차트",
    ],
  },
  process_timer: {
    limits: [
      "단계 간 실제 I/O 출력 제어 불가",
      "공정 이력 영구 저장 불가",
      "외부 시스템 연동(PLC, SCADA) 불가",
      "비상정지 후 재개 위치 복원 불가",
    ],
    nexts: [
      "REST API/MQTT로 PLC 출력 제어",
      "단계별 소요 시간 CSV 보고서 출력",
      "공정 레시피 저장·불러오기",
      "모바일 알림 연동",
    ],
  },
  data_record: {
    limits: [
      "브라우저 localStorage 한계 (~5MB) — 대용량 저장 불가",
      "여러 PC에서 데이터 공유 불가",
      "파일 직접 불러오기(드래그앤드롭) 없음",
      "자동 백업·클라우드 동기화 없음",
    ],
    nexts: [
      "Node.js 서버 + SQLite로 영구 DB 저장",
      "CSV/Excel 일괄 내보내기·가져오기",
      "공유 URL로 팀 데이터 동기화",
      "자동 이메일 보고서 발송",
    ],
  },
  inventory: {
    limits: [
      "브라우저 localStorage 한계 — 대용량 품목 관리 불가",
      "바코드·QR 스캔 연동 불가",
      "입출고 자동 알림 없음",
      "여러 사용자 동시 접근 불가",
    ],
    nexts: [
      "바코드 스캐너 웹캠 연동 (jsQR)",
      "재고 부족 이메일 자동 알림",
      "공유 서버 DB로 팀 공동 관리",
      "월별 입출고 통계 차트",
    ],
  },
  lab_diary: {
    limits: [
      "이미지·첨부파일 저장 불가",
      "키워드 전체 검색 기능 없음",
      "여러 사용자 공동 작성 불가",
      "데이터 클라우드 백업 없음",
    ],
    nexts: [
      "이미지 첨부 및 갤러리 뷰",
      "태그 기반 전문 검색",
      "Notion/Google Drive 내보내기",
      "팀 공유 실험 플랫폼",
    ],
  },
  calculator: {
    limits: [
      "계산 이력 영구 저장 불가",
      "수식 그래프 시각화 없음",
      "외부 데이터 파일 불러와 일괄 계산 불가",
      "단위 자동 변환 없음",
    ],
    nexts: [
      "수식 그래프 실시간 플로팅 (SVG/Canvas)",
      "CSV 데이터 일괄 계산 및 결과 출력",
      "계산 이력 저장 및 즐겨찾기",
      "공학 상수·단위 자동 조회",
    ],
  },
  data_analysis: {
    limits: [
      "대용량 파일(>10MB) 처리 시 브라우저 느림",
      "고급 통계(머신러닝·회귀분석) 없음",
      "실시간 스트리밍 데이터 수신 불가",
      "분석 결과 PDF 보고서 출력 불가",
    ],
    nexts: [
      "Python pandas/scipy 서버 연동으로 고급 분석",
      "머신러닝 이상값 탐지",
      "PDF/Word 보고서 자동 생성",
      "WebSocket 실시간 데이터 스트림 분석",
    ],
  },
  spectrum: {
    limits: [
      "브라우저 FFT 정밀도 제한 (float32 기반)",
      "실시간 오디오·센서 입력 없음",
      "고해상도 스펙트럼(>100k 포인트) 버벅임",
      "분석 결과 파일 저장 없음",
    ],
    nexts: [
      "WebAudio API로 실시간 마이크 FFT",
      "Python scipy.fft 서버 연동으로 정밀 분석",
      "워터폴 스펙트로그램 시각화",
      "PNG/CSV 결과 내보내기",
    ],
  },
  unit_convert: {
    limits: [
      "사용자 정의 단위 추가 불가",
      "변환 이력 저장 없음",
      "복합 단위(예: kg·m/s²) 자동 파싱 없음",
    ],
    nexts: [
      "사용자 정의 단위·변환식 등록",
      "변환 즐겨찾기 저장",
      "복합 단위 수식 파서",
    ],
  },
  compare: {
    limits: [
      "판정 이력 영구 저장 불가",
      "여러 항목 일괄 판정 불가",
      "통계 기반 공정 능력 분석(Cp·Cpk) 없음",
    ],
    nexts: [
      "CSV 일괄 판정 및 합불 보고서",
      "SPC 관리도·공정 능력 지수 계산",
      "판정 이력 Excel 자동 저장",
    ],
  },
  recipe: {
    limits: [
      "레시피 데이터 브라우저 외부 저장 불가",
      "레시피 기반 자동 실행 연동 없음",
      "팀 공유 불가",
    ],
    nexts: [
      "JSON/CSV 파일로 레시피 백업·복원",
      "PLC 연동으로 레시피 자동 적용",
      "팀 공유 레시피 서버",
    ],
  },
  report: {
    limits: [
      "PDF 직접 인쇄 레이아웃 조정 어려움",
      "Word/Excel 형식 내보내기 불가",
      "데이터 자동 수집·집계 없음",
    ],
    nexts: [
      "html2pdf.js로 완벽한 PDF 출력",
      "xlsx.js로 Excel 보고서 생성",
      "데이터 DB 연동 자동 집계 보고서",
    ],
  },
  stopwatch: {
    limits: [
      "랩 타임 이력 영구 저장 불가",
      "여러 구간 동시 측정 불가",
      "외부 이벤트 트리거 연동 없음",
    ],
    nexts: [
      "랩 이력 CSV 내보내기",
      "다채널 동시 구간 측정",
      "GPIO/센서 신호로 자동 스타트/스탑",
    ],
  },
};

function injectInstructions(html, spec) {
  const date = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const tid = spec._typeId || "";
  const meta = TYPE_META[tid] || {};
  const isSeed = !!meta.seed;
  const kindLabel = isSeed ? "🌱 씨앗형 (시뮬레이션 데모)" : "✅ 완성형";

  const limLines  = (meta.limits  || ["브라우저 내에서만 동작"]).map(l => `  ✗ ${l}`).join("\n");
  const n1Lines   = (meta.nexts1  || []).map(n => `  → ${n}`).join("\n");
  const n2Lines   = (meta.nexts2  || []).map(n => `  → ${n}`).join("\n");
  const n3Lines   = (meta.nexts3  || []).map(n => `  → ${n}`).join("\n");
  const p1 = meta.prompt1 || "이 HTML에 기능을 추가해줘. 단일 HTML 파일로 유지해줘.";
  const p2 = meta.prompt2 || "이 HTML 스펙으로 완성형 프로그램을 HTML/CSS/JS/server.js로 분리해서 만들어줘.";
  const p3 = meta.prompt3 || "고급 기능까지 포함한 완성형 프로그램을 만들어줘.";

  const seedNote = isSeed
    ? `\n━━━━━━━━ 하드웨어 연동 안내 ━━━━━━━━
  이 프로그램은 시뮬레이션 데모입니다.
  실제 하드웨어(모터, PLC, 센서 등) 연동은 아래 AI 도구로
  대화만으로 프로그램을 만들 수 있어요!\n`
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
${isSeed ? `  이 프로그램은 시뮬레이션 전용입니다.
  실제 장비 연동 시 아래 프로토콜 중 선택:
  - Modbus RTU / Modbus TCP (산업용 모터·PLC)
  - EtherCAT (고속 다축 제어)
  - 시리얼 통신 RS-232 / RS-485
  - 엔코더 피드백 연동 가능` : `  이 프로그램은 완성형으로 바로 사용 가능합니다.
  서버 연동 시 Node.js + SQLite / PostgreSQL 권장`}

[ 재생성 규칙 ]
  - 한국어 UI 유지
  - 파일 분리 권장: HTML / CSS / JS / 서버(server.js 또는 server.py)
  - 단일 파일 유지 시: <style id="base-ui"> 블록 수정 금지
══════════════════════════════════════════════════════════-->
`;
  if (html.startsWith('<!DOCTYPE') || html.startsWith('<!doctype')) {
    return html.replace(/^(<!DOCTYPE[^>]*>)/i, `$1\n${comment}`);
  }
  return comment + html;
}

function folderName(name) {
  return name.replace(/[^a-z0-9가-힣A-Z]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "my-program";
}

const PROGRAM_TYPES = [
  { id: "motor_transfer", label: "모터 이송",      icon: "↔️",  desc: "수평·수직 이송, 왕복 동작", seed: true },
  { id: "motor_rotation", label: "모터 회전",      icon: "🔄",  desc: "회전 제어, 속도 조절",     seed: true },
  { id: "sensor",         label: "센서 측정",      icon: "📡",  desc: "온도·진동·압력 모니터링",  seed: true },
  { id: "process_timer",  label: "공정 타이머",    icon: "⏱️",  desc: "순서 자동화, 단계별 공정" },
  { id: "data_record",    label: "데이터 기록",    icon: "📋",  desc: "관리 대장, 작업 이력" },
  { id: "inventory",      label: "재고/부품 관리", icon: "🗃️",  desc: "부품·소모품 재고 추적" },
  { id: "lab_diary",      label: "실험 일지",      icon: "📓",  desc: "날짜별 실험 기록·조회" },
  { id: "calculator",     label: "계산기",         icon: "🔢",  desc: "공식·수식 계산" },
  { id: "data_analysis",  label: "데이터 분석",    icon: "📊",  desc: "통계, FFT, 그래프 해석" },
  { id: "spectrum",       label: "스펙트럼 분석",  icon: "🌈",  desc: "신호·분광 데이터 분석" },
  { id: "unit_convert",   label: "단위 변환",      icon: "⚖️",  desc: "물리 단위·좌표계 변환" },
  { id: "compare",        label: "비교/검증",      icon: "✅",  desc: "합불 판정, 기준값 비교" },
  { id: "recipe",         label: "실험 조건 관리", icon: "🧪",  desc: "레시피 저장·불러오기" },
  { id: "report",         label: "결과 정리",      icon: "📄",  desc: "리포트, 보고서, 출력" },
  { id: "stopwatch",      label: "타이머/스톱워치",icon: "⏱️",  desc: "카운트다운·스톱워치" },
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

  const inputItems  = answered.slice(0, Math.ceil(answered.length / 2));
  const outputItems = answered.slice(Math.ceil(answered.length / 2));

  const fmt = items => items.map(i => `${i.label}: ${i.value}`).join("\n");

  const inputText  = fmt(inputItems)  || type.desc;
  const outputText = fmt(outputItems) || type.desc;
  const detailText = answered.map(i => `• ${i.label}: ${i.value}`).join("\n")
    + (extraNotes ? `\n• 추가 요구사항: ${extraNotes}` : "");

  return {
    name: `${type.label} 프로그램`,
    purpose: `${type.label} — ${type.desc}`,
    input: inputText,
    output: outputText + (extraNotes ? `\n추가 요구사항: ${extraNotes}` : ""),
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

export default function AiProgramAssistant({ onBack }) {
  const [phase, setPhase] = useState("init");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [spec, setSpec] = useState(null);
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("");
  const [progress, setProgress] = useState(0);
  const [genLog, setGenLog] = useState("");
  const [resultPath, setResultPath] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [history, setHistory] = useState(loadHistory);
  const [refineMessages, setRefineMessages] = useState([]);
  const [refineInput, setRefineInput] = useState("");
  const [refineThinking, setRefineThinking] = useState(false);
  const [pendingImprovement, setPendingImprovement] = useState(null);
  const [refineCount, setRefineCount] = useState(0);
  const [generatedCode, setGeneratedCode] = useState("");
  const [applyingImprovement, setApplyingImprovement] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState({});
  const [extraNotes, setExtraNotes] = useState("");
  const [wizardShowExtra, setWizardShowExtra] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const userMsgCount = messages.filter(m => m.role === "user").length;

  useEffect(() => { fetchModels(); }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking, genLog]);

  useEffect(() => {
    if (phase === "chat" && !thinking) {
      inputRef.current?.focus();
    }
  }, [phase, thinking]);

  async function fetchModels() {
    try {
      const resp = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(4000) });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      const list = (data.models || []).map(m => m.name);
      if (list.length === 0) throw new Error("no models");
      setModels(list);
      setModel(list[0]);
      setPhase("typepick");
      setMessages([]);
    } catch {
      // Electron에서는 자동 설치 마법사로, 웹에서는 오류 안내
      if (window.desktopApp?.ollamaStatus) {
        setPhase("wizard");
      } else {
        setErrorMsg(
          "Ollama에 연결할 수 없어요.\n\n" +
          "터미널에서 아래 명령어를 실행해 주세요:\n\n  ollama serve\n\n" +
          "Ollama가 설치되지 않았다면 https://ollama.com 에서 먼저 설치해 주세요."
        );
        setPhase("error");
      }
    }
  }

  function handleWizardComplete(modelName) {
    setModel(modelName);
    setModels([modelName]);
    setPhase("typepick");
    setMessages([]);
  }

  function handleTypeCardClick(type) {
    if (TYPE_QUESTIONS[type.id] && TYPE_QUESTIONS[type.id].length > 0) {
      setSelectedType(type);
      setWizardStep(0);
      setWizardAnswers({});
      setExtraNotes("");
      setWizardShowExtra(false);
      setPhase("wizard_qa");
    } else {
      startChatWithType(`${type.label} 프로그램을 만들고 싶어`);
    }
  }

  function handleWizardChoice(qId, choice) {
    const newAnswers = { ...wizardAnswers, [qId]: choice };
    setWizardAnswers(newAnswers);
    const questions = TYPE_QUESTIONS[selectedType.id];
    const nextStep = wizardStep + 1;
    if (nextStep >= questions.length) {
      setWizardShowExtra(true);
    } else {
      setWizardStep(nextStep);
    }
  }

  function handleWizardBack() {
    if (wizardShowExtra) {
      setWizardShowExtra(false);
      return;
    }
    if (wizardStep > 0) {
      setWizardStep(wizardStep - 1);
    } else {
      setPhase("typepick");
      setSelectedType(null);
    }
  }

  function handleWizardFinish() {
    const compiled = compileWizardSpec(selectedType, wizardAnswers, extraNotes);
    setSpec(compiled);
    setPhase("confirm");
  }

  async function startChatWithType(userText) {
    const initMessages = [{ role: "user", content: userText }];
    setPhase("chat");
    setMessages([...initMessages, { role: "assistant", content: "" }]);
    setThinking(true);
    try {
      const resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: CHAT_SYSTEM }, ...initMessages],
          stream: true,
        }),
      });
      let full = "";
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.message?.content) {
              full += obj.message.content;
              setMessages(prev => { const a = [...prev]; a[a.length - 1] = { role: "assistant", content: full }; return a; });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "오류가 발생했어요. 다시 시도해 주세요. 😅" }]);
    } finally {
      setThinking(false);
    }
  }

  async function sendMessage(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text || thinking) return;
    setInput("");

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setThinking(true);

    try {
      const resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: CHAT_SYSTEM }, ...nextMessages],
          stream: true,
        }),
      });

      let full = "";
      const reader = resp.body.getReader();
      const dec = new TextDecoder();

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.message?.content) {
              full += obj.message.content;
              setMessages(prev => {
                const arr = [...prev];
                arr[arr.length - 1] = { role: "assistant", content: full };
                return arr;
              });
            }
          } catch {}
        }
      }

      const m = full.match(/<SPEC_JSON>([\s\S]*?)<\/SPEC_JSON>/);
      if (m) {
        try {
          const parsed = JSON.parse(m[1].trim());
          setSpec(parsed);
          setPhase("confirm");
        } catch {}
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "오류가 발생했어요. 다시 시도해 주세요. 😅" }]);
    } finally {
      setThinking(false);
    }
  }

  async function requestSummary() {
    await sendMessage("지금까지 말씀드린 내용을 바탕으로 스펙을 정리해 주세요.");
  }

  async function generateProject() {
    setPhase("generating");
    setProgress(5);
    setGenLog("");

    try {
      // ── 템플릿 우선: 해당 유형 템플릿이 있으면 AI 호출 없이 즉시 생성
      const tmplFn = TEMPLATE_MAP[spec._typeId];
      let htmlCode = "";

      if (tmplFn) {
        setGenLog("템플릿에서 프로그램 생성 중...");
        setProgress(60);
        htmlCode = wrapTemplate(tmplFn(spec), spec);
        setProgress(85);
        setGenLog(htmlCode);
      } else {
        // ── 템플릿 없는 유형 → 기존 AI 생성 방식
        const prompt = `프로그램명: ${spec.name}
목적: ${spec.purpose}

상세 요구사항:
${spec._detail || `${spec.input}\n${spec.output}`}

사용 대상: ${spec.users}

위 스펙으로 단일 HTML 파일을 작성해주세요.`;

        setProgress(15);

        const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, system: GEN_SYSTEM, prompt, stream: true }),
        });

        const reader = resp.body.getReader();
        const dec = new TextDecoder();
        let tokenCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of dec.decode(value).split("\n")) {
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line);
              if (obj.response) {
                htmlCode += obj.response;
                tokenCount++;
                if (tokenCount % 10 === 0) {
                  setGenLog(cleanCode(htmlCode));
                  setProgress(p => Math.min(82, p + 0.4));
                }
              }
            } catch {}
          }
        }
        htmlCode = cleanCode(htmlCode);
      }

      htmlCode = injectInstructions(injectBaseCSS(htmlCode), spec);
      setGeneratedCode(htmlCode);
      setGenLog(htmlCode);
      setProgress(90);

      const fName = htmlFileName(spec.name);
      let savedPath = "";

      if (window.desktopApp?.saveHtmlDialog) {
        // Electron: 저장 위치 선택 다이얼로그
        const chosenPath = await window.desktopApp.saveHtmlDialog(fName.replace(".html", ""));
        if (!chosenPath) { setPhase("confirm"); return; } // 취소 시 돌아가기
        await window.desktopApp.writeFile(chosenPath, htmlCode);
        savedPath = chosenPath;
      } else {
        // 웹 브라우저: 다운로드
        downloadHtml(fName, htmlCode);
        savedPath = `${fName} (다운로드됨)`;
      }

      setResultPath(savedPath);

      const entry = {
        id: Date.now(),
        name: spec.name,
        purpose: spec.purpose,
        path: savedPath,
        code: htmlCode,
        date: new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      };
      setHistory(prev => {
        const next = [entry, ...prev].slice(0, 20);
        saveHistory(next);
        return next;
      });

      setProgress(100);
      setPhase("done");
    } catch {
      setErrorMsg("프로그램 생성 중 오류가 발생했어요. 다시 시도해 주세요.");
      setPhase("error");
    }
  }

  async function openFile() {
    if (window.desktopApp?.openFolder) {
      await window.desktopApp.openFolder(resultPath);
    }
  }

  function resetToChat() {
    setPhase("typepick");
    setSpec(null);
    setGenLog("");
    setProgress(0);
    setResultPath("");
    setMessages([]);
    setSelectedType(null);
    setWizardStep(0);
    setWizardAnswers({});
    setExtraNotes("");
    setWizardShowExtra(false);
  }

  function backToEdit() {
    if (selectedType) {
      setSpec(null);
      setWizardShowExtra(true);
      setPhase("wizard_qa");
      return;
    }
    setPhase("chat");
    setSpec(null);
    setMessages(prev => [
      ...prev,
      { role: "assistant", content: "수정해 드릴게요! 어떤 부분을 바꾸고 싶으세요? 😊" },
    ]);
  }

  async function startRefine() {
    setPhase("refine");
    setRefineMessages([]);
    setRefineThinking(true);
    setPendingImprovement(null);
    try {
      const resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: makeRefineSystem(spec) },
            { role: "user", content: "시작해줘" },
          ],
          stream: true,
        }),
      });
      let full = "";
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      setRefineMessages([{ role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.message?.content) {
              full += obj.message.content;
              setRefineMessages([{ role: "assistant", content: full }]);
            }
          } catch {}
        }
      }
    } catch {
      setRefineMessages([{ role: "assistant", content: "오류가 발생했어요. 😅" }]);
    } finally {
      setRefineThinking(false);
    }
  }

  async function sendRefineMessage() {
    const text = refineInput.trim();
    if (!text || refineThinking || pendingImprovement) return;
    setRefineInput("");
    const nextMessages = [...refineMessages, { role: "user", content: text }];
    setRefineMessages(nextMessages);
    setRefineThinking(true);
    try {
      const resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: makeRefineSystem(spec) }, ...nextMessages],
          stream: true,
        }),
      });
      let full = "";
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      setRefineMessages(prev => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.message?.content) {
              full += obj.message.content;
              setRefineMessages(prev => {
                const arr = [...prev];
                arr[arr.length - 1] = { role: "assistant", content: full };
                return arr;
              });
            }
          } catch {}
        }
      }
      const m = full.match(/<IMPROVE_JSON>([\s\S]*?)<\/IMPROVE_JSON>/);
      if (m) {
        try { setPendingImprovement(JSON.parse(m[1].trim())); } catch {}
      }
    } catch {
      setRefineMessages(prev => [...prev, { role: "assistant", content: "오류가 발생했어요. 😅" }]);
    } finally {
      setRefineThinking(false);
    }
  }

  async function applyImprovement() {
    if (!pendingImprovement || applyingImprovement) return;
    const improvement = pendingImprovement;
    setPendingImprovement(null);
    setApplyingImprovement(true);
    setRefineMessages(prev => [...prev, {
      role: "assistant",
      content: `🔧 "${improvement.description}" 적용 중이에요… 잠시만 기다려 주세요!`,
    }]);
    try {
      const prompt = `기존 코드:\n\`\`\`jsx\n${generatedCode}\n\`\`\`\n\n개선 요청: ${improvement.prompt}\n\n위 코드에 개선사항을 적용한 완성된 App.jsx를 작성해주세요.`;
      const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, system: REFINE_GEN_SYSTEM, prompt, stream: true }),
      });
      let newCode = "";
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.response) newCode += obj.response;
          } catch {}
        }
      }
      newCode = injectBaseCSS(cleanCode(newCode));
      setGeneratedCode(newCode);
      setRefineCount(c => c + 1);
      if (window.desktopApp?.writeFile && resultPath && !resultPath.includes("다운로드됨")) {
        await window.desktopApp.writeFile(resultPath, newCode);
      } else {
        downloadHtml(htmlFileName(spec.name), newCode);
      }
      setRefineMessages(prev => {
        const filtered = prev.filter(m => !m.content.includes("적용 중이에요"));
        return [...filtered, {
          role: "assistant",
          content: `✅ "${improvement.description}" 완료!\n\n파일이 업데이트됐어요 😊 브라우저를 새로고침하면 달라진 모습을 볼 수 있어요.\n\n더 개선하고 싶은 게 있으신가요?`,
        }];
      });
    } catch {
      setRefineMessages(prev => [...prev, { role: "assistant", content: "개선 적용 중 오류가 발생했어요. 다시 시도해 주세요. 😅" }]);
    } finally {
      setApplyingImprovement(false);
    }
  }

  return (
    <div className="app app--ai">
      <header className="app-header app-header--ai">
        <div>
          <p className="page-kicker">MODE 07</p>
          <h1>프로그램 설계소</h1>
          <p>아이디어만 있으면 기초 프로그램을 만들 수 있어요</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {models.length > 1 && (
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="ai-model-select"
            >
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          {models.length === 1 && (
            <span className="ai-model-badge">{model}</span>
          )}
          {history.length > 0 && (
            <button
              type="button"
              className="ai-history-btn"
              onClick={() => setPhase(phase === "history" ? "typepick" : "history")}
            >
              {phase === "history" ? "← 채팅으로" : `기록 ${history.length}`}
            </button>
          )}
          {(phase === "chat" || phase === "confirm" || phase === "refine" || phase === "typepick" || phase === "wizard_qa") && (
            <button type="button" className="ai-reset-btn" onClick={resetToChat} title="대화 초기화">
              ↺ 리셋
            </button>
          )}
          <button type="button" className="ghost-button" onClick={onBack}>← 홈으로</button>
        </div>
      </header>

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
                    <span>📁</span>
                    <span>{entry.path}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {window.desktopApp?.openFolder && (
                      <button
                        type="button"
                        className="ghost-button"
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        onClick={() => window.desktopApp.openFolder(entry.path)}
                      >
                        폴더 열기
                      </button>
                    )}
                    {entry.code && (
                      <button
                        type="button"
                        className="ghost-button"
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        onClick={() => downloadHtml(htmlFileName(entry.name), entry.code)}
                      >
                        ⬇ 다운로드
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

      {phase === "wizard" && (
        <OllamaSetupWizard onComplete={handleWizardComplete} />
      )}

      {phase === "init" && (
        <div className="ai-center-box">
          <div className="ai-spinner" />
          <p style={{ color: "var(--muted)", marginTop: 16 }}>Ollama 연결 확인 중…</p>
        </div>
      )}

      {phase === "typepick" && (
        <div className="ai-typepick">
          <p className="ai-typepick-title">어떤 프로그램을 만들고 싶으신가요?</p>
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.78rem", color: "#7b7f93", display: "flex", alignItems: "center", gap: "4px" }}>✅ 완성형 — 바로 사용 가능</span>
            <span style={{ fontSize: "0.78rem", color: "#7b7f93", display: "flex", alignItems: "center", gap: "4px" }}>🌱 씨앗형 — 시뮬레이션, AI로 실제 제어 완성</span>
          </div>
          <div className="ai-typepick-grid">
            {PROGRAM_TYPES.map(t => (
              <button
                key={t.id}
                className="ai-typepick-card"
                onClick={() => handleTypeCardClick(t)}
              >
                <span className="ai-typepick-icon">{t.icon}</span>
                <span className="ai-typepick-label">{t.label}</span>
                <span className="ai-typepick-desc">{t.desc}</span>
                <span style={{ fontSize: "0.7rem", marginTop: "4px", color: t.seed ? "#6c63ff" : "#22c55e" }}>
                  {t.seed ? "🌱 씨앗형" : "✅ 완성형"}
                </span>
              </button>
            ))}
          </div>
          <button
            className="ai-typepick-custom"
            onClick={() => {
              setPhase("chat");
              setMessages([{ role: "assistant", content: "어떤 프로그램을 만들고 싶으신가요? 편하게 말씀해 주세요 😊" }]);
            }}
          >
            ✏️ 목록에 없어요, 직접 말할게요
          </button>
        </div>
      )}

      {phase === "wizard_qa" && selectedType && (() => {
        const questions = TYPE_QUESTIONS[selectedType.id] || [];
        const currentQ = questions[wizardStep];
        const totalSteps = questions.length;
        const progress = Math.round((wizardStep / totalSteps) * 100);

        return (
          <div className="ai-wizard-qa">
            <div className="ai-wizard-header">
              <span className="ai-wizard-type-icon">{selectedType.icon}</span>
              <span className="ai-wizard-type-label">{selectedType.label}</span>
              <button className="ai-wizard-back" onClick={handleWizardBack}>← 뒤로</button>
            </div>

            <div className="ai-wizard-progress-bar">
              <div className="ai-wizard-progress-fill" style={{ width: `${wizardShowExtra ? 100 : progress}%` }} />
            </div>
            <p className="ai-wizard-progress-text">
              {wizardShowExtra ? `완료!` : `${wizardStep + 1} / ${totalSteps}`}
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
                        className={`ai-wizard-choice ${wizardAnswers[currentQ.id] === c ? "ai-wizard-choice--selected" : ""}`}
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

      {phase === "error" && (
        <div className="ai-center-box">
          <div className="ai-error-icon">!</div>
          <pre className="ai-error-msg">{errorMsg}</pre>
          <button type="button" className="button" onClick={fetchModels} style={{ marginTop: 20 }}>
            다시 시도
          </button>
        </div>
      )}

      {(phase === "chat" || phase === "confirm") && (
        <div className={`ai-layout${phase === "confirm" ? " ai-layout--confirm" : ""}`}>
          <div className="ai-chat-pane">
            <div className="ai-chat-scroll">
              {messages
                .filter(m => !m.content.includes("<SPEC_JSON>"))
                .map((msg, i) => (
                  <div key={i} className={`ai-bubble ai-bubble--${msg.role}`}>
                    {msg.role === "assistant" && <span className="ai-avatar">🤖</span>}
                    <div className="ai-bubble-text">
                      {msg.content.split("\n").map((line, j) => (
                        <span key={j}>{line}{j < msg.content.split("\n").length - 1 && <br />}</span>
                      ))}
                    </div>
                    {msg.role === "user" && <span className="ai-avatar">💬</span>}
                  </div>
                ))}

              {thinking && (
                <div className="ai-bubble ai-bubble--assistant">
                  <span className="ai-avatar">🤖</span>
                  <div className="ai-bubble-text ai-typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="ai-input-row">
              {userMsgCount >= 3 && !thinking && phase === "chat" && (
                <button
                  type="button"
                  className="ghost-button ai-summary-btn"
                  onClick={requestSummary}
                  title="AI에게 스펙 정리 요청"
                >
                  스펙 정리
                </button>
              )}
              <input
                ref={inputRef}
                className="ai-input"
                placeholder="메시지를 입력하세요…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                disabled={thinking || phase === "confirm"}
              />
              <button
                type="button"
                className="button"
                onClick={() => sendMessage()}
                disabled={!input.trim() || thinking || phase === "confirm"}
              >
                전송
              </button>
            </div>
          </div>

          {phase === "confirm" && spec && (
            <div className="ai-confirm-pane">
              <p className="page-kicker" style={{ marginBottom: 8 }}>스펙 확인</p>
              <h2 style={{ marginBottom: 20, fontSize: "1.4rem" }}>이렇게 만들어 드릴까요?</h2>

              <div className="ai-spec-card">
                <div className="ai-spec-row">
                  <span className="ai-spec-label">프로그램명</span>
                  <span className="ai-spec-value">{spec.name}</span>
                </div>
                <div className="ai-spec-row">
                  <span className="ai-spec-label">목적</span>
                  <span className="ai-spec-value">{spec.purpose}</span>
                </div>
                <div className="ai-spec-row">
                  <span className="ai-spec-label">입력</span>
                  <span className="ai-spec-value">{spec.input}</span>
                </div>
                <div className="ai-spec-row">
                  <span className="ai-spec-label">출력</span>
                  <span className="ai-spec-value">{spec.output}</span>
                </div>
                <div className="ai-spec-row">
                  <span className="ai-spec-label">사용 대상</span>
                  <span className="ai-spec-value">{spec.users}</span>
                </div>
              </div>

              {SEED_TYPES.has(spec._typeId) && (
                <div style={{ background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                  <p style={{ fontWeight: 700, color: "#6c63ff", marginBottom: 6 }}>🌱 씨앗형 프로그램</p>
                  <p style={{ fontSize: 13, color: "#9ba5bb", lineHeight: 1.6 }}>
                    이 프로그램은 시뮬레이션 데모입니다. 실제 하드웨어 연동은 생성된 파일을 Claude / ChatGPT에 넣어 완성하세요.<br/>
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
                  파일 하나만 저장돼요. 더블클릭하면 바로 실행!
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <button type="button" className="button" onClick={generateProject} style={{ flex: 1 }}>
                  네, 만들어주세요!
                </button>
                <button type="button" className="ghost-button" onClick={backToEdit}>
                  수정할게요
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "generating" && (
        <div className="ai-generating">
          <div className="ai-gen-header">
            <p className="page-kicker">생성 중</p>
            <h2>프로그램을 만들고 있어요…</h2>
            <p style={{ color: "var(--muted)", marginTop: 6 }}>
              AI가 코드를 작성하는 중입니다. 잠시만 기다려 주세요.
            </p>
          </div>

          <div className="ai-progress-wrap">
            <div className="ai-progress-bar">
              <div className="ai-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="ai-progress-pct">{Math.round(progress)}%</span>
          </div>

          {genLog && (
            <div className="ai-code-preview">
              <p className="ai-code-label">App.jsx 생성 중…</p>
              <pre className="ai-code-scroll">{genLog}</pre>
            </div>
          )}
        </div>
      )}

      {phase === "done" && (
        <div className="ai-done">
          <div className="ai-done-icon">✅</div>
          <h2>완성됐어요!</h2>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            {window.desktopApp?.openFolder
              ? "아래 폴더에 프로그램 파일이 저장됐어요 😊"
              : "⚠️ 데스크톱 앱(npm run desktop:dev)에서 실행해야 실제로 파일이 생성돼요"}
          </p>

          <div className="ai-path-card" style={{ cursor: window.desktopApp?.openFolder ? "pointer" : "default" }} onClick={window.desktopApp?.openFolder ? openFolder : undefined}>
            <span className="ai-path-icon">📁</span>
            <span className="ai-path-text">{resultPath}</span>
          </div>

          <div className="ai-done-steps">
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>실행 방법</p>
            <div className="ai-step">
              <span className="ai-step-num">1</span>
              <div>
                아래 <strong>파일 열기</strong> 버튼을 누르면 브라우저에서 바로 실행돼요 🚀
              </div>
            </div>
            <div className="ai-step">
              <span className="ai-step-num">2</span>
              <div>
                파일을 다른 사람에게 보낼 때는 <strong>.html 파일 하나</strong>만 보내면 돼요 — 받는 사람도 더블클릭하면 바로 열려요!
              </div>
            </div>
            <div className="ai-step">
              <span className="ai-step-num">3</span>
              <div>
                기능을 더 추가하고 싶다면 아래 <strong>✨ 계속 개선하기</strong>를 눌러 AI와 함께 발전시켜 보세요
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap", justifyContent: "center" }}>
            <button type="button" className="button" onClick={openFile}>
              🌐 파일 열기
            </button>
            <button type="button" className="button ai-refine-start-btn" onClick={startRefine}>
              ✨ 계속 개선하기
            </button>
            <button type="button" className="ghost-button" onClick={resetToChat}>
              처음으로
            </button>
          </div>
        </div>
      )}
      {phase === "refine" && (
        <div className="ai-layout ai-layout--confirm">
          <div className="ai-chat-pane">
            <div className="ai-refine-topbar">
              <span className="ai-refine-badge">✨ 개선 모드</span>
              {refineCount > 0 && (
                <span className="ai-refine-count">{refineCount}번 개선 완료</span>
              )}
            </div>

            <div className="ai-chat-scroll">
              {refineMessages
                .filter(m => !m.content.includes("<IMPROVE_JSON>"))
                .map((msg, i) => (
                  <div key={i} className={`ai-bubble ai-bubble--${msg.role}`}>
                    {msg.role === "assistant" && <span className="ai-avatar">🤖</span>}
                    <div className="ai-bubble-text">
                      {msg.content.split("\n").map((line, j) => (
                        <span key={j}>{line}{j < msg.content.split("\n").length - 1 && <br />}</span>
                      ))}
                    </div>
                    {msg.role === "user" && <span className="ai-avatar">💬</span>}
                  </div>
                ))}
              {refineThinking && (
                <div className="ai-bubble ai-bubble--assistant">
                  <span className="ai-avatar">🤖</span>
                  <div className="ai-bubble-text ai-typing"><span /><span /><span /></div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {pendingImprovement && !applyingImprovement && (
              <div className="ai-improve-confirm">
                <span className="ai-improve-desc">🔧 {pendingImprovement.description}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="button" onClick={applyImprovement}>
                    적용하기
                  </button>
                  <button type="button" className="ghost-button" onClick={() => setPendingImprovement(null)}>
                    취소
                  </button>
                </div>
              </div>
            )}
            {applyingImprovement && (
              <div className="ai-improve-applying">
                <div className="ai-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                코드 업데이트 중…
              </div>
            )}

            <div className="ai-input-row">
              <input
                ref={inputRef}
                className="ai-input"
                placeholder="어떻게 개선하고 싶으세요?…"
                value={refineInput}
                onChange={e => setRefineInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendRefineMessage(); } }}
                disabled={refineThinking || !!pendingImprovement || applyingImprovement}
              />
              <button
                type="button"
                className="button"
                onClick={sendRefineMessage}
                disabled={!refineInput.trim() || refineThinking || !!pendingImprovement || applyingImprovement}
              >
                전송
              </button>
            </div>
          </div>

          <div className="ai-confirm-pane">
            <p className="page-kicker" style={{ color: "#a78bfa", marginBottom: 8 }}>생성된 프로그램</p>
            <div className="ai-spec-card" style={{ marginBottom: 16 }}>
              <div className="ai-spec-row">
                <span className="ai-spec-label">이름</span>
                <span className="ai-spec-value">{spec?.name}</span>
              </div>
              <div className="ai-spec-row">
                <span className="ai-spec-label">목적</span>
                <span className="ai-spec-value">{spec?.purpose}</span>
              </div>
              <div className="ai-spec-row">
                <span className="ai-spec-label">개선 횟수</span>
                <span className="ai-spec-value">{refineCount}회</span>
              </div>
            </div>

            <div className="ai-path-card" style={{ marginBottom: 16, cursor: window.desktopApp?.openFolder ? "pointer" : "default" }} onClick={window.desktopApp?.openFolder ? openFolder : undefined}>
              <span className="ai-path-icon">📁</span>
              <span className="ai-path-text" style={{ fontSize: 11 }}>{resultPath}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {window.desktopApp?.openFolder && (
                <button type="button" className="ghost-button" style={{ width: "100%" }} onClick={openFile}>
                  🌐 파일 열기
                </button>
              )}
              <button type="button" className="ghost-button" style={{ width: "100%" }} onClick={resetToChat}>
                새 프로그램 만들기
              </button>
            </div>

            <div className="ai-refine-tip">
              <p>💡 개선 팁</p>
              <ul>
                <li>디자인 바꾸고 싶으면 "색상을 파란색으로"</li>
                <li>기능 추가는 "저장 버튼 넣어줘"</li>
                <li>오류 수정은 "이 부분이 안 돼요"</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
