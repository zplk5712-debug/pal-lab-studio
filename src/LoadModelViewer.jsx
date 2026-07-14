import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { parseStepPartsForViewer } from "./loadAssemblyGeometry";
import { getMaterialOption } from "./loadCalculatorUtils";

const UNASSIGNED_COLOR = "#7dd3fc";

// 소재별로 시각적으로 구분되는 팔레트. 부품이 몇백 개라도 소재 종류는
// 보통 몇 개 안 되므로 이 정도면 충분히 구분됩니다.
const MATERIAL_COLOR_PALETTE = [
  "#7dd3fc", // sky
  "#86efac", // green
  "#fca5a5", // red
  "#fcd34d", // amber
  "#c4b5fd", // violet
  "#f9a8d4", // pink
  "#5eead4", // teal
  "#fdba74", // orange
  "#a5b4fc", // indigo
  "#d9f99d", // lime
  "#fda4af", // rose
  "#67e8f9", // cyan
];

// 정면/측면/후면/평면 등 버튼 클릭 한 번으로 카메라를 표준 방향으로 옮기기 위한 설정입니다.
// (dirX, dirY, dirZ)는 대상 중심에서 카메라가 위치할 방향(단위 벡터 배수는 size로 조절),
// up은 그 방향에서 봤을 때 화면 위쪽이 되는 축입니다.
const VIEW_PRESETS = {
  front: { label: "정면", dir: [0, 0, 1], up: [0, 1, 0] },
  back: { label: "후면", dir: [0, 0, -1], up: [0, 1, 0] },
  left: { label: "좌측면", dir: [-1, 0, 0], up: [0, 1, 0] },
  right: { label: "우측면", dir: [1, 0, 0], up: [0, 1, 0] },
  top: { label: "평면", dir: [0, 1, 0], up: [0, 0, -1] },
  bottom: { label: "저면", dir: [0, -1, 0], up: [0, 0, 1] },
};

// 지금 보고 있는 화면을 그대로 시계/반시계 방향으로 90도 돌립니다(카메라 위치·바라보는
// 방향은 그대로 두고, 화면에 대해 수직인 축=카메라가 바라보는 축을 기준으로 회전).
// 다른 각도로 옮기는 게 아니라 "지금 보이는 이미지를 90도 회전"하는 동작입니다.
function rollCamera(camera, target, degrees) {
  const viewDirection = target.clone().sub(camera.position).normalize();
  const rad = THREE.MathUtils.degToRad(degrees);

  camera.up.applyAxisAngle(viewDirection, rad);
  camera.lookAt(target);
}

function ViewController({ bbox, request, controlsRef }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!bbox || !request) {
      return;
    }

    const target = controlsRef.current
      ? controlsRef.current.target.clone()
      : new THREE.Vector3((bbox.x[0] + bbox.x[1]) / 2, (bbox.y[0] + bbox.y[1]) / 2, (bbox.z[0] + bbox.z[1]) / 2);

    if (request.type === "roll") {
      rollCamera(camera, target, request.deg);
      camera.updateProjectionMatrix();

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      return;
    }

    const preset = VIEW_PRESETS[request.dir];

    if (!preset) {
      return;
    }

    const cx = (bbox.x[0] + bbox.x[1]) / 2;
    const cy = (bbox.y[0] + bbox.y[1]) / 2;
    const cz = (bbox.z[0] + bbox.z[1]) / 2;
    const size = Math.max(bbox.x[1] - bbox.x[0], bbox.y[1] - bbox.y[0], bbox.z[1] - bbox.z[0]) || 1;
    const distance = size * 2;

    camera.position.set(
      cx + preset.dir[0] * distance,
      cy + preset.dir[1] * distance,
      cz + preset.dir[2] * distance,
    );
    camera.up.set(preset.up[0], preset.up[1], preset.up[2]);
    camera.lookAt(cx, cy, cz);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(cx, cy, cz);
      controlsRef.current.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  return null;
}

function AutoCamera({ bbox }) {
  const { camera } = useThree();

  useMemo(() => {
    if (!bbox) {
      return;
    }

    const cx = (bbox.x[0] + bbox.x[1]) / 2;
    const cy = (bbox.y[0] + bbox.y[1]) / 2;
    const cz = (bbox.z[0] + bbox.z[1]) / 2;
    const size = Math.max(bbox.x[1] - bbox.x[0], bbox.y[1] - bbox.y[0], bbox.z[1] - bbox.z[0]) || 1;

    camera.position.set(cx + size * 1.5, cy + size, cz + size * 1.5);
    camera.lookAt(cx, cy, cz);
    camera.near = size * 0.001;
    camera.far = size * 100;
    camera.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bbox, camera]);

  return null;
}

const PartMesh = memo(
  function PartMesh({ part, isSelected, onToggle, baseColor }) {
    const geometry = useMemo(() => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(part.positions, 3));
      geo.setIndex(new THREE.BufferAttribute(part.index, 1));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      return geo;
    }, [part]);

    return (
      <mesh
        geometry={geometry}
        onClick={(event) => {
          event.stopPropagation();
          onToggle(part.name);
        }}
      >
        <meshStandardMaterial
          color={baseColor}
          emissive={isSelected ? "#f97316" : "#000000"}
          emissiveIntensity={isSelected ? 0.55 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  },
  (prev, next) =>
    prev.part === next.part && prev.isSelected === next.isSelected && prev.baseColor === next.baseColor,
);

// 선택되지 않은 부품이 몇백 개라도 화면에는 메쉬 1개(드로우콜 1번)로 그리기 위해,
// 부품별 지오메트리를 정점 색상(vertex color)을 붙여 하나로 합칩니다. 클릭한 삼각형
// 번호(faceIndex)로 어떤 부품인지 되찾을 수 있도록 부품별 삼각형 범위도 함께 만듭니다.
function buildMergedBase(parts, colorForPart) {
  if (parts.length === 0) {
    return null;
  }

  const geometries = [];
  const ranges = [];
  let faceCursor = 0;

  parts.forEach((part) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(part.positions, 3));
    geo.setIndex(new THREE.BufferAttribute(part.index, 1));

    const color = new THREE.Color(colorForPart(part));
    const colors = new Float32Array(part.positions.length);

    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }

    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometries.push(geo);

    const faceCount = part.index.length / 3;
    faceCursor += faceCount;
    ranges.push({ end: faceCursor, name: part.name });
  });

  const merged = mergeGeometries(geometries, false);

  if (!merged) {
    return null;
  }

  merged.computeVertexNormals();
  merged.computeBoundingSphere();

  return { geometry: merged, ranges };
}

function findPartNameForFace(faceIndex, ranges) {
  let low = 0;
  let high = ranges.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;

    if (faceIndex < ranges[mid].end) {
      if (mid === 0 || faceIndex >= ranges[mid - 1].end) {
        return ranges[mid].name;
      }

      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return null;
}

const MergedBaseMesh = memo(
  function MergedBaseMesh({ parts, colorForPart, onToggle }) {
    const merged = useMemo(() => buildMergedBase(parts, colorForPart), [parts, colorForPart]);

    if (!merged) {
      return null;
    }

    return (
      <mesh
        geometry={merged.geometry}
        onClick={(event) => {
          event.stopPropagation();

          if (event.faceIndex == null) {
            return;
          }

          const name = findPartNameForFace(event.faceIndex, merged.ranges);

          if (name) {
            onToggle(name);
          }
        }}
      >
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
    );
  },
  (prev, next) => prev.parts === next.parts && prev.colorForPart === next.colorForPart,
);

function buildMaterialColorMap(partMaterialKeys) {
  const map = new Map();
  const uniqueKeys = [...new Set(Object.values(partMaterialKeys))];

  uniqueKeys.forEach((key, index) => {
    map.set(key, MATERIAL_COLOR_PALETTE[index % MATERIAL_COLOR_PALETTE.length]);
  });

  return map;
}

function MaterialLegend({ partMaterialKeys, materialColorByKey }) {
  const uniqueKeys = [...new Set(Object.values(partMaterialKeys))];

  if (uniqueKeys.length === 0) {
    return null;
  }

  return (
    <div className="load-model-viewer-legend">
      {uniqueKeys.map((key) => (
        <span className="load-model-viewer-legend__item" key={key}>
          <span
            className="load-model-viewer-legend__swatch"
            style={{ background: materialColorByKey.get(key) || UNASSIGNED_COLOR }}
          />
          {getMaterialOption(key).label}
        </span>
      ))}
    </div>
  );
}

function LoadModelViewer({ file, selectedNames, onToggleSelect, partMaterialKeys }) {
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [parsed, setParsed] = useState(null);
  const [viewRequest, setViewRequest] = useState(null);
  const controlsRef = useRef(null);

  const materialColorByKey = useMemo(
    () => buildMaterialColorMap(partMaterialKeys),
    [partMaterialKeys],
  );

  const colorForPart = useMemo(
    () => (part) => materialColorByKey.get(partMaterialKeys[part.name]) || UNASSIGNED_COLOR,
    [materialColorByKey, partMaterialKeys],
  );

  // 선택되지 않은(대다수) 부품은 메쉬 1개로 합쳐서 그리고, 선택된(보통 소수) 부품만
  // 개별 메쉬로 그려 강조 표시합니다. 조립품 부품이 몇백 개여도 회전이 매끄럽게 유지됩니다.
  const baseParts = useMemo(
    () => (parsed ? parsed.parts.filter((part) => !selectedNames.has(part.name)) : []),
    [parsed, selectedNames],
  );
  const selectedParts = useMemo(
    () => (parsed ? parsed.parts.filter((part) => selectedNames.has(part.name)) : []),
    [parsed, selectedNames],
  );

  useEffect(() => {
    let cancelled = false;

    if (!file) {
      setParsed(null);
      setStatus("idle");
      return undefined;
    }

    setStatus("loading");
    setErrorMessage("");

    (async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await parseStepPartsForViewer(arrayBuffer);

        if (cancelled) {
          return;
        }

        if (result.parts.length === 0) {
          setParsed(null);
          setStatus("empty");
          return;
        }

        setParsed(result);
        setStatus("ready");
      } catch (error) {
        if (!cancelled) {
          setParsed(null);
          setStatus("error");
          setErrorMessage(error instanceof Error ? error.message : "3D 형상을 불러오지 못했습니다.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  if (!file) {
    return null;
  }

  if (status === "loading") {
    return (
      <div className="load-model-viewer load-model-viewer--status">
        3D 형상을 불러오는 중입니다...
      </div>
    );
  }

  if (status === "error") {
    return <div className="load-model-viewer load-model-viewer--status">{errorMessage}</div>;
  }

  if (status === "empty" || !parsed) {
    return null;
  }

  return (
    <div className="load-model-viewer">
      <Canvas camera={{ fov: 45 }} style={{ background: "#0b1220" }}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[10, 10, 10]} intensity={0.8} />
        <directionalLight position={[-10, -5, -10]} intensity={0.3} />
        <AutoCamera bbox={parsed.bbox} />
        <ViewController bbox={parsed.bbox} request={viewRequest} controlsRef={controlsRef} />
        <MergedBaseMesh parts={baseParts} colorForPart={colorForPart} onToggle={onToggleSelect} />
        {selectedParts.map((part, index) => (
          <PartMesh
            key={`${part.name}-${index}`}
            part={part}
            isSelected
            onToggle={onToggleSelect}
            baseColor={colorForPart(part)}
          />
        ))}
        <OrbitControls ref={controlsRef} makeDefault />
      </Canvas>
      <div className="load-model-viewer-view-buttons">
        {Object.entries(VIEW_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => setViewRequest({ type: "preset", dir: key, nonce: Date.now() })}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="load-model-viewer-view-buttons">
        <button
          type="button"
          onClick={() => setViewRequest({ type: "roll", deg: -90, nonce: Date.now() })}
        >
          ↺ 화면 90° 회전
        </button>
        <button
          type="button"
          onClick={() => setViewRequest({ type: "roll", deg: 90, nonce: Date.now() })}
        >
          ↻ 화면 90° 회전
        </button>
      </div>
      <MaterialLegend partMaterialKeys={partMaterialKeys} materialColorByKey={materialColorByKey} />
      <p className="load-model-viewer__hint">
        형상을 클릭하면 부품이 선택됩니다 (여러 개 선택 가능, 다시 클릭하면 해제). 색상은 적용된
        소재를 나타내고, 주황색 테두리는 지금 선택된 부품입니다. 드래그로 회전, 스크롤로
        확대·축소할 수 있습니다.
      </p>
    </div>
  );
}

function areSelectedNamesEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (a.size !== b.size) {
    return false;
  }

  for (const name of a) {
    if (!b.has(name)) {
      return false;
    }
  }

  return true;
}

function arePartMaterialKeysEqual(a, b) {
  if (a === b) {
    return true;
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    if (a[key] !== b[key]) {
      return false;
    }
  }

  return true;
}

// 폼의 다른 필드가 바뀔 때마다 이 무거운 3D 뷰어까지 다시 그려지는 것을 막기 위해,
// file / 선택된 부품 목록 / 부품별 소재가 실제로 바뀌었을 때만 리렌더링합니다.
export default memo(
  LoadModelViewer,
  (prev, next) =>
    prev.file === next.file &&
    areSelectedNamesEqual(prev.selectedNames, next.selectedNames) &&
    arePartMaterialKeysEqual(prev.partMaterialKeys, next.partMaterialKeys),
);
