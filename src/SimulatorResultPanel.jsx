import { memo } from "react";
import {
  formatNumber,
  getEnvironmentLabel,
  getEncoderRecommendation,
  getLmGuideRecommendation,
  getPrecisionLabel,
  getProductModelNumber,
  getProductSpecSummary,
  getRecommendationDriveSummary,
  getRecommendationSlotTitle,
} from "./motorSimulatorLogic";
import VelocityProfileChart from "./VelocityProfileChart";

const SimulatorResultPanel = memo(function SimulatorResultPanel({
  result,
  featuredRecommendations,
  previewMotionProfile,
  previewPeakForceN,
  ballScrewRecommendation,
  environment,
  precisionLevel,
  weightKg,
  thermalWarnMsg,
  thermalWarnLevel,
  dutyCycle,
  avgPower,
  DEFAULT_MOTOR_IMAGE,
}) {
  if (!result) {
    return (
      <div className="empty-box">
        <p>입력값을 넣고 계산하면 최적 모델과 최선 모델, 비교 후보 상세와 구동계 패키지가 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="result">
      <div className="summary-top-grid">
        {/* 추천 결과 */}
        <div className="summary-block summary-block--featured">
          <div className="summary-caption summary-caption--section">추천 결과</div>
          <div className="recommend-box">
            {featuredRecommendations.map((product) => (
              <article
                className={`recommend-item recommend-item--summary recommend-item--${product.recommendationTierKey}${product.isPlaceholder ? " recommend-item--placeholder" : ""}`}
                key={`${product.recommendationTierKey}-${product.company}-${product.productName}`}
              >
                <div className={`confidence-badge confidence-badge--${product.confidenceKey}`}>
                  신뢰도 {product.confidenceLabel}
                </div>
                {product.sourceUrl ? (
                  <a className="product-image-link" href={product.sourceUrl} target="_blank" rel="noreferrer">
                    <img className="product-image" src={product.imageUrl ?? DEFAULT_MOTOR_IMAGE} alt={product.productName} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_MOTOR_IMAGE; }} />
                  </a>
                ) : (
                  <img className="product-image" src={DEFAULT_MOTOR_IMAGE} alt={product.productName} onError={e => { e.currentTarget.onerror = null; }} />
                )}
                {product.sourceUrl ? (
                  <a className="product-title-link" href={product.sourceUrl} target="_blank" rel="noreferrer">
                    <strong>{product.company} {product.productName}</strong>
                  </a>
                ) : (
                  <strong>{product.company} {product.productName}</strong>
                )}
                <small>제조사: {product.company}</small>
                <small>모델번호/대표 형번: {getProductModelNumber(product)}</small>
                <small>{getProductSpecSummary(product)}</small>
                <small>구성: {getRecommendationDriveSummary(product)}</small>
                {product.recommendationReason && !product.isPlaceholder && (
                  <p className="recommend-item__reason">{product.recommendationReason}</p>
                )}
                {product.engineeringWarnings?.length > 0 && (
                  <ul className="recommend-item__warnings">
                    {product.engineeringWarnings.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                )}
                {product.tradeoffNote && (
                  <p className="recommend-item__tradeoff">{product.tradeoffNote}</p>
                )}
              </article>
            ))}
          </div>

          {thermalWarnMsg && (
            <div className={`thermal-warning thermal-warning--${thermalWarnLevel}`}>
              <strong>발열 주의</strong> {thermalWarnMsg}
              {avgPower != null && <span> · 평균 소비 출력 약 {formatNumber(avgPower, 0)} W</span>}
            </div>
          )}
          {dutyCycle != null && thermalWarnLevel === "ok" && (
            <div className="thermal-warning thermal-warning--ok">
              듀티사이클 {(dutyCycle * 100).toFixed(0)}% · 평균 출력 약 {formatNumber(avgPower, 0)} W — 간헐 운전 범위로 열적 여유가 있습니다.
            </div>
          )}
        </div>

        {/* 구동계 패키지 추천 */}
        <div className="summary-block summary-block--package">
          <div className="summary-caption summary-caption--section">구동계 패키지 추천</div>
          <div className="package-grid">
            <article className="package-card package-card--calc-basis">
              <span className="package-card__label">자동 계산 기준</span>
              <ul className="auto-calc-preview auto-calc-preview--card">
                {previewMotionProfile.profileNote && (
                  <li className="auto-calc-preview__note">{previewMotionProfile.profileNote}</li>
                )}
                {previewMotionProfile.accelerationMmS2 > 0 && (
                  <li>가속도 <strong>{formatNumber(previewMotionProfile.accelerationMmS2 / 1000, 2)} m/s²</strong></li>
                )}
                {previewPeakForceN !== null && (
                  <li>피크 추력 <strong>{formatNumber(previewPeakForceN, 1)} N</strong> (정하중 + 가속 구간)</li>
                )}
                <li>볼스크류 리드 <strong>{formatNumber(ballScrewRecommendation.leadMm, 0)} mm/rev</strong> · 축경 <strong>{ballScrewRecommendation.screwSpecLabel}</strong></li>
                <li>LM가이드 <strong>{getLmGuideRecommendation(previewPeakForceN ?? (weightKg ?? 20) * 9.81 * 1.5, environment, true).model}</strong></li>
                <li>엔코더 <strong>{getEncoderRecommendation(precisionLevel, environment).model}</strong></li>
              </ul>
              <VelocityProfileChart profile={previewMotionProfile} />
            </article>

            {result.packageRecommendation.map((item) => (
              <article className="package-card" key={item.id}>
                <span className="package-card__label">{item.title}</span>
                <small className="package-card__maker">제조사: {item.manufacturer}</small>
                <strong>{item.model}</strong>
                <small>{item.subText}</small>
                <p>{item.reason}</p>
                <small>{item.notes}</small>
                {item.url && (
                  <a className="package-card__site-btn" href={item.url} target="_blank" rel="noreferrer">
                    제품 사이트 ↗
                  </a>
                )}
              </article>
            ))}

            {featuredRecommendations.length === 2 && (
              <article className="package-card package-card--compare">
                <span className="package-card__label">감속기 포함 vs 직결형 비교</span>
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th>항목</th>
                      {featuredRecommendations.map((p) => (
                        <th key={p.recommendationTierKey}>{getRecommendationSlotTitle(p)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>제조사</td>{featuredRecommendations.map((p) => <td key={p.recommendationTierKey}>{p.company}</td>)}</tr>
                    <tr><td>모델</td>{featuredRecommendations.map((p) => <td key={p.recommendationTierKey}>{p.productName}</td>)}</tr>
                    <tr><td>출력</td>{featuredRecommendations.map((p) => <td key={p.recommendationTierKey}>{formatNumber(p.powerW, 0)} W</td>)}</tr>
                    <tr><td>감속비</td>{featuredRecommendations.map((p) => <td key={p.recommendationTierKey}>{p.matchedRatio > 1 ? `${p.matchedRatio}:1` : "직결"}</td>)}</tr>
                    <tr><td>여유율</td>{featuredRecommendations.map((p) => <td key={p.recommendationTierKey}>{p.minimumMarginPercent?.toFixed(0) ?? "-"}%</td>)}</tr>
                    <tr><td>신뢰도</td>{featuredRecommendations.map((p) => <td key={p.recommendationTierKey}><span className={`confidence-badge confidence-badge--${p.confidenceKey}`}>신뢰도 {p.confidenceLabel}</span></td>)}</tr>
                  </tbody>
                </table>
              </article>
            )}
          </div>
        </div>
      </div>

      {/* 전문가 선정 메모 */}
      <div className="note-box note-box--expert">
        <h3>전문가 선정 메모</h3>
        <div className="expert-review">
          <div className="expert-review__item">
            <span>선정 이유</span>
            <p>{result.expertReview.selectionReason}</p>
          </div>
          <div className="expert-review__item">
            <span>적용 판단</span>
            <p>{result.expertReview.applicationGuide}</p>
          </div>
          <div className="expert-review__item">
            <span>주문 전 확인사항</span>
            <ul>
              {result.expertReview.orderChecks.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 핵심 계산 결과 + 엔지니어링 검토 — 좌우 배치 */}
      <div className="calc-blocks-row">
      {/* 핵심 계산 결과 */}
      <div className="summary-block">
        <div className="summary-caption summary-caption--section">핵심 계산 결과</div>
        <div className="result-list result-list--compact">
          <div className="result-row"><span>추천 회사</span><strong>{result.recommendedCompany}</strong></div>
          <div className="result-row"><span>하중</span><strong>{formatNumber(result.weightKg, 3)} kg</strong></div>
          <div className="result-row"><span>이송 거리</span><strong>{formatNumber(result.strokeMm, 1)} mm</strong></div>
          <div className="result-row"><span>입력 속도</span><strong>{formatNumber(result.inputSpeedMm, 1)} mm/s</strong></div>
          <div className="result-row"><span>선정 기준 속도</span><strong>{formatNumber(result.speedMm, 1)} mm/s</strong></div>
          <div className="result-row"><span>목표 시간</span><strong>{result.targetTimeSec !== null ? `${formatNumber(result.targetTimeSec, 2)} sec` : "미입력"}</strong></div>
          <div className="result-row"><span>필요 평균 속도</span><strong>{result.targetDrivenSpeedMm !== null ? `${formatNumber(result.targetDrivenSpeedMm, 1)} mm/s` : "미계산"}</strong></div>
          {result.motionProfile && (
            <>
              <div className="result-row"><span>가속도</span><strong>{formatNumber(result.motionProfile.accelerationMmS2 / 1000, 2)} m/s²</strong></div>
              <div className="result-row"><span>가속 구간</span><strong>{formatNumber(result.motionProfile.t_acc, 2)} s</strong></div>
            </>
          )}
          <div className="result-row"><span>피크 추력 (가속 포함)</span><strong>{formatNumber(result.thrust, 1)} N</strong></div>
          <div className="result-row"><span>토크</span><strong>{formatNumber(result.torque, 2)} N·m</strong></div>
          <div className="result-row"><span>피크 토크</span><strong>{formatNumber(result.peakTorque, 2)} N·m</strong></div>
          <div className="result-row"><span>필요 rpm</span><strong>{formatNumber(result.rpm, 0)} rpm</strong></div>
          <div className="result-row"><span>계산 출력</span><strong>{formatNumber(result.power, 1)} W</strong></div>
          <div className="result-row"><span>예상 이동 시간</span><strong>{result.moveTime !== null ? `${formatNumber(result.moveTime, 2)} sec` : "미계산"}</strong></div>
          <div className="result-row"><span>적용 리드</span><strong>{formatNumber(result.appliedLeadMm, 1)} mm/rev</strong></div>
          <div className="result-row"><span>환경 조건</span><strong>{getEnvironmentLabel(result.environment)}</strong></div>
          <div className="result-row"><span>정밀도 기준</span><strong>{getPrecisionLabel(result.precisionLevel)}</strong></div>
        </div>
      </div>

      {/* 엔지니어링 검토 */}
      <div className="summary-block">
        <div className="summary-caption summary-caption--section">엔지니어링 검토</div>
        <div className="result-list result-list--compact">
          {result.inertiaCheck && (() => {
            const ic = result.inertiaCheck;
            return (
              <>
                <div className="result-row result-row--subhead"><span>관성비 (부하/모터 로터)</span></div>
                <div className="result-row"><span>부하 관성 J_load</span><strong>{(ic.J_load * 1e4).toFixed(2)} ×10⁻⁴ kg·m²</strong></div>
                <div className="result-row"><span>모터샤프트 환산</span><strong>{(ic.J_load_referred * 1e4).toFixed(3)} ×10⁻⁴ kg·m²</strong></div>
                <div className="result-row"><span>로터 관성 추정</span><strong>{(ic.J_rotor * 1e4).toFixed(3)} ×10⁻⁴ kg·m²</strong></div>
                <div className="result-row">
                  <span>관성비</span>
                  <strong className={ic.warnLevel === "ok" ? "text--ok" : ic.warnLevel === "caution" ? "text--caution" : "text--danger"}>
                    {ic.inertiaRatio.toFixed(2)} : 1
                    {ic.warnLevel === "ok" ? ` ✓ (권장 ${ic.threshold}:1 이하)` : ` ⚠ (권장 ${ic.threshold}:1 이하 — 탈조 위험)`}
                  </strong>
                </div>
              </>
            );
          })()}

          {result.verticalAxisSummary && (() => {
            const va = result.verticalAxisSummary;
            return (
              <>
                <div className="result-row result-row--subhead"><span>수직축 홀딩 토크</span></div>
                <div className="result-row"><span>정지 홀딩 토크</span><strong>{va.holdingTorqueNm.toFixed(3)} N·m</strong></div>
                <div className="result-row"><span>브레이크 필요</span><strong className="text--danger">필수 — 볼스크류는 자기잠금 없음, 전원차단 시 낙하 위험</strong></div>
              </>
            );
          })()}

          {result.ballScrewCriticalSpeed?.criticalRpm && (() => {
            const cs = result.ballScrewCriticalSpeed;
            return (
              <>
                <div className="result-row result-row--subhead"><span>볼스크류 임계 회전수</span></div>
                <div className="result-row"><span>임계 회전수 N_c</span><strong>{cs.criticalRpm.toLocaleString("ko-KR")} rpm</strong></div>
                <div className="result-row"><span>필요 회전수</span><strong>{cs.requiredRpm.toFixed(0)} rpm</strong></div>
                <div className="result-row">
                  <span>임계 대비 사용률</span>
                  <strong className={cs.criticalSpeedOk ? "text--ok" : "text--danger"}>
                    {(cs.criticalSpeedRatio * 100).toFixed(1)}%
                    {cs.criticalSpeedOk ? " ✓ (80% 이하 — 안전)" : " ⚠ 임계 회전수 초과 위험 — 축경/리드 재검토 필요"}
                  </strong>
                </div>
              </>
            );
          })()}

          {result.positioningAccuracy && (() => {
            const pa = result.positioningAccuracy;
            return (
              <>
                <div className="result-row result-row--subhead"><span>위치 결정 정밀도 추정</span></div>
                <div className="result-row"><span>엔코더 분해능</span><strong>{pa.encoderPPR.toLocaleString("ko-KR")} PPR × 4체배 = {pa.countsPerRev.toLocaleString("ko-KR")} counts/rev</strong></div>
                <div className="result-row"><span>최소 이동 분해능</span><strong>{pa.linearResolutionUm.toFixed(3)} μm/count</strong></div>
                <div className="result-row"><span>반복 정밀도 (이론)</span><strong>±{pa.repeatabilityUm.toFixed(3)} μm</strong></div>
                <div className="result-row"><span>백래시 기준값</span><strong>{pa.backlashUm} μm</strong></div>
                <div className="result-row"><span>종합 정밀도 추정</span><strong>±{pa.theoreticalAccuracyUm.toFixed(1)} μm</strong></div>
              </>
            );
          })()}
        </div>
      </div>

      </div>{/* /calc-blocks-row */}

      <div className="note-box note-box--status">
        <h3>판정 설명</h3>
        {result.messages.length > 0 ? (
          <ul>{result.messages.map((message) => <li key={message}>{message}</li>)}</ul>
        ) : (
          <p>현재 조건은 등록된 제품 기준에서 무난한 범위입니다.</p>
        )}
      </div>
    </div>
  );
});

export default SimulatorResultPanel;
