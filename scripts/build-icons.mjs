import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const rootDir = process.cwd();
const sourceSvg = path.join(rootDir, "public", "favicon.svg");
const buildDir = path.join(rootDir, "build");
const pngPath = path.join(buildDir, "icon.png");
const icoPath = path.join(buildDir, "icon.ico");

await fs.mkdir(buildDir, { recursive: true });

const iconSizes = [16, 24, 32, 48, 64, 128, 256];
const resizedPngBuffers = await Promise.all(
  iconSizes.map((size) => sharp(sourceSvg).resize(size, size).png().toBuffer()),
);

await fs.writeFile(pngPath, resizedPngBuffers[resizedPngBuffers.length - 1]);
await fs.writeFile(icoPath, await pngToIco(resizedPngBuffers));

console.log(`Generated ${pngPath}`);
console.log(`Generated ${icoPath}`);
