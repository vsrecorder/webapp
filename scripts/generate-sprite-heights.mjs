// スプライトの実身長データ src/app/utils/spriteHeights.ts を生成するスクリプト。
//
// 各ポケモン(フォーム含む)の公式身長[m]を PokéAPI の公開データ CSV から取得し、
// スプライト id(padded "0006" / フォーム付き "0006_mega_x")をキーに書き出す。
// このデータを spriteFit が使い、身長を反映したサイズ(対数圧縮)で表示する。
//
// 対象 id は既存の spriteBounds.ts のキー(=実際に表示する全スプライト)から読む。
// そのためオフライン(dev サーバ不要)で、CSV に到達できれば再現できる。
//
// 実行方法:
//   node scripts/generate-sprite-heights.mjs
//
// スプライトの追加・差し替えがあったら、まず spriteBounds.ts を更新してから
// 本スクリプトを再実行して spriteHeights.ts を更新すること。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOUNDS = path.join(__dirname, "../src/app/utils/spriteBounds.ts");
const OUT = path.join(__dirname, "../src/app/utils/spriteHeights.ts");

// PokéAPI 公式データ。pokemon.csv は 1 行 = 1 フォームで、
// identifier(フォーム名 例 "charizard-mega-x"), species_id(全国図鑑番号),
// height(デシメートル=0.1m 単位) を持つ。
const CSV_URL =
  process.env.SPRITE_HEIGHT_CSV_URL ||
  "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon.csv";

// CSV/図鑑に無い id のフォールバック身長[m](中庸な値)。
const DEFAULT_HEIGHT_M = 1.0;

// spriteBounds.ts のキー(スプライト id)を抽出する。unknown は身長を持たない。
function readSpriteIds() {
  const src = fs.readFileSync(BOUNDS, "utf8");
  const ids = [];
  for (const m of src.matchAll(/^\s*"([^"]+)":/gm)) {
    if (m[1] !== "unknown") ids.push(m[1]);
  }
  return ids;
}

// pokemon.csv を species_id(=全国図鑑番号) ごとにグループ化して返す。
async function fetchPokemonRows() {
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`CSV HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const iIdent = header.indexOf("identifier");
  const iSpecies = header.indexOf("species_id");
  const iHeight = header.indexOf("height");
  const iDefault = header.indexOf("is_default");

  const byDex = new Map(); // dex(number) -> [{identifier, height(dm), isDefault}]
  for (let i = 1; i < lines.length; i++) {
    // identifier/height 等に「,」は含まれないため単純分割で十分。
    const cols = lines[i].split(",");
    const dex = Number(cols[iSpecies]);
    const height = Number(cols[iHeight]);
    if (!Number.isFinite(dex) || !Number.isFinite(height)) continue;
    if (!byDex.has(dex)) byDex.set(dex, []);
    byDex.get(dex).push({
      identifier: cols[iIdent],
      height,
      isDefault: cols[iDefault] === "1",
    });
  }
  return byDex;
}

// スプライト id("0006_mega_x") を dex(6) とサフィックス("mega_x") に分ける。
function splitId(id) {
  const us = id.indexOf("_");
  if (us < 0) return { dex: Number(id), suffix: "" };
  return { dex: Number(id.slice(0, us)), suffix: id.slice(us + 1) };
}

// あるポケモン(dex)の中から、サフィックスに対応するフォーム行の身長[dm]を探す。
// 対応が取れない場合は null(呼び出し側で基本フォームにフォールバック)。
function matchFormHeight(rows, defaultIdentifier, suffix) {
  // サフィックス正規化: 大文字小文字を無視し、"_" を PokéAPI の "-" に合わせる。
  const ns = suffix.toLowerCase().replace(/_/g, "-");
  const nsToks = ns.split("-");
  const firstTok = nsToks[0];
  // identifier を "-" 区切りのトークン集合として持つ(境界単位の一致判定用)。
  const idToks = (r) => r.identifier.split("-");

  const strategies = [
    (r) => r.identifier === `${defaultIdentifier}-${ns}`, // 完全一致
    (r) => r.identifier.endsWith(`-${ns}`), // 末尾一致(mega-x / gmax / alola 等)
    (r) => r.identifier.includes(`-${ns}`), // 中間一致(paldea-combat-breed 等)
    // 全トークンが identifier のトークンとして存在(rapid_gmax→urshifu-rapid-strike-gmax 等)。
    // 部分文字列でなく境界単位で見るので "m"/"f" が "mega" に誤マッチしない。
    (r) => {
      const t = idToks(r);
      return nsToks.every((x) => t.includes(x));
    },
    // 先頭トークンの末尾一致(ice-rider→calyrex-ice 等)。
    // 1〜2文字トークン(Unown の "a" や gender の "m"/"f")の誤マッチは避ける。
    (r) => firstTok.length >= 3 && r.identifier.endsWith(`-${firstTok}`),
  ];
  for (const ok of strategies) {
    const hit = rows.find((r) => !r.isDefault && ok(r));
    if (hit) return hit.height;
  }
  return null;
}

async function main() {
  const ids = readSpriteIds();
  const byDex = await fetchPokemonRows();

  const out = {}; // id -> 身長[m]
  const fellBack = []; // フォーム未マッチ(基本フォーム身長で代用)
  const missingDex = []; // 図鑑データ自体が無い

  for (const id of ids) {
    const { dex, suffix } = splitId(id);
    const rows = byDex.get(dex);
    if (!rows || rows.length === 0) {
      out[id] = DEFAULT_HEIGHT_M;
      missingDex.push(id);
      continue;
    }
    const def = rows.find((r) => r.isDefault) || rows[0];

    let dm = def.height;
    if (suffix) {
      const formDm = matchFormHeight(rows, def.identifier, suffix);
      if (formDm != null) dm = formDm;
      else fellBack.push(id);
    }
    out[id] = dm / 10; // デシメートル → メートル
  }

  const entries = Object.entries(out).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  let ts =
    "// 自動生成(scripts/generate-sprite-heights.mjs): 各スプライトの公式身長[m]。\n" +
    "// キーは spriteBounds.ts と同じスプライト id。spriteFit が身長反映表示に使用する。\n" +
    "// データ源: PokéAPI(pokemon.csv, height はデシメートル→m 変換済み)。\n" +
    "// スプライト追加時は spriteBounds 更新後に上記スクリプトを再実行して更新すること。\n" +
    "export const SPRITE_HEIGHTS: Record<string, number> = {\n";
  for (const [id, m] of entries) ts += `  "${id}": ${m},\n`;
  ts += "};\n";
  fs.writeFileSync(OUT, ts);

  console.log(
    `wrote ${OUT}: ${entries.length} entries ` +
      `(form-fallback=${fellBack.length}, missing-dex=${missingDex.length})`,
  );
  if (fellBack.length)
    console.log("form-fallback(基本フォーム身長で代用):", fellBack.join(", "));
  if (missingDex.length)
    console.log("missing-dex(図鑑データ無し→既定値):", missingDex.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
