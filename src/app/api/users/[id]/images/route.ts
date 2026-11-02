import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";
import { FixedWindowLimiter } from "@app/utils/fixedWindowLimiter";

import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";

const accessKeyId = process.env.SAKURA_OBJECTSTORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.SAKURA_OBJECTSTORAGE_SECRET_ACCESS_KEY;
const endpoint = process.env.SAKURA_OBJECTSTORAGE_ENDPOINT;
const region = process.env.SAKURA_OBJECTSTORAGE_REGION;
const bucketName = process.env.SAKURA_OBJECTSTORAGE_BUCKET_NAME;
const cdnUrl = process.env.SAKURA_OBJECTSTORAGE_CDN_URL;

// アップロードを受け付ける上限サイズ。
// クライアント(UpdateNameModal)はcanvasで切り抜いた数百KB程度のPNGしか送らないが、
// このAPIは直接叩けるため、サーバ側でも上限を持つ。
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// PNGのシグネチャ(先頭8バイト)。
// クライアントのaccept="image/*"やContentTypeの指定は、APIを直接叩かれれば意味がない。
// public-readで公開ストレージに置く以上、PNGであることは中身で確認する。
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// アカウントごとのアップロード回数の上限(1 時間に 10 回)。
//
// アップロードのたびに日時入りの別キーで公開ストレージへ書くため、上限が無いと 1 アカウントで
// 容量と課金を際限なく膨らませられる(2026-10-31 の精査で指摘)。正規の利用はプロフィールの
// アイコンを変えるときの数回なので、1 時間 10 回あれば足りる。
// 送信元ごとの制限は nginx(proxy リポジトリの limit_req avatar_upload)にもあり、ここは送信元を
// 変えても効く上限。数えるのはプロセスごとなので(pm2 の cluster が 2 プロセス)、全体では最大 20 回通る。
const UPLOADS_PER_WINDOW = 10;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;
const uploadLimiter = new FixedWindowLimiter(UPLOADS_PER_WINDOW, UPLOAD_WINDOW_MS);

function isPng(buffer: Buffer): boolean {
  return buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

function buildDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (session.user.id !== id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 本人確認の後で数える。前で数えると、他人の ID を指定した(403 になる)要求で
  // その人の回数を使い切らせる嫌がらせができてしまう。
  // 中身の検証(サイズ・PNG)より前に数えるのは、不正な本文の連打でも処理を回させないため。
  const verdict = uploadLimiter.consume(id);
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: "too many uploads" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(verdict.retryAfterMs / 1000)) } },
    );
  }

  // formData()はボディを丸ごとメモリに読み込むため、パースする前に申告サイズで弾く。
  // Content-Lengthは詐称できるので、実サイズの検証は下のimage.sizeで別途行う。
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "image is too large" }, { status: 413 });
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "image is required" }, { status: 400 });
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "image is too large" }, { status: 413 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());

    if (!isPng(buffer)) {
      return NextResponse.json({ error: "image must be a PNG" }, { status: 400 });
    }

    const datetime = buildDatetimeString(new Date());
    const filename = `${id}_${datetime}.png`;
    const key = `images/users/${filename}`;

    const s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || "",
      },
    });

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
      // キーに日時が入るため、更新すれば必ず別URLになる。同じURLの中身は変わらないので
      // ブラウザに長期キャッシュさせてよい。これを付けないとCDNが s-maxage しか返さず、
      // 共有キャッシュにしか効かない(ブラウザは毎回取り直す)。
      CacheControl: "public, max-age=31536000, immutable",
      ACL: "public-read",
    } satisfies PutObjectCommandInput);

    await s3Client.send(command);

    const imageUrl = `${cdnUrl}/${key}`;

    return NextResponse.json({ url: imageUrl }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}
