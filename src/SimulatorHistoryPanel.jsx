import { memo, useRef } from "react";
import { formatNumber } from "./motorSimulatorLogic";

const SimulatorHistoryPanel = memo(function SimulatorHistoryPanel({
  calcHistory,
  isHistoryExpanded,
  onToggleHistory,
  onClearHistory,
  onSelectEntry,
}) {
  const historyRef = useRef(null);
  if (calcHistory.length === 0) return null;

  return (
    <section
      className={`card card--history card--collapsible${isHistoryExpanded ? " is-expanded" : " is-collapsed"}`}
      ref={historyRef}
    >
      <div className="card-section-header">
        <div>
          <h2>계산 히스토리 <span className="history-count">({calcHistory.length}건)</span></h2>
          <p>이번 세션에서 계산한 조건 목록입니다. 클릭하면 해당 결과를 다시 불러옵니다.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" className="ghost-button ghost-button--small" onClick={onToggleHistory}>
            {isHistoryExpanded ? "접기" : "펼치기"}
          </button>
          <button type="button" className="ghost-button ghost-button--small" onClick={onClearHistory}>
            초기화
          </button>
        </div>
      </div>
      {isHistoryExpanded && (
        <div className="history-list">
          {calcHistory.map((entry, idx) => (
            <button
              key={entry.id}
              type="button"
              className={`history-item${idx === 0 ? " history-item--current" : ""}`}
              onClick={() => onSelectEntry(entry.result)}
            >
              <span className="history-item__badge">{idx === 0 ? "현재" : `#${idx + 1}`}</span>
              <span className="history-item__label">
                {entry.params.direction === "vertical" ? "수직" : "수평"} ·{" "}
                {formatNumber(entry.params.weightKg, 1)} kg ·{" "}
                {formatNumber(entry.params.strokeMm, 0)} mm ·{" "}
                {entry.params.speedMm != null ? `${formatNumber(entry.params.speedMm, 0)} mm/s` : `${formatNumber(entry.params.targetTimeSec, 1)}s`}
              </span>
              <span className="history-item__result">
                {entry.result?.summaryRecommendations?.[0]?.company ?? "-"}{" "}
                {entry.result?.summaryRecommendations?.[0]?.productName?.slice(0, 20) ?? ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
});

export default SimulatorHistoryPanel;
