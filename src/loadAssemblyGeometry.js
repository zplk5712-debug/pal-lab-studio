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

// occt-import-js는 linearDeflectionType을 지정하지 않으면 기본값이 "bounding_box_ratio"라서,
// linearDeflection 값이 mm가 아니라 "전체 조립품 바운딩박스 크기의 비율"로 해석됩니다. 이걸
// 모르고 mm 값처럼 0.6~3을 넘겼더니, 큰 조립품(수백~수천 mm)에서는 이 비율이 실제로는 수십~
// 수백 mm짜리 허용 오차가 되어버려 볼트머리 같은 작은 원이 사각/마름모로 뭉개졌습니다.
// linearDeflectionType을 "absolute_value"로 명시해야 mm 단위 그대로 적용됩니다.
// angularDeflection(각도 편차)은 부품 크기와 무관하게 항상 일정한 각도 해상도를 유지하므로,
// 이 값을 낮게 유지하면 조립품이 아무리 크더라도 작은 구멍/원기둥까지 둥글게 보입니다.
const QUALITY_TIERS = [
  { linearDeflection: 0.1, angularDeflection: 0.25, linearDeflectionType: "absolute_value", linearUnit: "millimeter" },
  { linearDeflection: 0.4, angularDeflection: 0.3, linearDeflectionType: "absolute_value", linearUnit: "millimeter" },
  { linearDeflection: 1, angularDeflection: 0.35, linearDeflectionType: "absolute_value", linearUnit: "millimeter" },
];

// 클릭 선택용 메쉬는 부품별로 별도 지오메트리를 합치는 방식(LoadModelViewer)으로 드로우콜을
// 최소화해두었기 때문에, 여기서는 삼각형이 실제로 너무 많을 때만(= 화면이 느려질 만큼 무거울
// 때만) 한 단계 거칠게 재시도합니다. 파일 용량이 아니라 실제 생성된 삼각형 수로 판단합니다.
const MAX_TRIANGLES_BEFORE_RETRY = 500_000;

function countTriangles(result) {
  return (result.meshes ?? []).reduce((sum, mesh) => sum + (mesh.index?.array?.length ?? 0) / 3, 0);
}

export async function parseStepPartsForViewer(arrayBuffer) {
  const occt = await loadOcct();

  let result = null;

  for (const quality of QUALITY_TIERS) {
    let attempt = null;

    try {
      attempt = occt.ReadStepFile(new Uint8Array(arrayBuffer), quality);
    } catch {
      attempt = null;
    }

    if (attempt?.success) {
      result = attempt;

      if (countTriangles(attempt) <= MAX_TRIANGLES_BEFORE_RETRY) {
        break;
      }
    }
  }

  if (!result?.success) {
    throw new Error("3D 형상을 불러오지 못했습니다. 파일이 손상되었거나 지원하지 않는 STEP 방식일 수 있습니다.");
  }

  const parts = extractPartMeshes(result);

  return { parts, bbox: computeBBox(parts) };
}
