import { lazy, Suspense, useEffect, useState } from "react";

// 코드 분할 — 각 모듈은 해당 탭을 열 때만 로드됨
const MotorSimulator         = lazy(() => import("./MotorSimulator"));
const LoadCalculator         = lazy(() => import("./LoadCalculator"));
const ProductDatabaseManager = lazy(() => import("./ProductDatabaseManager"));
const ThermalAnalyzer        = lazy(() => import("./ThermalAnalyzer"));
const ProgramDesigner        = lazy(() => import("./ProgramDesigner"));

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
import { ENCODER_FIELDS, LM_GUIDE_FIELDS } from "./data/productDbSchemas";
import "./App.css";

const PRODUCT_DB_STORAGE_KEYS = {
  lmGuide: "motor-simulator-react:lm-guide-db:v1",
  encoder: "motor-simulator-react:encoder-db:v1",
};

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

  return sanitizedItems.length > 0 ? sanitizedItems : fallbackItems;
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
      setter(sanitizeStoredDatabase(savedItems, fallbackItems, databaseKey === "lmGuide" ? LM_GUIDE_FIELDS : ENCODER_FIELDS));
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
    description: "유형을 선택하고 몇 가지 질문에 답하면 바로 사용 가능한 HTML 프로그램이 다운로드됩니다.",
    status: "사용 가능",
    caption: "Program Designer",
    actionLabel: "열기",
  },
  {
    id: "db",
    title: "제품 DB 관리",
    description: "LM가이드와 엔코더 제품 데이터를 업로드하고, 검색하고, 카탈로그 링크와 함께 관리합니다.",
    status: "사용 가능",
    caption: "Database Manager",
    actionLabel: "열기",
  },
];

export default function App() {
  const [page, setPage] = useState("home");
  const [motorPrefill, setMotorPrefill] = useState(null);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [lmGuideDatabase, setLmGuideDatabase] = useState(() =>
    readStoredDatabase(PRODUCT_DB_STORAGE_KEYS.lmGuide, LM_GUIDE_DATABASE, LM_GUIDE_FIELDS),
  );
  const [encoderDatabase, setEncoderDatabase] = useState(() =>
    readStoredDatabase(PRODUCT_DB_STORAGE_KEYS.encoder, ENCODER_DATABASE, ENCODER_FIELDS),
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateDatabases() {
      if (typeof window !== "undefined" && window.desktopApp?.readDatabase) {
        await Promise.all([
          hydrateDesktopDatabase("lmGuide", LM_GUIDE_DATABASE, (items) => {
            if (!cancelled) {
              setLmGuideDatabase(items);
            }
          }),
          hydrateDesktopDatabase("encoder", ENCODER_DATABASE, (items) => {
            if (!cancelled) {
              setEncoderDatabase(items);
            }
          }),
        ]);
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

    if (typeof window !== "undefined" && window.desktopApp?.writeDatabase) {
      window.desktopApp.writeDatabase("lmGuide", lmGuideDatabase).catch((error) => {
        console.warn("Failed to persist LM guide database.", error);
      });
      return;
    }

    window.localStorage.setItem(PRODUCT_DB_STORAGE_KEYS.lmGuide, JSON.stringify(lmGuideDatabase));
  }, [databaseReady, lmGuideDatabase]);

  useEffect(() => {
    if (!databaseReady) {
      return;
    }

    if (typeof window !== "undefined" && window.desktopApp?.writeDatabase) {
      window.desktopApp.writeDatabase("encoder", encoderDatabase).catch((error) => {
        console.warn("Failed to persist encoder database.", error);
      });
      return;
    }

    window.localStorage.setItem(PRODUCT_DB_STORAGE_KEYS.encoder, JSON.stringify(encoderDatabase));
  }, [databaseReady, encoderDatabase]);

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
          lmGuideItems={lmGuideDatabase}
          encoderItems={encoderDatabase}
          onUpdateLmGuideItems={setLmGuideDatabase}
          onUpdateEncoderItems={setEncoderDatabase}
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

  return (
    <div className="app home-app">
      <header className="home-hero">
        <img src="./로고PNG.png" alt="PAL" className="home-pal-logo--hero" />
        <div className="home-copy">
          <p className="page-kicker">PAL Engineering Lab</p>
          <h1>PALAB 스튜디오</h1>
          <p className="home-tagline">"몰라도 괜찮아요 — 물어보면 전문가처럼 답해드립니다."</p>
          <p className="home-desc">
            모션 설계부터 열해석, AI 코드 생성까지<br />엔지니어의 모든 작업을 한 곳에서.
          </p>
          <div className="home-mode-list">
            <div className="home-mode-item" onClick={() => setPage("motor")}>
              <span className="home-mode-num">01</span>
              <span className="home-mode-name">모션 설계 도우미</span>
              <span className="home-mode-tag">ACTIVE</span>
            </div>
            <div className="home-mode-item" onClick={() => setPage("load")}>
              <span className="home-mode-num">02</span>
              <span className="home-mode-name">하중 계산</span>
              <span className="home-mode-tag">ACTIVE</span>
            </div>
            <div className="home-mode-item" onClick={() => setPage("thermal")}>
              <span className="home-mode-num">03</span>
              <span className="home-mode-name">열해석</span>
              <span className="home-mode-tag">ACTIVE</span>
            </div>
            <div className="home-mode-item" onClick={() => setPage("ai-assistant")}>
              <span className="home-mode-num">04</span>
              <span className="home-mode-name">프로그램 생성 AI</span>
              <span className="home-mode-tag">ACTIVE</span>
            </div>
            <div className="home-mode-item" onClick={() => setPage("db")}>
              <span className="home-mode-num">05</span>
              <span className="home-mode-name">제품 DB 관리</span>
              <span className="home-mode-tag">ACTIVE</span>
            </div>
          </div>
          <div className="home-actions">
            <button type="button" className="button home-cta" onClick={() => setPage("motor")}>
              시작하기
            </button>
            <span className="home-inline-note">모터 선정부터 구동계 패키지까지 자동 추천</span>
          </div>
        </div>

        <div className="home-showcase">
          <div className="home-panel home-feature-panel">
            <ul className="home-feature-list">
              <li>
                <span className="home-feature-icon">⚙️</span>
                <div>
                  <strong>모션 설계 자동화</strong>
                  <p>모터·감속기·볼스크류·엔코더까지 자동 추천</p>
                </div>
              </li>
              <li>
                <span className="home-feature-icon">🔥</span>
                <div>
                  <strong>열해석 FEM</strong>
                  <p>STL 업로드 → 유한요소법 온도 분포 3D 시각화</p>
                </div>
              </li>
              <li>
                <span className="home-feature-icon">🤖</span>
                <div>
                  <strong>AI 코드 생성</strong>
                  <p>아이디어를 말하면 React 프로젝트 자동 생성</p>
                </div>
              </li>
              <li>
                <span className="home-feature-icon">📦</span>
                <div>
                  <strong>제품 DB 관리</strong>
                  <p>LM가이드·엔코더 카탈로그 업로드 및 검색</p>
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
            const isActiveTool = tool.id === "motor" || tool.id === "load" || tool.id === "db" || tool.id === "thermal" || tool.id === "ai-assistant";

            return (
              <article className="tool-card" key={tool.id}>
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
