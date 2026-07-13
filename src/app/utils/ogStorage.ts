import {
  HeadObjectCommand,
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
const OG_IMAGE_VERSION = "v1";

// 一度存在を確認できたキーは、プロセスが生きている間は再確認しない。
// OGP画像はイベント確定後に変わらないため、リクエストのたびに HeadObject を投げる必要がない。
const ensuredKeys = new Set<string>();

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

async function exists(s3Client: S3Client, key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * OGP画像がオブジェクトストレージに無ければ生成してアップロードし、CDN上のURLを返す。
 *
 * 生成は satori 経由で数百ms かかるため、既にアップロード済みなら描画自体を行わない。
 * アップロードに失敗した場合は URL を返さない（null）。og:image が欠けるだけで、
 * ページの描画は妨げない。
 */
export async function ensureOgImage(
  name: string,
  render: () => Promise<Buffer>,
): Promise<string | null> {
  const key = buildOgImageKey(name);
  const url = `${cdnUrl}/${key}`;

  if (ensuredKeys.has(key)) {
    return url;
  }

  try {
    const s3Client = buildS3Client();

    if (await exists(s3Client, key)) {
      ensuredKeys.add(key);
      return url;
    }

    const body = await render();

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: "image/png",
        // CDN から直接配信するため、公開読み取りにする（プロフィール画像と同じ扱い）
        ACL: "public-read",
      } satisfies PutObjectCommandInput),
    );

    ensuredKeys.add(key);

    return url;
  } catch (error) {
    console.error("failed to ensure ogp image", { key, error });
    return null;
  }
}
