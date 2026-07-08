const fs = require("node:fs");
const path = require("node:path");

// 같은 이름 파일이 있으면 sample.csv → sample_1.csv → sample_2.csv ... 순서로 충돌 없는 이름을 찾는다.
function resolveCollisionFreePath(outputPath) {
  if (!fs.existsSync(outputPath)) {
    return outputPath;
  }

  const dir = path.dirname(outputPath);
  const ext = path.extname(outputPath);
  const base = path.basename(outputPath, ext);

  let counter = 1;
  let candidate;
  do {
    candidate = path.join(dir, `${base}_${counter}${ext}`);
    counter += 1;
  } while (fs.existsSync(candidate));

  return candidate;
}

// 여러 입력 파일 경로의 공통 상위 폴더를 찾는다 (출력 시 원본 폴더구조 유지에 사용).
function findCommonBaseDir(filePaths) {
  if (filePaths.length === 0) {
    return "";
  }
  if (filePaths.length === 1) {
    return path.dirname(filePaths[0]);
  }

  const splitPaths = filePaths.map((filePath) => path.dirname(filePath).split(path.sep));
  const first = splitPaths[0];
  let commonLength = first.length;

  for (let i = 1; i < splitPaths.length; i += 1) {
    const current = splitPaths[i];
    let matched = 0;
    while (
      matched < commonLength &&
      matched < current.length &&
      current[matched] === first[matched]
    ) {
      matched += 1;
    }
    commonLength = matched;
  }

  return first.slice(0, commonLength).join(path.sep) || path.sep;
}

// 원본 폴더구조를 유지하면서 확장자를 바꾼 출력 경로를 만들고, 충돌 시 자동으로 번호를 붙인다.
function buildOutputPath({ inputPath, commonBaseDir, outputRootDir, newExtension, suffix = "" }) {
  const inputDir = path.dirname(inputPath);
  const relativeDir = path.relative(commonBaseDir, inputDir);
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const targetDir = path.join(outputRootDir, relativeDir);

  fs.mkdirSync(targetDir, { recursive: true });

  const targetFileName = `${baseName}${suffix}${newExtension}`;
  const desiredPath = path.join(targetDir, targetFileName);

  return resolveCollisionFreePath(desiredPath);
}

module.exports = { resolveCollisionFreePath, findCommonBaseDir, buildOutputPath };
