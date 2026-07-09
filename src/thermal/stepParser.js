/**
 * STEP 파일 → 삼각형 메시 변환
 * 표시용(정밀) + FEM용(조대) 두 메시를 동시에 생성 — 사용자가 설정할 필요 없음
 */

let occtModule = null;

async function loadOcct() {
  if (occtModule) return occtModule;
  const { default: initOcct } = await import("occt-import-js");
  occtModule = await initOcct({ locateFile: (f) => `/${f}` });
  return occtModule;
}

function tryRead(occt, arrayBuffer, params) {
  try {
    return occt.ReadStepFile(new Uint8Array(arrayBuffer), params);
  } catch (wasmErr) {
    const msg = String(wasmErr);
    if (msg.includes("memory") || msg.includes("OOM") || msg.includes("out of") || msg.includes("unreachable")) {
      throw new Error(
        `STEP 파일(${(arrayBuffer.byteLength/1024/1024).toFixed(1)}MB) 처리 중 메모리가 부족합니다.\n` +
        "STL로 변환하거나 단품으로 나눠서 업로드해 주세요."
      );
    }
    return null;
  }
}

function extractMesh(result) {
  const allPos = [], allIdx = [];
  let offset = 0;
  for (const mesh of result.meshes ?? []) {
    const pos = mesh.attributes?.position?.array;
    const idx = mesh.index?.array;
    if (!pos || !idx) continue;
    for (let i = 0; i < pos.length; i++) allPos.push(pos[i]);
    for (let i = 0; i < idx.length; i++) allIdx.push(idx[i] + offset);
    offset += pos.length / 3;
  }
  return allPos.length
    ? { nodes: new Float64Array(allPos), elements: new Uint32Array(allIdx) }
    : null;
}

// 조대 메시 노드 → 정밀 메시 노드 최근접 매핑 (격자 인덱스 사용, O(N))
export function buildNearestMap(coarseNodes, fineNodes, bbox) {
  const G = 24;
  const sx = (bbox.x[1]-bbox.x[0])/G || 1;
  const sy = (bbox.y[1]-bbox.y[0])/G || 1;
  const sz = (bbox.z[1]-bbox.z[0])/G || 1;
  const grid = new Array(G*G*G).fill(null).map(() => []);
  const NC = coarseNodes.length / 3;
  for (let i = 0; i < NC; i++) {
    const gx = Math.min(G-1, Math.max(0, Math.floor((coarseNodes[i*3  ]-bbox.x[0])/sx)));
    const gy = Math.min(G-1, Math.max(0, Math.floor((coarseNodes[i*3+1]-bbox.y[0])/sy)));
    const gz = Math.min(G-1, Math.max(0, Math.floor((coarseNodes[i*3+2]-bbox.z[0])/sz)));
    grid[gx*G*G+gy*G+gz].push(i);
  }
  const NF = fineNodes.length / 3;
  const map = new Int32Array(NF);
  for (let i = 0; i < NF; i++) {
    const px=fineNodes[i*3], py=fineNodes[i*3+1], pz=fineNodes[i*3+2];
    const cx=Math.min(G-1,Math.max(0,Math.floor((px-bbox.x[0])/sx)));
    const cy=Math.min(G-1,Math.max(0,Math.floor((py-bbox.y[0])/sy)));
    const cz=Math.min(G-1,Math.max(0,Math.floor((pz-bbox.z[0])/sz)));
    let minD=Infinity, best=0;
    for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) for (let dz=-1;dz<=1;dz++) {
      const nx=cx+dx,ny=cy+dy,nz=cz+dz;
      if (nx<0||nx>=G||ny<0||ny>=G||nz<0||nz>=G) continue;
      for (const j of grid[nx*G*G+ny*G+nz]) {
        const d2=(px-coarseNodes[j*3])**2+(py-coarseNodes[j*3+1])**2+(pz-coarseNodes[j*3+2])**2;
        if (d2<minD){minD=d2;best=j;}
      }
    }
    map[i]=best;
  }
  return map;
}

export async function parseSTEP(arrayBuffer) {
  const fileMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(1);
  const occt = await loadOcct();

  // 표시용 — 정밀 (angularDeflection 단위: 라디안, 0.07 rad ≈ 4° → ~90각)
  const FINE   = { linearDeflection: 0.04, angularDeflection: 0.07 };
  // FEM용 — 조대 (0.5 rad ≈ 28° → ~12각, 노드 수 최소화)
  const COARSE = { linearDeflection: 0.5,  angularDeflection: 0.5  };

  let fineResult = tryRead(occt, arrayBuffer, FINE);
  if (!fineResult?.success) fineResult = tryRead(occt, arrayBuffer, COARSE);

  if (!fineResult?.success) {
    throw new Error(
      `STEP 파일 파싱 실패 (${fileMB}MB).\n` +
      "지원 형식: AP203 / AP214. AP242·CATIA·NX 전용 파일은 STL로 변환 후 업로드해 주세요."
    );
  }

  const fineMesh = extractMesh(fineResult);
  if (!fineMesh) throw new Error(`STEP(${fileMB}MB)에서 메시를 추출할 수 없습니다. STL로 내보내서 사용해 주세요.`);

  // FEM용 별도 조대 메시
  let coarseResult = tryRead(occt, arrayBuffer, COARSE);
  const coarseMesh = (coarseResult?.success) ? extractMesh(coarseResult) : null;

  // 조대 메시가 없거나 정밀 메시보다 크면 그냥 동일 메시 사용
  const useDual = coarseMesh && coarseMesh.nodes.length < fineMesh.nodes.length;

  return {
    nodes:    fineMesh.nodes,
    elements: fineMesh.elements,
    femNodes:    useDual ? coarseMesh.nodes    : fineMesh.nodes,
    femElements: useDual ? coarseMesh.elements : fineMesh.elements,
    isDual: useDual,
  };
}
