/**
 * ロゴ「記録環 / Rec Ring」の各サイズ画像を public/logo 配下に生成する。
 *
 *   node scripts/generate-logo.mjs
 *
 * マークの定義はこのファイルが唯一の出典。SVG も PNG もここから書き出すので、
 * 意匠を変えるときは MARK / BG_* だけを直せば全サイズが揃って更新される。
 *
 * 生成物と、現行ロゴのどれを置き換えるかの対応:
 *
 *   logo/icon-192x192.png      → public/icon-192x192.png        manifest.ts (purpose: any)
 *   logo/icon-512x512.png      → public/icon-512x512.png        manifest.ts / Home.tsx / ogImage.tsx
 *   logo/icon-120x120.png      → public/icon-120x120.png        Layout.tsx
 *   logo/maskable-192x192.png  → public/maskable_icon_x192.png  manifest.ts (purpose: maskable)
 *   logo/maskable-512x512.png  → public/maskable_icon_x512.png  manifest.ts (purpose: maskable)
 *   logo/icon-96x96.png        → src/app/icon.png               Next.js のファイル規約
 *   logo/icon-180x180.png      → src/app/apple-icon.png         Next.js のファイル規約
 *   logo/favicon.ico           → src/app/favicon.ico            16/32/48 のマルチサイズ
 *   logo/icon_dev-*.png        → public/icon_dev-*.png          dev 環境
 *   logo/maskable_dev-*.png    → public/maskable_icon_dev_x*.png dev 環境
 *
 *   logo/icon-1024x1024.png    ストア申請・資料用のマスター
 *   logo/mark-512.png / mark-1024.png / mark.svg   地色なしのマーク単体
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "logo");

// マークは 100x100 座標系で、外周半径 34.5（＝キャンバスの 69%）を占める。
// 環＝記録の蓄積・戦績、中心の光る点＝きずな・到達点。
const MARK_DEFS = `
    <linearGradient id="ringBlue" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#1d5ad6"/>
    </linearGradient>
    <linearGradient id="ringGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f4d68f"/>
      <stop offset="1" stop-color="#d9a441"/>
    </linearGradient>
    <radialGradient id="dotFill" cx="0.5" cy="0.5" r="0.62">
      <stop offset="0" stop-color="#fff6da"/>
      <stop offset="0.46" stop-color="#f7c95d"/>
      <stop offset="1" stop-color="#c4841a"/>
    </radialGradient>
    <radialGradient id="dotCore" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fff3cd" stop-opacity="0.95"/>
      <stop offset="0.42" stop-color="#ffd06a" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#f5bc4e" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="dotBloom" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffd479" stop-opacity="0.42"/>
      <stop offset="0.42" stop-color="#f0b64e" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#e6ad4b" stop-opacity="0"/>
    </radialGradient>`;

const MARK = `
    <circle cx="50" cy="50" r="30" fill="none" stroke="url(#ringBlue)" stroke-width="9"/>
    <circle cx="50" cy="50" r="30" fill="none" stroke="url(#ringGold)" stroke-width="9"
            stroke-linecap="round" stroke-dasharray="118 71" transform="rotate(-90 50 50)"/>
    <circle cx="50" cy="50" r="21" fill="url(#dotBloom)"/>
    <circle cx="50" cy="50" r="13.5" fill="url(#dotCore)"/>
    <circle cx="50" cy="50" r="7.6" fill="url(#dotFill)"/>`;

// 本番＝濃紺。dev＝一目で区別できるよう暗いオレンジにする（金の発光は暗地でしか成立しないため、
// manifest の #EA580C をそのまま敷かずに暗く落としている）。
// lift はマークの背後をわずかに持ち上げる光。隅に寄せると中央が沈んで見えるため中心やや上に置く。
const BG_PROD = { from: "#101a33", to: "#080d1c", lift: "#1e3161", liftOpacity: 0.55 };
const BG_DEV = { from: "#9a3412", to: "#3d0f05", lift: "#c2570f", liftOpacity: 0.55 };

/** マークだけの透過 SVG。外周ぴったりで切り出す */
function markSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="15 15 70 70">
  <defs>${MARK_DEFS}
  </defs>${MARK}
</svg>
`;
}

/**
 * 地色つきアイコン SVG。
 * @param {number} scale マークの拡大率（1 = キャンバスの 69% を占める）
 */
function iconSvg(bg, scale) {
  const t =
    scale === 1 ? "" : ` transform="translate(50 50) scale(${scale}) translate(-50 -50)"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg.from}"/>
      <stop offset="1" stop-color="${bg.to}"/>
    </linearGradient>
    <radialGradient id="bgLift" cx="0.5" cy="0.44" r="0.62">
      <stop offset="0" stop-color="${bg.lift}" stop-opacity="${bg.liftOpacity}"/>
      <stop offset="1" stop-color="${bg.lift}" stop-opacity="0"/>
    </radialGradient>${MARK_DEFS}
  </defs>
  <rect width="100" height="100" fill="url(#bg)"/>
  <rect width="100" height="100" fill="url(#bgLift)"/>
  <g${t}>${MARK}
  </g>
</svg>
`;
}

const png = (svg, size, name) =>
  sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(OUT_DIR, name));

mkdirSync(OUT_DIR, { recursive: true });

// マークの拡大率。標準は 1（69%）。favicon など極小は輪郭を稼ぐため大きめ、
// maskable は Android のセーフゾーン（中心 80% 円）に収めるため小さめにする。
const STANDARD = iconSvg(BG_PROD, 1);
const TIGHT = iconSvg(BG_PROD, 1.27); // 88%
const MASKABLE = iconSvg(BG_PROD, 0.87); // 60%
const DEV_STANDARD = iconSvg(BG_DEV, 1);
const DEV_MASKABLE = iconSvg(BG_DEV, 0.87);

writeFileSync(join(OUT_DIR, "mark.svg"), markSvg());
writeFileSync(join(OUT_DIR, "icon.svg"), STANDARD);
writeFileSync(join(OUT_DIR, "maskable.svg"), MASKABLE);
writeFileSync(join(OUT_DIR, "icon-dev.svg"), DEV_STANDARD);
writeFileSync(join(OUT_DIR, "maskable-dev.svg"), DEV_MASKABLE);

await Promise.all([
  // 透過マーク（資料・OGP 合成用）
  png(markSvg(), 512, "mark-512.png"),
  png(markSvg(), 1024, "mark-1024.png"),

  // purpose: any
  png(TIGHT, 16, "icon-16x16.png"),
  png(TIGHT, 32, "icon-32x32.png"),
  png(TIGHT, 48, "icon-48x48.png"),
  png(STANDARD, 96, "icon-96x96.png"),
  png(STANDARD, 120, "icon-120x120.png"),
  png(STANDARD, 180, "icon-180x180.png"),
  png(STANDARD, 192, "icon-192x192.png"),
  png(STANDARD, 512, "icon-512x512.png"),
  png(STANDARD, 1024, "icon-1024x1024.png"),

  // purpose: maskable
  png(MASKABLE, 192, "maskable-192x192.png"),
  png(MASKABLE, 512, "maskable-512x512.png"),

  // dev 環境用
  png(DEV_STANDARD, 192, "icon_dev-192x192.png"),
  png(DEV_STANDARD, 512, "icon_dev-512x512.png"),
  png(DEV_MASKABLE, 192, "maskable_dev-192x192.png"),
  png(DEV_MASKABLE, 512, "maskable_dev-512x512.png"),
]);

// sharp は .ico を書けないので ImageMagick でマルチサイズ ICO にまとめる
execFileSync("convert", [
  join(OUT_DIR, "icon-16x16.png"),
  join(OUT_DIR, "icon-32x32.png"),
  join(OUT_DIR, "icon-48x48.png"),
  join(OUT_DIR, "favicon.ico"),
]);

console.log(`generated: ${OUT_DIR}`);
