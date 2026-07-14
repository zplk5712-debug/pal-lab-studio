import { memo, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
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

  const materialColorByKey = useMemo(
    () => buildMaterialColorMap(partMaterialKeys),
    [partMaterialKeys],
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
        {parsed.parts.map((part, index) => (
          <PartMesh
            key={`${part.name}-${index}`}
            part={part}
            isSelected={selectedNames.has(part.name)}
            onToggle={onToggleSelect}
            baseColor={materialColorByKey.get(partMaterialKeys[part.name]) || UNASSIGNED_COLOR}
          />
        ))}
        <OrbitControls makeDefault />
      </Canvas>
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
