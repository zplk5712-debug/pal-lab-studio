/**
 * Thermal FEM Solver — Pure JavaScript
 * Steady-state:  K·T = f
 * Transient:     M·dT/dt + K·T = f  (implicit Backward Euler, unconditionally stable)
 */

// ─── Sparse Matrix ────────────────────────────────────────────────────────────

class SparseMatrix {
  constructor(n) {
    this.n = n;
    this.rows = Array.from({ length: n }, () => new Map());
  }
  add(i, j, v) { this.rows[i].set(j, (this.rows[i].get(j) ?? 0) + v); }
  set(i, j, v) { this.rows[i].set(j, v); }
  get(i, j)    { return this.rows[i].get(j) ?? 0; }
  clearRow(i)  { this.rows[i].clear(); }
  matvec(x) {
    const y = new Float64Array(this.n);
    for (let i = 0; i < this.n; i++)
      for (const [j, v] of this.rows[i]) y[i] += v * x[j];
    return y;
  }
  // Returns a new SparseMatrix = this + scalar * diag(d)
  addScaledDiag(scalar, d) {
    const A = new SparseMatrix(this.n);
    for (let i = 0; i < this.n; i++)
      for (const [j, v] of this.rows[i]) A.add(i, j, v);
    for (let i = 0; i < this.n; i++) A.add(i, i, scalar * d[i]);
    return A;
  }
}

// ─── Vector helpers ───────────────────────────────────────────────────────────

function dot(a, b)       { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]*b[i]; return s; }
function axpy(alpha, x, y) { for (let i = 0; i < x.length; i++) y[i] += alpha * x[i]; }

// ─── Conjugate Gradient ───────────────────────────────────────────────────────

function cg(A, b, tol = 1e-10, maxIter = 5000) {
  const n = b.length;
  const x = new Float64Array(n);
  const r = b.slice(), p = b.slice();
  let rr = dot(r, r);
  for (let iter = 0; iter < maxIter; iter++) {
    if (Math.sqrt(rr) < tol) break;
    const Ap = A.matvec(p);
    const pAp = dot(p, Ap);
    if (Math.abs(pAp) < 1e-300) break;
    const alpha = rr / pAp;
    axpy(alpha, p, x);
    axpy(-alpha, Ap, r);
    const rr2 = dot(r, r);
    const beta = rr2 / rr;
    for (let i = 0; i < n; i++) p[i] = r[i] + beta * p[i];
    rr = rr2;
  }
  return x;
}

// ─── 3-D vector utils ─────────────────────────────────────────────────────────

function sub(a, b)  { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function dot3(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function cross(a, b){ return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function norm(v)    { return Math.sqrt(v[0]**2+v[1]**2+v[2]**2); }
function normalize(v){ const l=norm(v); return l<1e-30?v:[v[0]/l,v[1]/l,v[2]/l]; }

function triangleArea(p1, p2, p3) {
  const c = cross(sub(p2,p1), sub(p3,p1));
  return 0.5 * norm(c);
}

// ─── Element stiffness (CST shell) ───────────────────────────────────────────

function elementStiffness(p1, p2, p3, k) {
  const e1  = normalize(sub(p2, p1));
  const raw = sub(p3, p1);
  const n   = normalize(cross(e1, raw));
  const e2  = cross(n, e1);

  const lx2 = dot3(sub(p2,p1), e1);
  const lx3 = dot3(sub(p3,p1), e1);
  const ly3 = dot3(sub(p3,p1), e2);

  const area = 0.5 * Math.abs(lx2 * ly3);
  if (area < 1e-30) return null;

  const inv2A = 1 / (2*area);
  const b = [(0-ly3)*inv2A, (ly3-0)*inv2A, (0-0)*inv2A];  // y2-y3, y3-y1, y1-y2  (y1=y2=0)
  const c = [(lx3-lx2)*inv2A, (0-lx3)*inv2A, (lx2-0)*inv2A]; // x3-x2, x1-x3, x2-x1

  const Ke = [[0,0,0],[0,0,0],[0,0,0]];
  for (let i=0;i<3;i++)
    for (let j=0;j<3;j++)
      Ke[i][j] = k * area * (b[i]*b[j] + c[i]*c[j]);
  return Ke;
}

// ─── Boundary condition helpers ───────────────────────────────────────────────

function getFixedNodes(nodes, bbox, bcs, tol = 0.02) {
  const N = nodes.length / 3;
  const fixed = new Map();

  if (!bcs || bcs.length === 0) return fixed; // 빈 맵 반환 — 호출부에서 앵커 처리

  for (const bc of bcs) {
    const { boundary, temp } = bc;
    const T = Number(temp);
    if (boundary === "all") {
      for (let i = 0; i < N; i++) fixed.set(i, T);
      continue;
    }
    const map = {
      min_x: { ax: 0, val: bbox.x[0], span: bbox.x[1]-bbox.x[0] },
      max_x: { ax: 0, val: bbox.x[1], span: bbox.x[1]-bbox.x[0] },
      min_y: { ax: 1, val: bbox.y[0], span: bbox.y[1]-bbox.y[0] },
      max_y: { ax: 1, val: bbox.y[1], span: bbox.y[1]-bbox.y[0] },
      min_z: { ax: 2, val: bbox.z[0], span: bbox.z[1]-bbox.z[0] },
      max_z: { ax: 2, val: bbox.z[1], span: bbox.z[1]-bbox.z[0] },
    };
    const r = map[boundary];
    if (!r) continue;
    const eps = Math.max(r.span * tol, 1e-12);
    for (let i = 0; i < N; i++)
      if (Math.abs(nodes[i*3 + r.ax] - r.val) <= eps) fixed.set(i, T);
  }
  return fixed;
}

// ─── Build global K and f ────────────────────────────────────────────────────

const SIGMA = 5.67e-8; // Stefan-Boltzmann 상수 W/m²K⁴

/**
 * buildSystem — 전도 강성행렬 + 하중 벡터 조립
 *
 * opts.thicknessM  : 쉘 두께 (미터). K_ij = k × t × ∫∇N·∇N dA → k_eff = k × t
 * opts.coordScale  : 좌표 단위 → m 변환. mm → 0.001, m → 1
 *                    (분산 열원·대류 Robin BC의 면적 환산에만 사용)
 * opts.envH        : 표면 열전달 계수 h (W/m²K). 0이면 미적용
 * opts.envTAmb     : 환경 온도 (°C). 대류·복사 Robin BC 기준온도
 * opts.emissivity  : 방사율 ε (0~1). 복사 Robin BC (Picard 선형화)
 * T_prev           : 이전 반복/타임스텝 온도 배열 (°C). null이면 복사 미적용
 */
function buildSystem(nodes, elements, conductivity, heatSource, opts, T_prev) {
  const { thicknessM = 1e-3, coordScale = 1e-3, envH = 0, envTAmb = 20, emissivity = 0 } = opts || {};
  const T_amb_K = envTAmb + 273.15;
  const N = nodes.length / 3;
  const M = elements.length / 3;
  const K = new SparseMatrix(N);
  const f = new Float64Array(N);
  const kEff = conductivity * thicknessM; // W/(m·K) × m = W/K·(per coord²)
  const cs2  = coordScale * coordScale;   // coord² → m²

  for (let e = 0; e < M; e++) {
    const [i, j, k] = [elements[e*3], elements[e*3+1], elements[e*3+2]];
    const pts = [[nodes[i*3],nodes[i*3+1],nodes[i*3+2]],
                 [nodes[j*3],nodes[j*3+1],nodes[j*3+2]],
                 [nodes[k*3],nodes[k*3+1],nodes[k*3+2]]];
    const Ke = elementStiffness(pts[0], pts[1], pts[2], kEff);
    if (!Ke) continue;
    const idx = [i, j, k];
    for (let a=0;a<3;a++) for (let b=0;b<3;b++) K.add(idx[a], idx[b], Ke[a][b]);

    const area = triangleArea(pts[0], pts[1], pts[2]);

    // 분산 내부 발열 (W/m³): q = Q × 체적_m³ / 3
    if (heatSource) {
      const q = heatSource * area * cs2 * thicknessM / 3;
      f[i]+=q; f[j]+=q; f[k]+=q;
    }

    if (envH > 0 || (emissivity > 0 && T_prev)) {
      const areaM2 = area * cs2;

      // 대류 Robin BC
      if (envH > 0) {
        const hA3 = envH * areaM2 / 3;
        K.add(i,i,hA3); K.add(j,j,hA3); K.add(k,k,hA3);
        f[i] += hA3 * envTAmb; f[j] += hA3 * envTAmb; f[k] += hA3 * envTAmb;
      }

      // 복사 Robin BC — Picard 선형화: σε(T_K⁴−T_amb_K⁴) ≈ h_rad(T_prev)·(T−T_amb)
      // h_rad = σε(T_prev_K²+T_amb_K²)(T_prev_K+T_amb_K)
      if (emissivity > 0 && T_prev) {
        const Ti_K = (T_prev[i] ?? envTAmb) + 273.15;
        const Tj_K = (T_prev[j] ?? envTAmb) + 273.15;
        const Tk_K = (T_prev[k] ?? envTAmb) + 273.15;
        const T_avg_K = (Ti_K + Tj_K + Tk_K) / 3;
        const h_rad = SIGMA * emissivity * (T_avg_K ** 2 + T_amb_K ** 2) * (T_avg_K + T_amb_K);
        const hA3 = h_rad * areaM2 / 3;
        K.add(i,i,hA3); K.add(j,j,hA3); K.add(k,k,hA3);
        f[i] += hA3 * envTAmb; f[j] += hA3 * envTAmb; f[k] += hA3 * envTAmb;
      }
    }
  }
  return { K, f };
}

// Lumped mass: M_lump[i] = Σ_e  ρ·Cp·t·A_m²/3
function buildLumpedMass(nodes, elements, rho, cp, opts) {
  const { thicknessM = 1e-3, coordScale = 1e-3 } = opts || {};
  const N = nodes.length / 3;
  const M = elements.length / 3;
  const ml = new Float64Array(N);
  const cs2 = coordScale * coordScale;
  for (let e = 0; e < M; e++) {
    const [i, j, k] = [elements[e*3], elements[e*3+1], elements[e*3+2]];
    const area = triangleArea(
      [nodes[i*3],nodes[i*3+1],nodes[i*3+2]],
      [nodes[j*3],nodes[j*3+1],nodes[j*3+2]],
      [nodes[k*3],nodes[k*3+1],nodes[k*3+2]],
    );
    const m = rho * cp * area * cs2 * thicknessM / 3;
    ml[i]+=m; ml[j]+=m; ml[k]+=m;
  }
  return ml;
}

// Apply Dirichlet BCs to K, f
// 행과 열 모두 제거해야 올바른 결과 — 열만 제거하지 않으면 BC가 2배 적용되어 음수 온도 발생
function applyDirichlet(K, f, fixedNodes) {
  // 1) 열 제거: 자유 DOF i의 f[i] -= K[i,ni]*T_ni, 그리고 K[i,ni] = 0
  for (const [ni, T] of fixedNodes) {
    for (let i = 0; i < f.length; i++) {
      if (fixedNodes.has(i)) continue;
      const v = K.rows[i].get(ni);
      if (v !== undefined) {
        f[i] -= v * T;
        K.rows[i].delete(ni);
      }
    }
  }
  // 2) 행 제거 + 대각선 = 1, rhs = T
  for (const [ni, T] of fixedNodes) {
    K.clearRow(ni);
    K.set(ni, ni, 1);
    f[ni] = T;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Steady-state: K·T = f
 */
// 면 BC가 없을 때 클릭 노드가 아닌 첫 번째 노드를 주변온도에 고정 (특이 행렬 방지)
function anchorIfNeeded(fixed, pointBCs, N, ambientTemp) {
  if (fixed.size > 0) return;
  const clickNodes = new Set(pointBCs.flatMap(bc => bc.nodeIndices));
  for (let i = 0; i < N; i++) {
    if (!clickNodes.has(i)) { fixed.set(i, ambientTemp); return; }
  }
  fixed.set(0, ambientTemp); // 최후의 수단
}

// 빔 축까지 각 노드의 최소 수직 거리 중 최솟값 반환 (0-노드 시 자동 반경용)
export function minBeamDist(nodes, origin, dir) {
  const N = nodes.length / 3;
  const len = Math.sqrt(dir.x**2 + dir.y**2 + dir.z**2);
  if (len < 1e-10) return Infinity;
  const dx = dir.x/len, dy = dir.y/len, dz = dir.z/len;
  let minD = Infinity;
  for (let i = 0; i < N; i++) {
    const px = nodes[i*3] - origin.x;
    const py = nodes[i*3+1] - origin.y;
    const pz = nodes[i*3+2] - origin.z;
    const t = px*dx + py*dy + pz*dz;
    const qx = px-t*dx, qy = py-t*dy, qz = pz-t*dz;
    const d = Math.sqrt(qx*qx + qy*qy + qz*qz);
    if (d < minD) minD = d;
  }
  return minD;
}

export function solveHeat(nodes, elements, bbox, params) {
  const {
    conductivity=50, heatSource=0, bcs=[], pointBCs=[], ambientTemp=20,
    thicknessM=1e-3, coordScale=1e-3, envH=0,
    extraDirichlet=new Map(),
    emissivity=0,
  } = params;
  const N = nodes.length / 3;
  const sysOpts = { thicknessM, coordScale, envH, envTAmb: ambientTemp, emissivity };

  // 한 번의 선형 풀이: T_prev로 복사 선형화
  const oneStep = (T_prev) => {
    const { K, f } = buildSystem(nodes, elements, conductivity, heatSource, sysOpts, T_prev);
    const fixed = getFixedNodes(nodes, bbox, bcs);
    for (const { nodeIndices, watts } of pointBCs) {
      const q = Number(watts) / Math.max(nodeIndices.length, 1);
      for (const ni of nodeIndices) f[ni] += q;
    }
    for (const [ni, T] of extraDirichlet) fixed.set(ni, T);
    anchorIfNeeded(fixed, pointBCs, N, ambientTemp);
    applyDirichlet(K, f, fixed);
    return cg(K, f);
  };

  if (emissivity <= 0) return oneStep(null);

  // Picard 반복: 복사 비선형 수렴
  let T = new Float64Array(N).fill(ambientTemp);
  for (let iter = 0; iter < 30; iter++) {
    const T_new = oneStep(T);
    let delta = 0, norm2 = 0;
    for (let i = 0; i < N; i++) { delta += (T_new[i]-T[i])**2; norm2 += T_new[i]**2; }
    T = T_new;
    if (delta / Math.max(norm2, 1e-10) < 1e-8) break;
  }
  return T;
}

/**
 * Transient (Backward Euler): (M/dt + K)·T_{n+1} = M/dt·T_n + f
 * Unconditionally stable — works with any time step size.
 *
 * @returns {{ snapshots: Float64Array[], timePoints: number[], tMin: number, tMax: number }}
 */
export function solveTransient(nodes, elements, bbox, params) {
  const {
    conductivity = 50,
    density = 7900,
    specificHeat = 500,
    heatSource = 0,
    bcs = [],
    pointBCs = [],
    initialTemp = 20,
    totalTime = 60,
    numSteps = 50,
    numSnapshots = 20,
    thicknessM = 1e-3,
    coordScale = 1e-3,
    envH = 0,
    extraDirichlet = new Map(),
    emissivity = 0,
  } = params;

  const N   = nodes.length / 3;
  const dt  = totalTime / numSteps;
  const saveEvery = Math.max(1, Math.floor(numSteps / numSnapshots));

  const sysOpts = { thicknessM, coordScale, envH, envTAmb: initialTemp, emissivity };
  const Ml  = buildLumpedMass(nodes, elements, density, specificHeat, { thicknessM, coordScale });

  let T = new Float64Array(N).fill(initialTemp);

  // 열원 Neumann 하중 벡터 (매 스텝 동일)
  const f_src = new Float64Array(N);
  for (const { nodeIndices, watts } of pointBCs) {
    const q = Number(watts) / Math.max(nodeIndices.length, 1);
    for (const ni of nodeIndices) f_src[ni] += q;
  }

  // 고정 BC (매 스텝 동일)
  const fixed = getFixedNodes(nodes, bbox, bcs);
  for (const [ni, temp] of extraDirichlet) fixed.set(ni, temp);
  anchorIfNeeded(fixed, pointBCs, N, initialTemp);
  for (const [ni, temp] of fixed) T[ni] = temp;

  const snapshots  = [Float64Array.from(T)];
  const timePoints = [0];
  let tMin = Math.min(...T), tMax = Math.max(...T);

  for (let step = 1; step <= numSteps; step++) {
    // 복사 선형화: 이전 타임스텝 T_prev 사용 (emissivity>0 시)
    const { K, f: f_sys } = buildSystem(
      nodes, elements, conductivity, heatSource, sysOpts,
      emissivity > 0 ? T : null
    );
    // 열원 합산
    for (let i = 0; i < N; i++) f_sys[i] += f_src[i];

    // A = K + (1/dt)·M
    const Astep = K.addScaledDiag(1/dt, Ml);
    // rhs = (M/dt)·T_n + f
    const rhs = new Float64Array(N);
    for (let i = 0; i < N; i++) rhs[i] = Ml[i]/dt * T[i] + f_sys[i];

    // Apply Dirichlet
    for (const [ni, temp] of fixed) {
      for (let i = 0; i < N; i++) {
        if (fixed.has(i)) continue;
        const v = Astep.rows[i].get(ni);
        if (v !== undefined) { rhs[i] -= v * temp; Astep.rows[i].delete(ni); }
      }
    }
    for (const [ni, temp] of fixed) { Astep.clearRow(ni); Astep.set(ni,ni,1); rhs[ni]=temp; }

    T = cg(Astep, rhs, 1e-8, 2000);

    if (step % saveEvery === 0 || step === numSteps) {
      snapshots.push(Float64Array.from(T));
      timePoints.push(step * dt);
      const mn = Math.min(...T), mx = Math.max(...T);
      if (mn < tMin) tMin = mn;
      if (mx > tMax) tMax = mx;
    }
  }

  return { snapshots, timePoints, tMin, tMax };
}
