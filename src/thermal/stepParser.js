/**
 * STEP 파일 → 삼각형 메시 변환
 * occt-import-js (OpenCASCADE WebAssembly) 동적 로드 — 필요 시에만 로드
 */

let occtModule = null;

async function loadOcct() {
  if (occtModule) return occtModule;
  const { default: initOcct } = await import("occt-import-js");
  occtModule = await initOcct();
  return occtModule;
}

export async function parseSTEP(arrayBuffer) {
  const occt = await loadOcct();

  const result = occt.ReadStepFile(new Uint8Array(arrayBuffer), null);
  if (!result?.success) throw new Error("STEP 파일 파싱 실패");

  const allPos = [];
  const allIdx = [];
  let offset = 0;

  for (const mesh of result.meshes) {
    const pos = mesh.attributes?.position?.array;
    const idx = mesh.index?.array;
    if (!pos || !idx) continue;

    for (let i = 0; i < pos.length; i++) allPos.push(pos[i]);
    for (let i = 0; i < idx.length; i++) allIdx.push(idx[i] + offset);
    offset += pos.length / 3;
  }

  if (allPos.length === 0) throw new Error("STEP에서 메시를 추출할 수 없습니다.");

  // occt-import-js는 이미 공유 꼭짓점으로 반환하므로 welding 불필요
  return {
    nodes:    new Float64Array(allPos),
    elements: new Uint32Array(allIdx),
  };
}
