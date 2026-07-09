import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { parseSTL, meshBBox } from "./thermal/stlParser";
import { solveHeat, solveTransient, minBeamDist } from "./thermal/femSolver";

// ─── PAL 표준 소재 DB ─────────────────────────────────────────────────────────
const MATERIALS = [
  { id: "sus304",    name: "SUS304",         k: 16.2, rho: 7900,  cp: 500,  melt: 1450, eps: 0.30 },
  { id: "sus316",    name: "SUS316",         k: 16.3, rho: 8000,  cp: 500,  melt: 1400, eps: 0.28 },
  { id: "al6061",    name: "AL6061",         k: 167,  rho: 2700,  cp: 896,  melt: 652,  eps: 0.10 },
  { id: "al5052",    name: "AL5052",         k: 138,  rho: 2680,  cp: 880,  melt: 649,  eps: 0.10 },
  { id: "ofc",       name: "OFC (무산소동)", k: 391,  rho: 8940,  cp: 385,  melt: 1083, eps: 0.03 },
  { id: "glidcop",   name: "Glidcop Al25",  k: 365,  rho: 8900,  cp: 385,  melt: 1080, eps: 0.05 },
  { id: "tungsten",  name: "텅스텐 (W)",    k: 173,  rho: 19300, cp: 134,  melt: 3422, eps: 0.10 },
  { id: "molybdenum",name: "몰리브덴 (Mo)", k: 138,  rho: 10200, cp: 251,  melt: 2623, eps: 0.10 },
  { id: "ti6al4v",   name: "Ti-6Al-4V",     k: 6.7,  rho: 4430,  cp: 526,  melt: 1660, eps: 0.35 },
  { id: "alumina",   name: "세라믹 (Al₂O₃)",k: 30,   rho: 3900,  cp: 880,  melt: 2072, eps: 0.70 },
  { id: "becu",      name: "BeCu (C17200)", k: 105,  rho: 8250,  cp: 420,  melt: 982,  eps: 0.08 },
  { id: "custom",    name: "직접 입력",      k: null, rho: null,  cp: null,  melt: null, eps: null },
];

// ─── 경계조건 UI 헬퍼 ─────────────────────────────────────────────────────────
const BC_LABELS = { min_z:"아랫면", max_z:"윗면", min_y:"앞면", max_y:"뒷면", min_x:"왼쪽 면", max_x:"오른쪽 면", all:"전체 표면" };
function bcLabel(b) { return BC_LABELS[b] ?? b; }
function bcTempColor(t) {
  const v = Number(t);
  if (v<=0)   return "#60a5fa";
  if (v<=30)  return "#34d399";
  if (v<=100) return "#fbbf24";
  if (v<=300) return "#f97316";
  return "#ef4444";
}
function bcTempHint(t) {
  const v = Number(t);
  if (v<=0)   return "매우 차가움";
  if (v<=30)  return "상온 수준";
  if (v<=80)  return "냉각수 수준";
  if (v<=150) return "열원 / 고온부";
  if (v<=400) return "고열부하";
  return "극고온";
}

// ─── 색상 맵 ─────────────────────────────────────────────────────────────────
function tempToColor(t, tMin, tMax, useLog) {
  let r;
  if (useLog && tMax - tMin > 1) {
    const lRange = Math.log1p(tMax - tMin);
    r = lRange > 0 ? Math.log1p(Math.max(0, t - tMin)) / lRange : 0;
  } else {
    r = tMax > tMin ? (t - tMin) / (tMax - tMin) : 0;
  }
  r = Math.max(0, Math.min(1, r));
  return [r<0.5?0:(r-0.5)*2, r<0.25?r*4:r<0.75?1:(1-r)*4, r<0.5?1-r*2:0];
}

// ─── 클릭 노드 탐색 ──────────────────────────────────────────────────────────
function findNearbyNodes(nodes, point, radius) {
  const N = nodes.length / 3;
  const r2 = radius * radius;
  const result = [];
  let minD = Infinity, minI = 0;
  for (let i = 0; i < N; i++) {
    const dx = nodes[i*3]-point.x, dy = nodes[i*3+1]-point.y, dz = nodes[i*3+2]-point.z;
    const d2 = dx*dx + dy*dy + dz*dz;
    if (d2 <= r2) result.push(i);
    if (d2 < minD) { minD = d2; minI = i; }
  }
  return result.length > 0 ? result : [minI]; // 반경 내 없으면 최근접 노드
}

// ─── 빔 경로 노드 탐색 ────────────────────────────────────────────────────────
function findBeamNodes(nodes, origin, dir, radius) {
  const N = nodes.length / 3;
  const len = Math.sqrt(dir.x**2 + dir.y**2 + dir.z**2);
  if (len < 1e-10) return [];
  const dx = dir.x/len, dy = dir.y/len, dz = dir.z/len;
  const r2 = radius * radius;
  const result = [];
  for (let i = 0; i < N; i++) {
    const px = nodes[i*3] - origin.x;
    const py = nodes[i*3+1] - origin.y;
    const pz = nodes[i*3+2] - origin.z;
    const t  = px*dx + py*dy + pz*dz;
    const qx = px - t*dx, qy = py - t*dy, qz = pz - t*dz;
    if (qx*qx + qy*qy + qz*qz <= r2) result.push(i);
  }
  return result;
}

// ─── Three.js 메시 ───────────────────────────────────────────────────────────
function ThermalMesh({ meshData, temperatures, tMin, tMax, clickMode, onMeshClick, onHover, useLog }) {
  const geometry = useMemo(() => {
    if (!meshData) return null;
    const { nodes, elements } = meshData;
    const M = elements.length / 3;
    const positions = [], colors = [];
    for (let e = 0; e < M; e++) {
      for (let v = 0; v < 3; v++) {
        const vi = elements[e*3+v];
        positions.push(nodes[vi*3], nodes[vi*3+1], nodes[vi*3+2]);
        const [r,g,b] = temperatures
          ? tempToColor(temperatures[vi], tMin, tMax, useLog)
          : [0.25, 0.45, 0.7];
        colors.push(r, g, b);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color",    new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [meshData, temperatures, tMin, tMax, useLog]);

  if (!geometry) return null;
  return (
    <mesh geometry={geometry}
      onClick={clickMode ? (e) => { e.stopPropagation(); onMeshClick(e.point); } : undefined}
      onPointerMove={temperatures && onHover ? (e) => {
        e.stopPropagation();
        const fi = e.faceIndex;
        if (fi == null || !meshData) return;
        const { elements } = meshData;
        const t0 = temperatures[elements[fi*3]];
        const t1 = temperatures[elements[fi*3+1]];
        const t2 = temperatures[elements[fi*3+2]];
        const avg = (t0 + t1 + t2) / 3;
        onHover({ x: e.clientX, y: e.clientY, temp: avg });
      } : undefined}
      onPointerLeave={onHover ? () => onHover(null) : undefined}
      style={{ cursor: clickMode ? "crosshair" : "default" }}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── 단면 온도 그래프 ─────────────────────────────────────────────────────────
function CrossSectionGraph({ nodes, temperatures, axis }) {
  const data = useMemo(() => {
    if (!nodes || !temperatures) return [];
    const N = nodes.length / 3;
    const axIdx = axis === "x" ? 0 : axis === "y" ? 1 : 2;
    const pts = [];
    for (let i = 0; i < N; i++)
      pts.push({ pos: nodes[i*3 + axIdx], temp: temperatures[i] });
    pts.sort((a, b) => a.pos - b.pos);
    // 20 구간으로 빈닝
    const mn = pts[0].pos, mx = pts[pts.length-1].pos;
    const bins = 40;
    const bw = (mx - mn) / bins || 1;
    const buckets = Array.from({ length: bins }, () => []);
    for (const { pos, temp } of pts) {
      const bi = Math.min(Math.floor((pos - mn) / bw), bins - 1);
      buckets[bi].push(temp);
    }
    return buckets.map((b, i) => ({
      pos: mn + (i + 0.5) * bw,
      temp: b.length ? b.reduce((s, v) => s + v, 0) / b.length : null,
    })).filter(d => d.temp !== null);
  }, [nodes, temperatures, axis]);

  if (data.length === 0) return null;
  const W = 340, H = 90, PAD = { l: 40, r: 10, t: 8, b: 24 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const xs = data.map(d => d.pos), ys = data.map(d => d.temp);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const sx = v => PAD.l + (v - xMin) / (xMax - xMin || 1) * iW;
  const sy = v => PAD.t + iH - (v - yMin) / (yMax - yMin || 1) * iH;
  const pts = data.map(d => `${sx(d.pos).toFixed(1)},${sy(d.temp).toFixed(1)}`).join(" ");

  return (
    <svg width={W} height={H} style={{ display:"block" }}>
      {/* 격자선 */}
      {[0, 0.5, 1].map(f => (
        <line key={f} x1={PAD.l} x2={W - PAD.r}
          y1={PAD.t + iH * (1 - f)} y2={PAD.t + iH * (1 - f)}
          stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      ))}
      {/* 선 그래프 */}
      <polyline points={pts} fill="none" stroke="#60a5fa" strokeWidth={1.5} strokeLinejoin="round" />
      {/* 축 레이블 */}
      <text x={PAD.l - 4} y={PAD.t + 4} textAnchor="end" fontSize={9} fill="#7a8fa8">{yMax.toFixed(0)}</text>
      <text x={PAD.l - 4} y={PAD.t + iH + 4} textAnchor="end" fontSize={9} fill="#7a8fa8">{yMin.toFixed(0)}</text>
      <text x={PAD.l} y={H - 4} textAnchor="middle" fontSize={9} fill="#7a8fa8">{xMin.toFixed(1)}</text>
      <text x={W - PAD.r} y={H - 4} textAnchor="middle" fontSize={9} fill="#7a8fa8">{xMax.toFixed(1)}</text>
      <text x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="#7a8fa8">
        {axis.toUpperCase()} (mm) →
      </text>
      <text x={8} y={(PAD.t + PAD.t + iH) / 2} textAnchor="middle" fontSize={9} fill="#7a8fa8"
        transform={`rotate(-90 8 ${(PAD.t + PAD.t + iH) / 2})`}>°C</text>
    </svg>
  );
}

// ─── 클릭 마커 (구체) ─────────────────────────────────────────────────────────
function ClickMarkers({ pointBCs, bbox, selectedId, onSelect }) {
  const size = bbox
    ? Math.max(bbox.x[1]-bbox.x[0], bbox.y[1]-bbox.y[0], bbox.z[1]-bbox.z[0]) * 0.025
    : 1;
  return (
    <>
      {pointBCs.map((bc) => (
        <mesh key={bc.id}
          position={[bc.x, bc.y, bc.z]}
          onClick={(e) => { e.stopPropagation(); onSelect(bc.id); }}>
          <sphereGeometry args={[size, 12, 12]} />
          <meshStandardMaterial
            color={bc.id === selectedId ? "#ffffff" : "#f97316"}
            emissive="#f97316"
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
    </>
  );
}

// ─── 빔 경로 시각화 ───────────────────────────────────────────────────────────
function BeamVisualization({ beamBCs, bbox, isPreview }) {
  if (!beamBCs || beamBCs.length === 0) return null;
  const size = bbox
    ? Math.max(bbox.x[1]-bbox.x[0], bbox.y[1]-bbox.y[0], bbox.z[1]-bbox.z[0]) * 2
    : 100;
  return (
    <>
      {beamBCs.map(bc => {
        const { id, origin, dir, radius, nodeIndices } = bc;
        const dv = new THREE.Vector3(dir.x, dir.y, dir.z).normalize();
        const yAxis = new THREE.Vector3(0, 1, 0);
        const d = dv.dot(yAxis);
        const q = new THREE.Quaternion();
        if (d > 0.9999) { /* identity */ }
        else if (d < -0.9999) q.setFromAxisAngle(new THREE.Vector3(1,0,0), Math.PI);
        else q.setFromUnitVectors(yAxis, dv);
        const color = isPreview ? "#a78bfa"
          : nodeIndices.length > 0 ? "#60a5fa" : "#ef4444";
        const cylOpacity = isPreview ? 0.08 : 0.2;
        const coneH = size * 0.04;
        const coneR = size * 0.007;
        // 화살표 위치: 원점에서 ±(반 길이 + 콘 절반) 방향
        const arrowOffset = size / 2 + coneH / 2;
        return (
          <group key={id}>
            {/* 빔 경로 반투명 실린더 */}
            <mesh position={[origin.x, origin.y, origin.z]}
              quaternion={[q.x, q.y, q.z, q.w]}>
              <cylinderGeometry args={[radius, radius, size, 32, 1, true]} />
              <meshStandardMaterial color={color} transparent opacity={cylOpacity}
                side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            {/* 원점 마커 (구) */}
            <mesh position={[origin.x, origin.y, origin.z]}>
              <sphereGeometry args={[Math.max(radius*0.5, size*0.012), 10, 10]} />
              <meshStandardMaterial color={color} emissive={color}
                emissiveIntensity={isPreview ? 0.3 : 0.8} transparent opacity={isPreview ? 0.5 : 1} />
            </mesh>
            {/* 진행 방향 화살표 (콘) — +방향 끝 */}
            <mesh
              position={[
                origin.x + dv.x * arrowOffset,
                origin.y + dv.y * arrowOffset,
                origin.z + dv.z * arrowOffset,
              ]}
              quaternion={[q.x, q.y, q.z, q.w]}>
              <coneGeometry args={[coneR, coneH, 16]} />
              <meshStandardMaterial color={color} emissive={color}
                emissiveIntensity={0.9} transparent opacity={isPreview ? 0.4 : 0.95} />
            </mesh>
            {/* 진행 방향 화살표 (콘) — -방향 끝 (빔 입사 반대쪽) */}
            <mesh
              position={[
                origin.x - dv.x * arrowOffset,
                origin.y - dv.y * arrowOffset,
                origin.z - dv.z * arrowOffset,
              ]}
              quaternion={[q.x, q.y, q.z, q.w]}>
              <coneGeometry args={[coneR, coneH, 16]} />
              <meshStandardMaterial color={color} emissive={color}
                emissiveIntensity={0.9} transparent opacity={isPreview ? 0.4 : 0.95} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function AutoCamera({ bbox }) {
  const { camera } = useThree();
  useMemo(() => {
    if (!bbox) return;
    const cx=(bbox.x[0]+bbox.x[1])/2, cy=(bbox.y[0]+bbox.y[1])/2, cz=(bbox.z[0]+bbox.z[1])/2;
    const size = Math.max(bbox.x[1]-bbox.x[0], bbox.y[1]-bbox.y[0], bbox.z[1]-bbox.z[0]);
    camera.position.set(cx+size*1.5, cy+size, cz+size*1.5);
    camera.lookAt(cx, cy, cz);
    camera.near = size*0.001; camera.far = size*100;
    camera.updateProjectionMatrix();
  }, [bbox, camera]);
  return null;
}

function ColorLegend({ tMin, tMax, useLog }) {
  const range = tMax - tMin;
  const uniform = range < 0.5;
  const fmt = v => v >= 1e6 ? (v/1e6).toFixed(2)+"M" : v >= 1e3 ? (v/1e3).toFixed(1)+"k" : v.toFixed(1);
  const marks = useLog
    ? [1,0.75,0.5,0.25,0].map(p => tMin + Math.expm1(p * Math.log1p(range)))
    : [0,0.25,0.5,0.75,1].map(p => tMax - p * range);
  return (
    <div className="th-legend">
      <div className="th-legend__bar" style={{ background:"linear-gradient(to top,#0000ff,#00ffff,#00ff00,#ffff00,#ff0000)" }} />
      <div className="th-legend__labels">
        {uniform
          ? <span style={{color:"#fbbf24",fontSize:10,textAlign:"center",lineHeight:1.3}}>
              균일<br/>{tMax.toFixed(1)}°C<br/>냉각면 추가 필요
            </span>
          : marks.map((v,i) => <span key={i}>{fmt(v)} °C</span>)
        }
      </div>
      {useLog && (
        <div style={{fontSize:9,color:"#a78bfa",textAlign:"center",marginTop:2,letterSpacing:0.3}}>
          로그 스케일
        </div>
      )}
    </div>
  );
}

// ─── 애니메이션 플레이어 ──────────────────────────────────────────────────────
function AnimPlayer({ timePoints, currentIdx, onSeek, playing, onPlayPause }) {
  return (
    <div className="th-anim-bar">
      <button className="th-anim-btn" onClick={onPlayPause}>
        {playing ? "⏸" : "▶"}
      </button>
      <input type="range" className="th-anim-slider"
        min={0} max={timePoints.length-1} value={currentIdx}
        onChange={e => onSeek(Number(e.target.value))} />
      <span className="th-anim-time">{timePoints[currentIdx]?.toFixed(2)} s</span>
    </div>
  );
}

// ─── GL 참조 (PNG 내보내기용) ─────────────────────────────────────────────────
function GlCapture({ glRef }) {
  const { gl } = useThree();
  useEffect(() => { glRef.current = gl; }, [gl, glRef]);
  return null;
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function ThermalAnalyzer({ onBack }) {
  // 파일 / 메시
  const [status, setStatus]       = useState("idle");
  const [meshData, setMeshData]   = useState(null);
  const [bbox, setBbox]           = useState(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [solveProgress, setSolveProgress]   = useState(null); // {step, total}
  const fileRef   = useRef(null);
  const glRef     = useRef(null);
  const workerRef = useRef(null);

  // 소재
  const [selMat, setSelMat]     = useState("sus304");
  const [conductivity, setK]    = useState(16.2);
  const [density, setRho]       = useState(7900);
  const [specificHeat, setCp]   = useState(500);
  const [heatSource, setQ]      = useState(0);
  const [meltPoint, setMeltPoint] = useState(1450);
  const [emissivity, setEps]    = useState(0.30);

  // 모델 단위 & 두께
  const [unitMM, setUnitMM]     = useState(true);   // true=mm, false=m
  const [thickness, setThick]   = useState(1);       // 두께 (선택 단위 기준)

  // 환경 설정
  const [envPreset, setEnvPreset] = useState("uhv");
  const [envHCustom, setEnvHCustom] = useState(0);
  const ENV_PRESETS = {
    uhv:       { label:"초고진공 (UHV)",       h: 2,    desc:"복사 냉각 ε≈0.1, PAL 기본 환경" },
    air_nat:   { label:"대기 자연대류",         h: 10,   desc:"h ≈ 10 W/m²K" },
    air_forced:{ label:"대기 강제대류",         h: 80,   desc:"h ≈ 80 W/m²K (팬 냉각)" },
    water:     { label:"간접 수냉",             h: 1000, desc:"h ≈ 1000 W/m²K" },
    custom:    { label:"직접 입력",             h: null, desc:"" },
  };
  const envH = envPreset === "custom" ? envHCustom : (ENV_PRESETS[envPreset]?.h ?? 0);

  const handleMaterial = useCallback((id) => {
    setSelMat(id);
    const m = MATERIALS.find(m => m.id===id);
    if (m?.k !== null) { setK(m.k); setRho(m.rho); setCp(m.cp); }
    if (m?.melt !== null) setMeltPoint(m.melt ?? null);
    if (m?.eps !== null) setEps(m.eps ?? 0.1);
  }, []);

  // 면 경계조건
  const [bcs, setBcs] = useState([
    { boundary:"min_z", temp:100 },
    { boundary:"max_z", temp:25  },
  ]);
  const addBC    = () => setBcs(p => [...p, { boundary:"min_z", temp:25 }]);
  const removeBC = i  => setBcs(p => p.filter((_,j) => j!==i));
  const updateBC = (i,k,v) => setBcs(p => p.map((b,j) => j===i ? {...b,[k]:v} : b));

  // 클릭 열원 경계조건 (Neumann — 열유량 W)
  const [clickMode, setClickMode]     = useState(false);
  const [clickWatts, setClickWatts]   = useState(100);      // 클릭 시 적용할 열유량 (W)
  const [clickRadius, setClickRadius] = useState(5);
  const [pointBCs, setPointBCs]       = useState([]);       // [{id, x, y, z, watts, nodeIndices}]
  const [selectedPBC, setSelectedPBC] = useState(null);
  const pbcIdRef = useRef(0);

  // 빔 경로 열원 (해석 실행 시 자동 적용 — 별도 "추가" 불필요)
  const [beamEnabled, setBeamEnabled] = useState(true);
  const [beamOriginX, setBeamOriginX] = useState(0);
  const [beamOriginY, setBeamOriginY] = useState(0);
  const [beamOriginZ, setBeamOriginZ] = useState(0);
  const [beamDirPreset, setBeamDirPreset] = useState("z");
  const [beamDirX, setBeamDirX]       = useState(0);
  const [beamDirY, setBeamDirY]       = useState(0);
  const [beamDirZ, setBeamDirZ]       = useState(1);
  const [beamRadius, setBeamRadius]   = useState(5);
  const [beamWatts, setBeamWatts]     = useState(2000);
  const [beamWattsUnit, setBeamWattsUnit] = useState("W"); // "W" | "kW"
  const [beamInputMode, setBeamInputMode] = useState("flux"); // "flux" | "temp"
  const [beamTemp, setBeamTemp]       = useState(500); // °C (온도 모드)
  const [beamNodeCount, setBeamNodeCount] = useState(null); // 마지막 해석의 빔 노드 수
  const [beamClickMode, setBeamClickMode] = useState(false);

  const handleMeshClick = useCallback((point) => {
    if (!meshData || !bbox) return;
    const span = Math.max(bbox.x[1]-bbox.x[0], bbox.y[1]-bbox.y[0], bbox.z[1]-bbox.z[0]);
    const radius = span * (clickRadius / 100);
    const nodeIndices = findNearbyNodes(meshData.nodes, point, radius);
    const id = ++pbcIdRef.current;
    setPointBCs(p => [...p, { id, x: point.x, y: point.y, z: point.z, watts: clickWatts, nodeIndices }]);
  }, [meshData, bbox, clickWatts, clickRadius]);

  const removePointBC = (id) => setPointBCs(p => p.filter(b => b.id !== id));
  const updatePointBC = (id, watts) =>
    setPointBCs(p => p.map(b => b.id===id ? {...b, watts: Number(watts)} : b));


  // 해석 유형
  const [mode, setMode]         = useState("steady"); // "steady" | "transient"
  const [initTemp, setInitTemp] = useState(20);
  const [timeHH, setTimeHH]     = useState(0);
  const [timeMM, setTimeMM]     = useState(1);
  const [timeSS, setTimeSS]     = useState(0);
  const totalTime = timeHH * 3600 + timeMM * 60 + timeSS;
  const [numSteps, setSteps]    = useState(50);

  // 결과
  const [steadyT, setSteadyT]   = useState(null);
  const [transResult, setTrans] = useState(null); // { snapshots, timePoints, tMin, tMax }
  const [tMin, setTMin]         = useState(0);
  const [tMax, setTMax]         = useState(100);

  // 애니메이션
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying]   = useState(false);
  const animRef = useRef(null);

  // 툴팁
  const [hoverInfo, setHoverInfo] = useState(null); // { x, y, temp }

  // 단면 그래프
  const [graphAxis, setGraphAxis] = useState("z");
  const [showGraph, setShowGraph] = useState(false);

  useEffect(() => {
    if (!playing || !transResult) return;
    animRef.current = setInterval(() => {
      setFrameIdx(i => {
        if (i >= transResult.snapshots.length-1) { setPlaying(false); return i; }
        return i+1;
      });
    }, 100);
    return () => clearInterval(animRef.current);
  }, [playing, transResult]);

  // 파일 로드 시 빔 원점 기본값: XY 중심, Z min 면
  useEffect(() => {
    if (!bbox) return;
    setBeamOriginX(+((bbox.x[0]+bbox.x[1])/2).toFixed(2));
    setBeamOriginY(+((bbox.y[0]+bbox.y[1])/2).toFixed(2));
    setBeamOriginZ(+bbox.z[0].toFixed(2));
    const maxSpan = Math.max(bbox.x[1]-bbox.x[0], bbox.y[1]-bbox.y[0], bbox.z[1]-bbox.z[0]);
    setBeamRadius(+(maxSpan * 0.15).toFixed(2));
  }, [bbox]);

  // 현재 표시 온도 배열 — 듀얼 메시일 때 FEM 결과를 정밀 메시 노드에 매핑
  const displayTemps = useMemo(() => {
    let rawT = null;
    if (mode === "steady") rawT = steadyT;
    else if (transResult) rawT = transResult.snapshots[frameIdx];
    if (!rawT) return null;
    if (meshData?.fineToCoarseMap && meshData.isDual) {
      const map = meshData.fineToCoarseMap;
      const mapped = new Float64Array(map.length);
      for (let i = 0; i < map.length; i++) mapped[i] = rawT[map[i]];
      return mapped;
    }
    return rawT;
  }, [mode, steadyT, transResult, frameIdx, meshData]);

  const exportCSV = useCallback(() => {
    if (!meshData || !displayTemps) return;
    const N = meshData.nodes.length / 3;
    const rows = ["index,x,y,z,T_degC"];
    for (let i = 0; i < N; i++)
      rows.push(`${i},${meshData.nodes[i*3].toFixed(4)},${meshData.nodes[i*3+1].toFixed(4)},${meshData.nodes[i*3+2].toFixed(4)},${displayTemps[i].toFixed(4)}`);
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "thermal_result.csv";
    a.click();
  }, [meshData, displayTemps]);

  const exportPNG = useCallback(() => {
    if (!glRef.current) return;
    const url = glRef.current.domElement.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "thermal_result.png";
    a.click();
  }, []);

  const exportReport = useCallback(() => {
    if (!meshData || !displayTemps) return;
    const N = meshData.nodes.length / 3;
    const avg = displayTemps.reduce((s, v) => s + v, 0) / N;
    const mat = MATERIALS.find(m => m.id === selMat);
    const now = new Date().toLocaleString("ko-KR");
    const lines = [
      "═══════════════════════════════════════════",
      "  PALAB 스튜디오 — 열해석 결과 보고서",
      "═══════════════════════════════════════════",
      `생성일시: ${now}`,
      "",
      "─── 해석 조건 ─────────────────────────────",
      `해석 유형  : ${mode === "steady" ? "정상상태" : "과도 (Transient)"}`,
      `소재       : ${mat?.name ?? selMat}`,
      `열전도율 k : ${conductivity} W/m·K`,
      `두께 t     : ${thickness} ${unitMM ? "mm" : "m"}`,
      `내부발열 Q : ${heatSource} W/m³`,
      `방사율 ε   : ${emissivity}`,
      `환경 h     : ${envH} W/m²K`,
      "",
      "─── 빔 경로 열원 ──────────────────────────",
      `활성화     : ${beamEnabled ? "ON" : "OFF"}`,
      beamEnabled ? `열원       : ${beamWattsUnit === "kW" ? (beamWatts/1000).toFixed(1)+"kW" : beamWatts+"W"}` : "",
      beamEnabled ? `반경       : ${beamRadius} mm` : "",
      beamEnabled ? `방향       : ${beamDirPreset.toUpperCase()}축` : "",
      "",
      "─── 면 경계조건 ───────────────────────────",
      ...bcs.map(b => `  ${bcLabel(b.boundary).padEnd(8)}: ${b.temp} °C`),
      bcs.length === 0 ? "  (없음)" : "",
      "",
      "─── 해석 결과 ─────────────────────────────",
      `최고 온도  : ${tMax.toFixed(2)} °C`,
      `최저 온도  : ${tMin.toFixed(2)} °C`,
      `평균 온도  : ${avg.toFixed(2)} °C`,
      `온도 범위  : ${(tMax - tMin).toFixed(2)} °C`,
      mat?.melt ? `용융점 대비: ${((tMax / mat.melt) * 100).toFixed(1)} % (용융점 ${mat.melt} °C)` : "",
      tMax > (mat?.melt ?? Infinity) ? "⚠ 경고: 최고 온도가 용융점을 초과합니다!" : "",
      "",
      "─── 주의사항 ──────────────────────────────",
      "• 본 결과는 초기 검토용 Shell FEM 해석입니다.",
      "• 두께 방향 온도 구배 미반영 (Shell FEM 한계)",
      "• 최종 설계 검증은 상용 FEM (ANSYS 등) 필요",
      "═══════════════════════════════════════════",
    ].filter(l => l !== undefined);
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "thermal_report.txt";
    a.click();
  }, [meshData, displayTemps, selMat, conductivity, heatSource, thickness, unitMM,
      emissivity, envH, beamEnabled, beamWatts, beamWattsUnit, beamRadius, beamDirPreset,
      bcs, tMin, tMax, mode]);

  // 로그 스케일: 온도 범위가 100°C 초과 시 자동 전환 (극단적 열점 가시화)
  const useLogScale = displayTemps != null && (tMax - tMin) > 100;

  // 빔 방향 (입력값 실시간 반영)
  const currentBeamDir = useMemo(() => (
    beamDirPreset === "x" ? { x:1, y:0, z:0 }
    : beamDirPreset === "y" ? { x:0, y:1, z:0 }
    : beamDirPreset === "z" ? { x:0, y:0, z:1 }
    : { x:+beamDirX, y:+beamDirY, z:+beamDirZ }
  ), [beamDirPreset, beamDirX, beamDirY, beamDirZ]);

  // ─── 파일 업로드 ────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("parsing"); setErrorMsg(""); setSteadyT(null); setTrans(null);
    try {
      let mesh;
      if (file.name.toLowerCase().match(/\.step$|\.stp$/)) {
        setStatus("loading-occt");
        const { parseSTEP, buildNearestMap } = await import("./thermal/stepParser");
        mesh = await parseSTEP(await file.arrayBuffer());
        if (mesh.isDual) {
          // 정밀 메시 bbox로 최근접 매핑 미리 계산
          const bb0 = meshBBox(mesh.nodes);
          mesh = { ...mesh, fineToCoarseMap: buildNearestMap(mesh.femNodes, mesh.nodes, bb0) };
        }
      } else {
        const raw = parseSTL(await file.arrayBuffer());
        mesh = { ...raw, femNodes: raw.nodes, femElements: raw.elements, isDual: false, fineToCoarseMap: null };
      }
      const bb = meshBBox(mesh.nodes);
      setMeshData(mesh);
      setBbox(bb);
      // 두께 자동 제안: bbox 최소 치수
      const spans = [bb.x[1]-bb.x[0], bb.y[1]-bb.y[0], bb.z[1]-bb.z[0]];
      setThick(+Math.min(...spans).toFixed(3));
      setStatus("ready");
    } catch (err) {
      setErrorMsg(String(err)); setStatus("error");
    }
    e.target.value = "";
  }, []);

  // ─── 해석 실행 (Web Worker) ─────────────────────────────────────────────────
  const handleSolve = useCallback(() => {
    if (!meshData) return;
    const noHeatSource = +heatSource === 0 && pointBCs.length === 0 && !beamEnabled;
    if (noHeatSource && bcs.length === 0) {
      setErrorMsg("⚠️ 열원이 없습니다. 빔 열원을 ON으로 켜거나, 클릭 열원을 추가하거나, 면 온도 경계조건을 설정하세요.");
      return;
    }

    // 빔 경로 전처리 (메인 스레드에서만 가능)
    let beamAsPointBC = [];
    let extraDirichlet = new Map();
    if (beamEnabled) {
      const bDir = beamDirPreset === "x" ? {x:1,y:0,z:0}
                 : beamDirPreset === "y" ? {x:0,y:1,z:0}
                 : beamDirPreset === "z" ? {x:0,y:0,z:1}
                 : {x:+beamDirX, y:+beamDirY, z:+beamDirZ};
      const bOrigin = {x:+beamOriginX, y:+beamOriginY, z:+beamOriginZ};
      const femN = meshData.femNodes ?? meshData.nodes;
      const bNodes = findBeamNodes(femN, bOrigin, bDir, +beamRadius);
      setBeamNodeCount(bNodes.length);
      if (bNodes.length === 0) {
        const minD = minBeamDist(femN, bOrigin, bDir);
        const minR = isFinite(minD) ? (minD * 1.1).toFixed(3) : null;
        setStatus("error");
        setErrorMsg(`⚠️ 빔 경로에 노드 없음 — 반경을 최소 ${minR ?? "?"}mm 이상으로 늘리거나 "최소 반경 자동" 버튼을 클릭하세요.`);
        return;
      }
      if (beamInputMode === "flux" && +beamWatts > 0) {
        beamAsPointBC = [{id:"beam", nodeIndices:bNodes, watts:+beamWatts}];
      } else if (beamInputMode === "temp") {
        bNodes.forEach(ni => extraDirichlet.set(ni, +beamTemp));
      }
    } else {
      setBeamNodeCount(null);
    }

    const thicknessM = unitMM ? +thickness * 1e-3 : +thickness;
    const coordScale = unitMM ? 1e-3 : 1.0;
    const common = {
      conductivity:+conductivity, heatSource:+heatSource, bcs,
      pointBCs: [...pointBCs, ...beamAsPointBC],
      ambientTemp:+initTemp, thicknessM, coordScale, envH:+envH,
      extraDirichlet, emissivity:+emissivity,
    };

    // 기존 워커 종료
    // 노드 수 과다 경고 (FEM 연립방정식 크기 = FEM 노드 수)
    const femNodes = meshData.femNodes ?? meshData.nodes;
    const femElements = meshData.femElements ?? meshData.elements;
    const N = femNodes.length / 3;
    if (N > 60000) {
      setErrorMsg(`⚠️ FEM 노드 ${N.toLocaleString()}개는 브라우저 FEM 한계를 초과합니다.\nSTL로 변환하거나 단품으로 나눠서 업로드해 주세요.`);
      return;
    }
    if (N > 20000) {
      setErrorMsg(`⚠️ FEM 노드 ${N.toLocaleString()}개 — 해석에 수 분이 걸릴 수 있습니다.`);
      // 경고만, 해석은 계속
    }

    if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null; }
    setStatus("solving"); setSteadyT(null); setTrans(null); setSolveProgress(null);

    const totalSteps = mode === "transient" ? +numSteps : null;
    const transientParams = mode === "transient"
      ? { ...common, density:+density, specificHeat:+specificHeat,
          initialTemp:+initTemp, totalTime:+totalTime, numSteps:+numSteps }
      : null;

    // ── 동기 폴백 함수 (Worker 실패 시 사용) ────────────────────────────────
    const runSync = () => {
      setTimeout(() => {
        try {
          if (mode === "steady") {
            const T = solveHeat(femNodes, femElements, bbox, common);
            setSteadyT(T);
            let mn = T[0], mx = T[0];
            for (let i = 1; i < T.length; i++) { if (T[i]<mn) mn=T[i]; if (T[i]>mx) mx=T[i]; }
            setTMin(mn); setTMax(mx);
          } else {
            const r = solveTransient(femNodes, femElements, bbox, {
              ...transientParams,
              onStep: (step) => setSolveProgress({ step: step+1, total: totalSteps }),
            });
            setTrans(r); setFrameIdx(0); setTMin(r.tMin); setTMax(r.tMax);
          }
          setStatus("done"); setSolveProgress(null);
        } catch(err) {
          setErrorMsg(String(err)); setStatus("error"); setSolveProgress(null);
        }
      }, 30);
    };

    // ── Web Worker 시도 ───────────────────────────────────────────────────────
    let worker;
    try {
      worker = new Worker(
        new URL('./thermal/femWorker.js', import.meta.url), { type: 'module' }
      );
    } catch {
      runSync(); return;
    }
    workerRef.current = worker;

    worker.onmessage = ({ data }) => {
      if (data.type === 'step') {
        setSolveProgress({ step: data.step + 1, total: totalSteps });
      } else if (data.type === 'done') {
        if (mode === 'steady') {
          const T = data.T;
          setSteadyT(T);
          let mn = T[0], mx = T[0];
          for (let i = 1; i < T.length; i++) { if (T[i]<mn) mn=T[i]; if (T[i]>mx) mx=T[i]; }
          setTMin(mn); setTMax(mx);
        } else {
          const r = data.result;
          setTrans(r); setFrameIdx(0); setTMin(r.tMin); setTMax(r.tMax);
        }
        setStatus("done"); setSolveProgress(null);
        workerRef.current = null;
      } else if (data.type === 'error') {
        setErrorMsg(data.msg); setStatus("error"); setSolveProgress(null);
        workerRef.current = null;
      }
    };
    worker.onerror = () => {
      workerRef.current = null;
      runSync();
    };

    // extraDirichlet(Map)은 structured clone 지원 — 직접 전달
    const payload = {
      type: mode, nodes: femNodes, elements: femElements, bbox,
      params: transientParams ?? common,
    };
    worker.postMessage(payload);
  }, [meshData, bbox, conductivity, heatSource, bcs, pointBCs, beamEnabled, beamWatts, beamWattsUnit, beamInputMode, beamTemp, beamDirPreset, beamDirX, beamDirY, beamDirZ, beamOriginX, beamOriginY, beamOriginZ, beamRadius, mode, density, specificHeat, initTemp, totalTime, numSteps, unitMM, thickness, envH, emissivity]);

  const busy = ["parsing","loading-occt","solving"].includes(status);
  const nodeCount = meshData ? meshData.nodes.length/3 : 0;
  const elemCount = meshData ? meshData.elements.length/3 : 0;

  const statusLabel = {
    parsing: "STL 파싱 중…",
    "loading-occt": "STEP 엔진 로드 중…",
    solving: solveProgress
      ? `계산 중… ${solveProgress.step}/${solveProgress.total} 스텝`
      : (mode==="transient" ? `과도해석 계산 중… (${numSteps}스텝)` : "정상상태 해석 중…"),
  }[status] ?? null;

  return (
    <div className="app th-app">
      <header className="th-header">
        <h2>열해석 (Thermal Analysis)</h2>
        <button className="button" style={{padding:"6px 20px", fontSize:14, marginLeft:"auto"}}
          onClick={handleSolve} disabled={busy||!meshData}>
          {statusLabel ?? "해석 실행"}
        </button>
        <span className="tool-badge tool-badge--active">Pure JS · Phase 2</span>
        <button className="ghost-button" onClick={onBack}>대문으로 돌아가기</button>
      </header>

      <div className="th-layout">
        {/* ── 왼쪽 패널 ── */}
        <aside className="th-panel">

          {/* 1. 파일 업로드 */}
          <section className="th-section">
            <h3>1. 모델 파일 업로드</h3>
            <input ref={fileRef} type="file" accept=".stl,.step,.stp"
              style={{display:"none"}} onChange={handleFile} />
            <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:6}}>
              <button className="button" style={{flex:1}} onClick={() => fileRef.current?.click()} disabled={busy}>
                {statusLabel ?? "STL / STEP 선택"}
              </button>
            </div>
            {meshData && bbox && (
              <div className="th-info-box">
                <p>표시 노드: <strong>{nodeCount.toLocaleString()}</strong></p>
                {meshData.isDual && (
                  <p>FEM 노드: <strong>{((meshData.femNodes?.length ?? 0)/3).toLocaleString()}</strong>
                    <span style={{color:"#34d399", fontSize:11, marginLeft:4}}>자동 최적화</span>
                  </p>
                )}
                <p>요소: <strong>{elemCount.toLocaleString()}</strong></p>
                <p>X: {bbox.x[0].toFixed(2)} ~ {bbox.x[1].toFixed(2)}</p>
                <p>Y: {bbox.y[0].toFixed(2)} ~ {bbox.y[1].toFixed(2)}</p>
                <p>Z: {bbox.z[0].toFixed(2)} ~ {bbox.z[1].toFixed(2)}</p>
              </div>
            )}
          </section>

          {/* 2. 해석 유형 */}
          <section className="th-section">
            <h3>2. 해석 유형</h3>
            <div className="th-mode-row">
              <button className={`th-mode-btn${mode==="steady"?" active":""}`}
                onClick={() => setMode("steady")}>
                정상상태
                <span>최종 온도 분포</span>
              </button>
              <button className={`th-mode-btn${mode==="transient"?" active":""}`}
                onClick={() => setMode("transient")}>
                과도 (Transient)
                <span>시간별 온도 변화</span>
              </button>
            </div>
            {mode==="transient" && (
              <div className="th-transient-params">
                <label className="th-label">초기온도 T₀ (°C)
                  <input type="number" className="th-input" value={initTemp}
                    onChange={e => setInitTemp(e.target.value)} /></label>
                <label className="th-label">총 해석 시간</label>
                <div className="th-time-row">
                  <input type="number" className="th-input th-time-input" value={timeHH}
                    min={0} onChange={e => setTimeHH(Math.max(0,+e.target.value))} />
                  <span className="th-time-unit">시</span>
                  <input type="number" className="th-input th-time-input" value={timeMM}
                    min={0} max={59} onChange={e => setTimeMM(Math.min(59,Math.max(0,+e.target.value)))} />
                  <span className="th-time-unit">분</span>
                  <input type="number" className="th-input th-time-input" value={timeSS}
                    min={0} max={59} onChange={e => setTimeSS(Math.min(59,Math.max(0,+e.target.value)))} />
                  <span className="th-time-unit">초</span>
                </div>
                <div className="th-hint">총 {totalTime.toLocaleString()} 초</div>
                <label className="th-label">시간 단계 수
                  <input type="number" className="th-input" value={numSteps} min={5} max={500}
                    onChange={e => setSteps(e.target.value)} /></label>
                <div className="th-hint">dt = {(totalTime/numSteps).toFixed(3)} s/step</div>
              </div>
            )}
          </section>

          {/* 3. 소재 선택 */}
          <section className="th-section" style={{gridColumn:"1/-1"}}>
            <h3>3. 소재 선택</h3>
            <div className="th-material-grid">
              {MATERIALS.map(m => (
                <button key={m.id}
                  className={`th-material-chip${selMat===m.id?" selected":""}`}
                  onClick={() => handleMaterial(m.id)}>
                  <span className="th-material-chip__name">{m.name}</span>
                  <span className="th-material-chip__k">{m.k!==null?`k=${m.k}`:"직접 입력"}</span>
                </button>
              ))}
            </div>
            {/* 소재 속성 + 환경 */}
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", gap:6, alignItems:"end"}}>
              <label className="th-label">열전도율 k (W/m·K)
                <input type="number" className="th-input" value={conductivity} min={0.001} step="any"
                  onChange={e => { setK(e.target.value); setSelMat("custom"); }} /></label>
              <label className="th-label">내부 발열 Q (W/m³)
                <input type="number" className="th-input" value={heatSource} min={0} step="any"
                  onChange={e => setQ(e.target.value)} /></label>
              <label className="th-label">두께 t ({unitMM?"mm":"m"})
                <div style={{display:"flex", gap:4, alignItems:"center"}}>
                  <input type="number" className="th-input" value={thickness} min={0.001} step="any"
                    onChange={e => setThick(e.target.value)} style={{width:60}} />
                  <div className="th-toggle-pair" style={{flexShrink:0}}>
                    <button className={`th-toggle-btn${unitMM?" active":""}`} onClick={() => setUnitMM(true)}>mm</button>
                    <button className={`th-toggle-btn${!unitMM?" active":""}`} onClick={() => setUnitMM(false)}>m</button>
                  </div>
                </div>
              </label>
              <label className="th-label">방사율 ε
                <input type="number" className="th-input" value={emissivity}
                  min={0} max={1} step={0.01}
                  onChange={e => { setEps(Math.min(1, Math.max(0, +e.target.value))); setSelMat("custom"); }} />
                <span className="th-hint-inline" style={{marginTop:2}}>
                  {emissivity <= 0 ? "복사 없음" : emissivity < 0.1 ? "광택 금속" : emissivity < 0.4 ? "가공면" : "산화/세라믹"}
                </span>
              </label>
              <label className="th-label">환경
                <select className="th-select" value={envPreset} onChange={e => setEnvPreset(e.target.value)}>
                  {Object.entries(ENV_PRESETS).map(([k,v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                {envPreset !== "custom" && <span className="th-hint-inline" style={{marginTop:2}}>{ENV_PRESETS[envPreset].h} W/m²K</span>}
              </label>
            </div>
            {mode==="transient" && (
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:6}}>
                <label className="th-label">밀도 ρ (kg/m³)
                  <input type="number" className="th-input" value={density} min={1} step="any"
                    onChange={e => { setRho(e.target.value); setSelMat("custom"); }} /></label>
                <label className="th-label">비열 Cp (J/kg·K)
                  <input type="number" className="th-input" value={specificHeat} min={1} step="any"
                    onChange={e => { setCp(e.target.value); setSelMat("custom"); }} /></label>
              </div>
            )}
            {envPreset === "custom" && (
              <label className="th-label" style={{maxWidth:160}}>h (W/m²K)
                <input type="number" className="th-input" value={envHCustom} min={0} step="any"
                  onChange={e => setEnvHCustom(+e.target.value)} />
              </label>
            )}
          </section>

          {/* 4. 빔 경로 열원 */}
          <section className="th-section" style={{gridColumn:"1/-1"}}>
            <h3>4. 빔 경로 열원</h3>

            {/* 원점: 프리셋 + 좌표 */}
            <div style={{display:"flex", alignItems:"center", gap:12, flexWrap:"wrap"}}>
              <div style={{display:"flex", gap:4, flexWrap:"wrap", alignItems:"center"}}>
                <span style={{fontSize:12, color:"#7a8fa8", marginRight:2}}>원점</span>
                {bbox && [
                  ["center","중심", ()=>{ const cx=+((bbox.x[0]+bbox.x[1])/2).toFixed(2); const cy=+((bbox.y[0]+bbox.y[1])/2).toFixed(2); const cz=+((bbox.z[0]+bbox.z[1])/2).toFixed(2); setBeamOriginX(cx); setBeamOriginY(cy); setBeamOriginZ(cz); }],
                  ["+X","+X", ()=>{ setBeamOriginX(+bbox.x[1].toFixed(2)); setBeamOriginY(+((bbox.y[0]+bbox.y[1])/2).toFixed(2)); setBeamOriginZ(+((bbox.z[0]+bbox.z[1])/2).toFixed(2)); }],
                  ["-X","-X", ()=>{ setBeamOriginX(+bbox.x[0].toFixed(2)); setBeamOriginY(+((bbox.y[0]+bbox.y[1])/2).toFixed(2)); setBeamOriginZ(+((bbox.z[0]+bbox.z[1])/2).toFixed(2)); }],
                  ["+Y","+Y", ()=>{ setBeamOriginX(+((bbox.x[0]+bbox.x[1])/2).toFixed(2)); setBeamOriginY(+bbox.y[1].toFixed(2)); setBeamOriginZ(+((bbox.z[0]+bbox.z[1])/2).toFixed(2)); }],
                  ["-Y","-Y", ()=>{ setBeamOriginX(+((bbox.x[0]+bbox.x[1])/2).toFixed(2)); setBeamOriginY(+bbox.y[0].toFixed(2)); setBeamOriginZ(+((bbox.z[0]+bbox.z[1])/2).toFixed(2)); }],
                  ["+Z","+Z", ()=>{ setBeamOriginX(+((bbox.x[0]+bbox.x[1])/2).toFixed(2)); setBeamOriginY(+((bbox.y[0]+bbox.y[1])/2).toFixed(2)); setBeamOriginZ(+bbox.z[1].toFixed(2)); }],
                  ["-Z","-Z", ()=>{ setBeamOriginX(+((bbox.x[0]+bbox.x[1])/2).toFixed(2)); setBeamOriginY(+((bbox.y[0]+bbox.y[1])/2).toFixed(2)); setBeamOriginZ(+bbox.z[0].toFixed(2)); }],
                ].map(([k,l,fn]) => (
                  <button key={k} className="th-beam-preset-btn" style={{fontSize:12, padding:"3px 8px"}} onClick={fn}>{l}</button>
                ))}
              </div>
              <div className="th-xyz-row" style={{flex:"0 0 auto"}}>
                <label style={{fontSize:13}}>X<input type="number" className="th-input th-input--xs"
                  value={beamOriginX} step="any" onChange={e=>setBeamOriginX(e.target.value)} /></label>
                <label style={{fontSize:13}}>Y<input type="number" className="th-input th-input--xs"
                  value={beamOriginY} step="any" onChange={e=>setBeamOriginY(e.target.value)} /></label>
                <label style={{fontSize:13}}>Z<input type="number" className="th-input th-input--xs"
                  value={beamOriginZ} step="any" onChange={e=>setBeamOriginZ(e.target.value)} /></label>
              </div>
            </div>

            <label className="th-label">빔 방향</label>
            <div className="th-toggle-pair" style={{flexWrap:"wrap",gap:4}}>
              {[["x","X 축"],["y","Y 축"],["z","Z 축"],["custom","사용자"]].map(([k,l]) => (
                <button key={k} className={`th-toggle-btn${beamDirPreset===k?" active":""}`}
                  onClick={() => setBeamDirPreset(k)}>{l}</button>
              ))}
            </div>
            {beamDirPreset === "custom" && (
              <div className="th-xyz-row" style={{marginTop:6}}>
                <label>dX<input type="number" className="th-input th-input--xs"
                  value={beamDirX} step="any" onChange={e=>setBeamDirX(e.target.value)} /></label>
                <label>dY<input type="number" className="th-input th-input--xs"
                  value={beamDirY} step="any" onChange={e=>setBeamDirY(e.target.value)} /></label>
                <label>dZ<input type="number" className="th-input th-input--xs"
                  value={beamDirZ} step="any" onChange={e=>setBeamDirZ(e.target.value)} /></label>
              </div>
            )}

            <label className="th-label">빔 반경 ({unitMM ? "mm" : "m"})
              <div style={{display:"flex", gap:6, alignItems:"center"}}>
                <input type="number" className="th-input" value={beamRadius} min={0.01} step="any"
                  onChange={e=>setBeamRadius(e.target.value)} />
                <button className="th-btn th-btn--xs" title="빔 축에 가장 가까운 노드까지 거리로 자동 설정"
                  onClick={() => {
                    if (!meshData) return;
                    const bDir = beamDirPreset === "x" ? {x:1,y:0,z:0}
                               : beamDirPreset === "y" ? {x:0,y:1,z:0}
                               : beamDirPreset === "z" ? {x:0,y:0,z:1}
                               : {x:+beamDirX, y:+beamDirY, z:+beamDirZ};
                    const bOrigin = {x:+beamOriginX, y:+beamOriginY, z:+beamOriginZ};
                    const minD = minBeamDist(meshData.femNodes ?? meshData.nodes, bOrigin, bDir);
                    if (isFinite(minD)) setBeamRadius(+(minD * 1.1).toFixed(3));
                  }}>최소 반경 자동</button>
              </div>
            </label>

            {/* 열원 입력: W / kW / °C 모드 */}
            <div style={{display:"flex", alignItems:"center", gap:6, flexWrap:"wrap"}}>
              <span style={{fontSize:12, color:"#7a8fa8", flexShrink:0}}>열원</span>
              {/* 단위/모드 토글 */}
              <div className="th-toggle-pair" style={{flexShrink:0}}>
                <button className={`th-toggle-btn${beamInputMode==="flux"&&beamWattsUnit==="W"?" active":""}`}
                  onClick={() => { setBeamInputMode("flux"); setBeamWattsUnit("W"); }}>W</button>
                <button className={`th-toggle-btn${beamInputMode==="flux"&&beamWattsUnit==="kW"?" active":""}`}
                  onClick={() => { setBeamInputMode("flux"); setBeamWattsUnit("kW"); }}>kW</button>
                <button className={`th-toggle-btn${beamInputMode==="temp"?" active":""}`}
                  style={beamInputMode==="temp"?{borderColor:"#f97316",color:"#fb923c"}:{}}
                  onClick={() => setBeamInputMode("temp")}>°C</button>
              </div>
              {beamInputMode === "flux" ? (<>
                <div className="th-beam-presets" style={{marginBottom:0, flexWrap:"nowrap"}}>
                  {[{l:"100W",v:100},{l:"500W",v:500},{l:"2kW",v:2000},
                    {l:"5kW",v:5000},{l:"10kW",v:10000},{l:"50kW",v:50000}].map(p => (
                    <button key={p.v}
                      className={`th-beam-preset-btn${beamWatts===p.v?" active":""}`}
                      onClick={() => setBeamWatts(p.v)}>{p.l}</button>
                  ))}
                </div>
                <input type="number" className="th-input" style={{width:70}}
                  value={beamWattsUnit==="kW" ? +(beamWatts/1000).toFixed(3) : beamWatts}
                  min={0} step={beamWattsUnit==="kW" ? 0.1 : 1}
                  onChange={e => setBeamWatts(beamWattsUnit==="kW" ? +e.target.value*1000 : +e.target.value)} />
              </>) : (<>
                {/* 온도 모드: 프리셋 + 직접입력 */}
                <div className="th-beam-presets" style={{marginBottom:0, flexWrap:"nowrap"}}>
                  {[{l:"100°C",v:100},{l:"300°C",v:300},{l:"500°C",v:500},
                    {l:"800°C",v:800},{l:"1000°C",v:1000}].map(p => (
                    <button key={p.v}
                      className={`th-beam-preset-btn${beamTemp===p.v?" active":""}`}
                      style={{borderColor:"rgba(249,115,22,0.4)",color:"#fb923c"}}
                      onClick={() => setBeamTemp(p.v)}>{p.l}</button>
                  ))}
                </div>
                <input type="number" className="th-input" style={{width:70}}
                  value={beamTemp} min={-200} max={5000} step={10}
                  onChange={e => setBeamTemp(+e.target.value)} />
                <span style={{fontSize:12, color:"#7a8fa8"}}>°C</span>
              </>)}
            </div>

            {/* 활성화 토글 */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
              <button
                className={`th-click-toggle${beamEnabled?" active":""}`}
                style={{flex:1}}
                onClick={() => setBeamEnabled(v => !v)}
                disabled={!meshData}>
                {beamEnabled ? "✓ 빔 열원 ON — 해석 실행 시 자동 적용" : "빔 열원 OFF (클릭하여 켜기)"}
              </button>
            </div>
            {beamEnabled && (
              <p className="th-hint" style={{marginTop:4}}>
                {beamNodeCount === null
                  ? "해석 실행 시 현재 파라미터로 빔 노드를 자동 탐색합니다."
                  : beamNodeCount > 0
                    ? <span style={{color:"#60a5fa"}}>빔 적용: <strong>{beamNodeCount}개</strong> 노드 × {beamWatts>=1000?(beamWatts/1000).toFixed(1)+"kW":beamWatts+"W"} (반경 {(+beamRadius).toFixed(3)}mm)</span>
                    : <span style={{color:"#ef4444"}}>노드 0개 — 빔 원점이 모델 밖에 있는지 확인하세요</span>
                }
              </p>
            )}
          </section>

          {/* 5. 클릭 열원 */}
          <section className="th-section">
            <h3>5. 클릭 열원</h3>
            <p className="th-bc-desc">
              모델 표면을 클릭해 국소 열원(W)을 지정합니다.
              <span className="th-bc-desc--sub"> 클릭 모드 ON 후 3D 뷰에서 클릭</span>
            </p>
            <div style={{display:"flex", gap:8, alignItems:"flex-end", flexWrap:"wrap", marginBottom:6}}>
              <label className="th-label" style={{flex:1}}>열유량 (W)
                <input type="number" className="th-input" value={clickWatts} min={0} step={10}
                  onChange={e => setClickWatts(+e.target.value)} />
              </label>
              <label className="th-label" style={{flex:1}}>반경 (스팬 %)
                <input type="number" className="th-input" value={clickRadius} min={0.1} max={50} step={0.5}
                  onChange={e => setClickRadius(+e.target.value)} />
              </label>
              <button
                className={`th-click-toggle${clickMode?" active":""}`}
                onClick={() => setClickMode(v => !v)}
                disabled={!meshData}>
                {clickMode ? "✓ 클릭 모드 ON" : "클릭 모드 OFF"}
              </button>
            </div>
            {pointBCs.length > 0 && (
              <div style={{display:"flex", flexDirection:"column", gap:4}}>
                {pointBCs.map(bc => (
                  <div key={bc.id} className="th-bc-card"
                    style={{background: selectedPBC===bc.id ? "rgba(249,115,22,0.15)" : undefined, cursor:"pointer"}}
                    onClick={() => setSelectedPBC(bc.id)}>
                    <div className="th-bc-card__header">
                      <span className="th-bc-face-dot" style={{background:"#f97316"}} />
                      <span className="th-bc-card__label">
                        ({bc.x.toFixed(1)}, {bc.y.toFixed(1)}, {bc.z.toFixed(1)}) — {bc.nodeIndices.length}노드
                      </span>
                      <button className="th-del" onClick={e => { e.stopPropagation(); removePointBC(bc.id); }}>✕</button>
                    </div>
                    <div className="th-bc-card__body">
                      <input type="number" className="th-input th-input--sm" value={bc.watts} min={0} step={10}
                        onClick={e => e.stopPropagation()}
                        onChange={e => updatePointBC(bc.id, e.target.value)} />
                      <span className="th-unit">W</span>
                    </div>
                  </div>
                ))}
                <button className="ghost-button th-add" onClick={() => setPointBCs([])}>전체 삭제</button>
              </div>
            )}
          </section>

          {/* 6. 면 경계조건 */}
          <section className="th-section">
            <h3>6. 면 온도 경계조건</h3>
            <p className="th-bc-desc">
              어느 면이 몇 도인지 지정합니다.
              <span className="th-bc-desc--sub"> 예) 냉각면 = 20°C, 열원면 = 150°C</span>
            </p>
            {bcs.length === 0 && (
              <p className="th-bc-desc" style={{color:"#fbbf24"}}>
                면 BC 없음 — 초기온도({initTemp}°C) 기준으로 자동 해석합니다
              </p>
            )}
            {bcs.map((bc,i) => (
              <div key={i} className="th-bc-card">
                <div className="th-bc-card__header">
                  <span className="th-bc-face-dot" style={{background:bcTempColor(bc.temp)}} />
                  <span className="th-bc-card__label">{bcLabel(bc.boundary)}</span>
                  <button className="th-del" onClick={() => removeBC(i)}>✕</button>
                </div>
                <div className="th-bc-card__body">
                  <select className="th-select" value={bc.boundary}
                    onChange={e => updateBC(i,"boundary",e.target.value)}>
                    <option value="min_z">아랫면</option>
                    <option value="max_z">윗면</option>
                    <option value="min_y">앞면</option>
                    <option value="max_y">뒷면</option>
                    <option value="min_x">왼쪽 면</option>
                    <option value="max_x">오른쪽 면</option>
                    <option value="all">전체 표면</option>
                  </select>
                  <div className="th-bc-temp-row">
                    <input type="number" className="th-input th-input--sm" value={bc.temp}
                      onChange={e => updateBC(i,"temp",e.target.value)} />
                    <span className="th-unit">°C</span>
                    <span className="th-bc-temp-hint">{bcTempHint(bc.temp)}</span>
                  </div>
                </div>
              </div>
            ))}
            <button className="ghost-button th-add" onClick={addBC}>+ 면 추가</button>
          </section>

        </aside>

        {/* ── 3D 뷰포트 ── */}
        <div className="th-viewport">
          {meshData ? (
            <>
              <Canvas
                camera={{fov:45}}
                gl={{ preserveDrawingBuffer: true }}
                style={{background:"#0f0f1a", cursor: (clickMode||beamClickMode) ? "crosshair" : "grab"}}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10,10,10]} intensity={0.8} />
                <directionalLight position={[-10,-5,-10]} intensity={0.3} />
                <AutoCamera bbox={bbox} />
                <ThermalMesh
                  meshData={meshData}
                  temperatures={displayTemps}
                  tMin={tMin} tMax={tMax}
                  clickMode={clickMode || beamClickMode}
                  useLog={useLogScale}
                  onHover={setHoverInfo}
                  onMeshClick={(pt) => {
                    if (beamClickMode) {
                      // 축 정렬 빔: 빔 축 방향 좌표만 클릭에서, 수직 좌표는 bbox 중심으로 스냅
                      const cx = +((bbox.x[0]+bbox.x[1])/2).toFixed(2);
                      const cy = +((bbox.y[0]+bbox.y[1])/2).toFixed(2);
                      const cz = +((bbox.z[0]+bbox.z[1])/2).toFixed(2);
                      if (beamDirPreset === "z") {
                        setBeamOriginX(cx); setBeamOriginY(cy);
                        setBeamOriginZ(+pt.z.toFixed(2));
                      } else if (beamDirPreset === "y") {
                        setBeamOriginX(cx); setBeamOriginZ(cz);
                        setBeamOriginY(+pt.y.toFixed(2));
                      } else if (beamDirPreset === "x") {
                        setBeamOriginY(cy); setBeamOriginZ(cz);
                        setBeamOriginX(+pt.x.toFixed(2));
                      } else {
                        // 사용자 방향: 클릭 좌표 그대로
                        setBeamOriginX(+pt.x.toFixed(2));
                        setBeamOriginY(+pt.y.toFixed(2));
                        setBeamOriginZ(+pt.z.toFixed(2));
                      }
                      setBeamClickMode(false);
                    } else {
                      handleMeshClick(pt);
                    }
                  }}
                />
                <ClickMarkers
                  pointBCs={pointBCs}
                  bbox={bbox}
                  selectedId={selectedPBC}
                  onSelect={setSelectedPBC}
                />
                {/* 빔 경로 미리보기 — 활성화 시 파란색, 비활성 시 보라 반투명 */}
                <BeamVisualization
                  beamBCs={[{ id:"preview",
                    origin:{x:+beamOriginX,y:+beamOriginY,z:+beamOriginZ},
                    dir:currentBeamDir, radius:+beamRadius,
                    nodeIndices: beamEnabled && beamNodeCount ? Array(beamNodeCount).fill(0) : [] }]}
                  bbox={bbox} isPreview={!beamEnabled} />
                {/* 클릭·빔 모드일 때 드래그 비활성화 */}
                <OrbitControls enabled={!clickMode && !beamClickMode} />
                <GlCapture glRef={glRef} />
              </Canvas>
              {displayTemps && <ColorLegend tMin={tMin} tMax={tMax} useLog={useLogScale} />}
              {displayTemps && (
                <div style={{
                  position:"absolute", top:10, right:10,
                  display:"flex", gap:6, zIndex:20
                }}>
                  {[
                    { label:"⬇ CSV",    fn: exportCSV,    title:"노드별 온도 CSV 다운로드" },
                    { label:"⬇ PNG",    fn: exportPNG,    title:"3D 뷰 PNG 다운로드" },
                    { label:"📋 보고서", fn: exportReport, title:"해석 결과 보고서 TXT 다운로드" },
                  ].map(({ label, fn, title }) => (
                    <button key={label} onClick={fn} title={title}
                      style={{
                        background:"rgba(13,17,23,0.85)", border:"1px solid rgba(255,255,255,0.15)",
                        color:"#94a3b8", borderRadius:6, padding:"5px 10px",
                        fontSize:12, cursor:"pointer", backdropFilter:"blur(6px)"
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* 단면 온도 그래프 토글 */}
              {displayTemps && (
                <div style={{
                  position:"absolute", bottom:8, right:8,
                  background:"rgba(13,17,23,0.88)", border:"1px solid rgba(255,255,255,0.12)",
                  borderRadius:8, padding:"6px 10px", zIndex:20, backdropFilter:"blur(6px)"
                }}>
                  <div style={{display:"flex", alignItems:"center", gap:8, marginBottom: showGraph ? 6 : 0}}>
                    <span style={{fontSize:11, color:"#7a8fa8"}}>단면 그래프</span>
                    {["x","y","z"].map(ax => (
                      <button key={ax}
                        onClick={() => { setGraphAxis(ax); setShowGraph(true); }}
                        style={{
                          background: showGraph && graphAxis===ax ? "rgba(96,165,250,0.2)" : "transparent",
                          border: `1px solid ${showGraph && graphAxis===ax ? "#60a5fa" : "rgba(255,255,255,0.15)"}`,
                          color: showGraph && graphAxis===ax ? "#60a5fa" : "#94a3b8",
                          borderRadius:4, padding:"2px 7px", fontSize:11, cursor:"pointer"
                        }}>
                        {ax.toUpperCase()}
                      </button>
                    ))}
                    {showGraph && (
                      <button onClick={() => setShowGraph(false)}
                        style={{background:"transparent", border:"none", color:"#7a8fa8",
                          fontSize:12, cursor:"pointer", padding:"0 2px"}}>✕</button>
                    )}
                  </div>
                  {showGraph && (
                    <CrossSectionGraph
                      nodes={meshData.nodes}
                      temperatures={displayTemps}
                      axis={graphAxis}
                    />
                  )}
                </div>
              )}

              {/* 호버 툴팁 */}
              {hoverInfo && (
                <div style={{
                  position:"fixed", left: hoverInfo.x + 14, top: hoverInfo.y - 28,
                  background:"rgba(13,17,23,0.92)", border:"1px solid rgba(255,255,255,0.18)",
                  borderRadius:6, padding:"4px 10px",
                  fontSize:12, color:"#f1f5f9",
                  pointerEvents:"none", zIndex:50,
                  backdropFilter:"blur(8px)"
                }}>
                  {hoverInfo.temp.toFixed(1)} °C
                </div>
              )}
              {/* 결과 오버레이 — 뷰포트 상단 */}
              {displayTemps && (
                <div style={{
                  position:"absolute", top:10, left:10,
                  background:"rgba(13,17,23,0.82)",
                  borderRadius:8, padding:"7px 14px",
                  display:"flex", alignItems:"center", flexWrap:"wrap", gap:"10px 20px",
                  backdropFilter:"blur(6px)",
                  border:"1px solid rgba(255,255,255,0.1)",
                  zIndex:10, pointerEvents:"none", fontSize:13
                }}>
                  <span style={{color:"#94a3b8"}}>최저 <strong style={{color:"#60a5fa"}}>{tMin.toFixed(1)} °C</strong></span>
                  <span style={{color:"#94a3b8"}}>최고 <strong style={{color:"#f87171"}}>{tMax.toFixed(1)} °C</strong></span>
                  {meltPoint !== null && <span style={{color:"#94a3b8"}}>용융점 <strong style={{color:"#fbbf24"}}>{meltPoint} °C</strong></span>}
                  {meltPoint !== null && tMax > meltPoint && (
                    <span style={{color:"#ef4444", fontWeight:600}}>⚠️ 용융 위험!</span>
                  )}
                  {tMax - tMin < 0.5 && (
                    <span style={{color:"#fbbf24"}}>⚠️ 온도 균일 — 냉각면 추가 필요</span>
                  )}
                  {bcs.length === 0 && (pointBCs.length > 0 || (beamEnabled && beamNodeCount > 0)) && tMax > 500 && (
                    <span style={{color:"#a78bfa"}}>ℹ️ 냉각 경계조건 없음</span>
                  )}
                  {useLogScale && <span style={{color:"#7a8fa8", fontSize:11}}>로그 스케일</span>}
                </div>
              )}
              {status==="error" && errorMsg && (
                <div style={{
                  position:"absolute", top:10, left:10,
                  background:"rgba(127,29,29,0.9)",
                  borderRadius:8, padding:"7px 14px",
                  border:"1px solid rgba(239,68,68,0.5)",
                  zIndex:10, pointerEvents:"none", fontSize:13, color:"#fca5a5"
                }}>{errorMsg}</div>
              )}
              {!displayTemps && (
                <div className="th-overlay-hint">
                  경계조건을 설정하고 <strong>해석 실행</strong>을 누르세요
                </div>
              )}
              {mode==="transient" && transResult && (
                <AnimPlayer
                  timePoints={transResult.timePoints}
                  currentIdx={frameIdx}
                  onSeek={i => { setFrameIdx(i); setPlaying(false); }}
                  playing={playing}
                  onPlayPause={() => {
                    if (frameIdx >= transResult.snapshots.length-1) setFrameIdx(0);
                    setPlaying(p => !p);
                  }}
                />
              )}
            </>
          ) : (
            <div className="th-empty th-empty--guide">
              {status === "error" && errorMsg ? (
                <div style={{
                  background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.5)",
                  borderRadius:12, padding:"20px 24px", width:"100%", boxSizing:"border-box"
                }}>
                  <div style={{color:"#f87171", fontWeight:700, fontSize:16, marginBottom:8}}>⚠ 파일 로드 실패</div>
                  <div style={{color:"#fca5a5", fontSize:14, marginBottom:14}}>{errorMsg}</div>
                  <div style={{color:"#94a3b8", fontSize:13}}>
                    <strong>STEP 파일 용량이 큰 경우 권장 조치:</strong><br/>
                    · CAD 툴에서 <strong>STL로 내보내기</strong> (메시 정밀도 중간 설정)<br/>
                    · STEP 조립체는 단품 부품만 추출해서 사용<br/>
                    · Fusion 360 / SolidWorks에서 "단순화 저장"으로 내보내기
                  </div>
                </div>
              ) : (
                <div className="th-guide-card">
                  <h3>열해석 사용 가이드</h3>
                  <ul>
                    <li><strong>1. 모델 업로드</strong> — STL 또는 STEP 파일을 올리면 3D 모델이 여기에 표시됩니다.</li>
                    <li><strong>2. 해석 유형</strong> — 정상상태(최종 온도) 또는 과도(시간별 변화) 중 선택합니다.</li>
                    <li><strong>3. 소재·경계조건</strong> — 소재를 고르고 냉각면·열원면 온도를 지정합니다.</li>
                    <li><strong>4. 해석 실행</strong> — 버튼을 누르면 온도 분포가 3D로 시각화됩니다.</li>
                  </ul>
                  {statusLabel && <p className="th-guide-status">{statusLabel}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 해석 정밀도 안내 — th-layout 아래 전체 폭 */}
      {!meshData && (
        <div style={{
          background:"rgba(251,191,36,0.07)",
          borderTop:"2px solid rgba(251,191,36,0.4)",
          padding:"28px 48px",
          boxSizing:"border-box"
        }}>
          <h4 style={{
            color:"#f59e0b", margin:"0 0 20px 0",
            fontSize:22, display:"flex", alignItems:"center", gap:10, fontWeight:700
          }}>
            <span style={{fontSize:24}}>⚠</span> 해석 정밀도 안내
          </h4>
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(3, 1fr)",
            gap:"12px 32px"
          }}>
            {[
              ["적용 범위",      "초기 검토·파라미터 스터디 전용. 제품 최종 설계에는 상용 FEM을 사용하세요."],
              ["Shell FEM 한계", "두께 방향(법선) 온도 구배를 계산하지 않습니다."],
              ["복사 뷰 팩터",   "전 표면이 환경으로 방사한다고 가정합니다 (부품 간 차폐 미고려)."],
              ["물성 온도 의존성","k·ε를 고정값으로 사용합니다 (온도에 따른 변화 미반영)."],
              ["조립품 두께",    "단일 t값으로 근사합니다 (파이프·플랜지 혼용 시 부정확)."],
              ["최종 설계 검증", "ANSYS·Abaqus 등 상용 FEM으로 반드시 재검증하세요."],
            ].map(([k, v]) => (
              <div key={k} style={{
                background:"rgba(251,191,36,0.05)",
                border:"1px solid rgba(251,191,36,0.2)",
                borderRadius:10, padding:"14px 18px"
              }}>
                <div style={{color:"#f59e0b", fontWeight:700, fontSize:16, marginBottom:6}}>{k}</div>
                <div style={{color:"#ca8a04", fontSize:15, lineHeight:1.6}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
