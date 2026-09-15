import {
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";

const accessKeyId = process.env.SAKURA_OBJECTSTORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.SAKURA_OBJECTSTORAGE_SECRET_ACCESS_KEY;
const endpoint = process.env.SAKURA_OBJECTSTORAGE_ENDPOINT;
const region = process.env.SAKURA_OBJECTSTORAGE_REGION;
const bucketName = process.env.SAKURA_OBJECTSTORAGE_BUCKET_NAME;
const cdnUrl = process.env.SAKURA_OBJECTSTORAGE_CDN_URL;

// 画像のデザインを変更したら、この値を上げる。
// オブジェクトキーに含めているため、値を変えると別オブジェクトとして再生成・再アップロードされ、
// CDN に残った古い画像を参照し続けることがなくなる。
const OG_IMAGE_VERSION = "v2";

// 一度存在を確認できたキーは、プロセスが生きている間は再確認しない。
// OGP画像はイベント確定後に変わらないため、リクエストのたびに HeadObject を投げる必要がない。
const ensuredKeys = new Set<string>();

// 生成・アップロードに失敗したキーと、再試行してよい時刻。投稿者のアイコン URL が切れている
// などで毎回失敗する画像を、ページを開くたびに描画し直さないための短い記憶。
const failedKeys = new Map<string, number>();
const FAILED_KEY_RETRY_MS = 10 * 60 * 1000;

// 裏で用意している最中のキー。同じ画像に同時にアクセスが来ても、確認と生成を重ねて走らせない。
const inFlightKeys = new Set<string>();

function buildS3Client(): S3Client {
  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: accessKeyId || "",
      secretAccessKey: secretAccessKey || "",
    },
  });
}

export function buildOgImageKey(name: string): string {
  return `images/ogp/${name}-${OG_IMAGE_VERSION}.png`;
}

// HeadObject のエラーが「オブジェクトが存在しない(404)」を意味するか判定する。
// 接続先はS3互換のオブジェクトストレージで、SDKの NotFound クラスに必ずしも
// マッピングされるとは限らないため、HTTPステータスとエラー名でも判定する。
function isNotFoundError(error: unknown): boolean {
  if (error instanceof NotFound) {
    return true;
  }

  const httpStatusCode = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata
    ?.httpStatusCode;
  if (httpStatusCode === 404) {
    return true;
  }

  const name = (error as { name?: string })?.name;
  return name === "NotFound" || name === "NoSuchKey";
}

/**
 * オブジェクトが存在するかを確認する。
 *
 * 404 以外のエラー（ネットワークの一時不調・認証エラー・スロットリングなど）を
 * 「存在しない」と扱ってはいけない。誤判定すると、実際には存在する画像に対して
 * 生成(satoriで数百ms)と再アップロードがページ描画の経路で走ってしまう。
 * 存在を判定できない場合は例外をそのまま投げ、呼び出し元(ensureOgImage)の
 * フォールバック（URLを返さない＝og:imageが欠けるだけ）に委ねる。
 */
async function exists(s3Client: S3Client, key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
    return true;
  } catch (error) {
    if (isNotFoundError(error)) {
      return false;
    }

    throw error;
  }
}

/**
 * OGP画像のCDN上のURLを返す。まだ置かれていなければ、裏で生成してアップロードする。
 *
 * 存在確認(HeadObject)も生成も待たない。待つと、そのページの初回描画が往復ぶん遅くなる。
 * ensuredKeys はプロセスが生きている間しか残らないので、デプロイのたびに空になり、
 * シティリーグ個別ページ(7,802件)はそれぞれの初回アクセスで1往復していた
 * (本番実測: キャッシュが温まった状態の TTFB 0.11〜0.15秒に対し、初回 0.25〜1.02秒)。
 *
 * og:image は SNS にシェアされたときだけ要るもので、検索エンジンの本文評価にも
 * ページ表示にも効かない。描画を止めてまで確かめるものではない。
 *
 * キーは決定的(name + OG_IMAGE_VERSION)なので、実体より先にURLを返しても後から一致する。
 * 引き換えに、一度も描画されたことのない画像は最初のシェアに間に合わないことがある
 * (次のシェアからは出る)。既存のページは生成済みなので、実際に当たるのは新規イベント。
 */
export function ogImageUrlFor(
  name: string,
  render: () => Promise<Buffer>,
): string | null {
  // 配信元が無ければURLを組み立てられない(og:image が欠けるだけでページは出る)
  if (!cdnUrl) {
    return null;
  }

  const key = buildOgImageKey(name);

  if (!ensuredKeys.has(key)) {
    ensureInBackground(key, render);
  }

  return `${cdnUrl}/${key}`;
}

/**
 * 画像の実体を用意し切る。応答を返したあと(after())から呼ぶ用。
 *
 * 描画の経路からは呼ばないこと。生成は satori 経由で数百ms、存在確認もネットワークを
 * 1往復するため、待つとその分だけ初回描画が遅くなる。描画側は ogImageUrlFor を使う。
 */
export async function ensureOgImage(
  name: string,
  render: () => Promise<Buffer>,
): Promise<void> {
  const key = buildOgImageKey(name);

  if (ensuredKeys.has(key)) {
    return;
  }

  await ensureStored(key, render);
}

/**
 * 実体を確認し、無ければ生成してアップロードする。
 *
 * 失敗しても投げない。この処理の成否はページの描画に影響しない(og:image が
 * 遅れて揃うだけ)うえ、裏で走らせたときに未処理の rejection にしないため。
 */
async function ensureStored(key: string, render: () => Promise<Buffer>): Promise<void> {
  if (inFlightKeys.has(key)) {
    return;
  }

  const retryAt = failedKeys.get(key);
  if (retryAt !== undefined && retryAt > Date.now()) {
    return;
  }

  inFlightKeys.add(key);

  try {
    const s3Client = buildS3Client();

    if (await exists(s3Client, key)) {
      ensuredKeys.add(key);
      return;
    }

    const body = await render();

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: "image/png",
        // キーに OG_IMAGE_VERSION が入るため、デザインを変えれば別URLになる。
        // 同じURLの中身は変わらないので、ブラウザにも長期キャッシュさせる。
        CacheControl: "public, max-age=31536000, immutable",
        // CDN から直接配信するため、公開読み取りにする（プロフィール画像と同じ扱い）
        ACL: "public-read",
      } satisfies PutObjectCommandInput),
    );

    ensuredKeys.add(key);
    failedKeys.delete(key);
  } catch (error) {
    console.error("failed to ensure ogp image", { key, error });
    failedKeys.set(key, Date.now() + FAILED_KEY_RETRY_MS);
  } finally {
    inFlightKeys.delete(key);
  }
}

// 描画を止めずに実体を用意させる。ensureStored は失敗を内側で閉じるので投げっぱなしでよい。
function ensureInBackground(key: string, render: () => Promise<Buffer>): void {
  void ensureStored(key, render);
}
