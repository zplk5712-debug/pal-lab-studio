import { lazy, Suspense, useEffect, useState } from "react";

// 코드 분할 — 각 모듈은 해당 탭을 열 때만 로드됨 (단, 카드에 마우스를 올리면 미리 받아둠)
const loadMotorSimulator         = () => import("./MotorSimulator");
const loadLoadCalculator         = () => import("./LoadCalculator");
const loadProductDatabaseManager = () => import("./ProductDatabaseManager");
const loadThermalAnalyzer        = () => import("./ThermalAnalyzer");
const loadProgramDesigner        = () => import("./ProgramDesigner");
const loadFeedbackBoard          = () => import("./FeedbackBoard");
const loadDocumentConverter      = () => import("./DocumentConverter");

const MotorSimulator         = lazy(loadMotorSimulator);
const LoadCalculator         = lazy(loadLoadCalculator);
const ProductDatabaseManager = lazy(loadProductDatabaseManager);
const ThermalAnalyzer        = lazy(loadThermalAnalyzer);
const ProgramDesigner        = lazy(loadProgramDesigner);
const FeedbackBoard          = lazy(loadFeedbackBoard);
const DocumentConverter      = lazy(loadDocumentConverter);

const PAGE_PRELOADERS = {
  motor: loadMotorSimulator,
  load: loadLoadCalculator,
  db: loadProductDatabaseManager,
  thermal: loadThermalAnalyzer,
  "ai-assistant": loadProgramDesigner,
  board: loadFeedbackBoard,
  converter: loadDocumentConverter,
};

const preloadedPages = new Set();
function preloadPage(pageId) {
  if (preloadedPages.has(pageId)) {
    return;
  }
  const loader = PAGE_PRELOADERS[pageId];
  if (loader) {
    preloadedPages.add(pageId);
    loader().catch(() => preloadedPages.delete(pageId));
  }
}

function PageLoader() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100vh", color:"#7a8fa8", fontSize:14 }}>
      로딩 중…
    </div>
  );
}
import { LM_GUIDE_DATABASE } from "./data/lmGuideDatabase";
import { ENCODER_DATABASE } from "./data/encoderDatabase";
import { VACUUM_DATABASE } from "./data/vacuumDatabase";
import { VACUUM_PUMP_DATABASE } from "./data/vacuumPumpDatabase";
import { VACUUM_VALVE_DATABASE } from "./data/vacuumValveDatabase";
import { VACUUM_MOTION_DATABASE } from "./data/vacuumMotionDatabase";
import { VACUUM_GAUGE_DATABASE } from "./data/vacuumGaugeDatabase";
import { MOTOR_DATABASE } from "./data/motorDatabase";
import { REDUCER_DATABASE } from "./data/reducerDatabase";
import { BALL_SCREW_DATABASE } from "./data/ballScrewDatabase";
import { ELECTRIC_ACTUATOR_DATABASE } from "./data/electricActuatorDatabase";
import {
  BALL_SCREW_FIELDS,
  ELECTRIC_ACTUATOR_FIELDS,
  ENCODER_FIELDS,
  LM_GUIDE_FIELDS,
  MOTOR_FIELDS,
  REDUCER_FIELDS,
  VACUUM_FIELDS,
  VACUUM_PUMP_FIELDS,
  VACUUM_VALVE_FIELDS,
  VACUUM_MOTION_FIELDS,
  VACUUM_GAUGE_FIELDS,
} from "./data/productDbSchemas";
import "./App.css";

const PRODUCT_DB_STORAGE_KEYS = {
  motor: "motor-simulator-react:motor-db:v1",
  reducer: "motor-simulator-react:reducer-db:v1",
  ballScrew: "motor-simulator-react:ball-screw-db:v1",
  electricActuator: "motor-simulator-react:electric-actuator-db:v1",
  lmGuide: "motor-simulator-react:lm-guide-db:v1",
  encoder: "motor-simulator-react:encoder-db:v1",
  vacuum: "motor-simulator-react:vacuum-db:v1",
  vacuumPump: "motor-simulator-react:vacuum-pump-db:v1",
  vacuumValve: "motor-simulator-react:vacuum-valve-db:v1",
  vacuumMotion: "motor-simulator-react:vacuum-motion-db:v1",
  vacuumGauge: "motor-simulator-react:vacuum-gauge-db:v1",
};

const PRODUCT_DB_SEED = {
  motor: MOTOR_DATABASE,
  reducer: REDUCER_DATABASE,
  ballScrew: BALL_SCREW_DATABASE,
  electricActuator: ELECTRIC_ACTUATOR_DATABASE,
  lmGuide: LM_GUIDE_DATABASE,
  encoder: ENCODER_DATABASE,
  vacuum: VACUUM_DATABASE,
  vacuumPump: VACUUM_PUMP_DATABASE,
  vacuumValve: VACUUM_VALVE_DATABASE,
  vacuumMotion: VACUUM_MOTION_DATABASE,
  vacuumGauge: VACUUM_GAUGE_DATABASE,
};

const PRODUCT_DB_FIELDS_BY_KEY = {
  motor: MOTOR_FIELDS,
  reducer: REDUCER_FIELDS,
  ballScrew: BALL_SCREW_FIELDS,
  electricActuator: ELECTRIC_ACTUATOR_FIELDS,
  lmGuide: LM_GUIDE_FIELDS,
  encoder: ENCODER_FIELDS,
  vacuum: VACUUM_FIELDS,
  vacuumPump: VACUUM_PUMP_FIELDS,
  vacuumValve: VACUUM_VALVE_FIELDS,
  vacuumMotion: VACUUM_MOTION_FIELDS,
  vacuumGauge: VACUUM_GAUGE_FIELDS,
};

const PRODUCT_DB_KEYS = Object.keys(PRODUCT_DB_SEED);

function sanitizeStoredDatabase(rawItems, fallbackItems, fields) {
  if (!Array.isArray(rawItems)) {
    return fallbackItems;
  }

  const sanitizedItems = rawItems
    .filter((item) => item && typeof item === "object")
    .map((item) =>
      fields.reduce((nextItem, field) => {
        nextItem[field] = item[field] ?? null;
        return nextItem;
      }, {}),
    )
    .filter((item) => typeof item.id === "string" && item.id.trim() !== "");

  if (sanitizedItems.length === 0) {
    return fallbackItems;
  }

  const storedIds = new Set(sanitizedItems.map((item) => item.id));
  const missingSeedItems = fallbackItems.filter((item) => !storedIds.has(item.id));

  return [...sanitizedItems, ...missingSeedItems];
}

function readStoredDatabase(storageKey, fallbackItems, fields) {
  if (typeof window === "undefined") {
    return fallbackItems;
  }

  try {
    const savedValue = window.localStorage.getItem(storageKey);
    if (!savedValue) {
      return fallbackItems;
    }

    return sanitizeStoredDatabase(JSON.parse(savedValue), fallbackItems, fields);
  } catch (error) {
    console.warn(`Failed to read persisted database for ${storageKey}.`, error);
    return fallbackItems;
  }
}

async function hydrateDesktopDatabase(databaseKey, fallbackItems, setter) {
  if (typeof window === "undefined" || !window.desktopApp?.readDatabase) {
    return;
  }

  try {
    const savedItems = await window.desktopApp.readDatabase(databaseKey);
    if (savedItems) {
      setter(sanitizeStoredDatabase(savedItems, fallbackItems, PRODUCT_DB_FIELDS_BY_KEY[databaseKey]));
    }
  } catch (error) {
    console.warn(`Failed to read desktop database for ${databaseKey}.`, error);
  }
}

const TOOLS = [
  {
    id: "motor",
    title: "모션 설계 도우미",
    description:
      "하중, 이송 거리, 속도만 넣으면 모터, 감속기, 볼스크류, LM가이드, 엔코더를 패키지로 추천합니다.",
    status: "사용 가능",
    caption: "통합 구동계 추천",
    actionLabel: "열기",
  },
  {
    id: "load",
    title: "하중 계산",
    description: "형상, 소재, 수량, 안전율 또는 수동 하중 입력으로 중량과 안전율 반영 하중을 계산합니다.",
    status: "사용 가능",
    caption: "Load Calculator",
    actionLabel: "열기",
  },
  {
    id: "thermal",
    title: "열해석",
    description: "STL 파일을 업로드하면 FEM(유한요소법)으로 정상상태 온도 분포를 계산하고 3D로 시각화합니다.",
    status: "사용 가능",
    caption: "Thermal Analysis",
    actionLabel: "열기",
  },
  {
    id: "ai-assistant",
    title: "프로그램 설계소",
    description: "유형을 선택하고 몇 가지 질문에 답하면 실행 가능한 프로토타입 HTML 프로그램이 다운로드됩니다. AI 코딩 도구로 완성형까지 만들 수 있어요.",
    status: "사용 가능",
    caption: "Program Designer",
    actionLabel: "열기",
  },
  {
    id: "db",
    title: "통합 카탈로그 검색",
    description: "모터·감속기·볼스크류·LM가이드·엔코더·진공부품을 대분류·중분류·소분류로 나눠 빠르게 검색할 수 있습니다.",
    status: "사용 가능",
    caption: "Catalog Search",
    actionLabel: "열기",
  },
  {
    id: "converter",
    title: "일괄 문서 변환기",
    description: "이미지 포맷 변환, 이미지→PDF, 엑셀↔CSV, 실험 데이터(ASCII) 변환을 한 번에 처리하고 변환 전후를 비교할 수 있습니다.",
    status: "사용 가능",
    caption: "Batch Document Converter",
    actionLabel: "열기",
  },
];

export default function App() {
  const [page, setPage] = useState("home");
  const [motorPrefill, setMotorPrefill] = useState(null);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [productDatabases, setProductDatabases] = useState(() => {
    const initial = {};
    PRODUCT_DB_KEYS.forEach((key) => {
      initial[key] = readStoredDatabase(PRODUCT_DB_STORAGE_KEYS[key], PRODUCT_DB_SEED[key], PRODUCT_DB_FIELDS_BY_KEY[key]);
    });
    return initial;
  });

  function updateProductDatabase(key, updater) {
    setProductDatabases((current) => ({
      ...current,
      [key]: typeof updater === "function" ? updater(current[key]) : updater,
    }));
  }

  // 홈 화면이 자리잡은 뒤 유휴 시간에 모든 도구 코드를 미리 받아둠
  // (호버가 발생하지 않는 터치/빠른 클릭에서도 이동이 즉시 이뤄지도록)
  useEffect(() => {
    if (page !== "home") {
      return;
    }

    const idleId = (window.requestIdleCallback ?? ((cb) => setTimeout(cb, 1200)))(() => {
      Object.keys(PAGE_PRELOADERS).forEach((pageId) => preloadPage(pageId));
    });

    return () => {
      (window.cancelIdleCallback ?? clearTimeout)(idleId);
    };
  }, [page]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateDatabases() {
      if (typeof window !== "undefined" && window.desktopApp?.readDatabase) {
        await Promise.all(
          PRODUCT_DB_KEYS.map((key) =>
            hydrateDesktopDatabase(key, PRODUCT_DB_SEED[key], (items) => {
              if (!cancelled) {
                setProductDatabases((current) => ({ ...current, [key]: items }));
              }
            }),
          ),
        );
      }

      if (!cancelled) {
        setDatabaseReady(true);
      }
    }

    hydrateDatabases();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!databaseReady) {
      return;
    }

    PRODUCT_DB_KEYS.forEach((key) => {
      if (typeof window !== "undefined" && window.desktopApp?.writeDatabase) {
        window.desktopApp.writeDatabase(key, productDatabases[key]).catch((error) => {
          console.warn(`Failed to persist ${key} database.`, error);
        });
        return;
      }

      window.localStorage.setItem(PRODUCT_DB_STORAGE_KEYS[key], JSON.stringify(productDatabases[key]));
    });
  }, [databaseReady, productDatabases]);

  if (page === "motor") {
    return (
      <Suspense fallback={<PageLoader />}>
        <MotorSimulator
          onBack={() => { setMotorPrefill(null); setPage("home"); }}
          prefill={motorPrefill}
        />
      </Suspense>
    );
  }

  if (page === "load") {
    return (
      <Suspense fallback={<PageLoader />}>
        <LoadCalculator
          onBack={() => setPage("home")}
          onSendToMotor={(payload) => { setMotorPrefill(payload); setPage("motor"); }}
        />
      </Suspense>
    );
  }

  if (page === "db") {
    return (
      <Suspense fallback={<PageLoader />}>
        <ProductDatabaseManager
          onBack={() => setPage("home")}
          productDatabases={productDatabases}
          onUpdateProductDatabase={updateProductDatabase}
        />
      </Suspense>
    );
  }

  if (page === "thermal") {
    return (
      <Suspense fallback={<PageLoader />}>
        <ThermalAnalyzer onBack={() => setPage("home")} />
      </Suspense>
    );
  }

  if (page === "ai-assistant") {
    return (
      <Suspense fallback={<PageLoader />}>
        <ProgramDesigner onBack={() => setPage("home")} />
      </Suspense>
    );
  }

  if (page === "board") {
    return (
      <Suspense fallback={<PageLoader />}>
        <FeedbackBoard onBack={() => setPage("home")} />
      </Suspense>
    );
  }

  if (page === "converter") {
    return (
      <Suspense fallback={<PageLoader />}>
        <DocumentConverter onBack={() => setPage("home")} />
      </Suspense>
    );
  }

  return (
    <div className="app home-app">
      <header className="home-hero">
        <div className="home-logo--hero" aria-hidden="true">
          <svg viewBox="0 0 48 48" className="home-logo-mark">
            <defs>
              <linearGradient id="homeLogoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#0ea5e9" />
                <stop offset="1" stopColor="#144fbf" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#homeLogoGrad)" />
            <path d="M17 15 L11 24 L17 33" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M31 15 L37 24 L31 33" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="24" cy="24" r="2.6" fill="#fff" />
          </svg>
          <span className="home-logo-word">EasyLab</span>
        </div>
        <div className="home-copy">
          <button
            type="button"
            className="home-board-badge"
            onClick={() => setPage("board")}
            onMouseEnter={() => preloadPage("board")}
            onFocus={() => preloadPage("board")}
          >
            <span className="home-board-badge__icon">💬</span>
            <span className="home-board-badge__title">게시판</span>
            <span className="home-board-badge__desc">사용 후기와 의견을 남겨보세요</span>
          </button>
          <p className="page-kicker">Easy Access to Program &amp; AI</p>
          <h1>이지랩 스튜디오</h1>
          <p className="home-tagline">"복잡한 엔지니어링, 이지랩으로 간단하게."</p>
          <p className="home-credit">— BY J.S.KIM</p>
          <p className="home-desc">
            모션 설계부터 열해석, AI 코드 생성까지<br />엔지니어의 모든 작업을 한 곳에서.
          </p>
          <div className="home-mode-list">
            <div className="home-mode-item" onClick={() => setPage("motor")} onMouseEnter={() => preloadPage("motor")} onFocus={() => preloadPage("motor")}>
              <span className="home-mode-num">01</span>
              <span className="home-mode-name">
                <span className="home-mode-title">모션 설계 도우미</span>
                <span className="home-mode-desc">모터·감속기·볼스크류·LM가이드·엔코더 자동 추천</span>
              </span>
              <span className="home-mode-tag">ACTIVE</span>
              <span className="home-mode-arrow">→</span>
            </div>
            <div className="home-mode-item" onClick={() => setPage("load")} onMouseEnter={() => preloadPage("load")} onFocus={() => preloadPage("load")}>
              <span className="home-mode-num">02</span>
              <span className="home-mode-name">
                <span className="home-mode-title">하중 계산</span>
                <span className="home-mode-desc">형상·소재·수량으로 중량과 안전율 반영 하중 계산</span>
              </span>
              <span className="home-mode-tag">ACTIVE</span>
              <span className="home-mode-arrow">→</span>
            </div>
            <div className="home-mode-item" onClick={() => setPage("thermal")} onMouseEnter={() => preloadPage("thermal")} onFocus={() => preloadPage("thermal")}>
              <span className="home-mode-num">03</span>
              <span className="home-mode-name">
                <span className="home-mode-title">열해석</span>
                <span className="home-mode-desc">STL·STEP 업로드 → FEM 3D 온도 분포 시각화</span>
              </span>
              <span className="home-mode-tag">ACTIVE</span>
              <span className="home-mode-arrow">→</span>
            </div>
            <div className="home-mode-item" onClick={() => setPage("ai-assistant")} onMouseEnter={() => preloadPage("ai-assistant")} onFocus={() => preloadPage("ai-assistant")}>
              <span className="home-mode-num">04</span>
              <span className="home-mode-name">
                <span className="home-mode-title">프로그램 설계소</span>
                <span className="home-mode-desc">질문에 답하면 실행 가능한 프로토타입 제작</span>
              </span>
              <span className="home-mode-tag">ACTIVE</span>
              <span className="home-mode-arrow">→</span>
            </div>
            <div className="home-mode-item" onClick={() => setPage("db")} onMouseEnter={() => preloadPage("db")} onFocus={() => preloadPage("db")}>
              <span className="home-mode-num">05</span>
              <span className="home-mode-name">
                <span className="home-mode-title">통합 카탈로그 검색</span>
                <span className="home-mode-desc">모터·감속기·볼스크류·엔코더·진공부품 카탈로그 검색</span>
              </span>
              <span className="home-mode-tag">ACTIVE</span>
              <span className="home-mode-arrow">→</span>
            </div>
            <div className="home-mode-item" onClick={() => setPage("converter")} onMouseEnter={() => preloadPage("converter")} onFocus={() => preloadPage("converter")}>
              <span className="home-mode-num">06</span>
              <span className="home-mode-name">
                <span className="home-mode-title">일괄 문서 변환기</span>
                <span className="home-mode-desc">이미지·PDF·엑셀·실험 데이터를 한 번에 변환</span>
              </span>
              <span className="home-mode-tag">ACTIVE</span>
              <span className="home-mode-arrow">→</span>
            </div>
          </div>
        </div>

        <div className="home-showcase">
          <div className="home-panel home-feature-panel">
            <ul className="home-feature-list">
              <li>
                <span className="home-feature-icon home-feature-icon--blue">⚙️</span>
                <div>
                  <strong>모션 설계 자동화</strong>
                  <p>전문가 없이도 최적 구동계를 몇 분 만에 찾습니다</p>
                </div>
              </li>
              <li>
                <span className="home-feature-icon home-feature-icon--cyan">⚖️</span>
                <div>
                  <strong>하중 계산</strong>
                  <p>복잡한 수식 없이 안전율까지 바로 확인합니다</p>
                </div>
              </li>
              <li>
                <span className="home-feature-icon home-feature-icon--orange">🔥</span>
                <div>
                  <strong>열해석 FEM</strong>
                  <p>발열 문제를 설계 단계에서 미리 잡아냅니다</p>
                </div>
              </li>
              <li>
                <span className="home-feature-icon home-feature-icon--purple">🤖</span>
                <div>
                  <strong>프로그램 설계소</strong>
                  <p>코딩 몰라도 실행되는 프로토타입이 바로 만들어집니다</p>
                </div>
              </li>
              <li>
                <span className="home-feature-icon home-feature-icon--green">📦</span>
                <div>
                  <strong>통합 카탈로그 검색</strong>
                  <p>흩어진 카탈로그를 한 곳에서 찾습니다</p>
                </div>
              </li>
              <li>
                <span className="home-feature-icon home-feature-icon--blue">🗂️</span>
                <div>
                  <strong>일괄 문서 변환기</strong>
                  <p>이미지·PDF·엑셀·실험 데이터를 한 번에 변환합니다</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <section className="tool-section">
        <div className="section-head">
          <div>
            <p className="page-kicker">Tools</p>
            <h2>도구 목록</h2>
          </div>
        </div>

        <div className="tool-grid">
          {TOOLS.map((tool, index) => {
            const isActiveTool = tool.id === "motor" || tool.id === "load" || tool.id === "db" || tool.id === "thermal" || tool.id === "ai-assistant" || tool.id === "converter";

            return (
              <article
                className="tool-card"
                key={tool.id}
                onMouseEnter={() => isActiveTool && preloadPage(tool.id)}
              >
                <div className="tool-card__top">
                  <div className="tool-card__title">
                    <span className="tool-card__caption">{tool.caption}</span>
                    <h3>{tool.title}</h3>
                  </div>
                  <span className={`tool-badge${isActiveTool ? " tool-badge--active" : ""}`}>
                    {tool.status}
                  </span>
                </div>
                <p>{tool.description}</p>
                <div className="tool-card__rail">
                  <span>{`MODE 0${index + 1}`}</span>
                  <span>{isActiveTool ? "ACTIVE ROUTE" : "PLANNED ROUTE"}</span>
                </div>
                {tool.id === "motor" ? (
                  <button type="button" className="ghost-button" onClick={() => setPage("motor")}>
                    {tool.actionLabel}
                  </button>
                ) : null}
                {tool.id === "load" ? (
                  <button type="button" className="ghost-button" onClick={() => setPage("load")}>
                    {tool.actionLabel}
                  </button>
                ) : null}
                {tool.id === "db" ? (
                  <button type="button" className="ghost-button" onClick={() => setPage("db")}>
                    {tool.actionLabel}
                  </button>
                ) : null}
                {tool.id === "thermal" ? (
                  <button type="button" className="ghost-button" onClick={() => setPage("thermal")}>
                    {tool.actionLabel}
                  </button>
                ) : null}
                {tool.id === "ai-assistant" ? (
                  <button type="button" className="ghost-button" onClick={() => setPage("ai-assistant")}>
                    {tool.actionLabel}
                  </button>
                ) : null}
                {tool.id === "converter" ? (
                  <button type="button" className="ghost-button" onClick={() => setPage("converter")}>
                    {tool.actionLabel}
                  </button>
                ) : null}
                {!isActiveTool ? (
                  <button type="button" className="ghost-button" disabled>
                    {tool.actionLabel}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
