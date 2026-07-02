import { memo } from "react";

const VelocityProfileChart = memo(function VelocityProfileChart({ profile, label }) {
  if (!profile || !profile.feasible) return null;
  const { t_acc, t_const, peakSpeedMm } = profile;
  const totalTime = t_acc * 2 + (t_const ?? 0);
  if (totalTime <= 0 || peakSpeedMm <= 0) return null;
  const W = 240, H = 72, PX = 18, PY = 12;
  const iW = W - PX * 2, iH = H - PY * 2;
  const tx = (t) => PX + (t / totalTime) * iW;
  const vy = (v) => PY + iH - (v / peakSpeedMm) * iH;
  const t1 = t_acc, t2 = t_acc + (t_const ?? 0), t3 = totalTime;
  const pts = `${tx(0)},${vy(0)} ${tx(t1)},${vy(peakSpeedMm)} ${tx(t2)},${vy(peakSpeedMm)} ${tx(t3)},${vy(0)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="velocity-chart" aria-label={label ?? "속도 프로파일"}>
      <line x1={PX} y1={PY} x2={PX} y2={H - PY} stroke="rgba(148,163,184,0.3)" strokeWidth="1"/>
      <line x1={PX} y1={H - PY} x2={W - PX} y2={H - PY} stroke="rgba(148,163,184,0.3)" strokeWidth="1"/>
      <polygon points={pts} fill="rgba(99,102,241,0.08)"/>
      <polyline points={pts} fill="none" stroke="rgba(99,102,241,0.75)" strokeWidth="1.5" strokeLinejoin="round"/>
      {t_acc > 0 && <line x1={tx(t1)} y1={PY} x2={tx(t1)} y2={H-PY} stroke="rgba(99,102,241,0.2)" strokeWidth="1" strokeDasharray="3,2"/>}
      {(t_const ?? 0) > 0 && <line x1={tx(t2)} y1={PY} x2={tx(t2)} y2={H-PY} stroke="rgba(99,102,241,0.2)" strokeWidth="1" strokeDasharray="3,2"/>}
      <text x={tx(totalTime/2)} y={vy(peakSpeedMm) - 4} fontSize="9" fill="rgba(148,163,184,0.9)" textAnchor="middle">{peakSpeedMm.toFixed(0)} mm/s</text>
      <text x={PX} y={H - 2} fontSize="8" fill="rgba(148,163,184,0.6)">0</text>
      <text x={W - PX} y={H - 2} fontSize="8" fill="rgba(148,163,184,0.6)" textAnchor="end">{totalTime.toFixed(2)}s</text>
    </svg>
  );
});

export default VelocityProfileChart;
