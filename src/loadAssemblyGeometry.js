import { loadOcct } from "./thermal/stepParser";

function extractPartMeshes(result) {
  const parts = [];

  (result.meshes ?? []).forEach((mesh, index) => {
    const positions = mesh.attributes?.position?.array;
    const triangleIndex = mesh.index?.array;

    if (!positions || !triangleIndex) {
      return;
    }

    parts.push({
      name: mesh.name?.trim() || `부품 ${index + 1}`,
      positions: new Float32Array(positions),
      index: new Uint32Array(triangleIndex),
    });
  });

  return parts;
}

function computeBBox(parts) {
  let bbox = null;

  parts.forEach((part) => {
    for (let i = 0; i < part.positions.length; i += 3) {
      const x = part.positions[i];
      const y = part.positions[i + 1];
      const z = part.positions[i + 2];

      if (!bbox) {
        bbox = { x: [x, x], y: [y, y], z: [z, z] };
        return;
      }

      bbox.x[0] = Math.min(bbox.x[0], x);
      bbox.x[1] = Math.max(bbox.x[1], x);
      bbox.y[0] = Math.min(bbox.y[0], y);
      bbox.y[1] = Math.max(bbox.y[1], y);
      bbox.z[0] = Math.min(bbox.z[0], z);
      bbox.z[1] = Math.max(bbox.z[1], z);
    }
  });

  return bbox ?? { x: [0, 1], y: [0, 1], z: [0, 1] };
}

export async function parseStepPartsForViewer(arrayBuffer) {
  const occt = await loadOcct();

  // 이 뷰어는 부품 선택(클릭)용이라 정밀도보다 삼각형 수를 줄이는 게 더 중요합니다.
  // 값이 낮을수록(정밀) 부품이 많은 조립품에서 클릭 반응(레이캐스팅)이 느려집니다.
  const FINE = { linearDeflection: 1.2, angularDeflection: 0.6 };
  const COARSE = { linearDeflection: 3, angularDeflection: 1 };

  let result = null;

  try {
    result = occt.ReadStepFile(new Uint8Array(arrayBuffer), FINE);
  } catch {
    result = null;
  }

  if (!result?.success) {
    try {
      result = occt.ReadStepFile(new Uint8Array(arrayBuffer), COARSE);
    } catch {
      result = null;
    }
  }

  if (!result?.success) {
    throw new Error("3D 형상을 불러오지 못했습니다. 파일이 손상되었거나 지원하지 않는 STEP 방식일 수 있습니다.");
  }

  const parts = extractPartMeshes(result);

  return { parts, bbox: computeBBox(parts) };
}
