// スプライトのアルファ境界(bbox)データ src/app/utils/spriteBounds.ts を生成するスクリプト。
//
// 各ポケモンスプライト画像(68x68 前提だがキャンバスサイズも記録)の
// 不透明ピクセルの外接矩形 [canvasW, canvasH, bx, by, bw, bh] を算出する。
// このデータを spriteFitStyle が使い、キャラを枠内で最適サイズ・位置に正規化する。
//
// 実行方法(webapp を起動しておく、または VSRECORDER の一覧APIに到達できる状態で):
//   node scripts/generate-sprite-bounds.mjs
//
// スプライトの追加・差し替えがあったら再実行して spriteBounds.ts を更新すること。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../src/app/utils/spriteBounds.ts");
// 稼働中の webapp(dev/prod) 経由でスプライト一覧を取得する
const LIST_URL =
  process.env.SPRITE_LIST_URL || "http://localhost:3000/api/pokemon-sprites";
const UNKNOWN_URL =
  "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png";
const ALPHA_THRESHOLD = 16;

async function bboxOf(buf) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels } = info;
  let minX = W,
    minY = H,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = data[(y * W + x) * channels + (channels - 1)];
      if (a > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return [W, H, 0, 0, W, H];
  return [W, H, minX, minY, maxX - minX + 1, maxY - minY + 1];
}

async function fetchBuf(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const sprites = await (await fetch(LIST_URL)).json();
  const out = {};
  let ok = 0;
  const failed = [];
  for (const s of sprites) {
    try {
      out[s.id] = await bboxOf(await fetchBuf(s.image_url));
      ok++;
    } catch {
      failed.push(s.id); // 画像欠損(404)など。fallback(unknown)で表示される。
    }
  }
  // unknown フォールバックも記録
  out["unknown"] = await bboxOf(await fetchBuf(UNKNOWN_URL));

  const entries = Object.entries(out).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  let ts =
    "// 自動生成(scripts/generate-sprite-bounds.mjs): 各スプライトのアルファ境界\n" +
    "// [canvasW, canvasH, bx, by, bw, bh]。spriteFitStyle が最適表示に使用する。\n" +
    "// スプライト追加時は上記スクリプトを再実行して更新すること。\n" +
    "export const SPRITE_BOUNDS: Record<string, [number, number, number, number, number, number]> = {\n";
  for (const [id, v] of entries) ts += `  "${id}": [${v.join(",")}],\n`;
  ts += "};\n";
  fs.writeFileSync(OUT, ts);
  console.log(`wrote ${OUT}: ${entries.length} entries (ok=${ok}, failed=${failed.length})`);
  if (failed.length) console.log("failed(画像欠損):", failed.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
