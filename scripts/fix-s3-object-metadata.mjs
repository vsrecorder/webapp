// オブジェクトストレージ上の既存画像に Content-Type / Cache-Control を付け直すスクリプト。
//
// 【背景】
// アップロード時にメタデータを指定していなかったため、既存オブジェクトは
// Content-Type が application/octet-stream のまま保存されている。
// また Cache-Control が無いと、CDN(ウェブアクセラレータ)が付ける s-maxage だけになる。
// s-maxage は共有キャッシュ専用の指定なので、ブラウザからは「max-age が無い」と見え、
// Chrome は再訪問のたびに再検証(304の往復)を行う。実測で1枚あたり約 40ms の差が出る。
//
// CDN はオリジンのヘッダーをそのまま透過し、s-maxage を追記する形で返すため、
// オリジン(S3)のメタデータを直せば CDN 経由の配信もそのまま直る。
//   S3        : public, max-age=31536000, immutable
//   CDN が返す: public, max-age=31536000, immutable, s-maxage=604800
//
// 【安全性】
// - 既定は dry-run。実際に書き換えるには --apply を付ける。
// - CopyObject でメタデータのみ差し替える(本文は変わらない)。
// - CopyObject は ACL を引き継がないため public-read を明示している。これが無いと
//   オブジェクトが非公開になり配信が止まるので、絶対に外さないこと。
// - 冪等。中断しても同じコマンドで再実行できる。
//
// 【レート制限】
// さくらのオブジェクトストレージは「1バケットあたり毎秒100アクセス」(標準プラン)。
// このバケットは本番サービスも使っている(CDNのキャッシュミス時のオリジンアクセス、
// core-apiserverのデッキ画像アップロード、プロフィール画像アップロード)。
// 全部使い切ると本番の配信・アップロードが失敗しうるので、既定では 30 req/s に抑えている。
// CopyObject も ListObjectsV2 も1回=1アクセスとして数える。
// あわせて SDK を adaptive リトライにしてあり、スロットリングされた場合は自動で減速する。
//
// 【実行方法】
//   node --env-file=.env scripts/fix-s3-object-metadata.mjs [options]
//
//   --prefix <p>   対象のキー接頭辞 (既定: images/)
//   --apply        実際に書き換える (付けなければ件数を数えるだけ)
//   --no-head      HeadObject による事前確認を省く。対象がほぼ全件のときはこちらが速い
//   --concurrency  並列数 (既定: 16)
//   --rps          秒あたりリクエスト数の上限 (既定: 30、上限100の3割)
//                  本番が空いている時間帯なら 50 程度まで上げてよいが、100 に近づけないこと
//   --since <日時>  更新日時がこれ以降のオブジェクトだけを対象にする (ISO8601)
//                  例: --since 2026-08-11T12:00:00Z
//                  一括適用のあとに増えた分だけを拾いたいときに使う。ListObjectsV2 は
//                  全件走査するが HeadObject/CopyObject を絞れるので大幅に速い。
//                  一括適用で更新日時も書き換わっているため、--since には
//                  「一括適用が終わった時刻」以降を指定すること(それ以前を指定しても
//                  HeadObject で正しいと判定されるだけで、害はない)。
//
//   例) まず件数を見る:
//     node --env-file=.env scripts/fix-s3-object-metadata.mjs --prefix images/icons/
//   例) 適用する:
//     node --env-file=.env scripts/fix-s3-object-metadata.mjs --prefix images/icons/ --apply
//
// 【適用後】
// CDN には旧ヘッダーのキャッシュが最大7日(s-maxage=604800)残る。すぐ反映したい場合は
// ウェブアクセラレータ側でキャッシュを消すこと。放置しても順次入れ替わる。

import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const APPLY = process.argv.includes("--apply");
const NO_HEAD = process.argv.includes("--no-head");
const PREFIX = arg("--prefix", "images/");
const CONCURRENCY = Number(arg("--concurrency", "16"));
const RPS = Number(arg("--rps", "30"));

const sinceArg = arg("--since", null);
const SINCE = sinceArg ? new Date(sinceArg) : null;
if (SINCE && Number.isNaN(SINCE.getTime())) {
  console.error(`--since の日時を解釈できません: ${sinceArg}`);
  process.exit(1);
}

// バケット上限(毎秒100)に対する簡易トークンバケット。
// 直近1秒に投げたリクエストが RPS に達していたら、最も古いものが1秒経つまで待つ。
const recent = [];
async function acquire() {
  for (;;) {
    const now = Date.now();
    while (recent.length && now - recent[0] >= 1000) recent.shift();
    if (recent.length < RPS) {
      recent.push(now);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000 - (now - recent[0])));
  }
}

const {
  SAKURA_OBJECTSTORAGE_ACCESS_KEY_ID: accessKeyId,
  SAKURA_OBJECTSTORAGE_SECRET_ACCESS_KEY: secretAccessKey,
  SAKURA_OBJECTSTORAGE_ENDPOINT: endpoint,
  SAKURA_OBJECTSTORAGE_REGION: region,
  SAKURA_OBJECTSTORAGE_BUCKET_NAME: bucket,
} = process.env;

if (!accessKeyId || !secretAccessKey || !endpoint || !region || !bucket) {
  console.error(
    "オブジェクトストレージの環境変数が読めていません。" +
      "--env-file=.env を付けて実行してください。",
  );
  process.exit(1);
}

const s3 = new S3Client({
  region,
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  // スロットリングされたら自動で減速しながら再試行する
  retryMode: "adaptive",
  maxAttempts: 5,
});

const MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

// キーが不変であることを保証できる prefix だけ immutable にする。
// - decks : デッキコード単位。アップロード済みならスキップされるので上書きされない
// - users : ファイル名に日時が入る
// - ogp   : ファイル名にデザインのバージョンが入る
// icons / pokemon-sprites は同じURLのまま画像を差し替える運用があり得るため、
// 1日で切れるようにしておく(差し替え後はCDNのパージで反映する)。
const IMMUTABLE_PREFIXES = ["images/decks/", "images/users/", "images/ogp/"];
const IMMUTABLE = "public, max-age=31536000, immutable";
const MUTABLE = "public, max-age=86400, stale-while-revalidate=604800";

function cacheControlFor(key) {
  return IMMUTABLE_PREFIXES.some((p) => key.startsWith(p)) ? IMMUTABLE : MUTABLE;
}

function contentTypeFor(key) {
  const ext = key.split(".").pop()?.toLowerCase();
  return MIME[ext ?? ""] ?? null;
}

const stats = { scanned: 0, needFix: 0, fixed: 0, skipped: 0, failed: 0 };
const byPrefix = new Map();
const failures = [];

async function handle(key) {
  stats.scanned++;
  if (stats.scanned % 5000 === 0) {
    const suffix = APPLY ? `, 修正 ${stats.fixed}` : "";
    console.log(`  …${stats.scanned}件走査 (要修正 ${stats.needFix}${suffix})`);
  }

  // 拡張子から型を判定できないものは触らない(ディレクトリマーカー等)
  const contentType = contentTypeFor(key);
  if (!contentType) {
    stats.skipped++;
    return;
  }

  const cacheControl = cacheControlFor(key);

  if (!NO_HEAD) {
    try {
      await acquire();
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      if (head.ContentType === contentType && head.CacheControl === cacheControl) {
        return; // すでに正しい
      }
    } catch (err) {
      stats.failed++;
      failures.push(`${key}: HeadObject ${err.name}`);
      return;
    }
  }

  stats.needFix++;
  const group = key.split("/").slice(0, 2).join("/");
  byPrefix.set(group, (byPrefix.get(group) ?? 0) + 1);

  if (!APPLY) return;

  try {
    await acquire();
    await s3.send(
      new CopyObjectCommand({
        Bucket: bucket,
        Key: key,
        CopySource: `/${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`,
        MetadataDirective: "REPLACE",
        ContentType: contentType,
        CacheControl: cacheControl,
        // CopyObject は ACL を引き継がない。外すと非公開になり配信が止まる
        ACL: "public-read",
      }),
    );
    stats.fixed++;
  } catch (err) {
    stats.failed++;
    failures.push(`${key}: CopyObject ${err.name}`);
  }
}

console.log(
  `bucket=${bucket} prefix=${PREFIX} 並列=${CONCURRENCY} 上限=${RPS}req/s ` +
    (SINCE ? `since=${SINCE.toISOString()} ` : "") +
    `モード=${APPLY ? "APPLY(書き換える)" : "dry-run(数えるだけ)"}\n`,
);

const startedAt = Date.now();
let listed = 0;

let token;
let batch = [];
do {
  await acquire();
  const res = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: PREFIX,
      ContinuationToken: token,
      MaxKeys: 1000,
    }),
  );

  for (const obj of res.Contents ?? []) {
    listed++;
    if (SINCE && obj.LastModified && new Date(obj.LastModified) < SINCE) continue;

    batch.push(obj.Key);
    if (batch.length >= CONCURRENCY) {
      await Promise.all(batch.map(handle));
      batch = [];
    }
  }

  token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token);
await Promise.all(batch.map(handle));

const elapsedSec = (Date.now() - startedAt) / 1000;
console.log("\n=== 結果 ===");
console.log(
  (SINCE ? `一覧 ${listed} (うち since 該当 ${stats.scanned}) / ` : `走査 ${stats.scanned} / `) +
    `要修正 ${stats.needFix} / 修正済 ${stats.fixed} / ` +
    `対象外 ${stats.skipped} / 失敗 ${stats.failed}`,
);
// 実効レートが上限(バケット毎秒100)に対してどの程度かを確認できるようにする
const totalReqs = (NO_HEAD ? 0 : stats.scanned) + stats.fixed + Math.ceil(stats.scanned / 1000);
console.log(
  `所要 ${elapsedSec.toFixed(1)}秒 / 実効 ${(totalReqs / elapsedSec).toFixed(1)} req/s ` +
    `(バケット上限 100 req/s)`,
);

if (byPrefix.size) {
  console.log("\n=== 内訳 ===");
  for (const [p, n] of [...byPrefix].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(n).padStart(8)} 件  ${p}`);
  }
}

if (failures.length) {
  console.log(`\n=== 失敗 (先頭10件 / 全${failures.length}件) ===`);
  for (const f of failures.slice(0, 10)) console.log(`  ${f}`);
  console.log("冪等なので、同じコマンドを再実行すれば取りこぼしだけが処理されます。");
}

if (!APPLY && stats.needFix) {
  console.log("\n--apply を付けると書き換えます。");
}

process.exit(stats.failed > 0 ? 1 : 0);
