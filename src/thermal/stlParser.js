/**
 * STL 파싱 + 꼭짓점 병합(vertex welding)
 * 반환: { nodes: Float64Array(N*3), elements: Uint32Array(M*3) }
 */

function isBinarySTL(buffer) {
  if (buffer.byteLength < 84) return false;
  const header = new Uint8Array(buffer, 0, 80);
  // ASCII STL은 "solid"로 시작
  const text = String.fromCharCode(...header.slice(0, 5));
  if (text.toLowerCase().startsWith("solid")) {
    // ASCII처럼 보여도 binary일 수 있음 — triangle count로 재확인
    const view = new DataView(buffer);
    const triCount = view.getUint32(80, true);
    const expectedSize = 84 + triCount * 50;
    if (Math.abs(expectedSize - buffer.byteLength) < 10) return true;
    return false;
  }
  return true;
}

function parseBinarySTL(buffer) {
  const view = new DataView(buffer);
  const triCount = view.getUint32(80, true);
  const rawPos = new Float32Array(triCount * 9);

  let offset = 84;
  for (let i = 0; i < triCount; i++) {
    offset += 12; // skip normal
    for (let v = 0; v < 3; v++) {
      rawPos[i * 9 + v * 3 + 0] = view.getFloat32(offset, true);
      rawPos[i * 9 + v * 3 + 1] = view.getFloat32(offset + 4, true);
      rawPos[i * 9 + v * 3 + 2] = view.getFloat32(offset + 8, true);
      offset += 12;
    }
    offset += 2; // attribute byte count
  }
  return rawPos;
}

function parseASCIISTL(buffer) {
  const text = new TextDecoder().decode(buffer);
  const positions = [];
  const vertexRe = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  let m;
  while ((m = vertexRe.exec(text)) !== null) {
    positions.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  }
  return new Float32Array(positions);
}

/**
 * 중복 꼭짓점 병합
 * tolerance: 같은 점으로 볼 최소 거리 (기본: bbox 대각선의 1e-5)
 */
function weldVertices(rawPos, tolerance) {
  const N = rawPos.length / 3;
  const nodeMap = new Map(); // "x,y,z" → index
  const nodes = [];
  const elements = new Uint32Array(N);

  // bounding box로 tolerance 자동 계산
  if (tolerance === undefined) {
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    let zMin = Infinity, zMax = -Infinity;
    for (let i = 0; i < N; i++) {
      xMin = Math.min(xMin, rawPos[i * 3]);
      xMax = Math.max(xMax, rawPos[i * 3]);
      yMin = Math.min(yMin, rawPos[i * 3 + 1]);
      yMax = Math.max(yMax, rawPos[i * 3 + 1]);
      zMin = Math.min(zMin, rawPos[i * 3 + 2]);
      zMax = Math.max(zMax, rawPos[i * 3 + 2]);
    }
    const diag = Math.sqrt(
      (xMax - xMin) ** 2 + (yMax - yMin) ** 2 + (zMax - zMin) ** 2
    );
    tolerance = diag * 1e-5;
  }

  const scale = tolerance > 0 ? 1 / tolerance : 1e6;

  for (let i = 0; i < N; i++) {
    const x = rawPos[i * 3];
    const y = rawPos[i * 3 + 1];
    const z = rawPos[i * 3 + 2];
    const key = `${Math.round(x * scale)},${Math.round(y * scale)},${Math.round(z * scale)}`;
    if (!nodeMap.has(key)) {
      nodeMap.set(key, nodes.length / 3);
      nodes.push(x, y, z);
    }
    elements[i] = nodeMap.get(key);
  }

  return {
    nodes: new Float64Array(nodes),
    elements, // flat: [i0,j0,k0, i1,j1,k1, ...]  length = M*3
  };
}

export function parseSTL(arrayBuffer) {
  let rawPos;
  if (isBinarySTL(arrayBuffer)) {
    rawPos = parseBinarySTL(arrayBuffer);
  } else {
    rawPos = parseASCIISTL(arrayBuffer);
  }

  if (rawPos.length % 9 !== 0) {
    throw new Error(`꼭짓점 수가 3의 배수가 아닙니다: ${rawPos.length / 3}`);
  }

  return weldVertices(rawPos);
}

export function meshBBox(nodes) {
  const N = nodes.length / 3;
  let xMin = Infinity, xMax = -Infinity;
  let yMin = Infinity, yMax = -Infinity;
  let zMin = Infinity, zMax = -Infinity;
  for (let i = 0; i < N; i++) {
    xMin = Math.min(xMin, nodes[i * 3]);
    xMax = Math.max(xMax, nodes[i * 3]);
    yMin = Math.min(yMin, nodes[i * 3 + 1]);
    yMax = Math.max(yMax, nodes[i * 3 + 1]);
    zMin = Math.min(zMin, nodes[i * 3 + 2]);
    zMax = Math.max(zMax, nodes[i * 3 + 2]);
  }
  return { x: [xMin, xMax], y: [yMin, yMax], z: [zMin, zMax] };
}
