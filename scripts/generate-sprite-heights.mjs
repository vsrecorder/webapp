// スプライトの図鑑の高さ src/app/utils/spriteHeights.ts を生成するスクリプト。
//
// ポケモンずかん(https://zukan.pokemon.co.jp/)の「たかさ」を、スプライトの
// 日本語名(なまえ・すがた)で突き合わせて引き、スプライト id をキーに書き出す。
// このデータを spriteFit が使い、高さを反映したサイズ(対数圧縮)で表示する。
//
// 以前は PokéAPI の英語のフォーム名を id の接尾辞("amped" 等)から推測して
// 引いていたが、基本の姿を候補から外していたため「ストリンダー ハイなすがた」が
// キョダイマックス(24m)に、「ニャオニクス オスのすがた」がメガに化けるといった
// 取り違えがあった。スプライトには公式図鑑と同じ表記の日本語名が付いているので、
// 名前で直接引く。
//
// 実行方法(スプライト一覧 API に到達できる状態で):
//   node scripts/generate-sprite-heights.mjs
//   SPRITE_LIST_URL=https://vsrecorder.mobi/api/v1beta/pokemon-sprites node scripts/generate-sprite-heights.mjs
//
// スプライトの追加・差し替えがあったら、generate-sprite-bounds.mjs と合わせて
// 再実行すること。公式図鑑で決まらないスプライトがあると一覧を出して失敗するので、
// 名前を直すか OVERRIDES に足す。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../src/app/utils/spriteHeights.ts");
// generate-sprite-bounds.mjs と同じく、稼働中の webapp 経由でスプライト一覧を取得する
const LIST_URL =
  process.env.SPRITE_LIST_URL || "http://localhost:3000/api/pokemon-sprites";
const ZUKAN_URL = "https://zukan.pokemon.co.jp/zukan-api/api/search/";
const ZUKAN_PAGE_SIZE = 200;

// 公式図鑑の名前では決められないスプライトの高さ[m]。理由を必ず書く。
const OVERRIDES = {
  // ムゲンダイマックスは公式図鑑に載っていない。ゲーム内の高さ(100m)を使う。
  "0890_eternamax": 100,
};

// 表記揺れをならす。全角英数・記号(％ Ｘ)は NFKC で半角に、空白は 1 つに。
// スプライト側は「コンバット種」、公式図鑑は「コンバットしゅ」と書くので揃える。
function normalize(name) {
  return name
    .normalize("NFKC")
    .replace(/種/g, "しゅ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

async function fetchSprites() {
  const sprites = await fetchJson(LIST_URL);
  return sprites.map((s) => ({ id: s.id, name: normalize(s.name) }));
}

// 公式図鑑の全件(姿違いを含む)。1 件 = { no, sub, name, subName, fullName, height, kyodai }
async function fetchZukan() {
  const entries = [];
  for (let page = 1; ; page++) {
    const body = await fetchJson(`${ZUKAN_URL}?limit=${ZUKAN_PAGE_SIZE}&page=${page}`);
    for (const r of body.results) {
      const name = normalize(r.name);
      const subName = normalize(r.sub_name);
      entries.push({
        no: r.no,
        sub: r.sub,
        name,
        subName,
        fullName: subName ? `${name} ${subName}` : name,
        height: Number(r.takasa),
        kyodai: r.kyodai_flg === 1,
      });
    }
    if (!body.paging.nextPage) break;
  }
  return entries;
}

// 候補の高さがすべて同じならその値、ばらつくなら null
function uniqueHeight(candidates) {
  const heights = new Set(candidates.map((c) => c.height));
  return heights.size === 1 ? candidates[0].height : null;
}

// スプライト 1 体の高さ[m]と、どの規則で決めたかを返す。決まらなければ null。
function resolveHeight(sprite, byFullName, byNo) {
  if (sprite.id in OVERRIDES) return { height: OVERRIDES[sprite.id], rule: "override" };

  // 1. なまえ・すがたが公式と完全に一致
  const exact = byFullName.get(sprite.name);
  if (exact) return { height: exact.height, rule: "exact" };

  const no = sprite.id.slice(0, 4);
  const all = byNo.get(no) ?? [];
  if (all.length === 0) return null;

  // キョダイマックスかどうかで候補を分ける(通常の姿と高さが桁違いのため)
  const isKyodai = sprite.name.includes("キョダイマックス");
  const candidates = all.filter((c) => c.kyodai === isKyodai);
  const [head, ...rest] = sprite.name.split(" ");
  const form = rest.join(" ");

  // 2. すがたの書き方が短いだけ(「れいじゅう」→「れいじゅうフォルム」)、
  //    または名前そのものが公式のすがた名(「ブラックキュレム」「ブラックキュレム オーバードライブ」)
  const byForm = candidates.filter(
    (c) => (form && c.subName.startsWith(form)) || c.subName === head,
  );
  const formHeight = byForm.length ? uniqueHeight(byForm) : null;
  if (formHeight != null) return { height: formHeight, rule: "form" };

  // 3. 同じ図鑑番号の姿がすべて同じ高さ(アンノーンの各文字、季節違いなど)
  const sameHeight = candidates.length ? uniqueHeight(candidates) : null;
  if (sameHeight != null) return { height: sameHeight, rule: "same-no" };

  // 4. すがたの指定が無いスプライトは、公式の先頭の姿(基本の姿)
  //    (「ギラティナ」→アナザーフォルム、「ジガルデ」→50%フォルム)
  if (!form && !isKyodai) {
    const base = all.find((c) => c.sub === 0);
    if (base) return { height: base.height, rule: "base" };
  }

  return null;
}

async function main() {
  const [sprites, zukan] = await Promise.all([fetchSprites(), fetchZukan()]);

  const byFullName = new Map();
  const byNo = new Map();
  for (const z of zukan) {
    // 同じ表記が複数あれば先に出てきた方(sub の小さい方)を使う
    if (!byFullName.has(z.fullName)) byFullName.set(z.fullName, z);
    if (!byNo.has(z.no)) byNo.set(z.no, []);
    byNo.get(z.no).push(z);
  }

  const out = {};
  const unresolved = [];
  const counts = {};
  for (const sprite of sprites) {
    if (sprite.id === "unknown") continue;
    const resolved = resolveHeight(sprite, byFullName, byNo);
    if (!resolved) {
      unresolved.push(`${sprite.id}(${sprite.name})`);
      continue;
    }
    out[sprite.id] = resolved.height;
    counts[resolved.rule] = (counts[resolved.rule] ?? 0) + 1;
  }

  if (unresolved.length) {
    console.error(
      `公式図鑑で高さが決まらないスプライトがあります(${unresolved.length}件)。` +
        "名前を直すか OVERRIDES に足してください:\n  " +
        unresolved.join("\n  "),
    );
    process.exit(1);
  }

  const entries = Object.entries(out).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  let ts =
    "// 自動生成(scripts/generate-sprite-heights.mjs): 各スプライトの図鑑の高さ[m]。\n" +
    "// キーはスプライト id。spriteFit が高さを反映した表示に使用する。\n" +
    "// データ源: ポケモンずかん(zukan.pokemon.co.jp)の「たかさ」。スプライトの日本語名で突き合わせ。\n" +
    "// スプライト追加時は spriteBounds 更新後に上記スクリプトを再実行して更新すること。\n" +
    "export const SPRITE_HEIGHTS: Record<string, number> = {\n";
  for (const [id, m] of entries) ts += `  "${id}": ${m},\n`;
  ts += "};\n";
  fs.writeFileSync(OUT, ts);

  console.log(`wrote ${OUT}: ${entries.length} entries`, counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
