import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const rootDir = process.cwd();
const outDir = path.join(rootDir, 'out');

function listPngFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listPngFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      files.push(fullPath);
    }
  }

  return files;
}

function parsePng(pngPath) {
  const buffer = fs.readFileSync(pngPath);
  if (buffer.length < 1024) {
    throw new Error(`PNG output is unexpectedly small: ${pngPath}`);
  }

  return PNG.sync.read(buffer);
}

function countTransparentPixels(png) {
  let transparent = 0;
  let opaque = 0;

  for (let idx = 3; idx < png.data.length; idx += 4) {
    const alpha = png.data[idx];
    if (alpha < 250) transparent += 1;
    if (alpha > 250) opaque += 1;
  }

  return { transparent, opaque };
}

const pngFiles = listPngFiles(outDir);
if (pngFiles.length === 0) {
  throw new Error(`No PNG outputs found under ${outDir}`);
}

const inspected = pngFiles.map((pngPath) => {
  const png = parsePng(pngPath);
  const alpha = countTransparentPixels(png);
  return {
    pngPath,
    width: png.width,
    height: png.height,
    ...alpha,
  };
});

const valid = inspected.find(
  (item) => item.width > 32 && item.height > 32 && item.transparent > 0 && item.opaque > 0,
);

if (!valid) {
  const summary = inspected
    .map(
      (item) =>
        `${path.relative(rootDir, item.pngPath)}: ${item.width}x${item.height}, transparent=${item.transparent}, opaque=${item.opaque}`,
    )
    .join('\n');
  throw new Error(`No valid transparent PNG output found.\n${summary}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      output: path.relative(rootDir, valid.pngPath),
      width: valid.width,
      height: valid.height,
      transparent: valid.transparent,
      opaque: valid.opaque,
    },
    null,
    2,
  ),
);
