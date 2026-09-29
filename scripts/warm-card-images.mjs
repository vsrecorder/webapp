/*
 * カード画像のキャッシュを温める。
 *
 * バトラボ（/api/cards/prints）から今環境の入賞デッキが使う印刷（絵柄）の画像 URL を取り、
 * next/image の最適化 API（/_next/image）にサムネイル用・モーダル用の 2 サイズで通しておく。
 * 最適化の初回は元画像（868×1212 の JPEG、80〜240KB）の取得と変換で 1 枚 300〜540ms かかり、
 * 直リンク（125ms）より遅い。先に一巡しておけば利用者は温まった画像（55ms）だけを引く。
 * 温めた画像は next.config の minimumCacheTTL（30 日）のあいだ残る。
 *
 * 使い方:
 *   本番ホスト: make warm-images （コンテナの node に stdin で渡す。cron で毎日）
 *   手元:       WARM_ORIGIN=https://local.vsrecorder.mobi VSLAB_ORIGIN=http://localhost:6757 \
 *               node scripts/warm-card-images.mjs
 *
 * 幅は src/app/utils/cardImage.ts の候補（サムネイル 96/256、モーダル 384/828）のうち、
 * ほぼ全ての端末（DPR 2 以上）が選ぶ 256 と 828。書式は WebP（Accept で指定。Next の formats の既定）。
 * 同じ画像を同時に何本も要求しないよう 4 並列にとどめる（サーバの sharp と公式サイトへの配慮）。
 */

const WARM_ORIGIN = process.env.WARM_ORIGIN ?? "http://127.0.0.1:3003";
const VSLAB_ORIGIN = process.env.VSLAB_ORIGIN ?? "https://lab.vsrecorder.mobi";
// 空なら直近の環境
const WARM_ENV = process.env.WARM_ENV ?? "";
// 試しに少しだけ回すとき（0 なら全部）
const WARM_LIMIT = Number(process.env.WARM_LIMIT ?? 0);
const WIDTHS = [256, 828];
const CONCURRENCY = 4;

const listUrl = `${VSLAB_ORIGIN}/api/cards/prints${WARM_ENV ? `?env=${encodeURIComponent(WARM_ENV)}` : ""}`;
const listRes = await fetch(listUrl, { headers: { Accept: "application/json" } });
if (!listRes.ok) {
  console.error(`印刷の一覧を取れませんでした: ${listRes.status} ${listUrl}`);
  process.exit(1);
}
const list = await listRes.json();
const prints = WARM_LIMIT > 0 ? list.prints.slice(0, WARM_LIMIT) : list.prints;
console.log(`環境 ${list.environmentId}（${list.environmentTitle}）: ${prints.length} 印刷 × ${WIDTHS.length} サイズ`);

const jobs = prints.flatMap((src) => WIDTHS.map((w) => ({ src, w })));
const counts = { HIT: 0, MISS: 0, STALE: 0, other: 0, failed: 0 };
let bytes = 0;
const started = performance.now();
let cursor = 0;

async function worker() {
  while (cursor < jobs.length) {
    const { src, w } = jobs[cursor++];
    const url = `${WARM_ORIGIN}/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
    try {
      const res = await fetch(url, { headers: { Accept: "image/webp,image/*" } });
      const body = await res.arrayBuffer();
      if (!res.ok) {
        counts.failed++;
        console.error(`  ${res.status} w=${w} ${src}`);
        continue;
      }
      bytes += body.byteLength;
      // Next が付ける x-nextjs-cache: MISS が今回温めたもの、HIT は温まっていたもの
      const state = res.headers.get("x-nextjs-cache") ?? "other";
      counts[state in counts ? state : "other"]++;
    } catch (e) {
      counts.failed++;
      console.error(`  失敗 w=${w} ${src}: ${e instanceof Error ? e.message : e}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const sec = ((performance.now() - started) / 1000).toFixed(1);
console.log(
  `終了 ${sec}s: 今回温めた ${counts.MISS} / 温まっていた ${counts.HIT} / 期限切れの更新 ${counts.STALE} / その他 ${counts.other} / 失敗 ${counts.failed} / 合計 ${(bytes / 1024 / 1024).toFixed(1)}MB`,
);
