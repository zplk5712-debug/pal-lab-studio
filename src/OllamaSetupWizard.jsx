import { useState, useEffect, useRef } from "react";

const DEFAULT_MODEL = "gemma3:4b";

// step: 'checking' | 'installing' | 'starting' | 'pulling' | 'done' | 'error'

export default function OllamaSetupWizard({ onComplete }) {
  const [step, setStep] = useState("checking");
  const [log, setLog] = useState([]);
  const [pullProgress, setPullProgress] = useState(null); // { pct, status }
  const [errorMsg, setErrorMsg] = useState("");
  const logEndRef = useRef(null);

  useEffect(() => {
    window.desktopApp?.onSetupLog((msg) => {
      setLog(prev => [...prev, msg]);
    });
    window.desktopApp?.onPullProgress((obj) => {
      if (obj.total && obj.completed) {
        const pct = Math.round((obj.completed / obj.total) * 100);
        setPullProgress({ pct, status: obj.status || "다운로드 중…" });
      } else if (obj.status) {
        setPullProgress(prev => ({ pct: prev?.pct ?? 0, status: obj.status }));
        setLog(prev => [...prev, obj.status]);
      }
    });
    runSetup();
    return () => window.desktopApp?.removeSetupListeners();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  function addLog(msg) {
    setLog(prev => [...prev, msg]);
  }

  async function runSetup() {
    try {
      // 1. Check current status
      setStep("checking");
      addLog("Ollama 상태 확인 중…");
      const status = await window.desktopApp.ollamaStatus();

      if (status.running && status.models.length > 0) {
        addLog("✅ Ollama 실행 중, 모델도 준비됨!");
        setStep("done");
        setTimeout(() => onComplete(status.models[0]), 800);
        return;
      }

      // 2. Install if needed
      if (!status.installed) {
        setStep("installing");
        addLog("Ollama가 설치되어 있지 않아요. 설치 시작…");
        await window.desktopApp.ollamaInstall();
        addLog("✅ Ollama 설치 완료!");
      } else {
        addLog("✅ Ollama 설치 확인됨");
      }

      // 3. Start Ollama if not running
      if (!status.running) {
        setStep("starting");
        addLog("Ollama 서버 시작 중…");
        const startResult = await window.desktopApp.ollamaStart();
        if (startResult.models.length > 0) {
          addLog("✅ Ollama 시작 완료! 모델도 준비됨!");
          setStep("done");
          setTimeout(() => onComplete(startResult.models[0]), 800);
          return;
        }
        addLog("✅ Ollama 서버 시작 완료!");
      }

      // 4. Pull model if none
      setStep("pulling");
      addLog(`AI 모델 다운로드 시작: ${DEFAULT_MODEL} (약 4.7GB)`);
      addLog("시간이 걸릴 수 있어요. 기다려 주세요 ☕");
      await window.desktopApp.ollamaPull(DEFAULT_MODEL);
      addLog(`✅ 모델 준비 완료: ${DEFAULT_MODEL}`);

      setStep("done");
      setTimeout(() => onComplete(DEFAULT_MODEL), 1000);
    } catch (err) {
      setErrorMsg(err.message || "알 수 없는 오류");
      setStep("error");
    }
  }

  const STEP_LABELS = {
    checking: "상태 확인",
    installing: "Ollama 설치",
    starting: "서버 시작",
    pulling: "AI 모델 다운로드",
    done: "완료",
    error: "오류",
  };

  const STEPS = ["checking", "installing", "starting", "pulling", "done"];
  const currentIdx = STEPS.indexOf(step === "error" ? "done" : step);

  return (
    <div className="wizard-overlay">
      <div className="wizard-box">
        <p className="page-kicker" style={{ color: "#a78bfa", marginBottom: 6 }}>첫 번째 설정</p>
        <h2 className="wizard-title">프로그램 설계소 설치 중…</h2>
        <p className="wizard-sub">AI 기능 사용을 위해 Ollama를 설정합니다. 잠시만 기다려 주세요.</p>

        {/* Step progress */}
        <div className="wizard-steps">
          {STEPS.filter(s => s !== "done").map((s, i) => {
            const state = i < currentIdx ? "done" : i === currentIdx ? "active" : "pending";
            return (
              <div key={s} className={`wizard-step wizard-step--${state}`}>
                <div className="wizard-step-dot">
                  {state === "done" ? "✓" : i + 1}
                </div>
                <span>{STEP_LABELS[s]}</span>
              </div>
            );
          })}
        </div>

        {/* Pull progress bar */}
        {step === "pulling" && pullProgress && (
          <div className="wizard-pull">
            <div className="wizard-pull-info">
              <span>{pullProgress.status}</span>
              <span>{pullProgress.pct}%</span>
            </div>
            <div className="wizard-pull-bar">
              <div className="wizard-pull-fill" style={{ width: `${pullProgress.pct}%` }} />
            </div>
          </div>
        )}

        {/* Log */}
        <div className="wizard-log">
          {log.map((line, i) => (
            <div key={i} className="wizard-log-line">{line}</div>
          ))}
          {step !== "done" && step !== "error" && (
            <div className="wizard-log-line wizard-log-line--blink">▌</div>
          )}
          <div ref={logEndRef} />
        </div>

        {step === "done" && (
          <div className="wizard-done">
            <span>✅</span> 준비 완료! 앱을 시작합니다…
          </div>
        )}

        {step === "error" && (
          <div className="wizard-error">
            <p>오류가 발생했어요: {errorMsg}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button type="button" className="button" onClick={runSetup}>다시 시도</button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => window.open("https://ollama.com/download")}
              >
                수동 설치 안내
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
